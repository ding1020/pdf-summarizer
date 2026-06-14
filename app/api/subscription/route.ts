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
        subscriptionStatus: true,
        subscriptionEndDate: true,
      paddleSubscriptionId: true,  // kept for legacy data
      paddlePlanId: true,           // kept for legacy data
        billingCycle: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        subscriptionStatus: "free",
        subscriptionEndDate: null,
        paddleSubscriptionId: null,
        paddlePlanId: null,
        billingCycle: null,
      });
    }

    return NextResponse.json({
      subscriptionStatus: user.subscriptionStatus || "free",
      subscriptionEndDate: user.subscriptionEndDate?.toISOString() || null,
      paddleSubscriptionId: user.paddleSubscriptionId,
      paddlePlanId: user.paddlePlanId,
      billingCycle: user.billingCycle,
    });
  } catch (error) {
    logger.error("Failed to get subscription status", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
