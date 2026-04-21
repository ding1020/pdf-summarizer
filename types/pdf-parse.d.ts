declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  interface PdfParse {
    (buffer: Buffer | ArrayBuffer): Promise<PDFData>;
  }

  const pdfParse: PdfParse;
  export = pdfParse;
}
