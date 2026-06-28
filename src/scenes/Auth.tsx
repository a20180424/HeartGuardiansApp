import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chooser from "./auth/Chooser";
import CredentialForm from "./auth/CredentialForm";
import { classifyVerifyError } from "./auth/auth.logic";
import { getSchools, verify, type School } from "../lib/auth";
import { getProgress } from "../lib/progress";
import { setSession } from "../lib/session";
import type { Credentials } from "../lib/api";
import "./Auth.css";
import bannerUrl from "../assets/auth/TitleBanner.png";

type Screen = "checking" | "welcome" | "chooser" | "login" | "signup";

export default function Auth() {
  const nav = useNavigate();
  const [screen, setScreen] = useState<Screen>("chooser");
  const [schools, setSchools] = useState<School[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 학교 목록은 로그인/회원가입 진입 시 필요 — 처음 한 번 불러온다.
  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  // 로그인 성공 공통 처리: 세션 채우고 Home으로.
  async function enter(creds: Credentials) {
    const profile = await verify(creds); // 성공 시 자격증명 저장(api 레이어)
    const { progress } = await getProgress();
    setSession({ profile, progress });
    nav("/home");
  }

  async function handleLogin(creds: Credentials) {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await enter(creds);
    } catch (err) {
      setErrorMsg(
        classifyVerifyError(err) === "auth"
          ? "번호나 비밀번호가 맞지 않아요. 선생님께 물어보세요."
          : "인터넷 연결을 확인해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <img className="auth__banner" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />
      <div className="auth__panel">
        {screen === "chooser" && (
          <Chooser onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} />
        )}
        {screen === "login" && (
          <CredentialForm
            mode="login"
            schools={schools}
            submitting={submitting}
            errorMsg={errorMsg}
            onSubmit={(creds) => handleLogin(creds)}
          />
        )}
        {screen === "signup" && <p className="auth-panel__title">회원가입 (다음 작업)</p>}
      </div>
    </div>
  );
}
