import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-auth.server";

const CHUNK_SIZE = 1200; // characters, roughly a few paragraphs
const CHUNK_OVERLAP = 150;

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + CHUNK_SIZE));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function extractText(buffer: ArrayBuffer, fileUrl: string): Promise<string> {
  const lower = fileUrl.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(Buffer.from(buffer));
    return result.text;
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }
  // .txt, .md, or anything else — treat as plain text
  return Buffer.from(buffer).toString("utf-8");
}

export const Route = createFileRoute("/api/admin/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const access = await requireAdmin(request);
        if (access instanceof Response) return access;

        let body: { resourceId?: string };
        try {
          body = (await request.json()) as { resourceId?: string };
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const resourceId = body.resourceId;
        if (!resourceId)
          return Response.json({ error: "Document id is required." }, { status: 400 });

        const { data: resource, error: resourceError } = await access.supabaseAdmin
          .from("resources")
          .select("file_url")
          .eq("id", resourceId)
          .maybeSingle();
        if (resourceError || !resource) {
          console.error("Could not find resource to index", resourceError);
          return Response.json({ error: "Could not find this Vault document." }, { status: 404 });
        }
        const fileUrl = resource.file_url;

        let text: string;
        try {
          const fileRes = await fetch(fileUrl);
          if (!fileRes.ok) throw new Error(`Could not fetch file: ${fileRes.status}`);
          const buffer = await fileRes.arrayBuffer();
          text = await extractText(buffer, fileUrl);
        } catch (err) {
          console.error("Text extraction failed", err);
          return new Response("Could not extract text from file", { status: 422 });
        }

        const chunks = chunkText(text);
        if (chunks.length === 0) {
          return new Response(JSON.stringify({ ok: true, chunks: 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Replace any previous chunks for this resource (e.g. re-upload/reprocess).
        const { error: deleteError } = await access.supabaseAdmin
          .from("document_chunks")
          .delete()
          .eq("resource_id", resourceId);
        if (deleteError) {
          console.error("Could not replace existing document index", deleteError);
          return Response.json(
            { error: "Could not replace the existing AI index." },
            { status: 500 },
          );
        }
        const rows = chunks.map((content, chunk_index) => ({
          resource_id: resourceId,
          chunk_index,
          content,
        }));
        const { error: insertErr } = await access.supabaseAdmin
          .from("document_chunks")
          .insert(rows);
        if (insertErr) {
          console.error("document_chunks insert failed", insertErr);
          return new Response("Could not store extracted text", { status: 500 });
        }

        return new Response(JSON.stringify({ ok: true, chunks: chunks.length }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
