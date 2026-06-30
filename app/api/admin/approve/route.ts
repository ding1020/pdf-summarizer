import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { sendEmail, paymentSuccessEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateResult = await rateLimitAsync(getClientIdentifier(userId), RATE_LIMITS.auth);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.error("[Admin] ADMIN_EMAIL environment variable not configured — blocking admin access");
      return NextResponse.json(
        { error: "Admin access is not configured on this server." },
        { status: 403 },
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user || user.email.trim() !== adminEmail.trim()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
    }

    // ── Atomic approve: check status INSIDE transaction to prevent TOCTOU race ──
    // Two concurrent admin approvals must not both succeed.
    const payment = await prisma.$transaction(async (tx) => {
      const record = await tx.paymentRequest.findUnique({
        where: { id: paymentId },
        include: { user: { select: { id: true, email: true } } },
      });

      if (!record) throw new Error("NOT_FOUND");
      if (record.status !== "pending") return null; // already processed

      // Determine subscription end date
      const durationDays = record.plan === "pro_monthly" ? 30 : 365;
      const subscriptionEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Approve payment
      await tx.paymentRequest.update({
        where: { id: paymentId },
        data: { status: "approved", reviewedAt: new Date() },
      });

      // Upgrade user
      await tx.user.update({
        where: { id: record.userId },
        data: {
          subscriptionStatus: "pro",
          billingCycle: record.plan === "pro_monthly" ? "monthly" : "yearly",
          subscriptionEndDate,
        },
      });

      return record;
    });

    if (!payment) {
      // Payment was already processed (not pending)
      return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
    }

    logger.info("[Admin] Payment approved", {
      paymentId,
      userId: payment.userId,
      plan: payment.plan,
    });

    // ── Notify user of successful activation ──
    const planCycle = payment.plan === "pro_monthly" ? "monthly" : "yearly";
    const endDateStr = new Date(Date.now() + (payment.plan === "pro_monthly" ? 30 : 365) * 24 * 60 * 60 * 1000)
      .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    try {
      const template = paymentSuccessEmail(
        payment.user.email.split("@")[0] || "there",
        planCycle as "monthly" | "yearly",
        endDateStr,
      );
      await sendEmail({ to: payment.user.email, ...template });
    } catch (emailErr) {
      logger.warn("[Admin] Failed to send payment success email", { error: String(emailErr) });
    }

    return NextResponse.json({ success: true, message: "已批准并升级" });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    logger.error("[Admin] Approve error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
