import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/admin-auth.server";

const statuses = new Set(["open", "in_progress", "resolved"]);

export const Route = createFileRoute("/api/admin/support")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const access = await requireAdmin(request);
        if (access instanceof Response) return access;
        let body: { id?: unknown; status?: unknown; adminNote?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const id = typeof body.id === "string" ? body.id : "";
        const status =
          typeof body.status === "string" && statuses.has(body.status)
            ? (body.status as "open" | "in_progress" | "resolved")
            : "";
        const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";
        if (!id || !status || !statuses.has(status) || adminNote.length > 5000) {
          return Response.json(
            { error: "Enter a valid request status and reply." },
            { status: 400 },
          );
        }
        const { data, error } = await access.supabaseAdmin
          .from("student_support_requests")
          .update({ status, admin_note: adminNote })
          .eq("id", id)
          .select("id, status, admin_note, updated_at")
          .maybeSingle();
        if (error) {
          console.error("Could not update student support request", error);
          return Response.json(
            { error: "This support request could not be updated." },
            { status: 500 },
          );
        }
        if (!data) return Response.json({ error: "Support request not found." }, { status: 404 });
        return Response.json({ request: data });
      },
    },
  },
});
