/**
 * Tencent Cloud OCR client — direct HTTP call with TC3-HMAC-SHA256 signature.
 * No SDK needed, keeps bundle size small.
 *
 * Uses GeneralBasicOCR (通用印刷体识别) — free tier: 1000 calls/month.
 * Fallback: GeneralAccurateOCR (通用印刷体高精度版) for better accuracy.
 */

import crypto from "crypto";

const SERVICE = "ocr";
const HOST = "ocr.tencentcloudapi.com";
const ENDPOINT = `https://${HOST}`;
const VERSION = "2018-11-19";
const REGION = "ap-guangzhou";
const ALGORITHM = "TC3-HMAC-SHA256";

function sha256Hex(message: string): string {
  return crypto.createHash("sha256").update(message, "utf8").digest("hex");
}

function hmacSha256(key: Buffer, message: string): Buffer {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest();
}

function getDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return (
    d.getUTCFullYear() +
    "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

interface OcrTextBlock {
  DetectedText: string;
}

interface OcrResponse {
  Response: {
    TextDetections?: OcrTextBlock[];
    Error?: { Code: string; Message: string };
  };
}

/**
 * Call Tencent Cloud GeneralBasicOCR with a base64-encoded image.
 * Returns concatenated text from all detected blocks.
 */
export async function ocrImage(imageBase64: string): Promise<string> {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("TENCENT_SECRET_ID / TENCENT_SECRET_KEY not configured");
  }

  const action = "GeneralBasicOCR";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = getDate(timestamp);
  const payload = JSON.stringify({ ImageBase64: imageBase64 });

  // ── Step 1: Build canonical request ──
  const canonicalHeaders =
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join("\n");

  // ── Step 2: Build string to sign ──
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = [
    ALGORITHM,
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  // ── Step 3: Calculate signature ──
  const secretDate = hmacSha256(Buffer.from(`TC3${secretKey}`, "utf8"), date);
  const secretService = hmacSha256(secretDate, SERVICE);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  // ── Step 4: Build authorization header ──
  const authorization =
    `${ALGORITHM} Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // ── Make request ──
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: HOST,
        "X-TC-Action": action,
        "X-TC-Timestamp": String(timestamp),
        "X-TC-Version": VERSION,
        "X-TC-Region": REGION,
      },
      body: payload,
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await res.json()) as OcrResponse;

  if (data.Response.Error) {
    throw new Error(
      `Tencent OCR error: ${data.Response.Error.Code} — ${data.Response.Error.Message}`
    );
  }

  const blocks = data.Response.TextDetections ?? [];
  return blocks.map((b) => b.DetectedText).join("\n");
}
