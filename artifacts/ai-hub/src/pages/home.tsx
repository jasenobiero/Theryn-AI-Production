import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { TherynIcon } from "@/components/nexus-icon";
import { useUser } from "@clerk/react";
import {
  ArrowUp, Plus, Image as ImageIcon, Mic, Bot,
  ChevronDown, Code2, BookOpen, Globe, Lightbulb,
  Pencil, FlaskConical, TrendingUp, Wand2, MessageSquare,
} from "lucide-react";

const PROMPTS = [
  { icon: Code2,        text: "Write a Python script to scrape a website",       color: "text-red-400",     bg: "hover:bg-red-500/8 border-white/[0.06] hover:border-red-500/20" },
  { icon: Pencil,       text: "Draft a compelling product launch email",          color: "text-white/70",    bg: "hover:bg-white/[0.05] border-white/[0.06] hover:border-white/15" },
  { icon: FlaskConical, text: "Explain quantum entanglement simply",              color: "text-red-400",     bg: "hover:bg-red-500/8 border-white/[0.06] hover:border-red-500/20" },
  { icon: TrendingUp,   text: "Analyze the pros and cons of remote work",         color: "text-white/70",    bg: "hover:bg-white/[0.05] border-white/[0.06] hover:border-white/15" },
  { icon: Globe,        text: "Summarize the latest AI trends in 2025",           color: "text-red-400",     bg: "hover:bg-red-500/8 border-white/[0.06] hover:border-red-500/20" },
  { icon: BookOpen,     text: "Create a study plan for learning machine learning", color: "text-white/70",   bg: "hover:bg-white/[0.05] border-white/[0.06] hover:border-white/15" },
  { icon: Lightbulb,    text: "Brainstorm 10 startup ideas for Gen Z",             color: "text-red-400",    bg: "hover:bg-red-500/8 border-white/[0.06] hover:border-red-500/20" },
  { icon: Wand2,        text: "Write a short sci-fi story about time travel",      color: "text-white/70",   bg: "hover:bg-white/[0.05] border-white/[0.06] hover:border-white/15" },
];

const QUICK = [
  { icon: MessageSquare, label: "AI Chat",      sub: "Theryn · Vesper · Prism",   href: "/chat",   color: "bg-red-600" },
  { icon: ImageIcon,     label: "Image Gen",    sub: "Visual synthesis",          href: "/images", color: "bg-white/10" },
  { icon: Mic,           label: "Voice TTS",    sub: "Neural voice synthesis",    href: "/voice",  color: "bg-white/10" },
  { icon: Bot,           label: "Agent Studio", sub: "Build custom AI agents",    href: "/agents", color: "bg-white/10" },
];

const MODELS = [
  { value: "openai",     label: "Theryn",    dot: "bg-red-400" },
  { value: "anthropic",  label: "Vesper",    dot: "bg-white/50" },
  { value: "openrouter", label: "Prism",     dot: "bg-red-300" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("openai");
  const [showPicker, setShowPicker] = useState(false);

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "there";
  const selectedModel = MODELS.find(m => m.value === model)!;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    navigate(`/chat?msg=${encodeURIComponent(msg)}&provider=${model}`);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-between px-4 sm:px-6 py-5 sm:py-10 relative" data-testid="page-home">
      <div className="w-full max-w-6xl flex items-center justify-between mb-8 animate-theryn-rise">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-white/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]" />
          All systems operational
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/20">
          <span>Workspace</span><span className="text-white/10">/</span><span className="text-red-300/60">New session</span>
        </div>
      </div>
      {/* Faint red glow at top */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/5 blur-[120px] rounded-full" />

      {/* CENTER SECTION */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 mb-8"
        >
          <TherynIcon size={56} className="drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
          <div className="text-center">
            <h1 className="text-4xl font-display font-black tracking-tight text-white">THERYN</h1>
            <p className="text-sm text-white/30 mt-1">{greeting}, {firstName}</p>
          </div>
        </motion.div>

        {/* Input box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <div
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] focus-within:border-red-500/30 focus-within:shadow-[0_0_30px_-8px_rgba(220,38,38,0.2)] transition-all duration-300"
          >
            <textarea
              data-testid="input-home-prompt"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything..."
              rows={3}
              className="w-full bg-transparent text-white placeholder:text-white/20 px-5 pt-4 pb-2 resize-none text-sm focus:outline-none"
            />
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex items-center gap-1.5">
                  {[
                   { icon: Plus,      label: "New chat", action: () => navigate("/chat") },
                  { icon: ImageIcon, label: "Image",  action: () => navigate("/images") },
                  { icon: Bot,       label: "Agent",  action: () => navigate("/agents") },
                ].map(b => (
                  <button key={b.label} onClick={b.action} data-testid={`button-home-${b.label.toLowerCase().replace(" ", "-")}`} className="touch-target flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all">
                    <b.icon className="w-3.5 h-3.5" />{b.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Model picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowPicker(v => !v)}
                    data-testid="button-home-model-picker"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/35 hover:text-white/70 border border-white/[0.07] hover:bg-white/[0.05] transition-all"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedModel.dot}`} />
                    {selectedModel.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <AnimatePresence>
                    {showPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full mb-2 right-0 rounded-xl border border-white/[0.08] p-1 min-w-[120px] z-50"
                        style={{ background: "hsl(0 0% 9%)" }}
                      >
                        {MODELS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setModel(opt.value); setShowPicker(false); }}
                            data-testid={`button-home-model-${opt.value}`}
                            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors ${model === opt.value ? "bg-red-600/15 text-white" : "text-white/40 hover:text-white hover:bg-white/[0.05]"}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Send */}
                <button
                  onClick={() => send()}
                  data-testid="button-home-send"
                  disabled={!input.trim()}
                  className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_12px_-2px_rgba(220,38,38,0.4)]"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/15 mt-2">Enter to send · Shift+Enter for new line · Your context stays private</p>
        </motion.div>

        {/* Suggestion prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="w-full mt-6"
        >
          <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest mb-2.5">Suggestions</p>
          <div className="grid grid-cols-2 gap-1.5">
            {PROMPTS.map((p, i) => (
                <motion.button
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                onClick={() => send(p.text)}
                  data-testid={`button-home-suggestion-${i}`}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-xs text-white/50 hover:text-white/90 transition-all duration-150 ${p.bg}`}
              >
                <p.icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.color}`} />
                <span className="line-clamp-1">{p.text}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick access */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="w-full max-w-2xl mx-auto mt-8"
      >
        <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest mb-2.5">Quick Access</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((q, i) => (
            <Link key={q.label} href={q.href} data-testid={`link-home-quick-${q.label.toLowerCase().replace(" ", "-")}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group"
              >
                <div className={`w-9 h-9 rounded-xl ${q.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <q.icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/80">{q.label}</p>
                  <p className="text-[9px] text-white/25 mt-0.5 leading-tight">{q.sub}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
