/**
 * Shared API utilities — single source of truth for common patterns.
 *
 * Extracted from duplicated logic across ~10 route files:
 *   - Client IP extraction
 *   - User subscription tier lookup
 *   - Per-tier rate limit config selection
 *   - Per-tier content length selection
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { RATE_LIMITS, type RateLimitConfig } from "@/lib/rate-limit";
import {
  FREE_USER_RATE_LIMIT,
  GUEST_RATE_LIMIT,
  PRO_RATE_LIMIT,
  MAX_CONTENT_LENGTH,
  PRO_MAX_CONTENT_LENGTH,
} from "@/lib/constants";

// ── IP extraction ──

/** Extract the canonical client IP from a request, falling back to "anonymous". */
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

// ── Subscription tier ──

import { isProStatus } from "./subscription";

export type UserTier = "pro" | "free";

/** Look up a user's subscription tier (includes trial). Falls back to "free" on any error. */
export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });
    return isProStatus(user?.subscriptionStatus) ? "pro" : "free";
  } catch {
    return "free";
  }
}

// ── Rate limit config by tier ──

/** Resolve the per-minute rate limit config for a given user tier. */
export function getRateLimitByTier(tier: UserTier): RateLimitConfig {
  return tier === "pro" ? PRO_RATE_LIMIT : FREE_USER_RATE_LIMIT;
}

/** Resolve the per-minute rate limit config for a guest. */
export function getGuestRateLimit(): RateLimitConfig {
  return GUEST_RATE_LIMIT;
}

// ── Content length by tier ──

/** Resolve the max content length (chars) for a given user tier. */
export function getContentLengthByTier(tier: UserTier): number {
  return tier === "pro" ? PRO_MAX_CONTENT_LENGTH : MAX_CONTENT_LENGTH;
}

// ── Convenience: resolve rate limit config from userId ──

/** Rate-limit config filter: what audience / tier applies? */
export type RateLimitAudience = "guest" | "free" | "pro";

/**
 * Resolve rate-limit audience and config for a request.
 * Returns the audience AND the rate limit config struct.
 */
export async function resolveRateLimit(
  userId: string | null,
): Promise<{ audience: RateLimitAudience; config: RateLimitConfig }> {
  if (!userId) {
    return { audience: "guest", config: GUEST_RATE_LIMIT };
  }
  const tier = await getUserTier(userId);
  return {
    audience: tier,
    config: getRateLimitByTier(tier),
  };
}
