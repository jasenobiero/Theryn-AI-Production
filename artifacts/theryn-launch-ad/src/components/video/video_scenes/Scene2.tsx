import { motion } from "framer-motion";
import { ProductWindow, SignalTag, InterfaceRail } from "../ProductWindow";

export function Scene2() {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: "circle(0% at 85% 58%)" }}
      animate={{ opacity: 1, clipPath: "circle(150% at 85% 58%)" }}
      exit={{ opacity: 0, clipPath: "circle(0% at 16% 45%)" }}
      transition={{ duration: 1.05, ease: [0.77, 0, .18, 1] }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(105deg,#080a09,#111512_54%,#0a0b0a)]" />
      <div className="absolute right-[-14vw] top-[-30vh] w-[58vw] h-[110vh] rounded-full bg-[radial-gradient(ellipse,rgba(244,46,53,.17),transparent_66%)] blur-[1px]" />
      <InterfaceRail />
      <div className="absolute left-[10vw] top-[14vh]">
        <SignalTag>Interface / live</SignalTag>
        <motion.h2 initial={{ opacity: 0, y: "2vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .28, duration: .65 }} className="mt-[3.7vh] text-[3.8vw] leading-[.94] tracking-[-.055em] font-semibold">
          One surface.<br /><span className="text-[var(--red)]">Every possibility.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .95, duration: .6 }} className="mt-[3vh] w-[20vw] text-[.95vw] leading-[1.5] text-[rgba(244,241,234,.5)]">
          THERYN brings your models, tools, and creative work into a single, focused command center.
        </motion.p>
        <div className="mt-[6vh] flex flex-col gap-[1.15vh] font-mono text-[.64vw] tracking-[.14em] text-[rgba(244,241,234,.48)]">
          {["CONTEXT / RETAINED", "OUTPUT / STREAMING", "CONTROL / YOURS"].map((item, i) => (
            <motion.div key={item} initial={{ opacity: 0, x: "-1vw" }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 + i * .16, duration: .4 }} className="flex items-center gap-[.7vw]">
              <span className="text-[var(--red)]">0{i + 1}</span>{item}<span className="ml-[.8vw] w-[2.4vw] h-px bg-[rgba(244,241,234,.18)]" />
            </motion.div>
          ))}
        </div>
      </div>
      <ProductWindow image="home" className="absolute w-[51vw] h-[57vh] right-[6.2vw] top-[22vh]" zoom={1.04} offsetX="-1%" />
      <motion.div initial={{ opacity: 0, scale: .7 }} animate={{ opacity: [0, 1, .6, 1], scale: 1 }} transition={{ delay: 1.5, duration: 1.2 }} className="absolute right-[5vw] bottom-[12vh] w-[7vw] h-[7vw] rounded-full border border-[rgba(244,46,53,.45)] flex items-center justify-center">
        <div className="w-[.55vw] h-[.55vw] rounded-full bg-[var(--red)] shadow-[0_0_22px_rgba(244,46,53,.7)]" />
      </motion.div>
    </motion.div>
  );
}