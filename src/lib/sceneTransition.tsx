import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// 라우트(씬) 전환용 전역 페이드-투-블랙.
//
// SPA라 씬 교체가 즉각적이라 깜빡이는데, planet 내부 subscene의 goTo와 같은 결로
// 검은 오버레이를 씌워 부드럽게 전환한다. 오버레이는 <Routes> 바깥(App 레벨)에
// 살아야 라우트가 교체돼도 유지되므로, 상태·오버레이를 Provider가 소유한다.
//
// 사용: const fadeNav = useFadeNav();  fadeNav("/home");
// (planet 내부 subscene 전환은 각 planet의 goTo를 그대로 쓴다.)

const FADE_MS = 160; // 페이드 지속시간(planet goTo와 동일)
const HOLD_MS = 60; // 새 씬이 한 프레임 그려질 시간(마운트 깜빡임 가림)

type FadeNav = (to: string) => void;

const SceneTransitionContext = createContext<FadeNav | null>(null);

export function SceneTransitionProvider({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const [fading, setFading] = useState(false);
  const busy = useRef(false); // 전환 중 중복 호출 방지

  const fadeNav = useCallback<FadeNav>(
    (to) => {
      if (busy.current) return;
      busy.current = true;
      setFading(true); // 0 → 1 (fade to black)
      window.setTimeout(() => {
        nav(to); // 검은 화면 뒤에서 라우트 교체
        window.setTimeout(() => {
          setFading(false); // 1 → 0 (fade in)
          busy.current = false;
        }, HOLD_MS);
      }, FADE_MS);
    },
    [nav],
  );

  return (
    <SceneTransitionContext.Provider value={fadeNav}>
      {children}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000, // planet-fade(9999)보다 위
          background: "#000",
          opacity: fading ? 1 : 0,
          pointerEvents: fading ? "auto" : "none", // 전환 중 입력 차단
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
    </SceneTransitionContext.Provider>
  );
}

export function useFadeNav(): FadeNav {
  const fadeNav = useContext(SceneTransitionContext);
  if (!fadeNav) {
    throw new Error("useFadeNav must be used within <SceneTransitionProvider>");
  }
  return fadeNav;
}
