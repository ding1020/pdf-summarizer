/**
 * Redis Rate Limiting Utility
 * Production-ready rate limiting with Redis
 * Falls back to in-memory store if Redis is unavailable
 */

import { RATE_LIMITS } from "./rate-limit";
import type { RateLimitConfig } from "./rate-limit";
import { redis } from "./redis";

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  used: number;
}

/**
 * Redis-based sliding window rate limiter
 */
async function redisRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const limit = config.maxRequests;

  try {
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    const currentCount = await redis.zcard(key);
    
    // Check if limit exceeded
    if (currentCount >= limit) {
      const remaining = 0;
      const resetTime = now + config.windowMs;
      return {
        success: false,
        remaining,
        resetTime,
        limit,
        used: currentCount,
      };
    }

    // Add current request
    await redis.zadd(key, now, `${now}:${Math.random()}`);
    
    // Set expiry on the key
    await redis.pexpire(key, config.windowMs);

    const newCount = currentCount + 1;
    const remaining = Math.max(0, limit - newCount);
    const resetTime = now + config.windowMs;

    return {
      success: true,
      remaining,
      resetTime,
      limit,
      used: newCount,
    };
  } catch (error) {
    console.error("Redis rate limit error, falling back to memory:", error);
    return memoryRateLimit(identifier, config);
  }
}

/**
 * Memory-based rate limiter (fallback)
 */
function memoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  
  let entry = memoryStore.get(key);
  
  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  entry.count++;
  memoryStore.set(key, entry);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  // Cleanup old entries periodically
  if (memoryStore.size > 10000) {
    const cutoff = now - 60000;
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetTime < cutoff) {
        memoryStore.delete(k);
      }
    }
  }

  return {
    success,
    remaining,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
    used: entry.count,
  };
}

/**
 * Main rate limit function
 * Automatically uses Redis if available, falls back to memory
 */
export async function rateLimitWithRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  remaining: number;
  resetTime: number;
}> {
  // Check if Redis is enabled
  if (process.env.REDIS_ENABLED === "true") {
    const result = await redisRateLimit(identifier, config);
    return {
      success: result.success,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  }
  
  // Fallback to memory-based rate limiting
  const result = memoryRateLimit(identifier, config);
  return {
    success: result.success,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

// Export enhanced rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  ...RATE_LIMITS,
  // Additional configs for Redis-based limiting
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  moderate: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
};
