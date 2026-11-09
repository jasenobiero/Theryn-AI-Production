import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatInterface, type PastedImage } from "@/components/chat-interface";
import { useChatStream } from "@/hooks/use-chat-stream";
import {
  useListOpenaiConversations, useCreateOpenaiConversation, useGetOpenaiConversation,
  useListAnthropicConversations, useCreateAnthropicConversation, useGetAnthropicConversation,
  useListOpenrouterConversations, useCreateOpenrouterConversation, useGetOpenrouterConversation,
  getListOpenaiConversationsQueryKey,
  getListAnthropicConversationsQueryKey,
  getListOpenrouterConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
  getGetAnthropicConversationQueryKey,
  getGetOpenrouterConversationQueryKey,
} from "@workspace/api-client-react";
import { Plus, MessageSquare, ChevronDown, PanelLeft, SlidersHorizontal, Search, Pencil, Trash2, Check, X } from "lucide-react";
import { TherynIcon } from "@/components/nexus-icon";
import { cn, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Provider = "openai" | "anthropic" | "openrouter";

const PROVIDER_NAMES: Record<Provider, string> = {
  openai: "Theryn",
  anthropic: "Vesper",
  openrouter: "Prism",
};

const OPENROUTER_MODELS = [
  { value: "x-ai/grok-4.3",                  label: "Zethon-4" },
  { value: "google/gemini-2.5-pro",           label: "Lumyra Pro" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Sylvax-70" },
  { value: "deepseek/deepseek-coder",         label: "Hexcore" },
];

export default function ChatPage() {
  const queryClient = useQueryClient();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const autoSentRef = useRef(false);
  const mediaAbortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const { data: openaiConvos,     refetch: refetchOpenai }     = useListOpenaiConversations(    { query: { queryKey: getListOpenaiConversationsQueryKey(), enabled: provider === "openai" } });
  const { data: anthropicConvos,  refetch: refetchAnthropic }  = useListAnthropicConversations( { query: { queryKey: getListAnthropicConversationsQueryKey(), enabled: provider === "anthropic" } });
  const { data: openrouterConvos, refetch: refetchOpenrouter } = useListOpenrouterConversations({ query: { queryKey: getListOpenrouterConversationsQueryKey(), enabled: provider === "openrouter" } });

  const createOpenai     = useCreateOpenaiConversation();
  const createAnthropic  = useCreateAnthropicConversation();
  const createOpenrouter = useCreateOpenrouterConversation();

  const { data: openaiHistory }     = useGetOpenaiConversation(    conversationId ?? 0, { query: { queryKey: getGetOpenaiConversationQueryKey(conversationId ?? 0), enabled: provider === "openai"     && !!conversationId } });
  const { data: anthropicHistory }  = useGetAnthropicConversation( conversationId ?? 0, { query: { queryKey: getGetAnthropicConversationQueryKey(conversationId ?? 0), enabled: provider === "anthropic"  && !!conversationId } });
  const { data: openrouterHistory } = useGetOpenrouterConversation(conversationId ?? 0, { query: { queryKey: getGetOpenrouterConversationQueryKey(conversationId ?? 0), enabled: provider === "openrouter" && !!conversationId } });

  const { messages, isStreaming, sendMessage, regenerateLastMessage, stopStream, resetMessages, appendExchange } = useChatStream({
    onFinish: async () => {
      if (provider === "openai") await refetchOpenai();
      if (provider === "anthropic") await refetchAnthropic();
      if (provider === "openrouter") await refetchOpenrouter();
    },
    onError: error => toast({
      title: "Chat request failed",
      description: error.message,
      variant: "destructive",
    }),
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
    if (!images?.length && isVideoGenerationPrompt(content)) {
      toast({
        title: "Video generation coming soon",
        description: "No compatible video provider is configured yet, so no video was created.",
      });
      return;
    }

    if (!images?.length && isImageGenerationPrompt(content)) {
      const controller = new AbortController();
      mediaAbortRef.current = controller;
      setIsGeneratingMedia(true);
      try {
        const response = await fetch("/api/openai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ prompt: content }),
        });
        const result = await response.json() as {
          b64_json?: string;
          error?: string;
          generationsRemainingToday?: number;
        };
        if (!response.ok || !result.b64_json) {
          throw new Error(result.error ?? `Image generation failed (${response.status})`);
        }
        const remaining = result.generationsRemainingToday;
        appendExchange(
          content,
          `Image generated with OpenAI.${typeof remaining === "number" ? ` ${remaining} of 5 daily generations remain.` : ""}`,
          undefined,
          [`data:image/png;base64,${result.b64_json}`],
        );
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          toast({
            title: "Image generation failed",
            description: error instanceof Error ? error.message : "Please check your provider settings and try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsGeneratingMedia(false);
        mediaAbortRef.current = null;
      }
      return;
    }

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
        toast({
          title: "Could not start this chat",
          description: err instanceof Error ? err.message : "The chat service could not be reached. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const url = `/api/${provider}/conversations/${cid}/messages`;
    const body: Record<string, unknown> = { content };
    if (provider === "openrouter") body.model = selectedModel;
    if (images && images.length > 0) {
      body.images = images.map(i => ({ dataUrl: i.dataUrl, mimeType: i.mimeType }));
    }

    await sendMessage(url, body, content, images?.map(i => i.dataUrl));
    const historyKey = provider === "openai"
      ? getGetOpenaiConversationQueryKey(cid)
      : provider === "anthropic"
        ? getGetAnthropicConversationQueryKey(cid)
        : getGetOpenrouterConversationQueryKey(cid);
    await queryClient.refetchQueries({ queryKey: historyKey, exact: true });
  };

  const handleRegenerate = async () => {
    if (!conversationId) return;
    const lastUserMessage = [...messages].reverse().find(message => message.role === "user");
    if (!lastUserMessage) {
    toast({ title: "Unable to regenerate", description: "The original prompt is unavailable.", variant: "destructive" });
    return;
    }

    const body: Record<string, unknown> = { regenerate: true };
    if (provider === "openrouter") body.model = selectedModel;
    if (lastUserMessage.images?.length) {
    body.images = lastUserMessage.images.map(dataUrl => ({
      dataUrl,
      mimeType: dataUrl.match(/^data:([^;]+);/)?.[1] ?? "image/png",
    }));
    }
    await regenerateLastMessage(`/api/${provider}/conversations/${conversationId}/messages`, body);
    const historyKey = provider === "openai"
      ? getGetOpenaiConversationQueryKey(conversationId)
      : provider === "anthropic"
        ? getGetAnthropicConversationQueryKey(conversationId)
        : getGetOpenrouterConversationQueryKey(conversationId);
    await queryClient.refetchQueries({ queryKey: historyKey, exact: true });
  };

  const handleRenameConversation = async (id: number) => {
    const title = editingTitle.trim();
    if (!title || title.length > 120) {
      toast({ title: "Invalid title", description: "Use between 1 and 120 characters.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/${provider}/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setEditingConversationId(null);
      if (provider === "openai") await refetchOpenai();
      if (provider === "anthropic") await refetchAnthropic();
      if (provider === "openrouter") await refetchOpenrouter();
    } catch (error) {
      toast({
        title: "Could not rename conversation",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/${provider}/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      if (conversationId === id) {
        setConversationId(null);
        resetMessages([]);
      }
      if (provider === "openai") await refetchOpenai();
      if (provider === "anthropic") await refetchAnthropic();
      if (provider === "openrouter") await refetchOpenrouter();
    } catch (error) {
      toast({
        title: "Could not delete conversation",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (pendingMsg && !autoSentRef.current) {
      autoSentRef.current = true;
      const t = setTimeout(() => handleSend(pendingMsg), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const convos =
    provider === "openai"     ? openaiConvos :
    provider === "anthropic"  ? anthropicConvos :
    openrouterConvos;
  const filteredConvos = (convos ?? []).filter(c =>
    c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const selectedModelLabel = OPENROUTER_MODELS.find(m => m.value === selectedModel)?.label ?? selectedModel;

  return (
      <div className="flex h-full min-h-0 w-full overflow-hidden relative">

      {/* Sidebar */}
       <div className={cn(
           "w-[280px] flex-shrink-0 flex-col border-r border-white/[0.06] bg-[hsl(0_0%_4%_/_0.78)]",
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

         <div className="px-3 pt-3">
           <label className="flex items-center gap-2 px-3 rounded-lg border border-white/[0.07] bg-white/[0.03]">
             <Search className="w-3.5 h-3.5 text-white/30" />
             <input
               value={searchQuery}
               onChange={event => setSearchQuery(event.target.value)}
               placeholder="Search conversations"
               className="w-full py-2 bg-transparent text-xs text-white placeholder:text-white/25 outline-none"
             />
           </label>
         </div>
         <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversationId === null && messages.length > 0 && (
            <div className="px-3 py-2.5 rounded-lg text-xs text-white border border-cyan-200/15 bg-cyan-300/5">
              <p className="font-medium truncate">Current session</p>
              <p className="text-[10px] text-white/30 mt-0.5">Unsaved</p>
            </div>
          )}
          {filteredConvos.map(c => (
            <div
              key={c.id}
              className={cn(
                "group rounded-lg border transition-all",
                conversationId === c.id
                  ? "bg-cyan-300/10 border-cyan-200/20 text-white"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border-transparent"
              )}
            >
              {editingConversationId === c.id ? (
                <div className="flex items-center gap-1 px-2 py-2">
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={event => setEditingTitle(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") void handleRenameConversation(c.id);
                      if (event.key === "Escape") setEditingConversationId(null);
                    }}
                    maxLength={120}
                    aria-label="Conversation title"
                    className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none"
                  />
                  <button onClick={() => void handleRenameConversation(c.id)} aria-label="Save title" className="p-1 text-cyan-100 hover:text-white">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingConversationId(null)} aria-label="Cancel rename" className="p-1 text-white/40 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-2">
                  <button
                    onClick={() => {
                      setConversationId(c.id);
                      if (provider === "openrouter") {
                        const modelName = (c as { model?: unknown }).model;
                        if (typeof modelName === "string") setSelectedModel(modelName);
                      }
                      setShowHistory(false);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-50" />
                      <span className="text-xs font-medium truncate">{c.title}</span>
                    </span>
                    <span className="block text-[9px] opacity-40 pl-4">{formatDate(c.createdAt)}</span>
                  </button>
                  <button
                    onClick={() => { setEditingConversationId(c.id); setEditingTitle(c.title); }}
                    aria-label={`Rename ${c.title}`}
                    title="Rename"
                    className="p-1 text-white/30 hover:text-white"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => void handleDeleteConversation(c.id, c.title)}
                    aria-label={`Delete ${c.title}`}
                    title="Delete"
                    className="p-1 text-white/30 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {(!convos || convos.length === 0) && conversationId === null && messages.length === 0 && (
            <p className="text-center text-xs text-white/20 py-8">No saved chats yet</p>
          )}
          {convos && convos.length > 0 && filteredConvos.length === 0 && (
            <p className="text-center text-xs text-white/20 py-8">No matching conversations</p>
          )}
        </div>
      </div>

       {showHistory && (
         <button aria-label="Close conversation history" onClick={() => setShowHistory(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />
       )}

       {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <div className="min-h-16 flex-shrink-0 flex items-center gap-3 px-4 md:px-8 py-2.5 border-b border-white/[0.06] bg-[hsl(0_0%_4%_/_0.72)]">
           <button onClick={() => setShowHistory(true)} className="lg:hidden p-2 -ml-2 text-white/45 hover:text-white" aria-label="Show conversations">
             <PanelLeft className="w-4 h-4" />
           </button>
          <TherynIcon size={24} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.18)]" />
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
            isStreaming={isStreaming || isGeneratingMedia}
            onSendMessage={handleSend}
            onRegenerate={conversationId ? handleRegenerate : undefined}
            onStopStream={() => { stopStream(); mediaAbortRef.current?.abort(); }}
            placeholder={`Message ${PROVIDER_NAMES[provider]}…`}
          />
        </div>
      </div>
    </div>
  );
}

function isImageGenerationPrompt(content: string): boolean {
  return /\b(?:generate|create|make|draw|paint|render)\b[\s\S]{0,80}\b(?:image|picture|illustration|artwork|photo)\b/i.test(content);
}

function isVideoGenerationPrompt(content: string): boolean {
  return /\b(?:generate|create|make|render|produce)\b[\s\S]{0,80}\b(?:video|film|clip|animation)\b/i.test(content);
}
