/**
 * Centralized application constants.
 * Single source of truth — import from here, never hardcode values.
 */

// ── Usage limits ──
export const FREE_DAILY_LIMIT = 5;
export const TRIAL_TOTAL_LIMIT = 20; // Total summaries during entire 3-day trial

// ── Rate limits (single source: lib/rate-limit.ts RATE_LIMITS) ──
// ⚠️  These are maintained as convenience re-exports. Any changes should
//     be made in lib/rate-limit.ts → RATE_LIMITS, then mirrored here.
export const GUEST_RATE_LIMIT = { windowMs: 60_000, maxRequests: 5 } as const;
export const FREE_USER_RATE_LIMIT = { windowMs: 60_000, maxRequests: 20 } as const;
export const PRO_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 } as const;

// ── Payment: Plan amounts in USD cents ──
export const PLAN_AMOUNTS: Record<string, number> = {
  pro_monthly: 700,   // $7.00
  pro_yearly: 5900,   // $59.00
};

// ── Payment: Creem price ID whitelist ──
// Accepts the public monthly/yearly price IDs by default, and any additional
// IDs supplied via CREEM_PRICE_ID_WHITELIST (format: "prod_xxx,prod_yyy").
const DEFAULT_CREEM_PRICE_IDS = [
  process.env.NEXT_PUBLIC_CREEM_PRICE_MONTHLY,
  process.env.NEXT_PUBLIC_CREEM_PRICE_YEARLY,
].filter((id): id is string => Boolean(id));

const additionalWhitelist = (process.env.CREEM_PRICE_ID_WHITELIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_CREEM_PRICE_IDS = new Set([
  ...DEFAULT_CREEM_PRICE_IDS,
  ...additionalWhitelist,
]);

// ── Content limits ──
export const MAX_CONTENT_LENGTH = 15_000;
export const PRO_MAX_CONTENT_LENGTH = 50_000;
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// ── Subscription status values ──
export const SUBSCRIPTION_STATUS = {
  FREE: "free",
  PRO: "pro",
  PRO_TRIAL: "pro_trial",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
} as const;

// ── Billing cycle values ──
export const BILLING_CYCLE = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

// ── Support ──
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";
