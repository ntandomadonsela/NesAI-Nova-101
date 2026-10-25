import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { userFacingError } from "@/lib/user-facing-error";
import { apiUrl } from "@/lib/api-url";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "NesAI Administration" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminDashboard,
});

type Signup = {
  id: string;
  email: string;
  fullName: string;
  academicLevel: string;
  isPremium: boolean;
  createdAt: string;
  emailConfirmedAt: string | null;
};

type Subscriber = {
  id: string;
  email: string;
  fullName: string;
  provider: string;
  status: string;
  currentPeriodEnd: string | null;
  since: string;
};

type Resource = {
  id: string;
  title: string;
  document_type: string;
  academic_level: string;
  faculty_or_curriculum: string;
  subject_or_module: string;
  year: number;
  file_url: string;
  created_at: string;
};

type ConsoleData = {
  summary: { signups: number; subscribers: number; documents: number };
  signups: Signup[];
  subscribers: Subscriber[];
  resources: Resource[];
};

type AdminSection = "overview" | "signups" | "subscribers" | "vault";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Sign in again to open the admin console.");

  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error ?? `Admin request failed (${response.status}).`);
  return body as T;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(parsed);
}

function AdminDashboard() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<AdminSection>("overview");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("Grade 12");
  const [curriculum, setCurriculum] = useState("CAPS");
  const [subject, setSubject] = useState("");
  const [documentType, setDocumentType] = useState("past_paper");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [file, setFile] = useState<File | null>(null);
  const [groundAi, setGroundAi] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAdmin === false) void navigate({ to: "/" });
  }, [isAdmin, navigate]);

  const consoleQuery = useQuery({
    queryKey: ["admin-console"],
    queryFn: () => adminFetch<ConsoleData>("/api/admin/console"),
    enabled: isAdmin === true,
    retry: false,
  });
  const data = consoleQuery.data;

  const filteredSignups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.signups ?? []).filter(
      (user) =>
        !query ||
        user.email.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query),
    );
  }, [data?.signups, search]);
  const filteredSubscribers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.subscribers ?? []).filter(
      (user) =>
        !query ||
        user.email.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query),
    );
  }, [data?.subscribers, search]);
  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.resources ?? []).filter(
      (resource) =>
        !query ||
        [resource.title, resource.subject_or_module, resource.faculty_or_curriculum]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [data?.resources, search]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !title.trim() || !curriculum.trim() || !subject.trim()) {
      toast.error("Add the document details and choose a file first.");
      return;
    }

    setBusy(true);
    try {
      const signed = await adminFetch<{ path: string; token: string }>("/api/admin/resources", {
        method: "POST",
        body: JSON.stringify({ action: "create-upload", name: file.name }),
      });
      const { error: uploadError } = await supabase.storage
        .from("resource-files")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) throw uploadError;

      const created = await adminFetch<{ resource: Resource }>("/api/admin/resources", {
        method: "POST",
        body: JSON.stringify({
          action: "create-record",
          path: signed.path,
          fileName: file.name,
          title: title.trim(),
          academicLevel: level,
          curriculum: curriculum.trim(),
          subject: subject.trim(),
          documentType,
          year,
        }),
      });

      if (groundAi) {
        const { data: session } = await supabase.auth.getSession();
        const ingestResponse = await fetch(apiUrl("/api/admin/ingest"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ resourceId: created.resource.id }),
        });
        if (!ingestResponse.ok) {
          const body = await ingestResponse.json().catch(() => ({}));
          toast.warning(
            "The document was uploaded, but AI indexing did not finish. Please try again later.",
          );
        } else {
          toast.success("Document uploaded and indexed for the AI tutor.");
        }
      } else {
        toast.success("Document uploaded to The Vault.");
      }

      setTitle("");
      setSubject("");
      setFile(null);
      const fileInput = document.getElementById("admin-document-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await queryClient.invalidateQueries({ queryKey: ["admin-console"] });
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
    } catch (error) {
      console.error("Admin upload failed", error);
      toast.error(
        userFacingError(
          error,
          "The upload couldn’t be completed. Please check the file and try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteDocument(resource: Resource) {
    if (
      !window.confirm(`Delete “${resource.title}” from The Vault? This also removes its AI index.`)
    )
      return;
    setBusy(true);
    try {
      await adminFetch<{ ok: true }>(`/api/admin/resources?id=${encodeURIComponent(resource.id)}`, {
        method: "DELETE",
      });
      toast.success("Document deleted from The Vault.");
      await queryClient.invalidateQueries({ queryKey: ["admin-console"] });
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
    } catch (error) {
      toast.error(userFacingError(error, "The document couldn’t be deleted. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const sectionTabs: { id: AdminSection; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "signups", label: "Sign-ups" },
    { id: "subscribers", label: "Subscribers" },
    { id: "vault", label: "Vault management" },
  ];

  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />
      <main className="nesai-app-page mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="app-eyebrow inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Private admin console
            </div>
            <h1 className="mt-2 font-serif text-4xl app-page-title sm:text-5xl">NesAI dashboard</h1>
            <p className="mt-3 text-muted-foreground">
              Signed in as <strong className="text-foreground">ntando@nesmaholdings.co.za</strong>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void consoleQuery.refetch()}
            disabled={consoleQuery.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${consoleQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh data
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-3">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSection(tab.id);
                setSearch("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                section === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {consoleQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading secure admin data…
          </div>
        ) : consoleQuery.isError ? (
          <div className="paper-card mt-8 p-8">
            <h2 className="font-serif text-2xl">Admin data could not load</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn’t load the admin data. Please try again or contact support.
            </p>
            <Button className="mt-5" onClick={() => void consoleQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : data ? (
          <>
            {section === "overview" && (
              <section className="mt-7">
                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricCard icon={Users} label="Total sign-ups" value={data.summary.signups} />
                  <MetricCard
                    icon={UserCheck}
                    label="Premium subscribers"
                    value={data.summary.subscribers}
                  />
                  <MetricCard
                    icon={FileText}
                    label="Vault documents"
                    value={data.summary.documents}
                  />
                </div>
                <div className="mt-7 grid gap-6 lg:grid-cols-2">
                  <section className="paper-card p-5 sm:p-6">
                    <SectionHeading
                      title="Latest sign-ups"
                      action="View all"
                      onAction={() => setSection("signups")}
                    />
                    <SignupTable users={data.signups.slice(0, 6)} compact />
                  </section>
                  <section className="paper-card p-5 sm:p-6">
                    <SectionHeading
                      title="Premium subscribers"
                      action="View all"
                      onAction={() => setSection("subscribers")}
                    />
                    <SubscriberTable users={data.subscribers.slice(0, 6)} compact />
                  </section>
                </div>
                <section className="paper-card mt-6 p-5 sm:p-6">
                  <SectionHeading
                    title="Vault at a glance"
                    action="Manage documents"
                    onAction={() => setSection("vault")}
                  />
                  <p className="text-sm text-muted-foreground">
                    {data.summary.documents} documents are currently listed in The Vault. Upload new
                    curriculum materials, index them for AI tutoring, or remove outdated files.
                  </p>
                </section>
              </section>
            )}

            {section === "signups" && (
              <section className="paper-card mt-7 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
                  <div>
                    <h2 className="font-serif text-2xl">Student sign-ups</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Showing the latest {data.signups.length} of {data.summary.signups} accounts.
                    </p>
                  </div>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name or email"
                  />
                </div>
                <SignupTable users={filteredSignups} />
              </section>
            )}

            {section === "subscribers" && (
              <section className="paper-card mt-7 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
                  <div>
                    <h2 className="font-serif text-2xl">Premium subscribers</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Accounts with Premium access, based on current subscription records.
                    </p>
                  </div>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search name or email"
                  />
                </div>
                <SubscriberTable users={filteredSubscribers} />
              </section>
            )}

            {section === "vault" && (
              <section className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
                <div className="paper-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
                    <div>
                      <h2 className="font-serif text-2xl">Vault documents</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {data.resources.length} documents
                      </p>
                    </div>
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="Search the Vault"
                    />
                  </div>
                  <ResourceTable
                    resources={filteredResources}
                    busy={busy}
                    onDelete={deleteDocument}
                  />
                </div>

                <form onSubmit={uploadDocument} className="paper-card grid gap-4 p-5 sm:p-6">
                  <div>
                    <div className="app-eyebrow">Add to the library</div>
                    <h2 className="mt-1 font-serif text-2xl">Upload a document</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Upload a paper, memo, notes or summary for students.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admin-title">Document title</Label>
                    <Input
                      id="admin-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Grade 12 Mathematics Paper 1 — 2025"
                      required
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium">
                      Academic level
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3"
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}
                      >
                        {[
                          "Grade 8",
                          "Grade 9",
                          "Grade 10",
                          "Grade 11",
                          "Grade 12",
                          "University",
                        ].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Document type
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3"
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value)}
                      >
                        <option value="past_paper">Past Paper</option>
                        <option value="memo">Memo</option>
                        <option value="study_note">Study Notes</option>
                        <option value="summary">Summary</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="admin-curriculum">Curriculum / faculty</Label>
                      <Input
                        id="admin-curriculum"
                        value={curriculum}
                        onChange={(event) => setCurriculum(event.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="admin-subject">Subject / module</Label>
                      <Input
                        id="admin-subject"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Mathematics"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="admin-year">Year</Label>
                      <Input
                        id="admin-year"
                        type="number"
                        min="1900"
                        max="2200"
                        value={year}
                        onChange={(event) => setYear(event.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="admin-document-file">File (PDF, DOCX, TXT, MD)</Label>
                      <Input
                        id="admin-document-file"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        required
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={groundAi}
                      onChange={(event) => setGroundAi(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <strong className="text-foreground">Index for AI tutoring</strong>
                      <br />
                      Extract the document text so the tutor can use it as reference.
                    </span>
                  </label>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Working…
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload to The Vault
                      </>
                    )}
                  </Button>
                </form>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="paper-card flex items-center gap-4 p-5 sm:p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 font-serif text-3xl">{value.toLocaleString("en-ZA")}</div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-serif text-xl">{title}</h2>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        {action}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

function SignupTable({ users, compact = false }: { users: Signup[]; compact?: boolean }) {
  if (!users.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">No sign-ups found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Level</th>
            {!compact && <th className="px-4 py-3">Joined</th>}
            <th className="px-4 py-3">Account</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium">{user.fullName || "Student"}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{user.academicLevel || "—"}</td>
              {!compact && (
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
              )}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={user.emailConfirmedAt ? "outline" : "secondary"}>
                    {user.emailConfirmedAt ? "Confirmed" : "Pending email"}
                  </Badge>
                  {user.isPremium && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                      Premium
                    </Badge>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubscriberTable({ users, compact = false }: { users: Subscriber[]; compact?: boolean }) {
  if (!users.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No Premium subscribers yet.</p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Subscriber</th>
            <th className="px-4 py-3">Provider</th>
            {!compact && <th className="px-4 py-3">Renewal</th>}
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium">{user.fullName || "Student"}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{user.provider}</td>
              {!compact && (
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(user.currentPeriodEnd)}
                </td>
              )}
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">
                  {user.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourceTable({
  resources,
  busy,
  onDelete,
}: {
  resources: Resource[];
  busy: boolean;
  onDelete: (resource: Resource) => void;
}) {
  if (!resources.length)
    return (
      <div className="p-8 text-center">
        <FileText className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No documents match your search.</p>
      </div>
    );
  return (
    <div className="divide-y divide-border">
      {resources.map((resource) => (
        <article key={resource.id} className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="font-semibold leading-snug">{resource.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {resource.academic_level} · {resource.faculty_or_curriculum} ·{" "}
              {resource.subject_or_module} · {resource.year}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{resource.document_type.replaceAll("_", " ")}</Badge>
              <a
                href={resource.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Open file
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${resource.title}`}
            title="Delete document"
            disabled={busy}
            onClick={() => onDelete(resource)}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </article>
      ))}
    </div>
  );
}
