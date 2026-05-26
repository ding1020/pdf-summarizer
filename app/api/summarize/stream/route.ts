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
  rateLimitResult: ReturnType<typeof rateLimit>
): Promise<Response> {
  const openai = getAIProvider(provider);
  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: getSystemPrompt(language) },
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
      ...getRateLimitHeaders(rateLimitResult),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Apply rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const identifier = getClientIdentifier(userId, clientIp);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.free);
    
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
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

    const { content, provider = "deepseek", language = "multilingual" } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Truncate content if too long
    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    // Try providers in fallback order, starting with requested provider
    const startIndex = FALLBACK_CHAIN.findIndex(p => p.provider === provider);
    const orderedProviders = startIndex >= 0 
      ? [...FALLBACK_CHAIN.slice(startIndex), ...FALLBACK_CHAIN.slice(0, startIndex)]
      : FALLBACK_CHAIN;

    for (const { provider: p, model } of orderedProviders) {
      try {
        return await tryStreamWithProvider(p, model, truncatedContent, language, rateLimitResult);
      } catch (err) {
        logger.warn(`Stream provider ${p} failed, trying next`, 
          err instanceof Error ? err.message : String(err));
      }
    }

    // All providers failed
    return new Response(
      JSON.stringify({ error: "AI service unavailable. Please try again later." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Stream error:", error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
