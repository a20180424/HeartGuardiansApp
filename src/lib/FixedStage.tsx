import { useRef } from "react";
import { useFitStage } from "./useFitStage";
import "./fixed-stage.css";

// 고정 크기 설계 캔버스를 화면 중앙에 letterbox로 배치하는 무대.
// 어떤 브라우저·비율에서도 내부는 항상 width×height(기본 1280×800) 좌표계로 보인다.
// 무대에 transform이 걸리므로 자식의 position:fixed 는 뷰포트가 아니라 이 무대 기준이 된다.
// (미션 엔진 player/ 는 자체 #stage(1920×1200)를 쓰므로 이 컴포넌트로 감싸지 않는다.)
export default function FixedStage({
  width = 1280,
  height = 800,
  children,
}: {
  width?: number;
  height?: number;
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  useFitStage(stageRef, width, height);
  return (
    <div className="fixed-stage-viewport">
      <div className="fixed-stage" ref={stageRef} style={{ width, height }}>
        {children}
      </div>
    </div>
  );
}
