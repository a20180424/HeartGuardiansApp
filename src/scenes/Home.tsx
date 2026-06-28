import { useNavigate } from "react-router-dom";

const PLANETS = [
  { id: 1, name: "Planet 1", kind: "2D", emoji: "🪐", color: "#7c3aed" },
  { id: 2, name: "Planet 2", kind: "2D", emoji: "🌍", color: "#2563eb" },
  { id: 3, name: "Planet 3", kind: "3D", emoji: "🛰️", color: "#16a34a" },
  { id: 4, name: "Planet 4", kind: "2D", emoji: "☄️", color: "#e11d48" },
];

export default function Home() {
  const nav = useNavigate();
  return (
    <div className="scene">
      <h1>행성 선택</h1>
      <p>다음 행성으로 모험을 떠나자!</p>
      <div className="planet-grid">
        {PLANETS.map((p) => (
          <button key={p.id} className="planet-card" style={{ background: p.color }}
            onClick={() => nav(`/planet/${p.id}`)}>
            <span className="emoji">{p.emoji}</span>
            <span>{p.name}</span>
            <span style={{ opacity: .8, fontSize: 16 }}>{p.kind}</span>
          </button>
        ))}
      </div>
      <button className="btn ghost" onClick={() => nav("/outro")}>아웃트로 보기 →</button>
    </div>
  );
}
