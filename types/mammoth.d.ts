declare module "mammoth" {
  export interface ConvertResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function convertToHtml(
    input: Buffer | ArrayBuffer | { arrayBuffer: () => Promise<ArrayBuffer> } | { buffer: Buffer },
    options?: Record<string, unknown>,
  ): Promise<ConvertResult>;

  export function extractRawText(
    input: Buffer | ArrayBuffer | { arrayBuffer: () => Promise<ArrayBuffer> } | { buffer: Buffer },
    options?: Record<string, unknown>,
  ): Promise<ConvertResult>;
}