/**
 * Rate Limiting Utility
 * In-memory rate limiter with LRU eviction for serverless environments.
 *
 * ⚠️  PRODUCTION NOTE: In-memory store resets on cold starts and is not
 * shared across Vercel instances. For production workloads, migrate to
 * @vercel/kv or Upstash Redis:
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   import { Redis } from "@upstash/redis";
 *   const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: ... });
 */

// ── Types ──
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

// ── Store with capacity limit (prevents memory leaks) ──
const MAX_STORE_SIZE = 5000;
const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup for non-serverless environments
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupIntervalId === null && typeof globalThis !== 'undefined' && !process.env.VERCEL) {
    cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
          rateLimitStore.delete(key);
        }
      }
    }, 60000);
  }
}

// Initialize cleanup on module load
if (typeof globalThis !== 'undefined') {
  ensureCleanup();
}

// ── Core rate limiter ──
export function rateLimit(
  identifier: string,
  config: RateLimitConfig,
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rl:${identifier}`;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  // LRU eviction — if store grows too large, remove oldest entries
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const keysToDelete = Math.floor(MAX_STORE_SIZE * 0.2); // evict 20%
    const entries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].resetTime - b[1].resetTime)
      .slice(0, keysToDelete);

    for (const [k] of entries) {
      rateLimitStore.delete(k);
    }
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return { success, remaining, resetTime: entry.resetTime };
}

// ── Predefined rate limit tiers ──
export const RATE_LIMITS = {
  /** Free registered users: 20 req/min */
  free: { windowMs: 60_000, maxRequests: 20 } as RateLimitConfig,
  /** Pro subscribers: 60 req/min */
  pro: { windowMs: 60_000, maxRequests: 60 } as RateLimitConfig,
  /** Auth endpoints: 10 req/min */
  auth: { windowMs: 60_000, maxRequests: 10 } as RateLimitConfig,
  /** Checkout: 5 req/min */
  checkout: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,
  /** Guest users: 3 req/min */
  guest: { windowMs: 60_000, maxRequests: 3 } as RateLimitConfig,
};

// ── Helpers ──
export function getClientIdentifier(userId?: string | null, ip?: string): string {
  if (userId) return `user:${userId}`;
  return `ip:${ip || 'anonymous'}`;
}

export function getRateLimitHeaders(result: { remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };
}
