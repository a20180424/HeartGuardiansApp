import { useEffect, useMemo, useRef, useState } from "react";
import {
  STAGES,
  SIGN_LEFT,
  SIGN_RIGHT,
  HATI_DEFAULT,
  HATI_HAPPY,
  NEEDLE_END_LEFT,
  NEEDLE_END_RIGHT,
} from "./courageCompass.data";
import "./CourageCompassStage.css";

// 미션2 "공감 나침반 작전" 미니게임.
// 원본(mytemp/그림자행성 미션2 게임/index.html)의 #game·#reward 화면을 이식.
// 원본과 다른 점(사용자 결정):
//  · 인트로/엔딩/공감카드 화면은 미션 엔진 노드가 맡는다 → 여기선 8시나리오만.
//  · 원본 자체 "미션 진행도"(미션1·2·3)는 엔진 스테퍼와 중복이라 제외.
//  · 브랜드 로고 제외, 용기 조각 + 스테이지바만 유지.
// #stage(1920×1200) 위 1280×800 프레임을 scale(1.5)로 채운다(원본 px 좌표 재사용).
// 배경은 엔진 #bg(shadow-mission2-bg2.png)가 비치도록 투명하게 둔다.

type Phase = "fork" | "reward";

const REVEAL_MS = 1700; // 나침반 회전 → 표지판이 뒤집히기까지
const TYPE_MS = 45; // 보상 교훈 타자기 속도(글자당)

export default function CourageCompassStage({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("fork");
  const [stageIndex, setStageIndex] = useState(0);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [revealed, setRevealed] = useState(false); // 나침반을 눌러 길이 밝혀졌는지
  const [spinning, setSpinning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false); // 공감의 길 선택 후 대화창
  const [hati, setHati] = useState<{
    message: string;
    success: boolean;
    button: string;
    onClose: (() => void) | null;
  } | null>(null);
  const [typed, setTyped] = useState(""); // 보상 교훈 타자기 진행분
  const [typingDone, setTypingDone] = useState(false);

  // 좌/우 배치는 판마다 랜덤(원본 shufflePaths). 8시나리오분을 한 번에 뽑는다.
  const goodOnLeft = useMemo(
    () => Array.from({ length: 8 }, () => Math.random() >= 0.5),
    [],
  );

  const timers = useRef<number[]>([]);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const stage = STAGES[stageIndex];
  const scenario = stage.scenarios[scenarioIndex];
  const leftIsGood = goodOnLeft[stageIndex * 2 + scenarioIndex];

  // 보상 화면 교훈 타자기 — 다 찍혀야 '다음 구역으로' 버튼이 나온다(원본 typeRewardFeedback).
  useEffect(() => {
    if (phase !== "reward") return;
    const chars = Array.from(stage.learn);
    let i = 0;
    setTyped("");
    setTypingDone(false);
    const id = window.setInterval(() => {
      i += 1;
      setTyped(chars.slice(0, i).join(""));
      if (i >= chars.length) {
        window.clearInterval(id);
        setTypingDone(true);
      }
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [phase, stage.learn]);

  function loadScenario(s: number, sc: number) {
    setStageIndex(s);
    setScenarioIndex(sc);
    setRevealed(false);
    setSpinning(false);
    setDialogOpen(false);
    setPhase("fork");
  }

  // 나침반 클릭 → 어둠이 걷히고 바늘이 정답 쪽을 가리키며 회전, 1.7초 뒤 표지판이 뒤집힌다.
  function reveal() {
    if (spinning || revealed) return;
    setSpinning(true);
    after(REVEAL_MS, () => setRevealed(true));
  }

  function choosePath(kind: "good" | "bad") {
    if (!revealed) return;
    if (kind === "bad") {
      setHati({
        message: "그림자의 길보다 친구의 마음을 살피는 공감의 길을 선택해 볼까?",
        success: false,
        button: "다시 생각하기",
        onClose: null,
      });
      return;
    }
    setDialogOpen(true);
  }

  function answer(i: number) {
    if (i !== scenario.answer) {
      setHati({
        message: "친구의 마음을 이해하면서도 친구와 나, 모두를 지키는 말을 골라 보자!",
        success: false,
        button: "다시 생각하기",
        onClose: null,
      });
      return;
    }
    // 스테이지의 첫 시나리오면 칭찬 후 다음 상황, 두 번째면 스테이지 완료(보상).
    if (scenarioIndex < stage.scenarios.length - 1) {
      setHati({
        message: "잘했어! 공감의 길을 선택했구나.",
        success: true,
        button: "다음 상황으로",
        onClose: () => loadScenario(stageIndex, scenarioIndex + 1),
      });
      return;
    }
    setDialogOpen(false);
    setPhase("reward");
  }

  // 보상 화면의 '다음 구역으로' — 마지막 스테이지였다면 미니게임 종료(공감카드 노드로).
  function nextArea() {
    if (stageIndex + 1 >= STAGES.length) {
      onDone();
      return;
    }
    loadScenario(stageIndex + 1, 0);
  }

  const isLastStage = stageIndex + 1 >= STAGES.length;
  // 획득한 조각 수 — 보상 화면에선 방금 깬 스테이지까지 포함해 켠다.
  const shardsOn = phase === "reward" ? stageIndex + 1 : stageIndex;

  const sign = (side: "left" | "right") => {
    const isGood = side === "left" ? leftIsGood : !leftIsGood;
    const art = side === "left" ? SIGN_LEFT : SIGN_RIGHT;
    const kind = isGood ? "good" : "bad";
    return (
      <button
        className={`cc-sign ${kind}${revealed ? " revealed selectable" : ""}`}
        onClick={() => choosePath(kind)}
        aria-label={revealed ? undefined : "숨겨진 길"}
        disabled={!revealed}
      >
        <span className="cc-sign-inner">
          <span className="cc-face back">
            <img src={art.back} alt="표지판 뒷면" draggable={false} />
          </span>
          <span className="cc-face front">
            <img src={art.front} alt="" draggable={false} />
            <span className="cc-sign-copy">
              <b>{isGood ? "💚 공감의 길" : "🌑 그림자의 길"}</b>
              <span>{isGood ? scenario.good : scenario.bad}</span>
            </span>
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="cc-root" onClick={(e) => e.stopPropagation()}>
      <div className="cc-frame">
        {/* 상단 — 용기 조각 + 스테이지바(원본 header/stagebar에서 브랜드·미션진행도 제외) */}
        <div className="cc-chrome">
          <div className="cc-shards" aria-label={`용기 조각 ${shardsOn} / ${STAGES.length}`}>
            {STAGES.map((s, i) => (
              <span key={s.title} className={`cc-shard${i < shardsOn ? " on" : ""}`}>
                ◆
              </span>
            ))}
          </div>
          <div className="cc-stagebar">
            {STAGES.map((s, i) => (
              <div
                key={s.title}
                className={`cc-stage-pill${i === stageIndex ? " active" : ""}${
                  i < stageIndex ? " done" : ""
                }`}
              >
                {i + 1}. {s.title}
              </div>
            ))}
          </div>
        </div>

        {phase === "fork" && (
          <div className={`cc-game${revealed ? "" : " shadowed"}`}>
            <h2 className="cc-stage-title">{stage.title}</h2>

            <div className="cc-situation">
              <img className="cc-situation-image" src={scenario.image} alt="" draggable={false} />
              <div className="cc-situation-copy">
                <span className="cc-speaker">친구의 상황</span>
                <span>{scenario.situation}</span>
              </div>
            </div>

            <div className="cc-fork">
              {sign("left")}
              <div className="cc-compass-wrap">
                <div className={`cc-compass-tip${revealed ? " choose-mode" : ""}`}>
                  {revealed ? (
                    "표지판을 선택하세요"
                  ) : (
                    <>
                      나침반을 눌러
                      <br />
                      길을 밝혀 주세요
                    </>
                  )}
                </div>
                <button
                  className={`cc-compass${spinning ? " spinning" : ""}`}
                  style={{
                    ["--needle-end" as string]: `${
                      leftIsGood ? NEEDLE_END_LEFT : NEEDLE_END_RIGHT
                    }deg`,
                  }}
                  onClick={reveal}
                  disabled={spinning || revealed}
                  aria-label="공감 나침반"
                >
                  <span className="cc-needle" />
                </button>
                <div className="cc-compass-label">공감 나침반</div>
              </div>
              {sign("right")}
            </div>

            {dialogOpen && (
              <div className="cc-dialog">
                <span className="cc-speaker">친구의 말</span>
                <h3>{scenario.reply}</h3>
                <div className="cc-choices">
                  {scenario.choices.map((c, i) => (
                    <button key={c} className="cc-choice" onClick={() => answer(i)}>
                      <span className="cc-num">{i + 1}</span>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "reward" && (
          <div className="cc-reward">
            <div className="cc-reward-shard-panel">
              <img className="cc-big-shard" src={stage.shard} alt="획득한 용기 조각" />
              <div className="cc-reward-shard-copy">
                <span className="cc-reward-shard-label">용기의 조각 획득</span>
                <h2>{stage.title} 획득!</h2>
              </div>
            </div>
            <div className="cc-reward-hati-panel">
              <img className="cc-reward-hati" src={HATI_HAPPY} alt="기뻐하는 하티" />
              <div className="cc-reward-feedback">
                <span className="cc-reward-hati-name">하티</span>
                <p>{typed}</p>
              </div>
            </div>
            {typingDone && (
              <button className="cc-primary cc-reveal" onClick={nextArea}>
                {isLastStage ? "공감 카드 공부하기  →" : "다음 구역으로  →"}
              </button>
            )}
          </div>
        )}

        {/* 하티 피드백 모달 — 오답이면 재시도, 정답이면 다음 상황으로 */}
        {hati && (
          <div className="cc-hati-feedback" role="dialog" aria-modal="true">
            <div className={`cc-hati-card${hati.success ? " success" : ""}`}>
              <img
                className="cc-hati-face"
                src={hati.success ? HATI_HAPPY : HATI_DEFAULT}
                alt="하티"
              />
              <div className="cc-hati-copy">
                <span className="cc-hati-name">하티</span>
                <p className="cc-hati-message">{hati.message}</p>
                <button
                  className="cc-hati-action"
                  autoFocus
                  onClick={() => {
                    const done = hati.onClose;
                    setHati(null);
                    done?.();
                  }}
                >
                  {hati.button}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
