import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { skipSeekTarget } from "./outro.logic";
import FixedStage from "../../lib/FixedStage";
import "./Outro.css";

type Status = "playing" | "ended";

export default function Outro() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("playing");
  const [muted, setMuted] = useState(true);

  // 영상 탭: 소리 켜기 (+ 자동재생이 막혀 멈춰 있으면 재생도 시도)
  const handleTapToSound = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    v.muted = false;
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
    <div className="outro">
      <video
        ref={videoRef}
        className="outro__video"
        src="/video/Intro_v2.mp4"
        autoPlay
        playsInline
        muted={muted}
        onEnded={() => setStatus("ended")}
      />

      {status === "playing" && (
        <>
          <button
            type="button"
            className="outro__tap-layer"
            aria-label="탭하여 소리 켜기"
            onClick={handleTapToSound}
          />

          {muted && (
            <div className="outro__sound-hint" aria-hidden="true">
              <MuteIcon />
              <span>탭하여 소리 켜기</span>
            </div>
          )}

          <button type="button" className="btn ghost outro__skip" onClick={handleSkip}>
            <SkipIcon />
            건너뛰기
          </button>
        </>
      )}

      {status === "ended" && (
        <button type="button" className="btn outro__home" onClick={() => nav("/home")}>
          <HomeIcon />
          홈으로
        </button>
      )}
    </div>
    </FixedStage>
  );
}

function HomeIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3l9 8h-3v9h-4v-6h-4v6H6v-9H3z" />
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
