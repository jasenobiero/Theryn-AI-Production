import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetAgent } from "@workspace/api-client-react";
import { ChatInterface } from "@/components/chat-interface";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ArrowLeft, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function AgentChatPage() {
  const { id } = useParams<{ id: string }>();
  const agentId = parseInt(id || "0");
  const { data: agent, isLoading } = useGetAgent(agentId, { query: { enabled: !!agentId } });
  
  // We'll manage session locally for the custom agent chat as per implementation notes
  const [conversationId, setConversationId] = useState<number | null>(null);

  const { messages, isStreaming, sendMessage, stopStream } = useChatStream();

  const handleSend = (content: string) => {
    const url = `/api/agents/${agentId}/chat`;
    sendMessage(url, { content, conversationId }, content);
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Loading agent core...</div>;
  }

  if (!agent) {
    return <div className="h-full flex items-center justify-center text-destructive">Agent not found</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* Cool background effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 glass relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/agents" className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-lg">
              {agent.emoji}
            </div>
            <div>
              <h2 className="font-bold text-white tracking-wide">{agent.name}</h2>
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
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-white/5 text-xs text-muted-foreground">
          <Cpu className="w-3 h-3" />
          Powered by {agent.provider}
        </div>
      </header>

      <div className="flex-1 relative z-10">
        <ChatInterface 
          messages={messages}
          isStreaming={isStreaming}
          onSendMessage={handleSend}
          onStopStream={stopStream}
          placeholder={`Communicate with ${agent.name}...`}
        />
      </div>
    </div>
  );
}
