import { describe, it, expect, beforeAll } from "vitest";
import { createToken, verifyToken } from "@/lib/auth-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-key-that-is-at-least-32-characters-long!!";
});

describe("auth-token", () => {
  it("creates and verifies a valid token", () => {
    const token = createToken({
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-123");
    expect(payload?.email).toBe("test@example.com");
  });

  it("rejects invalid token", () => {
    const payload = verifyToken("invalid-token-string");
    expect(payload).toBeNull();
  });

  it("rejects empty token", () => {
    const payload = verifyToken("");
    expect(payload).toBeNull();
  });

  it("rejects tampered token", () => {
    const token = createToken({
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });
    // Tamper with the token
    const tampered = token.slice(0, -5) + "XXXXX";
    const payload = verifyToken(tampered);
    expect(payload).toBeNull();
  });

  it("includes expiration in token", () => {
    const token = createToken({
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    });
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.exp).toBeDefined();
    expect(payload?.iat).toBeDefined();
    // Token should expire in the future
    expect(payload!.exp! * 1000).toBeGreaterThan(Date.now());
  });

  it("preserves user data in token", () => {
    const userData = {
      id: "complex-user-id-456",
      email: "complex.email+tag@example.com",
      firstName: "Complex",
      lastName: "Name",
    };
    const token = createToken(userData);
    const payload = verifyToken(token);
    expect(payload?.userId).toBe(userData.id);
    expect(payload?.email).toBe(userData.email);
    expect(payload?.firstName).toBe(userData.firstName);
    expect(payload?.lastName).toBe(userData.lastName);
  });
});
