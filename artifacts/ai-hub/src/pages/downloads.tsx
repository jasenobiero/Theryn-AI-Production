import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Download, Monitor, Apple, Smartphone, Globe,
  Chrome, Check, ExternalLink, QrCode, Layers,
} from "lucide-react";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PLATFORMS = [
  {
    id: "web",
    icon: Globe,
    label: "Web App",
    subtitle: "Install in any browser",
    badge: "Recommended",
    badgeColor: "bg-red-600/20 text-red-300 border-red-500/20",
    color: "red",
    description: "Install THERYN as a progressive web app — works on any device, updates automatically, and feels native.",
    steps: [
      { browser: "Chrome / Edge", instruction: 'Look for the ⊕ install icon in the address bar, or open menu → "Install THERYN"' },
      { browser: "Safari (macOS)", instruction: 'File → Add to Dock (macOS Sequoia+), or Share → Add to Home Screen' },
      { browser: "Firefox", instruction: 'Address bar → ⊕ Install icon when it appears, or use the PWA install banner below' },
    ],
  },
  {
    id: "windows",
    icon: Monitor,
    label: "Windows",
    subtitle: "Windows 10 / 11",
    badge: "PWA",
    badgeColor: "bg-blue-600/20 text-blue-300 border-blue-500/20",
    color: "blue",
    description: "Install THERYN as a desktop app on Windows via Edge or Chrome for a full-screen, taskbar-pinned experience.",
    steps: [
      { browser: "Microsoft Edge", instruction: 'Click ⋯ menu → Apps → Install this site as an app → Install' },
      { browser: "Chrome", instruction: 'Click ⊕ in address bar → Install → Open THERYN from Start Menu or taskbar' },
    ],
  },
  {
    id: "macos",
    icon: Apple,
    label: "macOS",
    subtitle: "macOS 14 Sonoma+",
    badge: "PWA",
    badgeColor: "bg-white/10 text-white/60 border-white/10",
    color: "white",
    description: "Pin THERYN to your Dock for instant access on macOS with full-window mode via Safari or Chrome.",
    steps: [
      { browser: "Safari (macOS 14+)", instruction: 'File menu → Add to Dock — launches as a standalone app with Dock icon' },
      { browser: "Chrome / Edge", instruction: 'Address bar ⊕ icon → Install → THERYN appears in Applications + Dock' },
    ],
  },
  {
    id: "linux",
    icon: Layers,
    label: "Linux",
    subtitle: "Ubuntu / Fedora / Arch",
    badge: "PWA",
    badgeColor: "bg-orange-600/20 text-orange-300 border-orange-500/20",
    color: "orange",
    description: "Run THERYN as a desktop PWA on Linux with Chrome or Chromium — installs to your applications menu.",
    steps: [
      { browser: "Chrome / Chromium", instruction: 'Address bar ⊕ icon → Install THERYN → Find it in your Applications menu' },
      { browser: "Firefox", instruction: 'Install Firefox PWA extension, then click the install icon in the toolbar' },
    ],
  },
  {
    id: "ios",
    icon: Smartphone,
    label: "iOS",
    subtitle: "iPhone & iPad",
    badge: "App Store",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/20",
    color: "blue",
    description: "Install THERYN on your iPhone or iPad. Use Safari to add to your Home Screen for a native app experience.",
    steps: [
      { browser: "Safari", instruction: "Tap Share (□↑) → Add to Home Screen → Add → THERYN appears on your Home Screen" },
      { browser: "iOS Chrome / Edge", instruction: "Tap ⋯ → Add to Home Screen → add the shortcut for quick access" },
    ],
  },
  {
    id: "android",
    icon: Smartphone,
    label: "Android",
    subtitle: "Android 8+",
    badge: "Play Store",
    badgeColor: "bg-green-500/20 text-green-300 border-green-500/20",
    color: "green",
    description: "Install THERYN on Android for a full-screen, offline-capable AI experience on your mobile device.",
    steps: [
      { browser: "Chrome", instruction: 'Tap ⋮ menu → Add to Home Screen → Install — THERYN gets its own app icon' },
      { browser: "Samsung Browser", instruction: "Tap ≡ → Add page to → Home screen → Add" },
    ],
  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

const accentMap: Record<string, string> = {
  red:    "border-red-500/20 bg-red-600/[0.04] hover:bg-red-600/[0.07]",
  blue:   "border-blue-500/20 bg-blue-600/[0.04] hover:bg-blue-600/[0.07]",
  white:  "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
  orange: "border-orange-500/20 bg-orange-600/[0.04] hover:bg-orange-600/[0.07]",
  green:  "border-green-500/20 bg-green-600/[0.04] hover:bg-green-600/[0.07]",
};
const dotMap: Record<string, string> = {
  red: "bg-red-400", blue: "bg-blue-400", white: "bg-white/60", orange: "bg-orange-400", green: "bg-green-400",
};
const iconMap: Record<string, string> = {
  red: "text-red-400", blue: "text-blue-400", white: "text-white/60", orange: "text-orange-400", green: "text-green-400",
};

export default function DownloadsPage() {
  const [selected, setSelected] = useState<PlatformId>("web");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);

  const platform = PLATFORMS.find(p => p.id === selected)!;

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPWAInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setIsPWAInstallable(false);
    }
    setDeferredPrompt(null);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-8 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-red-600/15 flex items-center justify-center">
            <Download className="w-4 h-4 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Get THERYN</h1>
        </div>
        <p className="text-sm text-white/35 ml-11">Install the AI Command Center on any device</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* One-click install banner */}
        {isPWAInstallable && !installed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-4 p-4 rounded-xl border border-red-500/25 bg-red-600/[0.06]"
          >
            <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <Chrome className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Install THERYN on this device</p>
              <p className="text-xs text-white/40 mt-0.5">Your browser supports PWA installation — one click and you're done</p>
            </div>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Install Now
            </button>
          </motion.div>
        )}

        {installed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-600/[0.06]"
          >
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300 font-medium">THERYN has been installed on this device!</p>
          </motion.div>
        )}

        {/* Platform grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {PLATFORMS.map((p, i) => {
            const isActive = p.id === selected;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all",
                  isActive
                    ? accentMap[p.color] + " ring-1 ring-inset ring-white/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="platform-active"
                    className="absolute inset-0 rounded-xl bg-white/[0.02]"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isActive ? "bg-white/[0.06]" : "bg-white/[0.03]")}>
                    <p.icon className={cn("w-4 h-4", isActive ? iconMap[p.color] : "text-white/40")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                    isActive ? p.badgeColor : "bg-white/[0.04] text-white/25 border-white/[0.06]"
                  )}>{p.badge}</span>
                </div>
                <div className="relative z-10">
                  <p className={cn("text-sm font-semibold", isActive ? "text-white" : "text-white/60")}>{p.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{p.subtitle}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Detail panel */}
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn("rounded-2xl border p-6", accentMap[platform.color])}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/[0.04]")}>
              <platform.icon className={cn("w-6 h-6", iconMap[platform.color])} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{platform.label}</h2>
              <p className="text-sm text-white/40 mt-0.5">{platform.description}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Installation steps</p>
            {platform.steps.map((step, i) => (
              <div key={i} className="flex gap-3 p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold", `bg-${platform.color === "white" ? "white/10" : platform.color + "-600/20"}`, iconMap[platform.color])}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/80">{step.browser}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{step.instruction}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile QR hint */}
          {(selected === "ios" || selected === "android") && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02]">
              <QrCode className="w-5 h-5 text-white/30 flex-shrink-0" />
              <p className="text-xs text-white/40">
                Scan the QR code in your browser's URL bar to instantly open THERYN on your phone, then follow the install steps above.
              </p>
            </div>
          )}

          {/* Open app button */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => window.open(window.location.origin, "_blank")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                platform.color === "red"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-white/[0.08] hover:bg-white/[0.12] text-white"
              )}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open THERYN
            </button>
            {isPWAInstallable && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/[0.08] hover:bg-white/[0.05] text-white/60 hover:text-white transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Install
              </button>
            )}
          </div>
        </motion.div>

        {/* Features grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "OFF", label: "Offline Ready", desc: "Works without internet after first load" },
            { icon: "SYNC", label: "Auto Updates", desc: "Always the latest version automatically" },
            { icon: "DESK", label: "Native Feel", desc: "Runs in its own window like a native app" },
            { icon: "LOCK", label: "Secure", desc: "Served over HTTPS, no app store required" },
          ].map((f, i) => (
            <div key={i} className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <span className="text-xl">{f.icon}</span>
              <p className="text-xs font-semibold text-white/70 mt-2">{f.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
