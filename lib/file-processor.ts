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
 */
async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
      pages: data.numpages,
    },
  };
}

/**
 * Extract text from DOCX buffer via mammoth.
 */
async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const result = await mammoth.extractRawText({ buffer });
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
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "[::]",
    "0",
  ];
  if (blockedHostnames.includes(hostname)) {
    throw new Error("Internal network URLs are not allowed");
  }
  if (
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("172.17.") ||
    hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") ||
    hostname.startsWith("172.20.") ||
    hostname.startsWith("172.21.") ||
    hostname.startsWith("172.22.") ||
    hostname.startsWith("172.23.") ||
    hostname.startsWith("172.24.") ||
    hostname.startsWith("172.25.") ||
    hostname.startsWith("172.26.") ||
    hostname.startsWith("172.27.") ||
    hostname.startsWith("172.28.") ||
    hostname.startsWith("172.29.") ||
    hostname.startsWith("172.30.") ||
    hostname.startsWith("172.31.") ||
    hostname.startsWith("169.254.") ||
    hostname === "metadata.google.internal"
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
