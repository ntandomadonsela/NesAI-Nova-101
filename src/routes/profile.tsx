import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleUserRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Manage profile — NesAI" },
      {
        name: "description",
        content: "Manage your NesAI student account, study level and password.",
      },
    ],
  }),
  component: ProfilePage,
});

const LEVELS = ["Grade 10", "Grade 11", "Grade 12", "University"];

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("Grade 12");
  const [isPremium, setIsPremium] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError || !sessionData.session) {
        navigate({ to: "/auth", search: { mode: "signin", redirect: "/profile" } });
        return;
      }

      const user = sessionData.session.user;
      setUserId(user.id);
      setEmail(user.email ?? "");
      setNewEmail(user.email ?? "");
      setEmailConfirmed(Boolean(user.email_confirmed_at));

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, academic_level, is_premium")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("We couldn’t load your student profile. Refresh and try again.");
      } else if (profile) {
        setName(profile.full_name);
        setLevel(profile.academic_level ?? "Grade 12");
        setIsPremium(profile.is_premium);
      }
      setLoading(false);
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, full_name: name.trim(), academic_level: level },
          { onConflict: "id" },
        );
      if (error) throw error;
      toast.success("Your study profile has been updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = newEmail.trim().toLowerCase();
    if (!nextEmail || nextEmail === email.toLowerCase()) {
      toast.error("Enter a different email address to change it.");
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: nextEmail },
        { emailRedirectTo: new URL("/profile", window.location.origin).toString() },
      );
      if (error) throw error;
      toast.success("Check your inboxes to confirm the email change.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t update your email.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Choose a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords don’t match.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Your password has been changed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t change your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background nesai-app-surface">
        <SiteNav />
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
          Loading your profile…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />
      <main className="profile-page mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="profile-intro">
          <div className="app-eyebrow">YOUR NESAI ACCOUNT</div>
          <h1 className="app-page-title">Manage your profile</h1>
          <p>Keep your student details current and manage how you access NesAI.</p>
        </div>

        <div className="profile-grid">
          <section className="profile-card profile-summary">
            <div className="profile-card-heading">
              <span className="profile-icon">
                <CircleUserRound size={20} />
              </span>
              <div>
                <span className="app-eyebrow">ACCOUNT OVERVIEW</span>
                <h2>Your account</h2>
              </div>
            </div>
            <div className="profile-email-line">
              <Mail size={17} />
              <span>{email}</span>
            </div>
            <div
              className={
                emailConfirmed ? "profile-verify is-verified" : "profile-verify is-pending"
              }
            >
              {emailConfirmed ? <Check size={15} /> : <Mail size={15} />}
              {emailConfirmed ? "Email confirmed" : "Email confirmation is pending"}
            </div>
            <div className="profile-membership">
              <div>
                <span className="app-eyebrow">YOUR PLAN</span>
                <strong>{isPremium ? "NesAI Premium" : "Free account"}</strong>
              </div>
              <Link to="/upgrade" className="profile-manage-plan">
                {isPremium ? "Manage plan" : "Explore Premium"}
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-heading">
              <span className="profile-icon">
                <CircleUserRound size={20} />
              </span>
              <div>
                <span className="app-eyebrow">STUDENT DETAILS</span>
                <h2>Study profile</h2>
              </div>
            </div>
            <form className="profile-form" onSubmit={saveProfile}>
              <div>
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="profile-level">Academic level</Label>
                <select
                  id="profile-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                >
                  {LEVELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={savingProfile} className="profile-submit">
                {savingProfile ? "Saving…" : "Save study profile"}
              </Button>
            </form>
          </section>

          <section className="profile-card">
            <div className="profile-card-heading">
              <span className="profile-icon">
                <Mail size={20} />
              </span>
              <div>
                <span className="app-eyebrow">SIGN-IN ADDRESS</span>
                <h2>Change email</h2>
              </div>
            </div>
            <p className="profile-card-copy">
              We’ll send confirmation links before using the new address for sign-in.
            </p>
            <form className="profile-form" onSubmit={saveEmail}>
              <div>
                <Label htmlFor="profile-email">New email address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={savingEmail}
                className="profile-secondary"
              >
                {savingEmail ? "Sending confirmation…" : "Update email"}
              </Button>
            </form>
          </section>

          <section className="profile-card">
            <div className="profile-card-heading">
              <span className="profile-icon">
                <LockKeyhole size={20} />
              </span>
              <div>
                <span className="app-eyebrow">ACCOUNT SECURITY</span>
                <h2>Change password</h2>
              </div>
            </div>
            <p className="profile-card-copy">
              Enter your current password first to protect your account.
            </p>
            <form className="profile-form" onSubmit={savePassword}>
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" disabled={savingPassword} className="profile-submit">
                {savingPassword ? "Updating password…" : "Change password"}
              </Button>
            </form>
          </section>
        </div>

        <div className="profile-security-note">
          <ShieldCheck size={17} /> Your password is managed securely by Supabase and is never
          visible to NesAI.
        </div>
      </main>
    </div>
  );
}
