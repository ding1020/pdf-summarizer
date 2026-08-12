/**
 * PDF OCR fallback — renders PDF pages to PNG images, then OCRs each page.
 * Triggered when pdf-parse returns empty/short text (scanned PDFs).
 *
 * Uses pdfjs-dist for rendering + @napi-rs/canvas for canvas in Node.js.
 * Tencent Cloud GeneralBasicOCR for text recognition.
 */

import { createCanvas, type Canvas, type CanvasRenderingContext2D } from "@napi-rs/canvas";

// pdfjs-dist dynamic import — avoids bundler issues with legacy build
type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsLib: PdfjsModule | null = null;
async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLib;
}

/** Max pages to OCR — keeps serverless execution under timeout */
const MAX_OCR_PAGES = 5;

/** Minimum text length from pdf-parse to consider a PDF "text-based" */
const MIN_TEXT_LENGTH = 50;

/** Render scale — 1.5x gives ~108 DPI, sufficient for OCR */
const RENDER_SCALE = 1.5;

interface NodeCanvas {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
}

/**
 * Canvas factory for pdfjs-dist — bridges to @napi-rs/canvas.
 */
class NodeCanvasFactory {
  create(width: number, height: number): NodeCanvas {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(instance: NodeCanvas, width: number, height: number): void {
    instance.canvas.width = width;
    instance.canvas.height = height;
  }

  destroy(instance: NodeCanvas): void {
    instance.canvas.width = 0;
    instance.canvas.height = 0;
    // @ts-expect-error — release references
    instance.canvas = null;
    // @ts-expect-error — release references
    instance.context = null;
  }
}

export interface PdfOcrResult {
  text: string;
  pageCount: number;
  ocrPagesProcessed: number;
}

/**
 * Render a PDF to PNG images, one per page.
 * Returns array of PNG buffers.
 */
async function renderPdfToImages(
  buffer: Buffer,
  maxPages: number
): Promise<{ images: Buffer[]; totalPages: number }> {
  const pdfjs = await getPdfjs();

  const factory = new NodeCanvasFactory();

  // Cast to any — pdfjs-dist types target browser DOM (HTMLCanvasElement),
  // but we use @napi-rs/canvas in Node.js. Runtime API is identical.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    useSystemFonts: true,
    canvasFactory: factory,
  } as any);

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, maxPages);
  const images: Buffer[] = [];

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvasAndContext = factory.create(viewport.width, viewport.height);

    await page.render({
      canvas: canvasAndContext.canvas as any,
      canvasContext: canvasAndContext.context,
      viewport,
    } as any).promise;

    // Export to PNG buffer
    const pngBuffer = (canvasAndContext.canvas as any).toBuffer("image/png");
    images.push(pngBuffer);

    factory.destroy(canvasAndContext);
    page.cleanup();
  }

  await loadingTask.destroy();
  return { images, totalPages };
}

/**
 * OCR fallback for scanned PDFs.
 * Renders pages to images, sends each to the configured OCR provider, concatenates text.
 *
 * Uses the OCR provider abstraction layer (lib/ocr-provider.ts) to support
 * Tencent, Google Vision, AWS Textract, and Azure Computer Vision.
 */
export async function pdfOcrFallback(
  buffer: Buffer,
  maxPages: number = MAX_OCR_PAGES
): Promise<PdfOcrResult> {
  const { getOcrProvider } = await import("./ocr-provider");

  const provider = getOcrProvider();
  if (!provider) {
    throw new Error("OCR provider is not configured. Set OCR_PROVIDER and corresponding credentials.");
  }

  const { images, totalPages } = await renderPdfToImages(buffer, maxPages);

  const textParts: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const base64 = images[i].toString("base64");
    try {
      const pageText = await provider.ocrImage(base64);
      textParts.push(pageText);
    } catch (err) {
      // Log but continue — partial OCR is better than nothing
      console.error(`[OCR:${provider.name}] failed for page ${i + 1}:`, err instanceof Error ? err.message : err);
    }
  }

  return {
    text: textParts.join("\n\n--- Page Break ---\n\n"),
    pageCount: totalPages,
    ocrPagesProcessed: images.length,
  };
}

/**
 * Check if pdf-parse result is likely a scanned PDF (needs OCR).
 * Returns true if text is empty or very short relative to page count.
 */
export function needsOcr(text: string, pageCount?: number): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TEXT_LENGTH) return true;

  // If very few characters per page, likely scanned
  if (pageCount && pageCount > 0) {
    const charsPerPage = trimmed.length / pageCount;
    if (charsPerPage < MIN_TEXT_LENGTH) return true;
  }

  return false;
}
