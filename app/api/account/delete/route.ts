import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * DELETE /api/account/delete
 * GDPR Article 17 — Right to Erasure
 * Deletes all user data: documents, feedback, and user record.
 * Note: Clerk account deletion must be handled separately via Clerk Dashboard or API.
 */
export async function DELETE(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit — prevent abuse
    const identifier = getClientIdentifier(clerkId);
    const rateLimitResult = await rateLimitAsync(identifier, RATE_LIMITS.checkout);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all associated data in a transaction
    await prisma.$transaction([
      prisma.document.deleteMany({ where: { userId: user.id } }),
      prisma.feedback.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    logger.info("User account and data deleted", { clerkId });

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been deleted.",
      note: "Clerk account may need separate deletion via account settings.",
    });
  } catch (error) {
    logger.error("Account deletion failed", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }
}
