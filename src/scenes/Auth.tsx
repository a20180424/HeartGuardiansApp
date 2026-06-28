import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chooser from "./auth/Chooser";
import CredentialForm from "./auth/CredentialForm";
import WelcomePanel from "./auth/WelcomePanel";
import { classifyVerifyError } from "./auth/auth.logic";
import { getSchools, verify, logout, signup, type School } from "../lib/auth";
import { getProgress } from "../lib/progress";
import { setSession, clearSession } from "../lib/session";
import { credentialStore } from "../lib/api";
import type { Credentials } from "../lib/api";
import "./Auth.css";
import bannerUrl from "../assets/auth/TitleBanner.png";

type Screen = "checking" | "welcome" | "chooser" | "login" | "signup";

export default function Auth() {
  const nav = useNavigate();
  const [screen, setScreen] = useState<Screen>(() =>
    credentialStore.get() ? "checking" : "chooser",
  );
  const [welcomeName, setWelcomeName] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 학교 목록은 로그인/회원가입 진입 시 필요 — 처음 한 번 불러온다.
  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  // 저장된 자격증명이 있으면 자동 점검. 성공→welcome, 자격증명 문제→삭제 후 chooser,
  // 통신 문제→자격증명 유지하고 chooser(나중에 다시 시도 가능).
  useEffect(() => {
    if (screen !== "checking") return;
    const creds = credentialStore.get();
    if (!creds) {
      setScreen("chooser");
      return;
    }
    let alive = true;
    verify(creds)
      .then((profile) => {
        if (!alive) return;
        setWelcomeName(profile.name);
        setScreen("welcome");
      })
      .catch((err) => {
        if (!alive) return;
        if (classifyVerifyError(err) === "auth") logout(); // 잘못된 자격증명 삭제
        setScreen("chooser");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 성공 공통 처리: 세션 채우고 Home으로.
  async function enter(creds: Credentials) {
    const profile = await verify(creds); // 성공 시 자격증명 저장(api 레이어)
    const { progress } = await getProgress();
    setSession({ profile, progress });
    nav("/home");
  }

  async function handleContinue() {
    const creds = credentialStore.get();
    if (!creds) return setScreen("chooser");
    setSubmitting(true);
    try {
      await enter(creds);
    } catch {
      setSubmitting(false);
      setErrorMsg("인터넷 연결을 확인해 주세요.");
      setScreen("login");
    }
  }

  function handleSwitch() {
    logout();
    clearSession();
    setScreen("login");
  }

  async function handleSignup(creds: Credentials, name: string) {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await signup({ ...creds, name }); // 가입
      await enter(creds); // 같은 값으로 자동 로그인
    } catch (err) {
      setErrorMsg(
        classifyVerifyError(err) === "auth"
          ? "이미 등록된 번호이거나 입력이 올바르지 않아요. 선생님께 물어보세요."
          : "인터넷 연결을 확인해 주세요.",
      );
      setSubmitting(false);
    }
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
        {screen === "checking" && <p className="auth-panel__title">잠시만요…</p>}
        {screen === "welcome" && (
          <WelcomePanel
            name={welcomeName}
            busy={submitting}
            onContinue={handleContinue}
            onSwitch={handleSwitch}
          />
        )}
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
            onBack={() => { setErrorMsg(null); setScreen("chooser"); }}
          />
        )}
        {screen === "signup" && (
          <CredentialForm
            mode="signup"
            schools={schools}
            submitting={submitting}
            errorMsg={errorMsg}
            onSubmit={handleSignup}
            onBack={() => { setErrorMsg(null); setScreen("chooser"); }}
          />
        )}
      </div>
    </div>
  );
}
