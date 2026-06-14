import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { feedbackSchema } from "@/lib/schemas";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();

    // Rate limiting: 3 feedback submissions per hour per client
    const clientId = getClientIdentifier(userId || "anonymous");
    const rateLimitResult = await rateLimitAsync(clientId, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn("[Feedback] Validation failed", {
        errors: parsed.error.flatten().fieldErrors,
        userId,
      });
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { category, message } = parsed.data;

    let userName: string | null = null;
    let userEmail: string | null = null;
    let dbUserId: string | null = null;

    // Enrich with authenticated user info
    if (userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });
        if (user) {
          dbUserId = user.id;
          userEmail = user.email;
        }
      } catch {
        logger.warn("[Feedback] User lookup failed", { userId });
      }
    }

    // Require authentication for feedback submission
    if (!userId && message.length > 500) {
      return NextResponse.json(
        { error: "Please sign in to submit longer feedback." },
        { status: 401 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: dbUserId,
        userName,
        userEmail,
        category,
        message,
      },
    });

    logger.info("[Feedback] Created", {
      feedbackId: feedback.id,
      category,
      userId: userId || "anonymous",
    });

    return NextResponse.json(
      {
        success: true,
        id: feedback.id,
        message: "Thank you for your feedback!",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "[Feedback] Error creating feedback",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for feedback queries
    const clientId = getClientIdentifier(userId);
    const rateLimitResult = await rateLimitAsync(clientId, {
      maxRequests: 30,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Only allow users to view their own feedback
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          category: true,
          message: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.feedback.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(
      "[Feedback] Error fetching feedback",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
