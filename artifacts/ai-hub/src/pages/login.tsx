import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TherynIcon } from "@/components/nexus-icon";
import { ArrowRight, Phone, Mail, Lock, Eye, EyeOff, ChevronLeft, Sparkles, Zap, Shield, Bot } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";

type View = "home" | "email" | "phone";

export default function LoginPage() {
  const { login } = useAuth();
  const [view, setView] = useState<View>("home");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"email" | "password">("email");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");

  const features = [
    { icon: Sparkles, label: "Theryn · Vesper · Prism", desc: "Three distinct AI engines in one interface." },
    { icon: Bot,      label: "Custom Agents",             desc: "Build AI with unique personalities." },
    { icon: Zap,      label: "Real-time Streaming",       desc: "Responses stream live as generated." },
    { icon: Shield,   label: "Secure & Private",          desc: "Your data stays yours alone." },
  ];

  const resetView = () => { setView("home"); setEmailStep("email"); setEmail(""); setPhone(""); };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStep === "email" && email.trim()) { setEmailStep("password"); return; }
    login();
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* BG glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[140px]" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[120px]" style={{ background: "rgba(255,107,138,0.04)" }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-14">

        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 space-y-10 hidden lg:block"
        >
          <div className="flex items-center gap-3">
            <TherynIcon size={44} className="drop-shadow-[0_0_14px_rgba(255,255,255,0.2)]" />
            <div>
              <h1 className="text-3xl font-display font-black tracking-widest text-white">THERYN</h1>
              <p className="text-[11px] text-cyan-100/80 font-mono uppercase tracking-[0.2em]">AI Command Center</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-display font-bold text-white leading-tight mb-3">
              The next generation<br />
              <span className="text-cyan-200">AI interface</span>
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
                <div className="w-7 h-7 rounded-lg bg-cyan-300/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-3.5 h-3.5 text-cyan-200" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/80">{f.label}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right — auth card */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="w-full max-w-[360px]"
        >
          <div className="rounded-2xl border border-white/[0.08] p-7 shadow-[0_0_60px_-15px_rgba(255,255,255,0.07)]" style={{ background: "hsl(0 0% 8%)" }}>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <TherynIcon size={40} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.18)]" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">
                {view === "home" ? "Welcome to THERYN" : view === "email" ? "Continue with Email" : "Continue with Phone"}
              </h3>
              <p className="text-xs text-white/35 mt-1">
                {view === "home"
                  ? "Choose how you'd like to sign in"
                  : view === "email"
                  ? emailStep === "email" ? "Enter your email to continue" : `Hi ${email.split("@")[0]} — enter your password`
                  : "Enter your phone number"}
              </p>
            </div>

            <AnimatePresence mode="wait">

              {/* ── HOME ── */}
              {view === "home" && (
                <motion.div key="home" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-2.5">

                  {/* Google */}
                  <button
                    onClick={login}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 active:bg-gray-100 transition-all"
                  >
                    <GoogleIcon />
                    <span className="flex-1 text-center">Continue with Google</span>
                  </button>

                  {/* Apple */}
                  <button
                    onClick={login}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] text-white font-semibold text-sm hover:bg-white/[0.1] active:bg-white/[0.12] transition-all border border-white/[0.08]"
                  >
                    <AppleIcon />
                    <span className="flex-1 text-center">Continue with Apple</span>
                  </button>

                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-white/[0.07]" />
                    <span className="text-[10px] text-white/25 font-medium tracking-wider">OR</span>
                    <div className="flex-1 h-px bg-white/[0.07]" />
                  </div>

                  {/* Email */}
                  <button
                    onClick={() => setView("email")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] text-white/70 font-medium text-sm hover:bg-white/[0.08] hover:text-white active:bg-white/[0.10] transition-all border border-white/[0.07]"
                  >
                    <Mail className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <span className="flex-1 text-center">Continue with Email</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                  </button>

                  {/* Phone */}
                  <button
                    onClick={() => setView("phone")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] text-white/70 font-medium text-sm hover:bg-white/[0.08] hover:text-white active:bg-white/[0.10] transition-all border border-white/[0.07]"
                  >
                    <Phone className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <span className="flex-1 text-center">Continue with Phone</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                  </button>

                  <p className="text-center text-[11px] text-white/25 pt-1">
                    New here?{" "}
                    <button onClick={login} className="text-cyan-200 hover:text-cyan-100 transition-colors underline underline-offset-2">
                      Create a free account
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ── EMAIL ── */}
              {view === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full border border-white/[0.08] focus:border-cyan-200/35 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                        style={{ background: "hsl(0 0% 10%)" }}
                      />
                    </div>

                    {emailStep === "password" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                        <input
                          type={showPass ? "text" : "password"}
                          required
                          autoFocus
                          placeholder="Password"
                          className="w-full border border-white/[0.08] focus:border-cyan-200/35 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                          style={{ background: "hsl(0 0% 10%)" }}
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </motion.div>
                    )}

                    {emailStep === "password" && (
                      <div className="flex justify-end">
                        <button type="button" onClick={login} className="text-[11px] text-cyan-200/70 hover:text-cyan-100 transition-colors">
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm text-black bg-white hover:bg-white/90 active:bg-white/80 transition-all flex items-center justify-center gap-2 shadow-[0_0_18px_-8px_rgba(255,255,255,0.18)]">
                      {emailStep === "email" ? "Continue" : "Sign In"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/[0.07]" />
                    <span className="text-[10px] text-white/25">OR</span>
                    <div className="flex-1 h-px bg-white/[0.07]" />
                  </div>

                  <button onClick={login} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 transition-all">
                    <GoogleIcon /><span className="flex-1 text-center">Continue with Google</span>
                  </button>

                  <button onClick={resetView} className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" /> All sign-in options
                  </button>
                </motion.div>
              )}

              {/* ── PHONE ── */}
              {view === "phone" && (
                <motion.div key="phone" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                  <form onSubmit={handlePhoneSubmit} className="space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white/70 focus:outline-none focus:border-cyan-200/35 transition-colors appearance-none cursor-pointer"
                        style={{ background: "hsl(0 0% 10%)" }}
                      >
                        {[["🇺🇸","+1"],["🇬🇧","+44"],["🇮🇳","+91"],["🇳🇬","+234"],["🇿🇦","+27"],["🇩🇪","+49"],["🇫🇷","+33"],["🇧🇷","+55"]].map(([flag, code]) => (
                          <option key={code} value={code}>{flag} {code}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          autoFocus
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Phone number"
                          className="w-full border border-white/[0.08] focus:border-cyan-200/35 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                          style={{ background: "hsl(0 0% 10%)" }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/25">We'll send a verification code to this number.</p>
                    <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm text-slate-950 bg-cyan-300 hover:bg-cyan-200 active:bg-cyan-400 transition-all flex items-center justify-center gap-2">
                      Send Code <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                  <button onClick={resetView} className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" /> All sign-in options
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer links */}
            <p className="text-center text-[10px] text-white/20 leading-relaxed mt-5">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">
                Terms of Service
              </Link>
              {" & "}
              <Link href="/privacy" className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#d4d4d4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#a3a3a3"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#737373"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#bdbdbd"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 fill-white" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}
