import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const userId = await getAuthUserId();

    // Only allow users to access their own data
    if (!userId || userId !== targetUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error("Error fetching user", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
