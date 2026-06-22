import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { detectFileType, extractText, SUPPORTED_EXTENSIONS } from "@/lib/file-processor";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { getClientIP } from "@/lib/api-utils";

/**
 * POST /api/upload — Unified upload handler
 *
 * Guest users:
 *   - PDF only, no DB storage, returns content for client-side summarization
 *
 * Signed-in users:
 *   - Multi-format (PDF, DOCX, TXT), stored in DB
 *   - Returns documentId only (content loaded server-side during summarize)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── Auth ──
  const userId = await getAuthUserId();
  const isGuest = !userId;

  // ── Rate Limiting ──
  try {
    const clientIp = getClientIP(req);
    const identifier = isGuest
      ? getClientIdentifier(null, clientIp)
      : getClientIdentifier(userId, clientIp);
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
  } catch {
    // fail open
  }

  // ── Parse form data ──
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data. Please select a file." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded. Please select a file." }, { status: 400 });
  }

  // ── Validate size ──
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  // ── Detect file type ──
  const fileType = detectFileType(file.name, file.type);

  // Guest users: PDF only
  if (isGuest) {
    if (!fileType) {
      return NextResponse.json(
        { error: "Only PDF files are supported. Sign up for Word & TXT support." },
        { status: 415 }
      );
    }
    if (fileType !== ".pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported for guest users. Sign up for full format support." },
        { status: 415 }
      );
    }
  }

  // Signed-in users: must have a supported format
  if (!isGuest && !fileType) {
    return NextResponse.json(
      { error: `Unsupported file format. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}` },
      { status: 415 }
    );
  }

  // ── Read buffer ──
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Uploaded file is empty or corrupted." }, { status: 400 });
  }

  // ── Extract text ──
  let extractedText: string;
  let pageCount = 0;

  try {
    const result = await extractText(buffer, fileType!, file.name);
    extractedText = result.text;
    pageCount = result.pageCount || 1;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from this document. The file may be scanned (image-based) or password-protected." },
        { status: 422 }
      );
    }
  } catch (extractError) {
    const errMsg = extractError instanceof Error ? extractError.message : String(extractError);
    logger.error("File extraction failed", new Error(errMsg), {
      filename: file.name,
      fileSize: file.size,
      fileType,
    });

    if (errMsg.includes("password") || errMsg.includes("encrypted")) {
      return NextResponse.json(
        { error: "This document is password-protected. Please remove the password and try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: "Failed to extract text from the document." }, { status: 422 });
  }

  // ── Truncate stored content (GDPR data minimization) ──
  const MAX_STORED_CONTENT_LENGTH = 100_000;
  const storedContent = extractedText.length > MAX_STORED_CONTENT_LENGTH
    ? extractedText.substring(0, MAX_STORED_CONTENT_LENGTH) + "\n\n[Content truncated for storage. Full text processed for summarization.]"
    : extractedText;

  // ── Guest: return content directly (no DB storage) ──
  if (isGuest) {
    const documentId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    logger.info("PDF uploaded by guest", {
      filename: file.name,
      pageCount,
      fileSize: file.size,
      duration: `${Date.now() - startTime}ms`,
    });

    return NextResponse.json({
      success: true,
      documentId,
      filename: file.name,
      fileSize: file.size,
      pageCount,
      content: extractedText, // Guests need content for client-side summarize
      isGuest: true,
    });
  }

  // ── Signed-in: store in DB, return documentId ──
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: userId! } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    logger.info("Document uploaded successfully", {
      documentId: document.id,
      filename: file.name,
      fileType,
      pageCount,
      fileSize: file.size,
      duration: `${Date.now() - startTime}ms`,
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      filename: file.name,
      fileSize: file.size,
      pageCount,
      fileType,
      // Content NOT returned — summarize API loads from DB server-side
      isGuest: false,
    });
  } catch (dbError) {
    const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
    logger.error("Database operation failed", new Error(errMsg));

    return NextResponse.json(
      { error: "Failed to save document. Please try again." },
      { status: 500 }
    );
  }
}
