const API = process.env.THERYN_API_URL ?? "http://localhost:80";

export type Provider = "openai" | "anthropic" | "openrouter";

interface ConvEntry { id: number; provider: Provider }
const sessions = new Map<string, ConvEntry>();

function sessionKey(platform: string, userId: string, provider: Provider) {
  return `${platform}:${userId}:${provider}`;
}

async function createConversation(provider: Provider, title: string): Promise<number> {
  const url = `${API}/api/${provider}/conversations`;
  const body: Record<string, string> = { title };
  if (provider === "openrouter") body.model = "x-ai/grok-4.3";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    const id = await createConversation(provider, title);
    entry = { id, provider };
    sessions.set(key, entry);
  }

  const res = await fetch(`${API}/api/${provider}/conversations/${entry.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    if (res.status === 404) {
      sessions.delete(key);
      const title = `${platform} — ${userName ?? userId}`;
      const id = await createConversation(provider, title);
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

export async function generateImage(prompt: string): Promise<Buffer> {
  const res = await fetch(`${API}/api/openai/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Image API error: ${res.status}`);
  const data = await res.json() as { b64_json: string };
  return Buffer.from(data.b64_json, "base64");
}

export async function tts(text: string): Promise<Buffer | null> {
  const res = await fetch(`${API}/api/elevenlabs/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { audio?: string };
  if (!data.audio) return null;
  return Buffer.from(data.audio, "base64");
}

export async function scanAccount(platform: string, handle: string): Promise<string> {
  const summaryRes = await chat(
    "bot", "shield-scan", "openai",
    `Do a quick security threat summary for a ${platform} account with handle @${handle}. ` +
    `List the top 3 risks and top 3 recommendations. Be concise (under 300 words). ` +
    `Format with emoji bullets.`
  );
  return summaryRes;
}
