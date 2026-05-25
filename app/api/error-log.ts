import { NextResponse } from "next/server";

// 简单的错误日志函数
export function logAPIError(
  endpoint: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // 在生产环境中，你应该将这些日志发送到日志服务
  // 如: Sentry, LogRocket, Datadog 等
  console.error(
    JSON.stringify({
      timestamp,
      level: "error",
      endpoint,
      message: errorMessage,
      stack: errorStack,
      ...context,
    })
  );
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

// 速率限制检查（简单内存实现，生产环境建议用 Redis）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
