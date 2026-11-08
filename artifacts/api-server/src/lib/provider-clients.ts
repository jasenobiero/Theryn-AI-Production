import { getAuth } from "@clerk/express";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  userSettingsTable,
  type UserSettings,
} from "@workspace/db";
import {
  createOpenAIClient,
} from "@workspace/integrations-openai-ai-server";
import {
  createAnthropicClient,
} from "@workspace/integrations-anthropic-ai";
import {
  createOpenRouterClient,
} from "@workspace/integrations-openrouter-ai";

type ProviderKey = keyof Pick<
  UserSettings,
  "openaiApiKey" | "anthropicApiKey" | "openrouterApiKey" | "elevenlabsApiKey"
>;

const PLATFORM_KEY_ENV: Record<ProviderKey, readonly string[]> = {
  openaiApiKey: ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"],
  anthropicApiKey: ["ANTHROPIC_API_KEY", "AI_INTEGRATIONS_ANTHROPIC_API_KEY"],
  openrouterApiKey: ["OPENROUTER_API_KEY", "AI_INTEGRATIONS_OPENROUTER_API_KEY"],
  elevenlabsApiKey: ["ELEVENLABS_API_KEY"],
};

function isConfiguredKey(value: string | null | undefined): value is string {
  return Boolean(value?.trim() && !/^(your-|replace-with-|not-configured)/i.test(value.trim()));
}

function getPlatformKey(key: ProviderKey): string | undefined {
  return PLATFORM_KEY_ENV[key]
    .map(name => process.env[name]?.trim())
    .find(isConfiguredKey);
}

async function getUserSettings(req: Request): Promise<UserSettings | null> {
  const userId = getAuth(req).userId;
  if (!userId) return null;
  const [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  return settings ?? null;
}

export async function getProviderKey(req: Request, key: ProviderKey): Promise<string | undefined> {
  const platformKey = getPlatformKey(key);
  try {
    const settings = await getUserSettings(req);
    const value = settings?.[key];
    return isConfiguredKey(value) ? value.trim() : platformKey;
  } catch (error) {
    if (platformKey) return platformKey;
    throw error;
  }
}

export async function getOpenAIClientForRequest(req: Request) {
  return createOpenAIClient(await getProviderKey(req, "openaiApiKey"));
}

export async function getAnthropicClientForRequest(req: Request) {
  return createAnthropicClient(await getProviderKey(req, "anthropicApiKey"));
}

export async function getOpenRouterClientForRequest(req: Request) {
  return createOpenRouterClient(await getProviderKey(req, "openrouterApiKey"));
}