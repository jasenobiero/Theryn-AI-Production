import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, StopCircle, Copy, Check, RotateCcw, Zap,
  ChevronDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

interface ModelDef {
  id: string;
  provider: "openai" | "anthropic" | "openrouter";
  orModel?: string;
  label: string;
  dot: string;
  border: string;
  textColor: string;
}

const MODELS: ModelDef[] = [
  { id: "aetheris", provider: "openai",     label: "Theryn",   dot: "bg-green-400",   border: "border-green-500/25 bg-green-500/[0.03]",   textColor: "text-green-400" },
  { id: "vesper",   provider: "anthropic",  label: "Vesper",     dot: "bg-orange-400",  border: "border-orange-500/25 bg-orange-500/[0.03]",  textColor: "text-orange-400" },
  { id: "zethon",   provider: "openrouter", orModel: "x-ai/grok-4.3",                   label: "Zethon-4",   dot: "bg-purple-400",  border: "border-purple-500/25 bg-purple-500/[0.03]",  textColor: "text-purple-400" },
  { id: "lumyra",   provider: "openrouter", orModel: "google/gemini-2.5-pro",            label: "Lumyra Pro", dot: "bg-blue-400",    border: "border-blue-500/25 bg-blue-500/[0.03]",      textColor: "text-blue-400" },
  { id: "sylvax",   provider: "openrouter", orModel: "meta-llama/llama-3-70b-instruct",  label: "Sylvax-70",  dot: "bg-cyan-400",    border: "border-cyan-500/25 bg-cyan-500/[0.03]",      textColor: "text-cyan-400" },
  { id: "hexcore",  provider: "openrouter", orModel: "deepseek/deepseek-coder",          label: "Hexcore",    dot: "bg-red-400",     border: "border-red-500/25 bg-red-500/[0.03]",        textColor: "text-red-400" },
];

interface ColState {
  text: string;
  done: boolean;
  error?: string;
  firstTokenMs?: number;
  totalMs?: number;
}

const IDLE: ColState = { text: "", done: true };

// One stream controller per model — all called at the top level (no hooks in loops)
function useStreamCol(model: ModelDef) {
  const [state, setState] = useState<ColState>(IDLE);
  const abortRef   = useRef<AbortController | null>(null);
  const startRef   = useRef(0);
  const gotFirst   = useRef(false);

  const run = useCallback(async (prompt: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    startRef.current = Date.now();
    gotFirst.current = false;
    setState({ text: "", done: false });

    try {
      const res = await fetch("/api/studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: model.provider,
          ...(model.orModel ? { model: model.orModel } : {}),
          messages: [{ role: "user", content: prompt }],
        }),
        signal: ctrl.signal,
        credentials: "include",
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let raw  = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (!value) continue;
        const chunk = dec.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6).trim());
            if (ev.done) { done = true; break; }
            if (ev.error) { setState(s => ({ ...s, done: true, error: String(ev.error) })); return; }
            if (ev.content) {
              if (!gotFirst.current) {
                gotFirst.current = true;
                const ms = Date.now() - startRef.current;
                setState(s => ({ ...s, firstTokenMs: ms }));
              }
              raw += ev.content;
              setState(s => ({ ...s, text: raw }));
            }
          } catch { /* ignore */ }
        }
      }
      setState(s => ({ ...s, done: true, totalMs: Date.now() - startRef.current }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setState(s => ({ ...s, done: true }));
        return;
      }
      setState(s => ({ ...s, done: true, error: String(err) }));
    }
  }, [model]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState(s => ({ ...s, done: true }));
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  return { state, run, stop, reset };
}

// ── Column component ─────────────────────────────────────────
function ArenaCol({ model, state, onStop }: {
  model: ModelDef; state: ColState; onStop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.done && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.text, state.done]);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(state.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const words = state.text.split(/\s+/).filter(Boolean).length;

  return (
    <div className={cn("flex flex-col h-full rounded-2xl border overflow-hidden", model.border)}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", model.dot, !state.done && "animate-pulse")} />
          <span className={cn("text-sm font-bold", model.textColor)}>{model.label}</span>
          {!state.done && <span className="text-[9px] text-white/20 font-mono">streaming</span>}
          {state.done && state.totalMs && (
            <span className="text-[9px] text-white/20 font-mono">{(state.totalMs / 1000).toFixed(1)}s</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!state.done && (
            <button onClick={onStop} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <StopCircle className="w-3.5 h-3.5" />
            </button>
          )}
          {state.done && state.text && (
            <button onClick={copy} className="p-1.5 rounded-lg text-white/20 hover:text-white/70 hover:bg-white/[0.05] transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 text-sm text-white/80 min-h-0">
        {!state.text && !state.done && (
          <div className="flex items-center gap-2 text-white/25">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
              ))}
            </div>
            <span className="text-xs">Generating…</span>
          </div>
        )}
        {state.error && <p className="text-red-400/70 text-xs">{state.error}</p>}
        {state.text && !state.error && (
          <div className="prose prose-invert prose-sm max-w-none">
            <Markdown content={state.text} />
          </div>
        )}
        {!state.done && state.text && (
          <span className="inline-block w-2 h-4 bg-white/40 rounded-sm animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {/* Footer */}
      {state.done && state.text && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-t border-white/[0.04] text-[9px] font-mono text-white/18">
          <span>{words} words</span>
          {state.firstTokenMs && <><span>·</span><span>first token {state.firstTokenMs}ms</span></>}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ArenaPage() {
  const [input, setInput]           = useState("");
  const [firedPrompt, setFiredPrompt] = useState("");
  const [active, setActive]         = useState<string[]>(["aetheris", "vesper", "zethon"]);
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // All hooks at top level — never in a loop
  const s0 = useStreamCol(MODELS[0]);
  const s1 = useStreamCol(MODELS[1]);
  const s2 = useStreamCol(MODELS[2]);
  const s3 = useStreamCol(MODELS[3]);
  const s4 = useStreamCol(MODELS[4]);
  const s5 = useStreamCol(MODELS[5]);
  const allStreams = [s0, s1, s2, s3, s4, s5];

  const anyStreaming = allStreams.some((s, i) => active.includes(MODELS[i].id) && !s.state.done && s.state.text !== "" || (!s.state.done && MODELS[i] && active.includes(MODELS[i].id) && !s.state.done));

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  const fire = useCallback(() => {
    const p = input.trim();
    if (!p) return;
    setFiredPrompt(p);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    allStreams.forEach((s, i) => {
      if (active.includes(MODELS[i].id)) s.run(p);
    });
  }, [input, active, allStreams]);

  const stopAll = () => allStreams.forEach(s => s.stop());

  const clearAll = () => {
    stopAll();
    allStreams.forEach(s => s.reset());
    setFiredPrompt("");
  };

  const toggleModel = (id: string) => {
    setActive(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : [...prev, id]
    );
  };

  const activeCols = MODELS.map((m, i) => ({ model: m, stream: allStreams[i] }))
    .filter(({ model }) => active.includes(model.id));

  const isStreaming = activeCols.some(({ stream }) => !stream.state.done);

  const gridClass = (
    { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2", 5: "grid-cols-3", 6: "grid-cols-3" }
  )[activeCols.length] ?? "grid-cols-3";

  const EXAMPLES = [
    "Explain recursion with a fun analogy",
    "Write a haiku about artificial intelligence",
    "What's the best way to learn a new language?",
    "Solve FizzBuzz in the most creative way possible",
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.05]" style={{ background: "hsl(0 0% 5%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-[0_0_16px_-4px_rgba(220,38,38,0.5)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Model Arena</h1>
            <p className="text-[10px] text-white/25">Race all models on the same prompt simultaneously</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.07] text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex -space-x-1">
              {activeCols.slice(0, 5).map(({ model }) => (
                <div key={model.id} className={cn("w-3 h-3 rounded-full border border-black/80", model.dot)} />
              ))}
            </div>
            {activeCols.length} models
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full mt-2 right-0 z-50 rounded-2xl border border-white/[0.08] p-2 min-w-[190px] space-y-0.5"
                style={{ background: "hsl(0 0% 9%)" }}
              >
                {MODELS.map(m => {
                  const on = active.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleModel(m.id)}
                      className={cn("flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs transition-colors",
                        on ? "bg-white/[0.06] text-white" : "text-white/35 hover:text-white/70 hover:bg-white/[0.03]")}>
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", m.dot)} />
                      <span className="flex-1 text-left font-medium">{m.label}</span>
                      {on ? <Check className="w-3 h-3 text-green-400" /> : <Minus className="w-3 h-3 text-white/20" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Columns area */}
      <div className="flex-1 overflow-hidden p-4 min-h-0">
        {firedPrompt ? (
          <div className={cn("grid gap-3 h-full", gridClass)}>
            {activeCols.map(({ model, stream }) => (
              <ArenaCol key={model.id} model={model} state={stream.state} onStop={stream.stop} />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-5">
            <div className="flex -space-x-3">
              {activeCols.map(({ model }, i) => (
                <div key={model.id} className={cn("w-11 h-11 rounded-xl border-2 border-black flex items-center justify-center text-sm font-black text-black", model.dot)} style={{ zIndex: i }}>
                  {model.label[0]}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50">Type a prompt to race all {activeCols.length} models</p>
              <p className="text-xs text-white/20 mt-1">They all start at the same time — see who responds best</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setInput(ex)}
                  className="px-3 py-1.5 rounded-xl border border-white/[0.07] text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-white/[0.05]" style={{ background: "hsl(0 0% 4%)" }}>
        {firedPrompt && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] text-white/20 font-mono truncate flex-1 italic">&ldquo;{firedPrompt}&rdquo;</span>
            <button onClick={clearAll}
              className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
              <RotateCcw className="w-2.5 h-2.5" />
              New prompt
            </button>
          </div>
        )}
        <div className={cn(
          "rounded-2xl border transition-all",
          input ? "border-white/[0.10] bg-white/[0.03]" : "border-white/[0.07] bg-white/[0.02]",
          "focus-within:border-cyan-200/30"
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fire(); } }}
            placeholder={`Send the same prompt to all ${activeCols.length} models at once…`}
            disabled={isStreaming}
            rows={1}
            className="w-full bg-transparent text-white/90 placeholder:text-white/20 px-4 pt-3 pb-2 resize-none focus:outline-none text-sm disabled:opacity-40"
            style={{ minHeight: "52px" }}
          />
          <div className="flex items-center justify-end px-3 pb-3 pt-1 gap-2">
            {isStreaming ? (
              <button onClick={stopAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all text-xs font-medium">
                <StopCircle className="w-3.5 h-3.5" />
                Stop all
              </button>
            ) : (
              <button onClick={fire} disabled={!input.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-300 hover:bg-cyan-200 disabled:opacity-20 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold transition-all shadow-[0_0_18px_-4px_rgba(56,217,255,0.3)]">
                <Zap className="w-3.5 h-3.5" />
                Race all models
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
