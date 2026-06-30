/**
 * Centralized application constants.
 * Single source of truth — import from here, never hardcode values.
 */

// ── Usage limits ──
export const FREE_DAILY_LIMIT = 5;
export const TRIAL_TOTAL_LIMIT = 20; // Total summaries during entire 3-day trial

// ── Rate limits ──
export const GUEST_RATE_LIMIT = { windowMs: 60_000, maxRequests: 3 } as const;
export const FREE_USER_RATE_LIMIT = { windowMs: 60_000, maxRequests: 20 } as const;
export const PRO_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 } as const;

// ── Payment: China plan amounts (in cents) ──
export const PLAN_AMOUNTS: Record<string, number> = {
  pro_monthly: 5900,  // ¥59.00
  pro_yearly: 57900,  // ¥579.00
};

// ── Payment: Creem price ID whitelist ──
// Source from env var for flexibility; falls back to hardcoded defaults.
// Format: "prod_xxx,prod_yyy"
export const ALLOWED_CREEM_PRICE_IDS = new Set(
  (process.env.CREEM_PRICE_ID_WHITELIST || "prod_2QOazgohfdxLNaIJi9IAND,prod_7GykYo9OXyvHnHOfStCLWk")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

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
