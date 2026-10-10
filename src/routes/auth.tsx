import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import {
  DEGREE_SUGGESTIONS,
  LEVELS,
  SCHOOL_SUBJECTS,
  UNIVERSITY_SUBJECTS,
} from "@/lib/study-catalog";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot", "recovery"]).optional(),
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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "recovery">(
    requestedMode ?? "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [academicLevel, setAcademicLevel] = useState("Grade 12");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [otherSubject, setOtherSubject] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [institution, setInstitution] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupNotice, setSignupNotice] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );

  useEffect(() => {
    if (requestedMode) setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (requestedMode === "recovery") setMode("recovery");
  }, [requestedMode]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && requestedMode !== "recovery")
        navigate({ to: (redirect as any) ?? "/chat" });
    });
  }, [navigate, redirect, supabaseConfigured, requestedMode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignupNotice("");
    if (!supabaseConfigured) {
      toast.error("Account access is not configured yet. Please try again later.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: new URL("/auth?mode=recovery", window.location.origin).toString(),
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("If an account exists for that email, a reset link is on its way.");
        return;
      }
      if (mode === "recovery") {
        if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated. You can now continue to your study desk.");
        navigate({ to: (redirect as any) ?? "/chat" });
        return;
      }
      if (mode === "signup") {
        if (subjects.length === 0) throw new Error("Choose at least one subject or module.");
        if (academicLevel === "University" && !degreeName.trim())
          throw new Error("Enter the degree or qualification you are studying.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL("/auth?redirect=%2Fchat", window.location.origin).toString(),
            data: {
              full_name: fullName,
              academic_level: academicLevel,
              subjects,
              degree_name: degreeName.trim(),
              institution: institution.trim(),
              study_year: studyYear.trim(),
            },
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
              {mode === "signup"
                ? "START LEARNING"
                : mode === "forgot"
                  ? "ACCOUNT RECOVERY"
                  : mode === "recovery"
                    ? "CHOOSE A NEW PASSWORD"
                    : "WELCOME BACK"}
            </div>
            <h1 className="auth-title">
              {mode === "signup"
                ? "Create your account"
                : mode === "forgot"
                  ? "Reset your password"
                  : mode === "recovery"
                    ? "Set a new password"
                    : "Welcome back"}
            </h1>
            <p className="auth-description">
              {mode === "signup"
                ? "Free forever. Upgrade to Premium anytime."
                : mode === "forgot"
                  ? "We’ll email you a secure link to choose a new password."
                  : mode === "recovery"
                    ? "Use a strong password you haven’t used before."
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

            {resetSent && mode === "forgot" && (
              <div className="auth-confirmation" role="status">
                Check your inbox and spam folder for a secure password reset link.
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
                      onChange={(e) => {
                        setAcademicLevel(e.target.value);
                        setSubjects([]);
                      }}
                      className="w-full"
                    >
                      {LEVELS.map((level) => (
                        <option key={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  {academicLevel === "University" && (
                    <>
                      <div>
                        <Label htmlFor="degree">Degree or qualification</Label>
                        <input
                          id="degree"
                          list="degree-options"
                          value={degreeName}
                          onChange={(e) => setDegreeName(e.target.value)}
                          placeholder="e.g. BSc Computer Science"
                          required
                        />
                        <datalist id="degree-options">
                          {DEGREE_SUGGESTIONS.map((degree) => (
                            <option key={degree} value={degree} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <Label htmlFor="institution">University or institution (optional)</Label>
                        <Input
                          id="institution"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                          placeholder="e.g. University of Cape Town"
                        />
                      </div>
                      <div>
                        <Label htmlFor="study-year">Year of study (optional)</Label>
                        <Input
                          id="study-year"
                          value={studyYear}
                          onChange={(e) => setStudyYear(e.target.value)}
                          placeholder="e.g. Year 2"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="subjects">
                      {academicLevel === "University"
                        ? "Your degree modules / subjects"
                        : "Your subjects"}
                    </Label>
                    <div
                      id="subjects"
                      className="max-h-48 overflow-y-auto rounded-md border border-input bg-background p-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                      {[
                        ...(academicLevel === "University" ? UNIVERSITY_SUBJECTS : SCHOOL_SUBJECTS),
                        ...subjects.filter(
                          (subject) =>
                            !(
                              academicLevel === "University" ? UNIVERSITY_SUBJECTS : SCHOOL_SUBJECTS
                            ).includes(subject),
                        ),
                      ].map((subject) => (
                        <label key={subject} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={subjects.includes(subject)}
                            onChange={(e) =>
                              setSubjects((old) =>
                                e.target.checked
                                  ? [...old, subject]
                                  : old.filter((item) => item !== subject),
                              )
                            }
                          />
                          {subject}
                        </label>
                      ))}
                    </div>
                    <Input
                      className="mt-2"
                      aria-label="Add a subject or module not listed"
                      value={otherSubject}
                      placeholder={
                        academicLevel === "University"
                          ? "Add a module not listed, then press Enter"
                          : "Add another approved subject, then press Enter"
                      }
                      onChange={(e) => setOtherSubject(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const value = otherSubject.trim();
                          if (value && !subjects.includes(value))
                            setSubjects((old) => [...old, value]);
                          setOtherSubject("");
                        }
                      }}
                    />
                  </div>
                </>
              )}

              {mode !== "recovery" && (
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
              )}
              {mode !== "forgot" && (
                <div>
                  <Label htmlFor="password">
                    {mode === "recovery" ? "New password" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "recovery" ? 8 : 6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !supabaseConfigured}
                className="auth-submit"
              >
                {loading ? (
                  "Please wait…"
                ) : (
                  <>
                    {mode === "signup"
                      ? "Create account"
                      : mode === "forgot"
                        ? "Send reset link"
                        : mode === "recovery"
                          ? "Update password"
                          : "Sign in"}
                    <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </form>

            {mode === "signin" && (
              <button
                type="button"
                className="auth-forgot"
                onClick={() => {
                  setResetSent(false);
                  setMode("forgot");
                }}
              >
                Forgot password?
              </button>
            )}

            <div className="auth-switch">
              {mode === "forgot" || mode === "recovery"
                ? "Remembered it?"
                : mode === "signup"
                  ? "Already have an account?"
                  : "New here?"}{" "}
              <button
                className="font-medium text-foreground underline underline-offset-4"
                type="button"
                onClick={() => {
                  setSignupNotice("");
                  setMode(
                    mode === "signup" || mode === "forgot" || mode === "recovery"
                      ? "signin"
                      : "signup",
                  );
                }}
              >
                {mode === "signup" || mode === "forgot" || mode === "recovery"
                  ? "Sign in"
                  : "Create one"}
              </button>
            </div>
          </div>

          <div className="auth-footnote">Secure account access · Free to get started</div>
        </section>
      </div>
    </main>
  );
}
