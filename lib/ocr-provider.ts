/**
 * OCR Provider Abstraction Layer
 *
 * Provides a unified `OcrProvider` interface so that lib/pdf-ocr.ts is no
 * longer hard-coupled to Tencent Cloud. The active provider is selected at
 * runtime via the `OCR_PROVIDER` environment variable, allowing international
 * deployments to use Google Vision, AWS Textract, or Azure Computer Vision
 * instead of the China-focused Tencent Cloud.
 *
 * Selection rules (first match wins):
 *
 *   OCR_PROVIDER=google  + GOOGLE_VISION_API_KEY (or GOOGLE_APPLICATION_CREDENTIALS)
 *     → Google Cloud Vision
 *   OCR_PROVIDER=aws     + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 *     → AWS Textract
 *   OCR_PROVIDER=azure   + AZURE_COMPUTER_VISION_KEY
 *     → Azure Computer Vision
 *   OCR_PROVIDER=tencent (or unset) + TENCENT_SECRET_ID + TENCENT_SECRET_KEY
 *     → Tencent Cloud OCR  (default — best for Chinese documents)
 *
 * If the requested provider's credentials are missing, the factory returns
 * `null` (OCR disabled) and logs a warning. Callers should treat `null` as
 * "OCR unavailable" and surface a clear error to the user.
 *
 * The resolved provider is cached for the lifetime of the process, so the
 * environment is only inspected once — repeated calls are a cheap cache read.
 */

import { logger } from "./logger";
import { TencentOcrProvider } from "./ocr-providers/tencent";
import { GoogleVisionOcrProvider } from "./ocr-providers/google-vision";
import { AwsTextractOcrProvider } from "./ocr-providers/aws-textract";
import { AzureComputerVisionOcrProvider } from "./ocr-providers/azure";

// ── Provider Interface ──

export interface OcrProvider {
  /** Human-readable provider name, e.g. "Tencent Cloud OCR". */
  readonly name: string;

  /**
   * Run OCR on a single base64-encoded image.
   *
   * @param imageBase64 base64-encoded image bytes (no `data:` URI prefix)
   * @returns the recognized text, concatenated across all detected blocks
   * @throws if the provider call fails or credentials are invalid
   */
  ocrImage(imageBase64: string): Promise<string>;
}

// ── Factory (cached singleton) ──

/**
 * Sentinel used so that a legitimately-resolved `null` (no provider
 * configured) is not re-evaluated on every call.
 */
const NOT_RESOLVED = Symbol("ocr-provider-not-resolved");

let cachedProvider: OcrProvider | null | typeof NOT_RESOLVED = NOT_RESOLVED;

/**
 * Resolve and return the configured OCR provider.
 *
 * @returns the active provider, or `null` when OCR is not configured.
 */
export function getOcrProvider(): OcrProvider | null {
  if (cachedProvider !== NOT_RESOLVED) {
    return cachedProvider;
  }

  cachedProvider = resolveProvider();
  return cachedProvider;
}

/**
 * Reset the cached provider. Primarily useful in tests when environment
 * variables change between cases.
 */
export function resetOcrProviderCache(): void {
  cachedProvider = NOT_RESOLVED;
}

// ── Resolution logic ──

function resolveProvider(): OcrProvider | null {
  const requested = (process.env.OCR_PROVIDER || "tencent")
    .toLowerCase()
    .trim();

  switch (requested) {
    case "google": {
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (apiKey || serviceAccount) {
        const provider = new GoogleVisionOcrProvider();
        logger.info("[ocr] Using Google Cloud Vision OCR provider");
        return provider;
      }
      logger.warn(
        "[ocr] OCR_PROVIDER=google but GOOGLE_VISION_API_KEY / GOOGLE_APPLICATION_CREDENTIALS is not set — OCR disabled"
      );
      return null;
    }

    case "aws": {
      const accessKey = process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      if (accessKey && secretKey) {
        const provider = new AwsTextractOcrProvider();
        logger.info("[ocr] Using AWS Textract OCR provider", {
          region: process.env.AWS_REGION || "us-east-1",
        });
        return provider;
      }
      logger.warn(
        "[ocr] OCR_PROVIDER=aws but AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY is not set — OCR disabled"
      );
      return null;
    }

    case "azure": {
      const key = process.env.AZURE_COMPUTER_VISION_KEY;
      if (key) {
        const provider = new AzureComputerVisionOcrProvider();
        logger.info("[ocr] Using Azure Computer Vision OCR provider");
        return provider;
      }
      logger.warn(
        "[ocr] OCR_PROVIDER=azure but AZURE_COMPUTER_VISION_KEY is not set — OCR disabled"
      );
      return null;
    }

    case "tencent":
    default: {
      const secretId = process.env.TENCENT_SECRET_ID;
      const secretKey = process.env.TENCENT_SECRET_KEY;
      if (secretId && secretKey) {
        const provider = new TencentOcrProvider();
        logger.info("[ocr] Using Tencent Cloud OCR provider (default)");
        return provider;
      }
      logger.warn(
        "[ocr] OCR_PROVIDER=tencent (default) but TENCENT_SECRET_ID / TENCENT_SECRET_KEY is not set — OCR disabled"
      );
      return null;
    }
  }
}

// Re-export the low-level Tencent function for backwards compatibility with
// any code that imported it directly from this module.
export { ocrImage } from "./ocr-providers/tencent";
