import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NesAI" },
      { name: "description", content: "Sign in or create your free NesAI account." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode: requestedMode, redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(
    requestedMode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [academicLevel, setAcademicLevel] = useState("Grade 12");
  const [loading, setLoading] = useState(false);
  const [signupNotice, setSignupNotice] = useState("");
  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (redirect as any) ?? "/chat" });
    });
  }, [navigate, redirect, supabaseConfigured]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignupNotice("");
    if (!supabaseConfigured) {
      toast.error("Account access is not configured yet. Please try again later.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL("/auth?redirect=%2Fchat", window.location.origin).toString(),
            data: { full_name: fullName, academic_level: academicLevel },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSignupNotice(
            `Check ${email} for a confirmation link. It will return you to your study desk after you confirm.`,
          );
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success("Account created. You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      navigate({ to: (redirect as any) ?? "/chat" });
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 auth-brand">
            <img src="/nesai-symbol.png" alt="" className="h-10 w-10 object-contain" />
            <span className="font-serif text-xl font-semibold">NesAI</span>
          </Link>

          <div className="paper-card p-8 auth-card">
            <h1 className="font-serif text-3xl auth-title">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground auth-description">
              {mode === "signup"
                ? "Free forever. Upgrade to Premium anytime."
                : "Sign in to continue studying."}
            </p>

            {!supabaseConfigured && (
              <div className="auth-config-notice" role="status">
                Account sign-up is temporarily unavailable. The site owner needs to add the Supabase
                URL and publishable key in the deployment settings.
              </div>
            )}

            {signupNotice && (
              <div className="auth-confirmation" role="status">
                {signupNotice}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="level">Academic level</Label>
                    <select
                      id="level"
                      value={academicLevel}
                      onChange={(e) => setAcademicLevel(e.target.value)}
                      className="mt-1.5 flex h-12 w-full rounded-md border border-input bg-background px-3 text-base"
                    >
                      <option>Grade 10</option>
                      <option>Grade 11</option>
                      <option>Grade 12</option>
                      <option>University</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1.5"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !supabaseConfigured}
                className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
              >
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
              <button
                className="font-medium text-foreground underline underline-offset-4"
                type="button"
                onClick={() => {
                  setSignupNotice("");
                  setMode(mode === "signup" ? "signin" : "signup");
                }}
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
