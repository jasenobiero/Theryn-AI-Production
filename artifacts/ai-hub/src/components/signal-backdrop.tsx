import { motion } from "framer-motion";

export function SignalBackdrop({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`signal-backdrop ${compact ? "signal-backdrop-compact" : ""}`} aria-hidden="true">
      <div className="signal-grid" />
      <motion.div
        className="signal-orb signal-orb-cyan"
        animate={{ x: [0, 42, -18, 0], y: [0, -24, 18, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="signal-orb signal-orb-coral"
        animate={{ x: [0, -34, 12, 0], y: [0, 26, -14, 0], scale: [1, 0.94, 1.06, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="signal-orbit signal-orbit-one"
        animate={{ rotate: 360 }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="signal-orbit signal-orbit-two"
        animate={{ rotate: -360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
      <div className="signal-scanline" />
      <div className="signal-grain" />
    </div>
  );
}