import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

const FREE_DAILY_LIMIT = 5;

export async function GET(req: Request) {
  try {
    const clerkId = await getAuthUserId();

    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const identifier = getClientIdentifier(clerkId, clientIp);
    const rateLimitResult = await rateLimitAsync(identifier, RATE_LIMITS.free);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }
    
    if (!clerkId) {
      return NextResponse.json({
        used: 0,
        limit: FREE_DAILY_LIMIT,
        remaining: FREE_DAILY_LIMIT,
        isPro: false,
        resetAt: null,
        isGuest: true,
      }, { headers: getRateLimitHeaders(rateLimitResult) });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const isPro = user.subscriptionStatus === "pro" || user.subscriptionStatus === "active";

    // Use UTC midnight for consistent daily reset
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const todayUsage = await prisma.document.count({
      where: {
        userId: user.id,
        summary: { not: null },
        createdAt: { gte: startOfDay },
      },
    });

    const remaining = isPro ? -1 : Math.max(0, FREE_DAILY_LIMIT - todayUsage);
    const limit = isPro ? -1 : FREE_DAILY_LIMIT;
    const resetAt = isPro ? null : new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return NextResponse.json({
      used: todayUsage,
      limit,
      remaining,
      isPro,
      resetAt: resetAt?.toISOString() || null,
      isGuest: false,
    }, { headers: getRateLimitHeaders(rateLimitResult) });
  } catch (error) {
    logger.error("Failed to get usage stats:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
