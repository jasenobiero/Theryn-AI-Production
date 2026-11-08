import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useGetAgent, getGetAgentQueryKey } from "@workspace/api-client-react";
import { ChatInterface } from "@/components/chat-interface";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Cpu, MessageSquare, PanelLeft, Plus } from "lucide-react";

interface AgentConversation {
  id: number;
  title: string;
  createdAt: string;
}

interface AgentConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function AgentChatPage() {
  const { id } = useParams<{ id: string }>();
  const agentId = parseInt(id || "0");
  const { data: agent, isLoading } = useGetAgent(agentId, {
    query: {
      queryKey: getGetAgentQueryKey(agentId),
      enabled: !!agentId,
    },
  });
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const refreshConversations = useCallback(async () => {
    const response = await fetch(`/api/agents/${agentId}/conversations`, { credentials: "include" });
    if (!response.ok) throw new Error(`Could not load agent conversations (${response.status})`);
    setConversations(await response.json() as AgentConversation[]);
  }, [agentId]);

  const { messages, isStreaming, sendMessage, stopStream, resetMessages } = useChatStream({
    onConversationId: setConversationId,
    onFinish: () => {
      void refreshConversations().catch(error => toast({
        title: "Conversation history could not be refreshed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      }));
    },
    onError: error => toast({
      title: "Agent request failed",
      description: error.message,
      variant: "destructive",
    }),
  });

  useEffect(() => {
    setConversationId(null);
    resetMessages([]);
    setIsLoadingHistory(true);
    void refreshConversations()
      .catch(error => toast({
        title: "Conversation history could not be loaded",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      }))
      .finally(() => setIsLoadingHistory(false));
  }, [agentId, refreshConversations, resetMessages, toast]);

  const handleSend = (content: string) => {
    sendMessage(`/api/agents/${agentId}/chat`, { content, conversationId }, content);
  };

  const handleSelectConversation = async (id: number) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/conversations/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error(`Could not load conversation (${response.status})`);
      const conversation = await response.json() as { messages: AgentConversationMessage[] };
      setConversationId(id);
      setShowHistory(false);
      resetMessages(conversation.messages.map(message => ({
        id: String(message.id),
        role: message.role,
        content: message.content,
      })));
    } catch (error) {
      toast({
        title: "Could not open conversation",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleNewConversation = () => {
    if (isStreaming) return;
    setConversationId(null);
    setShowHistory(false);
    resetMessages([]);
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Loading agent core...</div>;
  }

  if (!agent) {
    return <div className="h-full flex items-center justify-center text-destructive">Agent not found</div>;
  }

  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <aside className={`w-60 flex-shrink-0 flex-col border-r border-white/[0.06] bg-black/20 ${
        showHistory ? "fixed inset-y-0 left-0 z-50 flex shadow-2xl shadow-black/70" : "hidden"
      } md:relative md:inset-auto md:z-10 md:flex`}>
        <div className="p-3 border-b border-white/[0.06]">
          <Link href="/agents" className="flex items-center gap-2 px-2 py-2 text-xs text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Agent Studio
          </Link>
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={isStreaming}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/60 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conversation => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => void handleSelectConversation(conversation.id)}
              disabled={isStreaming || isLoadingHistory}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                conversation.id === conversationId
                  ? "bg-emerald-500/10 text-white border border-emerald-500/20"
                  : "text-white/45 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span className="flex items-center gap-2 truncate text-xs">
                <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-50" />
                <span className="truncate">{conversation.title || "New conversation"}</span>
              </span>
              <span className="block pl-5 text-[9px] opacity-40 mt-1">{formatDate(conversation.createdAt)}</span>
            </button>
          ))}
          {!isLoadingHistory && conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-white/25">No saved conversations yet</p>
          )}
        </div>
      </aside>

      {showHistory && (
        <button
          type="button"
          aria-label="Close conversation history"
          onClick={() => setShowHistory(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <main className="flex-1 min-w-0 flex flex-col relative z-10">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 glass">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/agents" className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              aria-label="Show conversations"
              className="md:hidden p-2 rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-lg">
                {agent.emoji}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white tracking-wide truncate">{agent.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">({agent.model})</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-white/5 text-xs text-muted-foreground">
              <Cpu className="w-3 h-3" />
              Powered by {agent.provider}
            </div>
            <button
              type="button"
              onClick={handleNewConversation}
              disabled={isStreaming}
              aria-label="New conversation"
              className="md:hidden p-2 rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          <ChatInterface
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSend}
            onStopStream={stopStream}
            placeholder={`Communicate with ${agent.name}...`}
          />
        </div>
      </main>
    </div>
  );
}
