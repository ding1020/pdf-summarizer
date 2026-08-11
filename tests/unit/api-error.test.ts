import { describe, it, expect } from "vitest";
import { apiError, apiSuccess } from "@/lib/api-error";

describe("api-error", () => {
  it("creates error response with default status", async () => {
    const res = apiError("Bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Bad request");
  });

  it("creates error response with custom status", async () => {
    const res = apiError("Not found", { status: 404 });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("includes error code when provided", async () => {
    const res = apiError("Rate limited", { status: 429, code: "RATE_LIMIT" });
    const body = await res.json();
    expect(body.code).toBe("RATE_LIMIT");
  });

  it("creates success response with default status", async () => {
    const res = apiSuccess({ data: "test" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBe("test");
  });

  it("creates success response with custom status", async () => {
    const res = apiSuccess({ created: true }, { status: 201 });
    expect(res.status).toBe(201);
  });
});
