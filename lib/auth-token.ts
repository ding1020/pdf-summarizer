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

export function createToken(user: { id: string; email: string; firstName?: string | null; lastName?: string | null }): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
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
    if (sig !== expectedSig) return null;

    const payload: AuthToken = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}
