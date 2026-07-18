import { useRef, useState } from "react";
import { useFadeNav } from "../../lib/sceneTransition";
import { skipSeekTarget } from "./intro.logic";
import FixedStage from "../../lib/FixedStage";
import { useMuted } from "../../lib/audio";
import "./Intro.css";

type Status = "playing" | "ended";

export default function Intro() {
  const nav = useFadeNav();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("playing");
  const [muted, setMuted] = useState(true);
  // 첫 프레임 디코드 전까지 WebView 기본 회색 플레이스홀더가 보이는 걸 막는다.
  // 준비되면 검은 배경 위로 페이드 인.
  const [ready, setReady] = useState(false);
  // 앱 전역 음소거(🔇)도 영상에 반영한다 — 교사가 🔇를 눌렀는데 영상만 크게
  // 나면 안 된다. 로컬 muted(자동재생 정책용)와 앱 음소거 중 하나라도 켜져
  // 있으면 실제로 무음이어야 한다.
  const appMuted = useMuted();
  const effectiveMuted = muted || appMuted;

  // 영상 탭: 소리 켜기 (+ 자동재생이 막혀 멈춰 있으면 재생도 시도)
  //
  // muted 를 DOM 에 직접 쓰는 이유: WebView 자동재생 정책 때문에 제스처 핸들러
  // 안에서 바로 풀어야 소리가 붙는다(setMuted 는 리렌더 뒤에나 반영된다).
  // 다만 그 값은 반드시 effectiveMuted 와 같아야 한다 — false 를 박아버리면
  // 앱이 이미 음소거일 때 React 가 muted prop 을 다시 쓰지 않아(값이 안 바뀌므로)
  // 이 명령형 쓰기가 그대로 남아 교사의 🔇를 이긴다.
  const handleTapToSound = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    v.muted = appMuted; // 앱이 음소거면 탭해도 무음 유지
    setMuted(false);
  };

  // 건너뛰기: 마지막 프레임 근처로 보내 정지 → ended
  const handleSkip = () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = skipSeekTarget(v.duration);
      v.pause();
    }
    setStatus("ended");
  };

  return (
    <FixedStage>
    <div className="intro">
      <video
        ref={videoRef}
        className={"intro__video" + (ready ? " is-ready" : "")}
        src="/video/Opening_final.mp4"
        autoPlay
        playsInline
        muted={effectiveMuted}
        onLoadedData={() => setReady(true)}
        onPlaying={() => setReady(true)}
        onEnded={() => setStatus("ended")}
      />

      {status === "playing" && (
        <>
          <button
            type="button"
            className="intro__tap-layer"
            data-sfx="none" /* 영상 전체를 덮는 탭 레이어 — 탭할 때마다 tap이 울리면 영화 위에 계속 비프음이 겹친다 */
            aria-label="탭하여 소리 켜기"
            onClick={handleTapToSound}
          />

          {muted && (
            <div className="intro__sound-hint" aria-hidden="true">
              <MuteIcon />
              <span>탭하여 소리 켜기</span>
            </div>
          )}

          <button type="button" className="btn ghost intro__skip" onClick={handleSkip}>
            <SkipIcon />
            건너뛰기
          </button>
        </>
      )}

      {status === "ended" && (
        <button
          type="button"
          className="btn intro__start"
          onClick={() => nav("/auth")}
        >
          <PlayIcon />
          시작하기
        </button>
      )}
    </div>
    </FixedStage>
  );
}

function PlayIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 5l9 7-9 7zM12 5l7 7-7 7zM19 5h2v14h-2z" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      <path
        d="M16 9l5 6M21 9l-5 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
