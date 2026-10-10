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
        if (!cancelled) setIsAdmin(isAdminEmail(user?.email) && Boolean(user?.email_confirmed_at));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }

    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
