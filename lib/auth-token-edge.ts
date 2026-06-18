/**
 * Edge-compatible token verification using Web Crypto API.
 * Use in middleware.ts (Edge Runtime) instead of auth-token.ts (Node.js crypto).
 */
import type { AuthToken } from "./auth-token-types";

const SECRET = process.env.AUTH_SECRET;
// Note: In Edge middleware, throwing here would crash the middleware.
// Instead, verifyToken will always fail if SECRET is undefined or too short.
// AUTH_SECRET must be set in Vercel environment variables.

/**
 * Verify token in Edge Runtime using Web Crypto API (SubtleCrypto).
 * Same token format as auth-token.ts: base64url(payload).base64url(HMAC-SHA256)
 */
export async function verifyTokenEdge(token: string): Promise<AuthToken | null> {
  try {
    // If SECRET is not configured, reject all tokens
    if (!SECRET || SECRET.length < 32) return null;

    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    // Re-compute HMAC-SHA256 signature using Web Crypto
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sigBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(b64),
    );

    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Constant-time comparison
    if (!timingSafeEqual(sig, expectedSig)) return null;

    // Decode payload
    const payload: AuthToken = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
      ),
    );

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
