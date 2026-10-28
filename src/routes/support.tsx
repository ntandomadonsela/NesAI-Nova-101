import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { userFacingError } from "@/lib/user-facing-error";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Help and feedback | NesAI" },
      { name: "description", content: "Get help with your NesAI student account." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SupportPage,
});

type SupportRequest = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_note: string;
  created_at: string;
  updated_at: string;
};

const statusText: Record<SupportRequest["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

function SupportPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [category, setCategory] = useState("complaint");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function loadRequests(accessToken: string) {
    const response = await fetch("/api/support", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error ?? "Your support history could not be loaded.");
    setRequests(body.requests ?? []);
    setLoadError("");
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error || !data.session) {
          void navigate({ to: "/auth", search: { mode: "signin", redirect: "/support" } });
          return;
        }
        setToken(data.session.access_token);
        await loadRequests(data.session.access_token);
      } catch (requestError) {
        if (active)
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : userFacingError(requestError, "Your support history could not be loaded."),
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, subject, message }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error ?? "Your request could not be sent.");
      setSubject("");
      setMessage("");
      toast.success("Your request was sent to the NesAI support team.");
      await loadRequests(token);
    } catch (error) {
      toast.error(userFacingError(error, "Your request could not be sent. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />
      <main className="nesai-app-page mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="app-eyebrow inline-flex items-center gap-2">
          <LifeBuoy className="h-4 w-4" /> STUDENT SUPPORT
        </div>
        <h1 className="mt-2 font-serif text-4xl app-page-title">How can we help?</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Report a problem, raise a billing concern or send feedback. You can check the status of
          your requests here.
        </p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={submitRequest} className="paper-card grid gap-4 p-5 sm:p-6">
            <h2 className="font-serif text-2xl">Send a request</h2>
            <div className="grid gap-2">
              <Label htmlFor="support-category">What is this about?</Label>
              <select
                id="support-category"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="complaint">Complaint</option>
                <option value="account">Sign-in or account</option>
                <option value="billing">Subscription or billing</option>
                <option value="content">Paper or study content</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                minLength={3}
                maxLength={160}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="support-message">Tell us what happened</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                minLength={10}
                maxLength={5000}
                rows={6}
                required
              />
            </div>
            <Button type="submit" disabled={sending || !token}>
              <Send className="mr-2 h-4 w-4" /> {sending ? "Sending…" : "Send to support"}
            </Button>
          </form>

          <section className="paper-card p-5 sm:p-6" aria-labelledby="support-history-heading">
            <h2 id="support-history-heading" className="font-serif text-2xl">
              Your requests
            </h2>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading your requests…</p>
            ) : loadError ? (
              <div className="mt-4 text-sm text-destructive" role="alert">
                {loadError}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    void loadRequests(token).catch((error) =>
                      setLoadError(error instanceof Error ? error.message : loadError),
                    )
                  }
                >
                  Try again
                </button>
              </div>
            ) : requests.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You haven’t sent a support request yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {requests.map((item) => (
                  <article key={item.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{item.subject}</h3>
                      <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
                        {statusText[item.status] ?? item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {item.category.replaceAll("_", " ")} ·{" "}
                      {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(
                        new Date(item.created_at),
                      )}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.message}
                    </p>
                    {item.admin_note && (
                      <div className="mt-3 rounded-md bg-accent/60 p-3 text-sm">
                        <strong>Reply from NesAI</strong>
                        <p className="mt-1 whitespace-pre-wrap">{item.admin_note}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
