import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Points at any OpenAI-compatible chat completions endpoint — OpenAI itself,
// OpenRouter, Groq, a self-hosted vLLM/Ollama instance, etc. Set AI_GATEWAY_BASE_URL
// and AI_GATEWAY_API_KEY in your environment. Defaults to OpenAI's API if unset.
export function createAiGateway(apiKey: string, baseURL = "https://api.openai.com/v1") {
  return createOpenAICompatible({
    name: "ai-gateway",
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
