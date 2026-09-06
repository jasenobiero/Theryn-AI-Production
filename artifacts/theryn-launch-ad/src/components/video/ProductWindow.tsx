import { motion } from "framer-motion";

const base = import.meta.env.BASE_URL;

type ProductWindowProps = {
  image: "home" | "auth";
  className?: string;
  zoom?: number;
  offsetX?: string;
};

export function ProductWindow({ image, className = "", zoom = 1, offsetX = "0%" }: ProductWindowProps) {
  return (
    <motion.div
      className={`product-shot ui-frame ${className}`}
      initial={{ opacity: 0, y: "4vh", scale: .94, rotateY: 5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
      transition={{ duration: .9, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1200 }}
    >
      <img
        src={`${base}media/theryn-${image}.jpg`}
        alt=""
        style={{ transform: `scale(${zoom}) translateX(${offsetX})`, transformOrigin: "center center" }}
      />
      <div className="scan" />
    </motion.div>
  );
}

export function SignalTag({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-[.7vw] font-mono text-[.72vw] tracking-[.18em] uppercase ${light ? "text-[rgba(244,241,234,.72)]" : "text-[rgba(244,241,234,.42)]"}`}>
      <span className="red-dot" /> {children}
    </div>
  );
}

export function TherynWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-[.9vw]">
      <img src={`${base}media/theryn-logo.svg`} alt="" className={`${compact ? "w-[2.2vw]" : "w-[3.2vw]"} h-auto`} />
      <div>
        <div className={`${compact ? "text-[1.35vw]" : "text-[1.8vw]"} font-bold tracking-[.26em] leading-none`}>THERYN</div>
        <div className="font-mono text-[.52vw] tracking-[.38em] text-[rgba(244,241,234,.45)] mt-[.35vw]">AI COMMAND CENTER</div>
      </div>
    </div>
  );
}

export function InterfaceRail() {
  return (
    <div className="absolute left-[3.1vw] top-1/2 -translate-y-1/2 flex flex-col items-center gap-[1vw] opacity-55">
      <div className="w-px h-[10vh] bg-gradient-to-b from-transparent to-[rgba(244,241,234,.42)]" />
      <div className="w-[.45vw] h-[.45vw] rounded-full border border-[rgba(244,241,234,.55)]" />
      <div className="w-px h-[18vh] bg-[rgba(244,241,234,.18)]" />
      <div className="font-mono text-[.55vw] tracking-[.25em] [writing-mode:vertical-rl] text-[rgba(244,241,234,.5)]">THERYN / 001</div>
      <div className="w-px h-[8vh] bg-gradient-to-t from-transparent to-[rgba(244,241,234,.42)]" />
    </div>
  );
}