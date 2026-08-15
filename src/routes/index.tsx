import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Sparkles, ShieldCheck, Library, Scale, Sigma } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NesAI Nova — The Digital Library & AI Tutor for Serious Students" },
      {
        name: "description",
        content:
          "Curated past papers, memos and study notes for High School and University — paired with a Socratic AI copilot that tutors you on the exact material you're studying.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.amber.100/40),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-editorial">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-gold)]" />
              A digital library and a personal study desk.
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-foreground md:text-7xl">
              Study the way top scholars do — a{" "}
              <span className="italic text-[var(--color-gold)]">rigorous library</span> paired with
              a patient tutor.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              NesAI Nova brings together past exam papers, memos and study notes, paired with a
              subject-specialist study companion that walks you through the exact material you're
              revising.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
              >
                <Link to="/vault">
                  Explore the Vault <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/chat">Open the Study Desk</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Bank-grade security
              </span>
              <span>·</span>
              <span>CAPS · IEB · University</span>
              <span>·</span>
              <span>Built for South African learners</span>
            </div>

          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Library,
              title: "The Resource Vault",
              body: "A meticulously organized archive of past papers, official memos, summaries and study notes — filter by level, curriculum, subject and year.",
            },
            {
              icon: Sparkles,
              title: "Specialist Study Desk",
              body: "Subject-specific tutors for Math, Sciences, Law, Commerce and more. Renders LaTeX equations, IRAC arguments and code natively — like a top TA at your desk.",
            },
            {
              icon: BookOpen,
              title: "Open a paper, ask a question",
              body: "Every document has a one-click bridge to the Study Desk with the paper pre-loaded as context. No copy-pasting.",
            },

          ].map((f, i) => (
            <div key={i} className="paper-card p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <f.icon className="h-5 w-5 text-[var(--color-gold)]" />
              </div>
              <h3 className="font-serif text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects strip */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Specialist tutors
            </div>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">Six tutors. One study desk.</h2>

          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              { icon: Sigma, name: "Math Tutor", tag: "Socratic method" },
              { icon: BookOpen, name: "Sciences Tutor", tag: "Given/Required/Formula" },
              { icon: Scale, name: "Law Tutor", tag: "IRAC formatting" },
              { icon: Library, name: "Commerce Tutor", tag: "Journals & T-accounts" },
              { icon: BookOpen, name: "Humanities Tutor", tag: "Essay coaching" },
              { icon: Sparkles, name: "Study Coach", tag: "Exam strategy" },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
              >
                <s.icon className="h-5 w-5 text-[var(--color-gold)]" />
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-serif text-4xl md:text-5xl">Ready to study, refined?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Free to start. Five tutor questions a day, unlimited paper downloads.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
          >
            <Link to="/auth">Create your free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/vault">Browse the Vault</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <div>© {new Date().getFullYear()} NesAI Nova. Study, refined.</div>
        <div className="mt-1.5 tracking-wide">
          Owned and operated by <span className="font-medium text-foreground/70">Nesma Holdings (Pty) Ltd</span>.
        </div>
      </footer>

    </div>
  );
}
