/**
 * Tencent Cloud OCR provider — adapter over the existing lib/tencent-ocr.ts.
 *
 * Tencent Cloud GeneralBasicOCR (通用印刷体识别) is the default provider.
 * It offers best-in-class accuracy for Chinese-language scanned documents and
 * is the recommended choice for China-focused deployments.
 *
 * This is a thin wrapper: the heavy lifting (TC3-HMAC-SHA256 signing, HTTP
 * call, response parsing) lives in lib/tencent-ocr.ts. We simply re-export it
 * behind the OcrProvider interface so pdf-ocr.ts can treat all providers
 * uniformly.
 */

import type { OcrProvider } from "../ocr-provider";
import { ocrImage } from "../tencent-ocr";

// Re-export the low-level function for backwards compatibility / direct use.
export { ocrImage };

export class TencentOcrProvider implements OcrProvider {
  readonly name = "Tencent Cloud OCR";

  async ocrImage(imageBase64: string): Promise<string> {
    return ocrImage(imageBase64);
  }
}
