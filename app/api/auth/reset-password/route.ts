import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and updates the user's password.
 * Clears the token after a successful reset.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: prevent token brute-force
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
    const rateResult = await rateLimitAsync(`auth:reset:${clientIp}`, RATE_LIMITS.auth);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Find user by reset token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 },
      );
    }

    // Hash new password and clear reset token
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpires: null,
      },
    });

    logger.info("Password reset successful", { email: user.email });

    return NextResponse.json({
      success: true,
      message: "Password has been reset. You can now sign in.",
    });
  } catch (error) {
    logger.error("Reset password error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 },
    );
  }
}
