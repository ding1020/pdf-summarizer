import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Paddle SDK ESM 动态导入 (Next.js 15 兼容)
import type { Paddle as PaddleType } from "@paddle/paddle-node-sdk";

let _paddleClient: PaddleType | null = null;

async function getPaddleClient(): Promise<PaddleType> {
  if (_paddleClient) return _paddleClient;
  const { Paddle, Environment } = await import("@paddle/paddle-node-sdk");
  const environment =
    (process.env.PADDLE_ENVIRONMENT === "production" || process.env.NODE_ENV === "production")
      ? Environment.production
      : Environment.sandbox;
  _paddleClient = new Paddle(process.env.PADDLE_SECRET_KEY!, { environment });
  return _paddleClient;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for checkout (very strict)
    const clientId = getClientIdentifier(clerkId);
    const rateLimitResult = await rateLimitAsync(clientId, RATE_LIMITS.checkout);
    
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
    // eslint-disable-next-line
    const customer = await (paddle as any).customers.create({
      email: user.email,
      name: user.email.split("@")[0],
      customData: {
        clerkId,
        dbUserId: String(user.id),
      },
    });

    // 创建结账会话
    // eslint-disable-next-line
    const checkoutSession = await (paddle as any).checkouts.create({
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
