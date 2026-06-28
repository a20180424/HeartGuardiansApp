import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Intro() {
  const nav = useNavigate();
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="scene" style={{ gap: 16 }}>
      <video
        ref={ref}
        src="/video/Intro_v2.mp4"
        autoPlay
        playsInline
        muted
        onEnded={() => nav("/auth")}
        style={{ width: "80vw", maxWidth: 1100, borderRadius: 16, background: "#000" }}
      />
      <button className="btn ghost" onClick={() => nav("/auth")}>
        건너뛰기 ⏭
      </button>
    </div>
  );
}
