import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  getProviderFallbackChain,
  calculateCost,
  createUsageRecord,
  getSystemPrompt,
  type AIProvider,
} from "@/lib/ai";

// ── estimateTokens ──
describe("estimateTokens", () => {
  it("handles English text", () => {
    const tokens = estimateTokens("This is a simple English sentence.");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(20);
  });

  it("handles Chinese text", () => {
    const tokens = estimateTokens("这是一个简单的中文句子。");
    expect(tokens).toBeGreaterThanOrEqual(10);
  });

  it("handles mixed Chinese and English", () => {
    const tokens = estimateTokens("AI人工智能 is amazing!");
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(25);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for whitespace-only", () => {
    const tokens = estimateTokens("   \n\t  ");
    expect(tokens).toBe(0);
  });

  it("handles very long text proportionally", () => {
    const longText = "Hello World! ".repeat(1000);
    const tokens = estimateTokens(longText);
    expect(tokens).toBeGreaterThan(1000);
  });

  it("handles pure Chinese character counting", () => {
    const tokens = estimateTokens("人工智能机器学习深度学习");
    // 10 Chinese chars * 1.5 = 15
    expect(tokens).toBeGreaterThanOrEqual(10);
    expect(tokens).toBeLessThanOrEqual(20);
  });
});

// ── getProviderFallbackChain ──
describe("getProviderFallbackChain", () => {
  it("returns default order: deepseek → groq → siliconflow", () => {
    const chain = getProviderFallbackChain();
    expect(chain).toHaveLength(3);
    expect(chain[0].provider).toBe("deepseek");
    expect(chain[1].provider).toBe("groq");
    expect(chain[2].provider).toBe("siliconflow");
  });

  it("starts from preferred provider 'groq'", () => {
    const chain = getProviderFallbackChain("groq");
    expect(chain).toHaveLength(3);
    expect(chain[0].provider).toBe("groq");
    expect(chain[1].provider).toBe("siliconflow");
    expect(chain[2].provider).toBe("deepseek");
  });

  it("starts from preferred provider 'siliconflow'", () => {
    const chain = getProviderFallbackChain("siliconflow");
    expect(chain).toHaveLength(3);
    expect(chain[0].provider).toBe("siliconflow");
    expect(chain[1].provider).toBe("deepseek");
    expect(chain[2].provider).toBe("groq");
  });

  it("returns default order for unknown provider", () => {
    const chain = getProviderFallbackChain("unknown" as AIProvider);
    expect(chain).toHaveLength(3);
    expect(chain[0].provider).toBe("deepseek");
  });

  it("returns default order for undefined", () => {
    const chain = getProviderFallbackChain(undefined);
    expect(chain).toHaveLength(3);
    expect(chain[0].provider).toBe("deepseek");
  });
});

// ── calculateCost ──
describe("calculateCost", () => {
  it("calculates deepseek cost correctly", () => {
    const cost = calculateCost("deepseek", 1_000_000, 1_000_000);
    // (1M * 0.14 + 1M * 0.28) / 1M = 0.42
    expect(cost).toBeCloseTo(0.42, 5);
  });

  it("returns 0 for groq (free tier)", () => {
    expect(calculateCost("groq", 1000, 500)).toBe(0);
  });

  it("returns 0 for siliconflow (free tier)", () => {
    expect(calculateCost("siliconflow", 1000, 500)).toBe(0);
  });

  it("returns 0 for unknown provider", () => {
    expect(calculateCost("unknown" as AIProvider, 1000, 500)).toBe(0);
  });

  it("calculates deepseek cost for small token counts", () => {
    const cost = calculateCost("deepseek", 1000, 500);
    // (1000*0.14 + 500*0.28) / 1M = (140 + 140) / 1M = 0.00028
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });
});

// ── createUsageRecord ──
describe("createUsageRecord", () => {
  it("creates correct usage record for deepseek", () => {
    const record = createUsageRecord("deepseek", "deepseek-chat", 1000, 500);
    expect(record.provider).toBe("deepseek");
    expect(record.model).toBe("deepseek-chat");
    expect(record.inputTokens).toBe(1000);
    expect(record.outputTokens).toBe(500);
    expect(record.totalTokens).toBe(1500);
    expect(record.costUSD).toBeGreaterThan(0);
  });

  it("creates zero-cost record for free providers", () => {
    const record = createUsageRecord("groq", "llama-3.3-70b-versatile", 1000, 500);
    expect(record.costUSD).toBe(0);
  });
});

// ── getSystemPrompt ──
describe("getSystemPrompt", () => {
  it("returns Chinese prompt for 'zh'", () => {
    const prompt = getSystemPrompt("zh");
    expect(prompt).toContain("摘要");
  });

  it("returns English prompt for 'en'", () => {
    const prompt = getSystemPrompt("en");
    expect(prompt).toContain("summarizer");
  });

  it("returns multilingual prompt for unknown language", () => {
    const prompt = getSystemPrompt("unknown" as unknown as "zh");
    expect(prompt).toContain("worldwide");
  });

  it("returns technical prompt", () => {
    const prompt = getSystemPrompt("technical");
    expect(prompt).toContain("technical");
  });

  it("returns business prompt", () => {
    const prompt = getSystemPrompt("business");
    expect(prompt).toContain("actionable");
  });
});
