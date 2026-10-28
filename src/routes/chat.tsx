import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { userFacingError } from "@/lib/user-facing-error";
import { createStudentAgents, getAgent, type SubjectAgent } from "@/lib/subject-agents";
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
import {
  Atom,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  MessageSquarePlus,
  Scale,
  Send,
  Sigma,
  Sparkles,
  TrendingUp,
} from "lucide-react";

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
      { title: "AI Study Desk | NesAI" },
      {
        name: "description",
        content: "Chat with a specialist AI tutor for Math, Sciences, Law, Commerce and more.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ChatPage,
});

type PracticeQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
type PracticeQuiz = {
  title: string;
  instructions: string;
  questions: PracticeQuestion[];
  answers: number[];
  submitted: boolean;
};
type Message = { role: "user" | "assistant"; content: string; quiz?: PracticeQuiz };
type ChatSummary = { id: string; title: string | null; subject_agent: string; updated_at: string };
const STREAM_ERROR_MARKER = "\n[[NESAI_STREAM_ERROR]]";

function recentTutorMessages(messages: Message[]) {
  let remaining = 36_000;
  const selected: Array<{ role: Message["role"]; content: string }> = [];
  for (const message of messages.slice(-30).reverse()) {
    const quizContext = message.quiz
      ? `\n\n${message.quiz.questions
          .map(
            (question, index) =>
              `${index + 1}. ${question.question}\n${question.options
                .map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`)
                .join("\n")}\nCorrect answer: ${String.fromCharCode(65 + question.correctIndex)}. ${question.explanation}`,
          )
          .join("\n\n")}`
      : "";
    let content = `${message.content}${quizContext}`;
    if (content.length > remaining) {
      if (selected.length > 0) break;
      content = content.slice(-remaining);
    }
    selected.push({ role: message.role, content });
    remaining -= content.length;
    if (remaining <= 0) break;
  }
  return selected.reverse();
}

const tutorIcons = { Sigma, Atom, Scale, TrendingUp, BookOpen, GraduationCap };

function ChatPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/chat" });

  const initialAgentId =
    search.agent ??
    (search.subject?.toLowerCase().includes("law")
      ? "law"
      : search.subject?.toLowerCase().includes("math") ||
          search.subject?.toLowerCase().includes("calc")
        ? "math"
        : search.subject?.toLowerCase().includes("physic") ||
            search.subject?.toLowerCase().includes("science")
          ? "science"
          : search.subject?.toLowerCase().includes("account") ||
              search.subject?.toLowerCase().includes("econ") ||
              search.subject?.toLowerCase().includes("business")
            ? "commerce"
            : search.subject
              ? "humanities"
              : undefined);

  const [agent, setAgent] = useState<SubjectAgent>(getAgent(initialAgentId));
  const [studentAgents, setStudentAgents] = useState<SubjectAgent[]>([]);
  const [studentLevel, setStudentLevel] = useState("Grade 12");
  const [studentDegree, setStudentDegree] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedChats, setSavedChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [ready, setReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [showLimit, setShowLimit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const quizSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a usable tutor available while profile subjects are loading or missing.
  const availableAgents = studentAgents.length ? studentAgents : [getAgent("general")];

  const refreshChatHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setHistoryLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("chats")
      .select("id, title, subject_agent, updated_at")
      .eq("user_id", authData.user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Could not load Study Desk history", error);
      toast.error("We couldn’t load your saved conversations.");
    } else {
      setSavedChats((data ?? []) as ChatSummary[]);
    }
    setHistoryLoading(false);
  }, []);

  const saveConversation = useCallback(
    async (chatId: string | null, nextMessages: Message[], currentAgent: SubjectAgent) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sign in to save your conversation.");
      const firstPrompt = nextMessages.find((message) => message.role === "user")?.content ?? "";
      const title = firstPrompt.trim().replace(/\s+/g, " ").slice(0, 72) || "Study conversation";
      const payload = {
        title,
        subject_agent: currentAgent.id,
        messages: nextMessages as unknown as Json,
        updated_at: new Date().toISOString(),
      };
      const result = chatId
        ? await supabase
            .from("chats")
            .update(payload)
            .eq("id", chatId)
            .select("id, title, subject_agent, updated_at")
            .single()
        : await supabase
            .from("chats")
            .insert({ ...payload, user_id: authData.user.id })
            .select("id, title, subject_agent, updated_at")
            .single();
      if (result.error || !result.data) throw result.error ?? new Error("Conversation was not saved.");
      const saved = result.data as ChatSummary;
      setActiveChatId(saved.id);
      setSavedChats((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      return saved.id;
    },
    [],
  );

  const openConversation = useCallback(
    async (chatId: string) => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, subject_agent, updated_at, messages")
        .eq("id", chatId)
        .single();
      if (error || !data) {
        toast.error("We couldn’t open that conversation. Please try again.");
        return;
      }
      const restored = Array.isArray(data.messages)
        ? data.messages.filter(
            (message): message is Message =>
              typeof message === "object" &&
              message !== null &&
              "role" in message &&
              (message.role === "user" || message.role === "assistant") &&
              "content" in message &&
              typeof message.content === "string",
          )
        : [];
      setMessages(restored);
      setActiveChatId(data.id);
      setAgent(
        availableAgents.find((item) => item.id === data.subject_agent) ?? getAgent(data.subject_agent),
      );
    },
    [availableAgents],
  );

  useEffect(() => {
    void refreshChatHistory();
  }, [refreshChatHistory]);

  const refreshStudyProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        navigate({ to: "/auth", search: { redirect: "/chat" } });
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("academic_level, subjects, degree_name")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();
      if (error) throw error;

      const level = profile?.academic_level ?? "Grade 12";
      const subjects = profile?.subjects ?? [];
      const agents = createStudentAgents(subjects, level);
      setStudentLevel(level);
      setStudentDegree(profile?.degree_name ?? "");
      setStudentAgents(agents);
      setAgent((current) => {
        if (agents.some((item) => item.id === current.id))
          return agents.find((item) => item.id === current.id)!;
        if (initialAgentId?.startsWith("subject-")) {
          const initial = agents.find((item) => item.id === initialAgentId);
          if (initial) return initial;
        }
        if (search.subject) {
          const matching = agents.find((item) =>
            item.name.toLowerCase().startsWith(search.subject!.toLowerCase()),
          );
          if (matching) return matching;
        }
        return agents[0] ?? getAgent("general");
      });
    } catch (error) {
      setStudentAgents([]);
      setAgent(getAgent("general"));
      setProfileError(
        userFacingError(error, "We couldn’t load your subjects. Please refresh and try again."),
      );
    } finally {
      setReady(true);
      setProfileLoading(false);
    }
  }, [navigate, initialAgentId, search.subject]);

  useEffect(() => {
    void refreshStudyProfile();
  }, [refreshStudyProfile]);

  useEffect(() => {
    const refresh = () => void refreshStudyProfile();
    window.addEventListener("nesai:study-profile-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("nesai:study-profile-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshStudyProfile]);

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
  const lastMessageContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastMessageContent, streaming]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);
    let persistedChatId = activeChatId;

    try {
      try {
        persistedChatId = await saveConversation(persistedChatId, nextMessages, agent);
      } catch (error) {
        console.error("Could not save Study Desk conversation", error);
        toast.error("Your question is here, but this conversation couldn’t be saved.");
      }
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        navigate({ to: "/auth", search: { redirect: "/chat" } });
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: recentTutorMessages(nextMessages),
          agentId: agent.id,
          ...(agent.id.startsWith("subject-")
            ? { subjectName: agent.name.replace(/ Tutor$/, "") }
            : {}),
          resourceContext: search.title
            ? {
                id: search.resource,
                title: search.title,
                subject: search.subject,
                year: search.year,
              }
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
          toast.error("The AI tutor is busy right now. Please try again shortly.");
        }
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        const message =
          typeof body.error === "string"
            ? body.error
            : "The Study Desk is temporarily unavailable. Your credit was not used. Please try again later.";
        throw new Error(`nesai-api:${message}`);
      }
      if (!res.body) {
        throw new Error("The Study Desk returned an empty response. Your credit was not used.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      // toTextStreamResponse emits plain UTF-8 text chunks.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value, { stream: true });
        const streamErrorAt = assistant.indexOf(STREAM_ERROR_MARKER);
        if (streamErrorAt >= 0) {
          throw new Error(assistant.slice(streamErrorAt + STREAM_ERROR_MARKER.length).trim());
        }
        setMessages([...nextMessages, { role: "assistant", content: assistant }]);
      }
      assistant += decoder.decode();
      const streamErrorAt = assistant.indexOf(STREAM_ERROR_MARKER);
      if (streamErrorAt >= 0) {
        throw new Error(assistant.slice(streamErrorAt + STREAM_ERROR_MARKER.length).trim());
      }
      if (!assistant.trim()) {
        throw new Error("The AI returned an empty answer. Please try again.");
      }
      setMessages([...nextMessages, { role: "assistant", content: assistant }]);
      try {
        persistedChatId = await saveConversation(
          persistedChatId,
          [...nextMessages, { role: "assistant", content: assistant }],
          agent,
        );
      } catch (error) {
        console.error("Could not save Study Desk answer", error);
        toast.error("The answer is ready, but it couldn’t be saved to your history.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message.startsWith("nesai-api:")
          ? err.message.slice("nesai-api:".length)
          : userFacingError(
              err,
              "The Study Desk couldn’t answer just now. Your credit was not used. Please try again.",
            );
      toast.error(message);
      setInput(text);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: `I couldn't get an answer from the AI. ${message}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  async function createPracticeTest() {
    const topic = input.trim() || [...messages].reverse().find((message) => message.role === "user")?.content;
    if (!topic) {
      toast.error("Type a topic in the message box, then choose Create practice test.");
      return;
    }
    if (topic.length > 500) {
      toast.error("Keep the practice-test topic under 500 characters.");
      return;
    }
    if (creatingTest || streaming) return;
    setCreatingTest(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        navigate({ to: "/auth", search: { redirect: "/chat" } });
        return;
      }
      const recentMessages = messages
        .filter((message) => !message.quiz)
        .slice(-10)
        .map(({ role, content }) => ({ role, content: content.slice(-2500) }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode: "practice-test",
          practiceTopic: topic,
          messages: recentMessages.length
            ? recentMessages
            : [{ role: "user", content: `Create a practice test on ${topic}` }],
          subjectName: agent.id.startsWith("subject-") ? agent.name.replace(/ Tutor$/, "") : undefined,
          agentId: agent.id,
          resourceContext: search.title
            ? {
                id: search.resource,
                title: search.title,
                subject: search.subject,
                year: search.year,
              }
            : null,
        }),
      });
      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        if (body?.reason === "daily_limit") setShowLimit(true);
        else toast.error("The tutor is busy right now. Please try again shortly.");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        quiz?: Omit<PracticeQuiz, "answers" | "submitted">;
      };
      if (!response.ok || !body.quiz) {
        throw new Error(body.error ?? "The practice test could not be created.");
      }
      const nextMessages: Message[] = [
        ...messages,
        { role: "user", content: `Create a multiple-choice practice test on: ${topic}` },
        {
          role: "assistant",
          content: `### ${body.quiz.title}\n\n${body.quiz.instructions}`,
          quiz: { ...body.quiz, answers: Array(body.quiz.questions.length).fill(-1), submitted: false },
        },
      ];
      setMessages(nextMessages);
      setInput("");
      try {
        await saveConversation(activeChatId, nextMessages, agent);
      } catch (error) {
        console.error("Could not save practice test", error);
        toast.error("The test was created, but it couldn’t be saved to your history.");
      }
    } catch (error) {
      toast.error(userFacingError(error, "The practice test could not be created. Please try again."));
    } finally {
      setCreatingTest(false);
    }
  }

  function chooseQuizAnswer(messageIndex: number, questionIndex: number, answerIndex: number) {
    const nextMessages = messages.map((message, index) => {
      if (index !== messageIndex || !message.quiz || message.quiz.submitted) return message;
      const answers = [...message.quiz.answers];
      answers[questionIndex] = answerIndex;
      return { ...message, quiz: { ...message.quiz, answers } };
    });
    setMessages(nextMessages);
    if (activeChatId) {
      if (quizSaveTimeout.current) clearTimeout(quizSaveTimeout.current);
      const chatId = activeChatId;
      quizSaveTimeout.current = setTimeout(() => {
        void saveConversation(chatId, nextMessages, agent).catch((error) => {
          console.error("Could not save practice test progress", error);
        });
      }, 600);
    }
  }

  async function submitPracticeTest(messageIndex: number) {
    const nextMessages = messages.map((message, index) =>
      index === messageIndex && message.quiz
        ? { ...message, quiz: { ...message.quiz, submitted: true } }
        : message,
    );
    setMessages(nextMessages);
    try {
      await saveConversation(activeChatId, nextMessages, agent);
    } catch (error) {
      console.error("Could not save marked practice test", error);
      toast.error("Your result is shown, but it couldn’t be saved to history.");
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
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />

      <div className="nesai-app-page mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar — subject agents */}
        <aside className="paper-card study-sidebar h-fit p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[var(--color-gold)]" />
            <h2 className="font-serif text-lg">Subject Tutors</h2>
          </div>
          <div className="space-y-1">
            {profileError ? (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm leading-relaxed text-destructive">
                Your saved subjects could not be loaded, so the General Study Coach is available.{" "}
                {profileError}
                <button
                  type="button"
                  className="mt-2 block font-semibold underline"
                  onClick={() => void refreshStudyProfile()}
                >
                  Try again
                </button>
              </div>
            ) : (
              studentAgents.length === 0 && (
                <div className="rounded-lg bg-accent/60 p-3 text-sm leading-relaxed text-muted-foreground">
                  {profileLoading
                    ? "Loading your saved subjects…"
                    : "Add your subjects in your study profile to open the right tutors."}
                </div>
              )
            )}
            {availableAgents.map((a) => {
              const Icon = tutorIcons[a.icon as keyof typeof tutorIcons] ?? BookOpen;
              const active = a.id === agent.id;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAgent(a);
                    setMessages([]);
                    setActiveChatId(null);
                  }}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              setActiveChatId(null);
              setMessages([]);
            }}
          >
            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" /> New conversation
          </Button>

          <section className="mt-6 border-t border-border pt-4" aria-label="Saved conversations">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> Recent conversations
            </h3>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {historyLoading ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Loading history…</p>
              ) : savedChats.length === 0 ? (
                <p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
                  Your conversations will appear here so you can return to them later.
                </p>
              ) : (
                savedChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => void openConversation(chat.id)}
                    className={`w-full truncate rounded-md px-2.5 py-2 text-left text-xs transition hover:bg-accent ${
                      activeChatId === chat.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
                    }`}
                    aria-current={activeChatId === chat.id ? "page" : undefined}
                    title={chat.title ?? "Study conversation"}
                  >
                    {chat.title ?? "Study conversation"}
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Chat canvas */}
        <main className="study-main flex h-[calc(100vh-140px)] flex-col">
          <div className="mb-3">
            <div className="app-eyebrow">Study Desk</div>
            <h1 className="font-serif text-3xl">{agent.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {studentLevel}
              {studentLevel === "University" && studentDegree ? ` · ${studentDegree}` : ""}
            </p>
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
            className="study-conversation flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-6"
          >
            {profileLoading && !studentAgents.length ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading your saved subjects… The General Study Coach is ready below.
              </div>
            ) : !studentAgents.length && messages.length === 0 ? (
              <div className="mb-5 rounded-lg border border-primary/15 bg-accent/40 p-4 text-center">
                <h3 className="font-serif text-xl">Your General Study Coach is ready</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can start typing now. Add your subjects to your profile to unlock dedicated
                  tutors.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/profile">Manage study profile</Link>
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <EmptyState agent={agent} onExample={(q) => setInput(q)} />
            ) : (
              messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  m={m}
                  messageIndex={i}
                  onQuizAnswer={chooseQuizAnswer}
                  onQuizSubmit={submitPracticeTest}
                />
              ))
            )}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="text-sm italic text-muted-foreground">Thinking…</div>
            )}
          </div>

          {/* Composer */}
          <div className="mt-4">
            <div className="paper-card study-composer flex flex-col gap-2 p-2">
              <Textarea
                value={input}
                maxLength={5000}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${agent.name.replace(" Tutor", "")} anything…`}
                className="min-h-[52px] w-full resize-none border-0 shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="study-practice-test-button h-10 shrink-0 px-3 text-xs"
                  onClick={() => void createPracticeTest()}
                  disabled={creatingTest || streaming}
                  title="Creates a 10-question test from the text in the message box, or your latest topic."
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {creatingTest ? "Creating…" : "Practice test"}
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  size="icon"
                  aria-label="Send message"
                  className="study-send-button h-10 w-10 shrink-0 bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:brightness-110"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
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
              You’ve used today’s 20 free AI credits
            </DialogTitle>
            <DialogDescription>
              Free accounts get 20 AI credits each day. Upgrade to Nova Premium for unlimited
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

function EmptyState({ agent, onExample }: { agent: SubjectAgent; onExample: (q: string) => void }) {
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
      <p className="mt-2 text-sm text-muted-foreground">{agent.name} is ready. Try one of these:</p>
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

function MessageBubble({
  m,
  messageIndex,
  onQuizAnswer,
  onQuizSubmit,
}: {
  m: Message;
  messageIndex: number;
  onQuizAnswer: (messageIndex: number, questionIndex: number, answerIndex: number) => void;
  onQuizSubmit: (messageIndex: number) => void;
}) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`${m.quiz ? "w-full max-w-full" : "max-w-[85%]"} rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground shadow-editorial"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{m.content}</div>
        ) : m.quiz ? (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {m.content}
              </ReactMarkdown>
            </div>
            <PracticeTestCard
              quiz={m.quiz}
              messageIndex={messageIndex}
              onAnswer={onQuizAnswer}
              onSubmit={onQuizSubmit}
            />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-foreground prose-headings:mb-2 prose-headings:mt-5 first:prose-headings:mt-0 prose-p:text-foreground prose-p:my-2 prose-p:leading-7 prose-strong:text-foreground prose-code:text-foreground prose-code:before:hidden prose-code:after:hidden prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5 prose-li:my-1 prose-li:marker:text-primary prose-blockquote:border-primary prose-blockquote:text-muted-foreground prose-pre:overflow-x-auto prose-pre:rounded-md prose-pre:bg-muted prose-pre:p-3 prose-table:block prose-table:overflow-x-auto prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {m.content || "…"}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function PracticeTestCard({
  quiz,
  messageIndex,
  onAnswer,
  onSubmit,
}: {
  quiz: PracticeQuiz;
  messageIndex: number;
  onAnswer: (messageIndex: number, questionIndex: number, answerIndex: number) => void;
  onSubmit: (messageIndex: number) => void;
}) {
  const score = quiz.questions.reduce(
    (total, question, index) => total + Number(quiz.answers[index] === question.correctIndex),
    0,
  );
  const allAnswered = quiz.answers.length === quiz.questions.length && quiz.answers.every((answer) => answer >= 0);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-background p-4" aria-label={quiz.title}>
      {quiz.submitted && (
        <div className="flex items-center justify-between rounded-md bg-primary/10 px-4 py-3">
          <span className="font-semibold">Your score</span>
          <span className="text-lg font-bold">{score} / {quiz.questions.length}</span>
        </div>
      )}
      {quiz.questions.map((question, questionIndex) => (
        <fieldset key={`${questionIndex}-${question.question}`} className="space-y-2 border-b border-border pb-4 last:border-0">
          <legend className="mb-2 font-medium leading-relaxed">
            <span className="mr-1 text-muted-foreground">{questionIndex + 1}.</span> {question.question}
          </legend>
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const selected = quiz.answers[questionIndex] === optionIndex;
              const isCorrect = question.correctIndex === optionIndex;
              const resultStyle = quiz.submitted
                ? isCorrect
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                  : selected
                    ? "border-destructive bg-destructive/5 text-foreground"
                    : "border-border bg-background text-foreground"
                : selected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent";
              return (
                <button
                  key={optionIndex}
                  type="button"
                  disabled={quiz.submitted}
                  aria-pressed={selected}
                  onClick={() => onAnswer(messageIndex, questionIndex, optionIndex)}
                  className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-default ${resultStyle}`}
                >
                  <span className="font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {quiz.submitted && (
            <p className="rounded-md bg-accent/50 p-3 text-sm leading-relaxed">
              <strong>{quiz.answers[questionIndex] === question.correctIndex ? "Correct." : `Correct answer: ${String.fromCharCode(65 + question.correctIndex)}.`}</strong>{" "}
              {question.explanation}
            </p>
          )}
        </fieldset>
      ))}
      {!quiz.submitted && (
        <Button type="button" onClick={() => onSubmit(messageIndex)} disabled={!allAnswered}>
          Submit answers
        </Button>
      )}
      {quiz.submitted && (
        <p className="text-sm text-muted-foreground">
          {score === quiz.questions.length
            ? "Excellent work — you got every question right."
            : score >= quiz.questions.length * 0.7
              ? "Good work. Review the explanations for the questions you missed."
              : "Use the explanations to review these ideas, then try another test."}
        </p>
      )}
    </section>
  );
}
