import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// 简单的错误日志函数
export function logAPIError(
  endpoint: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`API Error: ${endpoint}`, err, context);
}

// API 错误响应格式化
export function formatAPIError(error: unknown, message = "Internal server error") {
  const isDev = process.env.NODE_ENV === "development";
  
  return NextResponse.json(
    {
      error: message,
      ...(isDev && {
        details: error instanceof Error ? error.message : String(error),
      }),
    },
    { status: 500 }
  );
}

// ⚠️ Rate limiting has been unified — use lib/rate-limit.ts instead:
//   import { rateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/rate-limit";
// This module no longer maintains its own rate limit store.
