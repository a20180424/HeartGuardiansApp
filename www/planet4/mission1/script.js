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
  location.href = ROOT + "auth/";
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
    { label: "로그인(auth)", href: ROOT + "auth/" },
    { label: "홈(home)", href: ROOT + "home/" },
  ];
  const COL_HEAD = ["프롤로그", "미션1", "미션2", "미션3"];
  const PLANETS = [
    { n: 1, cells: ["planet1/prologue/", "planet1/mission1/", "planet1/mission2/", "planet1/mission3/"] },
    { n: 2, cells: ["planet2/prologue/", "planet2/mission1/", "planet2/mission2/", "planet2/mission3/"] },
    { n: 3, cells: ["planet3/prologue/", "planet3/mission1/", "planet3/mission23/", null] },
    { n: 4, cells: ["planet4/prologue/", "planet4/mission1/", "planet4/mission2/", "planet4/mission3/"] },
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
      home.addEventListener("click", () => go(ROOT + "home/"));
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
  start: "p4_m1_intro",
  nodes: [
    {
      id: "p4_m1_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      sideImageLeft: A + "/planet4/empathy-showroom.png",
      noAuto: true,
      text: "축하해!\n네 개의 도구를 모두 획득했어.\n하지만 마지막 공감 도구는…\n최종 점검에 통과한\n가디언에게만 주어져",
      next: "p4_m1_play",
    },
    { id: "p4_m1_play", type: "minigame", game: "empathyCompass", next: "p4_m1_postplay" },
    {
      id: "p4_m1_postplay",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      sideImageLeft: A + "/planet4/empathy-showroom-complete.png",
      noAuto: true,
      text: "공감 나침반은\n특별한 힘을 가지고 있어.\n하지만 기억해!\n나침반은 혼자서는 움직이지 않아.\n용기를 내어 첫 걸음을\n내디딜 때만 빛을 낸다구.",
      next: "p4_m1_cards",
    },
    {
      id: "p4_m1_cards",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감의 시작은 용기야.\n마음으로 느낀 공감을 말과 행동으로 실천해 보자!",
      cards: [
        { image: A + "/planet4/shadow-planet-empathy-card-1.png" },
        { image: A + "/planet4/shadow-planet-empathy-card-2.png" },
      ],
      next: "p4_m1_end",
    },
    {
      id: "p4_m1_end",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      sideImageLeft: A + "/planet4/empathy-showroom-complete.png",
      noAuto: true,
      text: "이제 그림자 행성으로 첫 걸음을 내디뎌 보자!",
      completeBanner: "미션 완료!",
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션1 테마 — theme.ts 의 MISSION01_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ showRadar:false(레이더 HUD 없음)·cast(캐릭터 무대, 이 테마는 미사용)·
   choiceIcons/badgeColors(choice 노드 없음) 미포함. "banner" 텍스트는 index.html 에 정적으로
   박아 넣었다(다른 미션 템플릿과 동일 관례). fullHatiNodes(전신 하티 추가 노드)는 이 미션
   최초 사용 — bannerNode 외에 postplay/end 도 전신 하티+말풍선으로 그린다(p4_m1_cards 는
   하단 하티 박스). */
const THEME = {
  speakers: { hati: { name: "하티" } },
  bannerNode: "p4_m1_intro",
  fullHatiNodes: ["p4_m1_postplay", "p4_m1_end"],
  initialFriend: "placeholder",
  bg: {
    states: { main: A + "/planet4/shadow-spaceship-bg.png" },
    initial: "main",
    byNode: { p4_m1_intro: "main" },
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
   미니게임: 가디언즈 최종 점검하기 (EmpathyCompassStage.tsx + empathyCompass.data.ts 이식).
   원본: mytemp/그림자행성 미션1 게임/index.html 의 #checkScreen 3요소(tool-steps·quiz-panel·
   feedback) + 서약서·나침반 보상 카드. 흐름: quiz(11문항) → pledge(서약서 체크·확인) →
   reward(나침반 획득, 클릭 시 onDone).
   ⚠ 원본은 이 스테이지 안에서 효과음을 재생하지 않는다(audio.play 호출 없음) — 그대로 무음.
   ========================================================================== */
const EC_ASSET = A + "/planet4";

const EC_TOOLS = [
  {
    name: "마음 신호 탐색기",
    key: "관심",
    img: EC_ASSET + "/tool-signal-detector.png",
    items: ["친구에게 평소 관심을 가지고 살펴봅니다."],
  },
  {
    name: "공감 거울",
    key: "이해",
    img: EC_ASSET + "/tool-empathy-mirror.png",
    items: [
      "내 마음보다 친구의 마음을 먼저 이해하려고 노력합니다.",
      "같은 상황에서도 사람마다 느끼는 감정이 다를 수 있음을 이해합니다.",
    ],
  },
  {
    name: "공감 레이더",
    key: "관찰",
    img: EC_ASSET + "/tool-empathy-radar.png",
    items: [
      "친구가 처한 상황, 표정, 행동을 자세히 살펴봅니다.",
      "한 가지 모습만 보고 감정을 결정하지 않습니다.",
    ],
  },
  {
    name: "공감 송신기",
    key: "표현",
    img: EC_ASSET + "/tool-empathy-transmitter.png",
    items: [
      "친구와 눈을 마주치고 친구의 말에 귀를 기울여 듣습니다.",
      "친구의 말을 들을 때 고개를 끄덕이거나 친구와 같은 표정을 지어 줍니다.",
      "친구의 감정을 읽고 “그랬구나.”와 같은 말로 표현해 줍니다.",
      "내 감정을 친구에게 강요하지 않고 친구의 감정을 존중합니다.",
    ],
  },
  {
    name: "공감 나침반",
    key: "실천",
    img: EC_ASSET + "/tool-empathy-compass.png",
    items: [
      "도움이 필요한 친구에게 용기를 내어 먼저 다가갑니다.",
      "공감은 완벽하게 잘하는 것이 아니라, 계속 실천하려고 노력하는 것임을 알고 있습니다.",
    ],
  },
];
const EC_HATI_DEFAULT = EC_ASSET + "/hati-default.png";
const EC_HATI_CLAP = EC_ASSET + "/hati-clap.png";
const EC_PLEDGE_SHEET = EC_ASSET + "/guardians-pledge.png";
const EC_COMPASS_IMG = EC_ASSET + "/tool-empathy-compass.png";

const EmpathyCompassStage = (function () {
  const ADVANCE_MS = 1150; // 답변 피드백을 보여준 뒤 다음 문항으로
  const PLEDGE_DELAY_MS = 700; // 마지막 문항 후 서약서 등장까지
  const INTRO_FEEDBACK = { text: "O 또는 X를 선택해 나의 모습을 점검해 봐!", tone: "" };

  let phase = "quiz"; // quiz | pledge | reward
  let toolIndex = 0;
  let itemIndex = 0;
  let locked = false; // 답변 후 다음 문항까지 입력 잠금
  let clap = false; // 하티 박수 연출
  let feedback = INTRO_FEEDBACK;
  let pledgeChecked = false;

  let container = null;
  let onFinish = null;
  let root = null;

  let advanceTimer = 0;
  let pledgeTimer = 0;

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
    phase = "quiz";
    toolIndex = 0;
    itemIndex = 0;
    locked = false;
    clap = false;
    feedback = INTRO_FEEDBACK;
    pledgeChecked = false;
  }

  function choose(answer) {
    if (locked) return;
    locked = true;
    if (answer === "o") {
      clap = true;
      feedback = { text: "정말 멋져! 그 마음을 이어가자!", tone: "good" };
    } else {
      clap = false;
      feedback = { text: "괜찮아! 지금부터 한 걸음씩 실천하면 돼!", tone: "try" };
    }
    render();
    window.clearTimeout(advanceTimer);
    advanceTimer = window.setTimeout(advance, ADVANCE_MS);
  }

  function advance() {
    clap = false;
    const tool = EC_TOOLS[toolIndex];
    if (itemIndex + 1 < tool.items.length) {
      itemIndex += 1;
      locked = false;
      render();
      return;
    }
    if (toolIndex + 1 < EC_TOOLS.length) {
      toolIndex += 1;
      itemIndex = 0;
      locked = false;
      render();
      return;
    }
    // 모든 문항 완료 → 서약서
    render();
    window.clearTimeout(pledgeTimer);
    pledgeTimer = window.setTimeout(() => {
      phase = "pledge";
      render();
    }, PLEDGE_DELAY_MS);
  }

  function buildToolSteps() {
    const aside = el("aside", { class: "ec-tool-steps" });
    EC_TOOLS.forEach((t, i) => {
      const cls = "ec-tool-step" + (i === toolIndex ? " active" : "") + (i < toolIndex ? " done" : "");
      const img = el("img", { src: t.img, alt: "" });
      img.draggable = false;
      aside.appendChild(
        el("div", { class: cls }, [
          img,
          el("strong", { text: i + 1 + ". " + t.name }),
          el("small", { text: t.key }),
        ]),
      );
    });
    return aside;
  }

  function buildQuizPanel() {
    const tool = EC_TOOLS[toolIndex];
    const heading = el("div", { class: "ec-panel-heading" }, [
      el("h1", { text: "가디언즈 최종 점검하기" }),
      el("p", { text: "나의 공감하는 모습을 솔직하게 점검해 보세요" }),
    ]);

    const progress = el("span", {
      class: "ec-progress",
      "aria-label": itemIndex + 1 + " / " + tool.items.length,
    });
    tool.items.forEach((_, i) => {
      progress.appendChild(
        el("i", { class: "ec-dot" + (i < itemIndex ? " done" : "") + (i === itemIndex ? " on" : "") }),
      );
    });
    const chipRow = el("div", {}, [el("span", { class: "ec-step-chip", text: "공감 도구 " + (toolIndex + 1) }), progress]);

    const choiceO = el("button", { class: "ec-choice o" }, [el("span", { text: "⭕" }), document.createTextNode("잘하고 있어요")]);
    choiceO.disabled = locked;
    choiceO.addEventListener("click", () => choose("o"));
    const choiceX = el("button", { class: "ec-choice x" }, [el("span", { text: "❌" }), document.createTextNode("노력할게요")]);
    choiceX.disabled = locked;
    choiceX.addEventListener("click", () => choose("x"));

    return el("div", { class: "ec-quiz-panel" }, [
      heading,
      chipRow,
      el("h2", { class: "ec-tool-name", text: tool.name }),
      el("div", { class: "ec-keyword", text: "핵심 공감 능력 · " + tool.key }),
      el("div", { class: "ec-question", text: tool.items[itemIndex] }),
      el("div", { class: "ec-choices" }, [choiceO, choiceX]),
    ]);
  }

  function buildFeedback() {
    const img = el("img", { src: clap ? EC_HATI_CLAP : EC_HATI_DEFAULT, alt: "하티", class: clap ? "clapping" : "" });
    img.draggable = false;
    return el("div", { class: "ec-feedback" }, [
      img,
      el("span", { class: "ec-feedback-text " + feedback.tone, text: feedback.text }),
    ]);
  }

  function buildPromise() {
    if (phase === "quiz") return null;
    if (phase === "pledge") {
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = pledgeChecked;
      check.addEventListener("change", (e) => {
        pledgeChecked = e.target.checked;
        confirmBtn.disabled = !pledgeChecked;
      });
      const label = el("label", { class: "ec-promise-check" }, [check, document.createTextNode(" 마음을 담아 약속합니다.")]);
      var confirmBtn = el("button", { class: "ec-confirm", text: "약속 확인" });
      confirmBtn.disabled = !pledgeChecked;
      confirmBtn.addEventListener("click", () => {
        phase = "reward";
        render();
      });
      const card = el("div", { class: "ec-promise-card" }, [el("div", { class: "ec-promise-actions" }, [label, confirmBtn])]);
      card.style.backgroundImage = "url('" + EC_PLEDGE_SHEET + "')";
      return el("div", { class: "ec-promise" }, [card]);
    }
    // reward
    const compass = el("img", { class: "ec-reward-compass earned", src: EC_COMPASS_IMG, alt: "획득한 공감 나침반" });
    compass.draggable = false;
    const card = el("div", { class: "ec-promise-card reward-card", role: "button" }, [
      el("div", { class: "ec-heart-mark", text: "♥" }),
      el("h2", { text: "공감 나침반 획득!" }),
      compass,
      el("div", { class: "ec-reward-title" }, [
        document.createTextNode("마음을 이해하고 실천하는"),
        document.createElement("br"),
        document.createTextNode("하트 가디언즈가 되었어요!"),
      ]),
      el("div", { class: "ec-reward-hint", text: "화면을 눌러 계속하기 ▶" }),
    ]);
    card.addEventListener("click", () => {
      if (onFinish) onFinish();
    });
    return el("div", { class: "ec-promise" }, [card]);
  }

  function render() {
    if (!root) return;
    root.innerHTML = "";
    const frame = el("div", { class: "ec-frame" }, [buildToolSteps(), buildQuizPanel(), buildFeedback()]);
    const promise = buildPromise();
    if (promise) frame.appendChild(promise);
    root.appendChild(el("div", { class: "ec-window" }, [frame]));
  }

  function mount(containerEl, finishCb) {
    resetState();
    container = containerEl;
    onFinish = finishCb;
    root = el("div", { class: "ec-overlay" });
    root.addEventListener("click", (e) => e.stopPropagation());
    container.appendChild(root);
    render();
  }

  function unmount() {
    window.clearTimeout(advanceTimer);
    window.clearTimeout(pledgeTimer);
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
   미사용이라 미포함.
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
    sideImageLeft: $("sideImageLeft"),
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
    sideImageLeft: "", // 좌측 장식 이미지(node.sideImageLeft, 없으면 "")
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
    vm.sideImageLeft = node.sideImageLeft || "";
    vm.cards = node.cards || [];
    vm.completeBanner = node.completeBanner || "";
    vm.intro = node.id === THEME.bannerNode;
    // 전신 하티: bannerNode(인트로) ∪ THEME.fullHatiNodes(추가 지정 노드).
    vm.fullHati = vm.intro || THEME.fullHatiNodes.includes(node.id);
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
    EmpathyCompassStage.mount(els.minigameLayer, () => {
      EmpathyCompassStage.unmount();
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
    setNodeClass(id);
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
  // 원본 planet4/index.tsx: mission1 onExit → goTo("mission2") (completePlanet 아님, 최종 미션 아님).
  els.nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    els.nextBtn.disabled = true;
    fadeNav("../mission2/"); // 다음 미션으로
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

    // 좌측 장식 이미지(노드 sideImageLeft)
    if (vm.sideImageLeft) {
      els.sideImageLeft.src = vm.sideImageLeft;
      els.sideImageLeft.style.display = "";
    } else {
      els.sideImageLeft.style.display = "none";
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
