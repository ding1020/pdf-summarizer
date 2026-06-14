import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

const submitSchema = z.object({
  plan: z.enum(["pro_monthly", "pro_yearly"]),
  channel: z.enum(["alipay", "wechat"]),
  txnRef: z.string().min(1, "请输入付款单号后4位"),
});

const PLAN_AMOUNTS: Record<string, number> = {
  pro_monthly: 5900,  // ¥59.00
  pro_yearly: 57900,  // ¥579.00
};

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
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

    // Check for duplicate (same user, same plan, still pending)
    const existing = await prisma.paymentRequest.findFirst({
      where: { userId, plan, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const minutesAgo = (Date.now() - existing.createdAt.getTime()) / 60000;
      if (minutesAgo < 30) {
        return NextResponse.json(
          { error: "您30分钟内已提交过相同方案的付款，请勿重复提交" },
          { status: 409 }
        );
      }
    }

    const payment = await prisma.paymentRequest.create({
      data: { userId, plan, amount, channel, txnRef },
    });

    logger.info("[Payment] New payment request", {
      paymentId: payment.id,
      userId,
      plan,
      amount,
      channel,
    });

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
