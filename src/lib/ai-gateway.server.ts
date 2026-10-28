import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export type AiProviderConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  provider: "gemini" | "groq" | "openai" | "compatible";
};

/** Resolve a provider and its matching endpoint so a key cannot silently hit the wrong API. */
export function resolveAiProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderConfig | null {
  const overrideKey = env.AI_GATEWAY_API_KEY?.trim();
  const groqKey = env.GROQ_API_KEY?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  const modelOverride = env.AI_GATEWAY_MODEL?.trim();
  const baseUrlOverride = env.AI_GATEWAY_BASE_URL?.trim();

  if (groqKey) {
    return {
      apiKey: groqKey,
      baseURL: baseUrlOverride || GROQ_BASE_URL,
      model: modelOverride || "openai/gpt-oss-20b",
      provider: "groq",
    };
  }
  if (overrideKey) {
    return {
      apiKey: overrideKey,
      baseURL: baseUrlOverride || OPENAI_BASE_URL,
      model: modelOverride || "gpt-5.4-mini",
      provider: "compatible",
    };
  }
  if (geminiKey) {
    return {
      apiKey: geminiKey,
      baseURL: baseUrlOverride || GEMINI_OPENAI_BASE_URL,
      model: modelOverride || "gemini-3.8-flash",
      provider: "gemini",
    };
  }
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      baseURL: baseUrlOverride || OPENAI_BASE_URL,
      model: modelOverride || "gpt-5.4-mini",
      provider: "openai",
    };
  }
  return null;
}

// Create a model client after resolveAiProviderConfig pairs credentials with the right endpoint.
export function createAiGateway(
  apiKey: string,
  baseURL = OPENAI_BASE_URL,
  options: { supportsStructuredOutputs?: boolean } = {},
) {
  return createOpenAICompatible({
    name: "ai-gateway",
    baseURL,
    supportsStructuredOutputs: options.supportsStructuredOutputs ?? false,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
