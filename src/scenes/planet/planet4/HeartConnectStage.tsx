import { useEffect, useRef, useState } from "react";
import { HATI_DEFAULT, IMG_DIAMOND, MISSIONS, STORY_LINES } from "./heartConnect.data";
import "./HeartConnectStage.css";

// 미션3 "하트 커넥트 : 마지막 연결" 미니게임.
// 원본: mytemp/그림자 행성 미션3 게임/index.html 을 React로 이식.
// phase: story → quiz → video → epilogue → success (Task 4~8에서 구현).
type Phase = "story" | "quiz" | "video" | "epilogue" | "success";
const STORY_TYPE_MS = 42; // 원본 storyLine() 타자 속도

export default function HeartConnectStage({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("story");
  // 타이머 정리는 각 phase 하위 컴포넌트가 자신의 useEffect cleanup 에서 담당한다.

  return (
    <div className="hc-root">
      <div className="hc-frame">
        {phase === "story" && <StoryPhase onDone={() => setPhase("quiz")} />}
        {phase === "quiz" && <QuizPhase onDone={() => setPhase("video")} />}
        {/* Task 6~7 에서 video / epilogue 브랜치 추가 */}
        {/* 임시 success 배선(Task 8에서 <SuccessPhase onDone={onDone} /> 로 교체).
            지금은 onDone 을 소비해 noUnusedParameters 오류를 막고, phase 가 success 로 갈 때 홈 이동을 검증한다. */}
        {phase === "success" && (
          <button
            style={{ position: "absolute", left: 540, top: 380, padding: "16px 30px" }}
            onClick={onDone}
          >
            (임시) 우주선으로 이동
          </button>
        )}
      </div>
    </div>
  );
}

function StoryPhase({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(true);
  const line = STORY_LINES[index];

  // 현재 줄 타자기
  useEffect(() => {
    setTyped("");
    setTyping(true);
    const chars = Array.from(line.text);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(chars.slice(0, i).join(""));
      if (i >= chars.length) {
        window.clearInterval(id);
        setTyping(false);
      }
    }, STORY_TYPE_MS);
    return () => window.clearInterval(id);
  }, [index, line.text]);

  const advance = () => {
    if (typing) {
      setTyped(line.text);
      setTyping(false);
      return;
    }
    if (index + 1 >= STORY_LINES.length) onDone();
    else setIndex(index + 1);
  };

  // 클릭/Enter/Space 로 진행
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") advance();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // 마지막 줄은 완성 시 '\n' 뒤를 강조 span 으로
  const renderText = () => {
    if (!typing && index === STORY_LINES.length - 1 && line.text.includes("\n")) {
      const [first, last] = line.text.split("\n");
      return (
        <>
          {first}
          <br />
          <span className="hc-story-emphasis">{last}</span>
        </>
      );
    }
    return typed;
  };

  return (
    <div className="hc-story" onClick={advance}>
      <img className="hc-story-hati" key={index} src={line.hati} alt="하티" />
      <div className="hc-story-box">
        <span className="hc-speaker">하티</span>
        <span className="hc-story-progress">{index + 1} / {STORY_LINES.length}</span>
        <p className={`hc-dialogue${typing ? " typing" : ""}`}>{renderText()}</p>
        <span className="hc-story-next">▶</span>
      </div>
    </div>
  );
}

// SVG 연결선 좌표(원본 viewBox="0 0 650 540"의 5개 <line>, g1~g5 순서와 1:1 대응).
const LINK_COORDS: { x1: number; y1: number; x2: number; y2: number }[] = [
  { x1: 325, y1: 70, x2: 325, y2: 270 }, // g1 (상단)
  { x1: 539, y1: 178, x2: 325, y2: 270 }, // g2 (우상단)
  { x1: 494, y1: 464, x2: 325, y2: 270 }, // g3 (우하단)
  { x1: 156, y1: 464, x2: 325, y2: 270 }, // g4 (좌하단)
  { x1: 111, y1: 178, x2: 325, y2: 270 }, // g5 (좌상단)
];

const DEFAULT_FEEDBACK = "공감의 힘으로 원석을 깨워 줘.";
const WRONG_FEEDBACK = "친구의 마음을 한 번 더 바라볼까?";
const CORRECT_FEEDBACK = "원석의 빛이 공감 다이아몬드로 연결됐어!";

function QuizPhase({ onDone }: { onDone: () => void }) {
  const [missionIndex, setMissionIndex] = useState(0);
  const [connected, setConnected] = useState<boolean[]>(() => MISSIONS.map(() => false));
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [coreOn, setCoreOn] = useState(false);

  const wrongTimerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  // 타이머 정리(언마운트 시).
  useEffect(() => {
    return () => {
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const mission = MISSIONS[missionIndex];
  const done = connected.filter(Boolean).length;

  const choose = (i: number) => {
    if (locked) return;
    if (i !== mission.correct) {
      // 오답: 해당 버튼만 흔들고 650ms 후 해제, 페널티 없이 같은 문제 유지.
      setWrongIndex(i);
      setFeedback(WRONG_FEEDBACK);
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = window.setTimeout(() => {
        setWrongIndex(null);
        wrongTimerRef.current = null;
      }, 650);
      return;
    }
    // 정답: 잠그고, 버튼 전체 비활성화 + 원석·연결선 점등 + 진행도 갱신.
    if (wrongTimerRef.current !== null) {
      window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    setWrongIndex(null);
    setLocked(true);
    setConnected((prev) => {
      const next = [...prev];
      next[missionIndex] = true;
      return next;
    });
    setFeedback(CORRECT_FEEDBACK);
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      const nextIndex = missionIndex + 1;
      if (nextIndex < MISSIONS.length) {
        setMissionIndex(nextIndex);
        setLocked(false);
        setFeedback(DEFAULT_FEEDBACK);
      } else {
        setCoreOn(true);
        onDone();
      }
    }, 1150);
  };

  return (
    <div className="hc-quiz">
      <div className="hc-game-layout">
        <div className="hc-space">
          <span className="hc-phase-badge">최종 미션 · 공감 원석 연결</span>
          <svg className="hc-links" viewBox="0 0 650 540" aria-hidden="true">
            {LINK_COORDS.map((line, i) => (
              <line
                key={i}
                className={`hc-link${connected[i] ? " on" : ""}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ))}
          </svg>
          <div className={`hc-core${coreOn ? " on" : ""}`}>
            <img src={IMG_DIAMOND} alt="공감 다이아몬드" />
          </div>
          {MISSIONS.map((m, i) => (
            <div
              key={m.gem}
              className={`hc-node hc-gem hc-g${i + 1}${connected[i] ? " connected" : ""}`}
            >
              <img src={m.image} alt={m.gem} />
              <small>{m.gem}</small>
            </div>
          ))}
        </div>
        <aside className="hc-mission">
          <div className="hc-progress-label">
            <span>원석 연결 진행도</span>
            <span>{done} / {MISSIONS.length}</span>
          </div>
          <div className="hc-progress">
            <div style={{ width: `${(done / MISSIONS.length) * 100}%` }} />
          </div>
          <p className="hc-stage-title">공감 원석 · {mission.gem}</p>
          <div className="hc-icon">
            <img src={mission.image} alt={mission.gem} />
          </div>
          <p className="hc-prompt">“{mission.text}”</p>
          <div className="hc-choices">
            {mission.options.map((option, i) => (
              <button
                key={i}
                type="button"
                className={`hc-choice${wrongIndex === i ? " wrong" : ""}${locked && i === mission.correct ? " correct" : ""}`}
                disabled={locked}
                onClick={() => choose(i)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="hc-hati-feedback">
            <img className="hc-feedback-hati" src={HATI_DEFAULT} alt="하티" />
            <p className="hc-feedback">{feedback}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
