import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/api-utils";

// Health check — confirms Vercel App is alive and all dependencies are reachable
export async function GET(req: Request) {
  // Light rate limiting to prevent abuse
  const clientIp = getClientIP(req as unknown as import("next/server").NextRequest);
  const identifier = getClientIdentifier(null, clientIp);
  const rateLimitResult = await rateLimitAsync(identifier, { windowMs: 60_000, maxRequests: 5 });

  const health: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
    uptime: process.uptime(),
    db: "unknown",
    redis: "unknown",
    env: process.env.NODE_ENV || "development",
  };

  // ── Database check ──
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.db = "connected";
  } catch {
    health.db = "disconnected";
    health.status = "degraded";
  }

  // ── Redis check ──
  try {
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      health.redis = "connected";
    } else {
      health.redis = "not_configured"; // Not an error — memory fallback is used
    }
  } catch {
    health.redis = "disconnected";
    if (health.status === "ok") health.status = "degraded";
  }

  // ── AI provider checks (lightweight — just check if API keys are configured) ──
  health.ai = {
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    siliconflow: !!process.env.SILICONFLOW_API_KEY,
  };

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, {
    status: statusCode,
    headers: rateLimitResult.success ? getRateLimitHeaders(rateLimitResult) : undefined,
  });
}
