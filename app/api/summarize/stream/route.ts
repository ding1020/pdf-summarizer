import { NextRequest } from "next/server";
import { getAIProvider, getSystemPrompt, type AIProvider } from "@/lib/ai";
import { rateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Check if Clerk is configured (works with both test and production keys)
const isClerkConfigured = () => {
  const key = process.env.CLERK_SECRET_KEY;
  return !!(key && (key.startsWith("sk_live_") || key.startsWith("sk_test_")));
};

export async function POST(req: NextRequest) {
  try {
    let userId = "demo-user";

    // Try to get auth if Clerk is configured
    if (isClerkConfigured()) {
      try {
        const { auth } = await import("@clerk/nextjs/server");
        const { userId: id } = await auth();
        if (id) {
          userId = id;
        }
      } catch (e) {
        logger.warn("Clerk auth failed, using demo mode");
      }
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
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Truncate content if too long
    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    // Get AI client
    const openai = getAIProvider(provider as AIProvider);
    
    const model = openai.baseURL?.includes("groq") ? "llama-3.3-70b-versatile" : 
                  openai.baseURL?.includes("siliconflow") ? "Qwen/Qwen2.5-7B-Instruct" : "deepseek-chat";

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language),
          },
          {
            role: "user",
            content: `Please summarize the following document:\n\n${truncatedContent}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      });

      // Create a readable stream
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                const data = `data: ${JSON.stringify({ content })}\n\n`;
                controller.enqueue(encoder.encode(data));
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
    } catch (aiError) {
      logger.error("AI streaming failed:", aiError instanceof Error ? aiError : new Error(String(aiError)));
      return new Response(
        JSON.stringify({ error: "AI service unavailable. Please try again." }),
        { 
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    logger.error("Stream error:", error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
