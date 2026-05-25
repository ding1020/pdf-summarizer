import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Demo mode: auth optional
    let clerkId: string | null = null;
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = auth();
      if (userId) clerkId = userId;
    } catch (e) {
      // Demo mode
    }

    // Get user from database
    let user;
    if (clerkId) {
      user = await prisma.user.findUnique({
        where: { clerkId },
      });
    }

    if (user) {
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
    }

    // Demo mode: return not found for non-existent documents
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Demo mode: auth optional
    let clerkId: string | null = null;
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { userId } = auth();
      if (userId) clerkId = userId;
    } catch (e) {
      // Demo mode
    }

    // Get user from database
    let user;
    if (clerkId) {
      user = await prisma.user.findUnique({
        where: { clerkId },
      });
    }

    if (user) {
      await prisma.document.deleteMany({
        where: {
          id: id,
          userId: user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
