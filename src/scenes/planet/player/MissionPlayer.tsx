import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type ComponentType,
} from "react";
import { DialogueRunner } from "../engine/runner";
import type {
  MissionData,
  MissionNode,
  RunnerView,
  Choice,
  Command,
  MissionTheme,
  MirrorReveal,
} from "../engine/types";
import { useFitStage } from "../../../lib/useFitStage";
import { AudioManager } from "./audio";
import MirrorStage from "./MirrorStage";
import RubReveal from "./RubReveal";
import "./mission.css";

type Spark = { id: number; left: number; top: number; ch: string; delay: number; size: number };

interface VM {
  mode: "idle" | "typing" | "await" | "choices" | "end";
  bubbleKind: "none" | "hatiBox" | "hatiBubble" | "friendBubble";
  text: string;
  intro: boolean; // 타이틀 배너 표시(= bannerNode 노드에서만). 인트로 오디오·루미 숨김도 여기 묶임
  fullHati: boolean; // 전신 하티(#hatiFull) 표시. bannerNode ∪ fullHatiNodes 에서 켬(타이틀 배너와 분리)
  choices: Choice[];
  choicePrompt: string; // 선택지 카드 위 안내 문구(없으면 "")
  exploredSet: Set<number> | null;
  pick: ((i: number, c: Choice) => void) | null;
  friendId: string; // 화면에 보이는 현재 친구 id(가장 최근에 말한 친구)
  friend: string; // 그 친구의 현재 스프라이트 키
  heldText: string; // hold로 계속 띄워두는 친구 대사(비어 있으면 유지 없음)
  heldSprite: string; // 그 유지 대사와 짝이 되는 표정(복귀 시 함께 되돌린다)
  hati: string;
  radar: string;
  radarPulse: boolean;
  radarShown: boolean; // 레이더 HUD 표시 여부(노드별 sparse 제어, theme.showRadar 와 별개)
  castMembers: { img: string; name?: string }[]; // 플레이트 위 캐릭터 레이어(노드별 sparse 교체)
  bg: string;
  hideFriend: boolean; // 이 노드에서 친구 캐릭터 레이어를 숨김(하티만 말하는 전환 구간)
  lesson: { title: string; sub: string } | null; // 교훈 배너(있으면 금색 배너 표시)
  sideImage: string; // 우측 가운데 장식 이미지 경로(있으면 표시, "" 이면 숨김)
  sideImageLeft: string; // 좌측 가운데 장식 이미지 경로(있으면 표시, "" 이면 숨김)
  choiceImage: string; // 화면 가운데 크게 띄우는 이미지(node.image, 없으면 "")
  stackImages: string[]; // 화면 가운데 세로로 쌓는 이미지들(node.images, 없으면 [])
  cards: { image: string; top?: string; bottom?: string }[]; // 가운데 가로 카드들(node.cards)
  mirrorImage: string; // 우측 하단 공감 거울 이미지(node.mirrorImage, 없으면 "")
  completeBanner: string; // 화면 가운데 "미션 완료!" 배너 문구(node.completeBanner, 없으면 "")
  friendGlow: boolean;
  bright: boolean;
  empathy: boolean;
  bookGlow: boolean; // 완성 이미지(node.image) 뒤 금빛 후광(fx로 켬, choiceImage 있을 때만 표시)
  progress: "start" | "done";
  tapHint: string;
  showNext: boolean;
  ended: boolean;
  sparks: Spark[];
  dragNode: boolean;
  dzShow: boolean;
  // 공감 거울 특별 파트(화면 A: mirrors / 화면 B: gauge / reveal: 긁어서 드러내기)
  stage: "none" | "mirrors" | "gauge" | "reveal" | "minigame";
  sHideBubbles: boolean; // 거울/게이지 캐릭터 말풍선 숨김(대사가 이미지에 포함된 경우)
  sBanner: string;
  sPrompt: string;
  // mirrors
  sCard: string;
  sTargets: {
    friend: string;
    title: string;
    line: string;
    onDrop: string;
    bubble: string;
    done: boolean;
    charImage: string;
    dropImage: string;
  }[];
  sActive: number;
  sRevealPhase: "none" | "await" | "done";
  sRevealFriend: string;
  // gauge
  sFriend: string;
  sFriendLine: string;
  sHeader: string;
  sGaugeImage: string; // 거울 안을 통째로 채우는 이미지("" 이면 friend 스프라이트 + 말풍선 사용)
  sOptions: { icon: string; title: string; desc: string; fill: number }[];
  // reveal(긁어서 드러내기)
  rPairs: { before: string; after: string }[];
  rMirror: string;
  rThreshold: number;
  videoSrc: string; // type:"video" 재생 중인 동영상 경로(없으면 "")
  videoStarted: boolean; // '재생 시작' 버튼을 눌러 재생을 시작했는지(버튼 숨김용)
  gameId: string; // type:"minigame" 렌더할 게임 식별자(games 맵 키). 없으면 ""
  debug: string;
  debugId: string;
  debugCopied: boolean; // 노드 id 오버레이(디버깅용, production 제거 예정)
  debugShown: boolean; // 오버레이 표시 여부 — 기본 숨김, 'n' 키로 토글
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
  scenario: MissionData;
  theme: MissionTheme;
  onExit: () => void;
  currentStep?: number; // 진행 스테퍼에서 이 미션이 몇 번째인지(1~3). 기본 1.
  steps?: string[]; // 진행 스테퍼 라벨(미션 이름) 3개. 없으면 기존 planet1 라벨.
  // 행성별 스코프 클래스(예: "planet2"). #viewport 에 붙여 공유 CSS 를 행성 단위로 오버라이드.
  scopeClass?: string;
  // 엔딩 완료 버튼 커스터마이즈(마지막 미션 등). 없으면 기본 "다음 미션으로".
  //  · icon: 아이콘 이미지 + label 텍스트(.ship 변형)
  //  · image: 텍스트 없이 버튼 전체를 이미지 하나로(.img-only 변형, label 은 alt 로만 사용)
  finish?: { label: string; icon?: string; image?: string };
  // type:"minigame" 노드가 참조하는 게임 컴포넌트 맵(node.game → 컴포넌트). 완료 시 onDone 호출.
  games?: Record<string, ComponentType<{ onDone: () => void }>>;
}) {
  const { scenario, theme } = props;
  const [, force] = useReducer((x) => x + 1, 0);
  const stageRef = useRef<HTMLDivElement>(null);
  useFitStage(stageRef);

  const audioRef = useRef<AudioManager>(null);
  if (!audioRef.current) audioRef.current = new AudioManager();
  const audio = audioRef.current;

  // 완료/나가기 버튼 더블탭 가드 — onExit이 미션당 한 번만 실행되게 한다.
  // onExit은 completePlanet(서버 PUT) 후 화면 전환을 하는데, 그 await 동안 버튼이
  // 활성인 채라 재탭하면 중복 저장·중복 전환이 날 수 있다. scenario가 바뀌면(=다음 미션)
  // 가드를 풀어 다음 미션의 버튼은 다시 눌리게 한다.
  const exitingRef = useRef(false);
  useEffect(() => {
    exitingRef.current = false;
  }, [scenario]);
  const handleExit = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    force(); // 버튼을 disabled 상태로 다시 그려 시각 피드백을 준다
    props.onExit();
  };

  const vm = useRef<VM>({
    mode: "idle",
    bubbleKind: "none",
    text: "",
    intro: false,
    fullHati: false,
    choices: [],
    choicePrompt: "",
    exploredSet: null,
    pick: null,
    friendId: theme.initialFriend,
    friend: theme.friends[theme.initialFriend].initial,
    heldText: "",
    heldSprite: "",
    hati: theme.hatiSprites.initial,
    radar: theme.radar.initial,
    radarPulse: false,
    radarShown: true,
    castMembers: theme.cast?.members ?? [],
    bg: theme.bg.initial,
    hideFriend: false,
    lesson: null,
    sideImage: "",
    sideImageLeft: "",
    choiceImage: "",
    stackImages: [],
    cards: [],
    mirrorImage: "",
    completeBanner: "",
    friendGlow: false,
    bright: false,
    empathy: false,
    bookGlow: false,
    progress: "start",
    tapHint: "",
    showNext: false,
    ended: false,
    sparks: [],
    dragNode: false,
    dzShow: false,
    stage: "none",
    sHideBubbles: false,
    sBanner: "",
    sPrompt: "",
    sCard: "",
    sTargets: [],
    sActive: -1,
    sRevealPhase: "none",
    sRevealFriend: "",
    sFriend: "",
    sFriendLine: "",
    sHeader: "",
    sGaugeImage: "",
    sOptions: [],
    rPairs: [],
    rMirror: "",
    rThreshold: 0.85,
    videoSrc: "",
    videoStarted: false,
    gameId: "",
    debug: "",
    debugId: "",
    debugCopied: false,
    debugShown: false,
  }).current;

  const timers = useRef<{
    typer?: number;
    auto?: number;
    finish?: () => void;
    resolve?: () => void;
  }>({}).current;
  const sparkId = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null); // type:"video" 재생 엘리먼트(탭 재생 폴백용)
  const friendWrapRef = useRef<HTMLDivElement>(null); // q4 드래그 드롭 타깃 = 친구 캐릭터
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

  // 공감 거울 특별 파트: view 메서드(useEffect 내부)가 채우고 컴포넌트 본문 핸들러가 읽는 공유 상태.
  const msCardRef = useRef<HTMLButtonElement>(null);
  const msMirrorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ms = useRef<{
    done?: () => void;
    reveal?: MirrorReveal | null;
    node?: MissionNode;
  }>({}).current;

  // useLayoutEffect: 러너가 시작 노드로 진입하는 상태 전환을 첫 페인트 '전에' 끝낸다.
  // useEffect(페인트 후 실행)면 vm 초기값(stage:"none"·기본 배경·초기 친구)이 한 프레임
  // 먼저 그려져 미니게임으로 바로 시작하는 미션(예: 행성3 미션2)에서 배경/친구가 깜빡인다.
  // useFitStage 와 같은 패턴·같은 목적.
  useLayoutEffect(() => {
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
    const setSprite = (kind: "friend" | "hati" | "radar", state?: string) => {
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
      } else if (kind === "friend") vm.friend = state;
      else vm.hati = state;
      render();
    };

    const updateScene = (node: MissionNode) => {
      // 친구 line이면 화면의 활성 친구를 전환하고, 새 친구면 스프라이트를 그 친구 기본값으로 리셋.
      if (node.speaker && node.speaker !== "hati" && node.speaker !== vm.friendId) {
        vm.friendId = node.speaker;
        vm.friend = theme.friends[vm.friendId]?.initial ?? vm.friend;
        vm.heldText = ""; // 다른 친구 등장 → 이전 친구의 유지 대사/표정 비움
        vm.heldSprite = "";
      }
      // hold:true → 이 대사(와 그때의 표정)를 계속 유지. hold:false → 유지 해제.
      if (node.hold === true && node.text) {
        vm.heldText = node.text;
        vm.heldSprite =
          theme.friends[vm.friendId]?.byNode[node.id] ?? theme.friends[vm.friendId]?.initial ?? vm.friend;
      } else if (node.hold === false) {
        vm.heldText = "";
        vm.heldSprite = "";
      }
      setSprite("friend", theme.friends[vm.friendId]?.byNode[node.id]);
      setSprite("hati", theme.hatiSprites.byNode[node.id]);
      setSprite("radar", theme.radar.byNode[node.id]);
      const rShow = theme.radarShow?.[node.id];
      if (rShow !== undefined) vm.radarShown = rShow; // 레이더 HUD 표시 토글(sparse, 지정 노드부터 유지)
      const cb = theme.cast?.byNode?.[node.id];
      if (cb) vm.castMembers = cb; // 플레이트 위 캐릭터 레이어 교체(sparse, 지정 노드부터 유지)
      const bg = theme.bg.byNode[node.id];
      if (bg) vm.bg = bg; // 배경 교체(sparse, 지정 노드까지 유지)
      vm.hideFriend = !!node.hideFriend; // 친구 없이 하티만 말하는 전환 노드면 친구 레이어 숨김
      vm.lesson = null; // 노드 전환 시 교훈 배너 해제(라인 노드면 showLine 에서 다시 설정)
      vm.sideImage = node.sideImage || ""; // 우측 장식 이미지(지정 노드에서만)
      vm.sideImageLeft = node.sideImageLeft || ""; // 좌측 장식 이미지(지정 노드에서만)
      vm.choiceImage = node.image || ""; // 화면 가운데 이미지(node.image, 지정 노드에서만)
      vm.stackImages = node.images || []; // 화면 가운데 세로 스택 이미지들(node.images)
      vm.cards = node.cards || []; // 화면 가운데 가로 카드들(node.cards)
      vm.mirrorImage = node.mirrorImage || ""; // 우측 하단 공감 거울(node.mirrorImage)
      vm.completeBanner = node.completeBanner || ""; // 가운데 완료 배너(node.completeBanner)
      vm.intro = node.id === theme.bannerNode; // 인트로: 타이틀배너 표시 + 인트로 오디오, 루미 숨김
      // 전신 하티: bannerNode(인트로) ∪ theme.fullHatiNodes(추가 지정 노드). 타이틀 배너와는 분리.
      vm.fullHati = vm.intro || !!theme.fullHatiNodes?.includes(node.id);
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
          // 스프라이트 교체는 노드의 byNode 매핑이 담당. 여기선 후광만 켠다(친구 무관).
          vm.friendGlow = true;
          sparkleBurst();
          render();
          break;
        case "empathyCard":
          audio.play("reveal");
          vm.empathy = true;
          sparkleBurst();
          render();
          break;
        case "empathyCardHide":
          vm.empathy = false;
          render();
          break;
        case "resultGlow":
          // 완성 이미지(감정 설명서) 뒤 금빛 후광 + 반짝임 버스트(완료 축하).
          audio.play("reveal");
          vm.bookGlow = true;
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
          fullHati: false,
          choices: [],
          choicePrompt: "",
          exploredSet: null,
          pick: null,
          friendId: theme.initialFriend,
          friend: theme.friends[theme.initialFriend].initial,
          heldText: "",
          heldSprite: "",
          hati: theme.hatiSprites.initial,
          radar: theme.radar.initial,
          radarPulse: false,
          radarShown: true,
          castMembers: theme.cast?.members ?? [],
          bg: theme.bg.initial,
          hideFriend: false,
          lesson: null,
          sideImage: "",
          sideImageLeft: "",
          choiceImage: "",
          stackImages: [],
          cards: [],
          mirrorImage: "",
          completeBanner: "",
          friendGlow: false,
          bright: false,
          empathy: false,
          bookGlow: false,
          progress: "start",
          tapHint: "",
          showNext: false,
          ended: false,
          sparks: [],
          dragNode: false,
          dzShow: false,
          stage: "none",
          sHideBubbles: false,
          sBanner: "",
          sPrompt: "",
          sCard: "",
          sTargets: [],
          sActive: -1,
          sRevealPhase: "none",
          sRevealFriend: "",
          sFriend: "",
          sFriendLine: "",
          sHeader: "",
          sGaugeImage: "",
          sOptions: [],
          rPairs: [],
          rMirror: "",
          rThreshold: 0.85,
          videoSrc: "",
          videoStarted: false,
          gameId: "",
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
          vm.choicePrompt = "";
          vm.pick = null;
          vm.dragNode = false;
          vm.dzShow = false; // 라인 진입 시 드래그 dropZone 숨김
          vm.lesson = node.lesson || null; // 교훈 배너 노드면 배너를 띄우고 하티 박스는 숨긴다
          const isHati = node.speaker === "hati";
          // 전신 하티(#hatiFull) 노드면 인트로 말풍선(#hatiBubble), 아니면 하단 박스(#hatiBox).
          const introHati = isHati && vm.fullHati;
          vm.bubbleKind = node.lesson
            ? "none"
            : introHati
              ? "hatiBubble"
              : isHati
                ? "hatiBox"
                : "friendBubble";
          render();
          typeInto(node.text || "", () => {
            vm.mode = "await";
            onTyped?.();
            vm.tapHint = node.next ? "▼ 화면을 탭하면 계속" : "🎉 미션 완료!";
            render();
            window.clearTimeout(timers.auto);
            // noAuto 노드는 자동 진행을 끄고 탭(또는 상호작용)으로만 넘어간다.
            if (!node.noAuto) {
              timers.auto = window.setTimeout(() => {
                if (vm.mode === "await") advanceLine();
              }, 2000);
            }
          });
        });
      },
      showChoices(node, exploredSet, pick) {
        updateScene(node);
        vm.tapHint = "";
        vm.choicePrompt = node.prompt || ""; // 카드 위 안내 문구(있을 때만)
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

        // 선택지 카드 노출(팝) — 하티 대사 타이핑 후 또는 즉시.
        const showCards = () => {
          vm.mode = "choices";
          vm.choices = node.choices || [];
          render();
          audio.play("pop");
        };

        if (node.speaker === "hati" && node.text) {
          // 선택 노드가 직접 하티 대사를 가지면 라인처럼 타자기로 먼저 노출 →
          // 타이핑이 끝난 뒤에 선택지 카드를 보여준다(탭하면 타이핑 즉시 완료).
          vm.bubbleKind = "hatiBox";
          vm.choices = []; // 타이핑 동안 선택지 숨김
          render();
          typeInto(node.text, showCards);
        } else {
          // 직전 하티박스 멘트를 유지(인트로 말풍선/친구 말풍선만 감춤). 즉시 선택지 표시.
          if (vm.bubbleKind !== "hatiBox") vm.bubbleKind = "none";
          showCards();
        }
      },
      showMirrors(node, done) {
        updateScene(node); // 배경/레이더/HUD 유지
        vm.stage = "mirrors";
        vm.mode = "idle";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.sHideBubbles = !!node.hideBubbles;
        vm.sBanner = node.banner || "";
        vm.sPrompt = node.prompt || "";
        vm.sCard = node.card || "";
        vm.sTargets = (node.targets || []).map((t) => ({
          friend: t.friend,
          title: t.title,
          line: t.line,
          onDrop: t.onDrop,
          bubble: t.line,
          done: false,
          charImage: t.charImage || "",
          dropImage: t.onDropImage || "",
        }));
        vm.sActive = vm.sTargets.length ? 0 : -1; // 순서 고정: 첫 타깃(루미)부터
        vm.sRevealPhase = "none";
        vm.sRevealFriend = node.reveal?.friend || "";
        ms.done = done;
        ms.reveal = node.reveal || null;
        render();
        audio.play("pop");
      },
      showGauge(node, done) {
        updateScene(node);
        vm.stage = "gauge";
        vm.mode = "idle";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.sHideBubbles = !!node.hideBubbles;
        vm.sBanner = node.banner || "";
        vm.sFriend = node.speaker && node.speaker !== "hati" ? node.speaker : "lumi";
        vm.sFriendLine = node.text || "";
        vm.sHeader = node.header || "";
        vm.sGaugeImage = node.gaugeMirror || ""; // 거울 통짜 이미지(있으면 스프라이트/말풍선 대신)
        vm.sPrompt = node.lead || ""; // 먼저 도입 대사
        vm.sOptions = (node.options || []).map((o) => ({
          icon: o.icon,
          title: o.title,
          desc: o.desc,
          fill: 0,
        }));
        ms.done = done;
        ms.node = node;
        render();
        audio.play("pop");
        // 2.2초 뒤 하티바를 드래그 안내로 교체(게이지는 계속 조작 가능)
        window.setTimeout(() => {
          if (vm.stage === "gauge") {
            vm.sPrompt = node.prompt || "";
            render();
          }
        }, 2200);
      },
      showReveal(node, done) {
        updateScene(node);
        vm.stage = "reveal";
        vm.mode = "idle";
        vm.bubbleKind = "hatiBox"; // 가이드 대사는 일반 하티 박스(#hatiBox)를 재사용
        vm.text = node.text || "";
        vm.choices = [];
        vm.tapHint = ""; // 이전 라인 노드의 탭 힌트 잔류 방지
        vm.mirrorImage = ""; // 정적 #mirrorTool 숨김(거울은 RubReveal 이 드래그용으로 렌더)
        vm.rPairs = node.pairs || [];
        vm.rMirror = node.mirrorImage || "";
        vm.rThreshold = node.threshold ?? 0.85;
        ms.done = done;
        render();
        audio.play("pop");
      },
      showVideo(node, done) {
        updateScene(node); // 배경(black 등)/스프라이트 적용
        vm.mode = "idle"; // 탭 진행 안 됨(건너뛰기 없음)
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.tapHint = "";
        vm.videoSrc = node.src || "";
        vm.videoStarted = false;
        ms.done = done;
        ms.node = node; // holdAfter 참조용
        render();
      },
      showMinigame(node, done) {
        updateScene(node); // 배경/HUD 유지
        vm.stage = "minigame";
        vm.gameId = node.game || "";
        if (import.meta.env.DEV && !props.games?.[vm.gameId]) {
          console.warn(
            `[MissionPlayer] minigame '${vm.gameId}' has no matching component in the games prop; nothing will render.`,
          );
        }
        vm.mode = "idle";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.tapHint = "";
        ms.done = done;
        render();
      },
      end() {
        vm.mode = "end";
        vm.ended = true;
        render();
      },
    };

    const runner = new DialogueRunner(scenario, view);
    (window as unknown as { __runner: DialogueRunner }).__runner = runner;
    runner.start();

    return () => {
      alive = false;
      window.clearInterval(timers.typer);
      window.clearTimeout(timers.auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  // 배경 이미지 미리 로드 — 엔딩(m1_end3)에서 stage2로 교체될 때 깜빡임 방지.
  useEffect(() => {
    Object.values(theme.bg.states).forEach((src) => {
      if (!src) return; // 빈 상태(예: black)는 실제 이미지가 없으므로 스킵
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

  // 디버그 노드 오버레이 토글: 'n'(node) 키로 표시/숨김. 기본은 숨김.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") {
        vm.debugShown = !vm.debugShown;
        force();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vm]);

  const onStageClick = () => {
    // 동영상 중 화면 탭은 무시(재생은 '재생 시작' 버튼으로만, 건너뛰기 없음).
    if (vm.videoSrc) return;
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
  // 카드 밖으로 나가는 문제 회피). 친구 캐릭터(마진 24px) 위에서 놓으면 선택("친구에게
  // 말을 건네는" 맥락), 거의 안 움직인 탭도 선택, 그 외엔 snapback.
  const stageScale = () => (stageRef.current?.getBoundingClientRect().width || 1920) / 1920 || 1;
  const overFriend = (x: number, y: number) => {
    const el = friendWrapRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const m = 24;
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
      friendWrapRef.current?.classList.toggle("over", overFriend(ev.clientX, ev.clientY));
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
      const over = overFriend(ev.clientX, ev.clientY);
      const accept = (over || dnd.moved < 8) && vm.mode === "choices";
      friendWrapRef.current?.classList.remove("over");
      if (accept) {
        vm.mode = "idle";
        audio.play("drop");
        // 친구가 카드를 받는 반응(짧은 팝). 240ms 뒤 애니 클래스 제거.
        friendWrapRef.current?.classList.add("catching");
        window.setTimeout(() => friendWrapRef.current?.classList.remove("catching"), 400);
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

  // ---------- 화면 A: 이중 타깃 카드 드래그(순서 고정) + 라라 터치 reveal ----------
  const overMirror = (idx: number, x: number, y: number) => {
    const el = msMirrorRefs.current[idx];
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const m = 12;
    return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
  };

  const finishMirrors = () => {
    const done = ms.done;
    ms.done = undefined;
    vm.stage = "none";
    force();
    done?.();
  };

  const finishReveal = () => {
    const done = ms.done;
    ms.done = undefined;
    vm.stage = "none";
    force();
    done?.();
  };

  const finishMinigame = () => {
    const done = ms.done;
    ms.done = undefined;
    vm.stage = "none";
    vm.gameId = "";
    force();
    done?.();
  };

  // 동영상: 재생 종료 → holdAfter 만큼 정지 후 다음 노드로.
  const finishVideo = () => {
    const done = ms.done;
    ms.done = undefined;
    vm.videoSrc = "";
    force();
    done?.();
  };
  const onVideoEnded = () => {
    const hold = ms.node?.holdAfter ?? 0;
    window.setTimeout(finishVideo, hold);
  };
  // '재생 시작' 버튼: 사용자 제스처로 재생 시작 → 버튼 숨김.
  const startVideo = () => {
    videoRef.current?.play().catch(() => {});
    vm.videoStarted = true;
    force();
  };

  const onMirrorAllDropped = () => {
    const r = ms.reveal;
    if (r) {
      vm.sPrompt = r.prompt; // 하티: "…라라를 터치…"
      vm.sRevealPhase = "await";
      force();
      audio.play("stage");
    } else {
      finishMirrors();
    }
  };

  const onMirrorCardDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (vm.stage !== "mirrors" || vm.sActive < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget;
    const scale = stageScale();
    const startX = e.clientX,
      startY = e.clientY;
    const active = vm.sActive;
    card.classList.add("dragging");
    const mstage = card.closest(".mstage"); // 드래그 중 화살표 힌트 숨김용 클래스 토글
    mstage?.classList.add("ms-dragging");
    audio.play("pop");
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale,
        dy = (ev.clientY - startY) / scale;
      card.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
      msMirrorRefs.current[active]?.classList.toggle("over", overMirror(active, ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      mstage?.classList.remove("ms-dragging");
      msMirrorRefs.current[active]?.classList.remove("over");
      const dropped = overMirror(active, ev.clientX, ev.clientY);
      if (dropped && vm.stage === "mirrors") {
        audio.play("drop");
        vm.sTargets[active].bubble = vm.sTargets[active].onDrop; // 친구 반응으로 교체
        if (vm.sTargets[active].dropImage) vm.sTargets[active].charImage = vm.sTargets[active].dropImage; // 캐릭터 이미지도 교체
        vm.sTargets[active].done = true;
        card.classList.remove("dragging");
        card.style.transform = "";
        const nextIdx = vm.sTargets.findIndex((t) => !t.done);
        vm.sActive = nextIdx;
        if (nextIdx < 0) {
          vm.sCard = ""; // 카드 소진
          force();
          onMirrorAllDropped();
        } else {
          force();
        }
      } else {
        audio.play("whoosh");
        card.classList.remove("dragging");
        card.classList.add("snapback");
        card.style.transform = "";
        window.setTimeout(() => card.classList.remove("snapback"), 240);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onMirrorTouch = (idx: number) => {
    if (vm.stage !== "mirrors" || vm.sRevealPhase !== "await") return;
    const r = ms.reveal;
    if (!r || vm.sTargets[idx].friend !== r.friend) return; // 지정 거울만
    vm.sTargets[idx].bubble = r.line; // 속마음으로 교체
    if (r.image) vm.sTargets[idx].charImage = r.image; // 속마음 공개 이미지로 교체
    vm.sRevealPhase = "done";
    audio.play("reveal");
    force();
    window.setTimeout(finishMirrors, 1600);
  };

  // ---------- 화면 B: 게이지 드래그(0→100%) 선택 + 오답 리셋/정답 진행 ----------
  const commitGauge = (idx: number) => {
    const node = ms.node;
    const opt = node?.options?.[idx];
    if (!opt) return;
    vm.sFriendLine = opt.onPick; // 루미 반응 말풍선(말풍선 숨김 노드에선 이미지가 대신함)
    if (opt.pickImage) vm.sGaugeImage = opt.pickImage; // 100% 반응 거울 이미지로 교체
    force();
    if (opt.correct) {
      audio.play("correct");
      window.setTimeout(() => {
        const done = ms.done;
        ms.done = undefined;
        vm.stage = "none";
        force();
        done?.();
      }, 1800);
    } else {
      audio.play("wrong");
      window.setTimeout(() => {
        if (vm.stage !== "gauge") return;
        vm.sOptions = vm.sOptions.map((o) => ({ ...o, fill: 0 })); // 게이지 리셋
        vm.sFriendLine = node?.text || vm.sFriendLine; // 원래 대사로 복귀
        vm.sGaugeImage = node?.gaugeMirror || vm.sGaugeImage; // 기본 거울 이미지로 복귀
        force();
      }, 1800);
    }
  };

  const onGaugeDown = (e: ReactPointerEvent<HTMLDivElement>, idx: number) => {
    if (vm.stage !== "gauge") return;
    e.preventDefault();
    e.stopPropagation();
    const optEl = e.currentTarget;
    const track = optEl.querySelector(".ms-bar-track") as HTMLElement | null;
    const setFrom = (clientX: number) => {
      const r = (track ?? optEl).getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
      vm.sOptions[idx].fill = pct;
      force();
      return pct;
    };
    audio.play("pop");
    setFrom(e.clientX);
    const move = (ev: PointerEvent) => setFrom(ev.clientX);
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const pct = setFrom(ev.clientX);
      if (pct >= 100) commitGauge(idx);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const MiniGame =
    vm.stage === "minigame" ? props.games?.[vm.gameId] : undefined;
  const many = vm.choices.length >= 4;
  // 친구 말풍선/표정: 지금 친구가 말하는 중이면 그 대사·표정, 아니면 hold로 유지 중인
  // 대사(heldText)와 그 짝 표정(heldSprite)으로 함께 되돌린다.
  const reverting = vm.bubbleKind !== "friendBubble" && !!vm.heldText;
  const friendBubbleText = reverting ? vm.heldText : vm.bubbleKind === "friendBubble" ? vm.text : "";
  const friendSprite = reverting && vm.heldSprite ? vm.heldSprite : vm.friend;
  // 진행 스테퍼: 현재 미션 단계(step) 기준으로 각 노드 상태를 계산.
  // 이전 단계=done, 현재=진행중(active)/완료 시 done, 다음 단계=현재 완료 시 active.
  const step = props.currentStep ?? 1;
  const missionDone = vm.progress === "done";
  const stepCls = (i: number) =>
    i < step
      ? "done"
      : i === step
        ? missionDone
          ? "done"
          : "active"
        : i === step + 1 && missionDone
          ? "active"
          : "locked";
  const connFilled = (i: number) => i < step || (i === step && missionDone); // step i 뒤 커넥터
  // 스테퍼 라벨: props.steps(미션 이름)가 있으면 그걸, 없으면 기존 planet1 기본 라벨.
  const stepLabel = (i: number, fallback: ReactNode) => props.steps?.[i] ?? fallback;

  return (
    <div id="viewport" className={props.scopeClass}>
      <div
        id="stage"
        ref={stageRef}
        className={`${vm.bright ? "bright" : ""}${vm.bg === "black" ? " blackbg" : ""}${vm.debugId ? ` node-${vm.debugId}` : ""}`}
        onClick={onStageClick}
      >
        {/* 배경 src 가 있을 때만 렌더(black 등 빈 상태는 빈 <img> 브로큰 아이콘 방지) */}
        {theme.bg.states[vm.bg] ? <img id="bg" src={theme.bg.states[vm.bg]} alt="" /> : null}
        <div id="lightOverlay" />

        {/* 진행 스테퍼 */}
        <div id="progress">
          <div className="prog-title">
            <span className="star">⭐</span>
            <span>탐험 진행도</span>
          </div>
          <div className="stepper">
            <div className={`pnode ${stepCls(1)}`} id="mission1">
              <div className="circle">
                <span className="num">1</span>
              </div>
              <div className="label">
                {stepLabel(
                  0,
                  <>
                    마음 신호
                    <br />
                    탐색기
                  </>,
                )}
              </div>
            </div>
            <div className={`connector${connFilled(1) ? " filled" : ""}`} id="conn1" />
            <div className={`pnode ${stepCls(2)}`} id="mission2">
              <div className="circle">
                <span className="num">2</span>
              </div>
              <div className="label">
                {stepLabel(
                  1,
                  <>
                    공감 거울
                    <br />
                    깨우기
                  </>,
                )}
              </div>
            </div>
            <div className={`connector${connFilled(2) ? " filled" : ""}`} id="conn2" />
            <div className={`pnode ${stepCls(3)}`} id="mission3">
              <div className="circle">
                <span className="num">3</span>
              </div>
              <div className="label">
                {stepLabel(
                  2,
                  <>
                    공감 없는
                    <br />
                    세상으로
                  </>,
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 레이더 HUD (미션별로 끌 수 있음 — showRadar !== false 일 때만).
            radar + 플랫폼을 한 div로 묶어 세트로 이동한다. */}
        {theme.showRadar !== false && vm.radarShown && (
          <div id="radarHud">
            {/* 레이더 뒤에 세트로 깔리는 부유 플랫폼 (radarPlatform 지정된 미션만) */}
            {theme.radarPlatform && (
              <img id="radarPlatform" src={theme.radarPlatform} alt="" aria-hidden="true" />
            )}
            <img
              id="radar"
              className={vm.radarPulse ? "pulse" : ""}
              src={theme.radar.states[vm.radar]}
              alt="마음 신호 탐색기"
            />
          </div>
        )}

        {/* 무대(플레이트) 위 캐릭터 세트 — theme.cast 지정 미션 전체에서 상시 표시.
            플레이트 위에 members 를 좌→우로 세운다(위치는 CSS data-i 로 배치).
            각 멤버는 래퍼(.cast-member) 안에 캐릭터 img + 머리 위 이름표(.cast-name). */}
        {theme.cast && (
          <div id="castStage">
            <img id="castPlatform" src={theme.cast.platform} alt="" aria-hidden="true" />
            {vm.castMembers.map((m, i) => (
              <div key={i} className="cast-member" data-i={i}>
                <img className="cast-char" src={m.img} alt="" aria-hidden="true" />
                {m.name && <span className="cast-name">{m.name}</span>}
              </div>
            ))}
          </div>
        )}

        {/* 인트로 타이틀 배너 */}
        <div id="titleBanner" className={vm.intro ? "show" : ""}>
          <div className="tb-badge">
            <span className="tb-star">★</span>
            <span className="tb-pill">{theme.banner.pill}</span>
            <span className="tb-star">★</span>
          </div>
          <div className="tb-title">{theme.banner.title}</div>
          <div className="tb-ribbon">
            <span className="tb-spark">✦</span>
            <span>{theme.banner.ribbon}</span>
            <span className="tb-spark">✦</span>
          </div>
        </div>

        {/* 인트로 전신 하티 */}
        <img id="hatiFull" className={vm.fullHati ? "show" : ""} src={HATI_FULL} alt="하티" />

        {/* 인트로 하티 말풍선 */}
        <div id="hatiBubble" className={`bubble${vm.bubbleKind === "hatiBubble" ? " show" : ""}`}>
          <div className="bubble-name">하티</div>
          <span>{vm.bubbleKind === "hatiBubble" ? vm.text : ""}</span>
        </div>

        {/* 친구(현재 화면의 친구) — q4에선 드롭 타깃(droppable) */}
        <div
          id="friendWrap"
          ref={friendWrapRef}
          className={`${vm.fullHati || vm.stage !== "none" || vm.hideFriend ? "hide" : ""}${vm.friendGlow ? " glow" : ""}${vm.dzShow ? " droppable" : ""}`}
        >
          <img
            id="friend"
            className="pop"
            src={theme.friends[vm.friendId].char[friendSprite]}
            alt={theme.speakers[vm.friendId]?.name ?? "친구"}
          />
        </div>

        {/* 친구 말풍선 — 현재 대사 또는 hold로 유지 중인 대사 */}
        <div id="friendBubble" className={`bubble${friendBubbleText && vm.stage === "none" ? " show" : ""}`}>
          <span>{friendBubbleText}</span>
        </div>

        {/* q4 드래그 힌트: 친구에게 카드를 가져다 놓으라는 안내(친구 위에 떠 있음) */}
        <div id="dropHint" className={vm.dzShow ? "show" : ""}>
          <span>여기에 놓아요</span>
          <span className="dh-arrow">👇</span>
        </div>

        {/* 선택지 패널 — 안내 문구 + 카드를 한 배경 박스에 담는다 */}
        <div
          id="choicePanel"
          className={`${vm.choices.length > 0 ? "show" : ""}${vm.choiceImage ? " img-choice" : ""}`}
        >
          {/* 카드 위 안내 문구 (있을 때만) */}
          <div id="choicePrompt">{vm.choicePrompt}</div>

          {/* 선택지 카드 */}
          <div id="choices">
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
                        if (vm.mode !== "choices") return;
                        audio.play("select");
                        // 선택 반응(pop)을 잠깐 보여준 뒤 다음 노드로 진행 → 원상태로 돌아오는 게 보인다.
                        // React가 카드 DOM을 재사용하므로 제거→reflow→추가로 매번 애니메이션을 재시작.
                        const el = e.currentTarget;
                        el.classList.remove("picked");
                        void el.offsetWidth;
                        el.classList.add("picked");
                        window.setTimeout(() => vm.pick?.(idx, c), 200);
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
                  {deco.img ? (
                    <img className="icon-img" src={deco.img} alt="" />
                  ) : (
                    deco.emoji
                  )}
                </div>
                <div className="ctext">{c.text}</div>
              </button>
            );
          })}
          </div>
        </div>

        {/* 공감 거울 특별 파트 (화면 A: mirrors / 화면 B: gauge) */}
        {(vm.stage === "mirrors" || vm.stage === "gauge") && (
          <MirrorStage
            stage={vm.stage}
            theme={theme}
            hideBubbles={vm.sHideBubbles}
            banner={vm.sBanner}
            prompt={vm.sPrompt}
            card={vm.sCard}
            targets={vm.sTargets}
            activeTarget={vm.sActive}
            revealPhase={vm.sRevealPhase}
            revealFriend={vm.sRevealFriend}
            friend={vm.sFriend}
            friendLine={vm.sFriendLine}
            header={vm.sHeader}
            gaugeImage={vm.sGaugeImage}
            options={vm.sOptions}
            cardRef={msCardRef}
            mirrorRefs={msMirrorRefs}
            onCardDown={onMirrorCardDown}
            onMirrorTouch={onMirrorTouch}
            onGaugeDown={onGaugeDown}
          />
        )}

        {/* 공감 거울 긁어서 드러내기 (reveal) */}
        {vm.stage === "reveal" && (
          <RubReveal
            pairs={vm.rPairs}
            mirrorImage={vm.rMirror}
            threshold={vm.rThreshold}
            stageRef={stageRef}
            onDone={finishReveal}
          />
        )}

        {/* 미니게임 (minigame) — planet 컨테이너가 games prop으로 주입 */}
        {MiniGame && <MiniGame onDone={finishMinigame} />}

        {/* 교훈 배너(금색 오너먼트) — lesson 노드에서 표시 */}
        {vm.lesson && (
          <div id="lessonBanner" className="show">
            <img
              className="lb-star"
              src="/assets/ui/star_gold.png"
              alt=""
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
            <div className="lb-text">
              <div className="lb-title">{vm.lesson.title}</div>
              <div className="lb-sub">{vm.lesson.sub}</div>
            </div>
          </div>
        )}

        {/* 완성 이미지 뒤 금빛 후광(fx resultGlow). 이미지가 떠 있을 때만 표시 */}
        {vm.bookGlow && vm.choiceImage && <div id="choiceGlow" className="show" />}

        {/* 화면 가운데 큰 이미지(노드 image) — 선택지 등에서 상황 이미지를 크게 보여줄 때 */}
        {vm.choiceImage && (
          <img
            id="choiceImage"
            className="show"
            src={vm.choiceImage}
            alt=""
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        )}

        {/* 화면 가운데 세로 스택 이미지(노드 images) — 여러 장을 작게 위아래로 */}
        {vm.stackImages.length > 0 && (
          <div id="imageStack" className="show">
            {vm.stackImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ))}
          </div>
        )}

        {/* 동영상(노드 video) — 까만 화면 위 가운데 크게. 자동재생하지 않고 '재생 시작'
            버튼(사용자 제스처)으로만 재생 → 자동재생 정책과 무관, hang 없음. */}
        {vm.videoSrc && (
          <video
            id="missionVideo"
            ref={videoRef}
            src={vm.videoSrc}
            playsInline
            preload="auto"
            onEnded={onVideoEnded}
          />
        )}
        {vm.videoSrc && !vm.videoStarted && (
          <button id="videoPlayBtn" onClick={startVideo}>
            <span className="vpb-icon">▶</span> 재생 시작
          </button>
        )}

        {/* 화면 가운데 카드들(노드 cards) — 가로로 나란히, 높이 기준. 상/하단 텍스트 오버레이 */}
        {vm.cards.length > 0 && (
          <div id="cardStage">
            {vm.cards.map((c, i) => (
              <div className="card-item" key={i}>
                <img
                  src={c.image}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
                {c.top && <div className="card-text card-top">{c.top}</div>}
                {c.bottom && <div className="card-text card-bottom">{c.bottom}</div>}
              </div>
            ))}
          </div>
        )}

        {/* 우측 하단 공감 거울(노드 mirrorImage) */}
        {vm.mirrorImage && (
          <img
            id="mirrorTool"
            src={vm.mirrorImage}
            alt="공감 거울"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        )}

        {/* 미션 완료 배너(노드 completeBanner) — 금색 오너먼트 플라크 */}
        {vm.completeBanner && (
          <div id="completeBanner">
            <img
              className="cb-star"
              src="/assets/ui/star_gold.png"
              alt=""
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
            <div className="cb-plaque">
              <span className="cb-spark">✦</span>
              <span className="cb-text">{vm.completeBanner}</span>
              <span className="cb-spark">✦</span>
            </div>
          </div>
        )}

        {/* 우측 가운데 장식 이미지(노드 sideImage) */}
        {vm.sideImage && (
          <img
            id="sideImage"
            src={vm.sideImage}
            alt=""
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        )}

        {/* 좌측 가운데 장식 이미지(노드 sideImageLeft) */}
        {vm.sideImageLeft && (
          <img
            id="sideImageLeft"
            src={vm.sideImageLeft}
            alt=""
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        )}

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
            <div id="hatiName">{theme.speakers.hati?.name ?? "하티"}</div>
            <div id="hatiText">{vm.bubbleKind === "hatiBox" ? vm.text : ""}</div>
          </div>
        </div>

        {vm.showNext && (
          <button
            id="nextBtn"
            className={props.finish?.image ? "img-only" : props.finish ? "ship" : ""}
            disabled={exitingRef.current}
            onClick={(e) => {
              e.stopPropagation();
              handleExit();
            }}
          >
            {props.finish?.image ? (
              <img className="nb-full-img" src={props.finish.image} alt={props.finish.label} />
            ) : props.finish ? (
              <>
                {props.finish.icon && (
                  <img className="nb-ship-icon" src={props.finish.icon} alt="" />
                )}
                <span>{props.finish.label}</span>
              </>
            ) : (
              <>
                다음 미션으로 <span>➜</span>
              </>
            )}
          </button>
        )}

        {/* 디버그 노드 오버레이 (개발용 — production 제거 예정). 'n' 키로 토글, 클릭 시 node id 복사 */}
        {vm.debug && vm.debugShown && (
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
    </div>
  );
}
