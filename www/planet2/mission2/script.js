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

/* APK(WebView)는 mediaPlaybackRequiresUserGesture=false 라 제스처 없이도 AudioContext 를
   열 수 있다. 네이티브면 로딩 즉시 언락을 시도해, 첫 탭 전에도(홈 인사말·미션 첫 대사 등)
   소리가 나게 한다. 웹 브라우저는 자동재생 정책상 resume() 이 무시될 뿐 — 회귀 없음.
   컨텍스트 준비 타이밍 대비로 몇 번 재시도. */
if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
  audio.unlock();
  document.addEventListener("DOMContentLoaded", () => audio.unlock());
  window.setTimeout(() => audio.unlock(), 300);
}

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
    { n: 3, cells: ["planet3/prologue/index.html", "planet3/mission1/index.html", "planet3/mission23/index.html", "planet3/mission23/index.html?stage2=1"] },
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
          const label = COL_HEAD[i];
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
   미션2 데이터 — mission02.json 인라인 (별도 fetch 금지, 페이지 독립성).
   "/assets/..." 경로는 ASSETS 접두어로 치환한다. 전 9노드 verbatim(전수 대조 완료):
   line(8) + minigame(1). choice/branch 없음(mission02.json 미사용).
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "p2_m2_intro",
  nodes: [
    {
      id: "p2_m2_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "안개 행성의 짙은 안개를 꿰뚫고 주민들의 진짜 감정을 찾으려면 공감 레이더가 필요해.",
      next: "p2_m2_brief1",
    },
    {
      id: "p2_m2_brief1",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감 레이더를 만들기 위해선 흩어진 감정 에너지를 모아 부품을 완성해야해!",
      next: "p2_m2_brief2",
    },
    {
      id: "p2_m2_brief2",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "감정 단어들을 성격에 맞게 분류하면,\n레이더 부품이 하나씩 만들어질거야!",
      next: "p2_m2_preplay1",
    },
    {
      id: "p2_m2_preplay1",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "단어를 잘 보고 성격에 맞는 감정 상자에 드래그해봐!",
      next: "p2_m2_preplay2",
    },
    {
      id: "p2_m2_preplay2",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "정확하게 분류하면 레이더 부품이 하나씩 완성될거야!",
      next: "p2_m2_play",
    },
    { id: "p2_m2_play", type: "minigame", game: "empathyRadar", next: "p2_m2_complete" },
    {
      id: "p2_m2_complete",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "드디어 공감 레이더가 완성됐어! 너 정말 멋지다!",
      next: "p2_m2_outro",
    },
    {
      id: "p2_m2_outro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "이제 어떤 감정도 놓치지 않고 찾을 수 있어! 친구들에게 따뜻한 공감을 전하러 가보자!",
      next: "p2_m2_cards",
    },
    {
      id: "p2_m2_cards",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "내 감정을 다양한 말로 표현할수록 내 마음을 더 잘 이해하게 되고, 친구의 마음도 더 잘 알아차려 공감할 수 있어!",
      cards: [
        { image: A + "/planet2/fog-planet-empathy-card-3.webp" },
        { image: A + "/planet2/fog-planet-empathy-card-4.webp" },
      ],
      next: "p2_m2_end",
    },
    {
      id: "p2_m2_end",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "새로운 친구를 만나러 가보자!",
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션2 테마 — theme.ts 의 MISSION02_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ choiceIcons(choice 노드 없음)·fx_result_glow(사용 안 함)·radar 상태전이(byNode 빈 객체
   → 정적 이미지라 radarHud 이미지는 index.html 에 고정 src 로 이미 박아둠) 미포함. */
const THEME = {
  speakers: { hati: { name: "하티" } },
  bannerNode: "p2_m2_intro",
  initialFriend: "placeholder",
  bg: {
    states: { main: A + "/bg/fog-planet-stage1.webp" },
    initial: "main",
    byNode: {},
  },
  hatiSprites: {
    char: {
      thinking: A + "/char/Hati/hati_thinking.webp",
      explaining: A + "/char/Hati/hati_explaining.webp",
      suggesting: A + "/char/Hati/hati_suggesting.webp",
      worried: A + "/char/Hati/hati_worried.webp",
      praising: A + "/char/Hati/hati_praising.webp",
      cheering: A + "/char/Hati/hati_cheering.webp",
      proud: A + "/char/Hati/hati_proud.webp",
      celebrating: A + "/char/Hati/hati_celebrating.webp",
    },
    initial: "thinking",
    byNode: {
      p2_m2_intro: "explaining",
      p2_m2_brief1: "explaining",
      p2_m2_brief2: "suggesting",
      p2_m2_preplay1: "suggesting",
      p2_m2_preplay2: "suggesting",
      p2_m2_complete: "celebrating", // 레이더 완성 — 멋지다!
      p2_m2_outro: "cheering",
      p2_m2_cards: "explaining",
      p2_m2_end: "cheering", // 새 친구 만나러 가자
    },
  },
  friends: {
    placeholder: {
      char: { sad: A + "/char/Lumi/lumi_sad.webp" },
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
   미니게임: 공감 레이더 (EmpathyRadarStage.tsx + empathyRadar.{data,logic}.ts 이식).
   STAGES(3스테이지 × 3감정 × 2단어 = 18단어, 부품 9개) 전수 인라인.
   --------------------------------------------------------------------------
   ⚠ 원본의 DEBUG_SHOW_ALL_PARTS 튜닝 플래그는 커밋 시 항상 false 라 미포함(YAGNI).
   ========================================================================== */
const ER_ASSET = A + "/planet2";

// empathyRadar.data.ts STAGES 전수 인라인(전수 대조 완료).
const ER_STAGES = [
  {
    id: 1,
    title: "기초 감정",
    emotions: [
      {
        id: "joy", name: "기쁨", emoji: "🟡", color: "#f4c430", partId: 1,
        words: [
          { id: "joy-1", text: "신나다", emoji: "🎵", emotionId: "joy" },
          { id: "joy-2", text: "행복하다", emoji: "✨", emotionId: "joy" },
        ],
      },
      {
        id: "sad", name: "슬픔", emoji: "🔵", color: "#4aa3e0", partId: 2,
        words: [
          { id: "sad-1", text: "울적하다", emoji: "🌧️", emotionId: "sad" },
          { id: "sad-2", text: "우울하다", emoji: "🌫️", emotionId: "sad" },
        ],
      },
      {
        id: "anger", name: "분노", emoji: "🔴", color: "#e05a4a", partId: 3,
        words: [
          { id: "anger-1", text: "화나다", emoji: "🔥", emotionId: "anger" },
          { id: "anger-2", text: "짜증나다", emoji: "⚡", emotionId: "anger" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "사회적 감정",
    emotions: [
      {
        id: "fear", name: "두려움", emoji: "🟣", color: "#9b6fd4", partId: 4,
        words: [
          { id: "fear-1", text: "무섭다", emoji: "👻", emotionId: "fear" },
          { id: "fear-2", text: "불안하다", emoji: "😰", emotionId: "fear" },
        ],
      },
      {
        id: "gratitude", name: "감사", emoji: "🟢", color: "#4bbf87", partId: 5,
        words: [
          { id: "gratitude-1", text: "고맙다", emoji: "🎁", emotionId: "gratitude" },
          { id: "gratitude-2", text: "감사하다", emoji: "🙏", emotionId: "gratitude" },
        ],
      },
      {
        id: "shame", name: "창피함", emoji: "💗", color: "#e97fb0", partId: 6,
        words: [
          { id: "shame-1", text: "민망하다", emoji: "😅", emotionId: "shame" },
          { id: "shame-2", text: "부끄럽다", emoji: "😳", emotionId: "shame" },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "복합 감정",
    emotions: [
      {
        id: "calm", name: "평온", emoji: "🟢", color: "#3fc9b0", partId: 7,
        words: [
          { id: "calm-1", text: "차분하다", emoji: "🧘", emotionId: "calm" },
          { id: "calm-2", text: "느긋하다", emoji: "🛋️", emotionId: "calm" },
        ],
      },
      {
        id: "envy", name: "샘나기", emoji: "🟠", color: "#f0913f", partId: 8,
        words: [
          { id: "envy-1", text: "부럽다", emoji: "🙄", emotionId: "envy" },
          { id: "envy-2", text: "시샘하다", emoji: "😈", emotionId: "envy" },
        ],
      },
      {
        id: "flutter", name: "설레임", emoji: "🔵", color: "#6f7fe0", partId: 9,
        words: [
          { id: "flutter-1", text: "기다려지다", emoji: "⏱️", emotionId: "flutter" },
          { id: "flutter-2", text: "두근거리다", emoji: "💓", emotionId: "flutter" },
        ],
      },
    ],
  },
];

function erStageWords(stage) {
  return stage.emotions.flatMap((e) => e.words);
}
function erFindEmotion(emotionId) {
  for (const stage of ER_STAGES) {
    for (const e of stage.emotions) {
      if (e.id === emotionId) return e;
    }
  }
  throw new Error("unknown emotionId: " + emotionId);
}

// Fisher-Yates 셔플(런타임용, EmpathyRadarStage.tsx 이식).
function erShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/* empathyRadar.logic.ts 이식 — 순수 상태 전이 함수 */
function erZeroCounts(stage) {
  const counts = {};
  stage.emotions.forEach((e) => (counts[e.id] = 0));
  return counts;
}
function erInitialState() {
  const stage = ER_STAGES[0];
  return {
    stageIndex: 0,
    words: erShuffle(erStageWords(stage)),
    wordIndex: 0,
    correctCounts: erZeroCounts(stage),
    earnedParts: [],
  };
}
function erCurrentWord(state) {
  return state.words[state.wordIndex] || null;
}
// 현재 단어를 emotionId 상자에 넣었을 때의 결과. 오답이면 { kind:"wrong" }.
function erClassify(state, emotionId) {
  const word = erCurrentWord(state);
  if (!word || word.emotionId !== emotionId) return { kind: "wrong" };

  const newCount = state.correctCounts[emotionId] + 1;
  const correctCounts = Object.assign({}, state.correctCounts, { [emotionId]: newCount });

  let earnedPartId = null;
  let earnedParts = state.earnedParts;
  if (newCount === 2) {
    earnedPartId = erFindEmotion(emotionId).partId;
    earnedParts = earnedParts.concat([earnedPartId]);
  }

  const nextWordIndex = state.wordIndex + 1;
  const stageCleared = nextWordIndex >= state.words.length;

  if (!stageCleared) {
    return {
      kind: "correct",
      earnedPartId: earnedPartId,
      stageCleared: false,
      gameDone: false,
      state: Object.assign({}, state, { wordIndex: nextWordIndex, correctCounts: correctCounts, earnedParts: earnedParts }),
    };
  }

  const isLastStage = state.stageIndex >= ER_STAGES.length - 1;
  if (isLastStage) {
    return {
      kind: "correct",
      earnedPartId: earnedPartId,
      stageCleared: true,
      gameDone: true,
      state: Object.assign({}, state, { wordIndex: nextWordIndex, correctCounts: correctCounts, earnedParts: earnedParts }),
    };
  }

  const nextStage = ER_STAGES[state.stageIndex + 1];
  return {
    kind: "correct",
    earnedPartId: earnedPartId,
    stageCleared: true,
    gameDone: false,
    state: {
      stageIndex: state.stageIndex + 1,
      words: erShuffle(erStageWords(nextStage)),
      wordIndex: 0,
      correctCounts: erZeroCounts(nextStage),
      earnedParts: earnedParts,
    },
  };
}

// 부품 슬롯 좌표(이미지 컨테이너 대비 %) — EmpathyRadarStage.tsx SLOT_POS 그대로.
const ER_COL_X = ["42%", "52%", "62%"];
const ER_ROW_Y = ["31%", "45%", "58%"];
const ER_SLOT_POS = ER_ROW_Y.flatMap((top) => ER_COL_X.map((left) => ({ left: left, top: top })));

/* EmpathyRadarStage.tsx 이식 — "build-once"(planet1/mission2 패턴): 패널 DOM은 mount 시
   한 번만 짓고, 상태 변화는 부분 갱신(updateWord/rebuildStage)으로 처리한다. 드래그 중
   포인터 이동은 render 를 거치지 않고 단어 엘리먼트의 style.transform 만 직접 바꾼다
   (매 pointermove 마다 DOM을 다시 지었다 세우면 드래그가 끊긴다). */
const EmpathyRadarStage = (function () {
  let state = null;
  let container = null;
  let root = null;
  let onFinish = null;
  let doneFlag = false;

  let panelEl, headerStageEl, headerProgressEl, boxesEl, wordAreaEl, bannerEl;
  let boxEls = {}; // emotionId -> wrapper div
  let partEls = {}; // partId -> wrapper div(초기 display:none)
  let wordEl = null;

  let activePointerId = null;
  let dragOrigin = null;
  let dragScale = 1;
  let wrongTimer = 0;
  let bannerTimer = 0;

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

  function buildInventory() {
    const inv = el("div", { class: "er-inventory" });
    inv.appendChild(el("img", { class: "er-assembler", src: ER_ASSET + "/radar-assembler.webp", alt: "공감 레이더 조립기" }));
    partEls = {};
    ER_SLOT_POS.forEach((pos, i) => {
      const partId = i + 1;
      const wrap = el("div", { class: "er-part", style: "left:" + pos.left + ";top:" + pos.top + ";display:none" });
      wrap.appendChild(
        el("img", {
          class: "er-part-img",
          src: ER_ASSET + "/radar-part-" + partId + ".webp",
          alt: "부품 " + partId,
          style: "animation-delay:" + (i % 4) * 0.3 + "s",
        }),
      );
      inv.appendChild(wrap);
      partEls[partId] = wrap;
    });
    return inv;
  }

  function boxAt(clientX, clientY) {
    for (const id in boxEls) {
      const r = boxEls[id].getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return id;
    }
    return null;
  }

  function setHoverBox(id) {
    for (const eid in boxEls) boxEls[eid].classList.toggle("er-box--over", eid === id);
  }

  function flashWrong(emotionId) {
    const box = boxEls[emotionId];
    if (!box) return;
    box.classList.add("er-box--wrong");
    window.clearTimeout(wrongTimer);
    wrongTimer = window.setTimeout(() => box.classList.remove("er-box--wrong"), 450);
  }

  function showBanner(text) {
    window.clearTimeout(bannerTimer);
    if (bannerEl) bannerEl.remove();
    bannerEl = el("div", { class: "er-banner", text: text });
    panelEl.appendChild(bannerEl);
  }
  function hideBanner() {
    if (bannerEl) {
      bannerEl.remove();
      bannerEl = null;
    }
  }

  function updateHeader() {
    const stage = ER_STAGES[state.stageIndex];
    headerStageEl.textContent = stage.id + "단계 · " + stage.title;
    headerProgressEl.textContent = "부품 " + state.earnedParts.length + " / 9";
  }

  function onWordDown(e) {
    if (doneFlag || activePointerId !== null || !wordEl) return;
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    activePointerId = e.pointerId;
    dragOrigin = { px: e.clientX, py: e.clientY };
    const stageEl = document.getElementById("stage");
    const w = (stageEl && stageEl.getBoundingClientRect().width) || 1920;
    dragScale = w / 1920 || 1;
    wordEl.style.transition = "none";

    const move = (ev) => {
      if (ev.pointerId !== activePointerId) return;
      const dx = (ev.clientX - dragOrigin.px) / dragScale;
      const dy = (ev.clientY - dragOrigin.py) / dragScale;
      wordEl.style.transform = "translate(" + dx + "px, " + dy + "px)";
      setHoverBox(boxAt(ev.clientX, ev.clientY));
    };
    const finish = (ev, drop) => {
      if (ev.pointerId !== activePointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      activePointerId = null;
      dragOrigin = null;
      if (wordEl) {
        wordEl.style.transition = "";
        wordEl.style.transform = "";
      }
      setHoverBox(null);
      if (drop) {
        const target = boxAt(ev.clientX, ev.clientY);
        if (target) attempt(target);
      }
    };
    const up = (ev) => finish(ev, true);
    const cancel = (ev) => finish(ev, false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }

  function updateWord() {
    const word = erCurrentWord(state);
    if (!word) {
      if (wordEl) {
        wordEl.remove();
        wordEl = null;
      }
      return;
    }
    if (!wordEl) {
      wordEl = el("div", { class: "er-word" }, [el("span", { class: "er-word-text" })]);
      wordEl.addEventListener("pointerdown", onWordDown);
      wordAreaEl.appendChild(wordEl);
    }
    wordEl.querySelector(".er-word-text").textContent = word.text;
  }

  function rebuildBoxes() {
    boxesEl.innerHTML = "";
    boxEls = {};
    const stage = ER_STAGES[state.stageIndex];
    stage.emotions.forEach((e) => {
      const box = el("div", { class: "er-box", style: "--box-color:" + e.color }, [
        el("div", { class: "er-box-radar" }, [el("span", { class: "er-box-radar-label", text: e.name })]),
      ]);
      box.addEventListener("click", () => attempt(e.id));
      boxesEl.appendChild(box);
      boxEls[e.id] = box;
    });
  }

  function attempt(emotionId) {
    if (doneFlag) return;
    const word = erCurrentWord(state);
    if (!word) return;
    const r = erClassify(state, emotionId);
    if (r.kind === "wrong") {
      audio.play("wrong");
      flashWrong(emotionId);
      return;
    }
    audio.play("correct");
    state = r.state;
    updateHeader();
    if (r.earnedPartId) {
      const wrap = partEls[r.earnedPartId];
      if (wrap) wrap.style.display = "";
      audio.play("sparkle");
    }
    if (r.gameDone) {
      doneFlag = true;
      if (wordEl) {
        wordEl.remove();
        wordEl = null;
      }
      showBanner("공감 레이더 완성! 🛰️");
      audio.play("fanfare");
      window.setTimeout(() => {
        if (onFinish) onFinish();
      }, 1100);
      return;
    }
    if (r.stageCleared) {
      rebuildBoxes();
      updateWord();
      const next = ER_STAGES[state.stageIndex];
      audio.play("stage");
      showBanner(next.id + "단계 · " + next.title);
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(hideBanner, 1200);
    } else {
      updateWord();
    }
  }

  function mount(containerEl, finishCb) {
    state = erInitialState();
    doneFlag = false;
    container = containerEl;
    onFinish = finishCb;

    root = el("div", { class: "er-overlay" });
    root.addEventListener("click", (e) => e.stopPropagation());

    const header = el("div", { class: "er-header" });
    headerStageEl = el("span", { class: "er-stage" });
    headerProgressEl = el("span", { class: "er-progress" });
    header.append(headerStageEl, headerProgressEl);

    boxesEl = el("div", { class: "er-boxes" });
    wordAreaEl = el("div", { class: "er-word-area" });

    const play = el("div", { class: "er-play" }, [
      header,
      el("div", { class: "er-instruction", text: "감정 카드를 성격 레이더로 옮겨보세요!" }),
      boxesEl,
      wordAreaEl,
    ]);

    panelEl = el("div", { class: "er-panel" }, [buildInventory(), play]);
    root.appendChild(panelEl);
    container.appendChild(root);

    updateHeader();
    rebuildBoxes();
    updateWord();
  }

  function unmount() {
    window.clearTimeout(wrongTimer);
    window.clearTimeout(bannerTimer);
    if (root) root.remove();
    root = null;
    container = null;
    boxEls = {};
    partEls = {};
    wordEl = null;
    bannerEl = null;
  }

  return { mount: mount, unmount: unmount };
})();

/* ==========================================================================
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션2가 쓰는 부분만).
   지원 노드 타입: line / minigame. (mission02.json 은 choice/branch/mirrors/gauge/
   reveal/video 를 쓰지 않는다 — 미포함. 이 미션은 node.image 도 쓰지 않아 choiceImage/
   choiceGlow(#stage.bookGlow) 관련 vm/DOM 도 함께 미포함.)
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
    cardStage: $("cardStage"),
    minigameLayer: $("minigameLayer"),
    hatiBox: $("hatiBox"),
    hatiAvatar: $("hatiAvatar"),
    hatiText: $("hatiText"),
    nextBtn: $("nextBtn"),
    tapHint: $("tapHint"),
    fxLayer: $("fxLayer"),
  };

  // ---------- 상태(vm) — MissionPlayer VM 중 미션2가 쓰는 필드만 ----------
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

  // ---------- 씬(스프라이트/배경) 갱신 ----------
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
    vm.cards = node.cards || [];
    vm.completeBanner = node.completeBanner || "";
    vm.intro = node.id === THEME.bannerNode;
    vm.fullHati = vm.intro;
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
        vm.tapHint = node.next ? "▼ 화면을 탭하면 계속" : ""; // 마지막 노드는 완료 힌트 표시 안 함
        render();
        window.clearTimeout(timers.auto);
        // 미션2는 모든 라인이 noAuto — 자동 진행 없음(탭으로만).
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
    EmpathyRadarStage.mount(els.minigameLayer, () => {
      EmpathyRadarStage.unmount();
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

  function typeOf(n) {
    return n.type || "line";
  }
  // ---- DEV 노드 표시(디버그) — HG_NODE_DEBUG ----
  // 화면 우측 상단에 현재 노드 id 표시. 기본값 보임(SHOW_DEFAULT).
  // 작업 다 끝나면 SHOW_DEFAULT 를 false 로 바꿀 것. 키보드 n 으로 토글.
  function hgNodeDebug(id) {
    var SHOW_DEFAULT = true;
    var el = document.getElementById("hg-node-debug");
    if (!el) {
      el = document.createElement("div");
      el.id = "hg-node-debug";
      el.style.cssText =
        "position:fixed;top:8px;right:8px;z-index:99999;padding:6px 10px;" +
        "font:700 15px/1.3 ui-monospace,monospace;color:#39ff14;" +
        "background:rgba(0,0,0,.72);border:1px solid #39ff14;border-radius:6px;" +
        "pointer-events:none;white-space:nowrap;";
      el.dataset.show = SHOW_DEFAULT ? "1" : "0";
      el.style.display = SHOW_DEFAULT ? "block" : "none";
      (document.body || document.documentElement).appendChild(el);
      window.addEventListener("keydown", function (e) {
        if (e.code === "KeyN" || e.key === "n" || e.key === "N" || e.key === "ㅜ") {
          var on = el.dataset.show === "1";
          el.dataset.show = on ? "0" : "1";
          el.style.display = on ? "none" : "block";
        }
      });
    }
    el.textContent = "▶ " + (id == null ? "(end)" : id);
  }
  function go(id) {
    if (id == null) return endMission();
    current = id;
    hgNodeDebug(id);
    const node = nodes[id];
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
  els.nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    els.nextBtn.disabled = true;
    fadeNav("../mission3/index.html");
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
        star.src = A + "/icon/star.svg";
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

  // 진행 스테퍼: 미션2 = step 2 고정.
  const STEP = 2;
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

    // 다음 버튼
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
  window.__m2 = { vm, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission2] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
