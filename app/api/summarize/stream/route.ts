import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import {
  getAIProvider,
  getSystemPrompt,
  getModelForProvider,
  estimateTokens,
  createUsageRecord,
  type AIProvider,
  type TokenUsage,
} from "@/lib/ai";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// ── AI provider fallback chain: deepseek → groq → siliconflow ──
const FALLBACK_CHAIN: { provider: AIProvider; model: string }[] = [
  { provider: "deepseek", model: getModelForProvider("deepseek") },
  { provider: "groq", model: getModelForProvider("groq") },
  { provider: "siliconflow", model: getModelForProvider("siliconflow") },
];

// ── Request timeout (30s for the whole streaming operation) ──
const STREAM_TIMEOUT_MS = 30_000;

async function tryStreamWithProvider(
  provider: AIProvider,
  model: string,
  truncatedContent: string,
  language: string,
  signal: AbortSignal,
): Promise<{ response: Response; usage: TokenUsage }> {
  const inputTokens = estimateTokens(truncatedContent);
  const openai = getAIProvider(provider);

  const stream = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: getSystemPrompt(language as "zh" | "en" | "multilingual" | "technical" | "business") },
        { role: "user", content: `Please summarize the following document:\n\n${truncatedContent}` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    },
    { signal },
  );

  let outputText = "";

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (signal.aborted) {
            controller.close();
            return;
          }
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            outputText += content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        // Include usage info in the final event
        const outputTokens = estimateTokens(outputText);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              _usage: { provider, model, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
            })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        if (signal.aborted) {
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
  });

  const response = new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
    },
  });

  const usage = createUsageRecord(provider, model, inputTokens, estimateTokens(outputText));

  return { response, usage };
}

export async function POST(req: NextRequest) {
  // ── Auth ──
  const userId = await getAuthUserId();

  // ── Rate Limiting ──
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";
    const identifier = getClientIdentifier(userId, clientIp);
    const rateLimitConfig = userId ? RATE_LIMITS.free : RATE_LIMITS.guest;
    const rateLimitResult = await rateLimitAsync(identifier, rateLimitConfig);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: userId
            ? "Too many requests. Please try again later."
            : "Free trial limit reached. Sign up for more.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(rateLimitResult),
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
  let body: { content?: string; provider?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body. Please provide document content." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { content, provider = "deepseek", language = "multilingual" } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Document content is required and must be a non-empty string." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Truncate content if too long
  const maxLength = 15_000;
  const truncatedContent =
    content.length > maxLength
      ? content.substring(0, maxLength) + "\n\n[Content truncated...]"
      : content;

  // ── Daily Usage Limit Enforcement (free users: 5/day) ──
  const FREE_DAILY_LIMIT = 5;
  if (userId) {
    try {
      const { prisma: prismaDb } = await import("@/lib/db");
      const userRecord = await prismaDb.user.findUnique({
        where: { id: userId },
        select: { id: true, subscriptionStatus: true },
      });
      if (userRecord && userRecord.subscriptionStatus !== "pro" && userRecord.subscriptionStatus !== "active") {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const todayCount = await prismaDb.document.count({
          where: {
            userId: userRecord.id,
            summary: { not: null },
            createdAt: { gte: startOfDay },
          },
        });
        if (todayCount >= FREE_DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: "Daily free limit reached (5/day). Upgrade to Pro for unlimited access.",
              code: "usage_limit_reached",
              upgradeUrl: "/pricing",
            }),
            { status: 402, headers: { "Content-Type": "application/json" } },
          );
        }
      }
    } catch (limitError) {
      logger.warn("Failed to check daily usage limit in stream", {
        error: limitError instanceof Error ? limitError.message : String(limitError),
      });
      // Fail open — don't block on limit-check failure
    }
  }

  // ── Try providers in fallback order ──
  const startIndex = FALLBACK_CHAIN.findIndex((p) => p.provider === provider);
  const orderedProviders =
    startIndex >= 0
      ? [...FALLBACK_CHAIN.slice(startIndex), ...FALLBACK_CHAIN.slice(0, startIndex)]
      : FALLBACK_CHAIN;

  const errors: string[] = [];
  let totalTokensUsed = 0;

  for (const { provider: p, model } of orderedProviders) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

    try {
      const { response, usage } = await tryStreamWithProvider(
        p,
        model,
        truncatedContent,
        language,
        controller.signal,
      );

      clearTimeout(timeoutId); // Clean up timeout on success

      totalTokensUsed = usage.totalTokens;

      logger.info("AI stream completed", {
        provider: p,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUSD: usage.costUSD.toFixed(6),
      });

      // Clone response to add usage header
      const headers = new Headers(response.headers);
      headers.set("X-Provider", p);
      headers.set("X-Tokens-Used", String(totalTokensUsed));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err) {
      clearTimeout(timeoutId); // Clean up timeout on error
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${p}: ${errMsg}`);
      logger.warn(`Stream provider ${p} failed, trying next`, { error: errMsg });
    }
  }

  logger.error("All AI providers failed", undefined, { errors, tokensAttempted: totalTokensUsed });

  return new Response(
    JSON.stringify({
      error: "AI service is temporarily unavailable. Please try again in a moment.",
      details: process.env.NODE_ENV === "development" ? errors : undefined,
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}
