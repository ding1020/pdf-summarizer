import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";
import { sendEmail, trialWelcomeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { TRIAL_DURATION_DAYS } from "@/lib/subscription";
import { validateCsrf } from "@/lib/csrf";
import { createToken } from "@/lib/auth-token";
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
      // If user exists but not verified, auto-verify and update password
      // so they can sign in immediately (email verification is skipped entirely).
      if (!existing.emailVerified) {
        const passwordHash = await hashPassword(password);
        const trialEnd = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const reactivatedUser = await prisma.user.update({
          where: { id: existing.id },
          data: {
            emailVerified: true,
            verifyToken: null,
            verifyExpires: null,
            passwordHash,
            subscriptionStatus: "pro_trial",
            subscriptionEndDate: trialEnd,
          },
        });

        // Auto sign-in
        const token = createToken({
          id: reactivatedUser.id,
          email: reactivatedUser.email,
          firstName: reactivatedUser.firstName,
          lastName: reactivatedUser.lastName,
        });

        const response = NextResponse.json({
          success: true,
          message: "Account has been activated.",
          autoSignedIn: true,
        });

        response.cookies.set("__auth_token", token, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
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
    // Email verification is skipped: new users can sign in immediately.
    // Welcome emails are sent but failures are non-blocking.
    const passwordHash = await hashPassword(password);
    const trialEnd = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: true,
        verifyToken: null,
        verifyExpires: null,
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

    // Send trial welcome email (non-blocking)
    const name = firstName || "there";
    try {
      const trialEndStr = trialEnd.toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
      const trial = trialWelcomeEmail(name, trialEndStr);
      await sendEmail({ to: normalizedEmail, subject: trial.subject, html: trial.html });
    } catch (emailErr) {
      logger.warn("Trial welcome email send failed, but account created", {
        email: normalizedEmail,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    // Auto sign-in: issue auth token immediately after registration
    const token = createToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account created!",
      autoSignedIn: true,
    });

    response.cookies.set("__auth_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
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
