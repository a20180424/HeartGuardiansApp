import { OrbitControls } from "@react-three/drei";
import { Npc } from "./Npc";

const NPCS = [
  {
    name: "초롱",
    color: "#f59e0b",
    line: "안녕! 이 행성에 온 걸 환영해.",
    pos: [-3.2, 0.75, 0] as [number, number, number],
  },
  {
    name: "바다",
    color: "#3b82f6",
    line: "여긴 마음의 바다가 흐르는 곳이야.",
    pos: [0, 0.75, 3.2] as [number, number, number],
  },
  {
    name: "숲이",
    color: "#22c55e",
    line: "친구의 마음을 잘 들어줘야 해.",
    pos: [3.2, 0.75, 0] as [number, number, number],
  },
  {
    name: "별이",
    color: "#a855f7",
    line: "준비됐어? 모험을 시작하자!",
    pos: [0, 0.75, -3.2] as [number, number, number],
  },
];

export function World(props: { onTalk: (name: string, line: string) => void }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#1f3a2e" />
      </mesh>

      {/* 3D 테스트 모델(azure_nexus.glb)은 제거됨 — 실제 에셋 확보 시 다시 추가 */}

      {NPCS.map((n) => (
        <Npc
          key={n.name}
          position={n.pos}
          color={n.color}
          name={n.name}
          line={n.line}
          onTalk={props.onTalk}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}
