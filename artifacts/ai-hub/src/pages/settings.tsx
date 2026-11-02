import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useClerk } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import {
  User, Key, Settings2, Bell, Shield, LogOut,
  Eye, EyeOff, Check, Pencil, ChevronRight,
  Cpu, Mic, Bot, Zap, AlertTriangle, Copy,
} from "lucide-react";
import { TherynIcon } from "@/components/nexus-icon";

type Section = "profile" | "api-keys" | "preferences" | "security";

const SECTIONS: { id: Section; icon: typeof User; label: string; desc: string }[] = [
  { id: "profile",     icon: User,     label: "Profile",      desc: "Your name, bio, and photo" },
  { id: "api-keys",    icon: Key,      label: "API Keys",     desc: "Connect your own AI keys" },
  { id: "preferences", icon: Settings2, label: "Preferences",  desc: "Defaults and behavior" },
  { id: "security",    icon: Shield,   label: "Security",     desc: "Account and session info" },
];

interface Settings {
  displayName: string | null;
  bio: string | null;
  elevenlabsApiKey: string | null;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openrouterApiKey: string | null;
  defaultProvider: string | null;
  defaultModel: string | null;
  streamingEnabled: string | null;
}

const API_KEY_FIELDS: { key: keyof Settings; label: string; placeholder: string; hint: string; icon: typeof Cpu; color: string }[] = [
  { key: "elevenlabsApiKey",   label: "ElevenLabs API Key",   placeholder: "el_xxxxxxxxxxxxxxxx",   hint: "Used for Voice TTS synthesis",       icon: Mic, color: "text-orange-400" },
  { key: "openaiApiKey",       label: "Theryn API Key",       placeholder: "sk-xxxxxxxxxxxxxxxx",   hint: "Override for Theryn engine",         icon: Cpu, color: "text-violet-400" },
  { key: "anthropicApiKey",    label: "Vesper API Key",       placeholder: "sk-ant-xxxxxxxx",       hint: "Override for Vesper engine",         icon: Zap, color: "text-cyan-400" },
  { key: "openrouterApiKey",   label: "Prism API Key",        placeholder: "sk-or-v1-xxxxxxxx",     hint: "Override for Prism multi-model hub", icon: Bot, color: "text-emerald-400" },
];

const DEFAULT_PROVIDERS = [
  { value: "openai",     label: "Theryn",   dot: "bg-violet-400" },
  { value: "anthropic",  label: "Vesper",   dot: "bg-cyan-400" },
  { value: "openrouter", label: "Prism",    dot: "bg-emerald-400" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("profile");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Partial<Settings>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  const loadSettings = () => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/settings", { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error("Unable to load settings");
        return r.json();
      })
      .then((data: Settings) => { setSettings(data); setEdits({}); })
      .catch(() => { setLoadError(true); toast({ title: "Failed to load settings", description: "Check your connection and try again.", variant: "destructive" }); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  const save = async (patch: Partial<Settings>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      setSettings(prev => prev ? { ...prev, ...patch } : prev);
      setEdits({});
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveKey = async (field: keyof Settings) => {
    const val = keyInputs[field as string];
    if (!val?.trim()) return;
    await save({ [field]: val.trim() } as any);
    setEditingKey(null);
    setKeyInputs(prev => ({ ...prev, [field as string]: "" }));
    setSettings(prev => prev ? { ...prev, [field]: val.slice(0, 4) + "••••••••" + val.slice(-4) } : prev);
  };

  const removeKey = async (field: keyof Settings) => {
    await save({ [field]: null } as any);
    setSettings(prev => prev ? { ...prev, [field]: null } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-full max-w-4xl mx-auto px-6 py-8 space-y-6" data-testid="state-settings-loading">
        <div className="h-8 w-40 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="grid gap-4 md:grid-cols-[13rem_1fr]">
          <div className="h-44 rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-full flex items-center justify-center px-6" data-testid="state-settings-error">
        <div className="card max-w-md w-full text-center space-y-4">
          <TherynIcon size={38} className="mx-auto opacity-60" />
          <div><h1 className="text-lg font-semibold text-white">Settings are unavailable</h1><p className="text-sm text-muted-foreground mt-1">We couldn't reach your workspace settings.</p></div>
          <button onClick={loadSettings} data-testid="button-retry-settings" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/85 transition-colors">Try again</button>
        </div>
      </div>
    );
  }

  const email = user?.emailAddresses?.[0]?.emailAddress;
  const displayName = user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : email ?? "User";
  const initials = (user?.firstName?.[0] ?? email?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-full bg-background" data-testid="page-settings">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account, API keys, and preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left nav */}
          <nav className="w-full md:w-52 flex-shrink-0 space-y-1">
            <div className="flex md:block gap-1 overflow-x-auto pb-1 md:pb-0">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                data-testid={`button-settings-section-${s.id}`}
                className={`w-auto md:w-full flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left group ${
                  section === s.id
                    ? "bg-white/8 text-white border border-white/10"
                    : "text-muted-foreground hover:text-white hover:bg-white/4"
                }`}
              >
                <s.icon className={`w-4 h-4 flex-shrink-0 ${section === s.id ? "text-primary" : "group-hover:text-white/60"}`} />
                <span className="font-medium">{s.label}</span>
                {section !== s.id && <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-40" />}
              </button>
            ))}
            </div>

            <div className="pt-2 md:pt-4 md:border-t border-white/5">
              <button
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                data-testid="button-settings-sign-out"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/8 transition-all text-left"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </nav>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >

                {/* ── PROFILE ── */}
                {section === "profile" && (
                  <div className="space-y-5">
                    <SectionHeader icon={User} title="Profile" desc="How you appear in THERYN" />

                    {/* Avatar row */}
                    <div className="card p-5 flex items-center gap-5">
                      <div className="relative">
                        {user?.imageUrl ? (
                          <img src={user.imageUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <span className="text-xl font-bold text-white">{initials}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{displayName}</p>
                        <p className="text-sm text-muted-foreground">{email ?? "No email"}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">Profile photo is managed through your sign-in provider</p>
                      </div>
                    </div>

                    {/* Display name */}
                    <div className="card p-5 space-y-3">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Display Name</label>
                      <input
                        type="text"
                        data-testid="input-settings-display-name"
                        defaultValue={settings?.displayName ?? displayName}
                        onChange={e => setEdits(p => ({ ...p, displayName: e.target.value }))}
                        placeholder={displayName}
                        className="w-full bg-black/30 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none transition-colors"
                      />
                      <p className="text-xs text-muted-foreground/50">This is how your name appears inside THERYN</p>
                    </div>

                    {/* Bio */}
                    <div className="card p-5 space-y-3">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Bio</label>
                      <textarea
                        data-testid="input-settings-bio"
                        rows={3}
                        defaultValue={settings?.bio ?? ""}
                        onChange={e => setEdits(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell us a bit about yourself..."
                        className="w-full bg-black/30 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none resize-none transition-colors"
                      />
                    </div>

                    {Object.keys(edits).length > 0 && (
                      <button
                        onClick={() => save(edits)}
                        disabled={saving}
                        data-testid="button-settings-save-profile"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-primary hover:bg-primary/80 transition-all disabled:opacity-50"
                      >
                        {saving ? "Saving..." : <><Check className="w-4 h-4" /> Save Changes</>}
                      </button>
                    )}
                  </div>
                )}

                {/* ── API KEYS ── */}
                {section === "api-keys" && (
                  <div className="space-y-5">
                    <SectionHeader icon={Key} title="API Keys" desc="Connect your own keys for each AI engine. Keys are masked after saving." />

                     <div className="card p-4 flex items-start gap-3 border-amber-500/15 bg-amber-500/[0.035]">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground/80 leading-relaxed">
                         Keys are sent over the authenticated connection and masked in this settings view after saving. Your own saved keys take precedence over platform defaults.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {API_KEY_FIELDS.map(field => {
                        const currentVal = settings?.[field.key];
                        const isEditing = editingKey === field.key;
                        return (
                          <div key={field.key} className="card p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <field.icon className={`w-4 h-4 ${field.color}`} />
                              <span className="text-sm font-semibold text-white">{field.label}</span>
                              {currentVal && (
                                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Connected
                                </span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="relative">
                                  <input
                                    type={showKeys[field.key as string] ? "text" : "password"}
                                    data-testid={`input-settings-key-${field.key}`}
                                    autoFocus
                                    value={keyInputs[field.key as string] ?? ""}
                                    onChange={e => setKeyInputs(p => ({ ...p, [field.key as string]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full bg-black/40 border border-white/15 focus:border-primary/50 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white font-mono placeholder:text-muted-foreground/30 focus:outline-none transition-colors"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowKeys(p => ({ ...p, [field.key as string]: !p[field.key as string] }))}
                                    data-testid={`button-settings-toggle-key-${field.key}`}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-white transition-colors"
                                  >
                                    {showKeys[field.key as string] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                   <button onClick={() => saveKey(field.key)} data-testid={`button-settings-save-key-${field.key}`} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/80 transition-colors">
                                    Save
                                  </button>
                                   <button onClick={() => setEditingKey(null)} data-testid={`button-settings-cancel-key-${field.key}`} className="px-4 py-1.5 rounded-lg bg-white/5 text-muted-foreground text-xs hover:text-white transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground/60 truncate">
                                  {currentVal ?? <span className="text-muted-foreground/30 italic">Not set</span>}
                                </div>
                                <button
                                  onClick={() => setEditingKey(field.key)}
                                   data-testid={`button-settings-edit-key-${field.key}`}
                                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white text-xs border border-white/8 transition-colors flex items-center gap-1.5"
                                >
                                  <Pencil className="w-3 h-3" />
                                  {currentVal ? "Update" : "Set"}
                                </button>
                                {currentVal && (
                                  <button
                                    onClick={() => removeKey(field.key)}
                                     data-testid={`button-settings-remove-key-${field.key}`}
                                    className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/20 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground/40">{field.hint}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── PREFERENCES ── */}
                {section === "preferences" && (
                  <div className="space-y-5">
                    <SectionHeader icon={Settings2} title="Preferences" desc="Default AI engine and behavior settings" />

                    <div className="card p-5 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Default AI Engine</label>
                        <div className="grid grid-cols-3 gap-2">
                          {DEFAULT_PROVIDERS.map(p => {
                            const isSelected = (settings?.defaultProvider ?? "openai") === p.value;
                            return (
                              <button
                                key={p.value}
                                onClick={() => { save({ defaultProvider: p.value }); setSettings(prev => prev ? { ...prev, defaultProvider: p.value } : prev); }}
                                 data-testid={`button-settings-provider-${p.value}`}
                                className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-all ${isSelected ? "bg-primary/15 border-primary/40 text-white" : "bg-white/[0.03] border-white/8 text-muted-foreground hover:text-white hover:bg-white/6"}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                                {p.label}
                                {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Streaming Responses</label>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/8">
                          <div>
                            <p className="text-sm text-white font-medium">Stream responses in real-time</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Show AI responses as they're generated</p>
                          </div>
                          <ToggleSwitch
                             data-testid="button-settings-streaming-toggle"
                            checked={(settings?.streamingEnabled ?? "true") === "true"}
                            onChange={v => { save({ streamingEnabled: String(v) }); setSettings(prev => prev ? { ...prev, streamingEnabled: String(v) } : prev); }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SECURITY ── */}
                {section === "security" && (
                  <div className="space-y-5">
                    <SectionHeader icon={Shield} title="Security" desc="Your account and session details" />

                    <div className="card p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-white/80">Account Details</h3>
                      <InfoRow label="User ID" value={user?.id ? user.id.slice(0, 16) + "..." : "—"} copyable />
                      <InfoRow label="Email" value={email ?? "—"} />
                      <InfoRow label="Auth Provider" value="THERYN SSO" />
                    </div>

                    <div className="card p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-white/80">Active Session</h3>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <p className="text-sm text-white">Current session — active now</p>
                          <p className="text-xs text-muted-foreground">This device is authenticated</p>
                        </div>
                      </div>
                    </div>

                    <div className="card p-5 space-y-3 border-red-500/10">
                      <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Danger Zone
                      </h3>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">
                        Signing out will end your current session. You can always sign back in.
                      </p>
                      <button
                        onClick={() => signOut({ redirectUrl: basePath || "/" })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out of All Sessions
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: { icon: typeof User; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground/70 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/80 font-mono">{value}</span>
        {copyable && (
          <button
            onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied!" }); }}
            className="p-1 rounded hover:bg-white/8 text-muted-foreground/50 hover:text-white transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, "data-testid": testId }: { checked: boolean; onChange: (v: boolean) => void; "data-testid"?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      data-testid={testId}
      aria-pressed={checked}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-5.5" : "left-0.5"}`} />
    </button>
  );
}
