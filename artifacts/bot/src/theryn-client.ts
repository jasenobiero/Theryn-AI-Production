const API = process.env.THERYN_API_URL ?? "http://localhost:80";
const SERVICE_TOKEN = process.env.THERYN_BOT_API_TOKEN;
const SCAN_GUIDANCE_PLATFORMS = new Set([
  "tiktok", "instagram", "youtube", "twitter", "discord", "discord_server",
  "reddit", "facebook", "linkedin", "twitch", "snapchat", "github", "telegram", "spotify",
]);

export type Provider = "openai" | "anthropic" | "openrouter";

interface ConvEntry { id: number; provider: Provider }
const sessions = new Map<string, ConvEntry>();

function sessionKey(platform: string, userId: string, provider: Provider) {
  return `${platform}:${userId}:${provider}`;
}

function authHeaders(platform: string, userId: string): Record<string, string> {
  if (!SERVICE_TOKEN) throw new Error("THERYN_BOT_API_TOKEN must be configured");
  if (!/^(discord|telegram|slack)$/.test(platform) || !/^[A-Za-z0-9._-]{1,128}$/.test(userId)) {
    throw new Error("Invalid bot user identity");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_TOKEN}`,
    "X-Theryn-User-Id": `bot:${platform}:${userId}`,
  };
}

async function createConversation(provider: Provider, title: string, platform: string, userId: string): Promise<number> {
  const url = `${API}/api/${provider}/conversations`;
  const body: Record<string, string> = { title };
  if (provider === "openrouter") body.model = "x-ai/grok-4.3";
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(platform, userId),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
  const data = await res.json() as { id: number };
  return data.id;
}

export async function chat(
  platform: string,
  userId: string,
  provider: Provider,
  content: string,
  userName?: string,
): Promise<string> {
  const key = sessionKey(platform, userId, provider);
  let entry = sessions.get(key);

  if (!entry) {
    const title = `${platform} — ${userName ?? userId}`;
    const id = await createConversation(provider, title, platform, userId);
    entry = { id, provider };
    sessions.set(key, entry);
  }

  const res = await fetch(`${API}/api/${provider}/conversations/${entry.id}/messages`, {
    method: "POST",
    headers: authHeaders(platform, userId),
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    if (res.status === 404) {
      sessions.delete(key);
      const title = `${platform} — ${userName ?? userId}`;
      const id = await createConversation(provider, title, platform, userId);
      sessions.set(key, { id, provider });
      return chat(platform, userId, provider, content, userName);
    }
    throw new Error(`API error: ${res.status}`);
  }

  const text = await res.text();
  let full = "";
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const raw = line.slice(6).trim();
    if (!raw || raw === "[DONE]") continue;
    try {
      const d = JSON.parse(raw) as { content?: string; done?: boolean };
      if (d.content) full += d.content;
    } catch { /* skip */ }
  }
  return full.trim() || "*(no response)*";
}

export function resetSession(platform: string, userId: string, provider: Provider) {
  sessions.delete(sessionKey(platform, userId, provider));
}

export function resetAll(platform: string, userId: string) {
  for (const p of ["openai", "anthropic", "openrouter"] as Provider[]) {
    sessions.delete(sessionKey(platform, userId, p));
  }
}

export async function generateImage(prompt: string, platform: string, userId: string): Promise<Buffer> {
  const res = await fetch(`${API}/api/openai/generate-image`, {
    method: "POST",
    headers: authHeaders(platform, userId),
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Image API error: ${res.status}`);
  const data = await res.json() as { b64_json: string };
  return Buffer.from(data.b64_json, "base64");
}

export async function tts(text: string, platform: string, userId: string): Promise<Buffer | null> {
  const res = await fetch(`${API}/api/elevenlabs/tts`, {
    method: "POST",
    headers: authHeaders(platform, userId),
    body: JSON.stringify({ text }),
  });
  if (res.status === 503) return null;
  if (!res.ok) throw new Error(`Voice API error: ${res.status}`);
  const data = await res.json() as { audio?: string };
  if (!data.audio) return null;
  return Buffer.from(data.audio, "base64");
}

export async function scanAccount(
  platform: string,
  handle: string,
  requesterPlatform: string,
  requesterId: string,
): Promise<string> {
  const normalizedPlatform = platform.trim().toLowerCase();
  const normalizedHandle = handle.trim().replace(/^@/, "");
  if (!SCAN_GUIDANCE_PLATFORMS.has(normalizedPlatform)) {
    throw new Error("Unsupported platform. Use a platform listed in Social Shield.");
  }
  if (!normalizedHandle || normalizedHandle.length > 200 || /[\u0000-\u001f\u007f]/.test(normalizedHandle)) {
    throw new Error("Handle must be 1-200 characters without control characters.");
  }
  const summaryRes = await chat(
    requesterPlatform, requesterId, "openai",
    `Give concise general account-safety guidance for users of ${normalizedPlatform}. ` +
    `This is not a request about any individual account. Do not claim to detect threats or state an account is secure or compromised. ` +
    `List up to 3 common platform risks and 3 practical recommendations. Keep under 300 words.`
  );
  return `General, unverified guidance only. The profile was not inspected and no monitoring was performed.\n\n${summaryRes}`;
}
