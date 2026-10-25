import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/account/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token)
          return Response.json({ error: "Sign in to delete your account." }, { status: 401 });
        let body: { confirmation?: string };
        try {
          body = (await request.json()) as { confirmation?: string };
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        if (body.confirmation !== "DELETE") {
          return Response.json({ error: "Confirm account deletion to continue." }, { status: 400 });
        }

        const supabaseUrl =
          process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.VITE_SUPABASE_ANON_KEY?.trim();
        if (!supabaseUrl || !publishableKey) {
          return Response.json(
            { error: "Account deletion is temporarily unavailable." },
            { status: 503 },
          );
        }
        const userClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error: authError,
        } = await userClient.auth.getUser();
        if (authError || !user)
          return Response.json(
            { error: "Your session has expired. Sign in again." },
            { status: 401 },
          );

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          if (error) throw error;
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Account deletion failed", error);
          return Response.json(
            { error: "We couldn’t delete your account. Please try again or contact support." },
            { status: 500 },
          );
        }
      },
    },
  },
});
