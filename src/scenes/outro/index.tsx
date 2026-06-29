import { useNavigate } from "react-router-dom";

export default function Outro() {
  const nav = useNavigate();
  return (
    <div className="scene">
      <h1>모험 끝!</h1>
      <div className="video-placeholder">🎬 아웃트로 영상 (자리표시자)</div>
      <button className="btn" onClick={() => nav("/home")}>
        홈으로
      </button>
    </div>
  );
}
