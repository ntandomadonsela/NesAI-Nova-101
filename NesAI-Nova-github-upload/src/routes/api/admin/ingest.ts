import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL!;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        // Confirm admin role for this user (RLS lets a user read their own roles).
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return new Response("Forbidden", { status: 403 });

        const body = (await request.json()) as { resourceId?: string; fileUrl?: string };
        const resourceId = body.resourceId;
        const fileUrl = body.fileUrl;
        if (!resourceId || !fileUrl) return new Response("Bad request", { status: 400 });

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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Replace any previous chunks for this resource (e.g. re-upload/reprocess).
        await supabaseAdmin.from("document_chunks").delete().eq("resource_id", resourceId);
        const rows = chunks.map((content, chunk_index) => ({
          resource_id: resourceId,
          chunk_index,
          content,
        }));
        const { error: insertErr } = await supabaseAdmin.from("document_chunks").insert(rows);
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
