import { motion } from "framer-motion";
import { ProductWindow, SignalTag } from "../ProductWindow";

export function Scene4() {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }} animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }} exit={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }} transition={{ duration: .9, ease: [0.77, 0, .18, 1] }}>
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#0d1210,#111917_45%,#090b0a)]" />
      <motion.div className="absolute right-[-15vw] top-[-30vh] w-[70vw] h-[120vh] bg-[radial-gradient(ellipse_at_center,rgba(129,155,143,.18),transparent_63%)]" animate={{ scale: [1, 1.12, 1], rotate: [0, 2, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute left-[8vw] top-[13vh]"><SignalTag>Creative suite / 04</SignalTag></div>
      <motion.div initial={{ opacity: 0, x: "-3vw" }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .35, duration: .65 }} className="absolute left-[8vw] top-[25vh]">
        <div className="text-[5.4vw] leading-[.88] tracking-[-.065em] font-semibold">Make the<br /><span className="text-[var(--red)]">impossible</span><br />visible.</div>
        <p className="mt-[3vh] w-[19vw] text-[.93vw] leading-[1.5] text-[rgba(244,241,234,.48)]">Image synthesis, voice, and a workspace that keeps pace with the idea.</p>
      </motion.div>
      <ProductWindow image="home" className="absolute right-[6vw] top-[16vh] w-[47vw] h-[62vh]" zoom={1.2} offsetX="2%" />
      <motion.div initial={{ opacity: 0, scale: .8, rotate: -5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 1.05, duration: .7, ease: [0.16, 1, .3, 1] }} className="absolute right-[39vw] bottom-[12vh] px-[1.2vw] py-[1vh] bg-[rgba(7,9,8,.9)] border border-[rgba(244,241,234,.16)]">
        <div className="font-mono text-[.6vw] tracking-[.16em] text-[var(--red)]">GENERATIVE FIELD</div>
        <div className="mt-[.55vh] text-[.76vw] text-[rgba(244,241,234,.72)]">A thought, given form.</div>
      </motion.div>
      <div className="absolute left-[8vw] bottom-[10vh] flex gap-[1.8vw] font-mono text-[.6vw] tracking-[.17em] text-[rgba(244,241,234,.38)]">
        <span>IMAGE / SYNTHESIS</span><span>VOICE / PRESENCE</span><span>STUDIO / FLOW</span>
      </div>
    </motion.div>
  );
}