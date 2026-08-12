import { NextRequest } from "next/server";
import {
  summarizeStreamWithFallback,
  type AIProvider,
} from "@/lib/ai";
import { logger } from "@/lib/logger";
import { getRateLimitHeaders } from "@/lib/rate-limit";
import {
  extractAuthContext,
  applyRateLimitGuard,
  resolveDocumentContent,
  checkDailyUsageLimit,
  refundUsageQuota,
  logAIUsage,
  getMaxContentLength,
  createJsonResponse,
  createAIUnavailableError,
} from "@/lib/summarize-helpers";

export async function POST(req: NextRequest) {
  // ── Auth (required) ──
  const { userId, clientIp, isGuest } = await extractAuthContext(req);

  if (!userId) {
    return createJsonResponse(
      { error: "Unauthorized. Please sign in to use this feature." },
      401,
    );
  }

  // ── Rate Limiting (via shared helper — uses resolveRateLimit internally) ──
  const rateGuard = await applyRateLimitGuard(userId, clientIp);
  if (rateGuard.errorResponse) return rateGuard.errorResponse;
  const rateLimitResult = rateGuard.data;

  // ── Parse Request Body ──
  let body: { content?: string; documentId?: string; provider?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return createJsonResponse(
      { error: "Invalid request body. Please provide document content or documentId." },
      400,
    );
  }

  let { content, documentId, provider = "deepseek", language = "multilingual" } = body;

  // ── Resolve content: direct or from DB (via shared helper) ──
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    if (documentId) {
      const resolution = await resolveDocumentContent(documentId, userId, true);
      if (resolution.error) {
        return createJsonResponse(
          { error: resolution.error.message },
          resolution.error.status,
        );
      }
      content = resolution.content || "";
    }
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return createJsonResponse(
      { error: "Document content is required and must be a non-empty string." },
      400,
    );
  }

  // ── Max content length (via shared helper — Pro: 50k, Free: 15k) ──
  const maxLength = await getMaxContentLength(userId);

  // ── Daily Usage Limit (via shared helper) ──
  const usageGuard = await checkDailyUsageLimit(userId, clientIp, isGuest);
  if (usageGuard.errorResponse) return usageGuard.errorResponse;

  // ── Summarize with automatic provider fallback (shared service) ──
  try {
    const { readableStream, provider: usedProvider, model: usedModel, usage } =
      await summarizeStreamWithFallback({
        content,
        language,
        preferredProvider: provider as AIProvider,
        maxContentLength: maxLength,
      });

    // ── Record AI usage for cost tracking (via shared helper) ──
    if (usage.model !== "cache") {
      await logAIUsage(userId, usage.provider, usage.model, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens > 0 ? usage.outputTokens : 0,
        totalTokens: usage.totalTokens > 0 ? usage.totalTokens : usage.inputTokens,
        costUSD: usage.costUSD,
      }, clientIp, "stream");
    }

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Provider": usedProvider,
      "X-Model": usedModel,
      "X-Tokens-Used": String(usage.totalTokens),
    });

    // Attach rate-limit headers
    if (rateLimitResult) {
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([k, v]) => {
        headers.set(k, v);
      });
    }

    return new Response(readableStream, { headers });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error("All AI providers failed for streaming", new Error(errMsg));

    // Log error for real error rate tracking (via shared helper)
    await logAIUsage(userId, provider, "unknown", {
      inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0,
    }, clientIp, "stream");

    // Refund the daily usage quota — AI failure shouldn't consume user's allowance
    await refundUsageQuota(userId);

    return createAIUnavailableError(errMsg);
  }
}
