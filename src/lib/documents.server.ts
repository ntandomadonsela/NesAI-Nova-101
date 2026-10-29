import pdfjs from "pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js";

const DOCUMENT_CHUNK_SIZE = 1200;
const DOCUMENT_CHUNK_OVERLAP = 150;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

type PdfTextItem = { str?: string; transform?: number[]; width?: number; hasEOL?: boolean };
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
  const questionReference = query.match(/\b\d+(?:\.\d+){1,}\b/)?.[0];
  if (questionReference) {
    const referencePattern = new RegExp(
      questionReference.split(".").join("\\s*\\.\\s*"),
    );
    const referenceIndex = chunks.findIndex((chunk) => referencePattern.test(chunk));
    if (referenceIndex >= 0) {
      const start = Math.max(0, referenceIndex - 1);
      return chunks.slice(start, start + limit);
    }
  }
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
    // Import PDF.js directly. pdf-parse's dynamic template require is omitted
    // from serverless bundles, while this static dependency is included by Vite.
    const pdfLibrary = pdfjs as PdfJs;
    pdfLibrary.disableWorker = true;
    const document = await pdfLibrary.getDocument(new Uint8Array(buffer));
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        });
        let previousY: number | undefined;
        let previousX: number | undefined;
        let previousWidth = 0;
        let previousFontSize = 0;
        let forceNewLine = false;
        let pageText = "";
        for (const item of content.items) {
          const y = item.transform?.[5];
          const x = item.transform?.[4];
          const fontSize = Math.abs(item.transform?.[3] ?? item.transform?.[0] ?? 0);
          const sameLine =
            previousY !== undefined && y !== undefined && Math.abs(previousY - y) < 1.5;
          const previousTextEndsWithSpace = /\s$/.test(pageText);
          const currentTextStartsWithSpace = /^\s/.test(item.str ?? "");
          const hasPositionedGap =
            x !== undefined &&
            previousX !== undefined &&
            x - (previousX + previousWidth) > Math.max(1, previousFontSize * 0.12);
          if (previousY !== undefined) {
            if (forceNewLine || !sameLine) pageText += "\n";
            else if (
              pageText &&
              !previousTextEndsWithSpace &&
              !currentTextStartsWithSpace &&
              (hasPositionedGap || x === undefined || previousX === undefined)
            ) {
              pageText += " ";
            }
          }
          pageText += item.str ?? "";
          previousY = y;
          previousX = x;
          previousWidth = item.width ?? 0;
          previousFontSize = fontSize;
          forceNewLine = item.hasEOL ?? false;
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
