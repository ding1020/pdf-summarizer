import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/api-utils";

// Health check — confirms Vercel App is alive and DB is reachable
export async function GET(req: Request) {
  // Light rate limiting to prevent abuse
  const clientIp = getClientIP(req as unknown as import("next/server").NextRequest);
  const identifier = getClientIdentifier(null, clientIp);
  const rateLimitResult = await rateLimitAsync(identifier, RATE_LIMITS.checkout);

  const health: Record<string, unknown> = {
    status: "ok",
    time: Date.now(),
    db: "unknown",
  };

  try {
    // Simple connectivity check — lightweight query
    await prisma.$queryRaw`SELECT 1`;
    health.db = "connected";
  } catch (e) {
    health.db = "disconnected";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, {
    status: statusCode,
    headers: rateLimitResult.success ? getRateLimitHeaders(rateLimitResult) : undefined,
  });
}
