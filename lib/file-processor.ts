/**
 * Unified file processor — extracts text from PDF, DOCX, TXT, and URLs.
 * Uses pdf-parse for PDF, mammoth for DOCX, built-in for TXT/URL.
 */

import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export interface ExtractResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

const MIME_MAP: Record<string, SupportedExtension> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};

/**
 * Detect file type from extension or MIME type.
 */
export function detectFileType(
  filename: string,
  mimeType?: string
): SupportedExtension | null {
  if (mimeType && MIME_MAP[mimeType]) return MIME_MAP[mimeType];

  const ext = filename.toLowerCase().split(".").pop();
  if (ext && SUPPORTED_EXTENSIONS.includes(`.${ext}` as SupportedExtension)) {
    return `.${ext}` as SupportedExtension;
  }

  return null;
}

// ── Magic Bytes Signatures ──
// Used to validate that file content matches its claimed type,
// preventing malicious uploads disguised with wrong extensions.
const MAGIC_BYTES: Record<SupportedExtension, number[]> = {
  ".pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  ".docx": [0x50, 0x4b, 0x03, 0x04], // PK (ZIP/OOXML)
  ".txt": [], // No magic bytes — validated separately
};

/**
 * Validate that a buffer's magic bytes match the expected file type.
 * Returns true if the content matches the claimed type.
 *
 * For PDF: checks first 4 bytes are %PDF
 * For DOCX: checks first 4 bytes are PK\x03\x04 (ZIP signature)
 * For TXT: validates content is valid UTF-8 or ASCII text (no null bytes in first 1KB)
 */
export function validateMagicBytes(
  buffer: Buffer,
  fileType: SupportedExtension,
): boolean {
  if (buffer.length === 0) return false;

  const expected = MAGIC_BYTES[fileType];
  if (expected.length === 0) {
    // TXT: check first 1KB for binary content (null bytes indicate non-text)
    const checkLength = Math.min(buffer.length, 1024);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0x00) return false; // Null byte = binary content
    }
    return true;
  }

  // Check if buffer starts with the expected magic bytes
  if (buffer.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Main entry: extract text from a Buffer based on detected file type.
 */
export async function extractText(
  buffer: Buffer,
  fileType: SupportedExtension,
  _filename: string
): Promise<ExtractResult> {
  switch (fileType) {
    case ".pdf":
      return extractPdf(buffer);
    case ".docx":
      return extractDocx(buffer);
    case ".txt":
      return extractTxt(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract text from PDF buffer via pdf-parse.
 * Falls back to Tencent Cloud OCR when the PDF is scanned (no extractable text).
 */
async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const data = await pdfParse(buffer);
  const pageCount = data.numpages;
  const text = data.text;

  // ── OCR fallback for scanned PDFs ──
  // If pdf-parse returns empty/short text, the PDF is likely a scan.
  // Render pages to images and OCR them via Tencent Cloud.
  let { needsOcr, pdfOcrFallback } = await import("./pdf-ocr");

  if (needsOcr(text, pageCount)) {
    console.info("[OCR] pdf-parse returned insufficient text, triggering OCR fallback", {
      textLength: text.length,
      pageCount,
    });

    try {
      const ocrResult = await pdfOcrFallback(buffer);
      console.info("[OCR] Fallback complete", {
        ocrPages: ocrResult.ocrPagesProcessed,
        textLength: ocrResult.text.length,
      });

      return {
        text: ocrResult.text,
        pageCount: ocrResult.pageCount,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          pages: ocrResult.pageCount,
          ocrUsed: true,
          ocrPages: ocrResult.ocrPagesProcessed,
        },
      };
    } catch (ocrError) {
      console.error("[OCR] Fallback failed:", ocrError instanceof Error ? ocrError.message : ocrError);
      // Return whatever pdf-parse got (even if empty) — better than crashing
    }
  }

  return {
    text,
    pageCount,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
      pages: pageCount,
    },
  };
}

/**
 * Extract text from DOCX buffer via mammoth.
 */
async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const result = await mammoth.extractRawText({ buffer } as unknown as Buffer);
  return {
    text: result.value,
    metadata: {
      warnings: result.messages,
    },
  };
}

/**
 * Decode TXT — tries UTF-8 first, falls back to latin1 for binary-safe decode.
 */
async function extractTxt(buffer: Buffer): Promise<ExtractResult> {
  // Try UTF-8
  const utf8 = buffer.toString("utf-8");
  // Detect if valid UTF-8 (no replacement character for valid bytes)
  const hasReplacementChars = utf8.includes("\ufffd");

  return {
    text: hasReplacementChars ? buffer.toString("latin1") : utf8,
  };
}

/**
 * Fetch text content from a URL (for URL-based summarization).
 * Includes SSRF protection: only http/https, blocks internal IPs.
 */
export async function fetchUrlText(inputUrl: string): Promise<ExtractResult> {
  // ── SSRF Protection ──
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Protocol whitelist
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only HTTP(S) is allowed.`);
  }

  // Block internal/private network addresses
  const hostname = parsedUrl.hostname.toLowerCase();

  // Decode decimal/hex/octal IP encodings to prevent bypass
  let decodedHostname = hostname;
  // Decimal encoding (e.g., 2130706433 → 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (num >= 0 && num <= 0xFFFFFFFF) {
      decodedHostname = [
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF,
      ].join('.');
    }
  }
  // Hex encoding (e.g., 0x7f.0x00.0x00.0x01)
  if (hostname.startsWith('0x') || /^0x[0-9a-f]+/i.test(hostname)) {
    const parts = hostname.split('.').map(p => {
      if (p.startsWith('0x')) return parseInt(p, 16);
      return parseInt(p, 10);
    });
    if (parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
      decodedHostname = parts.join('.');
    }
  }

  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "[::]",
    "0",
  ];
  if (blockedHostnames.includes(decodedHostname)) {
    throw new Error("Internal network URLs are not allowed");
  }
  if (
    decodedHostname.startsWith("192.168.") ||
    decodedHostname.startsWith("10.") ||
    decodedHostname.startsWith("172.16.") ||
    decodedHostname.startsWith("172.17.") ||
    decodedHostname.startsWith("172.18.") ||
    decodedHostname.startsWith("172.19.") ||
    decodedHostname.startsWith("172.20.") ||
    decodedHostname.startsWith("172.21.") ||
    decodedHostname.startsWith("172.22.") ||
    decodedHostname.startsWith("172.23.") ||
    decodedHostname.startsWith("172.24.") ||
    decodedHostname.startsWith("172.25.") ||
    decodedHostname.startsWith("172.26.") ||
    decodedHostname.startsWith("172.27.") ||
    decodedHostname.startsWith("172.28.") ||
    decodedHostname.startsWith("172.29.") ||
    decodedHostname.startsWith("172.30.") ||
    decodedHostname.startsWith("172.31.") ||
    decodedHostname.startsWith("169.254.") ||
    decodedHostname === "metadata.google.internal"
  ) {
    throw new Error("Internal network URLs are not allowed");
  }

  // Block attempts to use @-notation to override host (e.g., http://safe.com@evil.com)
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("URL credentials are not allowed");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(inputUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PDFSummaryAI/1.0 (https://www.pdfsum.com)",
      },
      // Prevent automatic redirect following to internal hosts
      redirect: "manual",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    // If HTML, try to extract text (basic approach)
    if (contentType.includes("text/html")) {
      const html = buffer.toString("utf-8");
      const text = stripHtml(html);
      return { text };
    }

    // Treat as plain text
    return { text: buffer.toString("utf-8") };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Basic HTML text stripping — removes scripts, styles, and tags.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
