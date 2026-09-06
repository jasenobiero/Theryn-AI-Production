import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Code2, Download, RefreshCw, X, Copy, Check, Maximize2,
  Pencil, Monitor, Tablet, Smartphone, Terminal, ChevronDown, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Artifact {
  id: string;
  title: string;
  type: "html";
  content: string;
  isStreaming?: boolean;
}

export interface SecretRequest {
  key: string;
  label: string;
  hint?: string;
}

interface ArtifactPanelProps {
  artifact: Artifact | null;
  secrets: Record<string, string>;
  onClose: () => void;
  onEditCode?: (newCode: string) => void;
}

type DeviceSize = "mobile" | "tablet" | "desktop";

interface ConsoleMsg {
  level: "log" | "warn" | "error" | "info";
  text: string;
  time: Date;
}

// Console capture script injected into every iframe
const CONSOLE_SCRIPT = `<script>
!function(){
  function send(l,t){try{window.parent.postMessage({__theryn_log:1,level:l,text:t},'*')}catch(e){}}
  ['log','warn','error','info'].forEach(function(l){
    var o=console[l].bind(console);
    console[l]=function(){
      var t=Array.prototype.slice.call(arguments).map(function(a){
        if(a instanceof Error)return a.name+': '+a.message;
        if(a&&typeof a==='object'){try{return JSON.stringify(a,null,2)}catch(e){return String(a)}}
        return String(a)
      }).join(' ');
      send(l,t);o.apply(console,arguments)
    }
  });
  window.onerror=function(m,s,l){send('error',m+' (line '+l+')');return false};
  window.addEventListener('unhandledrejection',function(e){
    send('error','Unhandled rejection: '+(e.reason&&(e.reason.message||String(e.reason))||'unknown'))
  });
}();
<\/script>`;

function injectSecrets(html: string, secrets: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(secrets)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

function prepareHtml(html: string, secrets: Record<string, string>): string {
  let result = injectSecrets(html, secrets);
  if (result.includes("</head>")) {
    result = result.replace("</head>", CONSOLE_SCRIPT + "</head>");
  } else {
    result = CONSOLE_SCRIPT + result;
  }
  return result;
}

const DEVICE_SIZES: { id: DeviceSize; icon: typeof Monitor; label: string; w: string; h: string }[] = [
  { id: "mobile",  icon: Smartphone, label: "Mobile",  w: "375px",  h: "812px" },
  { id: "tablet",  icon: Tablet,     label: "Tablet",  w: "768px",  h: "1024px" },
  { id: "desktop", icon: Monitor,    label: "Desktop", w: "100%",   h: "100%" },
];

export function ArtifactPanel({ artifact, secrets, onClose, onEditCode }: ArtifactPanelProps) {
  const [view,         setView]         = useState<"preview" | "code">("code");
  const [deviceSize,   setDeviceSize]   = useState<DeviceSize>("desktop");
  const [copied,       setCopied]       = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [isEditing,    setIsEditing]    = useState(false);
  const [codeDraft,    setCodeDraft]    = useState("");
  const [consoleMsgs,  setConsoleMsgs]  = useState<ConsoleMsg[]>([]);
  const [showConsole,  setShowConsole]  = useState(false);

  const codeRef    = useRef<HTMLPreElement>(null);
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const editorRef  = useRef<HTMLTextAreaElement>(null);

  // Streaming → code view; done → preview
  useEffect(() => {
    if (!artifact) return;
    if (artifact.isStreaming) {
      setView("code");
    } else {
      const t = setTimeout(() => { setView("preview"); setRefreshKey(k => k + 1); }, 400);
      return () => clearTimeout(t);
    }
  }, [artifact?.isStreaming, artifact?.id]);

  // Auto-scroll code pane while streaming
  useEffect(() => {
    if (artifact?.isStreaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [artifact?.content, artifact?.isStreaming]);

  // Re-render preview when secrets change
  useEffect(() => {
    if (artifact && !artifact.isStreaming && view === "preview") {
      setRefreshKey(k => k + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secrets]);

  // Clear console on new build
  useEffect(() => {
    setConsoleMsgs([]);
    setIsEditing(false);
  }, [artifact?.id]);

  // Console capture via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.__theryn_log) {
        setConsoleMsgs(prev => [
          ...prev.slice(-99), // keep last 100
          { level: e.data.level as ConsoleMsg["level"], text: String(e.data.text), time: new Date() },
        ]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Focus editor when entering edit mode
  useEffect(() => {
    if (isEditing) setTimeout(() => editorRef.current?.focus(), 50);
  }, [isEditing]);

  if (!artifact) return null;

  const resolvedHtml  = prepareHtml(artifact.content, secrets);
  const device        = DEVICE_SIZES.find(d => d.id === deviceSize)!;
  const unfilledCount = (artifact.content.match(/\{\{[A-Z_]+\}\}/g) ?? [])
    .filter(p => !secrets[p.slice(2, -2)]).length;

  const errorCount = consoleMsgs.filter(m => m.level === "error").length;
  const warnCount  = consoleMsgs.filter(m => m.level === "warn").length;

  const copy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([artifact.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${artifact.title.toLowerCase().replace(/\s+/g, "-")}.html` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInTab = () => {
    const blob = new Blob([artifact.content], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const startEditing = () => {
    setCodeDraft(artifact.content);
    setIsEditing(true);
    setView("code");
  };

  const applyEdit = useCallback(() => {
    onEditCode?.(codeDraft);
    setIsEditing(false);
    setRefreshKey(k => k + 1);
    setTimeout(() => setView("preview"), 200);
  }, [codeDraft, onEditCode]);

  const cancelEdit = () => {
    setIsEditing(false);
    setCodeDraft("");
  };

  const consoleLevelColor: Record<ConsoleMsg["level"], string> = {
    log:   "text-white/50",
    info:  "text-blue-400",
    warn:  "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <motion.div
      key={artifact.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
      className="flex flex-col h-full border-l border-white/[0.06] overflow-hidden"
      style={{ background: "hsl(0 0% 5%)" }}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 h-11 flex items-center justify-between px-3 border-b border-white/[0.05]">
        {/* Left: status + title */}
        <div className="flex items-center gap-2 min-w-0">
          {artifact.isStreaming ? (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
              <span className="text-[10px] text-red-400 font-mono">Building…</span>
            </div>
          ) : (
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", unfilledCount > 0 ? "bg-amber-400" : "bg-green-400")} />
          )}
          <span className="text-xs font-semibold text-white/70 truncate">{artifact.title}</span>
          {unfilledCount > 0 && !artifact.isStreaming && (
            <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded px-1.5 py-0.5 font-mono flex-shrink-0">
              {unfilledCount} secret{unfilledCount > 1 ? "s" : ""} needed
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-white/[0.07] overflow-hidden mr-1">
            <button onClick={() => { setView("preview"); setIsEditing(false); }} disabled={artifact.isStreaming}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-colors disabled:opacity-30",
                view === "preview" ? "bg-red-600/20 text-red-300" : "text-white/30 hover:text-white/70")}>
              <Eye className="w-3 h-3" />Preview
            </button>
            <button onClick={() => { setView("code"); setIsEditing(false); }}
              className={cn("flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-colors border-l border-white/[0.07]",
                view === "code" && !isEditing ? "bg-red-600/20 text-red-300" : "text-white/30 hover:text-white/70")}>
              <Code2 className="w-3 h-3" />Code
            </button>
            {!artifact.isStreaming && (
              <button onClick={startEditing}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-colors border-l border-white/[0.07]",
                  isEditing ? "bg-amber-500/20 text-amber-300" : "text-white/30 hover:text-white/70")}>
                <Pencil className="w-3 h-3" />Edit
              </button>
            )}
          </div>

          {/* Device sizes (preview mode only) */}
          {view === "preview" && !artifact.isStreaming && (
            <div className="flex items-center rounded-lg border border-white/[0.07] overflow-hidden mr-1">
              {DEVICE_SIZES.map((d, i) => (
                <button key={d.id} onClick={() => setDeviceSize(d.id)}
                  title={d.label}
                  className={cn("p-1.5 transition-colors", i > 0 && "border-l border-white/[0.07]",
                    deviceSize === d.id ? "bg-red-600/20 text-red-300" : "text-white/25 hover:text-white/70")}>
                  <d.icon className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setRefreshKey(k => k+1)} title="Refresh"
            className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={copy} title="Copy"
            className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={download} title="Download HTML"
            className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={openInTab} title="Open in new tab"
            className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} title="Close"
            className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
        <div className="flex-1 overflow-hidden min-h-0">

          {/* ── EDIT MODE ── */}
          {isEditing && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber-500/10 bg-amber-500/[0.03] flex-shrink-0">
                <span className="text-[10px] text-amber-400/70 font-mono">Editing source — changes apply on save</span>
                <div className="flex gap-1.5">
                  <button onClick={applyEdit}
                    className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/20 text-green-300 text-[10px] font-semibold hover:bg-green-500/30 transition-colors">
                    Apply & Preview
                  </button>
                  <button onClick={cancelEdit}
                    className="px-2.5 py-1 rounded-lg border border-white/[0.07] text-white/30 text-[10px] hover:text-white/60 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
              <textarea
                ref={editorRef}
                value={codeDraft}
                onChange={e => setCodeDraft(e.target.value)}
                className="flex-1 font-mono text-[11px] leading-relaxed bg-transparent text-white/70 p-4 resize-none focus:outline-none"
                style={{ background: "hsl(0 0% 5%)", tabSize: 2 }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          )}

          {/* ── CODE VIEW ── */}
          {view === "code" && !isEditing && (
            <div className="h-full overflow-hidden flex flex-col">
              {artifact.isStreaming && (
                <div className="flex-shrink-0 px-4 py-1.5 border-b border-white/[0.04] flex items-center gap-2" style={{ background: "hsl(0 0% 7%)" }}>
                  <Code2 className="w-3 h-3 text-red-400/70" />
                  <span className="text-[9px] text-white/25 font-mono uppercase tracking-widest">Writing code…</span>
                  <span className="ml-auto text-[9px] text-white/20 font-mono">{artifact.content.length.toLocaleString()} chars</span>
                </div>
              )}
              <pre
                ref={codeRef}
                className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words min-h-0"
                style={{ background: "hsl(0 0% 5%)", color: "rgba(255,255,255,0.55)" }}
              >
                <code>{artifact.content}</code>
                {artifact.isStreaming && (
                  <span className="inline-block w-2 h-3.5 bg-red-400/70 rounded-sm animate-pulse ml-0.5 align-middle" />
                )}
              </pre>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {view === "preview" && !isEditing && (
            artifact.isStreaming ? (
              <div className="h-full flex items-center justify-center text-white/20 text-xs flex-col gap-2">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500/50 animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />)}
                </div>
                Preview renders when build completes…
              </div>
            ) : unfilledCount > 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg">🔑</div>
                <p className="text-sm font-semibold text-white/60">Secrets required</p>
                <p className="text-xs text-white/25 leading-relaxed">Enter the required secrets in the chat panel, then click Apply Secrets to render the preview.</p>
              </div>
            ) : (
              <div className={cn(
                "h-full w-full overflow-auto",
                deviceSize !== "desktop" ? "flex items-start justify-center p-4" : ""
              )} style={{ background: deviceSize !== "desktop" ? "hsl(0 0% 3%)" : undefined }}>
                {deviceSize !== "desktop" && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0" style={{ width: device.w, height: device.h }}>
                    <iframe
                      key={refreshKey + deviceSize}
                      ref={iframeRef}
                      srcDoc={resolvedHtml}
                      sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-same-origin allow-downloads"
                      className="w-full h-full border-none"
                      title={artifact.title}
                    />
                  </div>
                )}
                {deviceSize === "desktop" && (
                  <iframe
                    key={refreshKey}
                    ref={iframeRef}
                    srcDoc={resolvedHtml}
                    sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-same-origin allow-downloads"
                    className="w-full h-full border-none"
                    title={artifact.title}
                  />
                )}
              </div>
            )
          )}
        </div>

        {/* ── Console Panel ── */}
        <AnimatePresence>
          {showConsole && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 160 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-t border-white/[0.05] overflow-hidden flex flex-col"
              style={{ background: "hsl(0 0% 3%)" }}
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] flex-shrink-0">
                <span className="text-[9px] font-mono text-white/25 uppercase tracking-widest">Console</span>
                <div className="flex items-center gap-2">
                  {consoleMsgs.length > 0 && (
                    <button onClick={() => setConsoleMsgs([])}
                      className="flex items-center gap-1 text-[9px] text-white/20 hover:text-white/50 transition-colors">
                      <Trash2 className="w-2.5 h-2.5" />Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed">
                {consoleMsgs.length === 0 ? (
                  <p className="text-white/15 px-3 py-2">No output yet. Logs from your app will appear here.</p>
                ) : (
                  consoleMsgs.map((msg, i) => (
                    <div key={i} className={cn("flex gap-2 px-3 py-0.5 hover:bg-white/[0.02] border-b border-white/[0.02]", consoleLevelColor[msg.level])}>
                      <span className="text-white/20 flex-shrink-0 w-12 text-right">{msg.time.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
                      <span className="flex-shrink-0 uppercase w-8 opacity-60">{msg.level}</span>
                      <span className="whitespace-pre-wrap break-all flex-1">{msg.text}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 h-7 flex items-center justify-between px-3 border-t border-white/[0.04]" style={{ background: "hsl(0 0% 6%)" }}>
        <span className="text-[9px] font-mono text-white/15">
          {artifact.content.split("\n").length} lines · {(artifact.content.length / 1024).toFixed(1)} KB
        </span>
        <div className="flex items-center gap-2">
          {!artifact.isStreaming && (
            unfilledCount > 0
              ? <span className="text-[9px] font-mono text-amber-400/50">⚠ {unfilledCount} secret{unfilledCount > 1 ? "s" : ""} unfilled</span>
              : <span className="text-[9px] font-mono text-green-400/50">✓ Ready</span>
          )}
          {/* Console toggle */}
          <button
            onClick={() => setShowConsole(v => !v)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-colors",
              showConsole ? "bg-white/[0.07] text-white/50" : "text-white/20 hover:text-white/50"
            )}
          >
            <Terminal className="w-2.5 h-2.5" />
            {errorCount > 0 && <span className="text-red-400">{errorCount} err</span>}
            {warnCount > 0 && <span className="text-yellow-400">{warnCount} warn</span>}
            {errorCount === 0 && warnCount === 0 && <span>console</span>}
            <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", showConsole && "rotate-180")} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Parsers ─────────────────────────────────────────────────

export function parseArtifact(text: string): { artifact: Artifact | null; visibleText: string } {
  const openMatch = text.match(/<theryn-artifact[^>]*>/);
  if (!openMatch) return { artifact: null, visibleText: stripSecretTags(text) };

  const titleMatch = text.match(/title="([^"]+)"/);
  const typeMatch  = text.match(/type="([^"]+)"/);
  const title = titleMatch?.[1] ?? "Artifact";
  const type  = (typeMatch?.[1] ?? "html") as "html";

  const openIdx      = text.indexOf(openMatch[0]);
  const contentStart = openIdx + openMatch[0].length;
  const visibleBefore = stripSecretTags(text.slice(0, openIdx)).trim();

  const closeIdx   = text.indexOf("</theryn-artifact>", contentStart);
  const isStreaming = closeIdx === -1;

  const rawContent = isStreaming
    ? text.slice(contentStart)
    : text.slice(contentStart, closeIdx);

  const afterText = (!isStreaming && closeIdx >= 0)
    ? stripSecretTags(text.slice(closeIdx + "</theryn-artifact>".length)).trim()
    : "";

  const visibleText = [visibleBefore, afterText].filter(Boolean).join("\n\n");

  return {
    artifact: { id: title, title, type, content: rawContent.trim(), isStreaming },
    visibleText,
  };
}

export function parseSecrets(text: string): SecretRequest[] {
  const secrets: SecretRequest[] = [];
  const regex = /<theryn-secret\s+([^/]+)\/>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const attrs = match[1];
    const keyMatch   = attrs.match(/key="([^"]+)"/);
    const labelMatch = attrs.match(/label="([^"]+)"/);
    const hintMatch  = attrs.match(/hint="([^"]+)"/);
    if (keyMatch) {
      secrets.push({ key: keyMatch[1], label: labelMatch?.[1] ?? keyMatch[1], hint: hintMatch?.[1] });
    }
  }
  return secrets;
}

function stripSecretTags(text: string): string {
  return text.replace(/<theryn-secret\s+[^/]+\/>/g, "").trim();
}

// Re-export consoleLevelColor for potential future use
const consoleLevelColor: Record<ConsoleMsg["level"], string> = {
  log:   "text-white/50",
  info:  "text-blue-400",
  warn:  "text-yellow-400",
  error: "text-red-400",
};
