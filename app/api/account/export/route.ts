import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * GET /api/account/export
 * GDPR Article 20 — Right to Data Portability
 * Exports all user data in structured JSON format.
 */
export async function GET(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit — prevent abuse
    const identifier = getClientIdentifier(userId);
    const rateLimitResult = await rateLimitAsync(identifier, {
      windowMs: 300_000, // 5 minutes — export is heavy
      maxRequests: 2,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many export requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            filename: true,
            fileSize: true,
            pageCount: true,
            content: true,
            summary: true,
            status: true,
            createdAt: true,
          },
        },
        feedbacks: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            category: true,
            message: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build GDPR-compliant export payload
    const exportData = {
      exportedAt: new Date().toISOString(),
      request: {
        type: "GDPR Article 20 — Data Portability",
        rights: [
          "Right of access (Art. 15)",
          "Right to data portability (Art. 20)",
          "Right to erasure (Art. 17) — DELETE /api/account/delete",
        ],
      },
      personalData: {
        email: user.email,
        clerkId: user.clerkId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionId: user.subscriptionId,
        creemSubscriptionId: user.creemSubscriptionId,
        billingCycle: user.billingCycle,
        subscriptionEndDate: user.subscriptionEndDate?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        usageCountToday: user.usageCount,
      },
      documents: user.documents.map((doc) => ({
        ...doc,
        createdAt: doc.createdAt.toISOString(),
      })),
      feedback: user.feedbacks.map((fb) => ({
        ...fb,
        createdAt: fb.createdAt.toISOString(),
      })),
    };

    logger.info("User data exported", { userId, documentCount: user.documents.length });

    return NextResponse.json(exportData, {
      headers: {
        ...getRateLimitHeaders(rateLimitResult),
        "Content-Disposition": `attachment; filename="pdfsum-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    logger.error("Data export failed", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to export data. Please contact support." },
      { status: 500 }
    );
  }
}
