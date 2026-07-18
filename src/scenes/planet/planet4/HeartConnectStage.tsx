import { useEffect, useState } from "react";
import { STORY_LINES } from "./heartConnect.data";
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
        {/* Task 5~7 에서 quiz / video / epilogue 브랜치 추가 */}
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
