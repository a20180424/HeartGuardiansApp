import { useState } from "react";
import {
  SITUATIONS,
  EMOTIONS,
  COPING_ACTIONS,
  type EmotionGuideResult,
} from "./emotionGuide.data";
import {
  initialState,
  pickEmotion,
  pickAction,
  canAdvance,
  advance,
  TOTAL_STEPS,
  type GameState,
} from "./emotionGuide.logic";
import "./EmotionGuideStage.css";

export default function EmotionGuideStage(props: {
  onFinish: (results: EmotionGuideResult[]) => void;
}) {
  const [state, setState] = useState<GameState>(initialState);

  const situation = SITUATIONS[state.step - 1];
  const coping = state.emotion ? COPING_ACTIONS[state.emotion] : null;
  const feedback =
    coping && state.action != null ? coping.feedbacks[state.action] : "";

  // 공감 에너지: 완료한 문항 수 비례(원본과 동일 의미).
  const completed = state.step - 1;
  const energyPct = (completed / TOTAL_STEPS) * 100;

  const onNext = () => {
    if (!canAdvance(state)) return;
    const r = advance(state);
    if (r.kind === "done") props.onFinish(r.results);
    else setState(r.state);
  };

  return (
    <div className="eg-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="eg-panel">
        {/* 네 귀퉁이 황금 경첩 + 좌측 책등 */}
        <span className="eg-hinge tl" />
        <span className="eg-hinge tr" />
        <span className="eg-hinge bl" />
        <span className="eg-hinge br" />
        <span className="eg-spine" />

        {/* 상단 HUD: 붉은 리본 책갈피 + 공감 에너지 바 (이름 칩 제거) */}
        <div className="eg-hud">
          <div className="eg-ribbon">
            <span className="eg-ribbon-label">감정 알기</span>
            <span className="eg-ribbon-count">
              {state.step} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="eg-energy">
            <div className="eg-energy-head">
              <span className="eg-energy-label">공감 에너지</span>
              <span className="eg-energy-text">{energyPct}%</span>
            </div>
            <div className="eg-energy-track">
              <div className="eg-energy-fill" style={{ width: `${energyPct}%` }} />
            </div>
          </div>
        </div>

        {/* 펼친 책 본문 (양면) */}
        <div className="eg-body">
          {/* 왼쪽 페이지: 상황 일지 + 감정 8지선다 */}
          <div className="eg-page eg-page--left">
            <div className="eg-page-index">
              <span className="eg-tag">감정 상황 {state.step}</span>
              <span className="eg-pagenum">P. {state.step * 2 - 1}</span>
            </div>

            <div className="eg-journal">
              <span className="eg-journal-deco">🌫️</span>
              <div className="eg-journal-head">🧭 가디언즈 감정 상황 일지</div>
              <div className="eg-title">{situation.title}</div>
              <div className="eg-desc">{situation.desc}</div>
            </div>

            <div className="eg-emo-section">
              <div className="eg-section-label">◆ 이 상황에서 느끼는 내 기분</div>
              <div className="eg-grid">
                {EMOTIONS.map((e) => (
                  <button
                    key={e.id}
                    className={`eg-emo eg-emo--${e.id}${state.emotion === e.id ? " sel" : ""}`}
                    onClick={() => setState((s) => pickEmotion(s, e.id))}
                  >
                    <span className="em">{e.emoji}</span>
                    <span>{e.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽 페이지: 감정 선택 후 해소 & 공감 행동 6지선다 + 피드백 */}
          <div className="eg-page eg-page--right">
            <div className="eg-page-index">
              <span className="eg-tag eg-tag--right">🛡️ 해소 &amp; 공감</span>
              <span className="eg-pagenum">P. {state.step * 2}</span>
            </div>

            {!coping ? (
              <div className="eg-locked">
                <div className="eg-lock-icon">🔒</div>
                <div className="eg-lock-title">해소 &amp; 공감 행동소 대기 중</div>
                <div className="eg-lock-sub">
                  왼쪽 페이지에서 먼저 느껴지는 감정을 하나 선택하면 잠금이 해제됩니다.
                </div>
              </div>
            ) : (
              <div className="eg-right-scroll">
                {feedback && (
                  <div className="eg-feedback">
                    <span className="eg-feedback-icon">💡</span>
                    <div>
                      <div className="eg-feedback-title">마음 연구 선배의 공감 지혜</div>
                      <div className="eg-feedback-desc">{feedback}</div>
                    </div>
                  </div>
                )}
                <div className="eg-section-label">
                  ◆ 나에게 가장 잘 맞을 것 같은 해결책
                </div>
                <div className="eg-actions">
                  {coping.actions.map((a) => (
                    <button
                      key={a.id}
                      className={`eg-act${state.action === a.id ? " sel" : ""}`}
                      onClick={() => setState((s) => pickAction(s, a.id))}
                    >
                      <span className="eg-act-emoji">{a.emoji}</span>
                      <span className="eg-act-text">{a.text}</span>
                      <span className={`eg-badge ${a.id <= 3 ? "self" : "wish"}`}>
                        {a.id <= 3 ? "스스로 해소" : "바라는 공감"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button className="eg-next" disabled={!canAdvance(state)} onClick={onNext}>
          {state.step >= TOTAL_STEPS ? "설명서 완성하기 ✨" : "행동 기록 완료 · 다음 상황으로 ➡️"}
        </button>
      </div>
    </div>
  );
}
