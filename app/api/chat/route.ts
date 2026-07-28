import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { chatWithPDFStream, type ChatMessage } from "@/lib/chat-rag";
import { prisma } from "@/lib/db";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP, getUserTier } from "@/lib/api-utils";
import { saveUsageLog, getUserType } from "@/lib/usage-log";
import { estimateTokens } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { PRO_MAX_CONTENT_LENGTH } from "@/lib/constants";

export async function POST(req: NextRequest) {
  // ── Auth (required) ──
  const userId = await getAuthUserId();
  const clientIp = getClientIP(req);

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Please sign in to use Chat with PDF." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Pro check: Chat is a Pro feature (includes trial) ──
  let tier: "pro" | "free" = "free";
  try {
    tier = await getUserTier(userId);
  } catch {
    // Fail safe — deny if we can't verify
  }

  if (tier !== "pro") {
    return new Response(
      JSON.stringify({
        error: "Chat with PDF is a Pro feature. Upgrade to unlock AI-powered Q&A on your documents.",
        code: "pro_required",
        upgradeUrl: "/pricing",
      }),
      { status: 402, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Rate Limiting ──
  let rateLimitResult: { remaining: number; resetTime: number } | null = null;
  try {
    const identifier = getClientIdentifier(userId, clientIp);
    const result = await rateLimitAsync(identifier, { windowMs: 60_000, maxRequests: 30 });
    rateLimitResult = { remaining: result.remaining, resetTime: result.resetTime };

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Too many messages. Please slow down and try again.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...getRateLimitHeaders(result) },
        },
      );
    }
  } catch (rateLimitError) {
    logger.warn("Rate limiting failed in chat", {
      error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
    });
  }

  // ── Parse Request Body ──
  let body: {
    content?: string;
    documentId?: string;
    question?: string;
    history?: ChatMessage[];
    language?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { content: bodyContent, documentId, question, history = [], language = "en" } = body;

  // ── Validate question ──
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Question is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (question.length > 1000) {
    return new Response(
      JSON.stringify({ error: "Question is too long (max 1000 characters)." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Resolve content: from body or DB ──
  let content = bodyContent;

  if (!content && documentId) {
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

      if (document.userId !== userId) {
        return new Response(
          JSON.stringify({ error: "Access denied." }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      content = document.content || "";
    } catch (dbErr) {
      logger.error("Failed to load document for chat", dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
      return new Response(
        JSON.stringify({ error: "Failed to load document." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return new Response(
      JSON.stringify({ error: "Document content is required to answer questions." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Truncate to Pro limit to protect token budget
  const truncatedContent =
    content.length > PRO_MAX_CONTENT_LENGTH
      ? content.substring(0, PRO_MAX_CONTENT_LENGTH)
      : content;

  // ── Chat with RAG ──
  try {
    const result = await chatWithPDFStream({
      content: truncatedContent,
      question: question.trim(),
      history,
      language,
    });

    // ── Estimate usage for logging (best-effort) ──
    const inputTokens = estimateTokens(truncatedContent) + estimateTokens(question);
    const userType = await getUserType(userId);

    // Usage is approximate — real output tokens only known after stream completes
    saveUsageLog({
      userId,
      provider: result.provider,
      model: result.model,
      inputTokens,
      outputTokens: 0, // Deferred — logged at stream end (best-effort)
      totalTokens: inputTokens,
      costUSD: 0,
      userType,
      route: "stream", // Reuses stream route type for UsageLog compatibility
      ip: clientIp ?? undefined,
    });

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Provider": result.provider,
      "X-Model": result.model,
      "X-Search-Mode": result.searchMode,
      "X-Context-Chunks": String(result.contextUsed),
    });

    if (rateLimitResult) {
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([k, v]) => {
        headers.set(k, v);
      });
    }

    return new Response(result.readableStream, { headers });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error("Chat with PDF failed", err instanceof Error ? err : new Error(errMsg));

    return new Response(
      JSON.stringify({
        error: "Unable to process your question right now. Please try again.",
        details: process.env.NODE_ENV === "development" ? errMsg : undefined,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}
