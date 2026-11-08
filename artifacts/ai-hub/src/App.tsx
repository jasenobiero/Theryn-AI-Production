import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Sparkles, Zap, Shield, Bot } from "lucide-react";
import {
  ClerkProvider, SignIn, SignUp,
  useClerk, useAuth,
} from "@clerk/react";
import { Redirect } from "wouter";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

import Home from "@/pages/home";
import ChatPage from "@/pages/chat";
import VoicePage from "@/pages/voice";
import AgentsPage from "@/pages/agents";
import AgentChatPage from "@/pages/agent-chat";
import StudioPage from "@/pages/studio";
import ImagesPage from "@/pages/images";
import AiPreviewPage from "@/pages/ai-preview";
import ArenaPage from "@/pages/arena";
import PromptsPage from "@/pages/prompts";
import SettingsPage from "@/pages/settings";
import SubscriptionPage from "@/pages/subscription";
import ShieldPage from "@/pages/shield";
import BotHubPage from "@/pages/bot-hub";
import DownloadsPage from "@/pages/downloads";
import NotFound from "@/pages/not-found";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import { TherynIcon } from "@/components/nexus-icon";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { SignalBackdrop } from "@/components/signal-backdrop";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const configuredClerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkPubKey = import.meta.env.PROD
  ? publishableKeyFromHost(window.location.hostname, configuredClerkPubKey)
  : configuredClerkPubKey;
if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY. Add your Clerk publishable key to artifacts/ai-hub/.env.local, then restart Vite.");
}

const clerkProxyUrl = import.meta.env.PROD ? import.meta.env.VITE_CLERK_PROXY_URL : undefined;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const features = [
  { icon: Sparkles, label: "Theryn · Vesper · Prism", desc: "Three distinct AI engines in one interface." },
  { icon: Bot,      label: "Custom Agents",            desc: "Build AI with unique personalities." },
  { icon: Zap,      label: "Real-time Streaming",      desc: "Responses stream live as generated." },
  { icon: Shield,   label: "Secure & Private",         desc: "Your data stays yours alone." },
];

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
      colorPrimary: "#f5f5f5",
    colorForeground: "#ffffff",
    colorMutedForeground: "rgba(255,255,255,0.35)",
      colorDanger: "#d4d4d4",
      colorBackground: "hsl(0,0%,7%)",
      colorInput: "hsl(0,0%,11%)",
    colorInputForeground: "#ffffff",
    colorNeutral: "rgba(255,255,255,0.08)",
     fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[400px] max-w-full overflow-hidden shadow-[0_0_60px_-15px_rgba(255,255,255,0.08)] border border-white/[0.08]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-white/40",
    socialButtonsBlockButtonText: "font-semibold text-white/80",
    formFieldLabel: "text-white/50 text-xs uppercase tracking-wide",
    footerActionLink: "text-white/80 hover:text-white font-medium",
    footerActionText: "text-white/30",
    dividerText: "text-white/25",
    identityPreviewEditButton: "text-white/80",
    formFieldSuccessText: "text-white/80",
    alertText: "text-white/80",
    logoBox: "mb-1",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border-white/[0.08] hover:bg-white/[0.06] transition-colors",
    formButtonPrimary: "bg-white hover:bg-white/90 active:bg-white/80 text-black shadow-[0_0_20px_-8px_rgba(255,255,255,0.18)] transition-all",
    formFieldInput: "text-white focus:border-white/40 transition-colors",
    footerAction: "border-t border-white/[0.05]",
    dividerLine: "bg-white/[0.07]",
    alert: "border-white/[0.08]",
    otpCodeFieldInput: "text-white",
    formFieldRow: "",
    main: "",
  },
};

function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const removeDevelopmentBadge = () => {
      document.querySelectorAll("body *").forEach((element) => {
        if (element.children.length === 0 && element.textContent?.trim() === "Development mode") {
          const badge = element.closest("a, button") ?? element.parentElement ?? element;
          badge.remove();
        }
      });
    };

    removeDevelopmentBadge();
    const observer = new MutationObserver(removeDevelopmentBadge);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden bg-background" data-testid="auth-layout">
      <SignalBackdrop />
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-20">
        <div className="lg:hidden flex items-center gap-2.5 self-start">
           <TherynIcon size={30} className="drop-shadow-[0_0_14px_rgba(255,255,255,0.22)]" />
          <div>
            <p className="text-lg font-display font-black tracking-[0.2em] text-white">THERYN</p>
             <p className="text-[9px] text-cyan-200/80 font-mono uppercase tracking-[0.18em]">Signal Intelligence System</p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 space-y-10 hidden lg:block lg:pl-8"
        >
          <div className="flex items-center gap-3">
             <TherynIcon size={48} className="drop-shadow-[0_0_18px_rgba(255,255,255,0.24)]" />
            <div>
              <h1 className="text-3xl font-display font-black tracking-widest text-white">THERYN</h1>
               <p className="text-[11px] text-cyan-200/80 font-mono uppercase tracking-[0.2em]">Signal Intelligence System</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-white leading-tight mb-3">
               Think in signals.<br />
                <span className="text-white/80">Build in motion.</span>
            </h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-sm">
              Multiple AI engines, custom agents, image generation, and voice synthesis — all in one command center.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              >
                 <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                   <f.icon className="w-3.5 h-3.5 text-white/80" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/80">{f.label}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="w-full max-w-[440px] rounded-[28px] border border-white/[0.09] bg-white/[0.025] p-2 shadow-[0_24px_90px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          <div className="rounded-[22px] border border-white/[0.06] bg-[hsl(0_0%_6%)] px-1 py-2">
            <div className="px-6 pt-3 pb-1 flex items-center gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,.18)]" />
               <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Private workspace access</span>
            </div>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthLayout>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthLayout>
  );
}

function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthLayout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthedRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/arena" component={ArenaPage} />
        <Route path="/prompts" component={PromptsPage} />
        <Route path="/voice" component={VoicePage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/agents/:id/chat" component={AgentChatPage} />
        <Route path="/studio" component={StudioPage} />
        <Route path="/images" component={ImagesPage} />
        <Route path="/preview" component={AiPreviewPage} />
        <Route path="/shield" component={ShieldPage} />
        <Route path="/bot-hub" component={BotHubPage} />
        <Route path="/downloads" component={DownloadsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/subscription" component={SubscriptionPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppRoutes() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "hsl(0 0% 4%)" }}>
        <div className="flex flex-col items-center gap-4">
           <TherynIcon size={48} className="drop-shadow-[0_0_18px_rgba(255,255,255,0.22)] animate-pulse" />
          <p className="text-white/30 text-xs font-mono tracking-[0.2em] uppercase">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        {isSignedIn ? <AuthedRouter /> : <Redirect to="/sign-in" />}
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to THERYN",
            subtitle: "Sign in to your AI command center",
          },
        },
        signUp: {
          start: {
            title: "Join THERYN",
            subtitle: "Create your AI command center account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <PWAInstallPrompt />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
