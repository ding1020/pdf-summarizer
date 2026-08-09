/**
 * Google Cloud Vision OCR provider — direct REST API, no SDK.
 *
 * Uses the Cloud Vision API `images:annotate` endpoint with the TEXT_DETECTION
 * feature. Authentication is via a simple API key (GOOGLE_VISION_API_KEY),
 * which keeps the bundle small and avoids the heavier service-account OAuth
 * flow.
 *
 * Google Vision provides excellent multilingual accuracy and is the
 * recommended provider for international deployments.
 *
 * Docs: https://cloud.google.com/vision/docs/ocr
 */

import type { OcrProvider } from "../ocr-provider";

const ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

// ── Response types (only the fields we read) ──

interface VisionTextAnnotation {
  description?: string;
}

interface VisionResponse {
  textAnnotations?: VisionTextAnnotation[];
  fullTextAnnotation?: { text?: string };
  error?: { code?: number; message?: string };
}

interface VisionAnnotateResponse {
  responses?: VisionResponse[];
}

/**
 * Google Cloud Vision OCR provider.
 *
 * Requires the `GOOGLE_VISION_API_KEY` environment variable.
 */
export class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = "Google Cloud Vision";

  async ocrImage(imageBase64: string): Promise<string> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_VISION_API_KEY is not configured. " +
          "Create an API key in the Google Cloud Console → APIs & Services → Credentials."
      );
    }

    const body = JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          // TEXT_DETECTION returns both a full-text annotation (index 0) and
          // individual word/line annotations. We prefer fullTextAnnotation.text
          // which preserves reading order and line breaks.
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    });

    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
    });

    if (!res.ok) {
      const detail = await safeReadText(res);
      throw new Error(
        `Google Vision HTTP ${res.status}: ${detail || res.statusText}`
      );
    }

    const data = (await res.json()) as VisionAnnotateResponse;
    const response = data.responses?.[0];

    if (!response) {
      throw new Error("Google Vision returned an empty response");
    }

    if (response.error) {
      throw new Error(
        `Google Vision error: ${response.error.message || "unknown"} (code ${
          response.error.code ?? "?"
        })`
      );
    }

    // Prefer fullTextAnnotation.text — it preserves layout/line breaks.
    const fullText = response.fullTextAnnotation?.text;
    if (fullText && fullText.trim().length > 0) {
      return fullText;
    }

    // Fallback: the first textAnnotation holds the entire detected text.
    const annotations = response.textAnnotations ?? [];
    if (annotations.length > 0 && annotations[0].description) {
      return annotations[0].description;
    }

    // Last resort: concatenate all individual annotations.
    return annotations
      .map((a) => a.description)
      .filter(Boolean)
      .join("\n");
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
