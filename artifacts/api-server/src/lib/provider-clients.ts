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
  const settings = await getUserSettings(req);
  const value = settings?.[key];
  return value && value.trim() ? value.trim() : undefined;
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