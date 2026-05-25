import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Check if Clerk is configured (works with both test and production keys)
const isClerkConfigured = () => {
  const key = process.env.CLERK_SECRET_KEY;
  return !!(key && (key.startsWith("sk_live_") || key.startsWith("sk_test_")));
};

// pdf-parse 是 CommonJS 模块，需要动态导入
async function parsePDF(buffer: Buffer) {
  const pdfParse = await import("pdf-parse");
  const parser = pdfParse.default || pdfParse;
  return parser(buffer);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    let userId = "demo-user";
    let clerkId: string | null = null;

    // Try to get auth if Clerk is configured
    if (isClerkConfigured()) {
      try {
        const { auth } = await import("@clerk/nextjs/server");
        const { userId: id } = await auth();
        if (id) {
          clerkId = id;
          userId = id;
        }
      } catch (e) {
        logger.warn("Clerk auth failed, using demo mode");
      }
    }

    // Rate limiting
    const clientId = getClientIdentifier(userId);
    const rateLimitResult = rateLimit(clientId, RATE_LIMITS.free);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Upload rate limit exceeded. Please wait a moment.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 20MB limit" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse PDF
    const pdfData = await parsePDF(buffer);

    // Get or create user (demo mode uses fixed demo user)
    const targetClerkId = clerkId || "demo";
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: targetClerkId },
    });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          clerkId: targetClerkId,
          email: clerkId ? `${clerkId}@example.com` : "demo@example.com",
        },
      });
    }

    // Save document to database
    const document = await prisma.document.create({
      data: {
        userId: dbUser.id,
        filename: file.name,
        fileSize: file.size,
        pageCount: pdfData.numpages,
        content: pdfData.text,
        status: "completed",
      },
    });

    logger.info("PDF uploaded successfully", {
      documentId: document.id,
      filename: file.name,
      pageCount: pdfData.numpages,
      fileSize: file.size,
      demoMode: !clerkId,
      duration: `${Date.now() - startTime}ms`,
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      filename: file.name,
      fileSize: file.size,
      pageCount: pdfData.numpages,
      content: pdfData.text,
      demoMode: !clerkId,
    });
  } catch (error) {
    logger.error("Upload failed", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
