import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { SceneTransitionProvider } from "./lib/sceneTransition";
import Intro from "./scenes/intro";
import Auth from "./scenes/auth";
import Home from "./scenes/home";
import Planet1 from "./scenes/planet/planet1";
import Planet2 from "./scenes/planet/planet2";
import Planet3 from "./scenes/planet/planet3";
import Planet4 from "./scenes/planet/planet4";
import Outro from "./scenes/outro";

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

  return (
    <SceneTransitionProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/planet/1" element={<Planet1 />} />
        <Route path="/planet/2" element={<Planet2 />} />
        <Route path="/planet/3" element={<Planet3 />} />
        <Route path="/planet/4" element={<Planet4 />} />
        <Route path="/outro" element={<Outro />} />
      </Routes>
    </SceneTransitionProvider>
  );
}
