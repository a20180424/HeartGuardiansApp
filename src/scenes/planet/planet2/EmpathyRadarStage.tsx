import "./EmpathyRadarStage.css";

// 미션2 "공감 레이더 만들기" 미니게임 — 팝업 셸(스텁).
// 실제 게임(감정 단어를 성격에 맞게 분류해 3단계 레이더 부품 조립)은 추후 구현.
// 아래는 병합 전 노드에 있던 단계별 내레이션 원문(팝업 내부 피드백으로 되살릴 예정):
//   1단계 완료: "정확해! 1단계 부품이 모두 완성되었어!"
//   2단계 시작: "이제 2단계 부품을 완성해서 검정 신호를 탐지해보자!"
//   2단계 힌트: "감정 단어를 잘 분류하면 부품이 하나씩 완성될거야!"
//   3단계 시작: "마지막 단계야! 남은 부품들을 완성해서 모든 감정을 제대로 탐지할 수 있는 완벽한 공감 레이더를 만들자"
//
// MissionPlayer 가 games["empathyRadar"] 로 렌더하고, 완료 시 onDone 으로 다음 노드 진행.
export default function EmpathyRadarStage({ onDone }: { onDone: () => void }) {
  return (
    <div className="er-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="er-panel">
        <div className="er-badge">공감 레이더 만들기</div>
        <div className="er-title">🛰️ 미니게임 준비 중</div>
        <div className="er-desc">
          감정 단어를 성격에 맞게 분류해 레이더 부품을 조립하는 게임이 여기에 들어갑니다.
        </div>
        <button className="er-done" onClick={onDone}>
          완료 (다음으로) ➡️
        </button>
      </div>
    </div>
  );
}
