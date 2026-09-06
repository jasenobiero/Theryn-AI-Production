import { motion } from "framer-motion";
import { ProductWindow, SignalTag, TherynWordmark } from "../ProductWindow";

export function Scene7() {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0, scale: 1.16 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .82 }} transition={{ duration: 1.15, ease: [0.16, 1, .3, 1] }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(244,46,53,.2),transparent_27%),linear-gradient(125deg,#070908,#0e1310_49%,#070908)]" />
      <motion.div className="absolute left-1/2 top-1/2 w-[25vw] h-[25vw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(244,46,53,.28)]" animate={{ scale: [1, 1.3, 1], opacity: [.7, .25, .7] }} transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute left-[8vw] top-[13vh]"><SignalTag>THERYN / the reveal</SignalTag></div>
      <ProductWindow image="auth" className="absolute left-[16vw] top-[20vh] w-[68vw] h-[60vh]" zoom={1.03} />
      <motion.div initial={{ opacity: 0, y: "3vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .72, duration: .7 }} className="absolute left-[8vw] bottom-[10vh]">
        <div className="text-[1vw] text-[rgba(244,241,234,.42)] tracking-[.04em]">The command center is ready.</div>
        <div className="mt-[1vh] text-[3.25vw] font-semibold tracking-[-.06em]">Make more room for <span className="text-[var(--red)]">what’s next.</span></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, duration: .7, ease: [0.16, 1, .3, 1] }} className="absolute right-[8vw] bottom-[10vh]">
        <TherynWordmark compact />
      </motion.div>
    </motion.div>
  );
}