import { useEffect, useRef, useState } from "react";
import {
  EPILOGUE_BG,
  FINAL_LINES,
  HATI_DEFAULT,
  IMG_DIAMOND,
  IMG_SUCCESS_BANNER,
  IMG_SUCCESS_BG,
  IMG_TITLE_BANNER,
  IMG_VIDEO,
  MISSIONS,
  POST_LINES,
  STORY_LINES,
} from "./heartConnect.data";
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
        {phase === "video" && <VideoPhase onDone={() => setPhase("epilogue")} />}
        {phase === "epilogue" && <EpiloguePhase onDone={() => setPhase("success")} />}
        {phase === "success" && <SuccessPhase onDone={onDone} />}
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

  // 클릭/Enter/Space 로 진행. advance() 가 참조하는 상태를 의존성으로 둬 재렌더마다(타자
  // 인터벌 42ms 틱마다) 리바인딩되지 않게 한다(EpiloguePhase 의 동일 패턴과 동일).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") advance();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [typing, index]);

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
  const [flashing, setFlashing] = useState(false);

  const wrongTimerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  // 원본 finish(): 코어 점등 + flash 재생 후 700ms 뒤에 video phase 로 전환.
  const finishTimerRef = useRef<number | null>(null);

  // 타이머 정리(언마운트 시).
  useEffect(() => {
    return () => {
      if (wrongTimerRef.current !== null) window.clearTimeout(wrongTimerRef.current);
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
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
        // 원본 choose()→finish(): 코어 점등 + flash 재생을 먼저 보여주고, 700ms 뒤에
        // video phase 로 전환한다(같은 틱에 onDone 을 부르면 점등된 코어가 렌더될 새 없이
        // 즉시 컷 되어 버린다).
        setCoreOn(true);
        setFlashing(true);
        finishTimerRef.current = window.setTimeout(() => {
          finishTimerRef.current = null;
          onDone();
        }, 700);
      }
    }, 1150);
  };

  return (
    <div className="hc-quiz">
      <div className={`hc-flash${flashing ? " go" : ""}`} />
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

// 원본 finish()(영상 재생 + muted 폴백) + #endingVideo 의 ended 리스너 이식.
// 전체화면 불투명(z-index 110): hc-root(z-index 100) 는 이미 엔진 스테퍼(z-index 5) 위에
// 있으므로, 110은 hc-root 스태킹 컨텍스트 안에서 이 불투명 phase 들을 투명한 quiz phase
// 보다 위로 쌓기 위한 순서일 뿐이다("피날레 = 스테퍼 페이드아웃" 효과는 hc-root 자체가 준다).
function VideoPhase({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    // 원본 finish(): const attempt = video.play(); if(attempt) attempt.catch(()=>{video.muted=true; video.play()})
    const attempt = video.play();
    if (attempt) attempt.catch(() => {
      // 언마운트와 자동재생 거부(rejection)가 경합하면 이미 분리된 video 엘리먼트에
      // muted/play() 를 호출하지 않도록 가드한다.
      if (cancelled) return;
      video.muted = true;
      video.play().catch(() => {});
    });

    const onEnded = () => {
      video.pause();
      // 원본: Number.isFinite(video.duration) 이면 마지막 프레임 근처(duration-.04)에 정지.
      if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - 0.04);
      setEnded(true);
    };
    video.addEventListener("ended", onEnded);
    return () => {
      cancelled = true;
      video.removeEventListener("ended", onEnded);
      video.pause();
    };
  }, []);

  return (
    <div className="hc-video-root">
      <video
        ref={videoRef}
        className="hc-ending-video"
        preload="auto"
        playsInline
        src={IMG_VIDEO}
      />
      <div className={`hc-video-shade${ended ? " ready" : ""}`} />
      <button
        type="button"
        className={`hc-video-complete${ended ? " show" : ""}`}
        onClick={onDone}
      >
        복원 완료 확인
      </button>
    </div>
  );
}

const POST_TYPE_MS = 55; // 원본 typePostLine() 타자 속도
type EpilogueBgKey = keyof typeof EPILOGUE_BG;
const EPILOGUE_BG_ORDER: EpilogueBgKey[] = ["earth1", "earth2", "earth3", "school", "classroom"];

// 원본 startPostRecovery()/typePostLine()/completePostTyping()/advancePost() 이식.
// 전체화면 불투명(z-index 110): video phase 와 동일하게, hc-root 스태킹 컨텍스트 안에서
// 이 phase 를 quiz phase 보다 위로 쌓기 위한 순서다(엔진 스테퍼는 hc-root 자체가 덮는다).
function EpiloguePhase({ onDone }: { onDone: () => void }) {
  const [postIndex, setPostIndex] = useState(0);
  const [typed, setTyped] = useState("");
  // 원본 postTyping 초기값은 false — 진입 900ms 지연 동안은 타이핑 중이 아니라
  // advancePost() 의 typing 완성 분기가 아닌 배경 가드 분기를 타야 한다(조기 클릭 시 즉시완성 방지).
  const [typing, setTyping] = useState(false);
  const [bgActive, setBgActive] = useState<EpilogueBgKey>("earth1");
  const [blackoutGo, setBlackoutGo] = useState(false);

  // 배경 타임라인 setTimeout들 + 진입 900ms 지연 타이머를 함께 추적한다.
  const bgTimersRef = useRef<number[]>([]);
  const typeIntervalRef = useRef<number | null>(null);

  const clearBgTimers = () => {
    bgTimersRef.current.forEach((id) => window.clearTimeout(id));
    bgTimersRef.current = [];
  };

  // blackout 리빌: 마운트 시 1회(원본: go 클래스 제거→강제 reflow→go 클래스 추가).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setBlackoutGo(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // postIndex 가 바뀔 때마다: 배경 타임라인 재설정 + 해당 줄 타이핑 시작.
  useEffect(() => {
    clearBgTimers();
    if (typeIntervalRef.current !== null) {
      window.clearInterval(typeIntervalRef.current);
      typeIntervalRef.current = null;
    }

    const runLine = () => {
      if (postIndex === 0) {
        setBgActive("earth1");
        bgTimersRef.current.push(
          window.setTimeout(() => setBgActive("earth2"), 2800),
          window.setTimeout(() => setBgActive("earth3"), 5600),
        );
      } else if (postIndex === 1) {
        setBgActive("school");
        bgTimersRef.current.push(window.setTimeout(() => setBgActive("classroom"), 4800));
      } else {
        setBgActive("classroom");
      }

      const text = POST_LINES[postIndex];
      setTyped("");
      setTyping(true);
      const chars = Array.from(text);
      let i = 0;
      const id = window.setInterval(() => {
        i += 1;
        setTyped(chars.slice(0, i).join(""));
        if (i >= chars.length) {
          window.clearInterval(id);
          typeIntervalRef.current = null;
          setTyping(false);
        }
      }, POST_TYPE_MS);
      typeIntervalRef.current = id;
    };

    // 원본 startPostRecovery(): 900ms 지연은 첫 줄(index0)에만 걸리고, advancePost() 이후
    // 줄 전환(index1 이상)은 즉시 시작한다. ref 로 "이미 한 번 지연했다"를 추적하지 않는다 —
    // React StrictMode 의 effect 이중 실행(mount→cleanup→mount) 에서 ref 가 phantom 첫 실행에
    // 소비돼 실제 마운트에서 지연이 스킵되는 문제가 있었다. postIndex 자체로 판단하면 안전하다.
    if (postIndex === 0) {
      setBgActive("earth1");
      const t = window.setTimeout(runLine, 900);
      bgTimersRef.current.push(t);
    } else {
      runLine();
    }

    return () => {
      clearBgTimers();
      if (typeIntervalRef.current !== null) {
        window.clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
    };
  }, [postIndex]);

  const advance = () => {
    if (typing) {
      if (typeIntervalRef.current !== null) {
        window.clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
      setTyped(POST_LINES[postIndex]);
      setTyping(false);
      return;
    }
    // 가드: index0은 earth3, index1은 classroom 배경이 활성화된 뒤에만 진행(원본과 동일).
    if (postIndex === 0 && bgActive !== "earth3") return;
    if (postIndex === 1 && bgActive !== "classroom") return;
    if (postIndex < POST_LINES.length - 1) {
      setPostIndex(postIndex + 1);
    } else {
      onDone();
    }
  };

  // 클릭/Enter/Space 로 진행. advance() 가 참조하는 상태를 의존성으로 둬 재렌더마다 리바인딩되지 않게 한다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") advance();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [typing, postIndex, bgActive]);

  // 마지막 줄은 완성 시 '\n' 뒤를 강조 span 으로(원본 completePostTyping()).
  const renderText = () => {
    const text = POST_LINES[postIndex];
    if (!typing && postIndex === POST_LINES.length - 1 && text.includes("\n")) {
      const [first, last] = text.split("\n");
      return (
        <>
          {first}
          <br />
          <span className="hc-post-emphasis">{last}</span>
        </>
      );
    }
    return typed;
  };

  return (
    <div className="hc-epilogue-root" onClick={advance}>
      {EPILOGUE_BG_ORDER.map((key) => (
        <div
          key={key}
          className={`hc-post-bg${bgActive === key ? " active" : ""}`}
          style={{ backgroundImage: `url(${EPILOGUE_BG[key]})` }}
        />
      ))}
      <div className={`hc-post-blackout${blackoutGo ? " go" : ""}`} />
      <div className="hc-post-dialogue">
        <img className="hc-post-hati" src={HATI_DEFAULT} alt="기본 하티" />
        <span className="hc-post-speaker">하티</span>
        <p className={`hc-post-text${typing ? " typing" : ""}`}>{renderText()}</p>
        <span className="hc-post-next">▶</span>
      </div>
    </div>
  );
}

const FINAL_TYPE_MS = 58; // 원본 typeFinalLine() 타자 속도
const FINAL_FIRST_DELAY_MS = 650; // 원본 startFinalTyping() 진입 지연
const FINAL_SECOND_DELAY_MS = 380; // 원본 startFinalTyping() 1→2번째 줄 사이 지연

// 원본 #endingScreen(.success-ending) 이식: startFinalTyping()/typeFinalLine().
// 전체화면 불투명(z-index 110): video/epilogue phase 와 동일하게, hc-root 스태킹 컨텍스트
// 안에서 이 phase 를 quiz phase 보다 위로 쌓기 위한 순서다(엔진 스테퍼는 hc-root 자체가 덮는다).
function SuccessPhase({ onDone }: { onDone: () => void }) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [typing1, setTyping1] = useState(false);
  const [typing2, setTyping2] = useState(false);

  const delayTimerRef = useRef<number | null>(null);
  const typeIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const typeLine = (
      text: string,
      setText: (v: string) => void,
      setTyping: (v: boolean) => void,
      onComplete?: () => void,
    ) => {
      const chars = Array.from(text);
      let i = 0;
      setText("");
      setTyping(true);
      typeIntervalRef.current = window.setInterval(() => {
        i += 1;
        setText(chars.slice(0, i).join(""));
        if (i >= chars.length) {
          window.clearInterval(typeIntervalRef.current!);
          typeIntervalRef.current = null;
          setTyping(false);
          onComplete?.();
        }
      }, FINAL_TYPE_MS);
    };

    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      typeLine(FINAL_LINES[0], setLine1, setTyping1, () => {
        delayTimerRef.current = window.setTimeout(() => {
          delayTimerRef.current = null;
          typeLine(FINAL_LINES[1], setLine2, setTyping2);
        }, FINAL_SECOND_DELAY_MS);
      });
    }, FINAL_FIRST_DELAY_MS);

    return () => {
      if (delayTimerRef.current !== null) window.clearTimeout(delayTimerRef.current);
      if (typeIntervalRef.current !== null) window.clearInterval(typeIntervalRef.current);
    };
  }, []);

  return (
    <div className="hc-success-root" style={{ backgroundImage: `url(${IMG_SUCCESS_BG})` }}>
      <img
        className="hc-success-logo"
        src={IMG_TITLE_BANNER}
        alt="하트 가디언즈 우주 공감 탐험대"
      />
      <div className="hc-success-burst">
        <img className="hc-success-banner-img" src={IMG_SUCCESS_BANNER} alt="탐험대 성공!" />
        <div className="hc-success-sparkles">
          <span>✦</span>
          <span>★</span>
          <span>✦</span>
          <span>★</span>
          <span>✦</span>
          <span>✦</span>
          <span>★</span>
          <span>✦</span>
        </div>
      </div>
      <div className="hc-success-message">
        <p className={`hc-final-typed-line${typing1 ? " typing" : ""}`}>{line1}</p>
        <p className={`hc-final-typed-line hc-final-line-two${typing2 ? " typing" : ""}`}>
          {line2}
        </p>
        <button type="button" className="hc-restart" onClick={onDone}>
          우주선으로 이동
        </button>
      </div>
    </div>
  );
}
