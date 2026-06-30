/**
 * Stripe client — initialized once, cached on globalThis.
 *
 * Environment variables:
 *   STRIPE_SECRET_KEY=sk_live_xxx
 *   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
 *   STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
 *   STRIPE_WEBHOOK_SECRET=whsec_xxx
 */

import Stripe from "stripe";
import { logger } from "./logger";

const globalForStripe = globalThis as unknown as { _stripe?: Stripe };

function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    logger.warn("STRIPE_SECRET_KEY not configured — Stripe is disabled");
    return null;
  }
  return new Stripe(key, {
    apiVersion: "2025-06-16" as any,
    typescript: true,
  });
}

export const stripe = globalForStripe._stripe ?? createStripeClient();
if (process.env.NODE_ENV !== "production" && stripe) {
  globalForStripe._stripe = stripe;
}

/** Returns Stripe price IDs configured in env, or null if not set up */
export function getStripePriceIds(): { monthly: string; yearly: string } | null {
  const monthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const yearly = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  if (!monthly || !yearly) return null;
  return { monthly, yearly };
}

export function getStripeEnabled(): boolean {
  return stripe !== null && getStripePriceIds() !== null;
}
