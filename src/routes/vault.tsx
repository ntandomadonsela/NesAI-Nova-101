import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Sparkles, FileText, Search, X } from "lucide-react";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "The Vault — Past Papers, Memos & Notes | NesAI Nova" },
      {
        name: "description",
        content:
          "Browse a curated library of past exam papers, official memos and study notes. Filter by grade, curriculum, subject and year.",
      },
    ],
  }),
  component: Vault,
});

type Resource = {
  id: string;
  title: string;
  file_url: string;
  academic_level: string;
  faculty_or_curriculum: string;
  subject_or_module: string;
  document_type: string;
  year: number;
};

const DOC_TYPES: Record<string, { label: string; color: string }> = {
  past_paper: { label: "Past Paper", color: "bg-primary/10 text-primary" },
  memo: { label: "Memo", color: "bg-[var(--color-gold)]/15 text-[var(--color-gold)]" },
  study_note: {
    label: "Study Notes",
    color: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  },
  summary: { label: "Summary", color: "bg-accent text-foreground" },
};

function Vault() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<string>("all");
  const [curriculum, setCurriculum] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");
  const [docType, setDocType] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [search, setSearch] = useState("");

  const {
    data: resources = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return data as Resource[];
    },
  });

  // Cascade: each filter's options are derived from resources already narrowed
  // by the filters "above" it — so picking Grade 10 hides University-only
  // curricula (e.g. Law Faculty) and their subjects.
  const byLevel = useMemo(
    () => (level === "all" ? resources : resources.filter((r) => r.academic_level === level)),
    [resources, level],
  );
  const byCurriculum = useMemo(
    () =>
      curriculum === "all"
        ? byLevel
        : byLevel.filter((r) => r.faculty_or_curriculum === curriculum),
    [byLevel, curriculum],
  );
  const bySubject = useMemo(
    () =>
      subject === "all"
        ? byCurriculum
        : byCurriculum.filter((r) => r.subject_or_module === subject),
    [byCurriculum, subject],
  );
  const byDocType = useMemo(
    () => (docType === "all" ? bySubject : bySubject.filter((r) => r.document_type === docType)),
    [bySubject, docType],
  );

  const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
  const filters = useMemo(
    () => ({
      levels: uniq(resources.map((r) => r.academic_level)).sort(),
      curricula: uniq(byLevel.map((r) => r.faculty_or_curriculum)).sort(),
      subjects: uniq(byCurriculum.map((r) => r.subject_or_module)).sort(),
      docTypes: uniq(bySubject.map((r) => r.document_type)).sort(),
      years: uniq(byDocType.map((r) => String(r.year))).sort((a, b) => Number(b) - Number(a)),
    }),
    [resources, byLevel, byCurriculum, bySubject, byDocType],
  );

  // If a narrower filter no longer matches the current parent selection, reset it.
  useEffect(() => {
    if (curriculum !== "all" && !filters.curricula.includes(curriculum)) setCurriculum("all");
    if (subject !== "all" && !filters.subjects.includes(subject)) setSubject("all");
    if (docType !== "all" && !filters.docTypes.includes(docType)) setDocType("all");
    if (year !== "all" && !filters.years.includes(year)) setYear("all");
  }, [filters, curriculum, subject, docType, year]);

  const filtered = useMemo(() => {
    return byDocType.filter((r) => {
      if (year !== "all" && String(r.year) !== year) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [byDocType, year, search]);

  const activeCount = [level, curriculum, subject, docType, year].filter((v) => v !== "all").length;

  function clearFilters() {
    setLevel("all");
    setCurriculum("all");
    setSubject("all");
    setDocType("all");
    setYear("all");
    setSearch("");
  }

  function askAiAbout(r: Resource) {
    navigate({
      to: "/chat",
      search: {
        resource: r.id,
        title: r.title,
        subject: r.subject_or_module,
        year: String(r.year),
      } as any,
    });
  }

  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />

      <div className="app-page-hero border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="app-eyebrow">THE VAULT</div>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl app-page-title">
            The Resource Library
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Past exam papers, official memos and study notes — organised for serious students.
          </p>
        </div>
      </div>

      <div className="nesai-app-page mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="paper-card vault-filters h-fit p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg">Filters</h2>
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <FilterGroup label="Level" value={level} onChange={setLevel} options={filters.levels} />
          <FilterGroup
            label="Curriculum / Faculty"
            value={curriculum}
            onChange={setCurriculum}
            options={filters.curricula}
          />
          <FilterGroup
            label="Subject / Module"
            value={subject}
            onChange={setSubject}
            options={filters.subjects}
          />
          <FilterGroup
            label="Document Type"
            value={docType}
            onChange={setDocType}
            options={filters.docTypes}
            renderOption={(v) => DOC_TYPES[v]?.label ?? v}
          />
          <FilterGroup label="Year" value={year} onChange={setYear} options={filters.years} />
        </aside>

        {/* Main */}
        <main>
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search papers, memos and notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="paper-card h-48 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="paper-card p-10 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h2 className="font-semibold text-foreground">The Vault didn’t load</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Check your connection and try again.
              </p>
              <Button variant="outline" className="mt-5" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="paper-card p-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
              No documents match your filters.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((r) => {
                const doc = DOC_TYPES[r.document_type] ?? {
                  label: r.document_type,
                  color: "bg-accent",
                };
                return (
                  <article
                    key={r.id}
                    className="paper-card vault-resource flex flex-col p-6 transition hover:shadow-editorial-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <Badge className={`${doc.color} border-0`}>{doc.label}</Badge>
                          <Badge variant="outline">{r.year}</Badge>
                        </div>
                        <h3 className="font-serif text-lg leading-snug">{r.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.academic_level} · {r.faculty_or_curriculum} · {r.subject_or_module}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <a href={r.file_url} target="_blank" rel="noreferrer">
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => askAiAbout(r)}
                        className="flex-1 bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Ask AI About This Paper
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
  renderOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (v: string) => string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
