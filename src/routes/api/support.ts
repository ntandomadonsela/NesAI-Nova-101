import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const categories = new Set(["complaint", "account", "billing", "content", "other"]);

function getSupportClient(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!token) return { response: new Response("Unauthorized", { status: 401 }) };
  if (!url || !key)
    return {
      response: Response.json({ error: "Support is temporarily unavailable." }, { status: 503 }),
    };
  return {
    client: createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export const Route = createFileRoute("/api/support")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const context = getSupportClient(request);
        if (context.response) return context.response;
        const { data: authData, error: authError } = await context.client.auth.getUser();
        if (authError || !authData.user) return new Response("Unauthorized", { status: 401 });
        const { data, error } = await context.client
          .from("student_support_requests")
          .select("id, category, subject, message, status, admin_note, created_at, updated_at")
          .eq("user_id", authData.user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) {
          console.error("Student support history failed", error);
          return Response.json(
            { error: "Your support history could not be loaded." },
            { status: 500 },
          );
        }
        return Response.json({ requests: data ?? [] });
      },
      POST: async ({ request }) => {
        const context = getSupportClient(request);
        if (context.response) return context.response;
        const { data: authData, error: authError } = await context.client.auth.getUser();
        if (authError || !authData.user) return new Response("Unauthorized", { status: 401 });
        let body: { category?: unknown; subject?: unknown; message?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json(
            { error: "Enter your support request and try again." },
            { status: 400 },
          );
        }
        const category = typeof body.category === "string" ? body.category : "";
        const subject = typeof body.subject === "string" ? body.subject.trim() : "";
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (
          !categories.has(category) ||
          subject.length < 3 ||
          subject.length > 160 ||
          message.length < 10 ||
          message.length > 5000
        ) {
          return Response.json(
            {
              error:
                "Choose a category, enter a subject (3–160 characters) and message (10–5,000 characters).",
            },
            { status: 400 },
          );
        }
        const { data, error } = await context.client
          .from("student_support_requests")
          .insert({
            user_id: authData.user.id,
            category: category as "complaint" | "account" | "billing" | "content" | "other",
            subject,
            message,
          })
          .select("id, category, subject, message, status, admin_note, created_at, updated_at")
          .single();
        if (error) {
          console.error("Student support request creation failed", error);
          return Response.json(
            { error: "Your request could not be sent. Please try again." },
            { status: 500 },
          );
        }
        return Response.json({ request: data }, { status: 201 });
      },
    },
  },
});
