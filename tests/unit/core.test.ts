import { describe, it, expect } from "vitest";

describe("Schemas — Validation", () => {
  it("summarizeSchema accepts UUID documentId", () => {
    const { summarizeSchema } = require("@/lib/schemas");
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Test content for summarization.",
    });
    expect(result.success).toBe(true);
  });

  it("summarizeSchema accepts guest documentId", () => {
    const { summarizeSchema } = require("@/lib/schemas");
    const result = summarizeSchema.safeParse({
      documentId: "guest_1686000000000_abc123x",
      content: "Test content.",
    });
    expect(result.success).toBe(true);
  });

  it("summarizeSchema rejects invalid documentId", () => {
    const { summarizeSchema } = require("@/lib/schemas");
    const result = summarizeSchema.safeParse({
      documentId: "invalid!!!",
      content: "Test content.",
    });
    expect(result.success).toBe(false);
  });

  it("summarizeSchema requires content", () => {
    const { summarizeSchema } = require("@/lib/schemas");
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("AI — Token Estimation", () => {
  it("estimateTokens handles English text", () => {
    const { estimateTokens } = require("@/lib/ai");
    const tokens = estimateTokens("This is a simple English sentence.");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(50);
  });

  it("estimateTokens handles Chinese text", () => {
    const { estimateTokens } = require("@/lib/ai");
    const tokens = estimateTokens("这是一个简单的中文句子。");
    expect(tokens).toBeGreaterThan(0);
  });

  it("calculateCost returns zero for free providers", () => {
    const { calculateCost } = require("@/lib/ai");
    const cost = calculateCost("groq", 1000, 500);
    expect(cost).toBe(0);
  });
});
