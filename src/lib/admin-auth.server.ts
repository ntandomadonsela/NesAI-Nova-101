import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";

export async function requireAdmin(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    return Response.json(
      { error: "Staff services are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return new Response("Unauthorized", { status: 401 });
  if (!data.user.email_confirmed_at || !isAdminEmail(data.user.email)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return Response.json(
      { error: "Staff services are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) {
      console.error("Admin role lookup failed", roleError);
      return Response.json(
        { error: "Staff access is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }
    if (!role) return new Response("Forbidden", { status: 403 });
    return { user: data.user, supabaseAdmin };
  } catch (error) {
    console.error("Admin service client is not configured", error);
    return Response.json(
      { error: "Staff services are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
