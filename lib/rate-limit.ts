/**
 * Rate Limiting Utility
 *
 * Dual-backend rate limiter:
 *   - Production: Upstash Redis (shared across all Vercel instances)
 *   - Dev/Fallback: In-memory Map with LRU eviction
 *
 * Environment variables (production):
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=****
 *
 * When neither is set, the in-memory store is used automatically.
 */

import { Redis } from "@upstash/redis";

// ── Types ──
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

// ── Redis client (lazy singleton) ──
let _redis: Redis | null = null;
let _redisInitAttempted = false;

function getRedis(): Redis | null {
  if (_redisInitAttempted) return _redis;
  _redisInitAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_* env vars not set — using in-memory store (NOT shared across Vercel instances)"
      );
    }
    return null;
  }

  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch (err) {
    console.error("[rate-limit] Failed to create Redis client:", err);
    return null;
  }
}

// ── Redis-based rate limiting (sliding window via INCR + EXPIRE) ──
async function redisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not available");

  const ttlSeconds = Math.ceil(config.windowMs / 1000);
  const now = Date.now();

  // Atomic: INCR returns the new count; if first request, set expiry
  const current = (await redis.incr(key)) as number;

  if (current === 1) {
    await redis.expire(key, ttlSeconds);
  }

  const ttl = await redis.ttl(key); // seconds remaining
  const success = current <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - current);
  const resetTime = now + (ttl > 0 ? ttl * 1000 : config.windowMs);

  return { success, remaining, resetTime };
}

// ── In-memory fallback ──
interface MemoryEntry {
  count: number;
  resetTime: number;
}

const MAX_STORE_SIZE = 5000;
const memoryStore = new Map<string, MemoryEntry>();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval !== null) return;
  if (typeof globalThis !== "undefined" && !process.env.VERCEL) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of memoryStore.entries()) {
        if (entry.resetTime < now) memoryStore.delete(key);
      }
    }, 60_000);
  }
}
if (typeof globalThis !== "undefined") startCleanup();

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let entry = memoryStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs };
  }

  entry.count++;
  memoryStore.set(key, entry);

  // LRU eviction
  if (memoryStore.size > MAX_STORE_SIZE) {
    const toDelete = Math.floor(MAX_STORE_SIZE * 0.2);
    const sorted = Array.from(memoryStore.entries())
      .sort((a, b) => a[1].resetTime - b[1].resetTime)
      .slice(0, toDelete);
    for (const [k] of sorted) memoryStore.delete(k);
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return { success, remaining, resetTime: entry.resetTime };
}

// ── Public API ──

/**
 * Rate limit a request.
 * When Redis is configured → atomic, shared across all server instances.
 * When Redis is not configured → local in-memory (dev/testing only).
 *
 * ⚠️  Synchronous: only works with in-memory backend.
 *     For production (Redis), use rateLimitAsync().
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // Synchronous path always uses memory (Redis requires async)
  return memoryRateLimit(`rl:${identifier}`, config);
}

/**
 * Rate limit a request (async).
 * Prefer this for production — it uses Redis when available,
 * falling back to in-memory automatically.
 */
export async function rateLimitAsync(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();

  if (redis) {
    try {
      return await redisRateLimit(`rl:${identifier}`, config);
    } catch (err) {
      console.warn("[rate-limit] Redis error, falling back to memory:", err);
    }
  }

  return memoryRateLimit(`rl:${identifier}`, config);
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
export function getClientIdentifier(
  userId?: string | null,
  ip?: string
): string {
  if (userId) return `user:${userId}`;
  return `ip:${ip || "anonymous"}`;
}

export function getRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
}) {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
  };
}
