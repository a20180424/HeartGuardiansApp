import {
  useEffect,
  useReducer,
  useRef,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DialogueRunner } from "../engine/runner";
import type { MissionData, MissionNode, RunnerView, Choice, Command, MissionTheme } from "../engine/types";
import { useFitStage } from "../../../lib/useFitStage";
import { AudioManager } from "./audio";
import "./mission.css";

type Spark = { id: number; left: number; top: number; ch: string; delay: number; size: number };

interface VM {
  mode: "idle" | "typing" | "await" | "choices" | "end";
  bubbleKind: "none" | "hatiBox" | "hatiBubble" | "lumiBubble";
  text: string;
  intro: boolean;
  choices: Choice[];
  exploredSet: Set<number> | null;
  pick: ((i: number, c: Choice) => void) | null;
  lumi: string;
  hati: string;
  radar: string;
  radarPulse: boolean;
  bg: string;
  lumiGlow: boolean;
  bright: boolean;
  empathy: boolean;
  progress: "start" | "done";
  tapHint: string;
  showNext: boolean;
  ended: boolean;
  sparks: Spark[];
  muted: boolean;
  dragNode: boolean;
  dzShow: boolean;
  debug: string;
  debugId: string;
  debugCopied: boolean; // 노드 id 오버레이(디버깅용, production 제거 예정)
}

const HATI_FULL = "/assets/char/Hati/hati_robot_explaining.png";

// 비보안 컨텍스트(예: Capacitor file://)에서 navigator.clipboard가 없을 때의 복사 fallback
function fallbackCopy(text: string, onDone: () => void) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    onDone();
  } catch {
    /* noop */
  }
}

export default function MissionPlayer(props: {
  scenarioUrl: string;
  theme: MissionTheme;
  onExit: () => void;
}) {
  const { scenarioUrl, theme } = props;
  const [, force] = useReducer((x) => x + 1, 0);
  const stageRef = useRef<HTMLDivElement>(null);
  useFitStage(stageRef);

  const audioRef = useRef<AudioManager>(null);
  if (!audioRef.current) audioRef.current = new AudioManager();
  const audio = audioRef.current;

  const vm = useRef<VM>({
    mode: "idle",
    bubbleKind: "none",
    text: "",
    intro: false,
    choices: [],
    exploredSet: null,
    pick: null,
    lumi: theme.lumiSprites.initial,
    hati: theme.hatiSprites.initial,
    radar: theme.radar.initial,
    radarPulse: false,
    bg: theme.bg.initial,
    lumiGlow: false,
    bright: false,
    empathy: false,
    progress: "start",
    tapHint: "",
    showNext: false,
    ended: false,
    sparks: [],
    muted: audioRef.current.muted,
    dragNode: false,
    dzShow: false,
    debug: "",
    debugId: "",
    debugCopied: false,
  }).current;

  const timers = useRef<{
    typer?: number;
    auto?: number;
    finish?: () => void;
    resolve?: () => void;
  }>({}).current;
  const sparkId = useRef(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  // q4 드래그 상태(원본 view.js _enableCardDrag 이식). 한 번에 한 장만 드래그.
  const dnd = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scale: number;
    moved: number;
    card: HTMLButtonElement | null;
    idx: number;
    choice: Choice | null;
    pick?: (i: number, c: Choice) => void;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    scale: 1,
    moved: 0,
    card: null,
    idx: -1,
    choice: null,
  }).current;

  useEffect(() => {
    let alive = true;
    const render = () => {
      if (alive) force();
    };

    const sparkleBurst = () => {
      const glyphs = ["✨", "⭐", "💫", "🌟"];
      for (let i = 0; i < 16; i++) {
        const s: Spark = {
          id: sparkId.current++,
          ch: glyphs[i % glyphs.length],
          left: 480 + Math.random() * 1100,
          top: 180 + Math.random() * 760,
          delay: Math.random() * 0.5,
          size: 28 + Math.random() * 36,
        };
        vm.sparks.push(s);
        window.setTimeout(() => {
          vm.sparks = vm.sparks.filter((x) => x.id !== s.id);
          render();
        }, 1300);
      }
      render();
    };

    const RADAR_ORDER = ["p25", "p50", "p75", "p100", "active"];
    const setSprite = (kind: "lumi" | "hati" | "radar", state?: string) => {
      if (!state) return;
      if (kind === "radar") {
        if (state === vm.radar) return;
        // 진행도가 올라갈 때만(아래로 내려갈 땐 무음) 단계 진입음 재생 — 원본과 동일
        if (RADAR_ORDER.indexOf(state) > RADAR_ORDER.indexOf(vm.radar)) audio.play("stage");
        vm.radar = state;
        vm.radarPulse = true;
        window.setTimeout(() => {
          vm.radarPulse = false;
          render();
        }, 1100);
      } else if (kind === "lumi") vm.lumi = state;
      else vm.hati = state;
      render();
    };

    const updateScene = (node: MissionNode) => {
      setSprite("lumi", theme.lumiSprites.byNode[node.id]);
      setSprite("hati", theme.hatiSprites.byNode[node.id]);
      setSprite("radar", theme.radar.byNode[node.id]);
      const bg = theme.bg.byNode[node.id];
      if (bg) vm.bg = bg; // 배경 교체(sparse, 지정 노드까지 유지)
      vm.intro = node.id === theme.bannerNode; // 인트로: 타이틀배너+전신하티 표시, 루미 숨김
      if (vm.intro) audio.play("title");
      const s = theme.sfx.byNode[node.id]; // 반응 노드 감정 피드백음(정답/오답)
      if (s) audio.play(s);
      render();
    };

    const execFx = (name: string) => {
      switch (name) {
        case "sparkle":
          audio.play("sparkle");
          sparkleBurst();
          break;
        case "signalRecover":
          audio.play("recover");
          vm.lumi = "recovered";
          vm.lumiGlow = true;
          sparkleBurst();
          render();
          break;
        case "empathyCard":
          audio.play("reveal");
          vm.empathy = true;
          sparkleBurst();
          render();
          break;
        case "lightReturn":
          audio.play("fanfare");
          vm.bright = true;
          vm.progress = "done";
          vm.showNext = true;
          sparkleBurst();
          render();
          break;
        default:
          break;
      }
    };

    const typeInto = (txt: string, onDone: () => void) => {
      vm.text = "";
      vm.mode = "typing";
      render();
      let i = 0;
      window.clearInterval(timers.typer);
      timers.typer = window.setInterval(() => {
        vm.text = txt.slice(0, ++i);
        render();
        if (i >= txt.length) {
          window.clearInterval(timers.typer);
          onDone();
        }
      }, 30);
      timers.finish = () => {
        window.clearInterval(timers.typer);
        vm.text = txt;
        render();
        onDone();
      };
    };

    const advanceLine = () => {
      window.clearTimeout(timers.auto);
      vm.tapHint = "";
      vm.mode = "idle";
      render();
      const r = timers.resolve;
      timers.resolve = undefined;
      if (r) r();
    };

    const view: RunnerView = {
      reset() {
        Object.assign(vm, {
          mode: "idle",
          bubbleKind: "none",
          text: "",
          intro: false,
          choices: [],
          exploredSet: null,
          pick: null,
          lumi: theme.lumiSprites.initial,
          hati: theme.hatiSprites.initial,
          radar: theme.radar.initial,
          radarPulse: false,
          bg: theme.bg.initial,
          lumiGlow: false,
          bright: false,
          empathy: false,
          progress: "start",
          tapHint: "",
          showNext: false,
          ended: false,
          sparks: [],
          dragNode: false,
          dzShow: false,
          debug: "",
          debugId: "",
          debugCopied: false,
        });
        render();
      },
      setDebug(node: MissionNode) {
        const type = node.type || (node.choices ? "choice" : "line");
        vm.debug = `node: ${node.id}  ·  ${type}${node.speaker ? "  ·  " + node.speaker : ""}`;
        vm.debugId = node.id;
        vm.debugCopied = false;
        render();
      },
      execCommands(cmds: Command[] | undefined) {
        (cmds || []).forEach((c) => {
          if (c.cmd === "fx") execFx(theme.fx[c.value || ""] || c.value || "");
        });
      },
      showLine(node, onTyped) {
        return new Promise<void>((resolve) => {
          timers.resolve = resolve;
          updateScene(node);
          vm.choices = [];
          vm.pick = null;
          vm.dragNode = false;
          vm.dzShow = false; // 라인 진입 시 드래그 dropZone 숨김
          const isHati = node.speaker === "hati";
          const introHati = isHati && node.id === theme.bannerNode;
          vm.bubbleKind = introHati ? "hatiBubble" : isHati ? "hatiBox" : "lumiBubble";
          render();
          typeInto(node.text || "", () => {
            vm.mode = "await";
            onTyped?.();
            vm.tapHint = node.next ? "▼ 화면을 탭하면 계속" : "🎉 미션 완료!";
            render();
            window.clearTimeout(timers.auto);
            timers.auto = window.setTimeout(() => {
              if (vm.mode === "await") advanceLine();
            }, 2000);
          });
        });
      },
      showChoices(node, exploredSet, pick) {
        updateScene(node);
        vm.mode = "choices";
        vm.tapHint = "";
        // 원본 view.js와 동일: 선택지 화면에서도 직전 하티박스 멘트를 유지한다
        // (인트로 말풍선/루미 말풍선만 감추고, hatiBox는 그대로 둔다).
        if (vm.bubbleKind !== "hatiBox") vm.bubbleKind = "none";
        vm.choices = node.choices || [];
        vm.exploredSet = exploredSet;
        // 드래그 노드(q4): 카드를 루미 빈 말풍선(#dropZone)으로 끌어 답한다. 탭도 선택 fallback.
        vm.dragNode = !!(theme.drag && node.id === theme.drag.node);
        vm.dzShow = vm.dragNode;
        dnd.pick = pick; // 드래그 확정 시 호출할 원본 pick (래퍼 우회)
        vm.pick = (idx, choice) => {
          if (vm.mode !== "choices") return;
          vm.mode = "idle";
          vm.choices = [];
          render();
          pick(idx, choice);
        };
        render();
        audio.play("pop");
      },
      end() {
        vm.mode = "end";
        vm.ended = true;
        render();
      },
    };

    fetch(scenarioUrl, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MissionData) => {
        if (!alive) return;
        const runner = new DialogueRunner(data, view);
        (window as unknown as { __runner: DialogueRunner }).__runner = runner;
        runner.start();
      });

    return () => {
      alive = false;
      window.clearInterval(timers.typer);
      window.clearTimeout(timers.auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioUrl]);

  // 배경 이미지 미리 로드 — 엔딩(m1_end3)에서 stage2로 교체될 때 깜빡임 방지.
  useEffect(() => {
    Object.values(theme.bg.states).forEach((src) => {
      const im = new Image();
      im.src = src;
    });
  }, [theme]);

  // 브라우저 자동재생 정책: 첫 사용자 제스처(탭)에서 오디오 컨텍스트를 깨운다.
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, [audio]);

  const onStageClick = () => {
    if (vm.mode === "typing") timers.finish?.();
    else if (vm.mode === "await") {
      audio.play("tap");
      window.clearTimeout(timers.auto);
      vm.tapHint = "";
      vm.mode = "idle";
      force();
      const r = timers.resolve;
      timers.resolve = undefined;
      r?.();
    }
  };

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    audio.unlock();
    vm.muted = audio.toggleMute();
    force();
  };

  // 디버그 오버레이 클릭 → node id 클립보드 복사(개발용). 비보안 컨텍스트 fallback 포함.
  const copyDebugId = (e: MouseEvent) => {
    e.stopPropagation();
    const id = vm.debugId;
    if (!id) return;
    const done = () => {
      vm.debugCopied = true;
      force();
      window.setTimeout(() => {
        vm.debugCopied = false;
        force();
      }, 1000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(id)
        .then(done)
        .catch(() => fallbackCopy(id, done));
    } else {
      fallbackCopy(id, done);
    }
  };

  // ---------- q4 카드 드래그 (원본 view.js _enableCardDrag 이식) ----------
  // 스테이지가 CSS scale 되므로 포인터 델타를 scale로 나눠 손가락 아래로 카드를 이동.
  // move/up은 window에 붙인다(React 위임 + 카드가 커서 밑에서 이동하는 문제, 포인터가
  // 카드 밖으로 나가는 문제 회피). #dropZone(마진 44px) 위에서 놓으면 선택, 거의 안
  // 움직인 탭도 선택, 그 외엔 snapback.
  const stageScale = () => (stageRef.current?.getBoundingClientRect().width || 1920) / 1920 || 1;
  const overDropZoneXY = (x: number, y: number) => {
    const dz = dropZoneRef.current;
    if (!dz) return false;
    const r = dz.getBoundingClientRect();
    const m = 44;
    return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
  };
  const onCardDown = (e: ReactPointerEvent<HTMLButtonElement>, idx: number, choice: Choice) => {
    if (vm.mode !== "choices") return;
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget;
    dnd.active = true;
    dnd.moved = 0;
    dnd.scale = stageScale();
    dnd.startX = e.clientX;
    dnd.startY = e.clientY;
    dnd.idx = idx;
    dnd.choice = choice;
    dnd.card = card;
    card.classList.add("dragging");
    audio.play("pop");

    const move = (ev: PointerEvent) => {
      if (!dnd.active || !dnd.card) return;
      const dx = (ev.clientX - dnd.startX) / dnd.scale,
        dy = (ev.clientY - dnd.startY) / dnd.scale;
      dnd.moved = Math.max(dnd.moved, Math.hypot(ev.clientX - dnd.startX, ev.clientY - dnd.startY));
      dnd.card.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
      dropZoneRef.current?.classList.toggle("over", overDropZoneXY(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      if (!dnd.active) return;
      dnd.active = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const card2 = dnd.card;
      dnd.card = null;
      if (!card2) return;
      const over = overDropZoneXY(ev.clientX, ev.clientY);
      const accept = (over || dnd.moved < 8) && vm.mode === "choices";
      dropZoneRef.current?.classList.remove("over");
      if (accept) {
        vm.mode = "idle";
        audio.play("drop");
        dropZoneRef.current?.classList.add("filled");
        card2.classList.add("landing");
        card2.style.transform = (card2.style.transform || "") + " scale(.32)";
        card2.style.opacity = "0";
        const i = dnd.idx,
          c = dnd.choice;
        window.setTimeout(() => {
          if (c) dnd.pick?.(i, c);
        }, 240);
      } else {
        audio.play("whoosh");
        card2.classList.remove("dragging");
        card2.classList.add("snapback");
        card2.style.transform = "";
        window.setTimeout(() => card2.classList.remove("snapback"), 240);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const many = vm.choices.length >= 4;
  const m1cls = vm.progress === "done" ? "done" : "active";
  const m2cls = vm.progress === "done" ? "active" : "locked";

  return (
    <div id="viewport">
      <div id="stage" ref={stageRef} className={vm.bright ? "bright" : ""} onClick={onStageClick}>
        <img id="bg" src={theme.bg.states[vm.bg]} alt="" />
        <div id="lightOverlay" />

        {/* 진행 스테퍼 */}
        <div id="progress">
          <div className="prog-title">
            <span className="star">⭐</span>
            <span>탐험 진행도</span>
          </div>
          <div className="stepper">
            <div className={`pnode ${m1cls}`} id="mission1">
              <div className="circle">
                <span className="num">1</span>
              </div>
              <div className="label">
                마음 신호
                <br />
                탐색기
              </div>
            </div>
            <div className={`connector${vm.progress === "done" ? " filled" : ""}`} id="conn1" />
            <div className={`pnode ${m2cls}`} id="mission2">
              <div className="circle">
                <span className="num">2</span>
              </div>
              <div className="label">
                공감 거울
                <br />
                깨우기
              </div>
            </div>
            <div className="connector" id="conn2" />
            <div className="pnode locked" id="mission3">
              <div className="circle">
                <span className="num">3</span>
              </div>
              <div className="label">
                공감 없는
                <br />
                세상으로
              </div>
            </div>
          </div>
        </div>

        {/* 레이더 */}
        <img
          id="radar"
          className={vm.radarPulse ? "pulse" : ""}
          src={theme.radar.states[vm.radar]}
          alt="마음 신호 탐색기"
        />

        {/* 인트로 타이틀 배너 */}
        <div id="titleBanner" className={vm.intro ? "show" : ""}>
          <div className="tb-badge">
            <span className="tb-star">★</span>
            <span className="tb-pill">미션 1</span>
            <span className="tb-star">★</span>
          </div>
          <div className="tb-title">마음 신호 탐색기</div>
          <div className="tb-ribbon">
            <span className="tb-spark">✦</span>
            <span>친구의 마음을 찾아라!</span>
            <span className="tb-spark">✦</span>
          </div>
        </div>

        {/* 인트로 전신 하티 */}
        <img id="hatiFull" className={vm.intro ? "show" : ""} src={HATI_FULL} alt="하티" />

        {/* 인트로 하티 말풍선 */}
        <div id="hatiBubble" className={`bubble${vm.bubbleKind === "hatiBubble" ? " show" : ""}`}>
          <div className="bubble-name">하티</div>
          <span>{vm.bubbleKind === "hatiBubble" ? vm.text : ""}</span>
        </div>

        {/* 루미 */}
        <div id="lumiWrap" className={`${vm.intro ? "hide" : ""}${vm.lumiGlow ? " glow" : ""}`}>
          <img id="lumi" className="pop" src={theme.lumiSprites.char[vm.lumi]} alt="루미" />
        </div>

        {/* 루미 말풍선 */}
        <div id="lumiBubble" className={`bubble${vm.bubbleKind === "lumiBubble" ? " show" : ""}`}>
          <span>{vm.bubbleKind === "lumiBubble" ? vm.text : ""}</span>
        </div>

        {/* 드래그 드롭 타깃: 루미의 빈 말풍선 (q4 드래그 전용) */}
        <div id="dropZone" ref={dropZoneRef} className={vm.dzShow ? "show" : ""}>
          <div className="dz-heart">♡</div>
          <div className="dz-hint">여기에 놓아요</div>
        </div>

        {/* 선택지 카드 */}
        <div id="choices" className={vm.choices.length > 0 ? "show" : ""}>
          {vm.choices.map((c, idx) => {
            const deco = theme.choiceIcons[c.text] || { emoji: "💭", bg: "#eef2f7" };
            const explored = vm.exploredSet?.has(idx);
            const dragCard = vm.dragNode && !explored;
            return (
              <button
                key={idx}
                className={`card${many ? " smaller" : ""}${explored ? " done" : ""}`}
                disabled={!!explored}
                onClick={
                  dragCard
                    ? (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      } // 드래그 카드: 합성 클릭 무시(선택은 pointerup에서)
                    : (e) => {
                        e.stopPropagation();
                        audio.play("select");
                        vm.pick?.(idx, c);
                      }
                }
                onPointerDown={dragCard ? (e) => onCardDown(e, idx, c) : undefined}
              >
                <div
                  className="badge"
                  style={{ background: theme.badgeColors[idx % theme.badgeColors.length] }}
                >
                  {idx + 1}
                </div>
                <div className="icon" style={{ background: deco.bg }}>
                  {deco.emoji}
                </div>
                <div className="ctext">{c.text}</div>
              </button>
            );
          })}
        </div>

        {/* 공감 카드 (엔딩) */}
        <img
          id="empathyCard"
          className={vm.empathy ? "show" : ""}
          src="/assets/ui/empathy_card.png"
          alt="공감 카드"
        />

        {/* 하티 가이드 박스 */}
        <div id="hatiBox" className={vm.bubbleKind === "hatiBox" ? "show" : ""}>
          <img id="hatiAvatar" className="pop" src={theme.hatiSprites.char[vm.hati]} alt="하티" />
          <div>
            <div id="hatiName">{theme.speakers.hati.name}</div>
            <div id="hatiText">{vm.bubbleKind === "hatiBox" ? vm.text : ""}</div>
          </div>
        </div>

        {vm.showNext && (
          <button
            id="nextBtn"
            onClick={(e) => {
              e.stopPropagation();
              props.onExit();
            }}
          >
            다음 미션으로 <span>➜</span>
          </button>
        )}

        {/* 디버그 노드 오버레이 (개발용 — production 제거 예정). 클릭 시 node id 복사 */}
        {vm.debug && (
          <div
            id="debug"
            className={vm.debugCopied ? "copied" : ""}
            onClick={copyDebugId}
            title="클릭하면 node id 복사"
          >
            {vm.debugCopied ? `✓ 복사됨: ${vm.debugId}` : vm.debug}
          </div>
        )}

        <div id="tapHint" className={vm.tapHint ? "show" : ""}>
          {vm.tapHint}
        </div>

        <div id="fxLayer">
          {vm.sparks.map((s) => (
            <div
              key={s.id}
              className="spark"
              style={{ left: s.left, top: s.top, fontSize: s.size, animationDelay: `${s.delay}s` }}
            >
              {s.ch}
            </div>
          ))}
        </div>
      </div>

      <button
        id="muteBtn"
        className={vm.muted ? "off" : ""}
        onClick={toggleMute}
        aria-label="소리 켜기/끄기"
      >
        {vm.muted ? "🔇" : "🔊"}
      </button>
      <button id="missionExit" className="btn ghost" onClick={props.onExit}>
        ← 홈
      </button>
    </div>
  );
}
