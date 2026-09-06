import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    __replitVideoPlayerMounted?: boolean;
    __replitVideoTotalDurationMs?: number;
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const keys = useRef(Object.keys(durations));
  const [currentScene, setCurrentScene] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.__replitVideoPlayerMounted = true;
    window.__replitVideoTotalDurationMs = Object.values(durations).reduce(
      (total, duration) => total + duration,
      0,
    );
    window.startRecording?.();
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;
    const advance = () => {
      timer = setTimeout(() => {
        index = (index + 1) % keys.current.length;
        setCurrentScene(index);
        if (index === 0) window.stopRecording?.();
        advance();
      }, durations[keys.current[index]]);
    };
    advance();
    return () => {
      clearTimeout(timer);
      window.__replitVideoPlayerMounted = false;
    };
  }, [durations]);

  return { currentScene };
}