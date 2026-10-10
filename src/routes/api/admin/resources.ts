import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-auth.server";

const BUCKET = "resource-files";
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "md"]);

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function storagePathFromPublicUrl(fileUrl: string): string | null {
  try {
    const path = new URL(fileUrl).pathname;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = path.indexOf(marker);
    return index < 0 ? null : decodeURIComponent(path.slice(index + marker.length));
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/admin/resources")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const access = await requireAdmin(request);
        if (access instanceof Response) return access;
        const { supabaseAdmin } = access;

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        if (body.action === "create-upload") {
          const name = typeof body.name === "string" ? body.name.trim() : "";
          if (!name || !ALLOWED_EXTENSIONS.has(extension(name))) {
            return Response.json(
              { error: "Choose a PDF, DOC, DOCX, TXT or MD file." },
              { status: 400 },
            );
          }
          const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
          const path = `${crypto.randomUUID()}-${safeName}`;
          const { data, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUploadUrl(path);
          if (error) {
            console.error("Could not create admin storage upload URL", error);
            return Response.json(
              { error: "Could not prepare the document upload." },
              { status: 500 },
            );
          }
          return Response.json({ path: data.path, token: data.token });
        }

        if (body.action === "create-record") {
          const path = typeof body.path === "string" ? body.path : "";
          const title = typeof body.title === "string" ? body.title.trim() : "";
          const academicLevel = typeof body.academicLevel === "string" ? body.academicLevel : "";
          const curriculum = typeof body.curriculum === "string" ? body.curriculum.trim() : "";
          const subject = typeof body.subject === "string" ? body.subject.trim() : "";
          const documentType = typeof body.documentType === "string" ? body.documentType : "";
          const year = Number(body.year);
          const fileName = typeof body.fileName === "string" ? body.fileName : "";
          if (
            !path ||
            !title ||
            !academicLevel ||
            !curriculum ||
            !subject ||
            !["past_paper", "memo", "study_note", "summary"].includes(documentType) ||
            !Number.isInteger(year) ||
            year < 1900 ||
            year > 2200 ||
            !ALLOWED_EXTENSIONS.has(extension(fileName))
          ) {
            return Response.json(
              { error: "Complete all document details and try again." },
              { status: 400 },
            );
          }

          const fileUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          const { data: resource, error } = await supabaseAdmin
            .from("resources")
            .insert({
              title,
              file_url: fileUrl,
              academic_level: academicLevel,
              faculty_or_curriculum: curriculum,
              subject_or_module: subject,
              document_type: documentType,
              year,
            })
            .select(
              "id, title, document_type, academic_level, faculty_or_curriculum, subject_or_module, year, file_url, created_at",
            )
            .single();
          if (error) {
            console.error("Could not create admin resource", error);
            await supabaseAdmin.storage.from(BUCKET).remove([path]);
            return Response.json(
              { error: "The upload finished, but the Vault entry could not be saved." },
              { status: 500 },
            );
          }
          return Response.json({ resource });
        }

        return Response.json({ error: "Unknown admin resource action." }, { status: 400 });
      },
      DELETE: async ({ request }) => {
        const access = await requireAdmin(request);
        if (access instanceof Response) return access;
        const { supabaseAdmin } = access;
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return Response.json({ error: "Document id is required." }, { status: 400 });

        const { data: resource, error: lookupError } = await supabaseAdmin
          .from("resources")
          .select("id, file_url")
          .eq("id", id)
          .maybeSingle();
        if (lookupError) {
          console.error("Could not look up Vault document for deletion", lookupError);
          return Response.json({ error: "Could not load this document." }, { status: 500 });
        }
        if (!resource) return Response.json({ error: "Document not found." }, { status: 404 });

        const { error: deleteError } = await supabaseAdmin.from("resources").delete().eq("id", id);
        if (deleteError) {
          console.error("Could not delete Vault record", deleteError);
          return Response.json({ error: "Could not delete this Vault entry." }, { status: 500 });
        }

        const path = storagePathFromPublicUrl(resource.file_url);
        if (path) {
          const { error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
          if (storageError)
            console.error("Vault entry deleted but file cleanup failed", storageError);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
