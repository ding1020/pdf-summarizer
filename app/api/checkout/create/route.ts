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
  logger.info("Creem checkout requested", { userId, priceId, planType: body.planType });

  if (!priceId) {
    return NextResponse.json(
      { error: "priceId is required." },
      { status: 400 },
    );
  }

  // ── Validate priceId against whitelist ──
  if (!ALLOWED_CREEM_PRICE_IDS.has(priceId)) {
    logger.warn("Rejected non-whitelisted priceId", { userId, priceId, allowed: Array.from(ALLOWED_CREEM_PRICE_IDS) });
    return NextResponse.json(
      { error: "Invalid price ID." },
      { status: 400 },
    );
  }

  if (!CREEM_API_KEY) {
    logger.error("CREEM_SECRET_KEY not configured", undefined, { userId, priceId });
    return NextResponse.json(
      { error: "Payment provider is not configured. Please contact support." },
      { status: 503 },
    );
  }

  try {
    // ── Retry Creem API call (3 attempts with exponential backoff) ──
    let response: Response | null = null;
    let lastErr: string = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(500 * Math.pow(2, attempt), 3000);
        await new Promise((r) => setTimeout(r, delay));
      }
      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 10_000);
        response = await fetch(`${CREEM_BASE_URL}/checkouts`, {
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
          signal: abortController.signal,
        });
        clearTimeout(timeoutId);
        break; // Success — exit retry loop
      } catch (fetchErr) {
        lastErr = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        logger.warn(`Creem checkout attempt ${attempt + 1} failed`, { error: lastErr });
      }
    }

    if (!response) {
      logger.error("Creem checkout failed after 3 retries", undefined, { lastErr });
      return NextResponse.json(
        { error: "Payment service temporarily unavailable. Please try again." },
        { status: 502 },
      );
    }

    if (!response.ok) {
      let errBody: string;
      try {
        errBody = await response.text();
      } catch {
        errBody = "Unable to read error response.";
      }
      logger.error("Creem checkout creation failed", undefined, {
        status: response.status,
        body: errBody.slice(0, 500),
      });
      return NextResponse.json(
        { error: "Failed to create checkout session. Please try again." },
        { status: 502 },
      );
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch (parseErr) {
      logger.error("Creem checkout response is not valid JSON", parseErr instanceof Error ? parseErr : new Error(String(parseErr)));
      return NextResponse.json(
        { error: "Payment provider returned an invalid response. Please try again." },
        { status: 502 },
      );
    }

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
    logger.error("Creem checkout unexpected error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Payment service temporarily unavailable. Please try again later." },
      { status: 500 },
    );
  }
}
