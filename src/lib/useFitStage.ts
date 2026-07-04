import { useLayoutEffect } from "react";

/**
 * 고정 크기 무대를 화면에 맞춰 균등 축소(letterbox). game/src/main.js fitStage 이식.
 * 설계 캔버스 크기를 인자로 받는다. 기본값 1920×1200 = 미션 엔진(player/) 좌표계.
 * player/ 바깥 씬은 1280×800(CLAUDE.md 표준)으로 호출한다.
 */
export function useFitStage(
  stageRef: React.RefObject<HTMLElement | null>,
  designW = 1920,
  designH = 1200,
) {
  // useLayoutEffect: 첫 페인트 전에 scale을 적용해 스케일 안 된 무대가 한 프레임 튀는 걸 막는다.
  useLayoutEffect(() => {
    const fit = () => {
      const el = stageRef.current;
      if (!el) return;
      const s = Math.min(window.innerWidth / designW, window.innerHeight / designH);
      el.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [stageRef, designW, designH]);
}
