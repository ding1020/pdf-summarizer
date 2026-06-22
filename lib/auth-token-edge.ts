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
 * Portable base64url encoder — works in Edge Runtime even without btoa().
 * Uses direct bit manipulation for maximum cross-runtime compatibility.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  try {
    // Prefer btoa when available (Next.js Edge Runtime provides it)
    const binary = String.fromCharCode(...bytes);
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    // Fallback: manual base64url encoding (Cloudflare Workers, etc.)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
      const chunk = (b0 << 16) | (b1 << 8) | b2;
      result += chars[(chunk >> 18) & 0x3f];
      result += chars[(chunk >> 12) & 0x3f];
      if (i + 1 < bytes.length) result += chars[(chunk >> 6) & 0x3f];
      if (i + 2 < bytes.length) result += chars[chunk & 0x3f];
    }
    return result;
  }
}

/**
 * Portable base64url decoder — mirrors bytesToBase64Url.
 */
function base64UrlToBytes(str: string): Uint8Array {
  try {
    // Prefer atob when available
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    // Fallback: manual base64url decoding
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const lookup: Record<string, number> = {};
    for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
    // Handle padding
    let padded = str;
    while (padded.length % 4 !== 0) padded += "=";
    // Replace base64url chars for standard base64
    padded = padded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}

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

    const expectedSig = bytesToBase64Url(new Uint8Array(sigBytes));

    // Constant-time comparison
    if (!timingSafeEqual(sig, expectedSig)) return null;

    // Decode payload
    const payload: AuthToken = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(b64)),
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
