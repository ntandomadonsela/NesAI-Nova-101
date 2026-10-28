import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "resource-files";

function fetchWithSupabaseKey(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (
      (supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_")) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function safeFileName(value: string) {
  const name = value
    .split("/")
    .pop()
    ?.replace(/[\r\n"\\]/g, "_")
    .trim();
  return name || "nesai-resource.pdf";
}

function storagePathFromPublicUrl(fileUrl: string, supabaseUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    if (url.origin !== new URL(supabaseUrl).origin) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    if (!url.pathname.startsWith(marker)) return null;
    const path = decodeURIComponent(url.pathname.slice(marker.length));
    if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === ".."))
      return null;
    return path;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/resources/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
        const key =
          process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.VITE_SUPABASE_ANON_KEY?.trim();
        if (!url || !key)
          return Response.json(
            { error: "Downloads are temporarily unavailable." },
            { status: 503 },
          );

        const resourceId = new URL(request.url).searchParams.get("id")?.trim();
        if (!resourceId)
          return Response.json({ error: "Choose a Vault document to download." }, { status: 400 });

        const supabase = createClient(url, key, {
          global: { fetch: fetchWithSupabaseKey(key) },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: resource, error: resourceError } = await supabase
          .from("resources")
          .select("title, file_url")
          .eq("id", resourceId)
          .maybeSingle();
        if (resourceError) {
          console.error("Vault download lookup failed", resourceError);
          return Response.json({ error: "This paper could not be downloaded." }, { status: 500 });
        }
        if (!resource)
          return Response.json({ error: "This paper is no longer in the Vault." }, { status: 404 });

        const path = storagePathFromPublicUrl(resource.file_url, url);
        if (!path)
          return Response.json(
            { error: "This paper has an invalid storage location." },
            { status: 500 },
          );

        const { data: file, error: fileError } = await supabase.storage.from(BUCKET).download(path);
        if (fileError || !file) {
          console.error("Vault paper download failed", fileError);
          return Response.json(
            { error: "This paper could not be downloaded. Please try again." },
            { status: 502 },
          );
        }

        const filename = safeFileName(path);
        const displayName = safeFileName(
          `${resource.title}${filename.match(/\.[^.]+$/)?.[0] ?? ".pdf"}`,
        );
        return new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${displayName.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(displayName)}`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
