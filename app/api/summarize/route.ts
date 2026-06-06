import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAIProvider, getSystemPrompt, getModelForProvider, type AIProvider } from "@/lib/ai";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { summarizeSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    // ==================== Rate Limiting ====================
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const { userId } = await auth();
    const isGuest = !userId;
    const identifier = getClientIdentifier(userId, clientIp);
    const guestRateLimit = { windowMs: 60 * 1000, maxRequests: 3 };
    const usageRateConfig = isGuest ? guestRateLimit : { windowMs: 60 * 1000, maxRequests: 20 };
    const rateLimitResult = await rateLimitAsync(identifier, usageRateConfig);
    
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

    // ==================== Input Validation (Zod) ====================
    const body = await req.json();
    const parsed = summarizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { documentId, content, provider = "deepseek", language = "multilingual" } = parsed.data;

    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    let summary: string;
    let usedProvider: AIProvider;

    try {
      const openai = getAIProvider(provider as AIProvider);
      const model = getModelForProvider(provider);
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: getSystemPrompt(language) },
          { role: "user", content: `Please summarize the following document:\n\n${truncatedContent}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      summary = completion.choices[0]?.message?.content || "Failed to generate summary";
      usedProvider = provider as AIProvider;
    } catch (primaryError) {
      logger.error("Primary AI provider failed:", primaryError instanceof Error ? primaryError : new Error(String(primaryError)));
      
      try {
        const openai = getAIProvider("groq");
        const model = getModelForProvider("groq");
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: getSystemPrompt(language) },
            { role: "user", content: `Please summarize the following document:\n\n${truncatedContent}` },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });
        summary = completion.choices[0]?.message?.content || "Failed to generate summary";
        usedProvider = "groq";
      } catch (groqError) {
        logger.error("Groq also failed:", groqError instanceof Error ? groqError : new Error(String(groqError)));
        
        const openai = getAIProvider("siliconflow");
        const model = getModelForProvider("siliconflow");
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: getSystemPrompt(language) },
            { role: "user", content: `Please summarize the following document:\n\n${truncatedContent}` },
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
      isGuest,
    });

    // Save to DB only if signed-in and documentId is valid
    if (!isGuest && documentId) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { summary, status: "completed" },
        });
        logger.info("Summary saved to database", { documentId });
      } catch (dbError) {
        logger.warn("Failed to save summary to database", { documentId, error: dbError instanceof Error ? dbError.message : String(dbError) });
      }
    }

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
