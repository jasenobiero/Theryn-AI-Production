import OpenAI from "openai";

const defaultApiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "not-configured";
const defaultBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";

export function createOpenAIClient(apiKey = defaultApiKey) {
  return new OpenAI({ apiKey, baseURL: defaultBaseUrl });
}

export const openai = createOpenAIClient();
