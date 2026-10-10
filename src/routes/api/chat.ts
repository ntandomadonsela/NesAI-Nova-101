import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { streamText, type ModelMessage } from "ai";
import { createAiGateway } from "@/lib/ai-gateway.server";
import { createSubjectAgent, getAgent } from "@/lib/subject-agents";

const FREE_DAILY_LIMIT = 5;
const STREAM_ERROR_MARKER = "\n[[NESAI_STREAM_ERROR]]";
// Model id format depends on your provider, e.g. "gpt-4o-mini" for OpenAI,
// "google/gemini-2.5-flash" for OpenRouter. Override via AI_GATEWAY_MODEL.
const MODEL_ID = process.env.AI_GATEWAY_MODEL ?? "gpt-4o-mini";

function getProviderErrorMessage(error: unknown): string {
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : undefined;

  if (status === 401 || status === 403)
    return "The AI provider rejected its API key. Check OPENAI_API_KEY or AI_GATEWAY_API_KEY in Vercel.";
  if (status === 404)
    return `The AI model “${MODEL_ID}” was not found. Check AI_GATEWAY_MODEL in Vercel.`;
  if (status === 402) return "The AI provider account has run out of credits.";
  if (status === 429) return "The AI provider is busy. Please try again shortly.";
  return "The AI provider could not answer this request. Please try again shortly.";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        // Vercel projects are often configured with the public VITE_ names only.
        // These values are safe for a user-scoped client; the bearer token still
        // enforces RLS. Prefer the server names when both are configured.
        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishableKey) {
          return Response.json(
            {
              error:
                "Study Desk is missing its Supabase server configuration. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or the matching VITE_ variables) in Vercel.",
            },
            { status: 500 },
          );
        }

        // Client acting as the user (RLS applies)
        const supabase = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = userData.user.id;

        // 2. Load profile & enforce daily limit
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, is_premium, daily_tokens, last_reset, academic_level, subjects, degree_name, institution, study_year",
          )
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Study Desk profile lookup failed", profileError);
          return Response.json(
            { error: "Could not load your study profile. Please try again." },
            { status: 500 },
          );
        }
        if (!profile) {
          return new Response("Profile not found", { status: 404 });
        }

        const gatewayKey = process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
        if (!gatewayKey) {
          return Response.json(
            {
              error:
                "The AI key is missing. Add OPENAI_API_KEY or AI_GATEWAY_API_KEY to Vercel for Production, then redeploy.",
            },
            { status: 500 },
          );
        }

        // Reset counter if >24h since last_reset
        const now = new Date();
        const lastResetTime = profile.last_reset ? Date.parse(profile.last_reset) : 0;
        const hoursSince = (now.getTime() - lastResetTime) / (1000 * 60 * 60);
        let dailyTokens = profile.daily_tokens ?? 0;
        if (!Number.isFinite(hoursSince) || hoursSince >= 24) {
          dailyTokens = 0;
          await supabase
            .from("profiles")
            .update({ daily_tokens: 0, last_reset: now.toISOString() })
            .eq("id", userId);
        }

        if (!profile.is_premium && dailyTokens >= FREE_DAILY_LIMIT) {
          return new Response(
            JSON.stringify({ error: "Daily limit reached", reason: "daily_limit" }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }

        // 3. Parse body
        type Body = {
          messages: Array<{ role: "user" | "assistant"; content: string }>;
          agentId?: string;
          subjectName?: string;
          resourceContext?: { id?: string; title?: string; subject?: string; year?: string } | null;
        };
        const body = (await request.json()) as Body;
        if (
          !Array.isArray(body.messages) ||
          body.messages.length === 0 ||
          body.messages.some(
            (message) =>
              !message ||
              !["user", "assistant"].includes(message.role) ||
              typeof message.content !== "string" ||
              !message.content.trim(),
          )
        ) {
          return new Response("Bad request", { status: 400 });
        }

        const permittedSubject =
          body.subjectName && (profile.subjects ?? []).includes(body.subjectName);
        if (body.subjectName && !permittedSubject) {
          return new Response(
            "That subject is not in your study profile. Update your profile and try again.",
            { status: 403 },
          );
        }
        const agent = permittedSubject
          ? createSubjectAgent(body.subjectName!, profile.academic_level ?? "Grade 12")
          : getAgent(body.agentId);

        let system = `${agent.systemPrompt}\n\nStudent profile: academic level ${profile.academic_level ?? "not specified"}${profile.degree_name ? `; degree ${profile.degree_name}` : ""}${profile.institution ? `; institution ${profile.institution}` : ""}${profile.study_year ? `; study year ${profile.study_year}` : ""}. Their selected subjects/modules are ${(profile.subjects ?? []).join(", ") || "not set"}. Keep answers within the requested subject. For school students, align to the South African CAPS/DBE curriculum; for university students, do not assume a specific institution's syllabus unless material is supplied.`;
        if (body.resourceContext?.title) {
          system += `\n\nThe student is currently studying this document: "${body.resourceContext.title}"${
            body.resourceContext.subject ? ` (${body.resourceContext.subject})` : ""
          }${body.resourceContext.year ? `, year ${body.resourceContext.year}` : ""}. Frame examples and explanations around this material when relevant.`;
        }

        // RAG: use the open paper when present, otherwise retrieve processed
        // Vault material for the learner's own subject and level.
        const lastUserMessage =
          [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const resourceIds: string[] = [];
        if (body.resourceContext?.id) resourceIds.push(body.resourceContext.id);
        else if (permittedSubject) {
          const { data: subjectResources, error: resourceErr } = await supabase
            .from("resources")
            .select("id")
            .eq("academic_level", profile.academic_level ?? "Grade 12")
            .ilike("subject_or_module", body.subjectName!)
            .limit(3);
          if (resourceErr) console.error("Subject resource lookup failed", resourceErr);
          else resourceIds.push(...(subjectResources ?? []).map((resource) => resource.id));
        }

        const retrieved = await Promise.all(
          resourceIds.slice(0, 3).map(async (resourceId) => {
            const { data: chunks, error: chunkErr } = await supabase.rpc("match_document_chunks", {
              _resource_id: resourceId,
              _query: lastUserMessage,
              _limit: body.resourceContext?.id ? 4 : 2,
            });
            if (chunkErr) {
              console.error("match_document_chunks error", chunkErr);
              return [];
            }
            return chunks ?? [];
          }),
        );
        const passages = retrieved.flat().slice(0, 6);
        if (passages.length) {
          const context = passages
            .map(
              (c: { chunk_index: number; content: string }) =>
                `[Excerpt ${c.chunk_index + 1}] ${c.content}`,
            )
            .join("\n\n");
          system += `\n\nRelevant excerpts from the NesAI Vault are provided below. Use them to ground curriculum-specific explanations. Distinguish the supplied source from your explanation, and clearly say when these excerpts do not answer the question. Do not invent content from a paper you cannot see.\n\n${context}`;
        }

        // 4. Call the configured AI gateway
        const gateway = createAiGateway(gatewayKey, process.env.AI_GATEWAY_BASE_URL);

        try {
          const result = streamText({
            model: gateway(MODEL_ID),
            system,
            messages: body.messages as ModelMessage[],
            onError: ({ error }) => {
              console.error("AI provider stream failed", error);
            },
            onFinish: async () => {
              // Failed provider requests do not consume the student's daily quota.
              if (!profile.is_premium) {
                const { error: quotaError } = await supabase
                  .from("profiles")
                  .update({ daily_tokens: dailyTokens + 1 })
                  .eq("id", userId);
                if (quotaError) console.error("Study Desk quota update failed", quotaError);
              }
            },
          });
          const stream = new ReadableStream<string>({
            async start(controller) {
              try {
                for await (const textPart of result.textStream) controller.enqueue(textPart);
              } catch (error) {
                console.error("AI provider stream failed", error);
                controller.enqueue(`${STREAM_ERROR_MARKER}${getProviderErrorMessage(error)}`);
              } finally {
                controller.close();
              }
            },
          });
          return new Response(stream.pipeThrough(new TextEncoderStream()), {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (err: unknown) {
          console.error("AI gateway error", err);
          const status =
            typeof err === "object" && err !== null && "statusCode" in err
              ? Number(err.statusCode)
              : 500;
          if (status === 429) {
            return new Response(
              JSON.stringify({
                error: "The AI provider is busy. Please try again shortly.",
                reason: "provider_rate",
              }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }
          if (status === 402) {
            return Response.json(
              { error: "The AI provider account has run out of credits." },
              { status: 402 },
            );
          }
          if (status === 401 || status === 403) {
            return Response.json(
              { error: "The AI provider rejected its API key. Check the key in Vercel settings." },
              { status: 502 },
            );
          }
          if (status === 404) {
            return Response.json(
              {
                error: `The AI model “${MODEL_ID}” was not found. Check AI_GATEWAY_MODEL in Vercel.`,
              },
              { status: 502 },
            );
          }
          return Response.json(
            { error: "The AI provider could not answer this request. Please try again shortly." },
            { status: 502 },
          );
        }
      },
    },
  },
});
