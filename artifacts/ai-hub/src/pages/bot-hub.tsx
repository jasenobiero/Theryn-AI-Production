import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot, CheckCircle2, XCircle, ExternalLink, Copy, ChevronDown, ChevronUp,
  Terminal, Zap, Image as ImageIcon, Mic, ShieldCheck, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  envVars: string[];
  steps: Array<{ title: string; description: string; link?: { label: string; url: string } }>;
  note?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "discord",
    name: "Discord",
    icon: "DS",
    color: "#e5e5e5",
    bg: "bg-white/10",
    envVars: ["DISCORD_BOT_TOKEN"],
    steps: [
      {
        title: "Create a Discord Application",
        description: "Go to the Discord Developer Portal and create a new application.",
        link: { label: "Discord Developer Portal", url: "https://discord.com/developers/applications" },
      },
      {
        title: "Create a Bot",
        description: 'In your application, go to "Bot" → "Add Bot". Enable "Message Content Intent" under Privileged Gateway Intents.',
      },
      {
        title: "Copy the token",
        description: 'Click "Reset Token" to reveal your bot token. Copy it.',
      },
      {
        title: "Set environment secret",
        description: 'In Replit Secrets, add DISCORD_BOT_TOKEN with your bot token value.',
      },
      {
        title: "Invite the bot to your server",
        description: 'Go to OAuth2 → URL Generator → select "bot" scope → permissions: Send Messages, Read Messages, Attach Files. Use the generated URL to invite.',
      },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: "TG",
    color: "#d4d4d4",
    bg: "bg-white/10",
    envVars: ["TELEGRAM_BOT_TOKEN"],
    steps: [
      {
        title: "Message @BotFather",
        description: "Open Telegram and search for @BotFather. Send /newbot.",
        link: { label: "Open @BotFather", url: "https://t.me/BotFather" },
      },
      {
        title: "Choose a name and username",
        description: "Follow the prompts — the username must end in 'bot' (e.g. TherynAIBot).",
      },
      {
        title: "Copy the token",
        description: "BotFather will give you a token like 123456:ABC-DEF... Copy it.",
      },
      {
        title: "Set environment secret",
        description: "In Replit Secrets, add TELEGRAM_BOT_TOKEN with your token.",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    icon: "SL",
    color: "#a3a3a3",
    bg: "bg-purple-500/10",
    envVars: ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN"],
    steps: [
      {
        title: "Create a Slack App",
        description: "Go to api.slack.com/apps and create a new app 'From scratch'.",
        link: { label: "Slack API", url: "https://api.slack.com/apps" },
      },
      {
        title: "Enable Socket Mode",
        description: 'In "Socket Mode", enable it and generate an App-Level Token with connections:write scope. Copy the xapp-... token.',
      },
      {
        title: "Add Bot OAuth scopes",
        description: 'In "OAuth & Permissions" → "Bot Token Scopes": add app_mentions:read, channels:history, chat:write, files:write.',
      },
      {
        title: "Enable Event Subscriptions",
        description: 'In "Event Subscriptions", enable it. Subscribe to: app_mention, message.channels.',
      },
      {
        title: "Install to workspace",
        description: 'Click "Install App to Workspace" and copy the Bot User OAuth Token (starts with xoxb-).',
      },
      {
        title: "Set environment secrets",
        description: "Add SLACK_BOT_TOKEN (xoxb-...) and SLACK_APP_TOKEN (xapp-...) in Replit Secrets.",
      },
    ],
    note: "Requires Socket Mode — no public URL needed.",
  },
];

const COMMANDS = [
  { cmd: "!theryn <message>",  alias: "!t",   desc: "Chat with Theryn (GPT-4o)",         icon: <Zap className="w-3.5 h-3.5 text-cyan-200" /> },
  { cmd: "!vesper <message>",  alias: "!v",   desc: "Chat with Vesper (Claude)",          icon: <Zap className="w-3.5 h-3.5 text-purple-400" /> },
  { cmd: "!prism <message>",   alias: "!p",   desc: "Chat with Prism (Grok)",             icon: <Zap className="w-3.5 h-3.5 text-blue-400" /> },
  { cmd: "!ai <message>",      alias: null,   desc: "Quick chat (defaults to Theryn)",    icon: <Bot className="w-3.5 h-3.5 text-white/40" /> },
  { cmd: "!image <prompt>",    alias: "!img", desc: "Generate an image with DALL-E",      icon: <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> },
  { cmd: "!voice <text>",      alias: "!tts", desc: "Text-to-speech audio (ElevenLabs)", icon: <Mic className="w-3.5 h-3.5 text-green-400" /> },
  { cmd: "!scan <plat> <user>",alias: null,   desc: "AI security scan (Social Shield)",  icon: <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> },
  { cmd: "!new",               alias: null,   desc: "Clear conversation history",         icon: <RefreshCw className="w-3.5 h-3.5 text-white/40" /> },
  { cmd: "!help",              alias: null,   desc: "Show all commands",                  icon: <Terminal className="w-3.5 h-3.5 text-white/40" /> },
];

function PlatformCard({ platform }: { platform: Platform }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const configured = platform.envVars.every(v => {
    return false;
  });

  const copySecret = (v: string) => {
    navigator.clipboard.writeText(v);
    toast({ title: `Copied "${v}" to clipboard`, description: "Paste this as the secret name in Replit Secrets." });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.07] overflow-hidden"
      style={{ background: "hsl(0 0% 8%)" }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-2xl">{platform.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-white">{platform.name}</h3>
            {platform.note && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/35 border border-white/[0.05]">
                {platform.note}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {platform.envVars.map(v => (
              <button
                key={v}
                onClick={e => { e.stopPropagation(); copySecret(v); }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/30 border border-white/[0.08] text-[10px] font-mono text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
              >
                <Copy className="w-2.5 h-2.5" />
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] px-2 py-1 rounded-full font-semibold border" style={{
            color: "#a3a3a3",
            background: "rgba(249,115,22,0.1)",
            borderColor: "rgba(249,115,22,0.2)",
          }}>
            Setup required
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.05]">
          <div className="pt-4 space-y-4">
            {platform.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white/60 border border-white/[0.1] mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80 mb-0.5">{step.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{step.description}</p>
                  {step.link && (
                    <a
                      href={step.link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-xs text-cyan-200 hover:text-cyan-100 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {step.link.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-xl border border-white/[0.06] bg-black/20">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Secret name{platform.envVars.length > 1 ? "s" : ""} to set</p>
            <div className="flex flex-wrap gap-2">
              {platform.envVars.map(v => (
                <button
                  key={v}
                  onClick={() => copySecret(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-300/10 border border-cyan-200/20 text-xs font-mono text-cyan-100 hover:bg-cyan-300/15 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function BotHubPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: "hsl(0 0% 4% / .48)" }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-6 h-6 text-cyan-200" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Bot Hub</h1>
        </div>
        <p className="text-sm text-white/35 max-w-xl">
          Deploy THERYN as a bot on Discord, Telegram, and Slack — it responds exactly like the web app, with full AI chat, image generation, voice TTS, and security scanning.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: <Zap className="w-5 h-5 text-cyan-200" />, label: "3 AI engines", sub: "Theryn · Vesper · Prism" },
          { icon: <ImageIcon className="w-5 h-5 text-orange-400" />, label: "Image Gen", sub: "DALL-E via !image" },
          { icon: <Mic className="w-5 h-5 text-green-400" />, label: "Voice TTS", sub: "ElevenLabs via !voice" },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06]" style={{ background: "hsl(0 0% 8%)" }}>
            {f.icon}
            <div>
              <p className="text-sm font-semibold text-white">{f.label}</p>
              <p className="text-xs text-white/35">{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform setup */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Platform Setup</h2>
        <div className="space-y-3">
          {PLATFORMS.map(p => <PlatformCard key={p.id} platform={p} />)}
        </div>

        {/* Twitter/X note */}
        <div className="mt-3 p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="text-xl">𝕏</span>
            <div>
              <p className="text-sm font-semibold text-white/50">Twitter / X</p>
              <p className="text-xs text-white/25">Requires a paid X Developer API subscription ($100/month). Not included.</p>
            </div>
            <XCircle className="w-4 h-4 text-white/20 ml-auto flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Command Reference */}
      <div>
        <h2 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Command Reference</h2>
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "hsl(0 0% 8%)" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] text-[10px] uppercase tracking-widest text-white/20 font-semibold px-5 py-3 border-b border-white/[0.05]">
            <span>Command</span>
            <span className="text-center px-4">Alias</span>
            <span>Description</span>
          </div>
          {COMMANDS.map((c, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3 gap-4",
                i !== COMMANDS.length - 1 && "border-b border-white/[0.04]"
              )}
            >
              <div className="flex items-center gap-2">
                {c.icon}
                <code className="text-xs font-mono text-white/70">{c.cmd}</code>
              </div>
              <div className="text-center px-4">
                {c.alias ? (
                  <code className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{c.alias}</code>
                ) : (
                  <span className="text-white/15">—</span>
                )}
              </div>
              <p className="text-xs text-white/45">{c.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/20 mt-3">
          On Telegram: use <code className="font-mono">/theryn</code> instead of <code className="font-mono">!theryn</code>.
          On Slack: use <code className="font-mono">!theryn</code> or <code className="font-mono">@mention</code> the bot.
          Plain messages on Telegram/Discord also chat with Theryn by default.
        </p>
      </div>
    </div>
  );
}
