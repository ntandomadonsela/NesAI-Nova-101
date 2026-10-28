import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";

/** Returns undefined while loading, then true/false once we know. */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user?.email || !user.email_confirmed_at || !isAdminEmail(user.email)) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const { data: role, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!cancelled) setIsAdmin(!error && Boolean(role));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }

    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void check(), 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
