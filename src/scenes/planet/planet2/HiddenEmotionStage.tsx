import "./HiddenEmotionStage.css";

// ⚠️ 임시 스텁 — "숨은 감정 찾기" 미니게임의 팝업 셸만 갖춘 placeholder.
// mission2 EmpathyRadarStage 의 팝업 구조(오버레이 + 패널)를 본떴다.
// 실제 게임 로직·UI 는 .he-panel 안에 채워 넣고, 게임을 마치면 onDone() 을 호출하면 된다.
export default function HiddenEmotionStage({ onDone }: { onDone: () => void }) {
  return (
    // 오버레이 클릭이 #stage 로 전파돼 라인 노드처럼 넘어가지 않도록 stopPropagation.
    <div className="he-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="he-panel">
        <div className="he-title">숨은 감정 찾기</div>
        <div className="he-note">(임시) 여기에 미니게임이 들어갑니다.</div>
        <button type="button" className="he-done" onClick={onDone}>
          ▶ (임시) 미니게임 완료
        </button>
      </div>
    </div>
  );
}
