import crypto from "crypto";

const SECRET = process.env.CLERK_SECRET_KEY || "fallback-secret-change-me";

export interface AuthToken {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  iat: number;
  exp: number;
}

export function createToken(user: { id: string; email: string; firstName?: string | null; lastName?: string | null }): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };
  
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyToken(token: string): AuthToken | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    const expectedSig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
    if (sig !== expectedSig) return null;

    const payload: AuthToken = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}
