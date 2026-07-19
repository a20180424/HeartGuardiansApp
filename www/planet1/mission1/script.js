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
   --------------------------------------------------------------------------
   ⚠ 미션 페이지 전용 조정 (Task 2 경고):
   원본 App.tsx 의 전역 tap 리스너는 #stage 안 버튼의 자동 효과음을 스킵했다
   (미션 엔진이 자체 사운드를 냄). 이 페이지는 전체가 #stage 라 공통 SFX 블록의
   자동 data-sfx tap 재생을 그대로 두면 엔진 사운드(탭/선택/드롭…)와 이중으로 난다.
   → 자동 tap 재생을 억제하고(엔진이 내는 소리만) unlock 로직만 유지한다.
      미션 페이지들(미션2·3, 타 행성)이 복사할 변형판이다.
   ========================================================================== */
window.addEventListener(
  "pointerdown",
  () => {
    audio.unlock(); // 첫 제스처에서 오디오 컨텍스트 해제 — 소리는 미션 엔진이 직접 재생
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
   미션1 데이터 — mission01.json 인라인 (별도 fetch 금지, 페이지 독립성).
   "/assets/..." 경로는 ASSETS 접두어로 치환한다.
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "m1_intro",
  nodes: [
    { id: "m1_intro", type: "line", noAuto: true, speaker: "hati", text: "친구의 마음은 보이지 않아. 하지만 마음 신호 탐색기로 친구의 마음을 찾을 수 있어! 친구의 마음 신호를 찾아보자.", next: "m1_lumi_intro" },
    { id: "m1_lumi_intro", type: "line", noAuto: true, speaker: "lumi", text: "오늘은 놀기 싫어", hold: true, next: "m1_q1_prompt" },
    { id: "m1_q1_prompt", type: "line", noAuto: true, speaker: "hati", text: "루미의 마음 신호가 흐릿해. 어떤 마음일까?", next: "m1_q1_choice" },
    {
      id: "m1_q1_choice", type: "choice", prompt: "루미는 어떤 마음일까?", requireAll: true,
      choices: [
        { text: "나를 싫어하게 된 것 같아", next: "m1_q1_react" },
        { text: "무슨 힘든 일이 있는 것 같아", next: "m1_q1_react" },
        { text: "그냥 혼자 있고 싶은가 봐", next: "m1_q1_react" },
      ],
    },
    { id: "m1_q1_react", type: "line", noAuto: true, speaker: "hati", text: "음.. 그럴 수도 있겠네. 하지만 아직 루미의 마음을 정확히는 알 수 없어", next: "m1_q1_gate" },
    { id: "m1_q1_gate", type: "branch", condition: "allExplored", watch: "m1_q1_choice", ifTrue: "m1_q2_prompt", ifFalse: "m1_q1_choice" },

    { id: "m1_q2_prompt", type: "line", noAuto: true, speaker: "hati", text: "마음을 알려면 어떻게 해야 할까? 친구에게 직접 물어보자!", next: "m1_q2_choice" },
    {
      id: "m1_q2_choice", type: "choice", prompt: "어떻게 물어볼까?",
      choices: [
        { text: "왜그래?", next: "m1_q2_wrongA" },
        { text: "무슨 일 있어?", next: "m1_q2_correct" },
        { text: "나랑 놀기 싫어?", next: "m1_q2_wrongC" },
      ],
    },
    { id: "m1_q2_wrongA", type: "line", noAuto: true, speaker: "hati", text: '"왜 그래?"는 좋은 질문이 아닌 것 같아', next: "m1_q2_retry" },
    { id: "m1_q2_wrongC", type: "line", noAuto: true, speaker: "hati", text: '"나랑 놀기 싫어?"는 좋은 질문이 아닌 것 같아', next: "m1_q2_retry" },
    { id: "m1_q2_retry", type: "line", noAuto: true, speaker: "hati", text: "다시 선택해봐.", next: "m1_q2_choice" },
    { id: "m1_q2_correct", type: "line", noAuto: true, speaker: "hati", text: '"무슨 일 있어?"는 열린 질문이야. 상대가 편하게 말할 수 있게 도와줘.', next: "m1_lumi_answer" },

    { id: "m1_lumi_answer", type: "line", noAuto: true, speaker: "lumi", text: "사실 감기에 걸려서 너무 힘들어", hold: true, next: "m1_q3_prompt" },

    { id: "m1_q3_prompt", type: "line", noAuto: true, speaker: "hati", text: "대원은 감기에 걸렸을 때 어떤 감정이었어? 그때의 마음을 클릭해봐.", next: "m1_q3_choice" },
    {
      id: "m1_q3_choice", type: "choice",
      choices: [
        { text: "따뜻함", next: "m1_q4_prompt" },
        { text: "불안함", next: "m1_q4_prompt" },
        { text: "지침", next: "m1_q4_prompt" },
        { text: "짜증남", next: "m1_q4_prompt" },
        { text: "안도", next: "m1_q4_prompt" },
      ],
    },

    { id: "m1_q4_prompt", type: "line", noAuto: true, speaker: "hati", text: "어떤 말이 루미의 마음을 이해하는 말일까?", next: "m1_q4_choice" },
    {
      id: "m1_q4_choice", type: "choice",
      choices: [
        { text: "감기 정도는 참아.", next: "m1_q4_wrongA_lumi" },
        { text: "그래도 나랑 놀자.", next: "m1_q4_wrongB_lumi" },
        { text: "많이 힘들었겠구나.", next: "m1_q4_correct_lumi" },
      ],
    },
    { id: "m1_q4_wrongA_lumi", type: "line", noAuto: true, speaker: "lumi", text: "그건 도움이 안됐어...", next: "m1_q4_retry" },
    { id: "m1_q4_wrongB_lumi", type: "line", noAuto: true, speaker: "lumi", text: "지금은 쉬고 싶어...", next: "m1_q4_retry" },
    { id: "m1_q4_retry", type: "line", noAuto: true, speaker: "hati", text: "다시 선택해봐.", next: "m1_q4_choice" },
    { id: "m1_q4_correct_lumi", type: "line", noAuto: true, speaker: "lumi", text: "고마워!", next: "m1_end1" },

    { id: "m1_end1", type: "line", noAuto: true, speaker: "hati", text: "맞아! 공감은 친구의 마음을 알고 끝나는 것이 아니라, 그 마음을 이해해주는거야.", hold: false, onComplete: [{ cmd: "fx", value: "fx_ending_1" }], next: "m1_end_recover" },
    { id: "m1_end_recover", type: "line", noAuto: true, speaker: "hati", text: "좋아! 루미의 마음 신호가 회복 되었어!", onEnter: [{ cmd: "fx", value: "fx_signal_recover" }], next: "m1_end2" },
    {
      id: "m1_end2", type: "line", noAuto: true, speaker: "hati", hideFriend: true,
      text: "공감은 친구의 마음을 함부로 판단하지 않고, 알려고 노력하고, 그 마음을 이해해 주는 것이란다.",
      cards: [
        { image: A + "/planet1/light-planet-empathy-card-1.webp" },
        { image: A + "/planet1/light-planet-empathy-card-2.webp" },
      ],
      next: "m1_end3",
    },
    { id: "m1_end3", type: "line", noAuto: true, speaker: "hati", text: "빛이 조금씩 돌아오기 시작했어! 다음 미션도 계속해보자!", onEnter: [{ cmd: "fx", value: "fx_light_return" }], next: null },
  ],
};

/* 미션1 테마 — theme.ts 의 MISSION01_THEME 중 이 미션이 실제 쓰는 값만. */
const THEME = {
  speakers: { hati: { name: "하티" }, lumi: { name: "루미" } },
  bannerNode: "m1_intro",
  initialFriend: "lumi",
  drag: { node: "m1_q4_choice" }, // q4: 카드를 루미에게 드래그(탭도 fallback)
  bg: {
    states: { stage1: A + "/bg/light-planet-stage1-bg.webp", stage2: A + "/bg/light-planet-stage2.webp" },
    initial: "stage1",
    byNode: { m1_intro: "stage1", m1_end3: "stage2" },
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
      m1_intro: "explaining",
      m1_q1_prompt: "thinking",
      m1_q1_react: "thinking",
      m1_q2_prompt: "thinking",
      m1_q2_wrongA: "worried",
      m1_q2_wrongC: "worried",
      m1_q2_retry: "suggesting",
      m1_q2_correct: "explaining",
      m1_q3_prompt: "suggesting",
      m1_q4_prompt: "thinking",
      m1_q4_retry: "suggesting",
      m1_end1: "praising",
      m1_end_recover: "cheering",
      m1_end2: "proud",
      m1_end3: "celebrating",
    },
  },
  friends: {
    lumi: {
      char: {
        sad: A + "/char/Lumi/lumi_sad.webp",
        confused: A + "/char/Lumi/lumi_confused.webp",
        sick: A + "/char/Lumi/lumi_sick.webp",
        happy: A + "/char/Lumi/lumi_happy.webp",
        recovered: A + "/char/Lumi/lumi_recovered.webp",
      },
      initial: "sad",
      byNode: {
        m1_lumi_intro: "sad",
        m1_lumi_answer: "sick",
        m1_q4_wrongA_lumi: "confused",
        m1_q4_wrongB_lumi: "sick",
        m1_q4_correct_lumi: "happy",
        m1_end1: "happy",
        m1_end_recover: "recovered",
      },
    },
  },
  radar: {
    states: {
      p25: A + "/device/radar_25.webp",
      p50: A + "/device/radar_50.webp",
      p75: A + "/device/radar_75.webp",
      p100: A + "/device/radar_100.webp",
      active: A + "/device/radar_active.webp",
    },
    initial: "p100",
    byNode: {
      m1_intro: "p100",
      m1_lumi_intro: "p25",
      m1_q2_prompt: "p50",
      m1_q3_prompt: "p75",
      m1_q4_correct_lumi: "p100",
      m1_end_recover: "active",
    },
  },
  badgeColors: ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"],
  choiceIcons: {
    "나를 싫어하게 된 것 같아": { emoji: "💔", bg: "#f3e8ff" },
    "무슨 힘든 일이 있는 것 같아": { emoji: "🌧️", bg: "#e0f2fe" },
    "그냥 혼자 있고 싶은가 봐": { emoji: "🧍", bg: "#eef2f7" },
    "왜그래?": { emoji: "❓", bg: "#fef3c7" },
    "무슨 일 있어?": { emoji: "💬", bg: "#dcfce7" },
    "나랑 놀기 싫어?": { emoji: "🙅", bg: "#fee2e2" },
    따뜻함: { emoji: "🤗", bg: "#ffedd5" },
    불안함: { emoji: "😰", bg: "#e0f2fe" },
    지침: { emoji: "😩", bg: "#eef2f7" },
    짜증남: { emoji: "😤", bg: "#fee2e2" },
    안도: { emoji: "😌", bg: "#dcfce7" },
    "감기 정도는 참아": { emoji: "😣", bg: "#ede9fe" },
    "그래도 나랑 놀자": { emoji: "😐", bg: "#dbeafe" },
    "많이 힘들었겠구나": { emoji: "🙂", bg: "#dcfce7" },
  },
  fx: { fx_ending_1: "sparkle", fx_signal_recover: "signalRecover", fx_light_return: "lightReturn" },
  sfx: {
    byNode: {
      m1_q2_wrongA: "wrong",
      m1_q2_wrongC: "wrong",
      m1_q2_correct: "correct",
      m1_q4_wrongA_lumi: "wrong",
      m1_q4_wrongB_lumi: "wrong",
      m1_q4_correct_lumi: "correct",
    },
  },
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
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션1이 쓰는 부분만).
   지원 노드 타입: line / choice / branch. (mirrors·gauge·reveal·video·minigame 미이식)
   ========================================================================== */
(function missionPlayer() {
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const els = {
    bg: $("bg"),
    radar: $("radar"),
    titleBanner: $("titleBanner"),
    hatiFull: $("hatiFull"),
    hatiBubble: $("hatiBubble"),
    hatiBubbleText: $("hatiBubble").querySelector("span"),
    friendWrap: $("friendWrap"),
    friend: $("friend"),
    friendBubble: $("friendBubble"),
    friendBubbleText: $("friendBubble").querySelector("span"),
    dropHint: $("dropHint"),
    choicePanel: $("choicePanel"),
    choicePrompt: $("choicePrompt"),
    choices: $("choices"),
    cardStage: $("cardStage"),
    hatiBox: $("hatiBox"),
    hatiAvatar: $("hatiAvatar"),
    hatiText: $("hatiText"),
    nextBtn: $("nextBtn"),
    tapHint: $("tapHint"),
    fxLayer: $("fxLayer"),
  };

  // ---------- 상태(vm) — MissionPlayer VM 중 미션1이 쓰는 필드만 ----------
  const vm = {
    mode: "idle", // idle | typing | await | choices | end
    bubbleKind: "none", // none | hatiBox | hatiBubble | friendBubble
    text: "",
    intro: false,
    fullHati: false,
    choices: [],
    choicePrompt: "",
    exploredSet: null,
    pick: null,
    friendId: THEME.initialFriend,
    friend: THEME.friends[THEME.initialFriend].initial,
    heldText: "",
    heldSprite: "",
    hati: THEME.hatiSprites.initial,
    radar: THEME.radar.initial,
    bg: THEME.bg.initial,
    hideFriend: false,
    cards: [],
    friendGlow: false,
    bright: false,
    progress: "start", // start | done
    tapHint: "",
    showNext: false,
    dragNode: false,
    dzShow: false,
  };

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
      case "sparkle":
        audio.play("sparkle");
        sparkleBurst();
        break;
      case "signalRecover":
        audio.play("recover");
        vm.friendGlow = true;
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
  }

  function execCommands(cmds) {
    (cmds || []).forEach((c) => {
      if (c.cmd === "fx") execFx(THEME.fx[c.value || ""] || c.value || "");
    });
  }

  // ---------- 씬(스프라이트/배경/레이더/hold) 갱신 ----------
  const RADAR_ORDER = ["p25", "p50", "p75", "p100", "active"];
  function setRadar(state) {
    if (!state || state === vm.radar) return;
    if (RADAR_ORDER.indexOf(state) > RADAR_ORDER.indexOf(vm.radar)) audio.play("stage");
    vm.radar = state;
    render();
    els.radar.classList.add("pulse");
    window.setTimeout(() => els.radar.classList.remove("pulse"), 1100);
  }

  function updateScene(node) {
    if (node.speaker && node.speaker !== "hati" && node.speaker !== vm.friendId) {
      vm.friendId = node.speaker;
      const fs = THEME.friends[vm.friendId];
      vm.friend = (fs && fs.initial) || vm.friend;
      vm.heldText = "";
      vm.heldSprite = "";
    }
    if (node.hold === true && node.text) {
      vm.heldText = node.text;
      const fs = THEME.friends[vm.friendId];
      vm.heldSprite = (fs && (fs.byNode[node.id] || fs.initial)) || vm.friend;
    } else if (node.hold === false) {
      vm.heldText = "";
      vm.heldSprite = "";
    }
    const fs = THEME.friends[vm.friendId];
    if (fs && fs.byNode[node.id]) vm.friend = fs.byNode[node.id];
    if (THEME.hatiSprites.byNode[node.id]) vm.hati = THEME.hatiSprites.byNode[node.id];
    setRadar(THEME.radar.byNode[node.id]);
    const bg = THEME.bg.byNode[node.id];
    if (bg) vm.bg = bg;
    vm.hideFriend = !!node.hideFriend;
    vm.cards = node.cards || [];
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

  function advanceLine() {
    window.clearTimeout(timers.auto);
    vm.tapHint = "";
    vm.mode = "idle";
    render();
    const r = timers.resolve;
    timers.resolve = null;
    if (r) r();
  }

  // ---------- view (RunnerView 구현) ----------
  function showLine(node, onTyped) {
    return new Promise((resolve) => {
      timers.resolve = resolve;
      updateScene(node);
      vm.choices = [];
      vm.choicePrompt = "";
      vm.pick = null;
      vm.dragNode = false;
      vm.dzShow = false;
      const isHati = node.speaker === "hati";
      const introHati = isHati && vm.fullHati;
      vm.bubbleKind = introHati ? "hatiBubble" : isHati ? "hatiBox" : "friendBubble";
      renderChoices(); // 선택지 숨김
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

  function showChoices(node, exploredSet, pick) {
    updateScene(node);
    vm.tapHint = "";
    vm.choicePrompt = node.prompt || "";
    vm.exploredSet = exploredSet;
    vm.dragNode = !!(THEME.drag && node.id === THEME.drag.node);
    vm.dzShow = vm.dragNode;
    dnd.pick = pick;
    vm.pick = (idx, choice) => {
      if (vm.mode !== "choices") return;
      vm.mode = "idle";
      vm.choices = [];
      renderChoices();
      render();
      pick(idx, choice);
    };
    // 미션1의 선택 노드는 자체 하티 대사가 없다 → 직전 하티박스 유지, 즉시 카드 노출.
    if (vm.bubbleKind !== "hatiBox") vm.bubbleKind = "none";
    vm.mode = "choices";
    vm.choices = node.choices || [];
    renderChoices();
    render();
    audio.play("pop");
  }

  function endMission() {
    vm.mode = "end";
    render();
  }

  // ---------- DialogueRunner (engine/runner.ts 이식) ----------
  const nodes = {};
  MISSION.nodes.forEach((n) => (nodes[n.id] = n));
  const explored = {}; // choiceNodeId → Set(index)
  let current;

  function typeOf(n) {
    return n.type || (n.choices ? "choice" : "line");
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
    if (t === "branch") return evalBranch(node);
    if (t === "choice") return enterChoice(node);
    // line
    showLine(node, () => execCommands(node.onComplete)).then(() => advance(node));
  }
  function advance(node) {
    if (node.next) go(node.next);
    else endMission();
  }
  function evalBranch(node) {
    let res = false;
    if (node.condition === "allExplored") {
      const set = explored[node.watch];
      const tgt = nodes[node.watch];
      const total = tgt && tgt.choices ? tgt.choices.length : 0;
      res = !!set && total > 0 && set.size >= total;
    }
    go(res ? node.ifTrue : node.ifFalse);
  }
  function enterChoice(node) {
    if (node.requireAll) {
      const set = explored[node.id] || (explored[node.id] = new Set());
      if (set.size >= node.choices.length) {
        if (node.next) go(node.next);
        return;
      }
    }
    showChoices(node, explored[node.id] || null, (idx, choice) => {
      if (node.requireAll) {
        (explored[node.id] || (explored[node.id] = new Set())).add(idx);
      }
      go(choice.next);
    });
  }

  // ---------- 스테이지 탭(라인 진행) ----------
  stage.addEventListener("click", () => {
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
    fadeNav("../mission2/index.html"); // 다음 미션으로
  });

  // ---------- q4 카드 드래그 (MissionPlayer _enableCardDrag 이식) ----------
  const dnd = { active: false, startX: 0, startY: 0, scale: 1, moved: 0, card: null, idx: -1, choice: null, pick: null };
  function stageScale() {
    return (stage.getBoundingClientRect().width || 1920) / 1920 || 1;
  }
  function overFriend(x, y) {
    const r = els.friendWrap.getBoundingClientRect();
    const m = 24;
    return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
  }
  function onCardDown(e, idx, choice) {
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

    const move = (ev) => {
      if (!dnd.active || !dnd.card) return;
      const dx = (ev.clientX - dnd.startX) / dnd.scale;
      const dy = (ev.clientY - dnd.startY) / dnd.scale;
      dnd.moved = Math.max(dnd.moved, Math.hypot(ev.clientX - dnd.startX, ev.clientY - dnd.startY));
      dnd.card.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
      els.friendWrap.classList.toggle("over", overFriend(ev.clientX, ev.clientY));
    };
    const up = (ev) => {
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
      els.friendWrap.classList.remove("over");
      if (accept) {
        vm.mode = "idle";
        audio.play("drop");
        els.friendWrap.classList.add("catching");
        window.setTimeout(() => els.friendWrap.classList.remove("catching"), 400);
        card2.classList.add("landing");
        card2.style.transform = (card2.style.transform || "") + " scale(.32)";
        card2.style.opacity = "0";
        const i = dnd.idx;
        const c = dnd.choice;
        window.setTimeout(() => {
          if (c && dnd.pick) dnd.pick(i, c);
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
  }

  // ---------- 렌더 ----------
  // 선택지 카드는 상태가 바뀔 때만 다시 그린다(드래그 도중 재생성 방지).
  function renderChoices() {
    els.choices.innerHTML = "";
    const many = vm.choices.length >= 4;
    vm.choices.forEach((c, idx) => {
      const deco = THEME.choiceIcons[c.text] || { emoji: "💭", bg: "#eef2f7" };
      const explored = vm.exploredSet && vm.exploredSet.has(idx);
      const dragCard = vm.dragNode && !explored;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.sfx = "none";
      btn.className = "card" + (many ? " smaller" : "") + (explored ? " done" : "");
      if (explored) btn.disabled = true;

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.style.background = THEME.badgeColors[idx % THEME.badgeColors.length];
      badge.textContent = String(idx + 1);
      const icon = document.createElement("div");
      icon.className = "icon";
      icon.style.background = deco.bg;
      icon.textContent = deco.emoji;
      const ctext = document.createElement("div");
      ctext.className = "ctext";
      ctext.textContent = c.text;
      btn.append(badge, icon, ctext);

      if (dragCard) {
        // 드래그 카드: 합성 클릭 무시(선택은 pointerup 에서), pointerdown 으로 드래그 시작.
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
        btn.addEventListener("pointerdown", (e) => onCardDown(e, idx, c));
      } else {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (vm.mode !== "choices" || explored) return;
          audio.play("select");
          btn.classList.remove("picked");
          void btn.offsetWidth;
          btn.classList.add("picked");
          window.setTimeout(() => {
            if (vm.pick) vm.pick(idx, c);
          }, 200);
        });
      }
      els.choices.appendChild(btn);
    });
  }

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
      if (c.top) {
        const t = document.createElement("div");
        t.className = "card-text card-top";
        t.textContent = c.top;
        item.appendChild(t);
      }
      if (c.bottom) {
        const b = document.createElement("div");
        b.className = "card-text card-bottom";
        b.textContent = c.bottom;
        item.appendChild(b);
      }
      els.cardStage.appendChild(item);
    });
  }
  let lastCardsKey = "";

  // 진행 스테퍼: 미션1 = step 1 고정.
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

    // 레이더
    els.radar.src = THEME.radar.states[vm.radar] || "";

    // 타이틀 배너 / 전신 하티
    els.titleBanner.classList.toggle("show", vm.intro);
    els.hatiFull.classList.toggle("show", vm.fullHati);

    // 하티 인트로 말풍선
    els.hatiBubble.classList.toggle("show", vm.bubbleKind === "hatiBubble");
    els.hatiBubbleText.textContent = vm.bubbleKind === "hatiBubble" ? vm.text : "";

    // 친구 + 말풍선(현재 대사 또는 hold 유지 대사)
    const reverting = vm.bubbleKind !== "friendBubble" && !!vm.heldText;
    const friendBubbleText = reverting ? vm.heldText : vm.bubbleKind === "friendBubble" ? vm.text : "";
    const friendSprite = reverting && vm.heldSprite ? vm.heldSprite : vm.friend;
    els.friend.src = THEME.friends[vm.friendId].char[friendSprite] || "";
    els.friendWrap.classList.toggle("hide", vm.fullHati || vm.hideFriend);
    els.friendWrap.classList.toggle("glow", vm.friendGlow);
    els.friendWrap.classList.toggle("droppable", vm.dzShow);
    els.friendBubble.classList.toggle("show", !!friendBubbleText);
    els.friendBubbleText.textContent = friendBubbleText;

    // 드롭 힌트
    els.dropHint.classList.toggle("show", vm.dzShow);

    // 선택지 패널
    els.choicePanel.classList.toggle("show", vm.choices.length > 0);
    els.choicePrompt.textContent = vm.choicePrompt;

    // 엔딩 카드(변경 시에만 재빌드)
    const cardsKey = vm.cards.map((c) => c.image).join("|");
    if (cardsKey !== lastCardsKey) {
      lastCardsKey = cardsKey;
      renderCards();
    }

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
  window.__m1 = { vm, explored, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission1] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
