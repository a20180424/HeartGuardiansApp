import { useEffect, useRef } from "react";
import { mountWorld } from "./world/mountWorld";
import "./EmpathyFuelGame.css";

// 행성3 미션2 미니게임 — 3D 겨울 숲에서 '따듯한 말'로 공감 송신기 연료 채우기.
// ThreeDimenstionWorld/src/world 의 stage1 을 이식(mountWorld). 이 월드는 stage1(미션2)
// 통과 후 끝나지 않고 stage2(미션3)로 이어진다: stage2 진입 시 onStage2Enter(행성3
// 스테퍼를 미션3으로), 전부 끝나면 onDone(→ p3_m2_end)을 호출한다. (행성3 전용 흐름)
export default function EmpathyFuelGame({
  onDone,
  onStage2Enter,
  devStartStage,
}: {
  onDone: () => void;
  onStage2Enter: () => void;
  devStartStage?: 1 | 2; // DEV: 이 스테이지로 바로 시작(?m=2&stage2=1 → 2)
}) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const stage2Ref = useRef(onStage2Enter);
  stage2Ref.current = onStage2Enter;

  useEffect(() => {
    if (!ref.current) return;
    const dispose = mountWorld(ref.current, {
      onStage2Enter: () => stage2Ref.current(),
      onComplete: () => doneRef.current(),
      startStage: devStartStage,
    });
    return dispose;
    // devStartStage는 마운트 시 1회만 반영(월드 재생성 방지 위해 deps 비움).
  }, []);

  return <div className="efg-overlay" ref={ref} onClick={(e) => e.stopPropagation()} />;
}
