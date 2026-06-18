import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { getAIProvider, getSystemPrompt, getModelForProvider, type AIProvider } from "@/lib/ai";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { summarizeSchema, type SummarizeInput } from "@/lib/schemas";
import { FREE_DAILY_LIMIT, GUEST_RATE_LIMIT, PRO_RATE_LIMIT, FREE_USER_RATE_LIMIT, MAX_CONTENT_LENGTH } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    // ==================== Rate Limiting ====================
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const userId = await getAuthUserId();
    const isGuest = !userId;
    const identifier = getClientIdentifier(userId, clientIp);

    // Differentiate rate limits: Pro > Free > Guest
    let usageRateConfig: { windowMs: number; maxRequests: number };
    if (!isGuest) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId! },
        select: { subscriptionStatus: true },
      });
      usageRateConfig = userRecord?.subscriptionStatus === "pro" ? PRO_RATE_LIMIT : FREE_USER_RATE_LIMIT;
    } else {
      usageRateConfig = GUEST_RATE_LIMIT;
    }
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

    const { documentId, content, provider = "deepseek", language = "multilingual", streamSummary } = parsed.data;

    // ==================== Daily Usage Limit Enforcement ====================
    if (!isGuest) {
      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: userId! },
          select: { id: true, subscriptionStatus: true },
        });
        if (userRecord && userRecord.subscriptionStatus !== "pro") {
          const startOfDay = new Date();
          startOfDay.setUTCHours(0, 0, 0, 0);
          const todayCount = await prisma.document.count({
            where: {
              userId: userRecord.id,
              summary: { not: null },
              createdAt: { gte: startOfDay },
            },
          });
          if (todayCount >= FREE_DAILY_LIMIT) {
            return NextResponse.json(
              {
                error: "Daily free limit reached (5/day). Upgrade to Pro for unlimited access.",
                code: "usage_limit_reached",
                upgradeUrl: "/pricing",
              },
              {
                status: 402,
                headers: { ...getRateLimitHeaders(rateLimitResult), "Content-Type": "application/json" },
              }
            );
          }
        }
      } catch (limitError) {
        logger.warn("Failed to check daily usage limit", {
          error: limitError instanceof Error ? limitError.message : String(limitError),
        });
        // Don't block the request on limit-check failure — fail open
      }
    }

    // Also enforce daily limit for guests via cookie/ip tracking
    if (isGuest) {
      const guestKey = `guest_daily:${clientIp}`;
      const guestDailyResult = await rateLimitAsync(guestKey, { windowMs: 24 * 60 * 60 * 1000, maxRequests: FREE_DAILY_LIMIT });
      if (!guestDailyResult.success) {
        return NextResponse.json(
          {
            error: "Daily free limit reached. Sign up for more summaries.",
            code: "usage_limit_reached",
            upgradeUrl: "/sign-up",
          },
          { status: 402, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // If a stream-generated summary was already provided, skip AI re-call
    if (streamSummary) {
      logger.info("Summary provided from stream — skipping AI re-generation", { documentId });
      
      // Still save to DB if signed-in
      if (!isGuest && documentId) {
        try {
          await prisma.document.update({
            where: { id: documentId },
            data: { summary: streamSummary, status: "completed" },
          });
        } catch (dbError) {
          logger.warn("Failed to save stream summary to DB", { documentId });
        }
      }

      return NextResponse.json(
        { success: true, summary: streamSummary, documentId, provider: "stream" },
        { headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const maxLength = MAX_CONTENT_LENGTH;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    let summary: string;
    let usedProvider: AIProvider;

    try {
      const aiClient = getAIProvider(provider as AIProvider);
      const model = getModelForProvider(provider);
      const completion = await aiClient.chat.completions.create({
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
        const groqClient = getAIProvider("groq");
        const model = getModelForProvider("groq");
        const completion = await groqClient.chat.completions.create({
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
        
        const sfClient = getAIProvider("siliconflow");
        const model = getModelForProvider("siliconflow");
        const completion = await sfClient.chat.completions.create({
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
