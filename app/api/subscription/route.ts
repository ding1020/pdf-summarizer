import { getAuthUserId } from "@/lib/get-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateResult = await rateLimitAsync(getClientIdentifier(userId), RATE_LIMITS.free);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        billingCycle: true,
        creemSubscriptionId: true,
        creemCustomerId: true,
        creemPriceId: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        subscriptionStatus: "free",
        subscriptionEndDate: null,
        creemSubscriptionId: null,
        creemCustomerId: null,
        creemPriceId: null,
        billingCycle: null,
      });
    }

    return NextResponse.json({
      subscriptionStatus: user.subscriptionStatus || "free",
      subscriptionEndDate: user.subscriptionEndDate?.toISOString() || null,
      creemSubscriptionId: user.creemSubscriptionId || null,
      creemCustomerId: user.creemCustomerId || null,
      creemPriceId: user.creemPriceId || null,
      billingCycle: user.billingCycle || null,
    });
  } catch (error) {
    logger.error("Failed to get subscription status", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
