/**
 * AI Summary Cache — Content-hash based deduplication.
 *
 * Caches summaries by sha256(content + language + style) so that
 * re-submitting the same document does not consume an AI call.
 *
 * Backends:
 *   - Production: Upstash Redis (shared, persistent)
 *   - Dev/Fallback: In-memory LRU Map
 *
 * TTL: 24 hours for Redis, configurable via env.
 */

import { createHash } from "crypto";
import { logger } from "./logger";
import { getRedis } from "./redis";

// ── Config ──
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || "86400", 10); // 24h
const MAX_MEMORY_ENTRIES = 200;

// ── In-memory fallback ──
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlMs: number): void {
  // LRU eviction
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const toDelete = Math.floor(MAX_MEMORY_ENTRIES * 0.2);
    const sorted = Array.from(memoryCache.entries()).sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt,
    );
    for (let i = 0; i < toDelete && i < sorted.length; i++) {
      memoryCache.delete(sorted[i][0]);
    }
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ── Hash computation ──

export interface CacheKeyParts {
  content: string;
  language?: string;
  style?: string;
  model?: string;
}

/** Compute a deterministic cache key from content + parameters. */
export function computeCacheKey(parts: CacheKeyParts): string {
  const normalized = [
    parts.content.trim(),
    parts.language || "multilingual",
    parts.style || "default",
    parts.model || "any",
  ].join("|");
  return `summary:${createHash("sha256").update(normalized).digest("hex")}`;
}

// ── Public API ──

/** Try to retrieve a cached summary. Returns null on miss or error. */
export async function getCachedSummary(
  key: string,
): Promise<string | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<string>(key);
      if (cached) {
        logger.info("[cache] Redis cache hit", { keyPrefix: key.slice(0, 20) });
        return cached;
      }
    } catch (err) {
      logger.warn("[cache] Redis GET failed, trying memory", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return memoryGet(key);
}

/** Store a summary in the cache. Fire-and-forget (errors are logged). */
export function setCachedSummary(
  key: string,
  summary: string,
): void {
  const redis = getRedis();

  if (redis) {
    redis
      .set(key, summary, { ex: CACHE_TTL_SECONDS })
      .then(() => {
        logger.info("[cache] Redis cache set", { keyPrefix: key.slice(0, 20) });
      })
      .catch((err: unknown) => {
        logger.warn("[cache] Redis SET failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  // Always set in memory too (belt-and-suspenders for same-instance reads)
  memorySet(key, summary, CACHE_TTL_SECONDS * 1000);
}

/** Check if cache is available (Redis or memory). Always returns true (memory fallback). */
export function isCacheAvailable(): boolean {
  return true;
}

export default {
  computeCacheKey,
  getCachedSummary,
  setCachedSummary,
  isCacheAvailable,
};
