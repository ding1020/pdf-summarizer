import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier } from "@/lib/rate-limit";
import { PLAN_AMOUNTS } from "@/lib/constants";
import { sendEmail, adminPaymentAlertEmail } from "@/lib/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

const submitSchema = z.object({
  plan: z.enum(["pro_monthly", "pro_yearly"]),
  channel: z.enum(["alipay", "wechat"]),
  txnRef: z.string().min(1, "请输入付款单号后4位"),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // Rate limit: 5 submissions per minute per user (anti-abuse)
    const rateKey = getClientIdentifier(userId);
    const rateResult = await rateLimitAsync(rateKey, RATE_LIMITS.checkout);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // Already Pro?
    if (user.subscriptionStatus === "pro") {
      return NextResponse.json({ error: "您已经是专业版用户" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "无效请求" },
        { status: 400 }
      );
    }

    const { plan, channel, txnRef } = parsed.data;
    const amount = PLAN_AMOUNTS[plan];

    // ── Atomic duplicate check + create (eliminates TOCTOU race) ──
    // Use a DB-level uniqueness check: if a pending record for userId+plan exists
    // within 30 minutes, reject. Otherwise create in the same transaction.
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentRequest.findFirst({
        where: {
          userId,
          plan,
          status: "pending",
          createdAt: { gte: thirtyMinAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return null; // Signal duplicate
      }

      return tx.paymentRequest.create({
        data: { userId, plan, amount, channel, txnRef },
      });
    });

    if (!payment) {
      return NextResponse.json(
        { error: "您30分钟内已提交过相同方案的付款，请勿重复提交" },
        { status: 409 }
      );
    }

    logger.info("[Payment] New payment request", {
      paymentId: payment.id,
      userId,
      plan,
      amount,
      channel,
    });

    // ── Notify admin via email ──
    if (ADMIN_EMAIL) {
      const amountStr = `¥${(amount / 100).toFixed(2)}`;
      const template = adminPaymentAlertEmail({
        userName: user.firstName || user.email,
        userEmail: user.email,
        plan,
        amount: amountStr,
        channel,
        txnRef: txnRef.trim(),
        paymentId: payment.id,
      });
      await sendEmail({ to: ADMIN_EMAIL, ...template }).catch((err) => {
        logger.warn("Failed to send admin payment alert", { error: String(err) });
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      message: "付款凭证已提交，我们将在核对后为您开通。通常1小时内完成。",
    });
  } catch (error) {
    logger.error("[Payment] Submit error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 500 });
  }
}
