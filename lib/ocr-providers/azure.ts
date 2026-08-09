/**
 * Azure Computer Vision OCR provider — direct REST API, no SDK.
 *
 * Uses the OCR (v3.2) synchronous endpoint which accepts raw image bytes and
 * returns recognized text organized into regions → lines → words.
 *
 * Authentication is via a subscription key (AZURE_COMPUTER_VISION_KEY).
 * Because Azure endpoints are region-specific, the full endpoint URL must be
 * supplied via AZURE_COMPUTER_VISION_ENDPOINT (e.g.
 * "https://myresource.cognitiveservices.azure.com").
 *
 * Azure is a solid choice for international deployments, particularly those
 * already using Azure infrastructure.
 *
 * Docs: https://learn.microsoft.com/azure/cognitive-services/computer-vision/concept-recognizing-text
 */

import type { OcrProvider } from "../ocr-provider";

// ── Response types ──

interface AzureWord {
  text?: string;
}

interface AzureLine {
  words?: AzureWord[];
}

interface AzureRegion {
  lines?: AzureLine[];
}

interface AzureOcrResponse {
  regions?: AzureRegion[];
  // Error responses carry a top-level "error" object.
  error?: { code?: string; message?: string };
}

/**
 * Azure Computer Vision OCR provider.
 *
 * Requires:
 *   AZURE_COMPUTER_VISION_KEY
 *   AZURE_COMPUTER_VISION_ENDPOINT  (e.g. https://myresource.cognitiveservices.azure.com)
 */
export class AzureComputerVisionOcrProvider implements OcrProvider {
  readonly name = "Azure Computer Vision";

  async ocrImage(imageBase64: string): Promise<string> {
    const key = process.env.AZURE_COMPUTER_VISION_KEY;
    const endpoint = (process.env.AZURE_COMPUTER_VISION_ENDPOINT || "").replace(
      /\/+$/,
      ""
    );

    if (!key) {
      throw new Error(
        "AZURE_COMPUTER_VISION_KEY is not configured. " +
          "Create a Computer Vision resource in the Azure Portal and copy a key."
      );
    }
    if (!endpoint) {
      throw new Error(
        "AZURE_COMPUTER_VISION_ENDPOINT is not configured. " +
          "Set it to your resource endpoint, e.g. https://myresource.cognitiveservices.azure.com"
      );
    }

    // Convert base64 back to raw bytes — the v3.2 OCR API takes an
    // application/octet-stream body, not a JSON/base64 payload.
    const imageBytes = Buffer.from(imageBase64, "base64");

    const url =
      `${endpoint}/vision/v3.2/ocr` +
      `?language=unk&detectOrientation=true`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream",
      },
      body: imageBytes,
    });

    const data = (await res.json()) as AzureOcrResponse;

    if (!res.ok) {
      const message = data.error?.message || res.statusText;
      throw new Error(
        `Azure Computer Vision HTTP ${res.status}${data.error?.code ? ` (${data.error.code})` : ""}: ${message}`
      );
    }

    // Reconstruct text: regions → lines → words.
    const regions = data.regions ?? [];
    const lines: string[] = [];

    for (const region of regions) {
      for (const line of region.lines ?? []) {
        const lineText = (line.words ?? [])
          .map((w) => w.text)
          .filter(Boolean)
          .join(" ");
        if (lineText) lines.push(lineText);
      }
    }

    return lines.join("\n");
  }
}
