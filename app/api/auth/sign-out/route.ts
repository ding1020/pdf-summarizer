import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { getAuthUserId } from "@/lib/get-auth";
import { revokeAllUserTokens } from "@/lib/auth-token";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // CSRF validation
  if (!validateCsrf(req)) {
    return NextResponse.json(
      { error: "Invalid security token. Please refresh the page and try again." },
      { status: 403 },
    );
  }

  // Rate limiting — prevent abuse
  const userId = await getAuthUserId();
  const identifier = getClientIdentifier(userId);
  const rateResult = await rateLimitAsync(identifier, {
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: getRateLimitHeaders(rateResult) },
    );
  }

  // Revoke all tokens for this user (invalidates tokens on other devices too)
  if (userId) {
    try {
      await revokeAllUserTokens(userId);
    } catch (err) {
      logger.warn("Failed to revoke tokens on sign-out", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const response = NextResponse.json({ success: true });

  // Clear all auth cookies
  for (const name of ["__session", "__client_uat", "__clerk_db_jwt", "__clerk_session_jwt", "__auth_token", "__csrf_token"]) {
    response.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });
  }

  return response;
}
