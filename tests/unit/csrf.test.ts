import { describe, it, expect, beforeAll } from "vitest";
import { generateCsrfToken, validateCsrf } from "@/lib/csrf";

describe("csrf", () => {
  it("generates a non-empty token", () => {
    const token = generateCsrfToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });

  it("generates unique tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    expect(token1).not.toBe(token2);
  });

  it("validates matching cookie and header tokens", () => {
    const token = generateCsrfToken();
    const mockRequest = {
      headers: new Headers({ "x-csrf-token": token }),
      cookies: {
        get: (name: string) => (name === "__csrf_token" ? { value: token } : undefined),
      },
    } as any;
    expect(validateCsrf(mockRequest)).toBe(true);
  });

  it("rejects mismatched tokens", () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    const mockRequest = {
      headers: new Headers({ "x-csrf-token": token1 }),
      cookies: {
        get: (name: string) => (name === "__csrf_token" ? { value: token2 } : undefined),
      },
    } as any;
    expect(validateCsrf(mockRequest)).toBe(false);
  });

  it("rejects missing header token", () => {
    const token = generateCsrfToken();
    const mockRequest = {
      headers: new Headers(),
      cookies: {
        get: (name: string) => (name === "__csrf_token" ? { value: token } : undefined),
      },
    } as any;
    expect(validateCsrf(mockRequest)).toBe(false);
  });

  it("rejects missing cookie token", () => {
    const token = generateCsrfToken();
    const mockRequest = {
      headers: new Headers({ "x-csrf-token": token }),
      cookies: {
        get: () => undefined,
      },
    } as any;
    expect(validateCsrf(mockRequest)).toBe(false);
  });
});
