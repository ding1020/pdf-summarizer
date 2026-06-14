import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Require authentication
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    logger.error("Get document error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Require authentication
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await prisma.document.deleteMany({
      where: {
        id: id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    logger.error("Delete document error:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
