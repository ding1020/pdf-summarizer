import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail, verifyEmailEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { validateCsrf } from "@/lib/csrf";

/**
 * POST /api/auth/resend-verification
 *
 * Resends the verification email for unverified accounts.
 * Rate-limited to prevent abuse (1 per 2 minutes per email).
 */
export async function POST(req: NextRequest) {
  try {
    // CSRF validation
    if (!validateCsrf(req)) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 },
      );
    }

    // Rate limiting by IP
    const clientIp = getClientIP(req);
    const ipRateResult = await rateLimitAsync(
      `auth:resend-verify:${clientIp}`,
      { windowMs: 10 * 60_000, maxRequests: 3 },
    );
    if (!ipRateResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(ipRateResult) },
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting by email
    const emailRateResult = await rateLimitAsync(
      `auth:resend-verify:email:${normalizedEmail}`,
      { windowMs: 2 * 60_000, maxRequests: 1 },
    );
    if (!emailRateResult.success) {
      return NextResponse.json(
        { error: "A verification email was recently sent. Please wait 2 minutes before requesting another." },
        { status: 429, headers: getRateLimitHeaders(emailRateResult) },
      );
    }

    // Find user: must exist and be unverified
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true, verifyExpires: true },
    });

    // Don't reveal whether the email exists — return success anyway
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If that email is registered and not yet verified, a verification email has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "This email is already verified. You can sign in.",
        alreadyVerified: true,
      });
    }

    // Generate new verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: tokenHash, verifyExpires },
    });

    // Send verification email
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";
    const verifyUrl = `${base}/api/auth/verify-email?token=${rawToken}`;
    const { subject, html } = verifyEmailEmail("there", verifyUrl);

    try {
      await sendEmail({ to: normalizedEmail, subject, html });
    } catch (emailErr) {
      logger.warn("Resend verification email failed", {
        email: normalizedEmail,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    logger.info("Verification email resent", { email: normalizedEmail });

    return NextResponse.json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error) {
    logger.error(
      "Resend verification error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Failed to resend verification email. Please try again." },
      { status: 500 },
    );
  }
}
