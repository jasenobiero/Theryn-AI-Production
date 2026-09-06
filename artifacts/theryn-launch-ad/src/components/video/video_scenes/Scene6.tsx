import { motion } from "framer-motion";
import { ProductWindow, SignalTag } from "../ProductWindow";

export function Scene6() {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0, clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%)" }} animate={{ opacity: 1, clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)" }} exit={{ opacity: 0, clipPath: "polygon(0 0,0 0,0 100%,0 100%)" }} transition={{ duration: 1, ease: [0.77, 0, .18, 1] }}>
      <div className="absolute inset-0 bg-[linear-gradient(116deg,#090b0a,#131b17_55%,#090a09)]" />
      <div className="absolute left-[8vw] top-[13vh]"><SignalTag>Trust layer / online</SignalTag></div>
      <motion.div initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .35, duration: .8 }} className="absolute left-[8vw] top-[26vh]">
        <div className="text-[4.9vw] font-semibold tracking-[-.07em] leading-[.88]">Fast enough<br />to feel like<br /><span className="text-[var(--red)]">thought.</span></div>
      </motion.div>
      <ProductWindow image="home" className="absolute right-[6vw] top-[16vh] w-[45vw] h-[60vh]" zoom={1.2} offsetX="-5%" />
      <div className="absolute left-[8vw] bottom-[11vh] flex gap-[2vw]">
        <div><div className="font-mono text-[.58vw] tracking-[.18em] text-[rgba(244,241,234,.4)]">STREAMING</div><div className="mt-[.8vh] text-[1.35vw] font-medium">Real-time</div></div>
        <div className="w-px h-[4vh] bg-[rgba(244,241,234,.2)]" />
        <div><div className="font-mono text-[.58vw] tracking-[.18em] text-[rgba(244,241,234,.4)]">PRIVACY</div><div className="mt-[.8vh] text-[1.35vw] font-medium">Yours alone</div></div>
      </div>
      <motion.div initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4, duration: .5 }} className="absolute right-[9vw] bottom-[10vh] font-mono text-[.61vw] tracking-[.2em] text-[var(--red)]">ENCRYPTED / 24.7 MS</motion.div>
    </motion.div>
  );
}