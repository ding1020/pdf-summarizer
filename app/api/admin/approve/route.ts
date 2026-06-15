import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user || user.email.trim() !== adminEmail.trim()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    // Determine subscription end date
    let subscriptionEndDate: Date;
    if (payment.plan === "pro_monthly") {
      subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      subscriptionEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    // Approve payment and upgrade user in a transaction
    await prisma.$transaction([
      prisma.paymentRequest.update({
        where: { id: paymentId },
        data: { status: "approved", reviewedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionStatus: "pro",
          billingCycle: payment.plan === "pro_monthly" ? "month" : "year",
          subscriptionEndDate,
        },
      }),
    ]);

    logger.info("[Admin] Payment approved", {
      paymentId,
      userId: payment.userId,
      plan: payment.plan,
    });

    return NextResponse.json({ success: true, message: "已批准并升级" });
  } catch (error) {
    logger.error("[Admin] Approve error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
