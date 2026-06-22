import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth-token";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/api-utils";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Verifies the user's email using the one-time token sent during sign-up.
 * On success, auto-signs the user in and redirects to dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIP(req);
    const rateResult = await rateLimitAsync(`auth:verify:${clientIp}`, RATE_LIMITS.auth);
    if (!rateResult.success) {
      return NextResponse.redirect(
        new URL("/sign-in?error=rate_limit", process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com")
      );
    }

    const token = req.nextUrl.searchParams.get("token");

    if (!token || typeof token !== "string" || token.length < 8) {
      return NextResponse.redirect(
        new URL("/sign-in?error=invalid_token", process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com")
      );
    }

    // Hash the incoming token to match stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with matching, non-expired verify token
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: tokenHash,
        verifyExpires: { gt: new Date() },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/sign-in?error=expired_token", process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com")
      );
    }

    // Mark email as verified and clear the verify token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    logger.info("Email verified successfully", { email: user.email });

    // Auto-sign in the user
    const authToken = createToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const response = NextResponse.redirect(
      new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com")
    );

    response.cookies.set("__auth_token", authToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    logger.error("Verify email error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.redirect(
      new URL("/sign-in?error=server_error", process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com")
    );
  }
}
