import { useNavigate } from "react-router-dom";

export default function Auth() {
  const nav = useNavigate();
  return (
    <div className="scene">
      <h1>로그인</h1>
      <input placeholder="아이디" style={{ padding: 14, fontSize: 18, borderRadius: 10, border: "none", width: 280 }} />
      <input placeholder="비밀번호" type="password" style={{ padding: 14, fontSize: 18, borderRadius: 10, border: "none", width: 280 }} />
      <div style={{ display: "flex", gap: 16 }}>
        <button className="btn" onClick={() => nav("/home")}>로그인</button>
        <button className="btn ghost" onClick={() => nav("/home")}>회원가입</button>
      </div>
      <p>* 서버 통신은 목(mock) — 버튼 누르면 Home으로 이동</p>
    </div>
  );
}
