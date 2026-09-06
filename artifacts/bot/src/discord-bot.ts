import {
  Client, GatewayIntentBits, Events, AttachmentBuilder,
  REST, Routes, SlashCommandBuilder, PermissionFlagsBits,
  type Message, type ChatInputCommandInteraction,
} from "discord.js";
import { chat, generateImage, tts, scanAccount, resetAll, type Provider } from "./theryn-client.js";

const PROVIDER_NAMES: Record<Provider, string> = {
  openai: "Theryn",
  anthropic: "Vesper",
  openrouter: "Prism",
};

const SLASH_COMMANDS = [
  new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("DM all server members the same message (admin only)")
    .addStringOption(opt =>
      opt.setName("message")
        .setDescription("The message to send to every member")
        .setRequired(true)
        .setMaxLength(1800)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
];

function splitText(text: string, limit = 1990): string[] {
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

async function handleBroadcast(interaction: ChatInputCommandInteraction, token: string) {
  const message = interaction.options.getString("message", true);
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    return;
  }

  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "❌ You need Administrator permission to use this command.", ephemeral: true });
    return;
  }

  await interaction.reply({ content: "📡 Fetching members...", ephemeral: true });

  let allMembers;
  try {
    allMembers = await guild.members.fetch();
  } catch {
    await interaction.editReply("❌ Failed to fetch members. Make sure the bot has the **Server Members Intent** enabled in the Discord Developer Portal.");
    return;
  }

  const targets = [...allMembers.values()].filter(m => !m.user.bot);
  const total = targets.length;

  await interaction.editReply(`📨 Broadcasting to **${total}** members... (0/${total})`);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    try {
      await m.send(`📢 **Message from ${guild.name}:**\n\n${message}`);
      sent++;
    } catch {
      failed++;
    }

    // Update progress every 10 members or on the last one
    if ((i + 1) % 10 === 0 || i === targets.length - 1) {
      await interaction.editReply(
        `📨 Broadcasting... (${i + 1}/${total})\n✅ Sent: ${sent} | ❌ Failed: ${failed}`
      ).catch(() => {});
    }

    // Rate limit: ~1 DM every 300ms to stay under Discord limits
    await new Promise(res => setTimeout(res, 300));
  }

  await interaction.editReply(
    `✅ **Broadcast complete!**\n\n` +
    `📨 Total members: **${total}**\n` +
    `✅ Successfully sent: **${sent}**\n` +
    `❌ Failed (DMs closed): **${failed}**`
  );

  console.log(`[Discord] Broadcast complete — ${sent}/${total} sent, ${failed} failed`);
}

export function startDiscord(token: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once(Events.ClientReady, async c => {
    console.log(`[Discord] Logged in as ${c.user.tag}`);
    c.user.setActivity("THERYN Shield — AI Command Center");

    // Register slash commands on all guilds
    const rest = new REST({ version: "10" }).setToken(token);
    for (const guild of c.guilds.cache.values()) {
      try {
        await rest.put(Routes.applicationGuildCommands(c.user.id, guild.id), { body: SLASH_COMMANDS });
        console.log(`[Discord] Slash commands registered in: ${guild.name}`);
      } catch (err) {
        console.error(`[Discord] Failed to register commands in ${guild.name}:`, (err as Error).message);
      }
    }
  });

  // Handle slash command interactions
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "broadcast") {
      await handleBroadcast(interaction, token);
    }
  });

  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    const content = msg.content.trim();
    if (!content.startsWith("!")) return;

    const [rawCmd, ...args] = content.slice(1).trim().split(/\s+/);
    const cmd = rawCmd.toLowerCase();
    const rest = args.join(" ").trim();
    const uid = msg.author.id;
    const uname = msg.author.username;
    const platform = "discord";

    // ── Help ──
    if (cmd === "help" || cmd === "h") {
      await msg.reply([
        "**⚡ THERYN Bot — Commands**",
        "",
        "**Chat**",
        "`!theryn <msg>` or `!t` — Theryn (GPT-4o)",
        "`!vesper <msg>` or `!v` — Vesper (Claude)",
        "`!prism <msg>` or `!p` — Prism (Grok)",
        "`!ai <msg>` — Quick Theryn chat",
        "",
        "**Create**",
        "`!image <prompt>` or `!img` — Generate image",
        "`!voice <text>` — Text-to-speech audio",
        "",
        "**Shield**",
        "`!scan <platform> <handle>` — AI security scan",
        "",
        "**Broadcast** *(Admin only)*",
        "`/broadcast message:<text>` — DM all server members",
        "",
        "**Session**",
        "`!new` — Clear conversation history",
        "",
        "*Example: `!theryn explain quantum computing`*",
      ].join("\n"));
      return;
    }

    // ── New session ──
    if (cmd === "new") {
      resetAll(platform, uid);
      await msg.reply("🗑️ Conversation cleared. Starting fresh!");
      return;
    }

    // ── Image generation ──
    if (cmd === "image" || cmd === "img") {
      if (!rest) { await msg.reply("❌ Provide a prompt: `!image a red dragon in space`"); return; }
      const thinking = await msg.reply("🎨 Generating image...");
      try {
        const buf = await generateImage(rest);
        const att = new AttachmentBuilder(buf, { name: "theryn-image.png" });
        await thinking.edit({ content: `🎨 **Generated:** ${rest}`, files: [att] });
      } catch (e) {
        await thinking.edit("❌ Image generation failed. Check your THERYN config.");
      }
      return;
    }

    // ── TTS ──
    if (cmd === "voice" || cmd === "tts") {
      if (!rest) { await msg.reply("❌ Provide text: `!voice Hello world`"); return; }
      const thinking = await msg.reply("🎙️ Generating voice...");
      try {
        const buf = await tts(rest);
        if (!buf) { await thinking.edit("❌ Voice failed — ElevenLabs key not configured."); return; }
        const att = new AttachmentBuilder(buf, { name: "theryn-voice.mp3" });
        await thinking.edit({ content: "🎙️ **Voice:**", files: [att] });
      } catch {
        await thinking.edit("❌ Voice generation failed.");
      }
      return;
    }

    // ── Shield scan ──
    if (cmd === "scan" || cmd === "shield") {
      const [plat, handle] = args;
      if (!plat || !handle) {
        await msg.reply("❌ Usage: `!scan <platform> <handle>` — e.g. `!scan instagram myuser`");
        return;
      }
      const thinking = await msg.reply(`🔍 Scanning **${plat}** @${handle}...`);
      try {
        const result = await scanAccount(plat, handle);
        await thinking.edit(`🛡️ **Shield Scan — ${plat} @${handle}**\n\n${result}`);
      } catch {
        await thinking.edit("❌ Scan failed.");
      }
      return;
    }

    // ── AI chat ──
    let provider: Provider | null = null;
    let message = rest;

    if (cmd === "theryn" || cmd === "t") { provider = "openai"; }
    else if (cmd === "vesper" || cmd === "v") { provider = "anthropic"; }
    else if (cmd === "prism" || cmd === "p") { provider = "openrouter"; }
    else if (cmd === "ai" || cmd === "chat" || cmd === "ask") { provider = "openai"; }

    if (!provider) return;
    if (!message) { await msg.reply(`❌ Provide a message: \`!${cmd} hello\``); return; }

    const thinking = await msg.reply(`⚡ **${PROVIDER_NAMES[provider]}** thinking...`);
    try {
      const response = await chat(platform, uid, provider, message, uname);
      const label = `**${PROVIDER_NAMES[provider]}:**\n`;
      const parts = splitText(label + response);
      await thinking.edit(parts[0]);
      for (let i = 1; i < parts.length; i++) await msg.channel.send(parts[i]);
    } catch (e) {
      await thinking.edit(`❌ Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  });

  client.login(token).catch(err => {
    console.error("[Discord] Login failed:", err.message);
  });

  return client;
}
