/**
 * GET /api/admin/rate-limits
 *
 * Returns rate limit configuration and current in-memory store stats.
 * Note: In production with Redis, this shows config only (Redis stats require separate monitoring).
 */
import { NextResponse } from "next/server";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user || (user.firstName !== "ding" && user.lastName !== "1020")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get recent rate-limited requests from usage logs
  const recentBlocked = await prisma.usageLog.findMany({
    where: { status: "error", route: { in: ["web", "stream", "api"] } },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, route: true, ip: true, createdAt: true, provider: true },
  });

  return NextResponse.json({
    config: RATE_LIMITS,
    tiers: Object.entries(RATE_LIMITS).map(([name, cfg]) => ({
      name,
      maxRequests: cfg.maxRequests,
      windowMs: cfg.windowMs,
      windowSeconds: cfg.windowMs / 1000,
      requestsPerSecond: (cfg.maxRequests / (cfg.windowMs / 1000)).toFixed(2),
    })),
    recentBlocked,
    backend: process.env.UPSTASH_REDIS_REST_URL ? "redis" : "memory",
  });
}