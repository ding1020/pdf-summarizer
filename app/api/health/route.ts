import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latency?: number; error?: string };
    redis?: { status: "up" | "down"; latency?: number; error?: string };
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check Redis (if enabled)
  if (process.env.REDIS_ENABLED === "true") {
    try {
      const { redis } = await import("@/lib/redis");
      const redisStart = Date.now();
      await redis.ping();
      checks.redis = {
        status: "up",
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Determine overall status
  let overallStatus: HealthStatus["status"] = "healthy";
  if (checks.database.status === "down") {
    overallStatus = "unhealthy";
  } else if (checks.redis?.status === "down" || checks.redis?.latency && checks.redis.latency > 100) {
    overallStatus = "degraded";
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor(process.uptime()),
    checks,
  };

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}
