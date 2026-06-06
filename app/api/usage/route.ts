import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const FREE_DAILY_LIMIT = 5;

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({
        used: 0,
        limit: FREE_DAILY_LIMIT,
        remaining: FREE_DAILY_LIMIT,
        isPro: false,
        resetAt: null,
        isGuest: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, subscriptionStatus: true },
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

    // Count actual summarize API calls today (more accurate than document count)
    const todayUsage = await prisma.document.count({
      where: {
        userId: user.id,
        summary: { not: null },
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
      isGuest: false,
    });
  } catch (error) {
    logger.error("Failed to get usage stats:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
