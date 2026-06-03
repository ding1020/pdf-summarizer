import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider, getSystemPrompt, type AIProvider } from "@/lib/ai";
import { rateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// AI provider fallback chain: deepseek → groq → siliconflow
const FALLBACK_CHAIN: { provider: AIProvider; model: string }[] = [
  { provider: "deepseek", model: "deepseek-chat" },
  { provider: "groq", model: "llama-3.3-70b-versatile" },
  { provider: "siliconflow", model: "Qwen/Qwen2.5-7B-Instruct" },
];

async function tryStreamWithProvider(
  provider: AIProvider,
  model: string,
  truncatedContent: string,
  language: string,
): Promise<Response> {
  const openai = getAIProvider(provider);
  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: getSystemPrompt(language as "zh" | "en" | "multilingual" | "technical" | "business") },
      { role: "user", content: `Please summarize the following document:\n\n${truncatedContent}` },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  // ==================== Auth (safe wrapper) ====================
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId || null;
  } catch (authError) {
    logger.warn("Auth check failed in summarize stream", {
      error: authError instanceof Error ? authError.message : String(authError),
    });
    userId = null;
  }

  // ==================== Rate Limiting ====================
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "anonymous";
    const identifier = getClientIdentifier(userId, clientIp);
    
    const guestRateLimit = { windowMs: 60 * 1000, maxRequests: 3 };
    const rateLimitConfig = userId ? RATE_LIMITS.free : guestRateLimit;
    const rateLimitResult = rateLimit(identifier, rateLimitConfig);
    
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ 
          error: userId 
            ? "Too many requests. Please try again later."
            : "Free trial limit reached. Sign up for more.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...getRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }
  } catch (rateLimitError) {
    logger.warn("Rate limiting failed in summarize stream", {
      error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
    });
  }

  // ==================== Parse Request Body ====================
  let body: { content?: string; provider?: string; language?: string };
  try {
    body = await req.json();
  } catch (parseError) {
    return new Response(
      JSON.stringify({ error: "Invalid request body. Please provide document content." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { content, provider = "deepseek", language = "multilingual" } = body;

  if (!content || typeof content !== "string") {
    return new Response(
      JSON.stringify({ error: "Document content is required and must be a string." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (content.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Document content is empty." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Truncate content if too long
  const maxLength = 15000;
  const truncatedContent = content.length > maxLength 
    ? content.substring(0, maxLength) + "\n\n[Content truncated...]"
    : content;

  // Try providers in fallback order
  const startIndex = FALLBACK_CHAIN.findIndex(p => p.provider === provider);
  const orderedProviders = startIndex >= 0 
    ? [...FALLBACK_CHAIN.slice(startIndex), ...FALLBACK_CHAIN.slice(0, startIndex)]
    : FALLBACK_CHAIN;

  const errors: string[] = [];

  for (const { provider: p, model } of orderedProviders) {
    try {
      return await tryStreamWithProvider(p, model, truncatedContent, language);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${p}: ${errMsg}`);
      logger.warn(`Stream provider ${p} failed, trying next`, { error: errMsg });
    }
  }

  logger.error("All AI providers failed", undefined, { errors });

  return new Response(
    JSON.stringify({ 
      error: "AI service is temporarily unavailable. Please try again in a moment.",
      details: process.env.NODE_ENV === "development" ? errors : undefined,
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}
