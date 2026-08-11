/**
 * Unified API Error Handler
 *
 * Provides consistent error response formatting across all API routes.
 * Usage:
 *   import { apiError, apiSuccess } from "@/lib/api-error";
 *   return apiError("Not found", 404);
 *   return apiSuccess({ data });
 */

import { NextResponse } from "next/server";
import { logger } from "./logger";

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  headers?: Record<string, string>;
}

/** Return a consistent JSON error response. */
export function apiError(
  message: string,
  options: ApiErrorOptions = {},
): NextResponse {
  const { status = 400, code, headers } = options;
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status, ...(headers ? { headers } : {}) },
  );
}

/** Return a consistent JSON success response. */
export function apiSuccess<T>(
  data: T,
  options: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  const { status = 200, headers } = options;
  return NextResponse.json(data, { status, ...(headers ? { headers } : {}) });
}

/** Wrap an async API handler with consistent error handling. */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[API] Unhandled error", err, {
        stack: err.stack,
        name: err.name,
      });
      return apiError("Internal server error", { status: 500 });
    }
  };
}
