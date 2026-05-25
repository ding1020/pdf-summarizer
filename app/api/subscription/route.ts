import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user with subscription info
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        subscriptionStatus: true,
        subscriptionEndDate: true,
        paddleSubscriptionId: true,
        paddlePlanId: true,
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
    console.error("Failed to get subscription status:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
