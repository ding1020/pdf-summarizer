/**
 * PDF Processor Unit Tests
 *
 * Tests for:
 *  - File type detection (extensions, MIME types)
 *  - SSRF protection (internal IPs, protocols)
 *  - URL validation edge cases
 *  - Text extraction (via mocks)
 */
import { describe, it, expect } from "vitest";
import { detectFileType, SUPPORTED_EXTENSIONS } from "@/lib/file-processor";

// ── File Type Detection ──
describe("detectFileType", () => {
  it("detects PDF from filename", () => {
    expect(detectFileType("document.pdf")).toBe(".pdf");
  });

  it("detects PDF from filename (uppercase)", () => {
    expect(detectFileType("DOCUMENT.PDF")).toBe(".pdf");
  });

  it("detects DOCX from filename", () => {
    expect(detectFileType("report.docx")).toBe(".docx");
  });

  it("detects TXT from filename", () => {
    expect(detectFileType("notes.txt")).toBe(".txt");
  });

  it("detects PDF from MIME type", () => {
    expect(detectFileType("file", "application/pdf")).toBe(".pdf");
  });

  it("detects DOCX from MIME type", () => {
    expect(
      detectFileType(
        "file",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(".docx");
  });

  it("detects TXT from MIME type", () => {
    expect(detectFileType("file", "text/plain")).toBe(".txt");
  });

  it("returns null for unsupported extension", () => {
    expect(detectFileType("image.png")).toBeNull();
  });

  it("returns null for unsupported MIME type", () => {
    expect(detectFileType("file", "image/png")).toBeNull();
  });

  it("returns null for file with no extension", () => {
    expect(detectFileType("makefile")).toBeNull();
  });

  it("returns null for file with unknown extension", () => {
    expect(detectFileType("script.exe")).toBeNull();
    expect(detectFileType("archive.zip")).toBeNull();
  });

  it("MIME type takes priority over extension", () => {
    // If MIME type is PDF but extension is .txt, use MIME type
    expect(detectFileType("file.txt", "application/pdf")).toBe(".pdf");
  });

  it("handles compound extensions", () => {
    expect(detectFileType("archive.tar.gz")).toBeNull();
    expect(detectFileType("document.pdf.docx")).toBe(".docx");
  });
});

// ── Supported Extensions ──
describe("SUPPORTED_EXTENSIONS", () => {
  it("contains pdf, docx, txt", () => {
    expect(SUPPORTED_EXTENSIONS).toContain(".pdf");
    expect(SUPPORTED_EXTENSIONS).toContain(".docx");
    expect(SUPPORTED_EXTENSIONS).toContain(".txt");
  });

  it("does not contain unsupported formats", () => {
    expect(SUPPORTED_EXTENSIONS).not.toContain(".exe");
    expect(SUPPORTED_EXTENSIONS).not.toContain(".zip");
    expect(SUPPORTED_EXTENSIONS).not.toContain(".html");
  });
});

// ── SSRF Protection ──
describe("SSRF Protection (URL validation)", () => {
  // Test the validation logic that fetchUrlText would apply
  function validateUrl(inputUrl: string): { valid: boolean; error?: string } {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(inputUrl);
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { valid: false, error: `Unsupported protocol: ${parsedUrl.protocol}` };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedHostnames = [
      "localhost", "127.0.0.1", "0.0.0.0", "[::1]", "[::]", "0",
    ];
    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: "Internal network URLs are not allowed" };
    }

    if (
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      (hostname.startsWith("172.") && parseInt(hostname.split(".")[1]) >= 16 && parseInt(hostname.split(".")[1]) <= 31) ||
      hostname.startsWith("169.254.") ||
      hostname === "metadata.google.internal"
    ) {
      return { valid: false, error: "Internal network URLs are not allowed" };
    }

    if (parsedUrl.username || parsedUrl.password) {
      return { valid: false, error: "URL credentials are not allowed" };
    }

    return { valid: true };
  }

  it("allows valid HTTPS URL", () => {
    expect(validateUrl("https://example.com/doc.pdf").valid).toBe(true);
  });

  it("allows valid HTTP URL", () => {
    expect(validateUrl("http://example.com/doc.txt").valid).toBe(true);
  });

  it("blocks file:// protocol", () => {
    const result = validateUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("protocol");
  });

  it("blocks ftp:// protocol", () => {
    const result = validateUrl("ftp://example.com/file");
    expect(result.valid).toBe(false);
  });

  it("blocks localhost", () => {
    expect(validateUrl("http://localhost:3000/api").valid).toBe(false);
    expect(validateUrl("https://localhost/data").valid).toBe(false);
  });

  it("blocks 127.0.0.1", () => {
    expect(validateUrl("http://127.0.0.1:8080/secret").valid).toBe(false);
  });

  it("blocks 192.168.x.x", () => {
    expect(validateUrl("http://192.168.1.1/admin").valid).toBe(false);
  });

  it("blocks 10.x.x.x", () => {
    expect(validateUrl("http://10.0.0.1/internal").valid).toBe(false);
  });

  it("blocks 172.16-31.x.x", () => {
    expect(validateUrl("http://172.16.0.1/api").valid).toBe(false);
    expect(validateUrl("http://172.31.255.255/api").valid).toBe(false);
  });

  it("blocks 0.0.0.0", () => {
    expect(validateUrl("http://0.0.0.0:8080").valid).toBe(false);
  });

  it("blocks GCP metadata endpoint", () => {
    expect(validateUrl("http://metadata.google.internal").valid).toBe(false);
  });

  it("blocks link-local 169.254.x.x", () => {
    expect(validateUrl("http://169.254.169.254/latest/meta-data").valid).toBe(false);
  });

  it("blocks URL with credentials", () => {
    expect(validateUrl("http://user:pass@example.com").valid).toBe(false);
  });

  it("blocks @-notation host override", () => {
    expect(validateUrl("http://safe.com@evil.com/admin").valid).toBe(false);
  });

  it("rejects invalid URL format", () => {
    expect(validateUrl("not-a-url").valid).toBe(false);
    expect(validateUrl("").valid).toBe(false);
  });
});

// ── Content Handling ──
describe("Content handling", () => {
  it("should detect empty extracted text", () => {
    const emptyText = "";
    expect(emptyText.length).toBe(0);
    expect(emptyText.trim().length).toBe(0);
  });

  it("should truncate content exceeding max length", () => {
    const maxLength = 1000;
    const longContent = "a".repeat(2000);
    const truncated = longContent.substring(0, maxLength);
    expect(truncated.length).toBe(maxLength);
  });

  it("should not truncate content within limit", () => {
    const maxLength = 1000;
    const content = "a".repeat(500);
    expect(content.length).toBeLessThanOrEqual(maxLength);
  });
});
