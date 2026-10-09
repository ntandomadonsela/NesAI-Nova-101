import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CreditCard,
  Home,
  LogOut,
  Menu,
  MessageSquareText,
  UserRound,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    toast.success("You’re signed out.");
  }

  return (
    <header className="holdings-nav nesai-app-nav">
      <div className="shell nav-inner">
        <Link to="/" className="app-brand" aria-label="NesAI home">
          <img src="/nesai-symbol.png" alt="" />
          <span>
            Nes<span>AI</span>
          </span>
        </Link>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <Link to="/" onClick={() => setOpen(false)}>
            <Home size={16} /> Home
          </Link>
          <Link to="/chat" onClick={() => setOpen(false)}>
            <MessageSquareText size={16} /> Study desk
          </Link>
          <Link to="/vault" onClick={() => setOpen(false)}>
            <BookOpen size={16} /> Resource vault
          </Link>
          <Link to="/upgrade" onClick={() => setOpen(false)}>
            <CreditCard size={16} /> Premium
          </Link>
          {isAdmin && (
            <Link to="/admin/upload" onClick={() => setOpen(false)}>
              <ShieldCheck size={16} /> Staff upload
            </Link>
          )}
          {signedIn ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)}>
                <UserRound size={16} /> Manage profile
              </Link>
              <button className="nav-signout" type="button" onClick={signOut}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <Link
              className="nav-cta"
              to="/auth"
              search={{ mode: "signin" }}
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          )}
        </nav>
        <button
          className="menu-button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}
