import { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { World } from "../three/World";

export default function Planet3() {
  const nav = useNavigate();
  const [talk, setTalk] = useState<{ name: string; line: string } | null>(null);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b1020" }}>
      <Canvas camera={{ position: [0, 5, 11], fov: 50 }} style={{ position: "absolute", inset: 0 }}>
        <color attach="background" args={["#0b1020"]} />
        <Suspense fallback={null}>
          <World onTalk={(name, line) => setTalk({ name, line })} />
        </Suspense>
      </Canvas>

      <button
        className="btn ghost"
        style={{ position: "absolute", top: 28, right: 28 }}
        onClick={() => nav("/home")}
      >
        ← 홈
      </button>
      <div style={{ position: "absolute", top: 28, left: 28, color: "#fff", opacity: 0.8 }}>
        Planet 3 (3D) · NPC를 클릭해 대화 · 드래그로 회전
      </div>

      {talk && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 48,
            transform: "translateX(-50%)",
            background: "#fff",
            color: "#1f2937",
            padding: "22px 28px",
            borderRadius: 20,
            maxWidth: 600,
            boxShadow: "0 12px 40px rgba(0,0,0,.4)",
          }}
        >
          <div style={{ fontWeight: 800, color: "#7c3aed", marginBottom: 8 }}>{talk.name}</div>
          <div style={{ fontSize: 22 }}>{talk.line}</div>
          <button
            className="btn"
            style={{ marginTop: 16, padding: "10px 20px", fontSize: 18 }}
            onClick={() => setTalk(null)}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
