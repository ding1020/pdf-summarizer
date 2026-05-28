import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { rateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Paddle SDK 动态导入
async function getPaddleClient() {
  const Paddle = require("@paddle/paddle-node-sdk");  // eslint-disable-next-line
  
  // 支持明确的 PADDLE_ENVIRONMENT 设置，或根据 NODE_ENV 自动判断
  const environment = process.env.PADDLE_ENVIRONMENT || 
    (process.env.NODE_ENV === "production" ? "production" : "sandbox");
  
  return new Paddle(process.env.PADDLE_SECRET_KEY!, {
    environment,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for checkout (very strict)
    const clientId = getClientIdentifier(clerkId);
    const rateLimitResult = rateLimit(clientId, RATE_LIMITS.checkout);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many checkout attempts. Please wait a moment.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { plan, billingCycle = "monthly" } = await req.json();

    if (plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get the appropriate price ID based on billing cycle
    const priceId = billingCycle === "yearly" 
      ? process.env.PADDLE_PRICE_ID_YEARLY || process.env.PADDLE_PRICE_ID
      : process.env.PADDLE_PRICE_ID;

    if (!priceId) {
      logger.error("[Checkout] Missing price ID for billing cycle:", undefined, { billingCycle });
      return NextResponse.json({
        error: "Payment configuration error",
        code: "configuration_error",
        message: "Please contact support to upgrade your plan."
      }, { status: 503 });
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Paddle 配置检查
    if (!process.env.PADDLE_SECRET_KEY || !process.env.PADDLE_PRICE_ID) {
      logger.error("[Checkout] Missing Paddle configuration", undefined, {
        hasSecretKey: !!process.env.PADDLE_SECRET_KEY,
        hasPriceId: !!process.env.PADDLE_PRICE_ID,
      });
      return NextResponse.json({
        error: "Payment system not configured",
        message: "Please configure Paddle environment variables",
      }, { status: 503 });
    }

    const paddle = await getPaddleClient();

    // 创建 Paddle 客户链接结
    const customer = await paddle.customers.create({
      email: user.email,
      name: user.email.split("@")[0],
      metadata: {
        clerkId,
        dbUserId: String(user.id),
      },
    });

    // 创建结账会话
    const checkoutSession = await paddle.checkouts.create({
      customerId: customer.id,
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customData: {
        clerkId,
        dbUserId: String(user.id),
        billingCycle,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?payment=success`,
    });

    logger.info("[Checkout] Created checkout session", { clerkId, sessionId: checkoutSession.id });

    return NextResponse.json({
      url: checkoutSession.url,
    });

  } catch (error) {
    logger.error("[Checkout] Error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      error: "Failed to create checkout session",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
