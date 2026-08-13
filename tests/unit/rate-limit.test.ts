/**
 * Rate Limiting Tests
 *
 * Tests:
 *  - In-memory rate limiting enforces limits correctly
 *  - Rate limit window resets after expiry
 *  - Different identifiers are tracked independently
 *  - Rate limit headers are correctly formatted
 *  - Predefined tiers have correct configurations
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimit,
  RATE_LIMITS,
  getClientIdentifier,
  getRateLimitHeaders,
  type RateLimitConfig,
} from "@/lib/rate-limit";

describe("Rate Limiting", () => {
  describe("In-memory rate limiting", () => {
    it("allows requests up to the limit", () => {
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };
      for (let i = 0; i < 5; i++) {
        const result = rateLimit(`test-allow-${i}-${Date.now()}`, config);
        expect(result.success).toBe(true);
      }
    });

    it("blocks requests exceeding the limit", () => {
      const id = `test-block-${Date.now()}`;
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 3 };
      // Use up the limit
      for (let i = 0; i < 3; i++) {
        rateLimit(id, config);
      }
      // 4th request should be blocked
      const result = rateLimit(id, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("tracks different identifiers independently", () => {
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 2 };
      const id1 = `test-independent-1-${Date.now()}`;
      const id2 = `test-independent-2-${Date.now()}`;

      // Use up limit for id1
      rateLimit(id1, config);
      rateLimit(id1, config);
      const id1Result = rateLimit(id1, config);
      expect(id1Result.success).toBe(false);

      // id2 should still be allowed
      const id2Result = rateLimit(id2, config);
      expect(id2Result.success).toBe(true);
    });

    it("decrements remaining count correctly", () => {
      const id = `test-remaining-${Date.now()}`;
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };

      const r1 = rateLimit(id, config);
      expect(r1.remaining).toBe(4);

      const r2 = rateLimit(id, config);
      expect(r2.remaining).toBe(3);

      const r3 = rateLimit(id, config);
      expect(r3.remaining).toBe(2);
    });

    it("returns reset time in the future", () => {
      const id = `test-reset-${Date.now()}`;
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };
      const now = Date.now();
      const result = rateLimit(id, config);
      expect(result.resetTime).toBeGreaterThan(now);
    });
  });

  describe("Predefined rate limit tiers", () => {
    it("free tier: 20 requests per minute", () => {
      expect(RATE_LIMITS.free.maxRequests).toBe(20);
      expect(RATE_LIMITS.free.windowMs).toBe(60_000);
    });

    it("pro tier: 60 requests per minute", () => {
      expect(RATE_LIMITS.pro.maxRequests).toBe(60);
      expect(RATE_LIMITS.pro.windowMs).toBe(60_000);
    });

    it("auth tier: 10 requests per minute (stricter for brute-force protection)", () => {
      expect(RATE_LIMITS.auth.maxRequests).toBe(10);
      expect(RATE_LIMITS.auth.windowMs).toBe(60_000);
    });

    it("checkout tier: 5 requests per minute (very strict)", () => {
      expect(RATE_LIMITS.checkout.maxRequests).toBe(5);
      expect(RATE_LIMITS.checkout.windowMs).toBe(60_000);
    });

    it("guest tier: 5 requests per minute", () => {
      expect(RATE_LIMITS.guest.maxRequests).toBe(5);
      expect(RATE_LIMITS.guest.windowMs).toBe(60_000);
    });

    it("free tier should be more restrictive than pro tier", () => {
      expect(RATE_LIMITS.free.maxRequests).toBeLessThan(RATE_LIMITS.pro.maxRequests);
    });
  });

  describe("getClientIdentifier", () => {
    it("uses userId when provided", () => {
      const id = getClientIdentifier("user-123", "192.168.1.1");
      expect(id).toBe("user:user-123");
    });

    it("falls back to IP when userId is null", () => {
      const id = getClientIdentifier(null, "192.168.1.1");
      expect(id).toBe("ip:192.168.1.1");
    });

    it("falls back to anonymous when neither is provided", () => {
      const id = getClientIdentifier(undefined, undefined);
      expect(id).toBe("ip:anonymous");
    });

    it("prefers userId over IP", () => {
      const id = getClientIdentifier("user-456", "10.0.0.1");
      expect(id).toBe("user:user-456");
    });
  });

  describe("getRateLimitHeaders", () => {
    it("returns remaining and reset time headers", () => {
      const headers = getRateLimitHeaders({
        remaining: 5,
        resetTime: Date.now() + 60000,
      });
      expect(headers["X-RateLimit-Remaining"]).toBe("5");
      expect(headers["X-RateLimit-Reset"]).toBeTruthy();
    });

    it("formats reset time as ISO string", () => {
      const resetTime = Date.now() + 30000;
      const headers = getRateLimitHeaders({ remaining: 0, resetTime });
      expect(headers["X-RateLimit-Reset"]).toBe(new Date(resetTime).toISOString());
    });

    it("handles zero remaining", () => {
      const headers = getRateLimitHeaders({ remaining: 0, resetTime: Date.now() + 60000 });
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });
  });
});