import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bot, MessageSquare, Image as ImageIcon, Mic, Home, Menu,
  Settings, PenSquare, LogOut, Sparkles, Zap, BookMarked, Command, ShieldCheck, Radio, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TherynIcon } from "@/components/nexus-icon";
import { useUser, useClerk } from "@clerk/react";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";

interface LayoutProps { children: ReactNode }

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { href: "/",        icon: Home,        label: "Home" },
      { href: "/chat",    icon: MessageSquare, label: "AI Chat" },
      { href: "/arena",   icon: Zap,         label: "Arena",        badge: "NEW", badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/20" },
      { href: "/studio",  icon: Sparkles,    label: "Studio" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/images",  icon: ImageIcon,   label: "Image Gen" },
      { href: "/voice",   icon: Mic,         label: "Voice TTS" },
      { href: "/agents",  icon: Bot,         label: "Agent Studio" },
      { href: "/prompts", icon: BookMarked,  label: "Prompt Library", badge: "40+", badgeColor: "bg-red-500/15 text-red-300/70 border-red-500/15" },
      { href: "/shield",  icon: ShieldCheck, label: "Social Shield",  badge: "NEW", badgeColor: "bg-red-600/20 text-red-300 border-red-600/20" },
      { href: "/bot-hub",   icon: Radio,    label: "Bot Hub",    badge: "NEW", badgeColor: "bg-blue-600/20 text-blue-300 border-blue-600/20" },
      { href: "/downloads", icon: Download, label: "Get App",    badge: "PWA", badgeColor: "bg-green-600/20 text-green-300 border-green-600/20" },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const initials = (user?.firstName?.[0] ?? email?.[0] ?? "?").toUpperCase();
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : (email ?? "User");

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-background" data-testid="app-shell">
      <button
        aria-label="Close navigation"
        data-testid="button-close-navigation"
        onClick={() => setMobileNavOpen(false)}
        className={cn("fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden transition-opacity", mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "w-[264px] flex-shrink-0 flex flex-col z-40 border-r border-white/[0.07] bg-[hsl(0_0%_5.5%)]",
          "fixed inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0 transition-transform duration-300",
          mobileNavOpen && "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.05]">
          <Link href="/" onClick={() => setMobileNavOpen(false)} data-testid="link-sidebar-home" className="flex items-center gap-2.5 group flex-1 min-w-0">
            <TherynIcon size={28} className="drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
            <span className="font-display font-bold text-[17px] tracking-[0.24em] text-white">
              THERYN
            </span>
          </Link>
        </div>

        {/* New Chat + Cmd+K row */}
        <div className="px-3 pt-3 pb-1 flex flex-col gap-1.5">
          <Link
            href="/chat"
            data-testid="link-compose-chat"
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-sm font-medium transition-all group"
          >
            <PenSquare className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            Compose
          </Link>

          {/* Cmd+K button */}
          <button
            onClick={() => setCmdOpen(true)}
            data-testid="button-command-palette"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all text-xs"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Command palette</span>
            <div className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded text-[9px] border border-white/[0.08] font-mono">⌘</kbd>
              <kbd className="px-1 py-0.5 rounded text-[9px] border border-white/[0.08] font-mono">K</kbd>
            </div>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-3">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 py-1 text-[9px] font-semibold text-white/20 uppercase tracking-widest">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = item.href === "/"
                    ? location === "/"
                    : location.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      data-testid={`link-nav-${item.href === "/" ? "home" : item.href.slice(1).replace("/", "-")}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                        isActive
                          ? "bg-red-600/15 text-white border border-red-500/20"
                          : "text-white/45 hover:text-white hover:bg-white/[0.05]"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-lg"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        />
                      )}
                      <item.icon className={cn(
                        "w-4 h-4 flex-shrink-0 relative z-10 transition-colors",
                        isActive ? "text-red-400" : "group-hover:text-red-400/70"
                      )} />
                      <span className="relative z-10 flex-1">{item.label}</span>
                      {"badge" in item && item.badge && (
                        <span className={cn(
                          "relative z-10 text-[8px] font-bold px-1.5 py-0.5 rounded-md border",
                          (item as any).badgeColor
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: Settings + User */}
        <div className="px-3 pb-3 space-y-1 border-t border-white/[0.05] pt-3">
          <Link
            href="/settings"
            onClick={() => setMobileNavOpen(false)}
            data-testid="link-nav-settings"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
              location === "/settings"
                ? "bg-red-600/15 text-white border border-red-500/20"
                : "text-white/40 hover:text-white hover:bg-white/[0.05]"
            )}
          >
            <Settings className={cn("w-4 h-4 flex-shrink-0 transition-colors", location === "/settings" ? "text-red-400" : "group-hover:text-red-400/70")} />
            Settings
          </Link>

          {/* User row */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all group cursor-default">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white">{initials}</span>
              </div>
            )}
            <p className="text-xs font-medium text-white/60 truncate flex-1">{displayName}</p>
            <button
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
               data-testid="button-sign-out-sidebar"
              title="Sign out"
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/40 hover:text-white transition-all flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 min-h-[100dvh] overflow-hidden bg-background">
        <div className="md:hidden h-14 flex items-center justify-between px-4 border-b border-white/[0.07] bg-[hsl(0_0%_5%)]">
          <button onClick={() => setMobileNavOpen(true)} data-testid="button-open-navigation" className="touch-target flex items-center justify-center -ml-2 text-white/60 hover:text-white" aria-label="Open navigation">
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" data-testid="link-mobile-home" className="font-display font-bold tracking-[0.24em] text-sm text-white">THERYN</Link>
          <Link href="/settings" data-testid="link-mobile-settings" className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/20 flex items-center justify-center text-xs text-red-300">{initials}</Link>
        </div>
         <div className="flex-1 overflow-y-auto overflow-x-hidden h-full pb-16 md:pb-0">
          {children}
        </div>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-white/[0.08] bg-[hsl(0_0%_5%_/_0.94)] backdrop-blur-xl grid grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {[
            { href: "/", label: "Home", icon: Home },
            { href: "/chat", label: "Chat", icon: MessageSquare },
            { href: "/studio", label: "Studio", icon: Sparkles },
            { href: "/agents", label: "Agents", icon: Bot },
          ].map(item => {
            const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`link-mobile-${item.label.toLowerCase()}`}
                className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors", active ? "text-red-300" : "text-white/35")}
              >
                <item.icon className={cn("w-4 h-4", active && "text-red-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </main>

      {/* Global command palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
