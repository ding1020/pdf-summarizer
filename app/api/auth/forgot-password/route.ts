import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/auth/forgot-password
 *
 * Generates a one-time reset token and emails the reset link.
 * Always returns { ok: true } even when the email doesn't exist,
 * to prevent email enumeration attacks.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: prevent email spam
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
    const rateResult = await rateLimitAsync(`auth:forgot:${clientIp}`, RATE_LIMITS.auth);
    if (!rateResult.success) {
      return NextResponse.json(
        { ok: true }, // Don't reveal rate limit to prevent email enumeration
        { status: 200, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true });
    }

    const normalized = email.trim().toLowerCase();

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, firstName: true, passwordHash: true },
    });

    // Always return ok to prevent email enumeration
    if (!user || !user.passwordHash) {
      logger.info("Forgot password: user not found or no password", { email: normalized });
      return NextResponse.json({ ok: true });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    // Build reset URL
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";
    const resetUrl = `${base}/reset-password?token=${resetToken}`;

    // Send email
    const name = user.firstName || "there";
    const { subject, html } = passwordResetEmail(name, resetUrl);

    await sendEmail({ to: user.email, subject, html });

    logger.info("Password reset email sent", { email: normalized });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Forgot password error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ ok: true }); // Still return ok to prevent enumeration
  }
}
