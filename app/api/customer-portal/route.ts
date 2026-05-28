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

    // 动态导入 Paddle SDK
    const Paddle = require("@paddle/paddle-node-sdk");  // eslint-disable-next-line
    
    // 支持明确的 PADDLE_ENVIRONMENT 设置
    const environment = process.env.PADDLE_ENVIRONMENT || 
      (process.env.NODE_ENV === "production" ? "production" : "sandbox");
    
    const paddle = new Paddle(process.env.PADDLE_SECRET_KEY!, {
      environment,
    });

    // 查找或创建 Paddle 客户
    const customers = await paddle.customers.list({
      email: user.email,
    });

    let customerId: string;

    if (customers.items && customers.items.length > 0) {
      customerId = customers.items[0].id;
    } else {
      const newCustomer = await paddle.customers.create({
        email: user.email,
        name: user.email.split("@")[0],
        metadata: {
          clerkId: userId,
          dbUserId: String(user.id),
        },
      });
      customerId = newCustomer.id;
    }

    // 创建客户门户会话
    const portalSession = await paddle.portalCustomers.createSession({
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
