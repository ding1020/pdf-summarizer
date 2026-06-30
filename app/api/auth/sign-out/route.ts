import { NextResponse } from "next/server";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { getAuthUserId } from "@/lib/get-auth";

export async function POST() {
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

  const response = NextResponse.json({ success: true });

  // Clear all auth cookies
  for (const name of ["__session", "__client_uat", "__clerk_db_jwt", "__clerk_session_jwt", "__auth_token"]) {
    response.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
    });
  }

  return response;
}
