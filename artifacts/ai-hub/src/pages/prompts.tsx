import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked, Search, Plus, Trash2, Copy, Check,
  ArrowRight, X, Code2, Pencil, FlaskConical, TrendingUp,
  Globe, Lightbulb, Wand2, BookOpen, Briefcase, Cpu,
  Heart, Laugh, Rocket, Shield, Music, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Prompt {
  id: string;
  title: string;
  text: string;
  category: string;
  builtin?: boolean;
}

const CATEGORIES = [
  { id: "all",       label: "All",        icon: BookMarked },
  { id: "coding",    label: "Coding",     icon: Code2 },
  { id: "writing",   label: "Writing",    icon: Pencil },
  { id: "analysis",  label: "Analysis",   icon: TrendingUp },
  { id: "creative",  label: "Creative",   icon: Wand2 },
  { id: "business",  label: "Business",   icon: Briefcase },
  { id: "learning",  label: "Learning",   icon: BookOpen },
  { id: "science",   label: "Science",    icon: FlaskConical },
  { id: "web",       label: "Web",        icon: Globe },
  { id: "ai",        label: "AI & Tech",  icon: Cpu },
  { id: "fun",       label: "Fun",        icon: Laugh },
  { id: "saved",     label: "My Prompts", icon: Heart },
];

const BUILTIN: Prompt[] = [
  // Coding
  { id: "b1",  category: "coding",   title: "Script from description",     text: "Write a Python script that {describe what it should do}. Include error handling, comments, and a usage example." },
  { id: "b2",  category: "coding",   title: "Debug this code",             text: "Here's my code that isn't working as expected:\n\n```\n{paste code here}\n```\n\nExplain what's wrong and provide a fixed version." },
  { id: "b3",  category: "coding",   title: "Code review",                 text: "Review this code for bugs, performance issues, and best practices:\n\n```\n{paste code here}\n```\n\nProvide specific improvements." },
  { id: "b4",  category: "coding",   title: "Algorithm explanation",       text: "Explain the {algorithm name} algorithm step by step. Include time/space complexity, a simple analogy, and a Python implementation." },
  { id: "b5",  category: "coding",   title: "API design",                  text: "Design a RESTful API for a {type of application}. Include all endpoints, request/response schemas, authentication strategy, and error codes." },
  { id: "b6",  category: "coding",   title: "Convert to TypeScript",       text: "Convert this JavaScript code to TypeScript with proper types, interfaces, and best practices:\n\n```\n{paste code here}\n```" },

  // Writing
  { id: "b7",  category: "writing",  title: "Product launch email",        text: "Write a compelling product launch email for {product name}. It's a {brief description}. Target audience: {audience}. Tone: professional but exciting." },
  { id: "b8",  category: "writing",  title: "Blog post outline",           text: "Create a detailed blog post outline about '{topic}'. Include an engaging title, 5-7 main sections, key points for each, and a compelling CTA." },
  { id: "b9",  category: "writing",  title: "Persuasive essay",            text: "Write a persuasive essay arguing that {position}. Use strong evidence, anticipate counterarguments, and end with a powerful conclusion." },
  { id: "b10", category: "writing",  title: "Executive summary",           text: "Write an executive summary for {document/project}. Key points: {list them}. Keep it under 300 words, professional, and focused on impact." },
  { id: "b11", category: "writing",  title: "Cold outreach message",       text: "Write a personalized cold outreach message to {target person/company} about {offer/proposal}. Keep it under 150 words, specific, and add a clear CTA." },

  // Analysis
  { id: "b12", category: "analysis", title: "SWOT analysis",               text: "Perform a thorough SWOT analysis for {company/product/idea}. For each quadrant, provide 5+ specific, actionable insights." },
  { id: "b13", category: "analysis", title: "Pros and cons",               text: "Analyze the pros and cons of {topic/decision} from multiple perspectives. Consider short-term vs long-term implications and give a final recommendation." },
  { id: "b14", category: "analysis", title: "Compare options",             text: "Compare {option A} vs {option B} across these dimensions: cost, ease of use, scalability, community support, and long-term viability. Give a final verdict." },
  { id: "b15", category: "analysis", title: "Data interpretation",         text: "Help me interpret this data: {paste data}. Identify trends, anomalies, and actionable insights. Suggest what questions I should be asking." },

  // Creative
  { id: "b16", category: "creative", title: "Sci-fi short story",          text: "Write a short sci-fi story (500 words) about {premise}. Make it thought-provoking with a twist ending. Focus on character development and vivid world-building." },
  { id: "b17", category: "creative", title: "Brand name brainstorm",       text: "Brainstorm 20 creative brand names for a {type of company} that {what it does}. For each, explain the meaning and why it works." },
  { id: "b18", category: "creative", title: "Movie pitch",                 text: "Write a movie pitch for a {genre} film about {premise}. Include: logline, 3-act structure summary, main characters, tone, and target audience." },
  { id: "b19", category: "creative", title: "Poem generator",              text: "Write a {style} poem about {subject}. Make it emotionally resonant and use vivid imagery. Length: {short/medium/long}." },
  { id: "b20", category: "creative", title: "Character creator",           text: "Create a detailed fictional character for {setting/genre}. Include: name, backstory, personality, flaws, goals, speech patterns, and a key defining moment." },

  // Business
  { id: "b21", category: "business", title: "Business plan summary",       text: "Write a one-page business plan for {idea}. Include: problem, solution, target market, revenue model, go-to-market strategy, and 12-month milestones." },
  { id: "b22", category: "business", title: "Startup pitch deck outline",  text: "Create a 10-slide pitch deck outline for {startup name}, a {what it does}. Include what to say on each slide for maximum investor impact." },
  { id: "b23", category: "business", title: "OKR framework",               text: "Help me write OKRs for {team/company} for Q{quarter}. Goals: {list goals}. Create 3 objectives with 3 key results each. Make them ambitious but measurable." },
  { id: "b24", category: "business", title: "Pricing strategy",            text: "Recommend a pricing strategy for {product}. Target customer: {customer}. Competitors charge {price range}. Consider value-based, cost-plus, and freemium models." },

  // Learning
  { id: "b25", category: "learning", title: "Study plan",                  text: "Create a 30-day study plan to learn {topic} from scratch. I can dedicate {hours} per day. Include resources, milestones, and daily exercises." },
  { id: "b26", category: "learning", title: "Explain like I'm 5",          text: "Explain {complex concept} as if I'm a complete beginner. Use simple analogies, avoid jargon, and build up understanding step by step." },
  { id: "b27", category: "learning", title: "Interview prep",              text: "I'm interviewing for a {role} position at {company type}. Give me the 20 most likely questions with model answers, focusing on {area}." },
  { id: "b28", category: "learning", title: "Flashcard generator",         text: "Create 20 flashcards (Q&A format) for studying {topic}. Cover the most important concepts, definitions, and tricky distinctions a beginner would struggle with." },

  // Science
  { id: "b29", category: "science",  title: "Research summary",            text: "Summarize the current scientific consensus on {topic}. Include: what we know, what's still debated, recent breakthroughs, and practical implications." },
  { id: "b30", category: "science",  title: "Hypothesis generator",        text: "I'm researching {topic}. Help me generate 5 testable hypotheses, explain the rationale behind each, and suggest simple experiments to test them." },

  // Web
  { id: "b31", category: "web",      title: "Landing page copy",           text: "Write complete landing page copy for {product/service}. Include: hero headline, subheadline, 3 feature sections, social proof section, and 3 CTA variations." },
  { id: "b32", category: "web",      title: "SEO meta tags",               text: "Write SEO-optimized title tags and meta descriptions for a {type of page} about {topic}. Target keyword: {keyword}. Give 5 variations for A/B testing." },

  // AI & Tech
  { id: "b33", category: "ai",       title: "System prompt engineer",      text: "Help me write a system prompt for an AI assistant that {purpose}. It should: {requirements}. Make it clear, specific, and prevent common failure modes." },
  { id: "b34", category: "ai",       title: "Prompt chain designer",       text: "Design a multi-step prompt chain to accomplish {complex task}. Break it into sequential steps, with each prompt building on previous outputs." },
  { id: "b35", category: "ai",       title: "AI use case ideation",        text: "Brainstorm 15 AI automation use cases for a {type of business}. Prioritize by impact vs effort, and describe the implementation approach for the top 3." },

  // Fun
  { id: "b36", category: "fun",      title: "Roast me",                    text: "Roast my LinkedIn profile in the style of a comedy roast. Keep it brutal but good-natured. Profile: {paste your bio or describe yourself}." },
  { id: "b37", category: "fun",      title: "Explain badly",               text: "Explain {concept} as badly as possible — use wrong analogies, mix things up, and be confidently incorrect. Then explain why each part is wrong." },
  { id: "b38", category: "fun",      title: "Debate both sides",           text: "Argue both sides of this debate: '{topic}'. Give equally strong arguments for and against, then vote for the winner and explain why." },
  { id: "b39", category: "fun",      title: "Would you rather",            text: "Create 10 increasingly absurd 'Would you rather' questions related to {theme}. Make them genuinely difficult choices with real trade-offs." },
  { id: "b40", category: "fun",      title: "Compliment generator",        text: "Write 10 highly specific, unusually sincere compliments for someone who {describe person}. Make them feel genuinely seen and appreciated." },
];

const STORAGE_KEY = "theryn:saved-prompts";

function loadSaved(): Prompt[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function saveSaved(prompts: Prompt[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

// Expanded prompt card
function PromptCard({ prompt, onUse, onSave, onDelete, isSaved }: {
  prompt: Prompt;
  onUse: (p: Prompt) => void;
  onSave: (p: Prompt) => void;
  onDelete?: (id: string) => void;
  isSaved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border transition-colors cursor-pointer group",
        expanded ? "border-red-500/20 bg-red-600/[0.04]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
      )}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{prompt.title}</p>
          <p className={cn("text-[11px] text-white/30 mt-1 leading-relaxed", !expanded && "line-clamp-2")}>
            {prompt.text}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={copy} className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {!prompt.builtin && onDelete && (
            <button onClick={() => onDelete(prompt.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {prompt.builtin && (
            <button
              onClick={() => onSave(prompt)}
              className={cn("p-1.5 rounded-lg transition-all", isSaved ? "text-red-400 bg-red-500/10" : "text-white/25 hover:text-red-400 hover:bg-red-500/10")}
              title={isSaved ? "Saved" : "Save to My Prompts"}
            >
              <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 mb-3 text-xs text-white/50 font-mono leading-relaxed whitespace-pre-wrap">
            {prompt.text}
          </div>
          <button
            onClick={() => onUse(prompt)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all shadow-[0_0_12px_-4px_rgba(220,38,38,0.5)]"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Use this prompt
          </button>
        </div>
      )}
    </motion.div>
  );
}

// New prompt dialog
function NewPromptDialog({ onSave, onClose }: {
  onSave: (p: Omit<Prompt, "id">) => void;
  onClose: () => void;
}) {
  const [title, setTitle]     = useState("");
  const [text, setText]       = useState("");
  const [category, setCategory] = useState("saved");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: "hsl(0 0% 8%)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <span className="text-sm font-bold text-white">New Prompt</span>
          <button onClick={onClose} className="text-white/25 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="E.g. My code review template"
              className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/30 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Prompt text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Your prompt here. Use {placeholders} for variable parts."
              rows={5}
              className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/30 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30 transition-colors"
            >
              {CATEGORIES.filter(c => c.id !== "all").map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => { if (title && text) { onSave({ title, text, category }); onClose(); } }}
            disabled={!title.trim() || !text.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
          >
            Save Prompt
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/[0.07] text-white/40 text-sm hover:text-white/70 transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PromptsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch]         = useState("");
  const [activeCategory, setCategory] = useState("all");
  const [saved, setSaved]           = useState<Prompt[]>(loadSaved);
  const [showNew, setShowNew]       = useState(false);

  useEffect(() => { saveSaved(saved); }, [saved]);

  const savePrompt = (p: Prompt) => {
    if (saved.find(s => s.id === p.id || s.text === p.text)) return;
    setSaved(prev => [{ ...p, id: `s-${Date.now()}`, builtin: false }, ...prev]);
  };

  const deletePrompt = (id: string) => setSaved(prev => prev.filter(p => p.id !== id));

  const usePrompt = (p: Prompt) => {
    navigate(`/chat?msg=${encodeURIComponent(p.text)}`);
  };

  const addNew = (p: Omit<Prompt, "id">) => {
    setSaved(prev => [{ ...p, id: `s-${Date.now()}`, builtin: false }, ...prev]);
  };

  const allPrompts: Prompt[] = [
    ...saved.map(s => ({ ...s, category: "saved" })),
    ...BUILTIN,
  ];

  const filtered = allPrompts.filter(p => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch   = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || p.text.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const savedIds = new Set(saved.map(s => s.text));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.05] px-6 py-4" style={{ background: "hsl(0 0% 5%)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Prompt Library</h1>
              <p className="text-[10px] text-white/25">{BUILTIN.length} curated prompts · {saved.length} saved</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Prompt
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/20 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => {
            const count = cat.id === "all"
              ? allPrompts.length
              : cat.id === "saved"
              ? saved.length
              : BUILTIN.filter(p => p.category === cat.id).length;
            if (count === 0 && cat.id !== "all" && cat.id !== "saved") return null;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                  activeCategory === cat.id
                    ? "bg-red-600/20 text-red-300 border border-red-500/20"
                    : "text-white/35 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12]"
                )}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
                <span className={cn("text-[9px] px-1 rounded", activeCategory === cat.id ? "text-red-400/70" : "text-white/20")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/20">
            <Search className="w-8 h-8" />
            <p className="text-sm">No prompts found</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map(p => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  <PromptCard
                    prompt={p}
                    onUse={usePrompt}
                    onSave={savePrompt}
                    onDelete={deletePrompt}
                    isSaved={savedIds.has(p.text)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* New prompt dialog */}
      <AnimatePresence>
        {showNew && <NewPromptDialog onSave={addNew} onClose={() => setShowNew(false)} />}
      </AnimatePresence>
    </div>
  );
}
