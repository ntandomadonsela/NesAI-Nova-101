declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }
  function pdfParse(data: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}

declare module "pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js" {
  const pdfjs: {
    disableWorker: boolean;
    getDocument(data: Uint8Array): {
      numPages: number;
      getPage(page: number): Promise<{
        getTextContent(options: {
          normalizeWhitespace: boolean;
          disableCombineTextItems: boolean;
        }): Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
      }>;
      destroy(): Promise<void>;
    };
  };
  export default pdfjs;
}
