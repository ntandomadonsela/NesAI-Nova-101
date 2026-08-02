import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export function SiteNav() {
  const [signedIn, setSignedIn] = useState(false);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-ivory/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-nowrap items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold tracking-tight">NesAI Nova</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Study, refined.
            </div>
          </div>
        </Link>

        <nav className="hidden shrink-0 items-center gap-8 md:flex">
          <Link
            to="/vault"
            className="whitespace-nowrap text-sm text-foreground/70 transition hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            The Vault
          </Link>
          <Link
            to="/chat"
            className="whitespace-nowrap text-sm text-foreground/70 transition hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            AI Study Desk
          </Link>
          <Link
            to="/upgrade"
            className="whitespace-nowrap text-sm text-foreground/70 transition hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Upgrade
          </Link>
          {isAdmin && (
            <Link
              to="/admin/upload"
              className="whitespace-nowrap text-sm text-foreground/70 transition hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Staff Upload
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/chat">Study Desk</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
              >
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
