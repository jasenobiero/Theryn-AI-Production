import { App } from "@slack/bolt";
import { chat, generateImage, tts, scanAccount, resetAll, type Provider } from "./theryn-client.js";

const PROVIDER_NAMES: Record<Provider, string> = {
  openai: "Theryn",
  anthropic: "Vesper",
  openrouter: "Prism",
};

function splitText(text: string, limit = 3000): string[] {
  const chunks: string[] = [];
  while (text.length > limit) {
    const idx = text.lastIndexOf("\n", limit);
    const cut = idx > 0 ? idx : limit;
    chunks.push(text.slice(0, cut));
    text = text.slice(cut).trim();
  }
  if (text) chunks.push(text);
  return chunks;
}

async function handleChat(
  say: (text: string) => Promise<unknown>,
  client: App["client"],
  channel: string,
  userId: string,
  provider: Provider,
  message: string,
) {
  const thinkingRes = await client.chat.postMessage({
    channel,
    text: `⚡ *${PROVIDER_NAMES[provider]}* thinking...`,
    mrkdwn: true,
  });
  const ts = thinkingRes.ts as string;

  try {
    const response = await chat("slack", userId, provider, message);
    const parts = splitText(`*${PROVIDER_NAMES[provider]}:*\n\n${response}`);
    await client.chat.update({ channel, ts, text: parts[0] });
    for (let i = 1; i < parts.length; i++) {
      await client.chat.postMessage({ channel, text: parts[i] });
    }
  } catch (e) {
    await client.chat.update({ channel, ts, text: `❌ Error: ${e instanceof Error ? e.message : "Unknown"}` });
  }
}

export function startSlack(botToken: string, appToken: string) {
  const app = new App({
    token: botToken,
    appToken,
    socketMode: true,
  });

  app.message("!help", async ({ say }) => {
    await say([
      "⚡ *THERYN Slack Commands*",
      "",
      "Mention me or use these prefixes:",
      "`!theryn <msg>` — Theryn (OpenAI)",
      "`!vesper <msg>` — Vesper (Anthropic)",
      "`!prism <msg>` — Prism (OpenRouter)",
      "`!image <prompt>` — Generate image",
      "`!voice <text>` — Text-to-speech",
      "`!scan <platform> <handle>` — General safety guidance, not a profile scan",
      "`!new` — Start a new conversation (previous chats remain saved)",
      "",
      "_Or just @mention me with any message!_",
    ].join("\n"));
  });

  app.message(/^!new\b/, async ({ message, client }) => {
    const msg = message as { channel: string; user?: string };
    if (!msg.user) return;
    resetAll("slack", msg.user);
    await client.chat.postMessage({ channel: msg.channel, text: "Started a new conversation. Earlier chats remain saved in THERYN." });
  });

  app.message(/^!image\s+(.+)/i, async ({ message, client, context }) => {
    const msg = message as { channel: string; user?: string };
    const prompt = (context.matches?.[1] as string)?.trim();
    if (!prompt || !msg.user) return;
    const res = await client.chat.postMessage({ channel: msg.channel, text: "🎨 Generating image..." });
    try {
      const buf = await generateImage(prompt, "slack", msg.user);
      await client.files.uploadV2({
        channel_id: msg.channel,
        file: buf,
        filename: "theryn-image.png",
        title: `THERYN Image: ${prompt}`,
      });
      await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: `🎨 *Generated:* ${prompt}` });
    } catch {
      await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: "❌ Image generation failed." });
    }
  });

  app.message(/^!voice\s+(.+)/i, async ({ message, client, context }) => {
    const msg = message as { channel: string; user?: string };
    const text = (context.matches?.[1] as string)?.trim();
    if (!text || !msg.user) return;
    const res = await client.chat.postMessage({ channel: msg.channel, text: "🎙️ Generating voice..." });
    try {
      const buf = await tts(text, "slack", msg.user);
      if (!buf) { await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: "❌ ElevenLabs not configured." }); return; }
      await client.files.uploadV2({
        channel_id: msg.channel,
        file: buf,
        filename: "theryn-voice.mp3",
        title: "THERYN Voice",
      });
      await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: "🎙️ Voice sent!" });
    } catch {
      await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: "❌ Voice failed." });
    }
  });

  app.message(/^!scan\s+(\S+)\s+(\S+)/i, async ({ message, client, context }) => {
    const msg = message as { channel: string; user?: string };
    const plat = (context.matches?.[1] as string)?.trim();
    const handle = (context.matches?.[2] as string)?.trim();
    if (!plat || !handle || !msg.user) return;
    const res = await client.chat.postMessage({ channel: msg.channel, text: `📝 Preparing general safety guidance for *${plat}* @${handle} (no profile scan)...` });
    try {
      const result = await scanAccount(plat, handle, "slack", msg.user);
      const parts = splitText(`🛡️ *General guidance — ${plat} @${handle}*\n\n${result}`);
      await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: parts[0] });
      for (let i = 1; i < parts.length; i++) {
        await client.chat.postMessage({ channel: msg.channel, text: parts[i] });
      }
    } catch {
      await client.chat.update({ channel: msg.channel, ts: res.ts as string, text: "❌ Could not generate general guidance." });
    }
  });

  app.message(/^!theryn\s+(.+)/i, async ({ message, client, context }) => {
    const msg = message as { channel: string; user?: string };
    const text = (context.matches?.[1] as string)?.trim();
    if (!text || !msg.user) return;
    await handleChat(async t => { await client.chat.postMessage({ channel: msg.channel, text: t }); }, client, msg.channel, msg.user, "openai", text);
  });

  app.message(/^!vesper\s+(.+)/i, async ({ message, client, context }) => {
    const msg = message as { channel: string; user?: string };
    const text = (context.matches?.[1] as string)?.trim();
    if (!text || !msg.user) return;
    await handleChat(async t => { await client.chat.postMessage({ channel: msg.channel, text: t }); }, client, msg.channel, msg.user, "anthropic", text);
  });

  app.message(/^!prism\s+(.+)/i, async ({ message, client, context }) => {
    const msg = message as { channel: string; user?: string };
    const text = (context.matches?.[1] as string)?.trim();
    if (!text || !msg.user) return;
    await handleChat(async t => { await client.chat.postMessage({ channel: msg.channel, text: t }); }, client, msg.channel, msg.user, "openrouter", text);
  });

  app.event("app_mention", async ({ event, client }) => {
    const text = event.text.replace(/<@[^>]+>\s*/g, "").trim();
    if (!text) { await client.chat.postMessage({ channel: event.channel, text: "Hi! Use `!help` to see what I can do." }); return; }
    await handleChat(async t => { await client.chat.postMessage({ channel: event.channel, text: t }); }, client, event.channel, event.user ?? "unknown", "openai", text);
  });

  app.start().then(() => {
    console.log("[Slack] Bot started with Socket Mode");
  }).catch(err => {
    console.error("[Slack] Start failed:", err.message);
  });

  return app;
}
