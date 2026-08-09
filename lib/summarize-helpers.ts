/**
 * Shared helpers for summarize routes — eliminates duplicated logic
 * between /api/summarize and /api/summarize/stream.
 *
 * Extracted concerns:
 *   1. Auth context extraction (userId + clientIp + isGuest)
 *   2. Rate limit guard (unified config resolution, returns Response on 429)
 *   3. Document content resolution from DB (with ownership check)
 *   4. Daily usage limit check (authenticated + guest)
 *   5. Usage quota refund on AI failure
 *   6. AI usage logging (wraps getUserType + saveUsageLog)
 *   7. Max content length by tier
 *   8. JSON error response factory (unified format)
 *   9. AI service unavailable error (dev mode includes details)
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  rateLimitAsync,
  getClientIdentifier,
  getRateLimitHeaders,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { getClientIP, resolveRateLimit, getUserTier } from "@/lib/api-utils";
import { getAuthUserId } from "@/lib/get-auth";
import { checkAndIncrementDailyUsage } from "@/lib/ai";
import { saveUsageLog, getUserType } from "@/lib/usage-log";
import {
  FREE_DAILY_LIMIT,
  MAX_CONTENT_LENGTH,
  PRO_MAX_CONTENT_LENGTH,
} from "@/lib/constants";

// ── Types ──

export interface AuthContext {
  userId: string | null;
  clientIp: string;
  isGuest: boolean;
}

export interface ContentResolution {
  content: string | null;
  error: { status: number; message: string } | null;
}

export interface GuardResult<T> {
  data: T | null;
  errorResponse: Response | null;
}

// ── 1. Extract auth context ──

/**
 * Extract authentication context from a request.
 * Works for both guest-accessible and auth-required routes.
 */
export async function extractAuthContext(req: NextRequest): Promise<AuthContext> {
  const userId = await getAuthUserId();
  const clientIp = getClientIP(req);
  return { userId, clientIp, isGuest: !userId };
}

// ── 2. Rate limit guard ──

/**
 * Apply per-minute rate limiting.
 * Returns the rate limit result (for headers) or a 429 Response.
 *
 * Uses resolveRateLimit() which automatically selects the right tier:
 *   guest < free < pro
 */
export async function applyRateLimitGuard(
  userId: string | null,
  clientIp: string,
): Promise<GuardResult<RateLimitResult>> {
  try {
    const identifier = getClientIdentifier(userId, clientIp);
    const { config } = await resolveRateLimit(userId);
    const result = await rateLimitAsync(identifier, config);

    if (!result.success) {
      return {
        data: null,
        errorResponse: createJsonResponse(
          {
            error: "Rate limit exceeded. Please wait a moment.",
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          429,
          getRateLimitHeaders(result),
        ),
      };
    }

    return { data: result, errorResponse: null };
  } catch (err) {
    logger.warn("Rate limiting failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Fail open — don't block the request on rate-limit infra failure
    return { data: null, errorResponse: null };
  }
}

// ── 3. Resolve document content from DB ──

/**
 * Load document content from the database.
 *
 * @param strict  When true, returns explicit 404/403/500 errors.
 *                When false, silently returns null content (caller falls back).
 */
export async function resolveDocumentContent(
  documentId: string,
  userId: string,
  strict: boolean = false,
): Promise<ContentResolution> {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { content: true, userId: true },
    });

    if (!doc) {
      return strict
        ? { content: null, error: { status: 404, message: "Document not found." } }
        : { content: null, error: null };
    }

    if (doc.userId !== userId) {
      return strict
        ? { content: null, error: { status: 403, message: "Access denied." } }
        : { content: null, error: null };
    }

    return { content: doc.content, error: null };
  } catch (dbErr) {
    logger.warn("Failed to load document from DB", {
      documentId,
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
    return strict
      ? { content: null, error: { status: 500, message: "Failed to load document." } }
      : { content: null, error: null };
  }
}

// ── 4. Daily usage limit check ──

/**
 * Check and enforce daily usage limits.
 *
 * Authenticated users: atomic counter in DB (checkAndIncrementDailyUsage).
 * Guests: daily rate-limit window keyed by IP.
 *
 * Fail-open on infrastructure errors — never blocks on DB/Redis failure.
 */
export async function checkDailyUsageLimit(
  userId: string | null,
  clientIp: string,
  isGuest: boolean,
): Promise<GuardResult<boolean>> {
  if (isGuest) {
    try {
      const guestKey = `guest_daily:${clientIp}`;
      const guestResult = await rateLimitAsync(guestKey, {
        windowMs: 24 * 60 * 60 * 1000,
        maxRequests: FREE_DAILY_LIMIT,
      });
      if (!guestResult.success) {
        return {
          data: null,
          errorResponse: createJsonResponse(
            {
              error: "Daily free limit reached. Sign up for more summaries.",
              code: "usage_limit_reached",
              upgradeUrl: "/sign-up",
            },
            402,
          ),
        };
      }
    } catch {
      // Fail open
    }
    return { data: true, errorResponse: null };
  }

  // Authenticated user
  try {
    const usageCheck = await checkAndIncrementDailyUsage(userId!, FREE_DAILY_LIMIT);
    if (!usageCheck.allowed) {
      return {
        data: null,
        errorResponse: createJsonResponse(
          {
            error: `Daily free limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited access.`,
            code: "usage_limit_reached",
            upgradeUrl: "/pricing",
          },
          402,
        ),
      };
    }
  } catch (limitError) {
    logger.warn("Failed to check daily usage limit", {
      error: limitError instanceof Error ? limitError.message : String(limitError),
    });
    // Fail open
  }

  return { data: true, errorResponse: null };
}

// ── 5. Refund usage quota on AI failure ──

/**
 * Refund the daily usage quota when AI fails.
 * Only refunds non-Pro users (Pro has unlimited access).
 */
export async function refundUsageQuota(userId: string | null): Promise<void> {
  if (!userId) return;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });
    if (
      user &&
      user.subscriptionStatus !== "pro" &&
      user.subscriptionStatus !== "pro_trial"
    ) {
      await prisma.user.updateMany({
        where: { id: userId, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
      logger.info("Refunded usage quota after AI failure", { userId });
    }
  } catch (refundErr) {
    logger.warn("Failed to refund usage quota", {
      error: refundErr instanceof Error ? refundErr.message : String(refundErr),
    });
  }
}

// ── 6. Log AI usage ──

/**
 * Log AI usage to the UsageLog table (fire-and-forget).
 * Wraps getUserType + saveUsageLog into a single call.
 */
export async function logAIUsage(
  userId: string | null,
  provider: string,
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUSD: number;
  },
  clientIp: string | null,
  route: "web" | "stream" | "api",
): Promise<void> {
  const userType = await getUserType(userId);
  saveUsageLog({
    userId,
    provider,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    costUSD: usage.costUSD,
    userType,
    route,
    ip: clientIp ?? undefined,
  });
}

// ── 7. Get max content length by tier ──

/**
 * Resolve the max content length for a user.
 * Pro: 50k chars, Free/Guest: 15k chars.
 */
export async function getMaxContentLength(userId: string | null): Promise<number> {
  if (!userId) return MAX_CONTENT_LENGTH;
  try {
    const tier = await getUserTier(userId);
    return tier === "pro" ? PRO_MAX_CONTENT_LENGTH : MAX_CONTENT_LENGTH;
  } catch {
    return MAX_CONTENT_LENGTH;
  }
}

// ── 8. JSON error response factory ──

/**
 * Create a standardized JSON error Response.
 * Used by both summarize routes for consistent error formatting.
 */
export function createJsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

// ── 9. AI service unavailable error ──

/**
 * Create a 503 "AI service unavailable" error response.
 * Includes error details in development mode for debugging.
 */
export function createAIUnavailableError(errMsg: string): Response {
  return createJsonResponse(
    {
      error: "AI service is temporarily unavailable. Please try again in a moment.",
      code: "ai_service_unavailable",
      details: process.env.NODE_ENV === "development" ? errMsg : undefined,
    },
    503,
  );
}
