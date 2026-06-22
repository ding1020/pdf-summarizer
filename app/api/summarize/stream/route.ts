import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import {
  getAIProvider,
  getSystemPrompt,
  estimateTokens,
  createUsageRecord,
  getProviderFallbackChain,
  checkAndIncrementDailyUsage,
  type AIProvider,
  type TokenUsage,
} from "@/lib/ai";
import { prisma } from "@/lib/db";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { FREE_DAILY_LIMIT, MAX_CONTENT_LENGTH, PRO_MAX_CONTENT_LENGTH } from "@/lib/constants";
import { getClientIP, getUserTier } from "@/lib/api-utils";

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
      "X-Accel-Buffering": "no",
    },
  });

  const usage = createUsageRecord(provider, model, inputTokens, estimateTokens(outputText));

  return { response, usage };
}

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
  try {
    const clientIp = getClientIP(req);
    const identifier = getClientIdentifier(userId, clientIp);

    const tier = await getUserTier(userId);
    const rateLimitConfig = tier === "pro" ? { windowMs: 60_000, maxRequests: 60 } : { windowMs: 60_000, maxRequests: 20 };

    const rateLimitResult = await rateLimitAsync(identifier, rateLimitConfig);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
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
      // Load content from DB (for signed-in users where upload returns only documentId)
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
        // Verify ownership
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

  // Truncate content if too long
  const truncatedContent =
    content.length > maxLength
      ? content.substring(0, maxLength) + "\n\n[Content truncated...]"
      : content;

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

  // ── Try providers in fallback order ──
  const orderedProviders = getProviderFallbackChain(provider);

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

      clearTimeout(timeoutId);

      totalTokensUsed = usage.totalTokens;

      logger.info("AI stream completed", {
        provider: p,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUSD: usage.costUSD.toFixed(6),
      });

      const headers = new Headers(response.headers);
      headers.set("X-Provider", p);
      headers.set("X-Tokens-Used", String(totalTokensUsed));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err) {
      clearTimeout(timeoutId);
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
