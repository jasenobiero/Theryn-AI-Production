import { motion } from "framer-motion";
import { SignalTag, TherynWordmark } from "../ProductWindow";

export function Scene1() {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      exit={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
      transition={{ duration: 1.15, ease: [0.77, 0, 0.18, 1] }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_17%_52%,rgba(244,46,53,.14),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(129,155,143,.08),transparent_31%),linear-gradient(115deg,#070908,#0c0f0e_52%,#070908)]" />
      <motion.div
        className="absolute left-[12vw] top-[35vh] w-[32vw] h-px bg-[rgba(244,241,234,.25)] origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1, 1, .4] }}
        transition={{ duration: 4.7, times: [0, .23, .8, 1], ease: "easeOut" }}
      />
      <motion.div
        className="absolute left-[10vw] top-[24vh] w-[26vw] h-[26vw] border border-[rgba(244,241,234,.08)] rounded-full"
        animate={{ rotate: 360, scale: [1, 1.08, 1] }}
        transition={{ rotate: { duration: 24, repeat: Infinity, ease: "linear" }, scale: { duration: 5.5, repeat: Infinity, ease: "easeInOut" } }}
      />
      <motion.div className="absolute right-[14vw] bottom-[16vh] w-[18vw] h-[18vw] border border-[rgba(244,46,53,.18)] rounded-full" animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
      <div className="absolute left-[10vw] top-[16vh]">
        <motion.div initial={{ opacity: 0, y: "-2vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .65 }}>
          <SignalTag light>System / 00:00:01</SignalTag>
        </motion.div>
        <motion.div className="mt-[9vh]">
          <motion.div initial={{ opacity: 0, y: "5vh", letterSpacing: ".3em" }} animate={{ opacity: 1, y: 0, letterSpacing: "-.04em" }} transition={{ delay: .55, duration: 1.05, ease: [0.16, 1, .3, 1] }} className="text-[7.2vw] font-semibold leading-[.86] tracking-[-.04em]">
            Intelligence<br /><span className="text-[var(--red)]">aligned.</span>
          </motion.div>
          <motion.p initial={{ opacity: 0, x: "-2vw" }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6, duration: .75 }} className="mt-[3vh] font-mono text-[.9vw] tracking-[.1em] text-[rgba(244,241,234,.47)]">
            A new command layer for the way you think.
          </motion.p>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.3, duration: .8, ease: [0.16, 1, .3, 1] }} className="absolute right-[10vw] top-[19vh]">
        <TherynWordmark />
      </motion.div>
      <div className="absolute left-[10vw] bottom-[9vh] flex items-center gap-[1vw] font-mono text-[.63vw] tracking-[.16em] text-[rgba(244,241,234,.32)]">
        <span>BUILD 01.24</span><span className="w-[3vw] h-px bg-[rgba(244,241,234,.24)]" /><span>RENDERING / REAL-TIME</span>
      </div>
    </motion.div>
  );
}