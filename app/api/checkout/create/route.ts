/**
 * POST /api/checkout/create
 *
 * Creates a Creem checkout session for the given price ID.
 * Returns a redirect URL for the client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { logger } from "@/lib/logger";
import { ALLOWED_CREEM_PRICE_IDS } from "@/lib/constants";

const CREEM_API_KEY = process.env.CREEM_SECRET_KEY?.replace(/^\uFEFF/, "");
const CREEM_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "https://test-api.creem.io/v1"
    : "https://api.creem.io/v1";

export async function POST(req: NextRequest) {
  // ── Auth check ──
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 },
    );
  }

  // ── Parse body ──
  let body: { priceId?: string; planType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const priceId = body.priceId;
  if (!priceId) {
    return NextResponse.json(
      { error: "priceId is required." },
      { status: 400 },
    );
  }

  // ── Validate priceId against whitelist ──
  if (!ALLOWED_CREEM_PRICE_IDS.has(priceId)) {
    logger.warn("Rejected non-whitelisted priceId", { userId, priceId });
    return NextResponse.json(
      { error: "Invalid price ID." },
      { status: 400 },
    );
  }

  if (!CREEM_API_KEY) {
    logger.error("CREEM_SECRET_KEY not configured");
    return NextResponse.json(
      { error: "Payment service is not configured. Please try again later." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${CREEM_BASE_URL}/checkouts`, {
      method: "POST",
      headers: {
        "x-api-key": CREEM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: priceId,
        metadata: {
          userId,
          source: "web",
          planType: body.planType || "pro_monthly",
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.error("Creem checkout creation failed", undefined, {
        status: response.status,
        body: errBody.slice(0, 500),
      });
      return NextResponse.json(
        { error: "Failed to create checkout session. Please try again." },
        { status: 502 },
      );
    }

    const data = await response.json();

    const checkoutUrl = data.checkoutUrl || data.checkout_url || data.url;

    if (!checkoutUrl) {
      logger.error("Creem checkout response missing URL", undefined, { data: JSON.stringify(data).slice(0, 500) });
      return NextResponse.json(
        { error: "Failed to create checkout session. Please try again." },
        { status: 502 },
      );
    }

    logger.info("Creem checkout created", { userId, checkoutUrl });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    logger.error("Creem checkout error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
