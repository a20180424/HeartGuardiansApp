import { useEffect, useRef, useState } from "react";
import {
  TOOLS,
  HATI_DEFAULT,
  HATI_CLAP,
  PLEDGE_SHEET,
  COMPASS_IMG,
} from "./empathyCompass.data";
import "./EmpathyCompassStage.css";

// 미션1 "가디언즈 최종 점검하기" 미니게임.
// 원본(mytemp/그림자행성 미션1 게임/index.html)의 #checkScreen 3요소(tool-steps·quiz-panel·feedback)
// + 서약서·나침반 보상 카드를 이식. #stage(1920×1200) 위 1280×800 프레임을 scale(1.5)로 채운다.
// 흐름: quiz(11문항) → pledge(서약서 체크·확인) → reward(나침반 획득) → onDone.

type Phase = "quiz" | "pledge" | "reward";

const ADVANCE_MS = 1150; // 답변 피드백을 보여준 뒤 다음 문항으로
const PLEDGE_DELAY_MS = 700; // 마지막 문항 후 서약서 등장까지

export default function EmpathyCompassStage({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [toolIndex, setToolIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [locked, setLocked] = useState(false); // 답변 후 다음 문항까지 입력 잠금
  const [clap, setClap] = useState(false); // 하티 박수 연출
  const [feedback, setFeedback] = useState<{ text: string; tone: "" | "good" | "try" }>({
    text: "O 또는 X를 선택해 나의 모습을 점검해 봐!",
    tone: "",
  });
  const [pledgeChecked, setPledgeChecked] = useState(false);

  const timers = useRef<number[]>([]);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const tool = TOOLS[toolIndex];

  function choose(answer: "o" | "x") {
    if (locked) return;
    setLocked(true);
    if (answer === "o") {
      setClap(true);
      setFeedback({ text: "정말 멋져! 그 마음을 이어가자!", tone: "good" });
    } else {
      setClap(false);
      setFeedback({ text: "괜찮아! 지금부터 한 걸음씩 실천하면 돼!", tone: "try" });
    }
    after(ADVANCE_MS, advance);
  }

  function advance() {
    setClap(false);
    if (itemIndex + 1 < TOOLS[toolIndex].items.length) {
      setItemIndex((i) => i + 1);
      setLocked(false);
      return;
    }
    if (toolIndex + 1 < TOOLS.length) {
      setToolIndex((t) => t + 1);
      setItemIndex(0);
      setLocked(false);
      return;
    }
    // 모든 문항 완료 → 서약서
    after(PLEDGE_DELAY_MS, () => setPhase("pledge"));
  }

  return (
    <div className="ec-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="ec-frame">
        {/* 좌: 공감 도구 스텝 */}
        <aside className="ec-tool-steps">
          {TOOLS.map((t, i) => (
            <div
              key={t.name}
              className={`ec-tool-step${i === toolIndex ? " active" : ""}${
                i < toolIndex ? " done" : ""
              }`}
            >
              <img src={t.img} alt="" draggable={false} />
              <strong>
                {i + 1}. {t.name}
              </strong>
              <small>{t.key}</small>
            </div>
          ))}
        </aside>

        {/* 우: 점검 문항 패널 */}
        <div className="ec-quiz-panel">
          <div className="ec-panel-heading">
            <h1>가디언즈 최종 점검하기</h1>
            <p>나의 공감하는 모습을 솔직하게 점검해 보세요</p>
          </div>
          <div>
            <span className="ec-step-chip">공감 도구 {toolIndex + 1}</span>
            <span className="ec-counter">
              {itemIndex + 1} / {tool.items.length}
            </span>
          </div>
          <h2 className="ec-tool-name">{tool.name}</h2>
          <div className="ec-keyword">핵심 공감 능력 · {tool.key}</div>
          <div className="ec-question">□ {tool.items[itemIndex]}</div>
          <div className="ec-choices">
            <button
              className="ec-choice o"
              disabled={locked}
              onClick={() => choose("o")}
            >
              <span>O</span>잘하고 있어요
            </button>
            <button
              className="ec-choice x"
              disabled={locked}
              onClick={() => choose("x")}
            >
              <span>×</span> 노력할게요
            </button>
          </div>
        </div>

        {/* 하단: 하티 피드백 */}
        <div className="ec-feedback">
          <img
            className={clap ? "clapping" : ""}
            src={clap ? HATI_CLAP : HATI_DEFAULT}
            alt="하티"
            draggable={false}
          />
          <span className={`ec-feedback-text ${feedback.tone}`}>{feedback.text}</span>
        </div>

        {/* 서약서 → 나침반 보상 카드 */}
        {phase !== "quiz" && (
          <div className="ec-promise">
            {phase === "pledge" ? (
              <div
                className="ec-promise-card"
                style={{ backgroundImage: `url('${PLEDGE_SHEET}')` }}
              >
                <div className="ec-promise-actions">
                  <label className="ec-promise-check">
                    <input
                      type="checkbox"
                      checked={pledgeChecked}
                      onChange={(e) => setPledgeChecked(e.target.checked)}
                    />{" "}
                    마음을 담아 약속합니다.
                  </label>
                  <button
                    className="ec-confirm"
                    disabled={!pledgeChecked}
                    onClick={() => setPhase("reward")}
                  >
                    약속 확인
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="ec-promise-card reward-card"
                onClick={onDone}
                role="button"
              >
                <div className="ec-heart-mark">♥</div>
                <h2>공감 나침반 획득!</h2>
                <img
                  className="ec-reward-compass earned"
                  src={COMPASS_IMG}
                  alt="획득한 공감 나침반"
                  draggable={false}
                />
                <div className="ec-reward-title">
                  마음을 이해하고 실천하는
                  <br />
                  하트 가디언즈가 되었어요!
                </div>
                <div className="ec-reward-hint">화면을 눌러 계속하기 ▶</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
