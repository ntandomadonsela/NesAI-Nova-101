import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-auth.server";
import { chunkDocumentText, fetchVaultDocumentText } from "@/lib/documents.server";

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

        const supabaseUrl =
          process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
        if (!supabaseUrl)
          return Response.json({ error: "Document storage is not configured." }, { status: 503 });

        let text: string;
        try {
          text = await fetchVaultDocumentText(fileUrl, supabaseUrl);
        } catch (err) {
          console.error("Text extraction failed", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Could not extract text from file." },
            { status: 422 },
          );
        }

        const chunks = chunkDocumentText(text);
        if (chunks.length === 0) {
          return Response.json(
            { error: "No searchable text was found. Use a searchable PDF, DOCX, TXT or MD file." },
            { status: 422 },
          );
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
