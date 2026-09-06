import { Telegraf, type Context } from "telegraf";
import { chat, generateImage, tts, scanAccount, resetAll, type Provider } from "./theryn-client.js";

const PROVIDER_NAMES: Record<Provider, string> = {
  openai: "Theryn",
  anthropic: "Vesper",
  openrouter: "Prism",
};

function splitText(text: string, limit = 4000): string[] {
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

async function sendLong(ctx: Context, text: string) {
  const parts = splitText(text);
  for (const part of parts) {
    await ctx.reply(part, { parse_mode: "Markdown" });
  }
}

async function handleChat(ctx: Context, provider: Provider, message: string) {
  if (!message.trim()) {
    await ctx.reply(`❌ Provide a message after the command.`);
    return;
  }
  const uid = String(ctx.from?.id ?? "unknown");
  const uname = ctx.from?.username ?? ctx.from?.first_name ?? uid;
  const thinking = await ctx.reply(`⚡ *${PROVIDER_NAMES[provider]}* thinking\\.\\.\\.`, { parse_mode: "MarkdownV2" });
  try {
    const response = await chat("telegram", uid, provider, message, uname);
    await ctx.telegram.editMessageText(
      thinking.chat.id, thinking.message_id, undefined,
      `*${PROVIDER_NAMES[provider]}:*\n\n${response}`,
      { parse_mode: "Markdown" }
    );
  } catch {
    const uid2 = String(ctx.from?.id ?? "unknown");
    const uname2 = ctx.from?.username ?? ctx.from?.first_name ?? uid2;
    const response = await chat("telegram", uid2, provider, message, uname2).catch(() => "Error");
    await sendLong(ctx, `*${PROVIDER_NAMES[provider]}:*\n\n${response}`);
  }
}

export function startTelegram(token: string) {
  const bot = new Telegraf(token);

  bot.start(ctx => ctx.reply(
    "⚡ *THERYN Bot — AI Command Center*\n\n" +
    "Commands:\n" +
    "/theryn \\<msg\\> — Theryn \\(GPT\\-4o\\)\n" +
    "/vesper \\<msg\\> — Vesper \\(Claude\\)\n" +
    "/prism \\<msg\\> — Prism \\(Grok\\)\n" +
    "/image \\<prompt\\> — Generate image\n" +
    "/voice \\<text\\> — Text\\-to\\-speech\n" +
    "/scan \\<platform\\> \\<handle\\> — Security scan\n" +
    "/new — Clear conversation\n\n" +
    "_Send any message without a command to chat with Theryn_",
    { parse_mode: "MarkdownV2" }
  ));

  bot.help(ctx => ctx.reply(
    "⚡ *THERYN Commands*\n\n" +
    "/theryn \\<msg\\> — Chat with Theryn \\(OpenAI GPT\\-4o\\)\n" +
    "/vesper \\<msg\\> — Chat with Vesper \\(Anthropic Claude\\)\n" +
    "/prism \\<msg\\> — Chat with Prism \\(OpenRouter Grok\\)\n" +
    "/image \\<prompt\\> — Generate an image\n" +
    "/voice \\<text\\> — Text to speech\n" +
    "/scan \\<platform\\> \\<handle\\> — AI security scan\n" +
    "/new — Clear all conversations",
    { parse_mode: "MarkdownV2" }
  ));

  bot.command("new", async ctx => {
    resetAll("telegram", String(ctx.from.id));
    await ctx.reply("🗑️ Conversation cleared\\. Starting fresh\\!", { parse_mode: "MarkdownV2" });
  });

  bot.command("theryn", ctx => handleChat(ctx, "openai", ctx.message.text.replace(/^\/theryn\s*/i, "")));
  bot.command("t", ctx => handleChat(ctx, "openai", ctx.message.text.replace(/^\/t\s*/i, "")));
  bot.command("vesper", ctx => handleChat(ctx, "anthropic", ctx.message.text.replace(/^\/vesper\s*/i, "")));
  bot.command("v", ctx => handleChat(ctx, "anthropic", ctx.message.text.replace(/^\/v\s*/i, "")));
  bot.command("prism", ctx => handleChat(ctx, "openrouter", ctx.message.text.replace(/^\/prism\s*/i, "")));
  bot.command("p", ctx => handleChat(ctx, "openrouter", ctx.message.text.replace(/^\/p\s*/i, "")));
  bot.command("ai", ctx => handleChat(ctx, "openai", ctx.message.text.replace(/^\/ai\s*/i, "")));

  bot.command("image", async ctx => {
    const prompt = ctx.message.text.replace(/^\/image\s*/i, "").trim();
    if (!prompt) { await ctx.reply("❌ Provide a prompt: `/image a red dragon in space`", { parse_mode: "Markdown" }); return; }
    const thinking = await ctx.reply("🎨 Generating image...");
    try {
      const buf = await generateImage(prompt);
      await ctx.replyWithPhoto({ source: buf }, { caption: `🎨 ${prompt}` });
      await ctx.telegram.deleteMessage(thinking.chat.id, thinking.message_id);
    } catch {
      await ctx.telegram.editMessageText(thinking.chat.id, thinking.message_id, undefined, "❌ Image generation failed.");
    }
  });

  bot.command("voice", async ctx => {
    const text = ctx.message.text.replace(/^\/voice\s*/i, "").trim();
    if (!text) { await ctx.reply("❌ Provide text: `/voice Hello world`", { parse_mode: "Markdown" }); return; }
    const thinking = await ctx.reply("🎙️ Generating voice...");
    try {
      const buf = await tts(text);
      if (!buf) { await ctx.telegram.editMessageText(thinking.chat.id, thinking.message_id, undefined, "❌ ElevenLabs key not configured."); return; }
      await ctx.replyWithAudio({ source: buf, filename: "theryn-voice.mp3" });
      await ctx.telegram.deleteMessage(thinking.chat.id, thinking.message_id);
    } catch {
      await ctx.telegram.editMessageText(thinking.chat.id, thinking.message_id, undefined, "❌ Voice generation failed.");
    }
  });

  bot.command("scan", async ctx => {
    const parts = ctx.message.text.replace(/^\/scan\s*/i, "").trim().split(/\s+/);
    const [plat, handle] = parts;
    if (!plat || !handle) { await ctx.reply("❌ Usage: `/scan instagram myuser`", { parse_mode: "Markdown" }); return; }
    const thinking = await ctx.reply(`🔍 Scanning *${plat}* @${handle}...`, { parse_mode: "Markdown" });
    try {
      const result = await scanAccount(plat, handle);
      await ctx.telegram.editMessageText(thinking.chat.id, thinking.message_id, undefined,
        `🛡️ *Shield Scan — ${plat} @${handle}*\n\n${result}`, { parse_mode: "Markdown" });
    } catch {
      await ctx.telegram.editMessageText(thinking.chat.id, thinking.message_id, undefined, "❌ Scan failed.");
    }
  });

  bot.on("text", async ctx => {
    if (ctx.message.text.startsWith("/")) return;
    await handleChat(ctx, "openai", ctx.message.text);
  });

  bot.launch().then(() => {
    console.log("[Telegram] Bot started with long polling");
  }).catch(err => {
    console.error("[Telegram] Launch failed:", err.message);
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  return bot;
}
