import "./HeartConnectStage.css";

// 미션3 "하트 커넥트 : 마지막 연결" 미니게임.
// 원본: mytemp/그림자 행성 미션3 게임/index.html 을 React로 이식.
// phase: story → quiz → video → epilogue → success (Task 4~8에서 구현).
export default function HeartConnectStage({ onDone }: { onDone: () => void }) {
  return (
    <div className="hc-root">
      <div className="hc-frame">
        {/* STUB: 배선 검증용. Task 4~8에서 phase 머신으로 교체. */}
        <button
          style={{ position: "absolute", left: 540, top: 380, padding: "16px 30px" }}
          onClick={onDone}
        >
          (임시) 우주선으로 이동
        </button>
      </div>
    </div>
  );
}
