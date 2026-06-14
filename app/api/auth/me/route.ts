import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-token";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("__auth_token")?.value;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Refresh user data from DB
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
      }
    }

    return NextResponse.json({ signedIn: false, user: null });
  } catch {
    return NextResponse.json({ signedIn: false, user: null });
  }
}
