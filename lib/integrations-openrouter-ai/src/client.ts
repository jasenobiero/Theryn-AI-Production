import OpenAI from "openai";

const defaultApiKey = process.env.OPENROUTER_API_KEY ?? process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY ?? "not-configured";
const defaultBaseUrl = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export function createOpenRouterClient(apiKey = defaultApiKey) {
  return new OpenAI({ baseURL: defaultBaseUrl, apiKey });
}

export const openrouter = createOpenRouterClient();
