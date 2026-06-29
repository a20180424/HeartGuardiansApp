import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";

export function Npc(props: {
  position: [number, number, number];
  color: string;
  name: string;
  line: string;
  onTalk: (name: string, line: string) => void;
}) {
  const ref = useRef<Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.6;
  });

  return (
    <group position={props.position}>
      <mesh
        ref={ref}
        scale={hover ? 1.15 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          props.onTalk(props.name, props.line);
        }}
      >
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
        <meshStandardMaterial color={props.color} />
      </mesh>
      <Html position={[0, 1.6, 0]} center distanceFactor={10}>
        <div
          style={{
            background: "#000a",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          {props.name}
        </div>
      </Html>
    </group>
  );
}
