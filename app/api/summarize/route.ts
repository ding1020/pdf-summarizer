import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider, getSystemPrompt, type AIProvider } from "@/lib/ai";
import { rateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const identifier = getClientIdentifier(userId, clientIp);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.free);
    
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

    const { documentId, content, provider = "deepseek", language = "multilingual" } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Truncate content if too long
    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    // Generate summary using AI
    let summary: string;
    let usedProvider: AIProvider;

    try {
      const openai = getAIProvider(provider as AIProvider);
      const completion = await openai.chat.completions.create({
        model: openai.baseURL?.includes("groq") ? "llama-3.3-70b-versatile" : 
               openai.baseURL?.includes("siliconflow") ? "Qwen/Qwen2.5-7B-Instruct" : "deepseek-chat",
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
      });
      summary = completion.choices[0]?.message?.content || "Failed to generate summary";
      usedProvider = provider as AIProvider;
    } catch (primaryError) {
      logger.error("Primary AI provider failed:", primaryError instanceof Error ? primaryError : new Error(String(primaryError)));
      
      // Fallback to Groq
      try {
        const openai = getAIProvider("groq");
        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
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
        });
        summary = completion.choices[0]?.message?.content || "Failed to generate summary";
        usedProvider = "groq";
      } catch (groqError) {
        logger.error("Groq also failed:", groqError instanceof Error ? groqError : new Error(String(groqError)));
        
        // Final fallback
        const openai = getAIProvider("siliconflow");
        const completion = await openai.chat.completions.create({
          model: "Qwen/Qwen2.5-7B-Instruct",
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
        });
        summary = completion.choices[0]?.message?.content || "Failed to generate summary";
        usedProvider = "siliconflow";
      }
    }

    logger.info("Summary generated", {
      documentId,
      provider: usedProvider,
      contentLength: content.length,
    });

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
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
