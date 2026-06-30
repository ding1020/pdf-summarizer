/**
 * CSRF protection using cookie-to-header (double-submit) pattern.
 *
 * 1. Middleware sets a non-httpOnly csrf_token cookie on page GETs.
 * 2. Client reads the cookie and sends it as X-CSRF-Token header on POSTs.
 * 3. Server-side route handlers call validateCsrf() to compare them.
 */
import crypto from "crypto";
import { NextRequest } from "next/server";

const TOKEN_BYTES = 32;
const REFRESH_WINDOW_MS = 5 * 60_000; // Refresh token older than 5 min

export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Generate a new CSRF token and return both the token value and Set-Cookie string.
 */
export function generateCsrfCookie(): { token: string; cookie: string } {
  const token = generateCsrfToken();
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `__csrf_token=${token}; Path=/; SameSite=Strict; ${isProd ? "Secure; " : ""}Max-Age=86400`;
  return { token, cookie };
}

/**
 * Extract CSRF token from request cookies.
 */
export function getCsrfFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get("__csrf_token")?.value;
}

/**
 * Validate the incoming X-CSRF-Token header matches the CSRF cookie.
 * Returns false if either is missing or they don't match.
 */
export function validateCsrf(req: NextRequest): boolean {
  const cookieToken = req.cookies.get("__csrf_token")?.value;
  const headerToken = req.headers.get("x-csrf-token") || req.headers.get("X-CSRF-Token");

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== 64 || headerToken.length !== 64) return false;

  // Timing-safe comparison
  return timingSafeEqual(cookieToken, headerToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
