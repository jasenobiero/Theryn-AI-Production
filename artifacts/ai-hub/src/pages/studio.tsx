import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, StopCircle, Plus, ChevronDown, Sparkles,
  Eye, KeyRound, Check, EyeOff, FolderOpen, Trash2, Save, CircleAlert,
  Clock, ChevronLeft, Loader2, X, LayoutGrid, Search,
  Gamepad2, Globe, AppWindow, Wrench, LineChart, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TherynIcon } from "@/components/nexus-icon";
import { Markdown } from "@/components/markdown";
import {
  ArtifactPanel, parseArtifact, parseSecrets,
  type Artifact, type SecretRequest,
} from "@/components/artifact-panel";

type Provider = "openai" | "anthropic" | "openrouter";

const PROVIDERS: { value: Provider; label: string; dot: string }[] = [
  { value: "openai",     label: "Theryn",   dot: "bg-green-400"  },
  { value: "anthropic",  label: "Vesper",   dot: "bg-orange-400" },
  { value: "openrouter", label: "Prism",    dot: "bg-purple-400" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ProjectMeta {
  id: number;
  title: string;
  provider: string;
  artifactTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Template Gallery Data ────────────────────────────────────

type TemplateCategory = "all" | "games" | "web" | "apps" | "tools" | "visual" | "data";

interface Template {
  id: string;
  category: TemplateCategory;
  icon: string;
  label: string;
  sub: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  // Games
  { id:"g1", category:"games", icon:"🐍", label:"Snake Game",     sub:"Classic arcade",        prompt:"Build a Snake game with smooth canvas rendering, dark neon aesthetic (#0a0a0a bg + bright green snake + red food), particle burst when eating food, Web Audio API sound effects, increasing speed per level, localStorage high score, start/pause/game-over screens, keyboard + WASD controls, and mobile swipe support. Make it feel satisfying and polished." },
  { id:"g2", category:"games", icon:"🧱", label:"Tetris",          sub:"Block stacker",         prompt:"Build a fully playable Tetris with all 7 colored tetrominoes, smooth movement with wall kicks, ghost piece preview, hold piece, next 3 pieces shown, proper scoring (single/double/triple/tetris lines), level system with increasing speed, complete line-clear animations, Web Audio API sounds, localStorage high score. Professional dark UI with side panel." },
  { id:"g3", category:"games", icon:"👾", label:"Space Invaders",  sub:"Retro shooter",         prompt:"Build Space Invaders with animated alien grid (3×11), player laser cannon, particle explosions on hits, mystery UFO with bonus points, shield barriers that degrade, wave system with increasing difficulty, 3 lives, score display, Web Audio API retro sounds, high score persistence. Dark space background with star field." },
  { id:"g4", category:"games", icon:"🃏", label:"Memory Game",     sub:"Card matching",         prompt:"Build a Memory card matching game with 16 emoji-icon cards (8 pairs), smooth CSS 3D flip animation, difficulty selector (4×4 / 6×6), move counter, timer, best score per difficulty in localStorage, satisfying match/miss feedback sounds via Web Audio API, colorful completion confetti animation. Dark cards with bright face reveal." },
  { id:"g5", category:"games", icon:"🏓", label:"Pong",            sub:"2-player classic",      prompt:"Build Pong with smooth 60fps canvas rendering, single-player vs AI (3 difficulty levels) and 2-player mode (W/S vs Up/Down arrows), ball that accelerates each rally, particle trail, score to 10, Web Audio API sounds (bleep/bloop), menu and end screens, neon aesthetic on black background." },
  { id:"g6", category:"games", icon:"💎", label:"Breakout",        sub:"Brick breaker",         prompt:"Build Breakout with colorful brick grid (normal/hard/indestructible bricks), accurate ball physics with angle control by paddle position, falling power-ups (multi-ball, wide paddle, laser, slow-mo), particle explosions, 10+ levels with distinct patterns, lives system, combo score multiplier, Web Audio API sounds. Polished dark UI." },
  // Web
  { id:"w1", category:"web",   icon:"🚀", label:"SaaS Landing",   sub:"Full marketing page",   prompt:"Build a complete SaaS landing page for 'Nexus AI' (AI analytics platform). Include: sticky blur nav + CTA, animated hero with gradient headline + dashboard mockup (CSS), social proof logo bar, 6 feature cards with icons, 3-step how-it-works, 3-tier pricing (Free/Pro $49/Enterprise) with feature checklists and popular badge, 3 testimonials with avatars, FAQ accordion (5 items), bold CTA, full footer. Modern indigo/purple primary color. All sections fully built." },
  { id:"w2", category:"web",   icon:"💼", label:"Portfolio",       sub:"Developer showcase",    prompt:"Build a stunning developer portfolio for 'Alex Chen — Senior Full Stack Engineer'. Include: hero with typewriter name animation + cycling roles, skills grid with proficiency indicators, 6 project cards with tech tags and hover reveal, timeline experience section, floating 'Available for work' badge, contact form with send animation. Dark theme with red accent and subtle grid background." },
  { id:"w3", category:"web",   icon:"🛍️", label:"E-commerce Store", sub:"Product shop",         prompt:"Build a premium e-commerce store for 'VOLT' tech accessories. Include: header with search + cart badge, product grid (6 items: earbuds $89, keyboard $149, mouse $79, webcam $129, USB hub $59, desk mat $39) with hover zoom + quick-add, product detail modal with tabs, sliding cart sidebar with quantity controls + subtotal, empty states, localStorage cart. Electric blue accent on dark/white split theme." },
  { id:"w4", category:"web",   icon:"🍕", label:"Restaurant Site", sub:"Food & dining",         prompt:"Build a luxury restaurant website for 'Ember & Oak' steakhouse. Include: full-screen animated hero (CSS gradient), sticky nav, about chef section, tabbed menu (Starters/Mains/Desserts/Wine with prices), photo gallery masonry grid, reservation form with date/time picker, testimonial quotes, hours/location, footer. Warm palette: deep brown + gold + cream." },
  { id:"w5", category:"web",   icon:"📰", label:"Blog / Magazine",  sub:"Editorial layout",     prompt:"Build a modern editorial blog/magazine layout for 'Syntax' — a tech publication. Include: sticky header with category nav, featured hero article (large with overlay), 2-column article grid with cards (author avatar, category tag, read time, title, excerpt), sidebar (trending, newsletter signup, tags), individual article view with beautiful typography, dark/light mode toggle. Inter font, clean and editorial." },
  { id:"w6", category:"web",   icon:"🌙", label:"Coming Soon",     sub:"Launch countdown",      prompt:"Build a beautiful coming soon / pre-launch page for a product called 'Orbit'. Include: centered hero with logo + big bold headline, email signup with validation, countdown timer to a date 30 days from now (days/hours/minutes/seconds with flip animation), animated gradient background or particles, social links, 'Get notified' form with success state. Dark, modern, impressive." },
  // Apps
  { id:"a1", category:"apps",  icon:"📋", label:"Kanban Board",   sub:"Drag & drop tasks",     prompt:"Build a full Kanban project board with 4 columns (To Do / In Progress / Review / Done) with card counts. Features: drag-and-drop cards between columns via Sortable.js, card detail modal (title, description, priority: low/medium/high color tags, due date, assignee initials badge), add/edit/delete cards, column collapse, localStorage persistence. Dark glassmorphism cards, smooth animations." },
  { id:"a2", category:"apps",  icon:"📝", label:"Markdown Notes",  sub:"Split editor",          prompt:"Build a markdown notes app with: sidebar listing notes (title preview + relative timestamp), create/delete/pin/search notes, split-pane editor (left: raw markdown, right: live preview via Marked.js), formatting toolbar (Bold/Italic/Code/Link/List/Heading buttons), word count, auto-save every 30s with indicator, export note as .md file, localStorage persistence. Dark IDE aesthetic." },
  { id:"a3", category:"apps",  icon:"💰", label:"Budget Tracker",  sub:"Personal finance",      prompt:"Build a personal budget tracker with: set monthly budget, add income/expense entries (amount, category with emoji, description, date), category breakdown donut chart (Chart.js), monthly trend bar chart, transaction list with category filter, running balance, savings rate, export CSV functionality. Categories: 🏠 Housing 🚗 Transport 🍔 Food 🎮 Entertainment 💊 Health ✈️ Travel. Green/red income/expense theming. localStorage." },
  { id:"a4", category:"apps",  icon:"⏰", label:"Pomodoro Timer",  sub:"Focus & productivity",  prompt:"Build a Pomodoro timer with: large circular SVG progress ring (animated stroke-dashoffset), 25/5/15 min work-short-long cycles, session counter (long break after 4), task queue (add tasks, tick off, show current), Web Audio API bell sounds, desktop notification request, daily stats (pomodoros completed, focus time), settings modal for custom durations, dark focus-mode aesthetic with red accent." },
  { id:"a5", category:"apps",  icon:"🏃", label:"Habit Tracker",   sub:"Daily streaks",         prompt:"Build a habit tracker with: add habits with emoji + color, GitHub-style heatmap (12 weeks × 7 days grid), 🔥 streak counter, one-click check-off with satisfying animation, weekly completion rate per habit, overall stats, motivational messages, compact weekly chart (Chart.js), localStorage persistence. Dark card layout, red accent for active streaks." },
  { id:"a6", category:"apps",  icon:"🗓️", label:"Calendar App",    sub:"Events & scheduling",   prompt:"Build a monthly calendar app with: month/week/day views switchable, click day to add events with title/time/color/category, event detail popover, drag events between days, mini-calendar sidebar for navigation, today highlight, event color coding by category (Work/Personal/Health/Social), recurring event option, month summary stats, localStorage. Clean white/dark theme." },
  // Tools
  { id:"t1", category:"tools", icon:"🔢", label:"Calculator",      sub:"Scientific",            prompt:"Build a scientific calculator with standard ops (+−×÷), scientific functions (sin/cos/tan/log/ln/√/x²/xⁿ/π/e/!), parentheses, full expression display at top + answer below, calculation history (last 10 with recall on click), keyboard input support, DEG/RAD toggle, dark theme with red accent keys, smooth press animation." },
  { id:"t2", category:"tools", icon:"🔐", label:"Password Gen",    sub:"Secure passwords",      prompt:"Build a password generator with: length slider 8-128, toggles (uppercase/lowercase/numbers/symbols/ambiguous chars), password strength meter (entropy bits + visual bar + label), bulk mode (generate 10), copy with feedback, pronounceable mode, passphrase mode (4-6 random words + separator), last 20 passwords history. Dark security-themed UI." },
  { id:"t3", category:"tools", icon:"🎨", label:"Color Toolkit",   sub:"Palette & converter",   prompt:"Build a color toolkit with 4 tabs: 1) Palette Generator (input color → harmonious palettes: complementary/triadic/analogous/split-complementary, copy swatches as CSS/JSON), 2) Converter (HEX/RGB/HSL/HSV/CMYK real-time), 3) Gradient Maker (color stops, linear/radial/conic, preview + copy CSS), 4) Contrast Checker (WCAG AA/AAA). Dark UI with vibrant color swatches." },
  { id:"t4", category:"tools", icon:"📋", label:"JSON Formatter",  sub:"Parse & validate",      prompt:"Build a JSON developer toolkit with tabs: 1) Formatter (paste JSON → pretty print with 2/4 space indent, syntax highlight keys/strings/numbers in different colors, error display with line numbers), 2) Diff (compare 2 JSON objects, highlight differences), 3) JSON→CSV converter, 4) JSON→YAML converter, 5) JSONPath query tester. Full-width editor, monospace, line numbers." },
  { id:"t5", category:"tools", icon:"⚡", label:"Regex Tester",    sub:"Pattern matching",      prompt:"Build a regex tester with: pattern input + flags (g/i/m/s/u), test string textarea, live highlighting of all matches as you type (colored spans), match list below with group captures, substitution tab (replace pattern with template, preview result), common regex library (email/URL/phone/date/IPv4/etc with labels), syntax reference sidebar, dark monospace IDE look." },
  { id:"t6", category:"tools", icon:"📸", label:"QR Generator",    sub:"QR codes",              prompt:"Build a QR code generator with: type selector (URL/Text/Email/Phone/WiFi/vCard), dynamic form per type, live QR preview updating as you type (QRCode.js), size selector (256/512/1024px), error correction level (L/M/Q/H), foreground/background color pickers, download as PNG, QR history (last 8 as thumbnails) in localStorage. Dark minimal UI." },
  // Visual
  { id:"v1", category:"visual",icon:"✨", label:"Particle System", sub:"Interactive canvas",    prompt:"Build an interactive particle system with 400 particles on dark canvas, mouse interaction (particles flee from cursor with spring physics, left-click creates explosion burst, right-click creates black-hole gravity well), color-cycling neon particles (HSL animation), connection lines between nearby particles, velocity-based size, toggle buttons: gravity mode / rainbow / fireworks / attraction. Smooth 60fps requestAnimationFrame." },
  { id:"v2", category:"visual",icon:"🌌", label:"3D Solar System", sub:"Three.js simulation",   prompt:"Build an interactive 3D solar system using Three.js. Include all 8 planets with accurate relative colors and sizes, Saturn's rings, Earth's moon, orbiting animations at correct relative speeds, 5000-star background, orbit trail lines, ambient + point lighting from sun (glowing sphere), mouse-drag to rotate the scene, scroll to zoom, click a planet to focus camera and show info panel (name, diameter, orbital period). Dark space theme." },
  { id:"v3", category:"visual",icon:"🎵", label:"Music Visualizer", sub:"Audio reactive",       prompt:"Build a music visualizer using Web Audio API with file upload + a built-in generated demo track (oscillator composition). Visualization modes (switch with buttons): 1) Frequency bars with gradient, 2) Circular waveform, 3) Oscilloscope line, 4) Radial burst petals. Play/pause/volume controls, track info display, 5 color themes (Fire/Ocean/Neon/Mono/Rainbow), BPM estimator. Dark with glowing effects." },
  { id:"v4", category:"visual",icon:"🎨", label:"Generative Art",  sub:"CSS/Canvas patterns",  prompt:"Build a generative art studio with: canvas that generates beautiful algorithmic art, 8 algorithms (flow field / Voronoi / L-system trees / Mondrian / Spiral galaxy / Truchet tiles / Hilbert curve / Random walk), parameter sliders (density, complexity, color palette), color scheme selector (5 palettes), animate toggle for live evolution, seed input for reproducible results, download PNG. Dark minimal UI." },
  // Data
  { id:"d1", category:"data",  icon:"📊", label:"Analytics Dash",  sub:"Full dashboard",        prompt:"Build a complete analytics SaaS dashboard with: collapsible sidebar (Dashboard/Analytics/Users/Revenue/Reports/Settings with icons + active state), top header (search bar, notifications badge, user avatar), 4 KPI cards (Revenue $124,832 +12.4% / Users 24,891 +8.1% / Conversion 3.24% +0.5% / Churn 1.2% -0.3%) with mini sparklines, 12-month revenue line chart with gradient fill, acquisition donut chart by channel, top pages table with sorting, recent activity feed. Dark theme. Chart.js." },
  { id:"d2", category:"data",  icon:"💹", label:"Stock Tracker",   sub:"Portfolio manager",     prompt:"Build a stock portfolio tracker with: add holdings (ticker, shares, avg cost), current price simulation (mock real-time updates every 3s ±0.5%), gain/loss per holding ($ and %), portfolio total, daily P&L, allocation donut chart, 30-day sparkline per stock (simulated historical data), portfolio vs S&P comparison line chart (Chart.js), sector breakdown. Dark finance theme with green/red gain/loss colors." },
  { id:"d3", category:"data",  icon:"🌍", label:"World Data Viz",  sub:"D3 visualization",      prompt:"Build a world data visualization with D3.js showing life expectancy vs GDP per capita scatter plot (bubble size = population, color = continent) with 195 countries of realistic data, animated axis transitions, hover tooltips with country info, continent filter checkboxes, year slider (animate from 1990-2023 with interpolated data), zoom/pan, top 10 countries bar chart that updates with filters. Dark theme." },
];

const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; icon: React.ElementType; count: number }[] = [
  { id: "all",    label: "All",     icon: LayoutGrid, count: TEMPLATES.length },
  { id: "games",  label: "Games",   icon: Gamepad2,   count: TEMPLATES.filter(t => t.category === "games").length },
  { id: "web",    label: "Web",     icon: Globe,      count: TEMPLATES.filter(t => t.category === "web").length },
  { id: "apps",   label: "Apps",    icon: AppWindow,  count: TEMPLATES.filter(t => t.category === "apps").length },
  { id: "tools",  label: "Tools",   icon: Wrench,     count: TEMPLATES.filter(t => t.category === "tools").length },
  { id: "visual", label: "Visual",  icon: Cpu,        count: TEMPLATES.filter(t => t.category === "visual").length },
  { id: "data",   label: "Data",    icon: LineChart,  count: TEMPLATES.filter(t => t.category === "data").length },
];

// ─── Template Gallery Modal ───────────────────────────────────
function TemplateGallery({ onUse, onClose }: { onUse: (prompt: string) => void; onClose: () => void }) {
  const [cat,    setCat]    = useState<TemplateCategory>("all");
  const [search, setSearch] = useState("");

  const filtered = TEMPLATES.filter(t =>
    (cat === "all" || t.category === cat) &&
    (!search.trim() || t.label.toLowerCase().includes(search.toLowerCase()) || t.sub.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[80vh] rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden"
        style={{ background: "hsl(0 0% 7%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-300 to-sky-700 flex items-center justify-center">
              <LayoutGrid className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Template Gallery</p>
              <p className="text-[10px] text-white/25">{TEMPLATES.length} ready-to-build templates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="bg-white/[0.05] border border-white/[0.07] rounded-xl pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-200/30 w-44 transition-colors"
              />
            </div>
            <button onClick={onClose} className="text-white/25 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-4 py-2.5 border-b border-white/[0.04] flex-shrink-0 overflow-x-auto scrollbar-none">
          {TEMPLATE_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                cat === c.id
                  ? "bg-cyan-300/15 text-cyan-100 border border-cyan-200/20"
                  : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              <c.icon className="w-3 h-3" />
              {c.label}
              <span className={cn("text-[9px]", cat === c.id ? "text-cyan-100/70" : "text-white/20")}>{c.count}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">No templates match your search.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onUse(t.prompt); onClose(); }}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-cyan-200/20 text-left transition-all group"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{t.label}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{t.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.04] text-[10px] text-white/20 text-center">
          Click any template to load it into Studio and start building
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Secret input field ───────────────────────────────────────
function SecretField({ label, hint, value, onChange }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <p className="text-[11px] font-medium text-white/60 mb-0.5">{label}</p>
      {hint && <p className="text-[10px] text-white/25 mb-1.5 leading-relaxed">{hint}</p>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label}…`}
          className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5 pr-9 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 transition-colors font-mono"
          autoComplete="off"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Secrets card ─────────────────────────────────────────────
function SecretsCard({ secrets, onApply, onDismiss }: {
  secrets: SecretRequest[];
  onApply: (values: Record<string, string>) => void;
  onDismiss: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const allFilled = secrets.every(s => draft[s.key]?.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-amber-300">Secrets required</span>
      </div>
      <p className="text-[11px] text-white/35 mb-4 leading-relaxed">
        This build needs the following credentials. They're stored only in your browser and injected directly into the code — they never leave your device.
      </p>
      <div className="space-y-3">
        {secrets.map(s => (
          <SecretField key={s.key} label={s.label} hint={s.hint}
            value={draft[s.key] ?? ""}
            onChange={v => setDraft(prev => ({ ...prev, [s.key]: v }))} />
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onApply(draft)} disabled={!allFilled}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Check className="w-3.5 h-3.5" />
          Apply Secrets & Render
        </button>
        <button onClick={onDismiss}
          className="px-3 py-2.5 rounded-xl border border-white/[0.07] text-white/25 text-xs hover:text-white/60 transition-colors">
          Skip
        </button>
      </div>
    </motion.div>
  );
}

// ─── Projects panel ───────────────────────────────────────────
function ProjectsPanel({ open, onClose, onLoad, currentProjectId }: {
  open: boolean; onClose: () => void; onLoad: (id: number) => void; currentProjectId: number | null;
}) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/projects", { credentials: "include" });
      if (res.ok) setProjects(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`/api/studio/projects/${id}`, { method: "DELETE", credentials: "include" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } finally { setDeleting(null); }
  };

  const providerColor: Record<string, string> = { openai: "bg-green-400", anthropic: "bg-orange-400", openrouter: "bg-purple-400" };
  const providerLabel: Record<string, string> = { openai: "Aetheris", anthropic: "Vesper", openrouter: "Prism" };

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed left-0 top-0 h-full w-72 z-50 flex flex-col border-r border-white/[0.06] shadow-2xl"
            style={{ background: "hsl(0 0% 6%)" }}
          >
            <div className="flex items-center justify-between px-4 h-11 border-b border-white/[0.05] flex-shrink-0">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-white/40" />
                <span className="text-sm font-semibold text-white/70">Saved Projects</span>
              </div>
              <button onClick={onClose} className="text-white/25 hover:text-white/70 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {loading ? (
                <div className="flex items-center justify-center h-20 text-white/20">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                  <FolderOpen className="w-8 h-8 text-white/10" />
                  <p className="text-xs text-white/25">No saved projects yet.</p>
                  <p className="text-[10px] text-white/15">Build something and hit Save.</p>
                </div>
              ) : (
                projects.map(p => (
                  <button key={p.id} onClick={() => { onLoad(p.id); onClose(); }}
                    className={cn("w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-all group text-left",
                      currentProjectId === p.id && "bg-cyan-300/[0.07] border-l-2 border-cyan-200/40")}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/70 truncate group-hover:text-white/90 transition-colors">{p.title}</p>
                      {p.artifactTitle && <p className="text-[10px] text-white/25 truncate mt-0.5">{p.artifactTitle}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", providerColor[p.provider] ?? "bg-gray-500")} />
                        <span className="text-[9px] text-white/25 font-mono">{providerLabel[p.provider] ?? p.provider}</span>
                        <Clock className="w-2.5 h-2.5 text-white/15 ml-auto" />
                        <span className="text-[9px] text-white/20">{relativeTime(p.updatedAt)}</span>
                      </div>
                    </div>
                    <button onClick={e => deleteProject(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-rose-400/10 text-white/20 hover:text-rose-200 flex-shrink-0 mt-0.5">
                      {deleting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Studio page ─────────────────────────────────────────
export default function StudioPage() {
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [input,             setInput]             = useState("");
  const [provider,          setProvider]          = useState<Provider>("openai");
  const [showProviderPicker,setShowProviderPicker] = useState(false);
  const [isStreaming,       setIsStreaming]        = useState(false);
  const [artifact,          setArtifact]          = useState<Artifact | null>(null);
  const [streamingRaw,      setStreamingRaw]      = useState("");

  const [sessionSecrets,    setSessionSecrets]    = useState<Record<string, string>>({});
  const [pendingSecrets,    setPendingSecrets]    = useState<SecretRequest[] | null>(null);

  const [currentProjectId,  setCurrentProjectId]  = useState<number | null>(null);
  const [projectTitle,      setProjectTitle]      = useState("Untitled Project");
  const [showProjects,      setShowProjects]      = useState(false);
  const [saveState,         setSaveState]         = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editingTitle,      setEditingTitle]      = useState(false);
  const [titleDraft,        setTitleDraft]        = useState("");
  const [showTemplates,     setShowTemplates]     = useState(false);

  // Resizable pane
  const [chatWidth,  setChatWidth]  = useState(440);
  const isDragging   = useRef(false);
  const dragStartX   = useRef(0);
  const dragStartW   = useRef(440);

  const abortRef       = useRef<AbortController | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const viewport = messagesScrollRef.current;
    if (shouldAutoScrollRef.current && viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages, streamingRaw, pendingSecrets]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [input]);

  useEffect(() => {
    if (!streamingRaw) return;
    const { artifact: a } = parseArtifact(streamingRaw);
    if (a) setArtifact(a);
  }, [streamingRaw]);

  useEffect(() => {
    if (!currentProjectId || messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveProject(false), 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, artifact]);

  useEffect(() => { if (editingTitle) titleInputRef.current?.select(); }, [editingTitle]);

  // ── Drag resize ───────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [chatWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      setChatWidth(Math.min(700, Math.max(280, dragStartW.current + delta)));
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Save ─────────────────────────────────────────────────
  const saveProject = useCallback(async (showFeedback = true) => {
    if (messages.length === 0) return;
    if (showFeedback) setSaveState("saving");

    const { artifact: latestArtifact } = messages.length > 0
      ? parseArtifact(messages.filter(m => m.role === "assistant").at(-1)?.content ?? "")
      : { artifact: null };
    const finalArtifact = artifact ?? latestArtifact;

    const autoTitle = projectTitle === "Untitled Project" && messages.length > 0
      ? messages.find(m => m.role === "user")?.content.slice(0, 50) ?? "Untitled Project"
      : projectTitle;

    const body = {
      title: autoTitle, provider,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      artifactTitle: finalArtifact?.title ?? null,
      artifactContent: finalArtifact?.content ?? null,
    };

    try {
      if (currentProjectId) {
        const res = await fetch(`/api/studio/projects/${currentProjectId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), credentials: "include",
        });
        if (!res.ok) throw new Error(`Project save failed (${res.status})`);
      } else {
        const res = await fetch("/api/studio/projects", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), credentials: "include",
        });
        if (!res.ok) throw new Error(`Project save failed (${res.status})`);
        const data = await res.json() as { id?: number };
        if (typeof data.id !== "number") throw new Error("Project save response did not include an ID");
        setCurrentProjectId(data.id);
        setProjectTitle(autoTitle);
      }
      if (showFeedback) { setSaveState("saved"); setTimeout(() => setSaveState("idle"), 2000); }
    } catch (error) {
      console.error("Failed to save Studio project", error);
      setSaveState("error");
    }
  }, [messages, artifact, provider, projectTitle, currentProjectId]);

  // ── Load ─────────────────────────────────────────────────
  const loadProject = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/studio/projects/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setCurrentProjectId(data.id);
      setProjectTitle(data.title);
      setProvider(data.provider as Provider);
      setMessages((data.messages as { role: "user" | "assistant"; content: string }[]).map((m, i) => ({
        id: String(i), role: m.role, content: m.content,
      })));
      if (data.artifactContent) {
        setArtifact({ id: data.artifactTitle ?? "artifact", title: data.artifactTitle ?? "Artifact", type: "html", content: data.artifactContent, isStreaming: false });
      } else { setArtifact(null); }
      setStreamingRaw(""); setPendingSecrets(null);
    } catch { /* ignore */ }
  }, []);

  // ── Send ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setPendingSecrets(null);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setStreamingRaw("");
    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })), provider }),
        signal: abortRef.current.signal,
        credentials: "include",
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = ""; let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6).trim());
              if (data.done) { done = true; break; }
              if (data.content) { raw += data.content; setStreamingRaw(raw); }
            } catch { /* ignore */ }
          }
        }
      }

      const { artifact: finalArtifact } = parseArtifact(raw);
      const assistantMsg: Message = { id: (Date.now()+1).toString(), role: "assistant", content: raw };
      setMessages(prev => [...prev, assistantMsg]);

      if (finalArtifact) {
        setArtifact({ ...finalArtifact, isStreaming: false });
        const needed = parseSecrets(raw).filter(s => !sessionSecrets[s.key]);
        if (needed.length > 0) setPendingSecrets(needed);
      }
      setStreamingRaw("");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(), role: "assistant",
        content: "Something went wrong. Please try again.",
      }]);
      setStreamingRaw("");
    } finally { setIsStreaming(false); abortRef.current = null; }
  }, [messages, provider, isStreaming, sessionSecrets]);

  const useTemplate = useCallback((prompt: string) => {
    setInput(prompt);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const applySecrets = (values: Record<string, string>) => {
    setSessionSecrets(prev => ({ ...prev, ...values }));
    setPendingSecrets(null);
  };

  const stop  = () => abortRef.current?.abort();
  const reset = () => {
    stop();
    setMessages([]); setStreamingRaw(""); setArtifact(null);
    setIsStreaming(false); setPendingSecrets(null);
    setCurrentProjectId(null); setProjectTitle("Untitled Project");
    setSaveState("idle");
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed) {
      setProjectTitle(trimmed);
      if (currentProjectId) {
        fetch(`/api/studio/projects/${currentProjectId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }), credentials: "include",
        });
      }
    }
    setEditingTitle(false);
  };

  const showSplitPane   = !!artifact;
  const { visibleText: streamingVisible } = streamingRaw ? parseArtifact(streamingRaw) : { visibleText: "" };
  const hasContent      = messages.length > 0;
  const providerInfo    = PROVIDERS.find(p => p.value === provider)!;

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Projects drawer */}
      <ProjectsPanel open={showProjects} onClose={() => setShowProjects(false)} onLoad={loadProject} currentProjectId={currentProjectId} />

      {/* Template gallery */}
      <AnimatePresence>
        {showTemplates && <TemplateGallery onUse={useTemplate} onClose={() => setShowTemplates(false)} />}
      </AnimatePresence>

      {/* ── Chat column ── */}
      <div
        className="flex flex-col h-full min-h-0 min-w-0 flex-shrink-0 overflow-hidden"
        style={{ width: showSplitPane ? chatWidth : undefined, flex: showSplitPane ? undefined : "1 1 0" }}
      >
        {/* Top bar */}
        <div className="flex-shrink-0 h-11 flex items-center justify-between px-3 border-b border-white/[0.05]" style={{ background: "hsl(0 0% 5%)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setShowProjects(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all" title="Saved projects">
              <FolderOpen className="w-4 h-4" />
            </button>

            <TherynIcon size={18} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.18)] flex-shrink-0" />

            {editingTitle ? (
              <input ref={titleInputRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-sm font-bold text-white bg-transparent border-b border-cyan-200/40 focus:outline-none min-w-0 max-w-[160px]" />
            ) : (
              <button onClick={() => { setTitleDraft(projectTitle); setEditingTitle(true); }}
                className="text-sm font-bold text-white/80 hover:text-white transition-colors truncate max-w-[160px] text-left" title="Click to rename">
                {projectTitle}
              </button>
            )}
            {currentProjectId && (
              <span className="text-[9px] text-white/20 font-mono flex-shrink-0">#{currentProjectId}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Templates */}
            <button onClick={() => setShowTemplates(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/[0.07] text-[10px] text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all">
              <LayoutGrid className="w-3 h-3" />
              Templates
            </button>

            {/* Save */}
            {hasContent && (
              <button onClick={() => saveProject(true)} disabled={saveState === "saving" || isStreaming}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] text-[10px] transition-all hover:bg-white/[0.05] disabled:opacity-40"
                title={saveState === "error" ? "Save failed. Click to retry." : "Save project"}>
                {saveState === "saved"
                  ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Saved</span></>
                  : saveState === "saving"
                  ? <><Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" /><span className="text-white/30">Saving…</span></>
                  : saveState === "error"
                  ? <><CircleAlert className="w-3.5 h-3.5 text-rose-300" /><span className="text-rose-300">Retry save</span></>
                  : <><Save className="w-3.5 h-3.5 text-white/30" /><span className="text-white/30">Save</span></>}
              </button>
            )}

            {/* New */}
            {hasContent && (
              <button onClick={reset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] text-[10px] text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all">
                <Plus className="w-3.5 h-3.5" />New
              </button>
            )}

            {/* Provider picker */}
            <div className="relative">
              <button onClick={() => setShowProviderPicker(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] text-[10px] text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all">
                <span className={cn("w-1.5 h-1.5 rounded-full", providerInfo.dot)} />
                {providerInfo.label}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              <AnimatePresence>
                {showProviderPicker && (
                  <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }} transition={{ duration: 0.1 }}
                    className="absolute top-full mt-1 right-0 z-50 rounded-xl border border-white/[0.08] p-1 min-w-[130px] shadow-xl"
                    style={{ background: "hsl(0 0% 9%)" }}>
                    {PROVIDERS.map(p => (
                      <button key={p.value} onClick={() => { setProvider(p.value); setShowProviderPicker(false); }}
                        className={cn("flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors",
                          provider === p.value ? "bg-cyan-300/15 text-cyan-50" : "text-white/40 hover:text-white hover:bg-white/[0.05]")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", p.dot)} />
                        {p.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesScrollRef}
          onScroll={event => {
            const viewport = event.currentTarget;
            shouldAutoScrollRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 64;
          }}
          className="flex-1 overflow-y-auto min-h-0"
        >
          {!hasContent && !isStreaming ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-8 gap-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-300/15 to-sky-800/10 border border-cyan-200/15 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-cyan-200" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white/80">Build anything</h2>
                  <p className="text-xs text-white/30 mt-1 leading-relaxed">
                    Describe what you want to build and the AI will generate a fully functional app, game, or tool.
                  </p>
                </div>
              </div>

              {/* Quick starters */}
              <div className="w-full space-y-1.5">
                {[
                  { e: "🚀", t: "SaaS landing page with hero, features, pricing, testimonials, FAQ, footer" },
                  { e: "🐍", t: "Snake game with neon theme, particle effects, and high score system" },
                  { e: "📊", t: "Analytics dashboard with sidebar, KPI cards, charts, and data table" },
                  { e: "🎨", t: "Color palette generator and converter tool" },
                  { e: "⏰", t: "Pomodoro timer with task queue and circular progress ring" },
                  { e: "✨", t: "Interactive particle system with mouse interaction and physics" },
                ].map((s, i) => (
                  <button key={i} onClick={() => { setInput(s.t); textareaRef.current?.focus(); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] text-left text-xs text-white/50 hover:text-white/90 transition-all group">
                    <span className="text-base">{s.e}</span>
                    <span className="line-clamp-1">{s.t}</span>
                  </button>
                ))}
              </div>

              <button onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 text-[11px] text-white/25 hover:text-white/60 transition-colors">
                <LayoutGrid className="w-3.5 h-3.5" />
                Browse all {TEMPLATES.length} templates
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  {m.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-300/25 to-sky-800/20 border border-cyan-200/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TherynIcon size={12} />
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%]",
                    m.role === "user"
                      ? "bg-cyan-300/12 border border-cyan-200/15 text-white/90 ml-auto"
                      : "text-white/80"
                  )}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none text-white/70">
                        {(() => {
                          const { visibleText } = parseArtifact(m.content);
                          return visibleText ? <Markdown content={visibleText} /> : null;
                        })()}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-300/25 to-sky-800/20 border border-cyan-200/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TherynIcon size={12} />
                  </div>
                  <div className="text-sm text-white/70 max-w-[85%]">
                    {streamingVisible ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown content={streamingVisible} />
                        <span className="inline-block w-2 h-4 bg-cyan-200/70 rounded-sm animate-pulse ml-0.5 align-middle" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/25 py-1">
                        <div className="flex gap-0.5">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-1 h-1 rounded-full bg-cyan-300/60 animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                          ))}
                        </div>
                        <span className="text-xs">Building…</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Secrets card */}
              {pendingSecrets && (
                <div className="pl-9">
                  <SecretsCard
                    secrets={pendingSecrets}
                    onApply={applySecrets}
                    onDismiss={() => setPendingSecrets(null)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/[0.05]" style={{ background: "hsl(0 0% 5%)" }}>
          <div className={cn(
            "rounded-2xl border transition-all",
            input ? "border-white/[0.10] bg-white/[0.03]" : "border-white/[0.07] bg-white/[0.02]",
            "focus-within:border-white/25 focus-within:shadow-[0_0_20px_-10px_rgba(255,255,255,0.12)]"
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Describe what you want to build…"
              disabled={isStreaming}
              rows={1}
              className="w-full bg-transparent text-white/90 placeholder:text-white/20 px-4 pt-3 pb-2 resize-none focus:outline-none text-sm disabled:opacity-40 leading-relaxed"
              style={{ minHeight: "52px" }}
            />
            <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
              <p className="text-[9px] text-white/15">Enter to send · Shift+Enter for new line</p>
              <div className="flex items-center gap-1.5">
                {isStreaming ? (
                  <button onClick={stop}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-400/10 text-rose-200 hover:bg-rose-400/20 transition-all text-xs">
                    <StopCircle className="w-3.5 h-3.5" />Stop
                  </button>
                ) : (
                  <button onClick={() => sendMessage(input)} disabled={!input.trim()}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-white/90 text-black disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_18px_-8px_rgba(255,255,255,0.18)]">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resize handle ── */}
      {showSplitPane && (
        <div
          onMouseDown={onDragStart}
          className="w-1 flex-shrink-0 cursor-col-resize relative group hover:bg-cyan-300/30 transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5 group-hover:bg-cyan-300/5 transition-colors" />
          {/* Drag indicator dots */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {[0,1,2].map(i => <div key={i} className="w-0.5 h-0.5 rounded-full bg-cyan-200/70" />)}
          </div>
        </div>
      )}

      {/* ── Artifact panel ── */}
      {showSplitPane && (
        <div className="flex-1 min-w-0 overflow-hidden h-full">
          <AnimatePresence mode="wait">
            {artifact && (
              <ArtifactPanel
                key={artifact.id}
                artifact={artifact}
                secrets={sessionSecrets}
                onClose={() => setArtifact(null)}
                onEditCode={(code) => setArtifact(prev => prev ? { ...prev, content: code } : null)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
