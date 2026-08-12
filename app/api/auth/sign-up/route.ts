import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";
import { sendEmail, verifyEmailEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { TRIAL_DURATION_DAYS } from "@/lib/subscription";
import { validateCsrf } from "@/lib/csrf";
import { getClientIP } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    // CSRF validation
    if (!validateCsrf(req)) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 },
      );
    }
    // Rate limiting: prevent abuse
    const clientIp = getClientIP(req);
    const rateResult = await rateLimitAsync(`auth:signup:${clientIp}`, RATE_LIMITS.auth);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const { email, password, firstName, lastName, utm_source, utm_medium, utm_campaign } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    // Password complexity: must contain uppercase, lowercase, and a digit
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must include at least one uppercase letter, one lowercase letter, and one number" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (existing) {
      // If user exists but not verified, generate a new verification token and resend email.
      // Do NOT auto-verify — user must click the verification link.
      if (!existing.emailVerified) {
        const passwordHash = await hashPassword(password);
        const trialEnd = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await prisma.user.update({
          where: { id: existing.id },
          data: {
            emailVerified: false,
            verifyToken: tokenHash,
            verifyExpires,
            passwordHash,
            subscriptionStatus: "pro_trial",
            subscriptionEndDate: trialEnd,
          },
        });

        // Send verification email
        const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";
        const verifyUrl = `${base}/api/auth/verify-email?token=${rawToken}`;
        const name = firstName || "there";
        try {
          const { subject, html } = verifyEmailEmail(name, verifyUrl);
          await sendEmail({ to: normalizedEmail, subject, html });
        } catch (emailErr) {
          logger.warn("Verification email send failed, but account updated", {
            email: normalizedEmail,
            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
          });
        }

        return NextResponse.json({
          success: true,
          message: "A verification email has been sent. Please check your inbox to activate your account.",
          autoSignedIn: false,
          requiresVerification: true,
        });
      }

      // Already verified — do NOT allow password reset via re-registration
      // This prevents account takeover: anyone knowing an email could reset its password.
      // Return same success message to prevent email enumeration.
      return NextResponse.json({
        success: true,
        message: "Account created! You can now sign in.",
        autoSignedIn: false,
      });
    }

    // Create user with hashed password AND 14-day Pro trial
    // Email verification is required: user must click the verification link
    // before they can sign in.
    const passwordHash = await hashPassword(password);
    const trialEnd = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: false,
        verifyToken: tokenHash,
        verifyExpires,
        internalId: `native_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`,
        subscriptionStatus: "pro_trial",
        subscriptionEndDate: trialEnd,
      },
    });

    // Audit
    const utmData =
      utm_source || utm_medium || utm_campaign
        ? { utm_source, utm_medium, utm_campaign }
        : undefined;
    await recordAudit({
      userId: user.id,
      action: "sign_up",
      resource: "User",
      resourceId: user.id,
      details: { email: normalizedEmail, ...(utmData && { utm: utmData }) },
      ip: clientIp,
    });

    // Send verification email (non-blocking)
    const name = firstName || "there";
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";
    const verifyUrl = `${base}/api/auth/verify-email?token=${rawToken}`;
    try {
      const { subject, html } = verifyEmailEmail(name, verifyUrl);
      await sendEmail({ to: normalizedEmail, subject, html });
    } catch (emailErr) {
      logger.warn("Verification email send failed, but account created", {
        email: normalizedEmail,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    // Do NOT auto sign-in — user must verify their email first
    return NextResponse.json({
      success: true,
      message: "Account created! Please check your email to verify your account.",
      autoSignedIn: false,
      requiresVerification: true,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Sign-up error:", err);

    // Unique constraint violation
    if (
      error instanceof Error &&
      error.message?.includes("unique constraint")
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Sign-up failed. Please try again." },
      { status: 500 }
    );
  }
}
