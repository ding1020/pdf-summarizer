/**
 * POST /api/stripe/checkout/create
 *
 * Creates a Stripe Checkout Session and returns the URL for redirect.
 * Similar to Creem checkout but uses Stripe's hosted checkout page.
 *
 * Requires authentication via __auth_token cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe, getStripePriceIds, getStripeEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyTokenEdge } from "@/lib/auth-token-edge";

export async function POST(req: NextRequest) {
  if (!getStripeEnabled()) {
    return NextResponse.json({ error: "Stripe payment is not configured yet" }, { status: 503 });
  }

  // ── Auth ──
  const token = req.cookies.get("__auth_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyTokenEdge(token);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.userId as string;

  // ── Parse body ──
  let body: { planType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planType = body.planType === "pro_yearly" ? "pro_yearly" : "pro_monthly";

  // ── Validate user ──
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, subscriptionStatus: true, firstName: true, lastName: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Already paid Pro — no need to purchase again
  if (user.subscriptionStatus === "pro") {
    return NextResponse.json({ error: "You are already a Pro member" }, { status: 400 });
  }

  // ── Get price ID ──
  const priceIds = getStripePriceIds();
  if (!priceIds) {
    return NextResponse.json({ error: "Stripe price IDs not configured" }, { status: 503 });
  }

  const priceId = planType === "pro_yearly" ? priceIds.yearly : priceIds.monthly;

  // ── Create checkout session ──
  try {
    const session = await stripe!.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: userId,
      metadata: {
        userId,
        planType,
        source: "web",
      },
      success_url: `${req.nextUrl.origin}/dashboard?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    logger.info("Stripe checkout created", { userId, planType, sessionId: session.id });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error(
      "Stripe checkout creation failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Payment service temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
