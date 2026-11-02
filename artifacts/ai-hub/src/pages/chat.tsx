import { useState, useEffect, useRef } from "react";
import { ChatInterface, type PastedImage } from "@/components/chat-interface";
import { useChatStream } from "@/hooks/use-chat-stream";
import {
  useListOpenaiConversations, useCreateOpenaiConversation, useGetOpenaiConversation,
  useListAnthropicConversations, useCreateAnthropicConversation, useGetAnthropicConversation,
  useListOpenrouterConversations, useCreateOpenrouterConversation, useGetOpenrouterConversation
} from "@workspace/api-client-react";
import { Plus, MessageSquare, ChevronDown, PanelLeft, SlidersHorizontal } from "lucide-react";
import { TherynIcon } from "@/components/nexus-icon";
import { cn, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Provider = "openai" | "anthropic" | "openrouter";

const PROVIDER_NAMES: Record<Provider, string> = {
  openai: "Theryn",
  anthropic: "Vesper",
  openrouter: "Prism",
};

const OPENROUTER_MODELS = [
  { value: "x-ai/grok-4.3",                  label: "Zethon-4" },
  { value: "google/gemini-2.5-pro",           label: "Lumyra Pro" },
  { value: "meta-llama/llama-3-70b-instruct", label: "Sylvax-70" },
  { value: "deepseek/deepseek-coder",         label: "Hexcore" },
];

export default function ChatPage() {
  const params = new URLSearchParams(window.location.search);
  const initProvider = params.get("provider") as Provider | null;
  const pendingMsg = params.get("msg");

  const [provider, setProvider] = useState<Provider>(
    initProvider === "anthropic" || initProvider === "openrouter" ? initProvider : "openai"
  );
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("x-ai/grok-4.3");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const autoSentRef = useRef(false);

  const { data: openaiConvos,     refetch: refetchOpenai }     = useListOpenaiConversations(    { query: { enabled: provider === "openai" } });
  const { data: anthropicConvos,  refetch: refetchAnthropic }  = useListAnthropicConversations( { query: { enabled: provider === "anthropic" } });
  const { data: openrouterConvos, refetch: refetchOpenrouter } = useListOpenrouterConversations({ query: { enabled: provider === "openrouter" } });

  const createOpenai     = useCreateOpenaiConversation();
  const createAnthropic  = useCreateAnthropicConversation();
  const createOpenrouter = useCreateOpenrouterConversation();

  const { data: openaiHistory }     = useGetOpenaiConversation(    conversationId ?? 0, { query: { enabled: provider === "openai"     && !!conversationId } });
  const { data: anthropicHistory }  = useGetAnthropicConversation( conversationId ?? 0, { query: { enabled: provider === "anthropic"  && !!conversationId } });
  const { data: openrouterHistory } = useGetOpenrouterConversation(conversationId ?? 0, { query: { enabled: provider === "openrouter" && !!conversationId } });

  const { messages, isStreaming, sendMessage, stopStream, resetMessages } = useChatStream({
    onFinish: () => {
      if (provider === "openai")     refetchOpenai();
      if (provider === "anthropic")  refetchAnthropic();
      if (provider === "openrouter") refetchOpenrouter();
    },
  });

  useEffect(() => {
    if (!conversationId) { resetMessages([]); return; }
    if (isStreaming) return;
    const hist =
      provider === "openai"     ? openaiHistory?.messages :
      provider === "anthropic"  ? anthropicHistory?.messages :
      openrouterHistory?.messages;
    if (!hist) return;
    resetMessages(hist.map(m => ({ id: String(m.id), role: m.role as "user" | "assistant", content: m.content })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, provider, openaiHistory, anthropicHistory, openrouterHistory, isStreaming]);

  useEffect(() => { setConversationId(null); }, [provider]);

  const handleSend = async (content: string, images?: PastedImage[]) => {
    let cid = conversationId;

    if (!cid) {
      try {
        const title = content.slice(0, 40) + (content.length > 40 ? "…" : "");
        if (provider === "openai") {
          const r = await createOpenai.mutateAsync({ data: { title } });
          cid = r.id;
        } else if (provider === "anthropic") {
          const r = await createAnthropic.mutateAsync({ data: { title } });
          cid = r.id;
        } else {
          const r = await createOpenrouter.mutateAsync({ data: { title, model: selectedModel } });
          cid = r.id;
        }
        setConversationId(cid);
        if (provider === "openai")     refetchOpenai();
        if (provider === "anthropic")  refetchAnthropic();
        if (provider === "openrouter") refetchOpenrouter();
      } catch (err) {
        console.error("Failed to create conversation", err);
        return;
      }
    }

    const url = `/api/${provider}/conversations/${cid}/messages`;
    const body: Record<string, unknown> = { content };
    if (images && images.length > 0) {
      body.images = images.map(i => ({ dataUrl: i.dataUrl, mimeType: i.mimeType }));
    }

    sendMessage(url, body, content, images?.map(i => i.dataUrl));
  };

  useEffect(() => {
    if (pendingMsg && !autoSentRef.current) {
      autoSentRef.current = true;
      const t = setTimeout(() => handleSend(pendingMsg), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const convos =
    provider === "openai"     ? openaiConvos :
    provider === "anthropic"  ? anthropicConvos :
    openrouterConvos;

  const selectedModelLabel = OPENROUTER_MODELS.find(m => m.value === selectedModel)?.label ?? selectedModel;

  return (
      <div className="flex h-full w-full overflow-hidden relative">

      {/* Sidebar */}
       <div className={cn(
           "w-[280px] flex-shrink-0 flex-col border-r border-white/[0.06] bg-[hsl(210_31%_5%_/_0.78)]",
         showHistory ? "fixed inset-y-0 left-0 z-50 flex shadow-2xl shadow-black/70" : "hidden",
         "lg:flex lg:relative lg:inset-auto lg:z-auto lg:shadow-none"
       )}>
        <div className="px-3 pt-3 pb-2 border-b border-white/[0.05]">
          <div className="flex gap-1 p-1 rounded-xl bg-black/30 border border-white/[0.05]">
            {(["openai", "anthropic", "openrouter"] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={cn(
                  "flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all",
                  provider === p ? "bg-cyan-300 text-slate-950" : "text-white/35 hover:text-white/70"
                )}
              >
                {PROVIDER_NAMES[p]}
              </button>
            ))}
          </div>

          {provider === "openrouter" && (
            <div className="relative mt-2">
              <button
                onClick={() => setShowModelPicker(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-white/60 hover:text-white transition-all"
              >
                {selectedModelLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-white/[0.08] p-1"
                    style={{ background: "hsl(0 0% 9%)" }}
                  >
                    {OPENROUTER_MODELS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => { setSelectedModel(m.value); setShowModelPicker(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                          selectedModel === m.value ? "bg-cyan-300/15 text-cyan-50" : "text-white/40 hover:text-white hover:bg-white/[0.05]"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

           <button
             onClick={() => { setConversationId(null); setShowHistory(false); }}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-white/50 hover:text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

         <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversationId === null && messages.length > 0 && (
            <div className="px-3 py-2.5 rounded-lg text-xs text-white border border-cyan-200/15 bg-cyan-300/5">
              <p className="font-medium truncate">Current session</p>
              <p className="text-[10px] text-white/30 mt-0.5">Unsaved</p>
            </div>
          )}
          {convos?.map(c => (
            <button
              key={c.id}
               onClick={() => { setConversationId(c.id); setShowHistory(false); }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-0.5",
                conversationId === c.id
                  ? "bg-cyan-300/10 border border-cyan-200/20 text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              )}
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-50" />
                <span className="text-xs font-medium truncate">{c.title}</span>
              </div>
              <span className="text-[9px] opacity-40 pl-4">{formatDate(c.createdAt)}</span>
            </button>
          ))}
          {(!convos || convos.length === 0) && conversationId === null && messages.length === 0 && (
            <p className="text-center text-xs text-white/20 py-8">No saved chats yet</p>
          )}
        </div>
      </div>

       {showHistory && (
         <button aria-label="Close conversation history" onClick={() => setShowHistory(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />
       )}

       {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="min-h-16 flex-shrink-0 flex items-center gap-3 px-4 md:px-8 py-2.5 border-b border-white/[0.06] bg-[hsl(210_31%_5%_/_0.72)]">
           <button onClick={() => setShowHistory(true)} className="lg:hidden p-2 -ml-2 text-white/45 hover:text-white" aria-label="Show conversations">
             <PanelLeft className="w-4 h-4" />
           </button>
          <TherynIcon size={24} className="drop-shadow-[0_0_10px_rgba(56,217,255,0.32)]" />
           <div className="min-w-0">
             <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white leading-none truncate">{PROVIDER_NAMES[provider]}</p>
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
             </div>
            {provider === "openrouter" && (
              <p className="text-[9px] text-cyan-100/70 font-mono uppercase tracking-wider mt-0.5">{selectedModelLabel}</p>
            )}
          </div>
           <div className="ml-auto flex items-center gap-2">
             <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-black/25 border border-white/[0.06]">
               {(["openai", "anthropic", "openrouter"] as Provider[]).map(p => (
                 <button key={p} onClick={() => setProvider(p)} className={cn("px-2 py-1 rounded-md text-[10px] transition-colors", provider === p ? "bg-cyan-300/20 text-cyan-50" : "text-white/35 hover:text-white/70")}>
                   {PROVIDER_NAMES[p]}
                 </button>
               ))}
             </div>
             <button className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.06]" aria-label="Context controls" title="Context controls">
               <SlidersHorizontal className="w-4 h-4" />
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSend}
            onStopStream={stopStream}
            placeholder={`Message ${PROVIDER_NAMES[provider]}…`}
          />
        </div>
      </div>
    </div>
  );
}
