import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * DELETE /api/account/delete
 * GDPR Article 17 — Right to Erasure
 * Deletes all user data: documents, feedback, and user record.
 */
export async function DELETE(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit — prevent abuse
    const identifier = getClientIdentifier(userId);
    const rateLimitResult = await rateLimitAsync(identifier, RATE_LIMITS.checkout);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all associated data in a transaction (GDPR-compliant cascade)
    await prisma.$transaction([
      prisma.apiKey.deleteMany({ where: { userId: user.id } }),
      prisma.document.deleteMany({ where: { userId: user.id } }),
      prisma.feedback.deleteMany({ where: { userId: user.id } }),
      prisma.paymentRequest.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    logger.info("User account and data deleted", { userId });

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been deleted.",
    });
  } catch (error) {
    logger.error("Account deletion failed", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 }
    );
  }
}
