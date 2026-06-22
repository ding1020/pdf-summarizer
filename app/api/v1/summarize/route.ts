/**
 * POST /api/v1/summarize
 * Developer API — authenticate via Bearer token (API key).
 * Same summarization pipeline as the web UI, programmatic access.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import {
  summarizeWithFallback,
  checkAndIncrementDailyUsage,
  type AIProvider,
} from "@/lib/ai";
import { getClientIP, getUserTier } from "@/lib/api-utils";
import { rateLimitAsync, getClientIdentifier } from "@/lib/rate-limit";
import { FREE_DAILY_LIMIT, MAX_CONTENT_LENGTH, PRO_MAX_CONTENT_LENGTH } from "@/lib/constants";

async function authenticateApiKey(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7);
  if (rawKey.length < 32) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { userId: true, revokedAt: true },
    });

    if (!apiKey || apiKey.revokedAt) return null;

    // Update last used timestamp (fire-and-forget)
    prisma.apiKey.update({
      where: { keyHash },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return apiKey.userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // ── API Key Auth ──
  const userId = await authenticateApiKey(req);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing API key. Use Authorization: Bearer YOUR_API_KEY" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Rate Limit (per-minute, Pro-aware) ──
  try {
    const clientIp = getClientIP(req);
    const identifier = getClientIdentifier(userId, clientIp);

    // Determine tier
    const tier = await getUserTier(userId);
    const maxRequests = tier === "pro" ? 60 : 30;

    const result = await rateLimitAsync(identifier, { windowMs: 60_000, maxRequests });
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch {
    // fail open
  }

  // ── Parse body ──
  let body: { content?: string; language?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body. Provide { content: string }" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { content, language = "multilingual", provider = "deepseek" } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "content is required and must be a non-empty string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Determine content limit (Pro: 50k, Free: 15k) ──
  let maxContentLength = MAX_CONTENT_LENGTH;
  try {
    const tier = await getUserTier(userId);
    if (tier === "pro") {
      maxContentLength = PRO_MAX_CONTENT_LENGTH;
    }
  } catch { /* fallback to free limit */ }

  // ── Daily usage limit (bypass-proof) ──
  try {
    const usageCheck = await checkAndIncrementDailyUsage(userId, FREE_DAILY_LIMIT);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Daily free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited access.`,
          code: "usage_limit_reached",
          upgradeUrl: "/pricing",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch { /* fail open */ }

  // ── Summarize with automatic provider fallback ──
  let summaryText: string;
  let usedProvider: AIProvider;
  let usage: { provider: string; model: string; inputTokens: number; outputTokens: number; totalTokens: number };
  try {
    const result = await summarizeWithFallback({
      content,
      language,
      preferredProvider: provider as AIProvider,
      maxContentLength,
    });
    summaryText = result.summary;
    usedProvider = result.provider;
    usage = {
      provider: result.usage.provider,
      model: result.usage.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error("[API v1] All providers failed", err instanceof Error ? err : new Error(errMsg));
    return new Response(
      JSON.stringify({
        error: "AI service temporarily unavailable",
        details: process.env.NODE_ENV === "development" ? errMsg : undefined,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  logger.info("[API v1] Summarize completed", {
    provider: usedProvider,
    totalTokens: usage.totalTokens,
  });

  return new Response(
    JSON.stringify({
      success: true,
      summary: summaryText,
      usage,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Provider": usedProvider,
        "X-Tokens-Used": String(usage.totalTokens),
      },
    }
  );
}
