import { verifyToken } from "@/lib/auth-token";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Cache validated user IDs for 60 seconds to avoid DB hit on every request
const validatedUsers = new Map<string, number>();
const CACHE_TTL_MS = 60_000;

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("__auth_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  const userId = payload.userId;

  // Check cache first
  const cachedAt = validatedUsers.get(userId);
  if (cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
    return userId;
  }

  // Verify user still exists in DB (prevents deleted/banned users from using stale tokens)
  // Also checks tokenVersion for revocation: if the user's tokenVersion has been
  // incremented (e.g. on password change or explicit "revoke all sessions"),
  // the token's embedded `ver` will no longer match and the token is rejected.
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tokenVersion: true },
    });
    if (!user) {
      // User deleted — clear cookie by returning null
      return null;
    }
    // Check token version for revocation
    if (payload.ver !== undefined && payload.ver !== user.tokenVersion) {
      // Token has been revoked — user's tokenVersion was incremented
      logger.warn("Token revoked — version mismatch", {
        userId,
        tokenVer: payload.ver,
        dbVer: user.tokenVersion,
      });
      return null;
    }
    validatedUsers.set(userId, Date.now());
    return userId;
  } catch (error) {
    // Fail-closed: on DB error, deny access rather than allowing unvalidated users.
    // This prevents security bypass during database outages.
    logger.error("Auth DB lookup failed — denying access (fail-closed)", error instanceof Error ? error : new Error(String(error)), {
      userId,
    });
    return null;
  }
}

/** Clear the validation cache for a specific user (call after deletion/ban) */
export function clearAuthCache(userId: string): void {
  validatedUsers.delete(userId);
}
