import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Home, MessageSquare, Sparkles, Image as ImageIcon, Mic, Bot,
  Settings, Zap, BookMarked, Search, ArrowRight, Command,
  Code2, Pencil, Globe, Lightbulb, FlaskConical, TrendingUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CmdItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  category: string;
  action: () => void;
  kbd?: string;
  color?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER = ["Navigate", "Actions", "Quick prompts"];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const sendPrompt = useCallback((text: string) => {
    navigate(`/chat?msg=${encodeURIComponent(text)}`);
    onClose();
  }, [navigate, onClose]);

  const ITEMS: CmdItem[] = [
    { id: "home",    label: "Home",        description: "Command center",         icon: Home,        category: "Navigate", action: () => go("/"),        kbd: "G H" },
    { id: "chat",    label: "AI Chat",     description: "Multi-model chat",       icon: MessageSquare, category: "Navigate", action: () => go("/chat"),   kbd: "G C" },
    { id: "arena",   label: "Model Arena", description: "Race all models",        icon: Zap,         category: "Navigate", action: () => go("/arena"),   color: "text-orange-400" },
    { id: "studio",  label: "Studio",      description: "Build live artifacts",   icon: Sparkles,    category: "Navigate", action: () => go("/studio"),  kbd: "G S" },
    { id: "images",  label: "Image Gen",   description: "Neural image synthesis", icon: ImageIcon,   category: "Navigate", action: () => go("/images"),  kbd: "G I" },
    { id: "voice",   label: "Voice TTS",   description: "Neural voice synthesis", icon: Mic,         category: "Navigate", action: () => go("/voice"),   kbd: "G V" },
    { id: "agents",  label: "Agent Studio",description: "Custom AI agents",       icon: Bot,         category: "Navigate", action: () => go("/agents"),  kbd: "G A" },
    { id: "prompts", label: "Prompt Library", description: "Browse saved prompts", icon: BookMarked, category: "Navigate", action: () => go("/prompts"), kbd: "G P" },
    { id: "settings",label: "Settings",    description: "API keys & preferences", icon: Settings,    category: "Navigate", action: () => go("/settings") },

    { id: "new-chat",    label: "New Chat",        description: "Start fresh conversation",    icon: MessageSquare, category: "Actions", action: () => go("/chat") },
    { id: "new-studio",  label: "New Studio Build", description: "Build something new",        icon: Sparkles,      category: "Actions", action: () => go("/studio") },
    { id: "new-arena",   label: "Arena Showdown",   description: "Compare models on a prompt", icon: Zap,           category: "Actions", action: () => go("/arena"), color: "text-orange-400" },

    { id: "p1", label: "Write a Python script to scrape a website",       icon: Code2,        category: "Quick prompts", action: () => sendPrompt("Write a Python script to scrape a website") },
    { id: "p2", label: "Explain quantum entanglement simply",              icon: FlaskConical, category: "Quick prompts", action: () => sendPrompt("Explain quantum entanglement simply") },
    { id: "p3", label: "Draft a compelling product launch email",          icon: Pencil,       category: "Quick prompts", action: () => sendPrompt("Draft a compelling product launch email") },
    { id: "p4", label: "Brainstorm 10 startup ideas for Gen Z",            icon: Lightbulb,    category: "Quick prompts", action: () => sendPrompt("Brainstorm 10 startup ideas for Gen Z") },
    { id: "p5", label: "Summarize the latest AI trends",                   icon: TrendingUp,   category: "Quick prompts", action: () => sendPrompt("Summarize the latest AI trends") },
    { id: "p6", label: "Build a Snake game with dark theme",               icon: Sparkles,     category: "Quick prompts", action: () => sendPrompt("Build a Snake game with dark theme and score tracking"), description: "Opens Studio" },
    { id: "p7", label: "Create a React component for a pricing table",     icon: Code2,        category: "Quick prompts", action: () => sendPrompt("Create a React component for a pricing table") },
    { id: "p8", label: "Write a short sci-fi story about time travel",     icon: Globe,        category: "Quick prompts", action: () => sendPrompt("Write a short sci-fi story about time travel") },
  ];

  const filtered = query.trim()
    ? ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : ITEMS;

  // Group by category
  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: filtered.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  // Flat list for keyboard nav
  const flatItems = grouped.flatMap(g => g.items);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flatItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); flatItems[selected]?.action(); }
    if (e.key === "Escape")    { e.preventDefault(); onClose(); }
  }, [flatItems, selected, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Palette */}
          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
              className="w-full max-w-[580px] rounded-2xl border border-white/[0.09] shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: "hsl(0 0% 8%)" }}
                data-testid="command-palette"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
                <input
                  ref={inputRef}
                  data-testid="input-command-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search pages, actions, prompts…"
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
                />
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-white/20 border border-white/[0.08]">ESC</kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="overflow-y-auto max-h-[400px] py-2">
                {flatItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/20">
                    <Search className="w-6 h-6" />
                    <p className="text-sm">No results for &quot;{query}&quot;</p>
                  </div>
                ) : (
                  grouped.map(({ cat, items }) => {
                    const groupStartIdx = flatItems.indexOf(items[0]);
                    return (
                      <div key={cat} className="mb-1">
                        <p className="px-4 py-1.5 text-[9px] font-semibold text-white/20 uppercase tracking-widest">{cat}</p>
                        {items.map((item, localIdx) => {
                          const flatIdx = groupStartIdx + localIdx;
                          const isSelected = flatIdx === selected;
                          return (
                            <button
                              key={item.id}
                              data-idx={flatIdx}
                              data-testid={`command-item-${item.id}`}
                              onClick={item.action}
                              onMouseEnter={() => setSelected(flatIdx)}
                              className={cn(
                                "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                                isSelected ? "bg-cyan-300/15" : "hover:bg-white/[0.04]"
                              )}
                            >
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                isSelected ? "bg-cyan-300/20" : "bg-white/[0.05]"
                              )}>
                                <item.icon className={cn("w-3.5 h-3.5", item.color ?? (isSelected ? "text-cyan-200" : "text-white/40"))} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium truncate", isSelected ? "text-white" : "text-white/70")}>{item.label}</p>
                                {item.description && (
                                  <p className="text-[11px] text-white/25 truncate">{item.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {item.kbd && (
                                  <div className="flex gap-1">
                                    {item.kbd.split(" ").map(k => (
                                      <kbd key={k} className="px-1.5 py-0.5 rounded text-[9px] font-mono text-white/20 border border-white/[0.08]">{k}</kbd>
                                    ))}
                                  </div>
                                )}
                                {isSelected && <ArrowRight className="w-3.5 h-3.5 text-cyan-200/70" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] text-[10px] text-white/20">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-white/[0.08] font-mono">↑↓</kbd> Navigate</span>
                  <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-white/[0.08] font-mono">↵</kbd> Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <Command className="w-3 h-3" />
                  <span>K to open</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-50" />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Hook: register ⌘K / Ctrl+K globally */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
