import "./PlaceholderGameStage.css";

// 행성3 미션 미니게임 자리 임시 placeholder.
// 행성2에서 가져온 흐름을 유지하되 실제 미니게임은 아직 없으므로,
// planet2 미니게임 팝업(.eg-panel: 황금 테두리·경첩·책등 양장본 창)을 참고한
// "팝업 창 + 다음 버튼"만 렌더한다. onDone 을 호출하면 다음 노드로 진행한다.
// 실제 미션 개발 시 이 컴포넌트를 각 게임 스테이지로 교체하면 된다.
export default function PlaceholderGameStage({
  onDone,
  label = "미니게임 자리 (임시)",
}: {
  onDone: () => void;
  label?: string;
}) {
  return (
    <div className="pgs-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="pgs-panel">
        <div className="pgs-title">{label}</div>
        <p className="pgs-sub">여기에 미니게임이 들어갈 예정입니다.</p>
        <button type="button" className="pgs-next" onClick={onDone}>
          다음
        </button>
      </div>
    </div>
  );
}
