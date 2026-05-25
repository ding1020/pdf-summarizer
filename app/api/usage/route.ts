import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Free tier limits
const FREE_DAILY_LIMIT = 5;

export async function GET() {
  try {
    // Demo mode: auth optional
    let clerkId: string | null = null;
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = auth();
      if (userId) clerkId = userId;
    } catch (e) {
      // Demo mode
    }

    if (clerkId) {
      // Get user
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: {
          subscriptionStatus: true,
        },
      });

      const isPro = user?.subscriptionStatus === "pro";

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayUsage = await prisma.document.count({
        where: {
          user: { clerkId },
          createdAt: {
            gte: startOfDay,
          },
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
    }

    // Demo mode: provide default usage limits
    return NextResponse.json({
      used: 0,
      limit: 10,
      remaining: 10,
      isPro: false,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      demoMode: true,
    });
  } catch (error) {
    console.error("Failed to get usage stats:", error);
    // Return default usage even on error
    return NextResponse.json({
      used: 0,
      limit: 10,
      remaining: 10,
      isPro: false,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      demoMode: true,
    });
  }
}
