import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createToken } from "@/lib/auth-token";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { validateCsrf } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    // CSRF validation
    if (!validateCsrf(req)) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 },
      );
    }
    // Rate limiting: prevent brute-force
    const clientIp = getClientIP(req);
    const rateResult = await rateLimitAsync(`auth:signin:${clientIp}`, RATE_LIMITS.auth);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Rate limiting: per-email brute-force protection
    const normalizedEmail = email.trim().toLowerCase();
    const emailKey = `auth:signin:email:${normalizedEmail}`;
    const emailRateResult = await rateLimitAsync(emailKey, {
      windowMs: 15 * 60_000, // 15 minutes
      maxRequests: 5,
    });
    if (!emailRateResult.success) {
      return NextResponse.json(
        { error: "Too many attempts for this account. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(emailRateResult) },
      );
    }

    // Find user by normalized email (must match sign-up → trim + lowercase)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        verifyToken: true,
        verifyExpires: true,
        tokenVersion: true,
      },
    });

    if (!user?.passwordHash) {
      // Don't reveal whether email exists
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Block unverified users from signing in
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email address before signing in. Check your inbox for the verification link.",
          requiresVerification: true,
          email: normalizedEmail,
        },
        { status: 403 },
      );
    }

    // Issue auth token
    const token = createToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tokenVersion: user.tokenVersion,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("__auth_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Audit
    await recordAudit({
      userId: user.id,
      action: "sign_in",
      resource: "User",
      resourceId: user.id,
      ip: clientIp,
    });

    return response;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Sign-in error", err, {
      stack: err.stack,
      name: err.name,
      message: err.message,
    });
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}
