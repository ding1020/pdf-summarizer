import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-token";
import { prisma } from "@/lib/db";
import { rateLimitAsync, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting — prevent token enumeration attacks
    const clientIp = getClientIP(req);
    const rateResult = await rateLimitAsync(`auth:me:${clientIp}`, {
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const token = req.cookies.get("__auth_token")?.value;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Refresh user data from DB (also detects deleted accounts)
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (dbUser) {
          return NextResponse.json({
            signedIn: true,
            user: {
              id: dbUser.id,
              email: dbUser.email,
              firstName: dbUser.firstName,
              lastName: dbUser.lastName,
              imageUrl: null,
            },
          });
        }
        // Token valid but user deleted → treat as signed out
        logger.warn("[auth/me] Token valid but user not found in DB (possibly deleted)", {
          userId: payload.userId,
        });
      }
    }

    return NextResponse.json({ signedIn: false, user: null });
  } catch {
    return NextResponse.json({ signedIn: false, user: null });
  }
}
