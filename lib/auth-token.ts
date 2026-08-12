import crypto from "crypto";
import type { AuthToken } from "./auth-token-types";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "❌ AUTH_SECRET environment variable is not set. Please add it to your .env and Vercel environment variables.",
    );
  }
  return secret;
}

export { type AuthToken };

export function createToken(user: { id: string; email: string; firstName?: string | null; lastName?: string | null; tokenVersion?: number }): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days — must match cookie maxAge in sign-in route
    ver: user.tokenVersion || 1, // Default to 1 for backward compatibility
  };
  
  const secret = getSecret();
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyToken(token: string): AuthToken | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    const secret = getSecret();
    const expectedSig = crypto.createHmac("sha256", secret).update(b64).digest("base64url");

    // Timing-safe comparison
    if (!timingSafeEqual(sig, expectedSig)) return null;

    const payload: AuthToken = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}

// ── Timing-safe string comparison ──
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Token revocation ──

/**
 * Revoke all active tokens for a user by incrementing their tokenVersion.
 * This invalidates all previously-issued tokens — the user must re-authenticate.
 *
 * Should be called on:
 *   - Password change/reset
 *   - Explicit "sign out all devices"
 *   - Account ban/suspension
 *
 * @returns the new tokenVersion value
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  const { prisma } = await import("./db");
  const user = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  // Clear the auth cache so the revoked token is immediately rejected
  const { clearAuthCache } = await import("./get-auth");
  clearAuthCache(userId);
  return user.tokenVersion;
}
