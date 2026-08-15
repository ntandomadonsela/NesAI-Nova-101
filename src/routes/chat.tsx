import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECT_AGENTS, getAgent, type SubjectAgent } from "@/lib/subject-agents";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import { Send, GraduationCap, FileText, Sparkles } from "lucide-react";

const searchSchema = z.object({
  agent: z.string().optional(),
  resource: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  year: z.string().optional(),
});

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Study Desk — NesAI Nova" },
      {
        name: "description",
        content: "Chat with a specialist AI tutor for Math, Sciences, Law, Commerce and more.",
      },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ChatPage,
});

type Message = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/chat" });

  const initialAgentId =
    search.agent ??
    (search.subject?.toLowerCase().includes("law")
      ? "law"
      : search.subject?.toLowerCase().includes("math") || search.subject?.toLowerCase().includes("calc")
        ? "math"
        : search.subject?.toLowerCase().includes("physic") || search.subject?.toLowerCase().includes("science")
          ? "science"
          : search.subject?.toLowerCase().includes("account") ||
              search.subject?.toLowerCase().includes("econ") ||
              search.subject?.toLowerCase().includes("business")
            ? "commerce"
            : search.subject
              ? "humanities"
              : undefined);

  const [agent, setAgent] = useState<SubjectAgent>(getAgent(initialAgentId));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { redirect: "/chat" } as any });
      } else {
        setReady(true);
      }
    });
  }, [navigate]);

  // Preload resource context if arrived from vault
  useEffect(() => {
    if (search.title && messages.length === 0 && ready) {
      setMessages([
        {
          role: "assistant",
          content: `📄 Loaded context: **${search.title}** — ${search.subject ?? ""}${
            search.year ? ` (${search.year})` : ""
          }.\n\nAsk me anything about this paper — I'll help you work through it step by step.`,
        },
      ]);
    }
  }, [search.title, search.subject, search.year, ready, messages.length]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        navigate({ to: "/auth", search: { redirect: "/chat" } as any });
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: nextMessages,
          agentId: agent.id,
          resourceContext: search.title
            ? { id: search.resource, title: search.title, subject: search.subject, year: search.year }
            : null,
        }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setStreaming(false);
        setMessages(nextMessages); // keep user message
        if (body?.reason === "daily_limit") {
          setShowLimit(true);
        } else {
          toast.error("Rate limited. Try again shortly.");
        }
        return;
      }
      if (res.status === 402) {
        toast.error("AI credits exhausted. Please contact support.");
        setStreaming(false);
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      // Parse Vercel AI SDK stream text protocol / SSE
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Support both raw text streaming and SSE `data: {...}` lines
        for (const line of chunk.split("\n")) {
          if (!line) continue;
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const delta =
                obj?.choices?.[0]?.delta?.content ??
                obj?.textDelta ??
                obj?.text ??
                "";
              if (delta) assistant += delta;
            } catch {
              /* ignore */
            }
          } else {
            assistant += line;
          }
          setMessages([...nextMessages, { role: "assistant", content: assistant }]);
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
      setMessages(nextMessages);
    } finally {
      setStreaming(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading study desk…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar — subject agents */}
        <aside className="paper-card h-fit p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[var(--color-gold)]" />
            <h2 className="font-serif text-lg">Subject Tutors</h2>
          </div>
          <div className="space-y-1">
            {SUBJECT_AGENTS.map((a) => {
              const Icon =
                (LucideIcons as any)[a.icon] ?? LucideIcons.BookOpen;
              const active = a.id === agent.id;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAgent(a);
                    setMessages([]);
                  }}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div
                      className={`text-xs ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {a.short}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Button asChild variant="outline" size="sm" className="mt-6 w-full">
            <Link to="/vault">
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Browse the Vault
            </Link>
          </Button>
        </aside>

        {/* Chat canvas */}
        <main className="flex h-[calc(100vh-140px)] flex-col">
          <div className="mb-3">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Study Desk
            </div>
            <h1 className="font-serif text-3xl">{agent.name}</h1>
          </div>

          {search.title && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 px-3 py-2 text-xs text-foreground">
              <FileText className="h-3.5 w-3.5 text-[var(--color-gold)]" />
              <span>Context loaded:</span>
              <span className="font-medium">{search.title}</span>
              {search.year && <span className="text-muted-foreground">· {search.year}</span>}
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-6"
          >
            {messages.length === 0 ? (
              <EmptyState agent={agent} onExample={(q) => setInput(q)} />
            ) : (
              messages.map((m, i) => <MessageBubble key={i} m={m} />)
            )}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="text-sm italic text-muted-foreground">Thinking…</div>
            )}
          </div>

          {/* Composer */}
          <div className="mt-4">
            <div className="paper-card flex items-end gap-2 p-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${agent.name.replace(" Tutor", "")} anything…`}
                className="min-h-[52px] resize-none border-0 shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                size="icon"
                className="h-10 w-10 shrink-0 bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={showLimit} onOpenChange={setShowLimit}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-gold)]/15">
              <Sparkles className="h-5 w-5 text-[var(--color-gold)]" />
            </div>
            <DialogTitle className="font-serif text-2xl">
              You've reached today's free limit
            </DialogTitle>
            <DialogDescription>
              Free accounts get 5 AI questions per day. Upgrade to Nova Premium for unlimited
              tutoring, exam prediction and advanced analysis.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li>✓ Unlimited AI questions</li>
            <li>✓ Priority responses on new papers</li>
            <li>✓ Detailed marking rubrics & feedback</li>
            <li>✓ Full chat history export</li>
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLimit(false)}>
              Maybe later
            </Button>
            <Button
              asChild
              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
              onClick={() => setShowLimit(false)}
            >
              <Link to="/upgrade">Upgrade to Premium</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  agent,
  onExample,
}: {
  agent: SubjectAgent;
  onExample: (q: string) => void;
}) {
  const examples: Record<string, string[]> = {
    math: [
      "Solve for x: $2x^2 - 5x - 3 = 0$",
      "Explain the chain rule with an example",
      "Walk me through integration by parts",
    ],
    science: [
      "Explain projectile motion intuitively",
      "Balance: Fe + O₂ → Fe₂O₃",
      "What is Newton's second law?",
    ],
    law: [
      "IRAC analysis: is a shop-window display an offer?",
      "Elements of a valid contract",
      "R v Dudley and Stephens — key principle",
    ],
    commerce: [
      "Journal entry: bought stock on credit R5,000",
      "Explain price elasticity of demand",
      "What is the accounting equation?",
    ],
    humanities: [
      "Thesis statement for an essay on apartheid",
      "Analyse the opening of Macbeth",
      "Explain classical conditioning",
    ],
    general: [
      "How do I plan a 3-month exam study schedule?",
      "Best techniques for memorising formulas",
      "How to write a strong essay introduction",
    ],
  };
  const list = examples[agent.id] ?? examples.general;

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Sparkles className="h-5 w-5 text-[var(--color-gold)]" />
      </div>
      <h3 className="font-serif text-2xl">Start a conversation</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {agent.name} is ready. Try one of these:
      </p>
      <div className="mt-6 space-y-2">
        {list.map((q) => (
          <button
            key={q}
            onClick={() => onExample(q)}
            className="w-full rounded-md border border-border bg-background px-4 py-3 text-left text-sm transition hover:border-[var(--color-gold)] hover:bg-accent"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground shadow-editorial"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{m.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:before:hidden prose-code:after:hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {m.content || "…"}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
