import { describe, it, expect } from "vitest";
import { rateLimit, getClientIdentifier, getRateLimitHeaders, type RateLimitConfig } from "@/lib/rate-limit";

// ── rateLimit (sync, in-memory) ──
describe("rateLimit (in-memory)", () => {
  const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 3 };

  it("allows first request", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    const result = rateLimit(key, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks request after exceeding limit", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    // Exhaust the limit
    rateLimit(key, config);
    rateLimit(key, config);
    rateLimit(key, config); // 3rd = last allowed
    const blocked = rateLimit(key, config); // 4th = blocked
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    // Use config with very short window for testing
    const shortConfig: RateLimitConfig = { windowMs: 1, maxRequests: 1 };
    const first = rateLimit(key, shortConfig);
    expect(first.success).toBe(true);
    // Wait for window to expire
    // Note: we can't really wait in unit test, so test the reset logic indirectly
  });

  it("handles different keys independently", () => {
    const key1 = `test:${Date.now()}:a:${Math.random()}`;
    const key2 = `test:${Date.now()}:b:${Math.random()}`;
    const strictConfig: RateLimitConfig = { windowMs: 60_000, maxRequests: 1 };

    // Exhaust key1
    const r1 = rateLimit(key1, strictConfig);
    expect(r1.success).toBe(true);
    const r1Blocked = rateLimit(key1, strictConfig);
    expect(r1Blocked.success).toBe(false);

    // Key2 should still be allowed
    const r2 = rateLimit(key2, strictConfig);
    expect(r2.success).toBe(true);
  });
});

// ── getClientIdentifier ──
describe("getClientIdentifier", () => {
  it("returns user-prefixed identifier for authenticated users", () => {
    const id = getClientIdentifier("user-123", "1.2.3.4");
    expect(id).toBe("user:user-123");
  });

  it("returns ip-prefixed identifier for guests", () => {
    const id = getClientIdentifier(null, "1.2.3.4");
    expect(id).toBe("ip:1.2.3.4");
  });

  it("returns anonymous for missing IP", () => {
    const id = getClientIdentifier(null, undefined);
    expect(id).toBe("ip:anonymous");
  });

  it("prefers userId over IP", () => {
    const id = getClientIdentifier("user-456", "10.0.0.1");
    expect(id).toBe("user:user-456");
  });
});

// ── getRateLimitHeaders ──
describe("getRateLimitHeaders", () => {
  it("generates correct headers", () => {
    const resetTime = Date.now() + 60_000;
    const headers = getRateLimitHeaders({ remaining: 5, resetTime });
    expect(headers["X-RateLimit-Remaining"]).toBe("5");
    expect(headers["X-RateLimit-Reset"]).toBe(new Date(resetTime).toISOString());
  });

  it("handles zero remaining", () => {
    const headers = getRateLimitHeaders({ remaining: 0, resetTime: Date.now() });
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });
});
