import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, ShieldX, Plus, X, Scan, Bell,
  BellOff, Trash2, AlertTriangle, CheckCircle2, Info, Zap,
  ExternalLink, RefreshCw, Eye, EyeOff, Link2,
} from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiDiscord, SiFacebook, SiGithub, SiInstagram, SiReddit,
  SiSnapchat, SiSpotify, SiTiktok, SiTelegram, SiTwitch, SiX, SiYoutube,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type PlatformDefinition = {
  id: string;
  label: string;
  color: string;
  Logo: IconType;
  placeholder: string;
};

const PLATFORMS: PlatformDefinition[] = [
  { id: "tiktok",         label: "TikTok",          color: "#25F4EE", Logo: SiTiktok,    placeholder: "@username" },
  { id: "instagram",      label: "Instagram",       color: "#E4405F", Logo: SiInstagram, placeholder: "@username" },
  { id: "youtube",        label: "YouTube",         color: "#FF0033", Logo: SiYoutube,   placeholder: "@channel or handle" },
  { id: "twitter",        label: "X / Twitter",     color: "#FFFFFF", Logo: SiX,          placeholder: "@username" },
  { id: "discord",        label: "Discord Account", color: "#5865F2", Logo: SiDiscord,    placeholder: "username#0000 or username" },
  { id: "discord_server", label: "Discord Server",  color: "#5865F2", Logo: SiDiscord,    placeholder: "server name or invite code" },
  { id: "reddit",         label: "Reddit",          color: "#FF4500", Logo: SiReddit,     placeholder: "u/username" },
  { id: "facebook",       label: "Facebook",        color: "#0866FF", Logo: SiFacebook,   placeholder: "profile name or URL" },
  { id: "linkedin",       label: "LinkedIn",        color: "#0A66C2", Logo: FaLinkedin,  placeholder: "profile name or URL" },
  { id: "twitch",         label: "Twitch",          color: "#9146FF", Logo: SiTwitch,     placeholder: "@streamer" },
  { id: "snapchat",       label: "Snapchat",        color: "#FFFC00", Logo: SiSnapchat,   placeholder: "@username" },
  { id: "github",         label: "GitHub",          color: "#FFFFFF", Logo: SiGithub,     placeholder: "@username" },
  { id: "telegram",       label: "Telegram",        color: "#24A1DE", Logo: SiTelegram,   placeholder: "@username or channel" },
  { id: "spotify",        label: "Spotify",         color: "#1DB954", Logo: SiSpotify,    placeholder: "profile name or URL" },
];

const getPlatform = (id: string) => PLATFORMS.find(p => p.id === id);

function PlatformLogo({ platform, size = 18 }: { platform?: PlatformDefinition; size?: number }) {
  const Logo = platform?.Logo ?? Link2;
  return <Logo size={size} color={platform?.color ?? "#a3a3a3"} aria-hidden="true" />;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  info:     { color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-500/20",   icon: <Info className="w-3.5 h-3.5" />,          label: "Info" },
  low:      { color: "text-green-300",  bg: "bg-green-500/10 border-green-500/20",  icon: <CheckCircle2 className="w-3.5 h-3.5" />,   label: "Low" },
  medium:   { color: "text-yellow-300", bg: "bg-yellow-500/10 border-yellow-500/20",icon: <AlertTriangle className="w-3.5 h-3.5" />,  label: "Medium" },
  high:     { color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/20",icon: <ShieldAlert className="w-3.5 h-3.5" />,    label: "High" },
  critical: { color: "text-red-300",    bg: "bg-red-500/10 border-red-500/20",     icon: <ShieldX className="w-3.5 h-3.5" />,         label: "Critical" },
};

interface Account {
  id: number; userId: string; platform: string; handle: string;
  displayName?: string | null; riskScore: number;
  lastScannedAt?: string | null; isActive: boolean; createdAt: string;
}
interface Alert {
  id: number; userId: string; accountId?: number | null; type: string;
  severity: string; title: string; message: string;
  isRead: boolean; resolvedAt?: string | null; createdAt: string;
}
interface ShieldAnalysis {
  riskScore: number;
  riskLevel: string;
  summary: string;
  threats: Array<{ type: string; severity: string; title: string; description: string }>;
  recommendations: string[];
}

function RiskRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = score >= 70 ? "#d4d4d4" : score >= 40 ? "#a3a3a3" : score >= 20 ? "#737373" : "#4b4b4b";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
      />
    </svg>
  );
}

function OverallRing({ score }: { score: number }) {
  const size = 140;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const safeScore = 100 - score;
  const color = score >= 70 ? "#d4d4d4" : score >= 40 ? "#a3a3a3" : score >= 20 ? "#737373" : "#4b4b4b";
  const label = score >= 70 ? "HIGH ESTIMATE" : score >= 40 ? "ELEVATED ESTIMATE" : score >= 20 ? "CAUTION" : "LOW ESTIMATE";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease", filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{safeScore}</span>
          <span className="text-[10px] text-white/40 font-mono uppercase">/ 100</span>
        </div>
      </div>
      <span className="text-[11px] font-bold tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

export default function ShieldPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPlatform, setAddPlatform] = useState(PLATFORMS[0].id);
  const [addHandle, setAddHandle] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [lastScan, setLastScan] = useState<{ accountId: number; analysis: ShieldAnalysis } | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accsRes, alertsRes] = await Promise.all([
        fetch(`${base}/api/shield/accounts`, { credentials: "include" }),
        fetch(`${base}/api/shield/alerts`, { credentials: "include" }),
      ]);
      if (!accsRes.ok || !alertsRes.ok) {
        throw new Error(`Account data could not be loaded (HTTP ${!accsRes.ok ? accsRes.status : alertsRes.status})`);
      }
      setAccounts(await accsRes.json() as Account[]);
      setAlerts(await alertsRes.json() as Alert[]);
    } catch (error) {
      toast({
        title: "Social Shield data could not be loaded",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [base, toast]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    if (!addHandle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${base}/api/shield/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platform: addPlatform, handle: addHandle.trim().replace(/^@/, ""), displayName: addDisplayName.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`Failed to add account (HTTP ${res.status})`);
      const account = await res.json() as Account;
      setAccounts(prev => [account, ...prev]);
      setShowAddModal(false);
      setAddHandle("");
      setAddDisplayName("");
      toast({ title: "Handle saved", description: `${getPlatform(addPlatform)?.label} @${account.handle} is ready for an AI-generated review.` });
    } catch (error) {
      toast({
        title: "Failed to add account",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleScan = async (account: Account) => {
    setScanningId(account.id);
    try {
      const res = await fetch(`${base}/api/shield/accounts/${account.id}/scan`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Review failed (HTTP ${res.status})`);
      const result = await res.json() as { account: Account; analysis: ShieldAnalysis };
      setAccounts(prev => prev.map(a => a.id === account.id ? result.account : a));
      setSelectedAccountId(account.id);
      setLastScan({ accountId: account.id, analysis: result.analysis });
      const alertsRes = await fetch(`${base}/api/shield/alerts`, { credentials: "include" });
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      const historyRefreshError = alertsRes.ok ? "" : ` Review history could not be refreshed (HTTP ${alertsRes.status}).`;
      toast({
        title: `AI review complete — ${getPlatform(account.platform)?.label} @${account.handle}`,
        description: `Unverified estimate: ${result.analysis.riskScore}/100. No live account monitoring was performed.${historyRefreshError}`,
        variant: historyRefreshError ? "destructive" : undefined,
      });
    } catch (error) {
      toast({
        title: "AI review failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`${base}/api/shield/accounts/${id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(`Remove failed (HTTP ${response.status})`);
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (selectedAccountId === id) setSelectedAccountId(null);
      if (lastScan?.accountId === id) setLastScan(null);
      toast({ title: "Account removed from Shield" });
    } catch (error) {
      toast({
        title: "Account could not be removed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      const response = await fetch(`${base}/api/shield/alerts/${id}/read`, { method: "PATCH", credentials: "include" });
      if (!response.ok) throw new Error(`Request failed (HTTP ${response.status})`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (error) {
      toast({
        title: "Review could not be marked as read",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const reviewedAccounts = accounts.filter(account => account.lastScannedAt);
  const avgRisk = reviewedAccounts.length
    ? Math.round(reviewedAccounts.reduce((sum, account) => sum + account.riskScore, 0) / reviewedAccounts.length)
    : 0;
  const reviewedCount = reviewedAccounts.length;
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "hsl(0 0% 5%)" }}>

      {/* ── Left: Account List ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/[0.06]" style={{ background: "hsl(0 0% 6%)" }}>
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-white tracking-wide">SOCIAL SHIELD</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAlerts(v => !v)}
                className="relative p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
          <p className="text-[10px] text-white/25 leading-relaxed">
            {accounts.length === 0
              ? "Add a handle for a general AI-generated security review. No live monitoring is available."
              : `${accounts.length} account handle${accounts.length !== 1 ? "s" : ""} saved for review`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <ShieldCheck className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-xs text-white/25">No accounts yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                + Add your first account
              </button>
            </div>
          ) : accounts.map(account => {
            const plat = getPlatform(account.platform);
            const isScanning = scanningId === account.id;
            const isSelected = selectedAccountId === account.id;
            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                  isSelected
                    ? "bg-red-600/10 border-red-500/20"
                    : "border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03]"
                )}
                onClick={() => {
                  if (isScanning) return;
                  setSelectedAccountId(prev => prev === account.id ? null : account.id);
                  setLastScan(null);
                }}
              >
                <div className="relative flex-shrink-0">
                  <RiskRing score={account.lastScannedAt ? account.riskScore : 0} size={42} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlatformLogo platform={plat} size={16} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate">{plat?.label ?? account.platform}</p>
                  <p className="text-[10px] text-white/40 truncate">@{account.handle}</p>
                  <p className="text-[9px] text-white/20 mt-0.5">
                    {account.lastScannedAt
                      ? `Last review ${new Date(account.lastScannedAt).toLocaleDateString()}`
                      : "No review yet"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold" style={{
                    color: account.riskScore >= 70 ? "#d4d4d4" : account.riskScore >= 40 ? "#a3a3a3" : account.riskScore >= 20 ? "#737373" : "#4b4b4b"
                  }}>
                    {account.lastScannedAt ? account.riskScore : "—"}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); handleScan(account); }}
                      disabled={isScanning}
                      className="p-1 rounded-md text-white/30 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                      title="Request general guidance"
                    >
                      <Scan className={cn("w-3 h-3", isScanning && "animate-spin")} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(account.id); }}
                      disabled={deletingId === account.id}
                      className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Dashboard ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Alerts Panel */}
        <AnimatePresence>
          {showAlerts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/[0.06] overflow-hidden"
              style={{ background: "hsl(0 0% 7%)" }}
            >
              <div className="px-6 py-3 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Review Summaries</span>
                  <button onClick={() => setShowAlerts(false)} className="text-white/20 hover:text-white/50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <p className="text-xs text-white/25 py-2">No review summaries yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {alerts.map(alert => {
                      const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                      return (
                        <div
                          key={alert.id}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5 rounded-lg border text-xs transition-all",
                            sev.bg,
                            alert.isRead && "opacity-40"
                          )}
                        >
                          <span className={cn("mt-0.5 flex-shrink-0", sev.color)}>{sev.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-semibold truncate", sev.color)}>{alert.title}</p>
                            <p className="text-white/50 text-[10px] leading-relaxed line-clamp-2 mt-0.5">{alert.message}</p>
                          </div>
                          {!alert.isRead && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="flex-shrink-0 text-white/20 hover:text-white/50 transition-colors mt-0.5"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Social Shield</h1>
            <p className="text-sm text-white/35">AI-generated general guidance only; this is not live monitoring or a verified security scan.</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "General Risk Estimate",
                value: reviewedCount
                  ? <OverallRing score={avgRisk} />
                  : <span className="text-3xl font-bold text-white/30">—</span>,
                sub: `${reviewedCount} unverified review${reviewedCount === 1 ? "" : "s"}`,
                wide: true,
              },
              {
                label: "Handles Saved",
                value: <span className="text-3xl font-bold text-white">{accounts.length}</span>,
                sub: "not connected",
              },
              {
                label: "Review Summaries",
                value: <span className="text-3xl font-bold text-white">{alerts.length}</span>,
                sub: "unverified guidance",
              },
              {
                label: "Unread Summaries",
                value: <span className="text-3xl font-bold text-white">{unreadCount}</span>,
                sub: "review history",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-white/[0.06]"
                style={{ background: "hsl(0 0% 8%)" }}
              >
                {stat.value}
                <div className="text-center">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">{stat.label}</p>
                  {stat.sub && <p className="text-[10px] text-white/20">{stat.sub}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Guidance result or empty state */}
          <AnimatePresence mode="wait">
            {lastScan && lastScan.analysis && Object.keys(lastScan.analysis).length > 0 ? (
              <motion.div
                key="scan-result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {(() => {
                  const acc = accounts.find(a => a.id === lastScan.accountId);
                  const plat = acc ? getPlatform(acc.platform) : undefined;
                  const a = lastScan.analysis;
                  const statusColor = "#d4d4d4";
                  return (
                    <div className="space-y-5">
                      {/* Guidance header */}
                      <div className="flex items-start justify-between p-5 rounded-2xl border border-white/[0.06]" style={{ background: "hsl(0 0% 8%)" }}>
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                            <PlatformLogo platform={plat} size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-base font-bold text-white">{plat?.label ?? acc?.platform}</h2>
                              <span className="text-white/40 text-sm">@{acc?.handle}</span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}15` }}
                                title="AI-generated estimate based only on the platform and handle"
                              >
                                AI estimate only
                              </span>
                            </div>
                            <p className="text-sm text-white/50 leading-relaxed max-w-xl">{a.summary}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setLastScan(null)}
                          className="text-white/20 hover:text-white/50 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Threats + Recommendations */}
                      <div className="grid grid-cols-2 gap-5">
                        {/* Threats */}
                        <div className="p-5 rounded-2xl border border-white/[0.06]" style={{ background: "hsl(0 0% 8%)" }}>
                          <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                            <h3 className="text-sm font-bold text-white">Common Risks (Unverified)</h3>
                            <span className="ml-auto text-xs text-white/25">{a.threats?.length ?? 0} suggestions</span>
                          </div>
                          {(!a.threats || a.threats.length === 0) ? (
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <CheckCircle2 className="w-4 h-4" />
                              No general risks listed
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {a.threats.map((t, i) => {
                                const sev = SEVERITY_CONFIG[t.severity] ?? SEVERITY_CONFIG.info;
                                return (
                                  <div key={i} className={cn("p-3 rounded-xl border text-xs", sev.bg)}>
                                    <div className={cn("flex items-center gap-2 font-semibold mb-1", sev.color)}>
                                      {sev.icon}
                                      <span>{t.title}</span>
                                      <span className="ml-auto text-[9px] uppercase opacity-60">{sev.label}</span>
                                    </div>
                                    <p className="text-white/50 leading-relaxed">{t.description}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Recommendations */}
                        <div className="p-5 rounded-2xl border border-white/[0.06]" style={{ background: "hsl(0 0% 8%)" }}>
                          <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <h3 className="text-sm font-bold text-white">General Recommendations</h3>
                          </div>
                          <div className="space-y-2">
                            {(a.recommendations ?? []).map((rec, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-xs">
                                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-600/20 text-red-400 text-[9px] font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span className="text-white/60 leading-relaxed">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            ) : accounts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-red-600/5 border border-red-600/10 flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-red-400/40" />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping bg-red-600/5" style={{ animationDuration: "3s" }} />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">No handles saved yet</h2>
                <p className="text-sm text-white/30 max-w-sm leading-relaxed mb-6">
                  Save a platform and handle for general AI-generated safety guidance. Theryn does not connect to or monitor social accounts.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Account
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <ShieldCheck className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-sm text-white/25">Select a saved handle to request general platform guidance. Profiles are not inspected or monitored.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent review history */}
          {alerts.length > 0 && !showAlerts && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-white/30" />
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Recent Reviews</h3>
                <button
                  onClick={() => setShowAlerts(true)}
                  className="ml-auto text-xs text-red-400/70 hover:text-red-400 transition-colors"
                >
                  View all ({alerts.length})
                </button>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 5).map(alert => {
                  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 rounded-xl border text-xs transition-all",
                        sev.bg, alert.isRead && "opacity-40"
                      )}
                    >
                      <span className={cn("mt-0.5 flex-shrink-0", sev.color)}>{sev.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold truncate", sev.color)}>{alert.title}</p>
                        <p className="text-white/40 text-[10px] mt-0.5 line-clamp-1">{alert.message}</p>
                      </div>
                      <span className="text-white/20 text-[9px] flex-shrink-0">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Account Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl border border-white/[0.08] p-6 shadow-2xl" style={{ background: "hsl(0 0% 9%)" }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-white">Add Social Account</h2>
                    <p className="text-xs text-white/35 mt-0.5">Save a handle for general, unverified AI guidance. No account connection is made.</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="text-white/25 hover:text-white/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Platform Grid */}
                <div className="mb-4">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest mb-2 block">Platform</label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setAddPlatform(p.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] transition-all",
                          addPlatform === p.id
                            ? "border-red-500/40 bg-red-600/10 text-white"
                            : "border-white/[0.05] text-white/40 hover:border-white/[0.1] hover:text-white/70"
                        )}
                      >
                        <PlatformLogo platform={p} size={18} />
                        <span className="truncate w-full text-center leading-tight">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Handle */}
                <div className="mb-3">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 block">
                    Username / Handle
                  </label>
                  <input
                    type="text"
                    value={addHandle}
                    onChange={e => setAddHandle(e.target.value)}
                    placeholder={getPlatform(addPlatform)?.placeholder ?? "@username"}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-red-500/40 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Display Name (optional) */}
                <div className="mb-5">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 block">
                    Display Name <span className="normal-case text-white/15">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addDisplayName}
                    onChange={e => setAddDisplayName(e.target.value)}
                    placeholder="Your name on this platform"
                    className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-red-500/40 transition-colors"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !addHandle.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {adding ? "Saving..." : "Save Handle"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
