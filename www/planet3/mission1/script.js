"use strict";

/* ==========================================================================
   경로 상수 (페이지마다 이 값만 바꾼다) — planetN/missionM/ 는 두 단계 깊이
   ========================================================================== */
const ROOT = "../../";
const ASSETS = ROOT + "assets"; // 미션 데이터의 "/assets/..." → 이 접두어로 치환

/* ==========================================================================
   R2 세션 가드 — hg_session 없으면 로그인으로. (intro·auth 이외 전 페이지)
   ========================================================================== */
if (!localStorage.getItem("hg_session")) {
  location.href = ROOT + "auth/index.html";
}

/* ==========================================================================
   R1 공통 뼈대 — FixedStage 인라인.
   ⚠ 미션 무대는 1920×1200(원본 useFitStage 기본값 = player/ 엔진 관례).
   ========================================================================== */
function fitStage() {
  const stage = document.getElementById("stage");
  // clientWidth 사용: DevTools DPR 에뮬레이션·OS 배율 환경에서 innerWidth가 CSS 뷰포트와 어긋나는
  // 간헐 버그(로드 직후 1.25~1.5배 보고) 회피. 실기기에선 두 값이 같다.
  const scale = Math.min(
    document.documentElement.clientWidth / 1920,
    document.documentElement.clientHeight / 1200,
  );
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener("resize", fitStage);
fitStage();

/* ==========================================================================
   R5 하드웨어 뒤로가기 무시 (전 페이지) — Capacitor WebView에서만 동작, 브라우저 no-op
   ========================================================================== */
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener("backButton", () => {
    /* 의도적으로 무시 — 키오스크형 온-레일 앱 (App.tsx 정책 유지) */
  });
}

/* ==========================================================================
   공통 블록: 씬 전환 페이드 (sceneTransition.tsx 이식) — intro 검증본 복사
   ========================================================================== */
const FADE_MS = 160;
const sceneFade = document.createElement("div");
sceneFade.id = "scene-fade";
sceneFade.setAttribute("aria-hidden", "true");
document.body.appendChild(sceneFade);

let fadeBusy = false;
function fadeNav(href) {
  if (fadeBusy) return;
  fadeBusy = true;
  sceneFade.classList.add("is-on");
  window.setTimeout(() => {
    window.location.href = href;
  }, FADE_MS);
}

/* ==========================================================================
   공통 블록 3-① 효과음 — audio (src/lib/audio.ts 이식) — intro 검증본 복사
   ========================================================================== */
const audio = (function createAudio() {
  const VOL = 0.5;
  let ctx = null;
  let master = null;
  let unlocked = false;
  let muted = false;
  try {
    muted = localStorage.getItem("hg_muted") === "1";
  } catch (_) {
    muted = false;
  }
  const muteListeners = new Set();

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOL;
    master.connect(ctx.destination);
  }

  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
    unlocked = true;
  }

  function setMuted(m) {
    muted = m;
    try {
      localStorage.setItem("hg_muted", m ? "1" : "0");
    } catch (_) {
      /* 무시 */
    }
    if (master) master.gain.value = m ? 0 : VOL;
    muteListeners.forEach((fn) => fn(m));
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function onMuteChange(fn) {
    muteListeners.add(fn);
    return () => muteListeners.delete(fn);
  }

  function tone(o) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (o.start || 0);
    const dur = o.dur || 0.15;
    const rel = o.release || 0.08;
    const gain = o.gain || 0.15;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + rel + 0.02);
  }

  const SOUNDS = {
    tap: () => tone({ freq: 520, type: "sine", dur: 0.05, gain: 0.16, release: 0.05 }),
    pop: () => tone({ freq: 400, type: "triangle", dur: 0.07, gain: 0.16, glideTo: 680, release: 0.06 }),
    select: () => {
      tone({ freq: 600, type: "triangle", dur: 0.06, gain: 0.14 });
      tone({ freq: 900, type: "triangle", start: 0.05, dur: 0.07, gain: 0.12 });
    },
    drop: () => {
      tone({ freq: 880, type: "sine", dur: 0.08, gain: 0.16 });
      tone({ freq: 1320, type: "sine", start: 0.06, dur: 0.14, gain: 0.13, release: 0.12 });
    },
    whoosh: () => tone({ freq: 520, type: "sawtooth", dur: 0.14, gain: 0.06, glideTo: 150, release: 0.06 }),
    correct: () =>
      [660, 880, 1175].forEach((f, i) =>
        tone({ freq: f, type: "triangle", start: i * 0.1, dur: 0.12, gain: 0.15, release: 0.12 }),
      ),
    wrong: () => tone({ freq: 320, type: "sine", dur: 0.16, gain: 0.15, glideTo: 200, release: 0.1 }),
    stage: () => {
      tone({ freq: 600, type: "triangle", dur: 0.08, gain: 0.12 });
      tone({ freq: 900, type: "triangle", start: 0.08, dur: 0.1, gain: 0.12 });
    },
    sparkle: () => {
      for (let i = 0; i < 6; i++)
        tone({
          freq: 1600 + Math.random() * 1100,
          type: "triangle",
          start: i * 0.05,
          dur: 0.1,
          gain: 0.07,
          release: 0.12,
        });
    },
    recover: () => {
      tone({ freq: 200, type: "sawtooth", dur: 0.4, gain: 0.11, glideTo: 900, release: 0.15 });
      SOUNDS.sparkle();
    },
    reveal: () =>
      [784, 988, 1318].forEach((f) =>
        tone({ freq: f, type: "triangle", dur: 0.3, gain: 0.1, release: 0.25 }),
      ),
    fanfare: () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, type: "triangle", start: i * 0.1, dur: 0.16, gain: 0.14, release: 0.14 }),
      );
      SOUNDS.sparkle();
    },
    title: () =>
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, type: "triangle", start: i * 0.07, dur: 0.14, gain: 0.13, release: 0.12 }),
      ),
    blipHati: () =>
      tone({ freq: 500, type: "triangle", dur: 0.05, gain: 0.2, attack: 0.01, release: 0.04 }),
    blipFriend: () =>
      tone({ freq: 600, type: "triangle", dur: 0.05, gain: 0.2, attack: 0.01, release: 0.04 }),
  };

  function play(name) {
    if (muted || !unlocked) return;
    ensure();
    const fn = SOUNDS[name];
    if (fn) fn();
  }

  return { unlock, play, setMuted, toggleMute, onMuteChange, isMuted: () => muted };
})();

/* ==========================================================================
   공통 블록 3-① (미션 페이지 변형) — 첫 제스처에서 unlock 만.
   ⚠ 미션 페이지 전용 조정(Task 2 경고) — 미션 엔진이 자체 사운드를 내므로
   공통 SFX 블록의 자동 data-sfx tap 재생을 억제하고 unlock 로직만 유지한다.
   ========================================================================== */
window.addEventListener(
  "pointerdown",
  () => {
    audio.unlock();
  },
  true,
);

/* ==========================================================================
   공통 블록 3-② 음소거 버튼 (MuteButton.tsx + mute-button.css 이식) — 검증본 복사
   ========================================================================== */
const muteBtn = document.createElement("button");
muteBtn.type = "button";
muteBtn.className = "mute-btn";
muteBtn.dataset.sfx = "none";
function renderMuteBtn(m) {
  muteBtn.textContent = m ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", m ? "소리 켜기" : "소리 끄기");
}
renderMuteBtn(audio.isMuted());
muteBtn.addEventListener("click", () => audio.toggleMute());
audio.onMuteChange(renderMuteBtn);
document.body.appendChild(muteBtn);

/* ==========================================================================
   공통 블록 3-③ 교사용 히든 점프 메뉴
   (HiddenMenuOverlay.tsx + useCornerLongPress.ts + hiddenMenu.ts 이식) — 검증본 복사
   ========================================================================== */
(function hiddenMenu() {
  const HG_MENU_PIN = "5173";
  let unlocked = false;

  function configuredPin() {
    return /^\d{4}$/.test(HG_MENU_PIN) ? HG_MENU_PIN : null;
  }
  function isMenuAvailable() {
    return configuredPin() !== null;
  }
  function unlock(pin) {
    const expected = configuredPin();
    if (expected === null) return false;
    if (pin !== expected) return false;
    unlocked = true;
    return true;
  }

  const COMMON = [
    { label: "로그인(auth)", href: ROOT + "auth/index.html" },
    { label: "홈(home)", href: ROOT + "home/index.html" },
  ];
  const COL_HEAD = ["프롤로그", "미션1", "미션2", "미션3"];
  const PLANETS = [
    { n: 1, cells: ["planet1/prologue/index.html", "planet1/mission1/index.html", "planet1/mission2/index.html", "planet1/mission3/index.html"] },
    { n: 2, cells: ["planet2/prologue/index.html", "planet2/mission1/index.html", "planet2/mission2/index.html", "planet2/mission3/index.html"] },
    { n: 3, cells: ["planet3/prologue/index.html", "planet3/mission1/index.html", "planet3/mission23/index.html", null] },
    { n: 4, cells: ["planet4/prologue/index.html", "planet4/mission1/index.html", "planet4/mission2/index.html", "planet4/mission3/index.html"] },
  ];

  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

  let phase = "closed";
  let entry = "";
  let wrong = false;
  let overlay = null;

  function go(href) {
    close();
    fadeNav(href);
  }

  function press(k) {
    wrong = false;
    if (k === "clear") {
      entry = "";
      return render();
    }
    if (k === "back") {
      entry = entry.slice(0, -1);
      return render();
    }
    const next = (entry + k).slice(0, 4);
    if (next.length === 4) {
      entry = "";
      if (unlock(next)) {
        phase = "grid";
      } else {
        wrong = true;
      }
      return render();
    }
    entry = next;
    render();
  }

  function open() {
    if (!isMenuAvailable()) {
      console.warn("[hiddenMenu] PIN 미설정 — HG_MENU_PIN 에 4자리 숫자를 넣어야 메뉴가 열린다");
      return;
    }
    entry = "";
    wrong = false;
    phase = unlocked ? "grid" : "pin";
    render();
  }

  function close() {
    phase = "closed";
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === "class") n.className = props[k];
        else if (k === "text") n.textContent = props[k];
        else n.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach((c) => n.appendChild(c));
    return n;
  }

  function render() {
    if (phase === "closed") return close();
    if (overlay) overlay.remove();

    const head = el("div", { class: "hidden-menu__head" }, [
      el("strong", { text: "교사용 점프 메뉴" }),
    ]);
    const closeBtn = el("button", {
      type: "button",
      class: "hidden-menu__close",
      "aria-label": "닫기",
      text: "✕",
    });
    closeBtn.addEventListener("click", close);
    head.appendChild(closeBtn);

    let bodyEl;
    if (phase === "pin") {
      const dots = el("div", { class: "hidden-menu__dots", "aria-label": entry.length + "자리 입력됨" });
      for (let i = 0; i < 4; i++) dots.appendChild(el("span", { class: i < entry.length ? "on" : "" }));
      const kids = [dots];
      if (wrong) kids.push(el("p", { class: "hidden-menu__wrong", text: "PIN이 맞지 않습니다" }));
      const keys = el("div", { class: "hidden-menu__keys" });
      KEYS.forEach((k) => {
        const b = el("button", { type: "button", text: k === "clear" ? "지움" : k === "back" ? "←" : k });
        b.addEventListener("click", () => press(k));
        keys.appendChild(b);
      });
      kids.push(keys);
      bodyEl = el("div", { class: "hidden-menu__pin" }, kids);
    } else {
      const common = el("div", { class: "hidden-menu__common" });
      COMMON.forEach((c) => {
        const b = el("button", { type: "button", text: c.label });
        b.addEventListener("click", () => go(c.href));
        common.appendChild(b);
      });

      const grid = el("div", { class: "hidden-menu__grid" });
      grid.appendChild(el("span", {}));
      COL_HEAD.forEach((c) => grid.appendChild(el("span", { class: "hidden-menu__col", text: c })));
      PLANETS.forEach((p) => {
        grid.appendChild(el("span", { class: "hidden-menu__row", text: "행성" + p.n }));
        p.cells.forEach((href, i) => {
          if (!href) {
            grid.appendChild(el("span", { class: "hidden-menu__empty" }));
            return;
          }
          const label = href.indexOf("mission23") !== -1 ? "미션2·3" : COL_HEAD[i];
          const b = el("button", { type: "button", text: label });
          b.addEventListener("click", () => go(ROOT + href));
          grid.appendChild(b);
        });
      });

      const warn = el("p", {
        class: "hidden-menu__warn",
        text: "⚠️ 엔딩에서 진도가 자동 저장됩니다",
      });
      const home = el("button", { type: "button", class: "hidden-menu__home", text: "홈으로" });
      home.addEventListener("click", () => go(ROOT + "home/index.html"));
      bodyEl = el("div", { class: "hidden-menu__grid-wrap" }, [warn, common, grid, home]);
    }

    const panel = el("div", { class: "hidden-menu__panel" }, [head, bodyEl]);
    overlay = el("div", { class: "hidden-menu", role: "dialog", "aria-label": "교사용 점프 메뉴" }, [panel]);
    document.body.appendChild(overlay);
  }

  const CORNER_PX = 200;
  const HOLD_MS = 2000;
  const MOVE_TOLERANCE_PX = 24;

  const points = new Map();
  let timer;
  function clearTimer() {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (e.clientX > CORNER_PX || e.clientY > CORNER_PX) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size === 2 && timer === undefined) {
        timer = window.setTimeout(() => {
          timer = undefined;
          points.clear();
          open();
        }, HOLD_MS);
      }
    },
    true,
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      const start = points.get(e.pointerId);
      if (!start) return;
      const moved =
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX;
      if (moved) {
        points.delete(e.pointerId);
        clearTimer();
      }
    },
    true,
  );
  function onUp(e) {
    if (!points.delete(e.pointerId)) return;
    clearTimer();
  }
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && e.code === "KeyJ") {
      e.preventDefault();
      open();
    }
  });
})();

/* ==========================================================================
   미션1 데이터 — mission01.json 인라인 (별도 fetch 금지, 페이지 독립성).
   "/assets/..." 경로는 ASSETS 접두어로 치환한다. 전 5노드 verbatim(전수 대조 완료):
   line(4) + minigame(1). choice/branch 없음.
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "p3_m1_intro",
  nodes: [
    {
      id: "p3_m1_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "얼음행성 친구들의 마음은 얼어붙어 있어. 공감 송신기를 사용해서 마음을 녹이려면 올바른 사용법을 알아야 해!",
      image: A + "/planet3/empathy-transmitter.png",
      next: "p3_m1_play",
    },
    { id: "p3_m1_play", type: "minigame", noAuto: true, game: "empathyManual", next: "p3_m1_postplay" },
    {
      id: "p3_m1_postplay",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감 송신기 사용 설명서가 완성 되었어!!!",
      image: A + "/planet3/empathy-transmitter-manual.png",
      next: "p3_m1_cards",
    },
    {
      id: "p3_m1_cards",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감하는 방법은 3단계로 기억하면 돼!",
      cards: [
        { image: A + "/planet3/ice-planet-empathy-card-1.png" },
        { image: A + "/planet3/ice-planet-empathy-card-2.png" },
        { image: A + "/planet3/ice-planet-empathy-card-3.png" },
      ],
      next: "p3_m1_end",
    },
    {
      id: "p3_m1_end",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: '좋아! 이제 공감 송신기를 사용할 준비가 되었어. 하지만 공감 송신기를 작동하려면 "따듯한 말" 연료가 필요해!',
      image: A + "/planet3/empathy-transmitter-manual.png",
      completeBanner: "미션 완료!",
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션1 테마 — theme.ts 의 MISSION01_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ showRadar:false(레이더 HUD 없음)·cast(캐릭터 무대, 이 테마는 미사용)·
   choiceIcons/badgeColors(choice 노드 없음)·fullHatiNodes(지정 안 됨 — bannerNode 에서만
   전신 하티) 미포함. "banner" 텍스트는 index.html 에 정적으로 박아 넣었다(다른 미션
   템플릿과 동일 관례). fx 는 fx_light_return 하나뿐(resultGlow 없음).*/
const THEME = {
  speakers: { hati: { name: "하티" } },
  bannerNode: "p3_m1_intro",
  initialFriend: "placeholder",
  bg: {
    states: { main: A + "/planet3/prologue-bg.png" },
    initial: "main",
    byNode: { p3_m1_intro: "main" },
  },
  hatiSprites: {
    char: {
      thinking: A + "/char/Hati/hati_thinking.png",
      explaining: A + "/char/Hati/hati_explaining.png",
      suggesting: A + "/char/Hati/hati_suggesting.png",
      worried: A + "/char/Hati/hati_worried.png",
      praising: A + "/char/Hati/hati_praising.png",
      cheering: A + "/char/Hati/hati_cheering.png",
      proud: A + "/char/Hati/hati_proud.png",
      celebrating: A + "/char/Hati/hati_celebrating.png",
    },
    initial: "thinking",
    byNode: {},
  },
  friends: {
    placeholder: {
      char: { sad: A + "/char/Lumi/lumi_sad.png" },
      initial: "sad",
      byNode: {},
    },
  },
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};

/* ==========================================================================
   타자기 blip 순수 로직 (src/lib/typeSound.ts 이식)
   ========================================================================== */
const BLIP_EVERY = 4;
const SILENT_CHAR = /[\s.,!?…·'"“”‘’\-—~()[\]{}:;]/;
function isSpeakingChar(ch) {
  return ch !== undefined && !SILENT_CHAR.test(ch);
}
function blipAt(text, index) {
  const ch = text[index];
  if (ch === undefined || !isSpeakingChar(ch)) return false;
  let n = 0;
  for (let i = 0; i <= index; i++) {
    if (isSpeakingChar(text[i])) n++;
    else n = 0;
  }
  return n % BLIP_EVERY === 1;
}
function blipSound(speaker) {
  return speaker === "hati" ? "blipHati" : "blipFriend";
}

/* ==========================================================================
   미니게임: 공감 송신기 사용 설명서 완성 (EmpathyManualGame.tsx 이식).
   원본: mytemp/얼음행성미션1/index.html 의 #gameShell 로직. 각 단계마다 6지선다 중
   "공감하는 행동" 정답 3개를 고르면 설명서 슬롯이 완성되고, 3단계를 모두 완성하면
   onDone() 을 호출해 다음 노드(p3_m1_postplay)로 진행한다.
   ⚠ 원본은 이 게임 안에서 효과음을 재생하지 않는다(audio.play 호출 없음) — 그대로 무음.
   ========================================================================== */
const EM_STEPS = [
  {
    title: "친구의 말에 귀 기울여 주기",
    situation: '"미술 시간에 열심히 그림을 그렸는데..."',
    mission: "좋은 행동 고르기",
    resultTitle: "1. 친구의 말에 귀 기울여 주세요.",
    resultDetail: "친구를 바라봐요.\n끝까지 기다려요.",
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
    situation: '"...실수해서 그림이 망가졌어."',
    mission: "공감하며 듣는 행동 고르기",
    resultTitle: "2. 친구의 말에 따뜻하게 반응해 주세요.",
    resultDetail: "미소를 지어요.\n고개를 끄덕여요.",
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
    situation: '"정말 속상했어."',
    mission: "친구의 마음을 이해하는 말 고르기",
    resultTitle: "3. 친구의 감정을 말로 표현해 주세요.",
    resultDetail: "많이 긴장했겠구나.\n걱정되던 마음이었겠구나.",
    choices: [
      { text: '"많이 속상했겠구나."', correct: true },
      { text: '"다음엔 잘하면 돼."', correct: false },
      { text: '"별일 아니야."', correct: false },
      { text: '"그랬구나."', correct: true },
      { text: '"그 정도 가지고 왜 그래?"', correct: false },
      { text: '"정말 아쉬웠겠구나."', correct: true },
    ],
  },
];

const EM_DEFAULT_FEEDBACK = "정답 3개를 모두 선택하면 설명서가 완성됩니다.";
const EM_NEEDED = 3; // 단계별 정답 개수

const EmpathyManualGame = (function () {
  let currentStep = 0;
  let completed = [false, false, false];
  let chosen = []; // 이번 단계에서 맞힌 선택지 index
  let wrongIdx = null; // 오답 흔들림 표시
  let feedback = EM_DEFAULT_FEEDBACK;
  let wrongTimer = 0;

  let container = null;
  let onFinish = null;
  let root = null;

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === "class") n.className = props[k];
        else if (k === "text") n.textContent = props[k];
        else n.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c) n.appendChild(c);
    });
    return n;
  }

  function resetState() {
    currentStep = 0;
    completed = [false, false, false];
    chosen = [];
    wrongIdx = null;
    feedback = EM_DEFAULT_FEEDBACK;
  }

  function selectChoice(idx, correct) {
    const stepDone = completed[currentStep];
    if (stepDone || chosen.indexOf(idx) !== -1) return;

    if (!correct) {
      wrongIdx = idx;
      feedback = "다시 생각해 보세요. 친구를 공감하는 행동을 골라야 해요.";
      render();
      window.clearTimeout(wrongTimer);
      wrongTimer = window.setTimeout(() => {
        if (wrongIdx === idx) wrongIdx = null;
        render();
      }, 450);
      return;
    }

    chosen = chosen.concat([idx]);

    if (chosen.length < EM_NEEDED) {
      feedback = "좋아요! 정답 " + chosen.length + "개를 찾았습니다.";
      render();
      return;
    }

    completed = completed.map((v, i) => (i === currentStep ? true : v));
    feedback = "단계 " + (currentStep + 1) + " 완성!";
    render();
  }

  function nextStep() {
    if (!completed[currentStep]) return;
    const isLast = currentStep === EM_STEPS.length - 1;
    if (isLast) {
      if (onFinish) onFinish();
      return;
    }
    currentStep += 1;
    chosen = [];
    wrongIdx = null;
    feedback = EM_DEFAULT_FEEDBACK;
    render();
  }

  function restart() {
    resetState();
    render();
  }

  // 슬롯별 진행 점(정답 1개=점 1개): 완성 3, 현재 단계 chosen 수, 이후 0.
  function dotCount(slot) {
    return completed[slot] ? 3 : slot === currentStep ? chosen.length : 0;
  }

  function buildSlot(s, i) {
    const done = completed[i];
    const dots = dotCount(i);
    const dotsEl = el("div", { class: "slot-dots", "aria-hidden": "true" });
    [0, 1, 2].forEach((d) => dotsEl.appendChild(el("span", { class: "dot" + (d < dots ? " on" : "") })));

    let bodyEl;
    if (done) {
      const detail = el("span", { class: "record-detail" });
      s.resultDetail.split("\n").forEach((line, li) => {
        if (li > 0) detail.appendChild(document.createElement("br"));
        detail.appendChild(document.createTextNode(line));
      });
      const entry = el("div", { class: "slot-entry" }, [
        el("span", { class: "record-title", text: s.resultTitle }),
        detail,
      ]);
      bodyEl = el("div", { class: "slot-body" }, [entry]);
    } else {
      const ghost = el("div", { class: "slot-ghost", "aria-hidden": "true" }, [
        el("div", { class: "ghost-row" }, [
          el("span", { class: "ghost-num", text: i + 1 + "." }),
          el("span", { class: "ghost-bar w-title" }),
        ]),
        el("span", { class: "ghost-bar w-1" }),
        el("span", { class: "ghost-bar w-2" }),
      ]);
      bodyEl = el("div", { class: "slot-body" }, [ghost]);
    }

    return el("div", { class: "manual-slot" + (done ? " complete" : "") }, [
      el("div", { class: "slot-label", text: "단계 " + (i + 1) }),
      dotsEl,
      bodyEl,
    ]);
  }

  function render() {
    if (!root) return;
    root.innerHTML = "";

    const step = EM_STEPS[currentStep];
    const isLast = currentStep === EM_STEPS.length - 1;
    const stepDone = completed[currentStep];

    const slotsEl = el("div", { class: "slots" });
    EM_STEPS.forEach((s, i) => slotsEl.appendChild(buildSlot(s, i)));
    const board = el("aside", { class: "board", "aria-label": "공감 송신기 사용 설명서" }, [
      el("h1", { text: "공감 송신기 사용 설명서" }),
      slotsEl,
    ]);

    const speech = el("div", { class: "speech" }, [
      el("div", { class: "alien", "aria-hidden": "true", text: "👽" }),
      el("div", { class: "speech-text", text: step.situation }),
    ]);

    const choicesEl = el("div", { class: "choices" });
    step.choices.forEach((c, idx) => {
      const picked = chosen.indexOf(idx) !== -1;
      const cls = "choice" + (picked ? " correct" : "") + (wrongIdx === idx ? " wrong" : "");
      const btn = el("button", { type: "button", class: cls, text: c.text });
      if (stepDone || picked) btn.disabled = true;
      btn.addEventListener("click", () => selectChoice(idx, c.correct));
      choicesEl.appendChild(btn);
    });

    const restartBtn = el("button", { class: "secondary", type: "button", text: "처음부터" });
    restartBtn.addEventListener("click", restart);
    const nextBtn = el("button", { class: "primary", type: "button", text: isLast ? "완성" : "다음" });
    nextBtn.disabled = !stepDone;
    nextBtn.addEventListener("click", nextStep);

    const activity = el("article", { class: "activity" }, [
      el("div", { class: "activity-head" }, [
        el("div", { class: "step-badge", text: "단계 " + (currentStep + 1) }),
        el("div", { class: "activity-title", text: step.title }),
      ]),
      el("div", { class: "tag-row" }, [
        el("span", { class: "small-tag", text: "가디언즈 작전 계획" }),
        el("span", { class: "mission-text", text: step.mission }),
      ]),
      speech,
      el("span", { class: "choice-label", text: "선택" }),
      choicesEl,
      el("p", { class: "feedback", text: feedback }),
      el("div", { class: "controls" }, [restartBtn, nextBtn]),
    ]);

    const stageEl = el("section", { class: "stage" }, [board, el("section", { class: "center" }, [activity])]);
    const viewport = el("div", { class: "etg-viewport" }, [stageEl]);
    root.appendChild(viewport);
  }

  function mount(containerEl, finishCb) {
    resetState();
    container = containerEl;
    onFinish = finishCb;
    root = el("div", { class: "etg" });
    root.addEventListener("click", (e) => e.stopPropagation());
    container.appendChild(root);
    render();
  }

  function unmount() {
    window.clearTimeout(wrongTimer);
    if (root) root.remove();
    root = null;
    container = null;
  }

  return { mount, unmount };
})();

/* ==========================================================================
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션1이 쓰는 부분만).
   지원 노드 타입: line / minigame. (mission01.json 은 choice/branch/mirrors/gauge/
   reveal/video 를 쓰지 않는다 — 미포함.) 레이더 HUD·cast 무대는 showRadar:false·theme.cast
   미사용이라 미포함. resultGlow(bookGlow/choiceGlow)도 theme.fx 에 없어 미포함.
   ========================================================================== */
(function missionPlayer() {
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const els = {
    bg: $("bg"),
    titleBanner: $("titleBanner"),
    hatiFull: $("hatiFull"),
    hatiBubble: $("hatiBubble"),
    hatiBubbleText: $("hatiBubble").querySelector("span"),
    friendWrap: $("friendWrap"),
    friend: $("friend"),
    friendBubble: $("friendBubble"),
    friendBubbleText: $("friendBubble").querySelector("span"),
    choiceImage: $("choiceImage"),
    cardStage: $("cardStage"),
    minigameLayer: $("minigameLayer"),
    hatiBox: $("hatiBox"),
    hatiAvatar: $("hatiAvatar"),
    hatiText: $("hatiText"),
    nextBtn: $("nextBtn"),
    tapHint: $("tapHint"),
    fxLayer: $("fxLayer"),
  };

  // ---------- 상태(vm) — MissionPlayer VM 중 미션1이 쓰는 필드만 ----------
  const vm = {
    mode: "idle", // idle | typing | await | end
    bubbleKind: "none", // none | hatiBox | hatiBubble | friendBubble
    text: "",
    intro: false,
    fullHati: false,
    friendId: THEME.initialFriend,
    friend: THEME.friends[THEME.initialFriend].initial,
    hati: THEME.hatiSprites.initial,
    bg: THEME.bg.initial,
    hideFriend: false,
    choiceImage: "", // 화면 가운데 큰 이미지(node.image)
    cards: [],
    completeBanner: "",
    bright: false,
    progress: "start", // start | done
    tapHint: "",
    showNext: false,
    stage: "none", // none | minigame
  };
  const ms = { done: null };

  const timers = { typer: 0, auto: 0, resolve: null, finish: null };
  let exiting = false;

  // ---------- fx ----------
  function sparkleBurst() {
    const glyphs = ["✨", "⭐", "💫", "🌟"];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement("div");
      s.className = "spark";
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = 480 + Math.random() * 1100 + "px";
      s.style.top = 180 + Math.random() * 760 + "px";
      s.style.fontSize = 28 + Math.random() * 36 + "px";
      s.style.animationDelay = Math.random() * 0.5 + "s";
      els.fxLayer.appendChild(s);
      window.setTimeout(() => s.remove(), 1300);
    }
  }

  function execFx(name) {
    switch (name) {
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
  }

  function execCommands(cmds) {
    (cmds || []).forEach((c) => {
      if (c.cmd === "fx") execFx(THEME.fx[c.value || ""] || c.value || "");
    });
  }

  // ---------- 씬(스프라이트/배경/친구) 갱신 ----------
  function updateScene(node) {
    if (node.speaker && node.speaker !== "hati" && node.speaker !== vm.friendId) {
      vm.friendId = node.speaker;
      const fs = THEME.friends[vm.friendId];
      vm.friend = (fs && fs.initial) || vm.friend;
    }
    const fs = THEME.friends[vm.friendId];
    if (fs && fs.byNode[node.id]) vm.friend = fs.byNode[node.id];
    if (THEME.hatiSprites.byNode[node.id]) vm.hati = THEME.hatiSprites.byNode[node.id];
    const bg = THEME.bg.byNode[node.id];
    if (bg) vm.bg = bg;
    vm.hideFriend = !!node.hideFriend;
    vm.choiceImage = node.image || "";
    vm.cards = node.cards || [];
    vm.completeBanner = node.completeBanner || "";
    vm.intro = node.id === THEME.bannerNode;
    vm.fullHati = vm.intro; // fullHatiNodes 미지정 — bannerNode 에서만 전신 하티
    if (vm.intro) audio.play("title");
    const s = THEME.sfx.byNode[node.id];
    if (s) audio.play(s);
    render();
  }

  // ---------- 타자기 ----------
  function typeInto(txt, speaker, onDone) {
    vm.text = "";
    vm.mode = "typing";
    render();
    let i = 0;
    window.clearInterval(timers.typer);
    timers.typer = window.setInterval(() => {
      const at = i;
      vm.text = txt.slice(0, ++i);
      render();
      if (blipAt(txt, at)) audio.play(blipSound(speaker));
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
  }

  // ---------- view (RunnerView 구현) ----------
  function showLine(node, onTyped) {
    return new Promise((resolve) => {
      timers.resolve = resolve;
      updateScene(node);
      vm.tapHint = "";
      const isHati = node.speaker === "hati";
      const introHati = isHati && vm.fullHati;
      vm.bubbleKind = introHati ? "hatiBubble" : isHati ? "hatiBox" : "friendBubble";
      render();
      typeInto(node.text || "", isHati ? "hati" : "friend", () => {
        vm.mode = "await";
        if (onTyped) onTyped();
        vm.tapHint = node.next ? "▼ 화면을 탭하면 계속" : "🎉 미션 완료!";
        render();
        window.clearTimeout(timers.auto);
        // 미션1은 모든 라인이 noAuto — 자동 진행 없음(탭으로만).
        if (!node.noAuto) {
          timers.auto = window.setTimeout(() => {
            if (vm.mode === "await") advanceLine();
          }, 2000);
        }
      });
    });
  }

  function advanceLine() {
    window.clearTimeout(timers.auto);
    vm.tapHint = "";
    vm.mode = "idle";
    render();
    const r = timers.resolve;
    timers.resolve = null;
    if (r) r();
  }

  function showMinigame(node, done) {
    updateScene(node); // 배경 유지
    vm.stage = "minigame";
    vm.mode = "idle";
    vm.bubbleKind = "none";
    vm.tapHint = "";
    ms.done = done;
    render();
    EmpathyManualGame.mount(els.minigameLayer, () => {
      EmpathyManualGame.unmount();
      finishMinigame();
    });
  }
  function finishMinigame() {
    const done = ms.done;
    ms.done = null;
    vm.stage = "none";
    render();
    if (done) done();
  }

  function endMission() {
    vm.mode = "end";
    render();
  }

  // ---------- DialogueRunner (engine/runner.ts 이식) ----------
  const nodes = {};
  MISSION.nodes.forEach((n) => (nodes[n.id] = n));
  let current;
  let curNodeClass = null;

  function setNodeClass(id) {
    if (curNodeClass) stage.classList.remove("node-" + curNodeClass);
    curNodeClass = id;
    stage.classList.add("node-" + id);
  }

  function typeOf(n) {
    return n.type || "line";
  }
  function go(id) {
    if (id == null) return endMission();
    current = id;
    const node = nodes[id];
    setNodeClass(id); // #stage.node-<id> (planet3/Mission.css 오버라이드용 — intro/play/postplay/end)
    execCommands(node.onEnter);
    const t = typeOf(node);
    if (t === "minigame") return showMinigame(node, () => advance(node));
    // line
    showLine(node, () => execCommands(node.onComplete)).then(() => advance(node));
  }
  function advance(node) {
    if (node.next) go(node.next);
    else endMission();
  }

  // ---------- 스테이지 탭(라인 진행) ----------
  stage.addEventListener("click", () => {
    if (vm.stage === "minigame") return; // 미니게임 중 탭은 미니게임 내부가 처리
    if (vm.mode === "typing") {
      if (timers.finish) timers.finish();
    } else if (vm.mode === "await") {
      audio.play("tap");
      window.clearTimeout(timers.auto);
      vm.tapHint = "";
      vm.mode = "idle";
      render();
      const r = timers.resolve;
      timers.resolve = null;
      if (r) r();
    }
  });

  // ---------- 다음 미션 버튼 ----------
  // 원본 planet3/index.tsx: mission1 onExit → goTo("mission2")(=mission23; 미션2·3이
  // 하나의 3D 월드로 묶여 있다).
  els.nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    els.nextBtn.disabled = true;
    fadeNav("../mission23/index.html");
  });

  // ---------- 렌더 ----------
  let lastCardsKey = "";
  function renderCards() {
    els.cardStage.innerHTML = "";
    vm.cards.forEach((c) => {
      const item = document.createElement("div");
      item.className = "card-item";
      const img = document.createElement("img");
      img.src = c.image;
      img.alt = "";
      img.addEventListener("error", () => (img.style.visibility = "hidden"));
      item.appendChild(img);
      els.cardStage.appendChild(item);
    });
  }

  // 완료 배너(cbPop 애니메이션이 등장 시 재생되도록 동적 생성/제거)
  let completeBannerEl = null;
  function renderCompleteBanner() {
    if (vm.completeBanner) {
      if (!completeBannerEl || completeBannerEl.dataset.text !== vm.completeBanner) {
        if (completeBannerEl) completeBannerEl.remove();
        const wrap = document.createElement("div");
        wrap.id = "completeBanner";
        wrap.dataset.text = vm.completeBanner;
        const star = document.createElement("img");
        star.className = "cb-star";
        star.src = A + "/ui/star_gold.png";
        star.alt = "";
        star.addEventListener("error", () => (star.style.visibility = "hidden"));
        const plaque = document.createElement("div");
        plaque.className = "cb-plaque";
        const s1 = document.createElement("span");
        s1.className = "cb-spark";
        s1.textContent = "✦";
        const txt = document.createElement("span");
        txt.className = "cb-text";
        txt.textContent = vm.completeBanner;
        const s2 = document.createElement("span");
        s2.className = "cb-spark";
        s2.textContent = "✦";
        plaque.append(s1, txt, s2);
        wrap.append(star, plaque);
        stage.appendChild(wrap);
        completeBannerEl = wrap;
      }
    } else if (completeBannerEl) {
      completeBannerEl.remove();
      completeBannerEl = null;
    }
  }

  // 진행 스테퍼: 미션1 = step 1 고정(완료 시 다음 노드가 "활성"으로 풀린다 — 최종 미션 아님).
  const STEP = 1;
  function applyStepper() {
    const missionDone = vm.progress === "done";
    const stepCls = (i) =>
      i < STEP ? "done" : i === STEP ? (missionDone ? "done" : "active") : i === STEP + 1 && missionDone ? "active" : "locked";
    [1, 2, 3].forEach((i) => {
      const node = document.getElementById("mission" + i);
      node.classList.remove("done", "active", "locked");
      node.classList.add(stepCls(i));
    });
    const connFilled = (i) => i < STEP || (i === STEP && missionDone);
    document.getElementById("conn1").classList.toggle("filled", connFilled(1));
    document.getElementById("conn2").classList.toggle("filled", connFilled(2));
  }

  function render() {
    // 배경/밝기
    els.bg.src = THEME.bg.states[vm.bg] || "";
    stage.classList.toggle("bright", vm.bright);

    // 스테퍼
    applyStepper();

    // 타이틀 배너 / 전신 하티
    els.titleBanner.classList.toggle("show", vm.intro);
    els.hatiFull.classList.toggle("show", vm.fullHati);

    // 하티 인트로 말풍선
    els.hatiBubble.classList.toggle("show", vm.bubbleKind === "hatiBubble");
    els.hatiBubbleText.textContent = vm.bubbleKind === "hatiBubble" ? vm.text : "";

    // 친구(이 미션은 항상 hideFriend) + 말풍선
    const friendBubbleText = vm.bubbleKind === "friendBubble" ? vm.text : "";
    els.friend.src = THEME.friends[vm.friendId].char[vm.friend] || "";
    els.friendWrap.classList.toggle("hide", vm.fullHati || vm.stage !== "none" || vm.hideFriend);
    els.friendBubble.classList.toggle("show", !!friendBubbleText && vm.stage === "none");
    els.friendBubbleText.textContent = friendBubbleText;

    // 가운데 큰 이미지(node.image)
    if (vm.choiceImage) {
      els.choiceImage.src = vm.choiceImage;
      els.choiceImage.classList.add("show");
    } else {
      els.choiceImage.classList.remove("show");
    }

    // 공감 카드(변경 시에만 재빌드)
    const cardsKey = vm.cards.map((c) => c.image).join("|");
    if (cardsKey !== lastCardsKey) {
      lastCardsKey = cardsKey;
      renderCards();
    }

    // 완료 배너
    renderCompleteBanner();

    // 하티 가이드 박스
    els.hatiBox.classList.toggle("show", vm.bubbleKind === "hatiBox");
    els.hatiAvatar.src = THEME.hatiSprites.char[vm.hati] || "";
    els.hatiText.textContent = vm.bubbleKind === "hatiBox" ? vm.text : "";

    // 다음 미션 버튼
    els.nextBtn.classList.toggle("show", vm.showNext);

    // 탭 힌트
    els.tapHint.classList.toggle("show", !!vm.tapHint);
    els.tapHint.textContent = vm.tapHint;
  }

  // ---------- DEV 점프 (HMR 부재 완화책) ----------
  // ?node=<id>  : 특정 노드부터
  // ?step=N     : nodes 배열의 N번째(0-based)부터
  // ?end        : 마지막 노드(엔딩)부터
  function resolveStart() {
    const p = new URLSearchParams(location.search);
    const nodeParam = p.get("node");
    if (nodeParam && nodes[nodeParam]) return nodeParam;
    const stepParam = p.get("step");
    if (stepParam !== null) {
      const i = parseInt(stepParam, 10);
      if (!Number.isNaN(i) && i >= 0 && i < MISSION.nodes.length) return MISSION.nodes[i].id;
    }
    if (p.has("end")) return MISSION.nodes[MISSION.nodes.length - 1].id;
    return MISSION.start;
  }

  // 개발용 훅(원본 MissionPlayer 의 window.__runner 관례). 상태 관찰·디버깅용.
  window.__m1 = { vm, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission1] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
