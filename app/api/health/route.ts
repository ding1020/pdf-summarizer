import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Enhanced health check with dependency verification
export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: Record<string, { status: string; latencyMs: number; error?: string }>;
}

// ── Auth guard ──
function isAuthorized(req: NextRequest): boolean {
  const token = process.env.HEALTH_API_KEY;
  if (!token) return true; // Allow if not configured (dev/test)
  const authHeader = req.headers.get("authorization") || "";
  // Timing-safe comparison
  const expected = `Bearer ${token}`;
  if (authHeader.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < authHeader.length; i++) {
    diff |= authHeader.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ── AI availability cache (avoids hitting API every health check) ──
let aiAvailable = true;
let lastAiCheck = 0;
const AI_CHECK_TTL = 60_000; // 1 minute

export async function GET(req: NextRequest) {
  // Require auth if HEALTH_API_KEY is configured
  if (process.env.HEALTH_API_KEY && !isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {};

  // Check 1: Database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
  } catch (err) {
    logger.error("Health check: database down", err instanceof Error ? err : new Error(String(err)));
    checks.database = {
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Check 2: AI provider availability (cached, no per-request API call)
  try {
    const now = Date.now();
    if (now - lastAiCheck > AI_CHECK_TTL) {
      if (process.env.DEEPSEEK_API_KEY) {
        // Quick connectivity check — only validate key presence, not full API call
        aiAvailable = true;
      } else {
        aiAvailable = false;
      }
      lastAiCheck = now;
    }
    checks.ai = {
      status: aiAvailable ? "healthy" : "degraded",
      latencyMs: Date.now() - startTime,
    };
  } catch {
    checks.ai = {
      status: "degraded",
      latencyMs: Date.now() - startTime,
      error: "Health check skipped",
    };
  }

  // Determine overall health
  const hasUnhealthy = Object.values(checks).some((c) => c.status === "unhealthy");
  const hasDegraded = Object.values(checks).some((c) => c.status === "degraded");
  const overallStatus: HealthStatus["status"] = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "ok";

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  };

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}
