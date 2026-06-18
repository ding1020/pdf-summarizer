/**
 * POST /api/documents/upload
 * Multi-format file upload: PDF, DOCX, TXT.
 * Extracts text server-side and returns content for summarization.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { detectFileType, extractText, SUPPORTED_EXTENSIONS } from "@/lib/file-processor";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { rateLimitAsync, RATE_LIMITS, getClientIdentifier } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // ── Auth ──
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate Limit ──
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const identifier = getClientIdentifier(userId, clientIp);
    const result = await rateLimitAsync(identifier, RATE_LIMITS.free);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
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
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  // ── Validate size ──
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      },
      { status: 413 }
    );
  }

  // ── Detect file type ──
  const fileType = detectFileType(file.name, file.type);

  if (!fileType) {
    return NextResponse.json(
      {
        error: `Unsupported file format. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      },
      { status: 415 }
    );
  }

  // ── Read buffer ──
  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Extract text ──
  try {
    const result = await extractText(buffer, fileType, file.name);

    if (!result.text || result.text.trim().length === 0) {
      return NextResponse.json(
        { error: "No extractable text found in the document" },
        { status: 422 }
      );
    }

    // ── Save to database ──
    const document = await prisma.document.create({
      data: {
        userId,
        filename: file.name,
        fileSize: file.size,
        pageCount: result.pageCount || 1,
        content: result.text,
        status: "completed",
      },
    });

    logger.info("[Upload] File processed successfully", {
      documentId: document.id,
      fileType,
      fileName: file.name,
      textLength: result.text.length,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        pageCount: document.pageCount,
        contentLength: result.text.length,
        fileType,
      },
    });
  } catch (extractError) {
    logger.error("[Upload] Failed to extract text", undefined, {
      error:
        extractError instanceof Error
          ? extractError.message
          : String(extractError),
      fileName: file.name,
      fileType,
    });

    return NextResponse.json(
      { error: "Failed to extract text from the document" },
      { status: 422 }
    );
  }
}
