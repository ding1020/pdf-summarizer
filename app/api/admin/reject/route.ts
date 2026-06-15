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
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { status: "rejected", reviewedAt: new Date() },
    });

    logger.info("[Admin] Payment rejected", { paymentId, userId: payment.userId });

    return NextResponse.json({ success: true, message: "已拒绝" });
  } catch (error) {
    logger.error("[Admin] Reject error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
