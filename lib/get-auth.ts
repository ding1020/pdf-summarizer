import { verifyToken } from "@/lib/auth-token";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

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
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      // User deleted — clear cookie by returning null
      return null;
    }
    validatedUsers.set(userId, Date.now());
    return userId;
  } catch {
    // On DB error, fail open (allow request) to avoid blocking all users during outage
    return userId;
  }
}

/** Clear the validation cache for a specific user (call after deletion/ban) */
export function clearAuthCache(userId: string): void {
  validatedUsers.delete(userId);
}
