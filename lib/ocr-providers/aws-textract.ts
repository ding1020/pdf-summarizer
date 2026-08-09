/**
 * AWS Textract OCR provider — direct REST API with AWS Signature V4, no SDK.
 *
 * Uses the DetectDocumentText action to extract text from a single image.
 * Authentication is via AWS Signature V4, computed manually with the
 * `crypto` module — the same approach used by lib/tencent-ocr.ts.
 *
 * AWS Textract is a strong choice for international deployments, especially
 * those already running on AWS infrastructure.
 *
 * Docs: https://docs.aws.amazon.com/textract/latest/dg/API_DetectDocumentText.html
 *       https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
 */

import crypto from "crypto";
import type { OcrProvider } from "../ocr-provider";

const SERVICE = "textract";
const ALGORITHM = "AWS4-HMAC-SHA256";

// ── Crypto helpers (mirror the Tencent provider's approach) ──

function sha256Hex(message: string): string {
  return crypto.createHash("sha256").update(message, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, message: string): Buffer {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest();
}

/** Format a Date as AWS amz-date: YYYYMMDDTHHMMSSZ */
function toAmzDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z"
  );
}

/** Format a Date as dateStamp: YYYYMMDD */
function toDateStamp(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

// ── Response types ──

interface TextractBlock {
  BlockType?: string;
  Text?: string;
}

interface TextractResponse {
  Blocks?: TextractBlock[];
  // Errors come back as non-2xx HTTP status with a JSON body.
  message?: string;
  Message?: string;
}

/**
 * AWS Textract OCR provider.
 *
 * Requires:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION  (default: us-east-1)
 */
export class AwsTextractOcrProvider implements OcrProvider {
  readonly name = "AWS Textract";

  async ocrImage(imageBase64: string): Promise<string> {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";

    if (!accessKey || !secretKey) {
      throw new Error(
        "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not configured. " +
          "Set them along with AWS_REGION in your environment."
      );
    }

    const host = `${SERVICE}.${region}.amazonaws.com`;
    const endpoint = `https://${host}`;
    const amzDate = toAmzDate(new Date());
    const dateStamp = toDateStamp(new Date());

    // DetectDocumentText expects the image bytes as base64 inside JSON.
    const payload = JSON.stringify({
      Document: { Bytes: imageBase64 },
    });
    const payloadHash = sha256Hex(payload);

    // ── Step 1: Build canonical request ──
    const canonicalHeaders =
      `content-type:application/x-amz-json-1.1\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:Textract.DetectDocumentText\n`;
    const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
    const canonicalRequest = [
      "POST",
      "/",
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    // ── Step 2: Build string to sign ──
    const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
    const stringToSign = [
      ALGORITHM,
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    // ── Step 3: Derive signing key & signature ──
    const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, SERVICE);
    const kSigning = hmacSha256(kService, "aws4_request");
    const signature = crypto
      .createHmac("sha256", kSigning)
      .update(stringToSign, "utf8")
      .digest("hex");

    // ── Step 4: Build authorization header ──
    const authorization =
      `${ALGORITHM} Credential=${accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // ── Make request ──
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/x-amz-json-1.1",
        Host: host,
        "X-Amz-Date": amzDate,
        "X-Amz-Target": "Textract.DetectDocumentText",
      },
      body: payload,
    });

    const data = (await res.json()) as TextractResponse;

    if (!res.ok) {
      const message = data.message || data.Message || res.statusText;
      throw new Error(`AWS Textract HTTP ${res.status}: ${message}`);
    }

    const blocks = data.Blocks ?? [];

    // Prefer LINE blocks — they preserve reading order & structure.
    const lines = blocks
      .filter((b) => b.BlockType === "LINE" && b.Text)
      .map((b) => b.Text as string);
    if (lines.length > 0) {
      return lines.join("\n");
    }

    // Fallback: WORD blocks joined with spaces.
    const words = blocks
      .filter((b) => b.BlockType === "WORD" && b.Text)
      .map((b) => b.Text as string);
    return words.join(" ");
  }
}
