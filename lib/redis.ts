/**
 * Shared Redis Singleton
 *
 * Lazy-initializes a single Upstash Redis client shared by:
 *   - lib/cache.ts (AI summary cache)
 *   - lib/rate-limit.ts (rate limiting)
 *
 * Prevents duplicate connections from multiple modules.
 */
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

let _redis: Redis | null = null;
let _redisInitAttempted = false;

export function getRedis(): Redis | null {
  if (_redisInitAttempted) return _redis;
  _redisInitAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.info("[redis] Redis not configured — using in-memory fallback");
    return null;
  }

  try {
    _redis = new Redis({ url, token });
    logger.info("[redis] Redis client initialized (shared singleton)");
    return _redis;
  } catch (err) {
    logger.error(
      "[redis] Failed to create Redis client",
      err instanceof Error ? err : new Error(String(err)),
    );
    return null;
  }
}
