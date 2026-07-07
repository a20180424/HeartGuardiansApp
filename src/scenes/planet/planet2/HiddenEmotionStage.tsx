import { useEffect, useRef, useState } from "react";
import { MISSIONS, EMOTION_FACES } from "./hiddenEmotion.data";
import {
  initialState,
  useRadar as applyRadar,
  allRevealed,
  submitPuzzle,
  nextMission as applyNextMission,
  isLastMission,
  type GameState,
} from "./hiddenEmotion.logic";
import "./HiddenEmotionStage.css";

// 미션3 "숨은 감정 찾기" 미니게임. 원본: mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html <script>.
// 명령형 DOM 조립(render/renderCards/renderClues/renderChoices/renderPuzzleModal/renderSuccessFeedback/
// useRadar/nextMission/sayHati)을 React 선언형 state/effect로 옮긴 것.
const ASSET = "/assets/planet2/hidden-emotion";

const INTRO_LINE = "공감 레이더를 사용하여 친구의 숨겨진 감정을 찾아봐!";
const MORE_CLUES_LINE = "좋아, 단서를 하나 더 찾았어. 공감 레이더로 계속 살펴보자!";
const ALL_CLUES_LINE = "단서를 모두 찾았어. 이제 수집한 단서들을 조합해서 숨겨진 감정을 찾아봐.";
const NEED_MORE_LINE = "단서를 2개 이상 골라야 마음 퍼즐을 풀 수 있어.";
const WRONG_LINE = "조금 더 생각해볼까? 친구의 모습과 행동을 함께 살펴봐.";

export default function HiddenEmotionStage({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<GameState>(initialState);
  const [puzzleReady, setPuzzleReady] = useState(false);
  const [resultNextReady, setResultNextReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);

  // 하티 말풍선 타자기 효과(원본 sayHati 대응).
  const [hatiText, setHatiText] = useState("");
  const [hatiHidden, setHatiHidden] = useState(true);
  const typingRef = useRef<number | null>(null);
  const hatiEndTimerRef = useRef<number | null>(null);
  // 5번째 카드 공개 후 퍼즐 오픈까지의 지연(원본 1700ms).
  const puzzleTimerRef = useRef<number | null>(null);
  // 퍼즐 정답 후 하티 피드백 시작까지의 지연(원본 1900ms).
  const resultTimerRef = useRef<number | null>(null);
  // 퍼즐 모달의 체크박스/라디오는 원본처럼 DOM에서 직접 읽는다(오답 시에도 선택 유지).
  const puzzleCardRef = useRef<HTMLDivElement | null>(null);

  const mission = MISSIONS[state.missionIndex];
  const puzzleOpen = allRevealed(state) && puzzleReady && !state.feedbackShown;

  function sayHati(text: string, onEnd?: () => void) {
    if (typingRef.current) {
      window.clearInterval(typingRef.current);
      typingRef.current = null;
    }
    if (hatiEndTimerRef.current) {
      window.clearTimeout(hatiEndTimerRef.current);
      hatiEndTimerRef.current = null;
    }
    setHatiHidden(false);
    setHatiText("");
    let i = 0;
    typingRef.current = window.setInterval(() => {
      i += 1;
      setHatiText(text.slice(0, i));
      if (i >= text.length) {
        if (typingRef.current) {
          window.clearInterval(typingRef.current);
          typingRef.current = null;
        }
        if (onEnd) {
          hatiEndTimerRef.current = window.setTimeout(() => {
            hatiEndTimerRef.current = null;
            onEnd();
          }, 350);
        }
      }
    }, 28);
  }

  function clearAllTimers() {
    if (typingRef.current) {
      window.clearInterval(typingRef.current);
      typingRef.current = null;
    }
    if (hatiEndTimerRef.current) {
      window.clearTimeout(hatiEndTimerRef.current);
      hatiEndTimerRef.current = null;
    }
    if (puzzleTimerRef.current) {
      window.clearTimeout(puzzleTimerRef.current);
      puzzleTimerRef.current = null;
    }
    if (resultTimerRef.current) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }

  // 최초 진입 인트로 대사 + 언마운트 시 모든 타이머 정리.
  useEffect(() => {
    sayHati(INTRO_LINE);
    return () => clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 퍼즐 정답(feedbackShown=true) 진입 시 결과 시퀀스: 하티 숨김 → 1900ms 후 하티가 교훈 대사.
  useEffect(() => {
    if (!state.feedbackShown) return;
    setHatiHidden(true);
    resultTimerRef.current = window.setTimeout(() => {
      resultTimerRef.current = null;
      sayHati(mission.feedback, () => setResultNextReady(true));
    }, 1900);
    return () => {
      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
        resultTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.feedbackShown, state.missionIndex]);

  function handleUseRadar() {
    if (allRevealed(state) || state.feedbackShown) return;
    setScanning(true);
    setScanKey((k) => k + 1);
    const next = applyRadar(state);
    setState(next);
    if (next.revealedCount >= 5) {
      if (puzzleTimerRef.current) window.clearTimeout(puzzleTimerRef.current);
      puzzleTimerRef.current = window.setTimeout(() => {
        puzzleTimerRef.current = null;
        setPuzzleReady(true);
        sayHati(ALL_CLUES_LINE);
      }, 1700);
    } else {
      sayHati(MORE_CLUES_LINE);
    }
  }

  function handlePuzzleSubmit() {
    const root = puzzleCardRef.current;
    if (!root) return;
    const checked = root.querySelectorAll<HTMLInputElement>(".puzzle-check input:checked");
    const emotionInput = root.querySelector<HTMLInputElement>(".puzzle-emotion input:checked");
    const emotion = emotionInput?.value ?? "";
    const picks = Array.from(checked).map((el) => Number(el.value));
    const r = submitPuzzle(state, picks, emotion);
    if (r.kind === "need-more") {
      sayHati(NEED_MORE_LINE);
      return;
    }
    if (r.kind === "wrong") {
      sayHati(WRONG_LINE);
      return;
    }
    setState(r.state);
  }

  function handleNextMission() {
    if (puzzleTimerRef.current) {
      window.clearTimeout(puzzleTimerRef.current);
      puzzleTimerRef.current = null;
    }
    if (resultTimerRef.current) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    if (isLastMission(state)) return; // 방어: 마지막 미션에서는 호출되지 않아야 함(버튼 분기가 보장).
    setState(applyNextMission(state));
    setPuzzleReady(false);
    setResultNextReady(false);
    sayHati(INTRO_LINE);
  }

  const revealedCards = mission.cards.slice(0, state.revealedCount);

  return (
    // 오버레이 클릭이 #stage 로 전파돼 라인 노드처럼 넘어가지 않도록 stopPropagation.
    <div className="he-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="he-scale">
        <div
          className={`he-screen${puzzleOpen ? " puzzle-open" : ""}${state.feedbackShown ? " result-open" : ""}`}
        >
          <div className="main-grid">
            <section className="board" aria-label="카드 게임판">
              <div className="scene-title">
                <div>
                  <h2>친구의 숨은 감정 찾기</h2>
                  <p>{mission.intro}</p>
                </div>
                <div className="progress">{state.revealedCount} / 5 공개</div>
              </div>

              <div className="cards">
                {mission.cards.map((card, index) => {
                  const revealed = index < state.revealedCount;
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`card${revealed ? " revealed" : ""}`}
                      disabled
                      aria-label={revealed ? card.text : `${index + 1}번 공감 카드`}
                    >
                      <span className="card-inner">
                        <span className="card-face card-back" />
                        <span
                          className="card-face card-front"
                          style={{ backgroundImage: `url(${card.art})` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="radar-box">
                <div
                  key={scanKey}
                  className={`radar-image-wrap${scanning ? " scanning" : ""}`}
                >
                  <img className="radar-image" src={`${ASSET}/radar.png`} alt="공감 레이더" />
                </div>
                <div>
                  <button
                    className="radar-button"
                    type="button"
                    disabled={allRevealed(state) || state.feedbackShown}
                    onClick={handleUseRadar}
                  >
                    공감 레이더 사용하기
                  </button>
                </div>
              </div>
            </section>

            <aside className="side-panel" aria-label="발견한 단서">
              <div className="panel-title">💗 발견한 단서</div>
              <div className="clue-list">
                {revealedCards.length === 0 ? (
                  <div className="empty">
                    단서 수첩이 비어 있어요.
                    <br />
                    공감 레이더로 단서를 찾아요.
                  </div>
                ) : (
                  revealedCards.map((card, index) => (
                    <div className="clue-item" key={index}>
                      <span className="clue-no">{index + 1}</span>
                      <span>{card.text}</span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>

          <div className={`game-guide${hatiHidden ? " is-hidden" : ""}`}>
            <img src={`${ASSET}/hati.png`} alt="하티" />
            <div className="game-guide-bubble">{hatiText}</div>
          </div>

          {puzzleOpen && (
            <section className="puzzle-modal" role="dialog" aria-modal="true">
              <div className="puzzle-card" ref={puzzleCardRef}>
                <h2>🧩 마음 퍼즐 추리</h2>
                <div className="puzzle-question">
                  어떤 단서들이 {mission.person}의 진짜 마음을 보여줄까요? (2개 이상 선택)
                </div>
                <div className="puzzle-options">
                  {mission.cards.map((card, index) => (
                    <label className="puzzle-check" key={index}>
                      <input type="checkbox" value={index} />
                      <span>
                        {index + 1}. {card.text}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="puzzle-question">{mission.person}의 진짜 마음은 무엇일까요?</div>
                <div className="puzzle-options">
                  {mission.emotions.map((emotion) => (
                    <label className="puzzle-emotion" key={emotion}>
                      <input type="radio" name="emotionGuess" value={emotion} />
                      <span>
                        {EMOTION_FACES[emotion] || "🙂"} {emotion}
                      </span>
                    </label>
                  ))}
                </div>
                <button className="puzzle-submit" type="button" onClick={handlePuzzleSubmit}>
                  결과 확인
                </button>
              </div>
            </section>
          )}

          {state.feedbackShown && (
            <section className="result-panel">
              <div className="result-card">
                <div className="celebration" aria-hidden="true">
                  <span style={{ "--tx": "-340px", "--ty": "-150px", "--angle": "18deg", "--delay": "0s", "--piece-color": "#ffcf4d" } as React.CSSProperties} />
                  <span style={{ "--tx": "-260px", "--ty": "-205px", "--angle": "66deg", "--delay": "0.04s", "--piece-color": "#8ee05b" } as React.CSSProperties} />
                  <span style={{ "--tx": "-180px", "--ty": "-170px", "--angle": "112deg", "--delay": "0.02s", "--piece-color": "#57c7ff" } as React.CSSProperties} />
                  <span style={{ "--tx": "-100px", "--ty": "-230px", "--angle": "158deg", "--delay": "0.08s", "--piece-color": "#ff8a65" } as React.CSSProperties} />
                  <span style={{ "--tx": "-30px", "--ty": "-185px", "--angle": "202deg", "--delay": "0.01s", "--piece-color": "#ffe27a" } as React.CSSProperties} />
                  <span style={{ "--tx": "70px", "--ty": "-220px", "--angle": "248deg", "--delay": "0.05s", "--piece-color": "#9be36c" } as React.CSSProperties} />
                  <span style={{ "--tx": "150px", "--ty": "-175px", "--angle": "294deg", "--delay": "0.03s", "--piece-color": "#62d0ff" } as React.CSSProperties} />
                  <span style={{ "--tx": "245px", "--ty": "-205px", "--angle": "332deg", "--delay": "0.07s", "--piece-color": "#ffb14f" } as React.CSSProperties} />
                  <span style={{ "--tx": "330px", "--ty": "-145px", "--angle": "28deg", "--delay": "0.02s", "--piece-color": "#f7db59" } as React.CSSProperties} />
                  <span style={{ "--tx": "-310px", "--ty": "55px", "--angle": "78deg", "--delay": "0.05s", "--piece-color": "#75d366" } as React.CSSProperties} />
                  <span style={{ "--tx": "-215px", "--ty": "110px", "--angle": "128deg", "--delay": "0.09s", "--piece-color": "#55c0ff" } as React.CSSProperties} />
                  <span style={{ "--tx": "-115px", "--ty": "72px", "--angle": "174deg", "--delay": "0.03s", "--piece-color": "#ff8f73" } as React.CSSProperties} />
                  <span style={{ "--tx": "120px", "--ty": "78px", "--angle": "214deg", "--delay": "0.06s", "--piece-color": "#ffd85b" } as React.CSSProperties} />
                  <span style={{ "--tx": "220px", "--ty": "116px", "--angle": "268deg", "--delay": "0.04s", "--piece-color": "#8fe96a" } as React.CSSProperties} />
                  <span style={{ "--tx": "316px", "--ty": "58px", "--angle": "318deg", "--delay": "0.08s", "--piece-color": "#65ccff" } as React.CSSProperties} />
                </div>
                <div className="celebration-star left" aria-hidden="true">★</div>
                <div className="celebration-star right" aria-hidden="true">★</div>
                <h2>숨겨진 감정의 정체</h2>
                <div className="result-summary">
                  <p>100% 공감 성공!</p>
                  <p>
                    {mission.person}의 진짜 마음:
                    <br />
                    <strong>{mission.answer}</strong>
                  </p>
                </div>
                <div className="arji-feedback">
                  <img src={mission.resultImage} alt={mission.person} />
                  <p>{mission.resultFeedback}</p>
                </div>
              </div>
            </section>
          )}

          {state.feedbackShown && resultNextReady && (
            isLastMission(state) ? (
              <button className="friend-next" type="button" onClick={onDone}>
                미션 완료 ▶
              </button>
            ) : (
              <button className="friend-next" type="button" onClick={handleNextMission}>
                다른 친구 만나기 ➡
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
