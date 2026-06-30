import { describe, it, expect } from "vitest";
import { 
  summarizeSchema, 
  paginationSchema, 
  feedbackSchema, 
  userUpdateSchema,
  healthCheckResponseSchema,
} from "@/lib/schemas";

// ── summarizeSchema ──
describe("summarizeSchema", () => {
  it("accepts valid UUID documentId", () => {
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Some content",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid guest documentId", () => {
    const result = summarizeSchema.safeParse({
      documentId: "guest_1234567890_abc1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid documentId format", () => {
    const result = summarizeSchema.safeParse({
      documentId: "invalid-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty documentId", () => {
    const result = summarizeSchema.safeParse({
      documentId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional provider", () => {
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      provider: "groq",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("groq");
    }
  });

  it("rejects invalid provider", () => {
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      provider: "openai",
    });
    expect(result.success).toBe(false);
  });

  it("accepts streamSummary field", () => {
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      streamSummary: "Pre-generated summary from stream",
    });
    expect(result.success).toBe(true);
  });

  it("rejects content over 100000 chars", () => {
    const result = summarizeSchema.safeParse({
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      content: "x".repeat(100001),
    });
    expect(result.success).toBe(false);
  });

  it("defaults provider to deepseek", () => {
    const result = summarizeSchema.safeParse({
      documentId: "guest_1234567890_abc1234",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("deepseek");
    }
  });

  it("defaults language to multilingual", () => {
    const result = summarizeSchema.safeParse({
      documentId: "guest_1234567890_abc1234",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("multilingual");
    }
  });

  it("accepts specific languages", () => {
    for (const lang of ["en", "zh", "ja", "ko", "es", "fr", "de", "multilingual"]) {
      const result = summarizeSchema.safeParse({
        documentId: "guest_1234567890_abc1234",
        language: lang,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unsupported language", () => {
    const result = summarizeSchema.safeParse({
      documentId: "guest_1234567890_abc1234",
      language: "ru",
    });
    expect(result.success).toBe(false);
  });
});

// ── paginationSchema ──
describe("paginationSchema", () => {
  it("defaults to page 1, limit 20", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("parses string numbers", () => {
    const result = paginationSchema.safeParse({ page: "3", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects negative page", () => {
    const result = paginationSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it("caps limit at 100", () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });
});

// ── feedbackSchema ──
describe("feedbackSchema", () => {
  it("accepts valid feedback", () => {
    const result = feedbackSchema.safeParse({
      message: "This is a valid feedback message with enough length.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("general");
    }
  });

  it("rejects short message", () => {
    const result = feedbackSchema.safeParse({ message: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects message over 2000 chars", () => {
    const result = feedbackSchema.safeParse({ message: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts valid categories", () => {
    for (const cat of ["general", "bug", "feature", "billing"]) {
      const result = feedbackSchema.safeParse({
        message: "Testing feedback with valid category field.",
        category: cat,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    const result = feedbackSchema.safeParse({
      message: "Testing feedback with valid length here.",
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

// ── userUpdateSchema ──
describe("userUpdateSchema", () => {
  it("accepts empty object", () => {
    const result = userUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid email", () => {
    const result = userUpdateSchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = userUpdateSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts valid subscription status", () => {
    for (const status of ["free", "pro", "past_due", "canceled"]) {
      const result = userUpdateSchema.safeParse({ subscriptionStatus: status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid subscription status", () => {
    const result = userUpdateSchema.safeParse({ subscriptionStatus: "premium" });
    expect(result.success).toBe(false);
  });
});

// ── healthCheckResponseSchema ──
describe("healthCheckResponseSchema", () => {
  it("validates healthy response", () => {
    const result = healthCheckResponseSchema.safeParse({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: { database: true, redis: true, ai: true },
      uptime: 3600,
    });
    expect(result.success).toBe(true);
  });

  it("validates degraded response", () => {
    const result = healthCheckResponseSchema.safeParse({
      status: "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: { database: true, redis: false, ai: true },
      uptime: 3600,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = healthCheckResponseSchema.safeParse({
      status: "unknown",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: { database: true, redis: true, ai: true },
      uptime: 3600,
    });
    expect(result.success).toBe(false);
  });
});
