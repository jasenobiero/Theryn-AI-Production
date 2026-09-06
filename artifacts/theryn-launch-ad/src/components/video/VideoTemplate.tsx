import { AnimatePresence, motion } from "framer-motion";
import { useVideoPlayer } from "@/lib/video";
import { InterfaceRail } from "./ProductWindow";
import { Scene1 } from "./video_scenes/Scene1";
import { Scene2 } from "./video_scenes/Scene2";
import { Scene3 } from "./video_scenes/Scene3";
import { Scene4 } from "./video_scenes/Scene4";
import { Scene5 } from "./video_scenes/Scene5";
import { Scene6 } from "./video_scenes/Scene6";
import { Scene7 } from "./video_scenes/Scene7";
import { Scene8 } from "./video_scenes/Scene8";

const SCENE_DURATIONS = {
  ignition: 5500,
  surface: 6500,
  engines: 7500,
  creative: 7500,
  agents: 7000,
  trust: 6500,
  reveal: 7000,
  close: 6500,
};

const sceneNames = Object.keys(SCENE_DURATIONS);

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <main className="video-shell" aria-label="THERYN launch film">
      <div className="absolute inset-0 bg-[#070908]" />
      <motion.div
        className="absolute inset-0 opacity-65"
        animate={{
          background: [
            "radial-gradient(circle at 12% 40%, rgba(244,46,53,.11), transparent 30%), radial-gradient(circle at 88% 80%, rgba(129,155,143,.06), transparent 26%)",
            "radial-gradient(circle at 80% 18%, rgba(244,46,53,.13), transparent 32%), radial-gradient(circle at 18% 80%, rgba(129,155,143,.08), transparent 30%)",
            "radial-gradient(circle at 50% 74%, rgba(244,46,53,.12), transparent 34%), radial-gradient(circle at 40% 10%, rgba(129,155,143,.06), transparent 28%)",
          ],
        }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[.12]"
        style={{
          backgroundImage: "linear-gradient(rgba(244,241,234,.23) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,234,.23) 1px, transparent 1px)",
          backgroundSize: "4.2vw 4.2vw",
          maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
        }}
      />
      <motion.div
        className="absolute w-[26vw] h-[26vw] rounded-full bg-[rgba(244,46,53,.12)] blur-[6vw]"
        animate={{
          x: ["-8vw", "74vw", "40vw", "-8vw"],
          y: ["45vh", "4vh", "70vh", "45vh"],
          scale: [1, 1.15, .8, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 bottom-0 w-[18vw] h-[18vw] rounded-full bg-[rgba(129,155,143,.08)] blur-[5vw]"
        animate={{ x: ["0vw", "-16vw", "4vw"], y: ["0vh", "-12vh", "0vh"] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute top-[3.1vh] left-[3.1vw] right-[3.1vw] flex items-center justify-between z-30 pointer-events-none">
        <div className="flex items-center gap-[1.1vw]">
          <div className="red-dot" />
          <span className="font-mono text-[.58vw] tracking-[.22em] text-[rgba(244,241,234,.36)]">THERYN / LAUNCH FILM</span>
        </div>
        <span className="font-mono text-[.58vw] tracking-[.2em] text-[rgba(244,241,234,.3)]">{String(currentScene + 1).padStart(2, "0")} — 08</span>
      </div>
      <div className="corner-mark tl z-30" />
      <div className="corner-mark br z-30" />
      <InterfaceRail />
      <motion.div
        className="absolute right-[3.1vw] top-[44vh] z-30 font-mono text-[.54vw] tracking-[.28em] text-[rgba(244,241,234,.32)] [writing-mode:vertical-rl]"
        animate={{ opacity: [.25, .6, .25] }}
        transition={{ duration: 3.4, repeat: Infinity }}
      >
        SIGNAL / {sceneNames[currentScene].toUpperCase()}
      </motion.div>

      <AnimatePresence mode="sync" initial={false}>
        {currentScene === 0 && <Scene1 key="ignition" />}
        {currentScene === 1 && <Scene2 key="surface" />}
        {currentScene === 2 && <Scene3 key="engines" />}
        {currentScene === 3 && <Scene4 key="creative" />}
        {currentScene === 4 && <Scene5 key="agents" />}
        {currentScene === 5 && <Scene6 key="trust" />}
        {currentScene === 6 && <Scene7 key="reveal" />}
        {currentScene === 7 && <Scene8 key="close" />}
      </AnimatePresence>

      <div className="grain" />
      <div className="scanline" />
      <div className="absolute bottom-[3.1vh] left-[3.1vw] z-30 font-mono text-[.54vw] tracking-[.18em] text-[rgba(244,241,234,.25)] pointer-events-none">© 2025 THERYN SYSTEMS</div>
    </main>
  );
}