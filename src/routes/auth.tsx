import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from "lucide-react";

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
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
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
          setPendingSignupEmail(email);
          setSignupNotice(
            `We requested a confirmation email for ${email}. Check your inbox and junk folder. Confirm your address before signing in.`,
          );
          toast.success("Your confirmation email was requested.");
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
      const message = err?.message ?? "Something went wrong";
      toast.error(
        message === "Failed to fetch"
          ? "We couldn’t reach your account service. Please try again in a moment."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!pendingSignupEmail || resendingConfirmation) return;
    setResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingSignupEmail,
        options: {
          emailRedirectTo: new URL("/auth?redirect=%2Fchat", window.location.origin).toString(),
        },
      });
      if (error) throw error;
      toast.success("We requested another confirmation email. Check your junk folder too.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "We couldn’t resend the confirmation email.",
      );
    } finally {
      setResendingConfirmation(false);
    }
  }

  return (
    <main className="nesai-auth-page">
      <div className="auth-topbar">
        <Link to="/" className="auth-brand" aria-label="NesAI home">
          <img src="/nesai-symbol.png" alt="" />
          <span>
            Nes<span>AI</span>
            <small>INTELLIGENCE, DEPLOYED AT SCALE</small>
          </span>
        </Link>
        <Link to="/" className="auth-back">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="auth-story-kicker">
            <Sparkles size={15} /> YOUR STUDY SPACE, REIMAGINED
          </div>
          <h2>
            Make room for
            <br />
            <span>the “aha” moment.</span>
          </h2>
          <p>
            One thoughtful place to ask better questions, understand the steps, and feel ready for
            what comes next.
          </p>
          <div className="auth-story-note">
            <BookOpen size={18} />
            <span>Personal support for every subject, at your pace.</span>
          </div>
          <div className="auth-story-glow" />
        </section>

        <section className="auth-form-column">
          <div className="paper-card auth-card">
            <div className="auth-form-kicker">
              {mode === "signup" ? "START LEARNING" : "WELCOME BACK"}
            </div>
            <h1 className="auth-title">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="auth-description">
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
              <div className="auth-confirmation auth-resend-box" role="status">
                <p>{signupNotice}</p>
                <button
                  type="button"
                  onClick={() => void resendConfirmation()}
                  disabled={resendingConfirmation}
                >
                  {resendingConfirmation ? "Requesting email…" : "Resend confirmation email"}
                </button>
              </div>
            )}

            <form onSubmit={onSubmit} className="auth-form">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="level">Academic level</Label>
                    <select
                      id="level"
                      value={academicLevel}
                      onChange={(e) => setAcademicLevel(e.target.value)}
                      className="w-full"
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
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !supabaseConfigured}
                className="auth-submit"
              >
                {loading ? (
                  "Please wait…"
                ) : (
                  <>
                    {mode === "signup" ? "Create account" : "Sign in"}
                    <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </form>

            <div className="auth-switch">
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

          <div className="auth-footnote">Secure account access · Free to get started</div>
        </section>
      </div>
    </main>
  );
}
