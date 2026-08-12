import { NextRequest, NextResponse } from "next/server";
import {
  summarizeWithFallback,
  type AIProvider,
} from "@/lib/ai";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { summarizeSchema } from "@/lib/schemas";
import { getRateLimitHeaders } from "@/lib/rate-limit";
import {
  extractAuthContext,
  applyRateLimitGuard,
  resolveDocumentContent,
  checkDailyUsageLimit,
  refundUsageQuota,
  logAIUsage,
  getMaxContentLength,
  createAIUnavailableError,
} from "@/lib/summarize-helpers";

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    // ==================== Auth + Rate Limiting (via shared helpers) ====================
    const { userId: uid, clientIp, isGuest } = await extractAuthContext(req);
    userId = uid;

    const rateGuard = await applyRateLimitGuard(userId, clientIp);
    if (rateGuard.errorResponse) return rateGuard.errorResponse;
    const rateLimitResult = rateGuard.data;

    // ==================== Input Validation (Zod) ====================
    const body = await req.json();
    const parsed = summarizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { documentId, content, provider = "deepseek", language = "multilingual", streamSummary } = parsed.data;

    // ── Resolve content: signed-in users load from DB, guests use provided content ──
    let resolvedContent = content;

    if (!isGuest && documentId && !streamSummary) {
      const resolution = await resolveDocumentContent(documentId, userId!, false);
      if (resolution.content) {
        resolvedContent = resolution.content;
        logger.info("Content loaded from DB for summarization", { documentId, contentLength: resolution.content.length });
      } else {
        logger.warn("Document not found or access denied, falling back to provided content", { documentId });
      }
    }

    // ── Validate content is available ──
    if (!resolvedContent && !streamSummary) {
      return NextResponse.json(
        { error: "No content provided for summarization." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ==================== Daily Usage Limit (via shared helper) ====================
    const usageGuard = await checkDailyUsageLimit(userId, clientIp, isGuest);
    if (usageGuard.errorResponse) return usageGuard.errorResponse;

    // ==================== If stream already generated summary, skip AI re-generation ====================
    if (streamSummary) {
      logger.info("Summary provided from stream — skipping AI re-generation", { documentId });

      // Still save to DB if signed-in — WITH ownership verification
      if (!isGuest && documentId) {
        try {
          const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { userId: true },
          });
          if (!doc || doc.userId !== userId!) {
            logger.warn("Document ownership mismatch in streamSummary", { documentId, userId });
            return NextResponse.json(
              { error: "Document not found or access denied." },
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }
          await prisma.document.update({
            where: { id: documentId },
            data: { summary: streamSummary, status: "completed" },
          });
        } catch (dbError) {
          logger.warn("Failed to save stream summary to DB", { documentId });
        }
      }

      return NextResponse.json(
        { success: true, summary: streamSummary, documentId, provider: "stream" },
        { headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : undefined }
      );
    }

    if (!resolvedContent) {
      return NextResponse.json(
        { error: "No content to summarize. Provide content or documentId." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const maxLength = await getMaxContentLength(userId);
    const truncatedContent = resolvedContent.length > maxLength
      ? resolvedContent.substring(0, maxLength) + "..."
      : resolvedContent;

    // ── Summarize with automatic provider fallback ──
    let summary: string;
    let usedProvider: AIProvider;
    let aiUsage: { provider: string; model: string; inputTokens: number; outputTokens: number; totalTokens: number; costUSD: number };
    try {
      const result = await summarizeWithFallback({
        content: truncatedContent,
        language,
        preferredProvider: provider as AIProvider,
        maxContentLength: maxLength,
      });
      summary = result.summary;
      usedProvider = result.provider;
      aiUsage = result.usage;
    } catch (aiError) {
      const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
      logger.error(
        "All AI providers failed for /api/summarize",
        aiError instanceof Error ? aiError : new Error(errMsg),
        { isGuest, contentLength: truncatedContent.length },
      );
      // Log error for real error rate tracking
      await logAIUsage(userId, provider, "unknown", {
        inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0,
      }, clientIp, "web");
      return createAIUnavailableError(errMsg);
    }

    // Log AI usage (via shared helper)
    await logAIUsage(userId, aiUsage.provider, aiUsage.model, {
      inputTokens: aiUsage.inputTokens,
      outputTokens: aiUsage.outputTokens,
      totalTokens: aiUsage.totalTokens,
      costUSD: aiUsage.costUSD,
    }, clientIp, "web");

    logger.info("Summary generated", {
      documentId,
      provider: usedProvider,
      contentLength: resolvedContent.length,
      isGuest,
    });

    // Save to DB only if signed-in and documentId is valid
    if (!isGuest && documentId) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { summary, status: "completed" },
        });
        logger.info("Summary saved to database", { documentId });
      } catch (dbError) {
        logger.warn("Failed to save summary to database", { documentId, error: dbError instanceof Error ? dbError.message : String(dbError) });
      }
    }

    return NextResponse.json(
      {
        success: true,
        summary,
        documentId: documentId || `${Date.now()}`,
        provider: usedProvider,
      },
      { headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : undefined }
    );
  } catch (error) {
    logger.error("Summarize error:", error instanceof Error ? error : new Error(String(error)));

    // Refund the daily usage quota — AI failure shouldn't consume user's allowance
    await refundUsageQuota(userId);

    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
