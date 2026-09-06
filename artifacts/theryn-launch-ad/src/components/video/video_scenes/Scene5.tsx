import { motion } from "framer-motion";
import { ProductWindow, SignalTag } from "../ProductWindow";

export function Scene5() {
  return (
    <motion.div className="absolute inset-0 overflow-hidden" initial={{ opacity: 0, scale: .88, x: "4vw" }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: .9, x: "-4vw" }} transition={{ duration: 1.1, ease: [0.16, 1, .3, 1] }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(244,46,53,.16),transparent_31%),linear-gradient(120deg,#070908,#0d100e_52%,#090a09)]" />
      <div className="absolute left-[8vw] top-[13vh]"><SignalTag>Agent studio / initialized</SignalTag></div>
      <motion.div initial={{ opacity: 0, y: "4vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25, duration: .72 }} className="absolute left-[8vw] top-[26vh]">
        <div className="text-[5.1vw] font-semibold leading-[.88] tracking-[-.07em]">Build a mind<br /><span className="text-[var(--red)]">of your own.</span></div>
        <p className="mt-[3vh] w-[20vw] text-[.94vw] leading-[1.5] text-[rgba(244,241,234,.5)]">Custom agents with a voice, a role, and a memory built for your work.</p>
      </motion.div>
      <ProductWindow image="auth" className="absolute right-[7vw] top-[17vh] w-[49vw] h-[59vh]" zoom={1.06} />
      <motion.div initial={{ opacity: 0, y: "2vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: .55 }} className="absolute left-[8vw] bottom-[11vh] flex items-center gap-[1vw]">
        <div className="w-[2.8vw] h-[2.8vw] border border-[rgba(244,46,53,.5)] flex items-center justify-center rotate-45"><div className="w-[.55vw] h-[.55vw] bg-[var(--red)] shadow-[0_0_14px_rgba(244,46,53,.8)]" /></div>
        <div><div className="font-mono text-[.63vw] tracking-[.18em] text-[var(--red)]">YOUR DIRECTIVE</div><div className="mt-[.45vh] text-[.75vw] text-[rgba(244,241,234,.66)]">It learns the shape of the work.</div></div>
      </motion.div>
      <motion.div className="absolute right-[5.5vw] bottom-[10vh] flex gap-[.55vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        {[0, 1, 2, 3, 4].map(i => <motion.span key={i} className="block w-[.35vw] h-[.35vw] rounded-full bg-[var(--red)]" animate={{ opacity: [.2, 1, .2], y: [0, -4, 0] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * .12 }} />)}
      </motion.div>
    </motion.div>
  );
}