import { useState } from "react";
import { Link } from "wouter";
import { useListAgents, useCreateAgent, useDeleteAgent } from "@workspace/api-client-react";
import { Bot, Plus, Trash2, Sparkles, ChevronRight, X } from "lucide-react";
import { TherynIcon } from "@/components/nexus-icon";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AGENT_TEMPLATES = [
  {
    emoji: "CODE",
    name: "Code Architect",
    description: "Expert in software engineering, debugging, and code review across all languages.",
    provider: "openai" as const,
    model: "gpt-5.2",
    systemPrompt: "You are Code Architect, an elite software engineer with mastery over all programming languages, frameworks, and software architecture patterns. You write clean, efficient, well-documented code. You proactively identify bugs, suggest optimizations, and explain your reasoning step by step.",
    color: "from-cyan-500 to-blue-600",
    badge: "Development",
  },
  {
    emoji: "WRITE",
    name: "Creative Maestro",
    description: "Master storyteller, copywriter, and creative writing expert.",
    provider: "anthropic" as const,
    model: "claude-sonnet-4-5",
    systemPrompt: "You are Creative Maestro, a world-class author and copywriter. You craft compelling narratives, persuasive copy, and vivid creative content. You adapt your voice to match any genre or tone the user requests — from technical documentation to fantasy epics.",
    color: "from-pink-500 to-fuchsia-600",
    badge: "Writing",
  },
  {
    emoji: "LAB",
    name: "Research Analyst",
    description: "Deep-dives into any topic with structured, evidence-based analysis.",
    provider: "openrouter" as const,
    model: "x-ai/grok-3",
    systemPrompt: "You are Research Analyst, a meticulous researcher and critical thinker. You break down complex topics, cite evidence, identify biases, and deliver well-structured, comprehensive reports. You always separate fact from opinion and highlight what is uncertain.",
    color: "from-emerald-500 to-teal-600",
    badge: "Research",
  },
  {
    emoji: "DATA",
    name: "Data Strategist",
    description: "Translates raw data into actionable business insights and strategies.",
    provider: "openai" as const,
    model: "gpt-5.2",
    systemPrompt: "You are Data Strategist, a senior data scientist and business analyst. You interpret datasets, identify trends, build analytical frameworks, and translate findings into clear business recommendations. You excel at data storytelling and visualization suggestions.",
    color: "from-orange-500 to-amber-500",
    badge: "Analytics",
  },
  {
    emoji: "WORLD",
    name: "Language Guide",
    description: "Patient language tutor supporting 50+ languages with cultural context.",
    provider: "anthropic" as const,
    model: "claude-sonnet-4-5",
    systemPrompt: "You are Language Guide, an expert polyglot and language tutor. You teach grammar, vocabulary, pronunciation, and cultural nuances across any language. You adapt lessons to the student's level, provide practice exercises, and correct mistakes gently with explanations.",
    color: "from-blue-500 to-indigo-600",
    badge: "Education",
  },
  {
    emoji: "FOCUS",
    name: "Strategy Commander",
    description: "High-level business and product strategy advisor for founders and executives.",
    provider: "openrouter" as const,
    model: "x-ai/grok-3",
    systemPrompt: "You are Strategy Commander, a seasoned business strategist and startup advisor with experience spanning Fortune 500s and early-stage startups. You analyze markets, define go-to-market strategies, evaluate competitive landscapes, and help users make high-stakes decisions with clarity and confidence.",
    color: "from-violet-500 to-purple-600",
    badge: "Business",
  },
];

const DEFAULT_FORM = {
  name: "",
  description: "",
  systemPrompt: "You are a helpful AI assistant.",
  provider: "openai" as "openai" | "anthropic" | "openrouter",
  model: "gpt-5.2",
  emoji: "AGENT",
};

export default function AgentsPage() {
  const { data: agents, refetch } = useListAgents();
  const createMutation = useCreateAgent();
  const deleteMutation = useDeleteAgent();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<"templates" | "custom">("templates");

  const applyTemplate = (t: typeof AGENT_TEMPLATES[0]) => {
    setFormData({ name: t.name, description: t.description, systemPrompt: t.systemPrompt, provider: t.provider, model: t.model, emoji: t.emoji });
    setActiveTab("custom");
    setIsOpen(true);
  };

  const openBlank = () => {
    setFormData(DEFAULT_FORM);
    setActiveTab("custom");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ data: formData });
      setIsOpen(false);
      refetch();
      toast({ title: "Agent initialized successfully" });
    } catch {
      toast({ title: "Failed to create agent", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this agent?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
      toast({ title: "Agent deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-full p-6 lg:p-8 relative overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-500/6 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] rounded-full bg-teal-500/6 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Agent Studio</h1>
            <p className="text-muted-foreground mt-1">Build specialized AI constructs with unique personalities</p>
          </div>
          <button
            onClick={openBlank}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
          >
            <Plus className="w-4 h-4" />
            Build from Scratch
          </button>
        </div>

        {/* Templates Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Starter Templates
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Launch a pre-configured agent in one click, then customize to your needs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENT_TEMPLATES.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => applyTemplate(t)}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color} opacity-70`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-xl shadow-lg`}>
                        {t.emoji}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{t.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-muted-foreground border border-white/8">
                          {t.badge}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-black/30 border border-white/8 text-muted-foreground font-mono">
                      {t.provider === "openai" ? "Theryn" : t.provider === "anthropic" ? "Vesper" : "Prism"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* My Agents */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            My Agents
            {agents && agents.length > 0 && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                {agents.length}
              </span>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {agents?.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-5 rounded-2xl border border-white/5 relative group hover:border-emerald-500/30 transition-all duration-300"
                >
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(agent.id)} className="p-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-3xl mb-3 p-3 rounded-xl bg-white/5 inline-block border border-white/5">
                    {agent.emoji}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{agent.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-[9px] font-mono uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                      {agent.provider === "openai" ? "Theryn" : agent.provider === "anthropic" ? "Vesper" : "Prism"}
                    </span>
                  </div>
                  <Link href={`/agents/${agent.id}/chat`} className="block w-full py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black text-center text-xs font-semibold transition-all border border-white/10 hover:border-emerald-500 text-white">
                    Launch Interface
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>

            {(!agents || agents.length === 0) && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-white/8 rounded-2xl">
                <TherynIcon size={40} className="opacity-15 mb-3" />
                <p className="text-sm">No agents yet — pick a template above or build from scratch</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Builder Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="w-full max-w-lg bg-[#101010] border border-white/10 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-display font-bold text-white">Agent Blueprint</h2>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-4 pb-0">
                  {(["templates", "custom"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                    >
                      {tab === "templates" ? "Templates" : "Custom"}
                    </button>
                  ))}
                </div>

                {activeTab === "templates" ? (
                  <div className="p-4 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                    {AGENT_TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => applyTemplate(t)}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.07] hover:border-white/20 transition-all text-left"
                      >
                        <span className="text-2xl">{t.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Name</label>
                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="e.g. Code Master" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Emoji</label>
                        <input required value={formData.emoji} onChange={e => setFormData({ ...formData, emoji: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="AGENT" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Description</label>
                      <input required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="Expert in React and TypeScript" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Engine</label>
                        <Select value={formData.provider} onValueChange={(v: any) => setFormData({ ...formData, provider: v })}>
                          <SelectTrigger className="bg-black/40 border-white/10 h-[40px] text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-secondary border-white/10">
                            <SelectItem value="openai">Theryn Core</SelectItem>
                            <SelectItem value="anthropic">Vesper Core</SelectItem>
                            <SelectItem value="openrouter">Prism Core</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Model ID</label>
                        <input required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="gpt-5.2" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">System Directives</label>
                      <textarea required value={formData.systemPrompt} onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })} className="w-full h-28 bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none transition-colors" placeholder="You are an expert..." />
                    </div>
                    <button type="submit" disabled={createMutation.isPending} className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 transition-all disabled:opacity-50">
                      {createMutation.isPending ? "Initializing..." : "Initialize Agent"}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
