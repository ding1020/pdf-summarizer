import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

/**
 * POST /api/documents/:id/share
 * Toggle sharing for a document. Returns the share URL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { userId: true, summary: true, shareId: true, isPublic: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!doc.summary) {
      return NextResponse.json(
        { error: "Cannot share a document without a summary" },
        { status: 400 }
      );
    }

    if (doc.isPublic && doc.shareId) {
      // Already shared — return existing link
      return NextResponse.json({
        shared: true,
        shareUrl: `${BASE_URL}/share/${doc.shareId}`,
      });
    }

    // Generate unique shareId
    const shareId = randomBytes(12).toString("hex");

    await prisma.document.update({
      where: { id },
      data: { shareId, isPublic: true },
    });

    const shareUrl = `${BASE_URL}/share/${shareId}`;

    logger.info("[Share] Document shared", { documentId: id, shareId });

    return NextResponse.json({ shared: true, shareUrl });
  } catch (err) {
    logger.error(
      "[Share] Failed to toggle sharing",
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: "Failed to toggle sharing" },
      { status: 500 }
    );
  }
}
