import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createToken } from "@/lib/auth-token";
import { rateLimitAsync, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: prevent brute-force
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
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

    // Issue auth token
    const token = createToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("__auth_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}
