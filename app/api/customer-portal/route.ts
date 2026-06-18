/**
 * GET /api/customer-portal
 *
 * Redirects the authenticated Pro user to the Creem Customer Portal
 * where they can manage their subscription (update payment method, cancel, etc.).
 *
 * Environment variables:
 *   CREEM_SECRET_KEY — Creem API secret key
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const CREEM_API_KEY = process.env.CREEM_SECRET_KEY?.replace(/^\uFEFF/, "");
const CREEM_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "https://test-api.creem.io/v1"
    : "https://api.creem.io/v1";

export async function GET(req: NextRequest) {
  // ── Auth check ──
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 },
    );
  }

  if (!CREEM_API_KEY) {
    logger.error("CREEM_SECRET_KEY not configured for customer portal");
    return NextResponse.json(
      { error: "Payment service is not configured. Please try again later." },
      { status: 500 },
    );
  }

  // ── Look up user ──
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      subscriptionStatus: true,
      creemCustomerId: true,
      creemSubscriptionId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.subscriptionStatus !== "pro") {
    return NextResponse.json(
      { error: "Only Pro users can access the customer portal." },
      { status: 403 },
    );
  }

  // ── Create a Creem customer portal session ──
  // If we have a Creem subscription ID, use it to scope the portal;
  // otherwise fall back to customer lookup by email.
  try {
    let portalUrl: string | null = null;

    // Preferred: use the subscription ID
    if (user.creemSubscriptionId) {
      const res = await fetch(
        `${CREEM_BASE_URL}/subscriptions/${user.creemSubscriptionId}/portal`,
        {
          method: "POST",
          headers: {
            "x-api-key": CREEM_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        portalUrl = data.url || data.portal_url || data.portalUrl;
      }
    }

    // Fallback: use customer portal by customer ID or email
    if (!portalUrl && user.creemCustomerId) {
      const res = await fetch(
        `${CREEM_BASE_URL}/customers/${user.creemCustomerId}/portal`,
        {
          method: "POST",
          headers: {
            "x-api-key": CREEM_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        portalUrl = data.url || data.portal_url || data.portalUrl;
      }
    }

    if (!portalUrl) {
      logger.warn("Could not create Creem customer portal session", {
        userId,
        hasSubscriptionId: !!user.creemSubscriptionId,
        hasCustomerId: !!user.creemCustomerId,
      });

      // Last resort: send user to Creem billing support
      return NextResponse.json(
        {
          error:
            "Could not open the customer portal. Please email support@pdfsum.com for help with your subscription.",
        },
        { status: 502 },
      );
    }

    logger.info("Customer portal session created", { userId });

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    logger.error(
      "Customer portal error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
