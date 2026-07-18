import { Fragment, useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { SceneTransitionProvider } from "./lib/sceneTransition";
import { BgmProvider } from "./lib/bgm";
import { audio } from "./lib/audio";
import { sfxNameFor } from "./lib/uiSfx";
import HiddenMenu from "./lib/HiddenMenuOverlay";
import MuteButton from "./lib/MuteButton";
import Intro from "./scenes/intro";
import Auth from "./scenes/auth";
import Home from "./scenes/home";
import Planet1 from "./scenes/planet/planet1";
import Planet2 from "./scenes/planet/planet2";
import Planet3 from "./scenes/planet/planet3";
import Planet4 from "./scenes/planet/planet4";

// 각 행성은 useState(initialStage)로 마운트 때 딱 한 번 점프 파라미터를 읽으므로,
// 점프하려면 리마운트가 필요하다. key 하나만으로는 두 진입 경로 중 하나가 새는데,
// 둘 다 실측으로 확인했다:
//
//  · 히든 메뉴로 같은 칸 재점프 — 씬은 미션 진행(goTo)을 URL이 아닌 내부 상태로만
//    반영해서 URL이 ?m=1 인 채 화면만 미션2일 수 있다. 이때 search 는 안 바뀌므로
//    search 만으로는 리마운트가 안 된다. location.key 는 navigate()가 같은 URL에도
//    매번 새로 발급하므로 이 경우를 잡는다.
//  · 주소창에서 해시 편집(#/planet/1?m=1 → ?m=3&end=1) — popstate 로 들어와
//    history state 가 없어 location.key 가 "default" 로 고정된다. key 만으로는
//    리마운트가 안 돼 이전 미션의 엔딩으로 가버렸다(m3_end 대신 m1_end3).
//    search 가 이 경우를 잡는다.
//
// 정상 플레이에는 영향이 없다: 행성 씬 안에서는 자기 자신으로 이동하는 경로가
// 없어(planet/* 은 nav("/home") 만 호출) 미션 내내 key·search 가 둘 다 고정된다.
// Home → /planet/N 은 라우트 자체가 바뀌는 최초 마운트라 Keyed 와 무관하다.
//
// 남는 틈(개발 전용, 방치): 주소창에서 같은 search 로 두 번 편집하면 key 가
// "default" 로 고정된 채 search 도 같아 리마운트가 안 된다. APK 엔 주소창이
// 없고 메뉴 경로는 key 가 잡으므로 실사용에 닿지 않는다.
function Keyed({ children }: { children: ReactNode }) {
  const { key, search } = useLocation();
  return <Fragment key={`${key}|${search}`}>{children}</Fragment>;
}

export default function App() {
  // 하드웨어/제스처 뒤로가기를 의도적으로 무시한다.
  // 이 앱은 immersive 전체화면 키오스크형 온-레일 콘텐츠라 화면 내 버튼으로만
  // 이동하며, 하드웨어 뒤로가기의 기본 동작(히스토리 뒤로·앱 종료)은
  // 미션 중 이탈이나 실수로 인한 종료를 유발하므로 삼킨다.
  // (리스너를 등록해두는 것만으로 Capacitor 기본 뒤로가기 동작이 차단된다.
  //  앱을 나가려면 안드로이드 홈 버튼을 쓰면 된다. 웹 환경에서는 no-op.)
  useEffect(() => {
    const handle = CapApp.addListener("backButton", () => {
      /* 의도적으로 무시 */
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  // 전역 오디오 훅 하나가 두 가지를 한다:
  //  1) 첫 제스처에서 unlock (브라우저 자동재생 정책)
  //  2) 버튼 효과음 — data-sfx 속성으로 선언(uiSfx.ts 참조)
  // 캡처 단계로 듣되 아무것도 삼키지 않는다(히든 메뉴 제스처와 같은 방식).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      audio.unlock(); // play() 보다 먼저 — 첫 탭부터 소리가 나야 한다

      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.("button");
      if (!btn) return;
      // 미션 UI(#stage)는 자체 사운드가 이미 배치돼 있다 — 겹치면 안 된다.
      if (btn.closest("#stage")) return;
      if ((btn as HTMLButtonElement).disabled) return;

      const name = sfxNameFor(btn.dataset.sfx);
      if (name) audio.play(name);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  return (
    <SceneTransitionProvider>
      <BgmProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/intro" replace />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Home />} />
          <Route
            path="/planet/1"
            element={
              <Keyed>
                <Planet1 />
              </Keyed>
            }
          />
          <Route
            path="/planet/2"
            element={
              <Keyed>
                <Planet2 />
              </Keyed>
            }
          />
          <Route
            path="/planet/3"
            element={
              <Keyed>
                <Planet3 />
              </Keyed>
            }
          />
          <Route
            path="/planet/4"
            element={
              <Keyed>
                <Planet4 />
              </Keyed>
            }
          />
        </Routes>
        {/* 교사용 히든 점프 메뉴. Routes 바깥 = 어느 씬에서도 뜬다.
            SceneTransitionProvider 안이라 useFadeNav를 쓸 수 있다. */}
        <HiddenMenu />
        {/* 전역 음소거. Routes 바깥 = 어느 씬에서도 누를 수 있다(미션 포함). */}
        <MuteButton />
      </BgmProvider>
    </SceneTransitionProvider>
  );
}
