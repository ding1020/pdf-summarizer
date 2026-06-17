import { getAuthUserId } from "@/lib/get-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
