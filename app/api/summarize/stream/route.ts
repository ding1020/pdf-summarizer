import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import {
  summarizeStreamWithFallback,
  checkAndIncrementDailyUsage,
  type AIProvider,
} from "@/lib/ai";
import { prisma } from "@/lib/db";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { FREE_DAILY_LIMIT, MAX_CONTENT_LENGTH, PRO_MAX_CONTENT_LENGTH } from "@/lib/constants";
import { getClientIP, getUserTier } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  // ── Auth (required) ──
  const userId = await getAuthUserId();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in to use this feature." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Rate Limiting (per-minute, differentiated: Pro > Free) ──
  let rateLimitResult: { remaining: number; resetTime: number } | null = null;
  try {
    const clientIp = getClientIP(req);
    const identifier = getClientIdentifier(userId, clientIp);

    const tier = await getUserTier(userId);
    const rateLimitConfig =
      tier === "pro"
        ? { windowMs: 60_000, maxRequests: 60 }
        : { windowMs: 60_000, maxRequests: 20 };

    const result = await rateLimitAsync(identifier, rateLimitConfig);
    rateLimitResult = { remaining: result.remaining, resetTime: result.resetTime };

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(result),
          },
        },
      );
    }
  } catch (rateLimitError) {
    logger.warn("Rate limiting failed in summarize stream", {
      error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
    });
  }

  // ── Parse Request Body ──
  let body: { content?: string; documentId?: string; provider?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body. Please provide document content or documentId." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let { content, documentId, provider = "deepseek", language = "multilingual" } = body;

  // ── Resolve content: direct or from DB ──
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    if (documentId) {
      try {
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          select: { content: true, userId: true },
        });
        if (!document) {
          return new Response(
            JSON.stringify({ error: "Document not found." }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }
        if (document.userId !== userId) {
          return new Response(
            JSON.stringify({ error: "Access denied." }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        content = document.content || "";
      } catch (dbErr) {
        logger.error("Failed to load document from DB in stream", dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
        return new Response(
          JSON.stringify({ error: "Failed to load document." }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Document content is required and must be a non-empty string." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Determine max content length (Pro: 50k, Free: 15k) ──
  let maxLength = MAX_CONTENT_LENGTH;
  try {
    const tier = await getUserTier(userId);
    if (tier === "pro") {
      maxLength = PRO_MAX_CONTENT_LENGTH;
    }
  } catch {
    // Fallback to free limit
  }

  // ── Daily Usage Limit (bypass-proof: atomic counter) ──
  try {
    const usageCheck = await checkAndIncrementDailyUsage(userId, FREE_DAILY_LIMIT);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Daily free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited access.`,
          code: "usage_limit_reached",
          upgradeUrl: "/pricing",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (limitError) {
    logger.warn("Failed to check daily usage limit in stream", {
      error: limitError instanceof Error ? limitError.message : String(limitError),
    });
    // Fail open
  }

  // ── Summarize with automatic provider fallback (shared service) ──
  try {
    const { readableStream, provider: usedProvider, model: usedModel, usage } =
      await summarizeStreamWithFallback({
        content,
        language,
        preferredProvider: provider as AIProvider,
        maxContentLength: maxLength,
      });

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

    // Refund the daily usage quota — AI failure shouldn't consume user's allowance
    try {
      const tier = await getUserTier(userId);
      if (tier !== "pro") {
        await prisma.user.updateMany({
          where: { id: userId, usageCount: { gt: 0 } },
          data: { usageCount: { decrement: 1 } },
        });
        logger.info("Refunded usage quota after AI failure (stream)", { userId });
      }
    } catch (refundErr) {
      logger.warn("Failed to refund usage quota after AI failure (stream)", {
        error: refundErr instanceof Error ? refundErr.message : String(refundErr),
      });
    }

    return new Response(
      JSON.stringify({
        error: "AI service is temporarily unavailable. Please try again in a moment.",
        details: process.env.NODE_ENV === "development" ? errMsg : undefined,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}
