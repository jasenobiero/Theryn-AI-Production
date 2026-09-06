import { motion } from "framer-motion";
import { ProductWindow, SignalTag } from "../ProductWindow";

const engines = [
  { name: "THERYN", desc: "Fast, direct, precise.", color: "var(--red)", x: "10vw", y: "70vh" },
  { name: "VESPER", desc: "Depth for difficult things.", color: "#b6c9bd", x: "76vw", y: "17vh" },
  { name: "PRISM", desc: "A wider field of view.", color: "#8d9c9a", x: "82vw", y: "76vh" },
];

export function Scene3() {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, scale: .9, rotateX: 8 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 1.12, rotateX: -6 }}
      transition={{ duration: 1, ease: [0.16, 1, .3, 1] }}
      style={{ perspective: 1400 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_51%_50%,rgba(244,46,53,.12),transparent_31%),linear-gradient(124deg,#070908,#0e1310,#080908)]" />
      <motion.div className="absolute left-1/2 top-1/2 w-[37vw] h-[37vw] -translate-x-1/2 -translate-y-1/2 border border-[rgba(244,241,234,.12)] rounded-full" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute left-1/2 top-1/2 w-[25vw] h-[25vw] -translate-x-1/2 -translate-y-1/2 border border-dashed border-[rgba(244,46,53,.25)] rounded-full" animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} />
      <div className="absolute left-[8vw] top-[13vh]"><SignalTag>Neural routing / active</SignalTag></div>
      <motion.div initial={{ opacity: 0, y: "3vh" }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3, duration: .7 }} className="absolute left-[8vw] bottom-[12vh]">
        <div className="font-mono text-[.64vw] tracking-[.18em] text-[rgba(244,241,234,.42)]">THREE ENGINES / ONE CONVERSATION</div>
        <div className="mt-[1.5vh] text-[3.6vw] font-semibold tracking-[-.06em] leading-[.9]">Choose your<br /><span className="text-[var(--red)]">point of view.</span></div>
      </motion.div>
      <ProductWindow image="home" className="absolute left-[29vw] top-[20vh] w-[43vw] h-[55vh]" zoom={1.14} offsetX="-4%" />
      <div className="absolute inset-0">
        {engines.map((engine, i) => (
          <motion.div key={engine.name} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .75 + i * .18, duration: .55, ease: [0.16, 1, .3, 1] }} className="absolute" style={{ left: engine.x, top: engine.y }}>
            <div className="flex items-center gap-[.7vw]">
              <div className="w-[.7vw] h-[.7vw] rounded-full border" style={{ borderColor: engine.color }} />
              <div>
                <div className="font-mono text-[.74vw] tracking-[.18em]" style={{ color: engine.color }}>{engine.name}</div>
                <div className="mt-[.3vh] text-[.62vw] text-[rgba(244,241,234,.42)]">{engine.desc}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" viewBox="0 0 1600 900" preserveAspectRatio="none">
        <motion.path d="M 200 635 C 420 590, 420 395, 650 410 S 1170 265, 1320 155" fill="none" stroke="rgba(244,46,53,.55)" strokeWidth="1" strokeDasharray="5 9" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .4, duration: 1.8 }} />
        <motion.path d="M 1300 680 C 1190 640, 1130 540, 1060 530" fill="none" stroke="rgba(185,205,193,.32)" strokeWidth="1" strokeDasharray="4 10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .7, duration: 1.3 }} />
      </svg>
    </motion.div>
  );
}