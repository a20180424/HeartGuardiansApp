import { useEffect, useRef } from "react";
import { mountWorld } from "./world/mountWorld";
import "./EmpathyFuelGame.css";

// 행성3 미션2 미니게임 — 3D 겨울 숲에서 '따듯한 말'로 공감 송신기 연료 채우기.
// ThreeDimenstionWorld/src/world 의 stage1 을 이식(mountWorld). 통과 시 onDone().
export default function EmpathyFuelGame({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!ref.current) return;
    const dispose = mountWorld(ref.current, { onComplete: () => doneRef.current() });
    return dispose;
  }, []);

  return <div className="efg-overlay" ref={ref} onClick={(e) => e.stopPropagation()} />;
}
