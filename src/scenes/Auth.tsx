import { useState } from "react";
import Chooser from "./auth/Chooser";
import "./Auth.css";
import bannerUrl from "../assets/auth/TitleBanner.png";

type Screen = "checking" | "welcome" | "chooser" | "login" | "signup";

export default function Auth() {
  const [screen, setScreen] = useState<Screen>("chooser");

  return (
    <div className="auth">
      <img className="auth__banner" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />
      <div className="auth__panel">
        {screen === "chooser" && (
          <Chooser onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} />
        )}
        {screen === "login" && <p className="auth-panel__title">로그인 (다음 작업)</p>}
        {screen === "signup" && <p className="auth-panel__title">회원가입 (다음 작업)</p>}
      </div>
    </div>
  );
}
