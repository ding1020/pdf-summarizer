import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Free tier limits
const FREE_DAILY_LIMIT = 5;

export async function GET() {
  try {
    // Require authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isPro = user.subscriptionStatus === "pro";

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayUsage = await prisma.document.count({
      where: {
        user: { clerkId },
        createdAt: { gte: startOfDay },
      },
    });

    const remaining = isPro ? -1 : Math.max(0, FREE_DAILY_LIMIT - todayUsage);
    const limit = isPro ? -1 : FREE_DAILY_LIMIT;

    return NextResponse.json({
      used: todayUsage,
      limit,
      remaining,
      isPro,
      resetAt: isPro ? null : new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get usage stats:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
