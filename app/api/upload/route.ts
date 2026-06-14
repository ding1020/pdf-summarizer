import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// pdf-parse is a CommonJS module, must be dynamically imported
async function parsePDF(buffer: Buffer) {
  const pdfParse = await import("pdf-parse");
  const parser = pdfParse.default || pdfParse;
  return parser(buffer);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  // ==================== Auth (safe wrapper) ====================
  const clerkId = await getAuthUserId();
  const isGuest = !clerkId;

  // ==================== Rate Limiting ====================
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "anonymous";
    const identifier = isGuest
      ? getClientIdentifier(null, clientIp)
      : getClientIdentifier(clerkId, clientIp);
    const rateLimitConfig = isGuest ? RATE_LIMITS.guest : RATE_LIMITS.free;
    const rateLimitResult = await rateLimitAsync(identifier, rateLimitConfig);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: isGuest
            ? "Free trial limit reached. Sign up for 5 summaries/day."
            : "Upload rate limit exceeded. Please wait a moment.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }
  } catch (rateLimitError) {
    logger.warn("Rate limiting failed", {
      error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
    });
    // Continue anyway — don't block upload because rate limiter failed
  }

  // ==================== File Processing ====================
  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File;
  } catch (formError) {
    return NextResponse.json(
      { error: "Invalid form data. Please select a PDF file." },
      { status: 400 }
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "No file uploaded. Please select a PDF file." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are supported." },
      { status: 400 }
    );
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.` },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "The uploaded file is empty." },
      { status: 400 }
    );
  }

  // ==================== Parse PDF ====================
  let pdfData: { text: string; numpages: number; numPages?: number };
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty or corrupted." },
        { status: 400 }
      );
    }

    pdfData = await parsePDF(buffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. The file may be scanned (image-based) or password-protected." },
        { status: 422 }
      );
    }
  } catch (parseError) {
    const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
    logger.error("PDF parsing failed", new Error(errMsg), {
      filename: file.name,
      fileSize: file.size,
    });

    // Provide actionable error messages
    if (errMsg.includes("password") || errMsg.includes("encrypted")) {
      return NextResponse.json(
        { error: "This PDF is password-protected. Please remove the password and try again." },
        { status: 422 }
      );
    }

    if (errMsg.includes("Invalid PDF") || errMsg.includes("not a pdf")) {
      return NextResponse.json(
        { error: "Invalid PDF file. The file may be corrupted." },
        { status: 422 }
      );
    }

    if (errMsg.includes("ENOENT") || errMsg.includes("module not found")) {
      return NextResponse.json(
        { error: "Server configuration error (PDF parser missing). Please contact support." },
        { status: 500 }
      );
    }

    // Generic parsing error
    return NextResponse.json(
      { error: `Failed to read PDF: ${errMsg}` },
      { status: 500 }
    );
  }

  // ==================== Save / Return ====================
  const pageCount = pdfData.numpages ?? pdfData.numPages ?? 0;
  // Truncate stored content for compliance (GDPR data minimization)
  const MAX_STORED_CONTENT_LENGTH = 100_000;
  const storedContent = pdfData.text.length > MAX_STORED_CONTENT_LENGTH
    ? pdfData.text.substring(0, MAX_STORED_CONTENT_LENGTH) + "\n\n[Content truncated for storage. Full text processed for summarization.]"
    : pdfData.text;

  try {
    let documentId: string;

    if (isGuest || !clerkId) {
      documentId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      logger.info("PDF uploaded by guest", {
        filename: file.name,
        pageCount,
        fileSize: file.size,
        duration: `${Date.now() - startTime}ms`,
      });
    } else {
      let dbUser = await prisma.user.findUnique({ where: { clerkId } });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            clerkId,
            email: `${clerkId}@clerk.pdfsum.com`,
          },
        });
      }

      const document = await prisma.document.create({
        data: {
          userId: dbUser.id,
          filename: file.name,
          fileSize: file.size,
          pageCount,
          content: storedContent,
          status: "completed",
        },
      });

      documentId = document.id;

      logger.info("PDF uploaded successfully", {
        documentId: document.id,
        filename: file.name,
        pageCount,
        fileSize: file.size,
        duration: `${Date.now() - startTime}ms`,
      });
    }

    return NextResponse.json({
      success: true,
      documentId,
      filename: file.name,
      fileSize: file.size,
      pageCount,
      content: pdfData.text,
      isGuest,
    });
  } catch (dbError) {
    const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
    logger.error("Database operation failed", new Error(errMsg));

    // If DB fails but we already parsed the PDF, still return results to guest
    if (isGuest) {
      const fallbackId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      return NextResponse.json({
        success: true,
        documentId: fallbackId,
        filename: file.name,
        fileSize: file.size,
        pageCount,
        content: pdfData.text,
        isGuest: true,
        warning: "Summary generated but not saved (database unavailable)",
      });
    }

    return NextResponse.json(
      { error: "Failed to save document. Please try again." },
      { status: 500 }
    );
  }
}
