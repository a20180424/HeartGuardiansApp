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

  const onNext = () => {
    if (!canAdvance(state)) return;
    const r = advance(state);
    if (r.kind === "done") props.onFinish(r.results);
    else setState(r.state);
  };

  return (
    <div className="eg-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="eg-panel">
        <div className="eg-hud">
          가디언즈 감정 설명서 · {state.step} / {TOTAL_STEPS}
        </div>

        <div className="eg-body">
        {/* 왼쪽: 상황 + 감정 8지선다 */}
        <div className="eg-col">
          <div className="eg-title">🧭 {situation.title}</div>
          <div className="eg-desc">{situation.desc}</div>
          <div className="eg-grid">
            {EMOTIONS.map((e) => (
              <button
                key={e.id}
                className={`eg-emo${state.emotion === e.id ? " sel" : ""}`}
                onClick={() => setState((s) => pickEmotion(s, e.id))}
              >
                <span className="em">{e.emoji}</span>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 감정 선택 후 행동 6지선다 + 피드백 */}
        <div className="eg-col">
          {!coping ? (
            <div className="eg-locked">
              🔒 먼저 왼쪽에서 지금 느끼는 감정을 하나 골라줘.
            </div>
          ) : (
            <>
              <div className="eg-title">🛡️ 나에게 맞는 해결책 하나 고르기</div>
              <div className="eg-actions">
                {coping.actions.map((a) => (
                  <button
                    key={a.id}
                    className={`eg-act${state.action === a.id ? " sel" : ""}`}
                    onClick={() => setState((s) => pickAction(s, a.id))}
                  >
                    <span className="em">{a.emoji}</span>
                    <span>{a.text}</span>
                    <span className={`eg-badge ${a.id <= 3 ? "self" : "wish"}`}>
                      {a.id <= 3 ? "스스로 해소" : "바라는 공감"}
                    </span>
                  </button>
                ))}
              </div>
              {feedback && <div className="eg-feedback">💡 {feedback}</div>}
            </>
          )}
        </div>
      </div>

        <button className="eg-next" disabled={!canAdvance(state)} onClick={onNext}>
          {state.step >= TOTAL_STEPS ? "설명서 완성하기 ✨" : "다음 상황으로 ➡️"}
        </button>
      </div>
    </div>
  );
}
