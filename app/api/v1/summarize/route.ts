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
  getAIProvider,
  getSystemPrompt,
  getModelForProvider,
  estimateTokens,
  createUsageRecord,
  type AIProvider,
} from "@/lib/ai";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier } from "@/lib/rate-limit";
import { MAX_CONTENT_LENGTH } from "@/lib/constants";

// ── AI provider fallback chain ──
const FALLBACK_CHAIN: { provider: AIProvider; model: string }[] = [
  { provider: "deepseek", model: getModelForProvider("deepseek") },
  { provider: "groq", model: getModelForProvider("groq") },
  { provider: "siliconflow", model: getModelForProvider("siliconflow") },
];

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

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { keyHash },
      data: { lastUsedAt: new Date() },
    });

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

  // ── Rate Limit ──
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const identifier = getClientIdentifier(userId, clientIp);
    const result = await rateLimitAsync(identifier, { windowMs: 60_000, maxRequests: 30 });
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

  const truncatedContent =
    content.length > MAX_CONTENT_LENGTH
      ? content.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated...]"
      : content;

  // ── Try providers in fallback order ──
  const errors: string[] = [];
  let lastUsage = null;

  for (const { provider: p, model } of FALLBACK_CHAIN) {
    try {
      const openai = getAIProvider(p);
      const inputTokens = estimateTokens(truncatedContent);

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language as "zh" | "en" | "multilingual"),
          },
          { role: "user", content: `Please summarize the following document:\n\n${truncatedContent}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const outputText = completion.choices[0]?.message?.content || "";
      const usage = createUsageRecord(p, model, inputTokens, estimateTokens(outputText));

      logger.info("[API v1] Summarize completed", {
        provider: p,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUSD: usage.costUSD.toFixed(6),
      });

      return new Response(
        JSON.stringify({
          success: true,
          summary: outputText,
          usage: {
            provider: p,
            model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Provider": p,
            "X-Tokens-Used": String(usage.totalTokens),
          },
        }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${p}: ${errMsg}`);
      lastUsage = err;
    }
  }

  logger.error("[API v1] All providers failed", undefined, { errors });

  return new Response(
    JSON.stringify({
      error: "AI service temporarily unavailable",
      details: process.env.NODE_ENV === "development" ? errors : undefined,
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}
