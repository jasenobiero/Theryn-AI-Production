export const OPENROUTER_MODELS = [
  "openrouter/free",
  "x-ai/grok-4.3",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-coder",
] as const;

const OPENROUTER_MODEL_ALIASES: Record<string, string> = {
  "meta-llama/llama-3-70b-instruct": "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct": "meta-llama/llama-3.3-70b-instruct",
};

export function normalizeOpenRouterModel(model?: string | null): string {
  if (typeof model !== "string") {
    return OPENROUTER_MODELS[0];
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return OPENROUTER_MODELS[0];
  }

  return OPENROUTER_MODEL_ALIASES[trimmed] ?? trimmed;
}

export function isVisionCapableOpenRouterModel(model?: string | null): boolean {
  const normalized = normalizeOpenRouterModel(model);
  return new Set([
    "google/gemini-2.5-pro",
    "openai/gpt-4o",
    "openai/gpt-4-vision-preview",
    "anthropic/claude-3-5-sonnet",
    "anthropic/claude-sonnet-4-6",
  ]).has(normalized);
}

