import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";

export const Route = createFileRoute("/admin/upload")({
  head: () => ({
    meta: [
      { title: "NesAI Administration" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LegacyAdminUploadRedirect,
});

function LegacyAdminUploadRedirect() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (isAdmin === true) void navigate({ to: "/admin" });
    if (isAdmin === false) void navigate({ to: "/" });
  }, [isAdmin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening admin console…
    </div>
  );
}
