import { describe, it, expect } from "vitest";
import { computeCacheKey } from "@/lib/cache";

describe("cache", () => {
  it("computes deterministic cache key", () => {
    const key1 = computeCacheKey({ content: "test content", language: "en" });
    const key2 = computeCacheKey({ content: "test content", language: "en" });
    expect(key1).toBe(key2);
  });

  it("produces different keys for different content", () => {
    const key1 = computeCacheKey({ content: "content A", language: "en" });
    const key2 = computeCacheKey({ content: "content B", language: "en" });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different languages", () => {
    const key1 = computeCacheKey({ content: "test", language: "en" });
    const key2 = computeCacheKey({ content: "test", language: "zh" });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different models", () => {
    const key1 = computeCacheKey({ content: "test", language: "en", model: "deepseek-chat" });
    const key2 = computeCacheKey({ content: "test", language: "en", model: "llama-3.3-70b" });
    expect(key1).not.toBe(key2);
  });

  it("uses default values for optional params", () => {
    const key1 = computeCacheKey({ content: "test" });
    const key2 = computeCacheKey({ content: "test", language: "multilingual", style: "default", model: "any" });
    expect(key1).toBe(key2);
  });

  it("produces sha256-prefixed keys", () => {
    const key = computeCacheKey({ content: "test" });
    expect(key.startsWith("summary:")).toBe(true);
    // SHA-256 hex is 64 chars + "summary:" prefix = 72
    expect(key.length).toBe(72);
  });

  it("handles empty content", () => {
    const key = computeCacheKey({ content: "" });
    expect(key).toBeTruthy();
    expect(key.startsWith("summary:")).toBe(true);
  });

  it("trims content before hashing", () => {
    const key1 = computeCacheKey({ content: "test" });
    const key2 = computeCacheKey({ content: "  test  " });
    expect(key1).toBe(key2);
  });
});
