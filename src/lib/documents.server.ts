import { createRequire } from "node:module";

const DOCUMENT_CHUNK_SIZE = 1200;
const DOCUMENT_CHUNK_OVERLAP = 150;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const require = createRequire(import.meta.url);

type PdfTextItem = { str?: string; transform?: number[] };
type PdfPage = {
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PdfTextItem[] }>;
};
type PdfDocument = {
  numPages: number;
  getPage(page: number): Promise<PdfPage>;
  destroy(): Promise<void>;
};
type PdfJs = {
  disableWorker: boolean;
  getDocument(data: Uint8Array): Promise<PdfDocument> | PdfDocument;
};

export function getDocumentExtension(fileUrl: string): string {
  try {
    return new URL(fileUrl).pathname.split(".").pop()?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

export function chunkDocumentText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  for (let index = 0; index < clean.length; index += DOCUMENT_CHUNK_SIZE - DOCUMENT_CHUNK_OVERLAP) {
    chunks.push(clean.slice(index, index + DOCUMENT_CHUNK_SIZE));
  }
  return chunks;
}

export function selectRelevantDocumentChunks(text: string, query: string, limit = 5): string[] {
  const chunks = chunkDocumentText(text);
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
  return chunks
    .map((content, index) => ({
      content,
      index,
      score: terms.reduce(
        (score, term) => score + (content.toLowerCase().includes(term) ? 1 : 0),
        0,
      ),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .sort((left, right) => left.index - right.index)
    .map((chunk) => chunk.content);
}

export async function readDocumentText(buffer: ArrayBuffer, fileUrl: string): Promise<string> {
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("This document is too large to index. The maximum file size is 25 MB.");
  }
  const extension = getDocumentExtension(fileUrl);
  if (extension === "pdf") {
    // pdf-parse loads this PDF.js bundle through a template require. Serverless
    // bundlers omit that dynamically required file, causing a missing-module
    // error in production. Resolve the bundled PDF.js file explicitly so the
    // deployment tracer includes it in the server function.
    const pdfjs = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js") as PdfJs;
    pdfjs.disableWorker = true;
    const document = await pdfjs.getDocument(new Uint8Array(buffer));
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        });
        let previousY: number | undefined;
        let pageText = "";
        for (const item of content.items) {
          const y = item.transform?.[5];
          pageText += previousY === undefined || previousY === y ? (item.str ?? "") : `\n${item.str ?? ""}`;
          previousY = y;
        }
        pages.push(pageText);
      }
      return pages.join("\n\n");
    } finally {
      await document.destroy();
    }
  }
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }
  if (extension === "txt" || extension === "md") return Buffer.from(buffer).toString("utf-8");
  throw new Error("Use a searchable PDF, DOCX, TXT or MD file.");
}

export async function fetchVaultDocumentText(
  fileUrl: string,
  supabaseUrl: string,
): Promise<string> {
  let documentUrl: URL;
  try {
    documentUrl = new URL(fileUrl);
  } catch {
    throw new Error("The Vault document has an invalid file URL.");
  }
  if (documentUrl.origin !== new URL(supabaseUrl).origin) {
    throw new Error("The Vault document is stored outside the configured resource bucket.");
  }
  if (!documentUrl.pathname.startsWith("/storage/v1/object/public/resource-files/")) {
    throw new Error("The Vault document is not in the public resource-files bucket.");
  }
  const response = await fetch(documentUrl, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Could not fetch the Vault document (${response.status}).`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_DOCUMENT_BYTES) {
    throw new Error("This document is too large to index. The maximum file size is 25 MB.");
  }
  const buffer = await response.arrayBuffer();
  return readDocumentText(buffer, fileUrl);
}
