import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { summarizeWithFallback, checkAndIncrementDailyUsage, type AIProvider } from "@/lib/ai";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { summarizeSchema } from "@/lib/schemas";
import { FREE_DAILY_LIMIT, MAX_CONTENT_LENGTH } from "@/lib/constants";
import { getClientIP, resolveRateLimit } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    // ==================== Rate Limiting ====================
    const clientIp = getClientIP(req);
    userId = await getAuthUserId();
    const isGuest = !userId;
    const identifier = getClientIdentifier(userId, clientIp);

    // Differentiate rate limits: Pro > Free > Guest
    const { config: usageRateConfig } = await resolveRateLimit(userId);
    const rateLimitResult = await rateLimitAsync(identifier, usageRateConfig);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please wait a moment.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

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
      // Signed-in: load content from DB (avoids sending full content through client)
      try {
        const doc = await prisma.document.findUnique({
          where: { id: documentId },
          select: { content: true, userId: true },
        });
        if (doc && doc.userId === userId!) {
          resolvedContent = doc.content;
          logger.info("Content loaded from DB for summarization", { documentId, contentLength: doc.content.length });
        } else {
          logger.warn("Document not found or access denied, falling back to provided content", { documentId });
        }
      } catch (dbErr) {
        logger.warn("Failed to load content from DB, falling back to provided content", { documentId });
      }
    }

    // ── Validate content is available ──
    if (!resolvedContent && !streamSummary) {
      return NextResponse.json(
        { error: "No content provided for summarization." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ==================== If stream already generated summary, skip checks & AI ====================
    if (streamSummary) {
      logger.info("Summary provided from stream — skipping AI re-generation", { documentId });
      
      // Still save to DB if signed-in
      if (!isGuest && documentId) {
        try {
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
        { headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // ==================== Daily Usage Limit (only for actual AI calls, not stream-pass-through) ====================
    if (!isGuest) {
      try {
        const usageCheck = await checkAndIncrementDailyUsage(userId!, FREE_DAILY_LIMIT);
        if (!usageCheck.allowed) {
          return NextResponse.json(
            {
              error: `Daily free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited access.`,
              code: "usage_limit_reached",
              upgradeUrl: "/pricing",
            },
            {
              status: 402,
              headers: { ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" },
            }
          );
        }
      } catch (limitError) {
        logger.warn("Failed to check daily usage limit", {
          error: limitError instanceof Error ? limitError.message : String(limitError),
        });
        // Fail open — don't block the request on limit-check failure
      }
    }

    // Also enforce daily limit for guests via cookie/ip tracking
    if (isGuest) {
      const guestKey = `guest_daily:${clientIp}`;
      const guestDailyResult = await rateLimitAsync(guestKey, { windowMs: 24 * 60 * 60 * 1000, maxRequests: FREE_DAILY_LIMIT });
      if (!guestDailyResult.success) {
        return NextResponse.json(
          {
            error: "Daily free limit reached. Sign up for more summaries.",
            code: "usage_limit_reached",
            upgradeUrl: "/sign-up",
          },
          { status: 402, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (!resolvedContent) {
      return NextResponse.json(
        { error: "No content to summarize. Provide content or documentId." },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const maxLength = MAX_CONTENT_LENGTH;
    const truncatedContent = resolvedContent.length > maxLength 
      ? resolvedContent.substring(0, maxLength) + "..."
      : resolvedContent;

    // ── Summarize with automatic provider fallback ──
    const result = await summarizeWithFallback({
      content: truncatedContent,
      language,
      preferredProvider: provider as AIProvider,
      maxContentLength: MAX_CONTENT_LENGTH,
    });

    const summary = result.summary;
    const usedProvider = result.provider;

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
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    logger.error("Summarize error:", error instanceof Error ? error : new Error(String(error)));

    // Refund the daily usage quota — AI failure shouldn't consume user's allowance
    try {
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionStatus: true } });
        if (user && user.subscriptionStatus !== "pro" && user.subscriptionStatus !== "pro_trial") {
          await prisma.user.updateMany({
            where: { id: userId, usageCount: { gt: 0 } },
            data: { usageCount: { decrement: 1 } },
          });
        }
      }
    } catch (refundErr) {
      logger.warn("Failed to refund usage quota after AI failure", {
        error: refundErr instanceof Error ? refundErr.message : String(refundErr),
      });
    }

    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
