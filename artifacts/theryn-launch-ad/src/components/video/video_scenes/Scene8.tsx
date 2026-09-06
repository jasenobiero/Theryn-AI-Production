import { motion } from "framer-motion";
import { TherynWordmark, SignalTag } from "../ProductWindow";

export function Scene8() {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0, clipPath: "circle(0% at 50% 50%)" }} animate={{ opacity: 1, clipPath: "circle(100% at 50% 50%)" }} exit={{ opacity: 0, clipPath: "circle(0% at 50% 50%)" }} transition={{ duration: 1.2, ease: [0.77, 0, .18, 1] }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(244,46,53,.22),transparent_24%),linear-gradient(140deg,#080a09,#121613_51%,#080a09)]" />
      <motion.div className="absolute left-1/2 top-1/2 w-[44vw] h-[44vw] -translate-x-1/2 -translate-y-1/2 border border-[rgba(244,241,234,.1)] rounded-full" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute left-1/2 top-1/2 w-[29vw] h-[29vw] -translate-x-1/2 -translate-y-1/2 border border-dashed border-[rgba(244,46,53,.3)] rounded-full" animate={{ rotate: -360 }} transition={{ duration: 17, repeat: Infinity, ease: "linear" }} />
      <div className="absolute left-[8vw] top-[13vh]"><SignalTag light>Transmission complete</SignalTag></div>
      <motion.div initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .35, duration: 1.05, ease: [0.16, 1, .3, 1] }} className="absolute inset-0 flex flex-col items-center justify-center">
        <TherynWordmark />
        <div className="mt-[6vh] text-center">
          <div className="text-[5.9vw] font-semibold leading-[.82] tracking-[-.075em]">Think<br /><span className="text-[var(--red)]">further.</span></div>
          <motion.div initial={{ opacity: 0, letterSpacing: ".3em" }} animate={{ opacity: 1, letterSpacing: ".16em" }} transition={{ delay: 1.25, duration: .8 }} className="mt-[4vh] font-mono text-[.72vw] tracking-[.16em] text-[rgba(244,241,234,.58)]">THE AI COMMAND CENTER / THERYN.AI</motion.div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: "2vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.75, duration: .55 }} className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 text-center">
        <div className="font-mono text-[.6vw] tracking-[.2em] text-[rgba(244,241,234,.32)]">ENTER THE COMMAND CENTER</div>
        <div className="mt-[1.3vh] mx-auto w-[7vw] h-px bg-[var(--red)]" />
      </motion.div>
    </motion.div>
  );
}