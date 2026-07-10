import { useState } from "react";
import type { ReactNode } from "react";
import "./EmpathyManualGame.css";

// 행성3 미션1 미니게임 — "공감 송신기 사용 설명서" 완성.
// mytemp/얼음행성미션1/index.html 의 #gameShell 로직을 React로 이식.
// 각 단계마다 6지선다 중 "공감하는 행동" 정답 3개를 고르면 설명서 슬롯이 완성되고,
// 3단계를 모두 완성하면 onDone() 을 호출해 다음 노드(p3_m1_postplay)로 진행한다.

type Choice = { text: string; correct: boolean };
type Step = {
  title: string;
  situation: string;
  mission: string;
  result: ReactNode;
  choices: Choice[];
};

const STEPS: Step[] = [
  {
    title: "친구의 말에 귀 기울여 주기",
    situation: "\"미술 시간에 열심히 그림을 그렸는데...\"",
    mission: "좋은 행동 고르기",
    result: (
      <>
        <span className="record-title">1. 친구의 말에 귀 기울여 주세요.</span>
        <span className="record-detail">
          친구를 바라봐요.
          <br />
          끝까지 기다려요.
        </span>
      </>
    ),
    choices: [
      { text: "친구를 바라본다.", correct: true },
      { text: "끝까지 기다린다.", correct: true },
      { text: "하품하거나 다른 생각을 한다.", correct: false },
      { text: "말을 끊는다.", correct: false },
      { text: "관심을 가지고 듣는다.", correct: true },
      { text: "딴 곳을 본다.", correct: false },
    ],
  },
  {
    title: "친구의 말을 들으며 반응하기",
    situation: "\"...실수해서 그림이 망가졌어.\"",
    mission: "공감하며 듣는 행동 고르기",
    result: (
      <>
        <span className="record-title">2. 친구의 말에 따뜻하게 반응해 주세요.</span>
        <span className="record-detail">
          미소를 지어요.
          <br />
          고개를 끄덕여요.
        </span>
      </>
    ),
    choices: [
      { text: "아무 표정 없이 있는다.", correct: false },
      { text: "미소를 지으며 듣는다.", correct: true },
      { text: "고개를 끄덕인다.", correct: true },
      { text: "대충 넘긴다.", correct: false },
      { text: "친구가 말하는데 웃는다.", correct: false },
      { text: "부드러운 표정으로 집중한다.", correct: true },
    ],
  },
  {
    title: "친구의 마음을 말로 표현하기",
    situation: "\"정말 속상했어.\"",
    mission: "친구의 마음을 이해하는 말 고르기",
    result: (
      <>
        <span className="record-title">3. 친구의 감정을 말로 표현해 주세요.</span>
        <span className="record-detail">
          많이 긴장했겠구나.
          <br />
          걱정되던 마음이었겠구나.
        </span>
      </>
    ),
    choices: [
      { text: "\"많이 속상했겠구나.\"", correct: true },
      { text: "\"다음엔 잘하면 돼.\"", correct: false },
      { text: "\"별일 아니야.\"", correct: false },
      { text: "\"그랬구나.\"", correct: true },
      { text: "\"그 정도 가지고 왜 그래?\"", correct: false },
      { text: "\"정말 아쉬웠겠구나.\"", correct: true },
    ],
  },
];

const DEFAULT_FEEDBACK = "정답 3개를 모두 선택하면 설명서가 완성됩니다.";
const NEEDED = 3; // 단계별 정답 개수

export default function EmpathyManualGame({ onDone }: { onDone: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>([false, false, false]);
  const [chosen, setChosen] = useState<number[]>([]); // 이번 단계에서 맞힌 선택지 index
  const [wrongIdx, setWrongIdx] = useState<number | null>(null); // 오답 흔들림 표시
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const stepDone = completed[currentStep];

  function selectChoice(idx: number, correct: boolean) {
    if (stepDone || chosen.includes(idx)) return;

    if (!correct) {
      setWrongIdx(idx);
      setFeedback("다시 생각해 보세요. 친구를 공감하는 행동을 골라야 해요.");
      window.setTimeout(() => setWrongIdx((w) => (w === idx ? null : w)), 450);
      return;
    }

    const next = [...chosen, idx];
    setChosen(next);

    if (next.length < NEEDED) {
      setFeedback(`좋아요! 정답 ${next.length}개를 찾았습니다.`);
      return;
    }

    setCompleted((c) => c.map((v, i) => (i === currentStep ? true : v)));
    setFeedback(`단계 ${currentStep + 1} 완성!`);
  }

  function nextStep() {
    if (!completed[currentStep]) return;
    if (isLast) {
      onDone();
      return;
    }
    setCurrentStep((s) => s + 1);
    setChosen([]);
    setWrongIdx(null);
    setFeedback(DEFAULT_FEEDBACK);
  }

  function restart() {
    setCurrentStep(0);
    setCompleted([false, false, false]);
    setChosen([]);
    setWrongIdx(null);
    setFeedback(DEFAULT_FEEDBACK);
  }

  // 슬롯별 진행 점(정답 1개=점 1개): 완성 3, 현재 단계 chosen 수, 이후 0.
  const dotCount = (slot: number) =>
    completed[slot] ? 3 : slot === currentStep ? chosen.length : 0;

  return (
    <div className="etg" onClick={(e) => e.stopPropagation()}>
      <div className="etg-viewport">
        <section className="stage">
          {/* 왼쪽 — 공감 송신기 사용 설명서 보드 */}
          <aside className="board" aria-label="공감 송신기 사용 설명서">
            <h1>공감 송신기 사용 설명서</h1>
            <div className="slots">
              {STEPS.map((s, i) => {
                const done = completed[i];
                const dots = dotCount(i);
                return (
                  <div
                    key={i}
                    className={`manual-slot${done ? " complete" : ""}`}
                  >
                    <div className="slot-label">단계 {i + 1}</div>
                    <div className="slot-dots" aria-hidden="true">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className={`dot${d < dots ? " on" : ""}`} />
                      ))}
                    </div>
                    <div className="slot-body">
                      {done ? (
                        <div className="slot-entry">{s.result}</div>
                      ) : (
                        <div className="slot-ghost" aria-hidden="true">
                          <div className="ghost-row">
                            <span className="ghost-num">{i + 1}.</span>
                            <span className="ghost-bar w-title" />
                          </div>
                          <span className="ghost-bar w-1" />
                          <span className="ghost-bar w-2" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* 오른쪽 — 활동 패널 */}
          <section className="center">
            <article className="activity">
              <div className="activity-head">
                <div className="step-badge">단계 {currentStep + 1}</div>
                <div className="activity-title">{step.title}</div>
              </div>

              <div className="tag-row">
                <span className="small-tag">가디언즈 작전 계획</span>
                <span className="mission-text">{step.mission}</span>
              </div>

              <div className="speech">
                <div className="alien" aria-hidden="true">
                  👽
                </div>
                <div className="speech-text">{step.situation}</div>
              </div>

              <span className="choice-label">선택</span>
              <div className="choices">
                {step.choices.map((c, idx) => {
                  const picked = chosen.includes(idx);
                  const cls =
                    "choice" +
                    (picked ? " correct" : "") +
                    (wrongIdx === idx ? " wrong" : "");
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={cls}
                      disabled={stepDone || picked}
                      onClick={() => selectChoice(idx, c.correct)}
                    >
                      {c.text}
                    </button>
                  );
                })}
              </div>
              <p className="feedback">{feedback}</p>

              <div className="controls">
                <button className="secondary" type="button" onClick={restart}>
                  처음부터
                </button>
                <button
                  className="primary"
                  type="button"
                  disabled={!stepDone}
                  onClick={nextStep}
                >
                  {isLast ? "최종 성공" : "성공"}
                </button>
              </div>
            </article>
          </section>
        </section>
      </div>
    </div>
  );
}
