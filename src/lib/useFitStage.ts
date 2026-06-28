import { useEffect } from "react";

/** 1920x1200 고정 무대를 화면에 맞춰 균등 축소(letterbox). game/src/main.js fitStage 이식. */
export function useFitStage(stageRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const fit = () => {
      const el = stageRef.current;
      if (!el) return;
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1200);
      el.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [stageRef]);
}
