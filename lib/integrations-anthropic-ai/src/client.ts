import Anthropic from "@anthropic-ai/sdk";

const defaultApiKey = process.env.ANTHROPIC_API_KEY ?? process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "not-configured";
const defaultBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";

export function createAnthropicClient(apiKey = defaultApiKey) {
  return new Anthropic({ apiKey, baseURL: defaultBaseUrl });
}

export const anthropic = createAnthropicClient();
