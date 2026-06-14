import { verifyToken } from "@/lib/auth-token";
import { cookies } from "next/headers";

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("__auth_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  return payload?.userId ?? null;
}
