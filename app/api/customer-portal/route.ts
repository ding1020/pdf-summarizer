import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Paddle 配置检查
    if (!process.env.PADDLE_SECRET_KEY) {
      logger.error("[Customer Portal] Missing Paddle configuration");
      return NextResponse.json({
        error: "Payment system not configured",
      }, { status: 503 });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 动态导入 Paddle SDK (ESM import)
    const { Paddle, Environment } = await import("@paddle/paddle-node-sdk");
    
    // 支持明确的 PADDLE_ENVIRONMENT 设置
    const environment =
      (process.env.PADDLE_ENVIRONMENT === "production" || process.env.NODE_ENV === "production")
        ? Environment.production
        : Environment.sandbox;
    
    const paddle = new Paddle(process.env.PADDLE_SECRET_KEY!, {
      environment,
    });

    // 查找或创建 Paddle 客户
    // Paddle SDK v2: types are incomplete; use any cast for runtime-compatible API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customers = await (paddle as any).customers.list({
      email: [user.email],
    });

    let customerId: string;

    if (customers?.data && customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newCustomer = await (paddle as any).customers.create({
        email: user.email,
        name: user.email.split("@")[0],
        customData: {
          clerkId: userId,
          dbUserId: String(user.id),
        },
      });
      customerId = newCustomer.id;
    }

    // 创建客户门户会话
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const portalSession = await (paddle as any).portalCustomers.createSession({
      customerId: customerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/subscription`,
    });

    logger.info("[Customer Portal] Created portal session", { userId });

    return NextResponse.json({
      url: portalSession.url,
    });

  } catch (error) {
    logger.error("[Customer Portal] Error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      error: "Failed to create portal session",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
