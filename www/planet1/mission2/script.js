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
   공통 블록 3-② 메뉴 버튼 + 팝업 (음소거·앱 종료) — 무대(#stage) 안 배치
   ⚠ 무대 계열별 크기는 CSS 에서. 이 페이지는 1920 무대(큰 세트).
   기존 독립 음소거 버튼(.mute-btn)을 이 팝업 안으로 이관.
   ========================================================================== */
(function menuButton() {
  const stage = document.getElementById("stage");
  if (!stage) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hg-menu-btn";
  btn.dataset.sfx = "none";
  btn.textContent = "☰";
  btn.setAttribute("aria-label", "메뉴 열기");
  stage.appendChild(btn);

  const overlay = document.createElement("div");
  overlay.className = "hg-menu-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "메뉴");
  overlay.hidden = true;

  const panel = document.createElement("div");
  panel.className = "hg-menu-panel";
  overlay.appendChild(panel);
  stage.appendChild(overlay);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "hg-menu-close";
  closeBtn.dataset.sfx = "none";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.addEventListener("click", () => close());

  const muteRow = document.createElement("button");
  muteRow.type = "button";
  muteRow.className = "hg-menu-item hg-menu-mute";
  muteRow.dataset.sfx = "none";
  function renderMute(m) {
    muteRow.textContent = m ? "🔇 소리 켜기" : "🔊 소리 끄기";
  }
  renderMute(audio.isMuted());
  muteRow.addEventListener("click", () => audio.toggleMute());
  audio.onMuteChange(renderMute);

  const exitRow = document.createElement("button");
  exitRow.type = "button";
  exitRow.className = "hg-menu-item hg-menu-exit";
  exitRow.dataset.sfx = "none";
  exitRow.textContent = "🚪 앱 종료";
  exitRow.addEventListener("click", () => renderConfirm());

  function renderMenu() {
    panel.replaceChildren(closeBtn, muteRow, exitRow);
  }
  function renderConfirm() {
    const msg = document.createElement("p");
    msg.className = "hg-menu-msg";
    msg.textContent = "앱을 종료할까요?";

    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "hg-menu-item hg-menu-exit";
    yes.dataset.sfx = "none";
    yes.textContent = "종료";
    yes.addEventListener("click", () => {
      const App =
        window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (App && App.exitApp) App.exitApp(); // 브라우저 dev 에선 no-op
    });

    const no = document.createElement("button");
    no.type = "button";
    no.className = "hg-menu-item hg-menu-cancel";
    no.dataset.sfx = "none";
    no.textContent = "취소";
    no.addEventListener("click", () => renderMenu());

    panel.replaceChildren(closeBtn, msg, yes, no);
  }

  function open() {
    renderMenu();
    overlay.hidden = false;
  }
  function close() {
    overlay.hidden = true;
  }
  // 팝업이 떠 있는 동안 무대(게임) 입력 차단: 버튼·오버레이의 클릭/포인터가
  // stage 의 탭-진행 핸들러로 버블링되지 않게 stopPropagation.
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === overlay) close(); // 배경(dim) 탭 = 닫기
  });
})();

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
   "/assets/..." 경로는 ASSETS 접두어로 치환한다.
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "m2_intro",
  nodes: [
    { id: "m2_intro", type: "line", noAuto: true, speaker: "hati", text: "공감 거울이 얼음에 갇혀 버렸어.\n친구들의 마음에 맞는 말과 행동을 찾으면 거울을 깨울 수 있어!", next: "m2_lala_intro" },

    { id: "m2_lala_intro", type: "line", noAuto: true, speaker: "lala", text: "친한 친구랑 싸웠어.\n다시 예전처럼 친해질 수 있을까?", hold: true, next: "m2_q1_prompt" },

    { id: "m2_q1_prompt", type: "line", noAuto: true, speaker: "hati", text: "대원들, 친구의 마음 신호를 탐색해 보자.", next: "m2_q1_choice" },
    {
      id: "m2_q1_choice", type: "choice",
      prompt: "라라의 마음은 어떨까?",
      choices: [
        { text: "화남", next: "m2_q1_wrong_angry" },
        { text: "속상함", next: "m2_q1_wrong_upset" },
        { text: "걱정됨", next: "m2_q1_correct" },
      ],
    },
    { id: "m2_q1_wrong_angry", type: "line", noAuto: true, speaker: "hati", text: "화난 마음도 조금 있을 수 있어.\n하지만 친구는 '다시 친해질 수 있을까?'라고 말했어. 걱정하는 마음에 더 집중해 보자!", next: "m2_q1_retry" },
    { id: "m2_q1_wrong_upset", type: "line", noAuto: true, speaker: "hati", text: "속상한 마음도 맞아.\n하지만 지금 친구는 앞으로 어떻게 될지 걱정하는 마음이 더 커 보여.", next: "m2_q1_retry" },
    { id: "m2_q1_retry", type: "line", noAuto: true, speaker: "hati", text: "다시 선택해봐.", next: "m2_q1_choice" },
    { id: "m2_q1_correct", type: "line", noAuto: true, speaker: "hati", text: "맞아! 친구와 싸운 것도 속상하지만 다시 친해질 수 있을지 걱정하는 마음이 더 커 보여.", next: "m2_q2_prompt" },

    { id: "m2_q2_prompt", type: "line", noAuto: true, speaker: "hati", text: "내 생각보다 친구 마음에 먼저 집중해 보자.", next: "m2_q2_choice" },
    {
      id: "m2_q2_choice", type: "choice",
      prompt: "어떤 말을 먼저 해줄까?",
      choices: [
        { text: "같이 화해할 방법을 생각해보자.", next: "m2_q2_wrongA_lala" },
        { text: "금방 다시 친해질 거야.", next: "m2_q2_wrongB_lala" },
        { text: "많이 걱정됐겠다.", next: "m2_q2_correct_lala" },
      ],
    },
    { id: "m2_q2_wrongA_lala", type: "line", noAuto: true, speaker: "lala", text: "응 어떻게 하면 좋을까?", next: "m2_q2_wrongA_hati" },
    { id: "m2_q2_wrongA_hati", type: "line", noAuto: true, speaker: "hati", text: "함께 해결하려는 마음은 좋지만 친구는 아직 걱정되는 마음이 커. 먼저 걱정되는 마음을 알아준 뒤에 방법을 생각하면 좋아.", next: "m2_q2_retry" },
    { id: "m2_q2_wrongB_lala", type: "line", noAuto: true, speaker: "lala", text: "응 그랬으면 좋겠어.", next: "m2_q2_wrongB_hati" },
    { id: "m2_q2_wrongB_hati", type: "line", noAuto: true, speaker: "hati", text: "응원하는 말도 좋은 말이야. 하지만 친구는 지금 확신보다 걱정되는 마음을 이해받고 싶어 할 수 있어. 먼저 마음을 알아주는 것이 더 따뜻한 공감이야.", next: "m2_q2_retry" },
    { id: "m2_q2_retry", type: "line", noAuto: true, speaker: "hati", text: "다시 선택해봐.", next: "m2_q2_choice" },
    { id: "m2_q2_correct_lala", type: "line", noAuto: true, speaker: "lala", text: "응. 계속 그 생각이 나.", hold: true, next: "m2_q2_correct_hati" },
    { id: "m2_q2_correct_hati", type: "line", noAuto: true, speaker: "hati", text: "좋아! 친구의 걱정되는 마음을 먼저 알아주었구나.\n공감은 감정을 먼저 이해하는 것에서 시작해.", next: "m2_sola_intro" },

    { id: "m2_sola_intro", type: "line", noAuto: true, speaker: "sola", text: "내가 아끼던 장난감이 망가졌어.", hold: true, next: "m2_q3_prompt" },

    { id: "m2_q3_prompt", type: "line", noAuto: true, speaker: "hati", text: "대원들, 친구의 마음 신호를 탐색해 보자.\n 솔라의 마음은 어떨까?", next: "m2_q3_choice" },
    {
      id: "m2_q3_choice", type: "choice",
      prompt: "솔라의 마음은 어떨까?",
      choices: [
        { text: "속상함", next: "m2_q3_correct" },
        { text: "화남", next: "m2_q3_wrong_angry" },
        { text: "실망함", next: "m2_q3_wrong_disappoint" },
      ],
    },
    { id: "m2_q3_wrong_angry", type: "line", noAuto: true, speaker: "hati", text: "화날 수도 있어. 하지만 솔라는 지금 화남보다 속상함을 더 크게 느끼고 있어.", next: "m2_q3_retry" },
    { id: "m2_q3_wrong_disappoint", type: "line", noAuto: true, speaker: "hati", text: "실망도 맞는 감정이야. 하지만 망가진 장난감 때문에 속상함이 더 커 보여.", next: "m2_q3_retry" },
    { id: "m2_q3_retry", type: "line", noAuto: true, speaker: "hati", text: "다시 선택해봐.", next: "m2_q3_choice" },
    { id: "m2_q3_correct", type: "line", noAuto: true, speaker: "hati", text: "맞아! 솔라는 지금 망가진 장난감 때문에 속상한 마음이 가장 커.", next: "m2_q4_prompt" },

    { id: "m2_q4_prompt", type: "line", noAuto: true, speaker: "hati", text: "내 생각보다 친구 마음에 먼저 집중해 보자.", next: "m2_q4_choice" },
    {
      id: "m2_q4_choice", type: "choice",
      prompt: "어떤 행동이 더 도움이 될까?",
      choices: [
        { text: "왜 그렇게 소중했는지 이야기를 들어준다.", next: "m2_q4_wrongA_sola" },
        { text: "장난감을 고칠 방법을 찾아본다.", next: "m2_q4_wrongB_sola" },
        { text: "옆에 가서 함께 있어 준다.", next: "m2_q4_correct_sola" },
      ],
    },
    { id: "m2_q4_wrongA_sola", type: "line", noAuto: true, speaker: "sola", text: "할머니가 사주신 거였어.", next: "m2_q4_wrongA_hati" },
    { id: "m2_q4_wrongA_hati", type: "line", noAuto: true, speaker: "hati", text: "친구 이야기를 들어주는 것도 좋은 행동이야. 하지만 지금은 속상한 마음을 함께 느껴주는 것이 먼저 필요할 수 있어.", next: "m2_q4_retry" },
    { id: "m2_q4_wrongB_sola", type: "line", noAuto: true, speaker: "sola", text: "응. 그런데 지금은 좀 속상해.", next: "m2_q4_wrongB_hati" },
    { id: "m2_q4_wrongB_hati", type: "line", noAuto: true, speaker: "hati", text: "고쳐주려는 마음은 정말 따뜻해. 하지만 솔라는 아직 속상한 마음을 다 표현하지 못했어. 마음을 먼저 알아준 뒤에 도와주면 더 좋아.", next: "m2_q4_retry" },
    { id: "m2_q4_retry", type: "line", noAuto: true, speaker: "hati", text: "다시 선택해봐.", next: "m2_q4_choice" },
    { id: "m2_q4_correct_sola", type: "line", noAuto: true, speaker: "sola", text: "고마워.", hold: true, next: "m2_q4_correct_hati" },
    { id: "m2_q4_correct_hati", type: "line", noAuto: true, speaker: "hati", text: "좋아! 친구는 지금 속상한 마음이 커.\n함께 있어주는 것만으로도 큰 힘이 될 수 있어.", hold: false, next: "m2_secret_intro1" },

    { id: "m2_secret_intro1", type: "line", noAuto: true, speaker: "hati", hideFriend: true, text: "좋아, 이제 공감은 좋은 말이나 행동을 하는 것이 아니라 상대방에게 필요한 말과 행동을 선택하는 것이라는 걸 알게 되었어.", next: "m2_secret_intro2" },
    { id: "m2_secret_intro2", type: "line", noAuto: true, speaker: "hati", hideFriend: true, text: "앗, 공감 거울이 깨어나려고 해!\n하지만 아직 완전히 깨어나지는 않았어.", next: "m2_secret_intro3" },
    { id: "m2_secret_intro3", type: "line", noAuto: true, speaker: "hati", hideFriend: true, text: "거울 속에 숨겨진 마지막 비밀을 알아내야 해!", next: "m2_mirror_ab" },

    {
      id: "m2_mirror_ab", type: "mirrors",
      hideBubbles: true,
      banner: "공감 거울의 비밀",
      prompt: "친구에게 전하고 싶은 말을 드래그해서 거울 속 친구에게 전해봐!",
      card: "괜찮아!\n다음에 잘 하면 돼!",
      targets: [
        { friend: "lumi", title: "루미의 마음", line: "축구 경기에서 져서 아쉬워.", onDrop: "응 고마워.", charImage: A + "/planet1/mission2/mirror-lumi-base.webp", onDropImage: A + "/planet1/mission2/mirror-lumi-drop.webp" },
        { friend: "lala", title: "라라의 마음", line: "시험 점수가 안 나와서 속상해.", onDrop: "그런데 아직 속상해.", charImage: A + "/planet1/mission2/mirror-lala-base.webp", onDropImage: A + "/planet1/mission2/mirror-lala-drop.webp" },
      ],
      reveal: {
        prompt: "똑같은 응원의 말을 건넸는데, 왜 라라의 거울은 빛나지 않을까? 거울 속 라라를 터치해서 진짜 속마음을 알아보자.",
        friend: "lala",
        line: "응원해 준 건 고맙지만, 내 속상한 마음을 먼저 알아주길 바랐어.",
        image: A + "/planet1/mission2/mirror-lala-reveal.webp",
      },
      next: "m2_mirror_lesson",
    },

    { id: "m2_mirror_lesson", type: "line", noAuto: true, speaker: "hati", hideFriend: true, text: "", lesson: { title: "공감 거울의 비밀", sub: "상대방이 원하는 위로의 말은 다를 수 있다." }, next: "m2_lumi_gauge" },

    {
      id: "m2_lumi_gauge", type: "gauge",
      banner: "공감 거울의 비밀",
      speaker: "lumi",
      text: "지금은 혼자 있고 싶어.",
      lead: "속상한 친구를 어떻게 도와줄 수 있을까? 먼저 계속 다가가 볼까?",
      header: "어떻게 도와줄래?",
      prompt: "진행도 100%가 되도록 드래그해봐!",
      hideBubbles: true,
      gaugeMirror: A + "/planet1/mission2/empathy-mirror-lumi-1-alone.webp",
      options: [
        { icon: "run", title: "다가가서 위로해 주기", desc: "용기를 내서 다가가 보자.", correct: false, onPick: "걱정해 주는 건 좋지만, 지금은 내 감정을 정리할 혼자만의 시간이 필요해.", pickImage: A + "/planet1/mission2/empathy-mirror-lumi-2-guard.webp" },
        { icon: "meditate", title: "기다려주기", desc: "조금 기다려주며 지켜보자.", correct: true, onPick: "기다려줘서 고마워. 지금은 내 감정을 정리할 혼자만의 시간이 필요해.", pickImage: A + "/planet1/mission2/empathy-mirror-lumi-3-thankful.webp" },
      ],
      next: "m2_gauge_lesson",
    },

    { id: "m2_gauge_lesson", type: "line", noAuto: true, speaker: "hati", hideFriend: true, text: "", lesson: { title: "공감 거울의 비밀", sub: "내가 생각하는 방식보다 상대방이 원하는 방식으로 배려해주는 것이 진짜 공감이다." }, next: "m2_secret_wake" },

    { id: "m2_secret_wake", type: "line", noAuto: true, speaker: "hati", hideFriend: true, text: "공감 거울이 깨어났어!", next: "m2_secret_lesson" },
    {
      id: "m2_secret_lesson", type: "line", noAuto: true, speaker: "hati", hideFriend: true,
      text: "공감은 상대방의 마음에 먼저 집중하는 것이야. 내 생각과 판단은 잠시 접어두기로 해.",
      cards: [
        { image: A + "/planet1/light-planet-empathy-card-3.webp" },
        { image: A + "/planet1/light-planet-empathy-card-4.webp" },
      ],
      next: "m2_end1",
    },

    {
      id: "m2_end1", type: "line", noAuto: true, speaker: "hati", hideFriend: true,
      text: "대원들 덕분에 행성에 따뜻한 온기가 돌기 시작했어. 하지만 빛의 행성에 빛이 완전히 돌아온 건 아니야.",
      onEnter: [{ cmd: "fx", value: "fx_mirror_wake" }],
      next: "m2_end2",
    },
    {
      id: "m2_end2", type: "line", noAuto: true, speaker: "hati", hideFriend: true,
      text: "겨울 속 가장 깊은 곳에서 마지막 질문이 떠올랐어.",
      sideImage: A + "/ui/empathy-mirror3.webp",
      next: "m2_end3",
    },
    {
      id: "m2_end3", type: "line", noAuto: true, speaker: "hati", hideFriend: true,
      lesson: {
        title: "왜 우리는 친구의 마음을 열심히 이해하려고 노력해야 할까?",
        sub: "",
      },
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션2 테마 — theme.ts 의 MISSION02_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ 미션2는 마음 신호 탐색기 HUD(radar)를 쓰지 않는다(showRadar:false) → radar 테마·러너 미포함. */
const THEME = {
  speakers: { hati: { name: "하티" }, lala: { name: "라라" }, sola: { name: "솔라" }, lumi: { name: "루미" } },
  bannerNode: "m2_intro",
  initialFriend: "lala",
  showRadar: false,
  bg: {
    states: {
      stage2: A + "/bg/light-planet-stage2-bg.webp",
      stage3: A + "/bg/light-planet-stage3.webp",
      mirror1: A + "/bg/empathy-mirror-stage1.webp",
      mirror2: A + "/bg/empathy-mirror-stage2.webp",
      mirror3: A + "/bg/empathy-mirror-stage3.webp",
      mirror4: A + "/bg/empathy-mirror-stage4.webp",
      secret1: A + "/bg/empathy-mirror-broken-heart.webp",
      secret2: A + "/bg/empathy-mirror-twin.webp",
    },
    initial: "mirror1",
    byNode: {
      m2_intro: "mirror1",
      m2_secret_intro1: "mirror2",
      m2_secret_intro2: "mirror3",
      m2_mirror_ab: "secret2",
      m2_lumi_gauge: "secret1",
      m2_secret_wake: "mirror4",
      m2_end1: "stage3",
    },
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
      m2_intro: "explaining",
      m2_q1_prompt: "thinking",
      m2_q1_wrong_angry: "worried",
      m2_q1_wrong_upset: "worried",
      m2_q1_retry: "suggesting",
      m2_q1_correct: "explaining",
      m2_q2_prompt: "thinking",
      m2_q2_wrongA_hati: "worried",
      m2_q2_wrongB_hati: "worried",
      m2_q2_retry: "suggesting",
      m2_q2_correct_hati: "praising",
      m2_q3_prompt: "thinking",
      m2_q3_wrong_angry: "worried",
      m2_q3_wrong_disappoint: "worried",
      m2_q3_retry: "suggesting",
      m2_q3_correct: "explaining",
      m2_q4_prompt: "suggesting",
      m2_q4_wrongA_hati: "worried",
      m2_q4_wrongB_hati: "worried",
      m2_q4_retry: "suggesting",
      m2_q4_correct_hati: "praising",
      m2_end1: "cheering",
      m2_end2: "proud",
      m2_end3: "celebrating",
    },
  },
  friends: {
    lala: {
      name: "라라",
      char: {
        anxious: A + "/char/Lala/lala_anxious.webp",
        thinking: A + "/char/Lala/lala_thinking.webp",
        smiling: A + "/char/Lala/lala_smiling.webp",
        happy: A + "/char/Lala/lala_happy.webp",
      },
      initial: "anxious",
      byNode: {
        m2_lala_intro: "anxious",
        m2_q2_wrongA_lala: "thinking",
        m2_q2_wrongB_lala: "thinking",
        m2_q2_correct_lala: "smiling",
      },
    },
    sola: {
      name: "솔라",
      char: {
        sad: A + "/char/Sola/sola_sad.webp",
        sad2: A + "/char/Sola/sola_sad2.webp",
        serious: A + "/char/Sola/sola_serious.webp",
        thankful: A + "/char/Sola/sola_thankful.webp",
      },
      initial: "sad",
      byNode: {
        m2_sola_intro: "sad",
        m2_q4_wrongA_sola: "sad2",
        m2_q4_wrongB_sola: "sad2",
        m2_q4_correct_sola: "thankful",
        m2_end1: "thankful",
      },
    },
    lumi: {
      name: "루미",
      char: {
        sad: A + "/char/Lumi/lumi_sad.webp",
        confused: A + "/char/Lumi/lumi_confused.webp",
        happy: A + "/char/Lumi/lumi_happy.webp",
      },
      initial: "sad",
      byNode: {},
    },
  },
  badgeColors: ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"],
  choiceIcons: {
    걱정됨: { emoji: "😟", bg: "#e0f2fe" },
    실망함: { emoji: "😞", bg: "#eef2f7" },
    화남: { emoji: "😠", bg: "#fee2e2" },
    속상함: { emoji: "😢", bg: "#e0f2fe" },
    "같이 화해할 방법을 생각해보자": { emoji: "🤝", bg: "#ede9fe" },
    "금방 다시 친해질 거야": { emoji: "🌈", bg: "#dbeafe" },
    "많이 걱정됐겠다": { emoji: "💗", bg: "#dcfce7" },
    "왜 그렇게 소중했는지 이야기를 들어준다": { emoji: "👂", bg: "#ede9fe" },
    "장난감을 고칠 방법을 찾아본다": { emoji: "🔧", bg: "#dbeafe" },
    "옆에 가서 함께 있어 준다": { emoji: "🫂", bg: "#dcfce7" },
  },
  fx: { fx_mirror_wake: "signalRecover", fx_light_return: "lightReturn" },
  sfx: {
    byNode: {
      m2_q1_wrong_angry: "wrong",
      m2_q1_wrong_upset: "wrong",
      m2_q1_correct: "correct",
      m2_q2_wrongA_hati: "wrong",
      m2_q2_wrongB_hati: "wrong",
      m2_q2_correct_hati: "correct",
      m2_q3_wrong_angry: "wrong",
      m2_q3_wrong_disappoint: "wrong",
      m2_q3_correct: "correct",
      m2_q4_wrongA_hati: "wrong",
      m2_q4_wrongB_hati: "wrong",
      m2_q4_correct_hati: "correct",
    },
  },
  gaugeIcons: {
    run: { emoji: "🏃", color: "#3b82f6" },
    meditate: { emoji: "🧘", color: "#22c55e" },
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
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션2가 쓰는 부분만).
   지원 노드 타입: line / choice / mirrors / gauge.
   (미션1 대비 추가: mirrors·gauge 스테이지 + line 의 lesson·sideImage. branch·requireAll·
    q4 드래그·radar HUD 는 미션2가 안 써서 제거.)
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
    friendName: $("friendName"),
    friendBubble: $("friendBubble"),
    friendBubbleText: $("friendBubble").querySelector("span"),
    choicePanel: $("choicePanel"),
    choicePrompt: $("choicePrompt"),
    choices: $("choices"),
    cardStage: $("cardStage"),
    mirrorStage: $("mirrorStage"),
    lessonBanner: $("lessonBanner"),
    lessonTitle: $("lessonBanner").querySelector(".lb-title"),
    lessonSub: $("lessonBanner").querySelector(".lb-sub"),
    sideImage: $("sideImage"),
    hatiBox: $("hatiBox"),
    hatiAvatar: $("hatiAvatar"),
    hatiText: $("hatiText"),
    nextBtn: $("nextBtn"),
    tapHint: $("tapHint"),
    fxLayer: $("fxLayer"),
  };

  // ---------- 상태(vm) — MissionPlayer VM 중 미션2가 쓰는 필드만 ----------
  const vm = {
    mode: "idle", // idle | typing | await | choices | end
    bubbleKind: "none", // none | hatiBox | hatiBubble | friendBubble
    text: "",
    intro: false,
    fullHati: false,
    choices: [],
    choicePrompt: "",
    pick: null,
    friendId: THEME.initialFriend,
    friend: THEME.friends[THEME.initialFriend].initial,
    heldText: "",
    heldSprite: "",
    hati: THEME.hatiSprites.initial,
    bg: THEME.bg.initial,
    hideFriend: false,
    lesson: null, // { title, sub } — lesson 노드에서 금색 배너 표시
    sideImage: "", // 우측 가운데 장식 이미지 경로("" 이면 숨김)
    cards: [],
    friendGlow: false,
    bright: false,
    progress: "start", // start | done
    tapHint: "",
    showNext: false,
    // 공감 거울 특별 파트 (화면 A: mirrors / 화면 B: gauge)
    stage: "none", // none | mirrors | gauge
    sHideBubbles: false,
    sBanner: "",
    sPrompt: "",
    sCard: "",
    sTargets: [], // [{ friend,title,line,onDrop,bubble,done,charImage,dropImage }]
    sActive: -1, // 현재 드롭 가능한 타깃 idx, -1=없음
    sRevealPhase: "none", // none | await | done
    sRevealFriend: "",
    sFriend: "", // gauge: 거울 안 친구
    sFriendLine: "",
    sHeader: "",
    sGaugeImage: "", // gauge: 거울 통짜 이미지
    sOptions: [], // gauge: [{ icon,title,desc,fill }]
  };
  // 스테이지(mirrors/gauge) 완료 콜백 + 현재 노드 참조(핸들러가 참조)
  const ms = { done: null, node: null, reveal: null };

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

  // ---------- 씬(스프라이트/배경/hold) 갱신 ----------
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
    const bg = THEME.bg.byNode[node.id];
    if (bg) vm.bg = bg;
    vm.hideFriend = !!node.hideFriend;
    vm.lesson = null; // 노드 전환 시 교훈 배너 해제(라인 노드면 showLine 에서 다시 설정)
    vm.sideImage = node.sideImage || ""; // 우측 장식 이미지(지정 노드에서만)
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
      vm.stage = "none"; // 이전 스테이지(mirrors/gauge) 잔류 방지
      vm.choices = [];
      vm.choicePrompt = "";
      vm.pick = null;
      vm.lesson = node.lesson || null; // 교훈 배너 노드면 배너를 띄우고 하티 박스는 숨긴다
      const isHati = node.speaker === "hati";
      const introHati = isHati && vm.fullHati;
      // lesson 노드는 하티 박스 숨김(배너만), 아니면 인트로 말풍선/하티박스/친구 말풍선.
      vm.bubbleKind = node.lesson ? "none" : introHati ? "hatiBubble" : isHati ? "hatiBox" : "friendBubble";
      renderChoices(); // 선택지 숨김
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

  function showChoices(node, pick) {
    updateScene(node);
    vm.tapHint = "";
    vm.choicePrompt = node.prompt || "";
    vm.pick = (idx, choice) => {
      if (vm.mode !== "choices") return;
      vm.mode = "idle";
      vm.choices = [];
      renderChoices();
      render();
      pick(idx, choice);
    };
    // 미션2의 선택 노드는 자체 하티 대사가 없다 → 직전 하티박스 유지, 즉시 카드 노출.
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

  // ---------- 공감 거울 스테이지 (화면 A: mirrors / 화면 B: gauge) ----------
  // MissionPlayer.showMirrors/showGauge + MirrorStage.tsx 이식.
  function showMirrors(node, done) {
    updateScene(node); // 배경(secret2) 유지
    vm.stage = "mirrors";
    vm.mode = "idle";
    vm.bubbleKind = "none";
    vm.choices = [];
    vm.tapHint = "";
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
    vm.sRevealFriend = (node.reveal && node.reveal.friend) || "";
    ms.done = done;
    ms.reveal = node.reveal || null;
    buildMirrorStage();
    render();
    audio.play("pop");
  }

  function showGauge(node, done) {
    updateScene(node); // 배경(secret1) 유지
    vm.stage = "gauge";
    vm.mode = "idle";
    vm.bubbleKind = "none";
    vm.choices = [];
    vm.tapHint = "";
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
    buildMirrorStage();
    render();
    audio.play("pop");
    // 2.2초 뒤 하티바를 드래그 안내로 교체(게이지는 계속 조작 가능)
    window.setTimeout(() => {
      if (vm.stage === "gauge") {
        vm.sPrompt = node.prompt || "";
        const gt = els.mirrorStage.querySelector(".ms-guidetext");
        if (gt) gt.textContent = vm.sPrompt;
      }
    }, 2200);
  }

  // ---------- DialogueRunner (engine/runner.ts 이식) ----------
  const nodes = {};
  MISSION.nodes.forEach((n) => (nodes[n.id] = n));
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
    if (t === "choice") return enterChoice(node);
    if (t === "mirrors") return showMirrors(node, () => advance(node));
    if (t === "gauge") return showGauge(node, () => advance(node));
    // line
    showLine(node, () => execCommands(node.onComplete)).then(() => advance(node));
  }
  function advance(node) {
    if (node.next) go(node.next);
    else endMission();
  }
  function enterChoice(node) {
    showChoices(node, (idx, choice) => go(choice.next));
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
    fadeNav("../mission3/index.html"); // 다음 미션으로
  });

  // ---------- 공감 거울 스테이지 DOM (MirrorStage.tsx 이식) ----------
  // 스테이지가 CSS scale 되므로 포인터 델타를 scale로 나눠 좌표계(1920)로 환산한다.
  function stageScale() {
    return (stage.getBoundingClientRect().width || 1920) / 1920 || 1;
  }
  function friendSrc(friend) {
    const set = THEME.friends[friend];
    return set ? set.char[set.initial] || "" : "";
  }
  function ce(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // 스테이지 안의 동적 요소 참조(구조는 build 에서 1회 생성, 조작 중엔 부분 갱신만).
  const msEls = { mirrors: [], card: null, opts: [], gaugeImg: null, gaugeChar: null, gaugeBubble: null, guidetext: null };

  function buildMirrorStage() {
    els.mirrorStage.innerHTML = "";
    msEls.mirrors = [];
    msEls.card = null;
    msEls.opts = [];
    msEls.gaugeImg = null;
    msEls.gaugeChar = null;
    msEls.gaugeBubble = null;
    msEls.guidetext = null;

    // 배너 (특별 미션)
    const banner = ce("div", "ms-banner");
    banner.append(ce("span", "ms-pill", "특별 미션"), ce("h2", "ms-title", vm.sBanner));
    banner.append(ce("p", "ms-sub", "친구의 마음을 이해하고, 따뜻한 행동을 전해 봐!"));
    els.mirrorStage.appendChild(banner);

    if (vm.stage === "mirrors") {
      const wrap = ce("div", "ms-mirrors");
      vm.sTargets.forEach((tg, i) => {
        const col = ce("div", "ms-col");
        const badge = ce("div", "ms-badge");
        badge.append(ce("b", null, String(i + 1)), document.createTextNode(" " + tg.title));
        const mirror = ce("div", "ms-mirror" + (vm.sHideBubbles ? " full" : ""));
        const char = ce("img", "ms-char" + (vm.sHideBubbles ? " full" : ""));
        char.src = tg.charImage || friendSrc(tg.friend);
        char.alt = tg.title;
        mirror.appendChild(char);
        let bubble = null;
        if (!vm.sHideBubbles) {
          bubble = ce("div", "ms-bubble", tg.bubble);
          mirror.appendChild(bubble);
        }
        const arrow = ce("span", "ms-arrow " + (i === 0 ? "to-left" : "to-right"));
        arrow.setAttribute("aria-hidden", "true");
        arrow.style.display = "none";
        mirror.appendChild(arrow);
        mirror.addEventListener("click", () => onMirrorTouch(i));
        col.append(badge, mirror);
        wrap.appendChild(col);
        msEls.mirrors.push({ mirror, char, bubble, arrow });
      });
      els.mirrorStage.appendChild(wrap);
    } else if (vm.stage === "gauge") {
      const gw = ce("div", "ms-gaugeWrap");
      const single = ce("div", "ms-mirror single" + (vm.sGaugeImage ? " full" : ""));
      if (vm.sGaugeImage) {
        const img = ce("img", "ms-fullmirror");
        img.src = vm.sGaugeImage;
        img.alt = vm.sFriend;
        single.appendChild(img);
        msEls.gaugeImg = img;
      } else {
        const char = ce("img", "ms-char");
        char.src = friendSrc(vm.sFriend);
        char.alt = vm.sFriend;
        single.appendChild(char);
        msEls.gaugeChar = char;
        if (!vm.sHideBubbles) {
          const bubble = ce("div", "ms-bubble", vm.sFriendLine);
          single.appendChild(bubble);
          msEls.gaugeBubble = bubble;
        }
      }
      gw.appendChild(single);

      const gauge = ce("div", "ms-gauge");
      gauge.appendChild(ce("div", "ms-gauge-head", "✧ " + vm.sHeader + " ✧"));
      vm.sOptions.forEach((o, i) => {
        const deco = (THEME.gaugeIcons && THEME.gaugeIcons[o.icon]) || { emoji: "💭", color: "#64748b" };
        const opt = ce("div", "ms-opt");
        const ico = ce("div", "ms-opt-ico", deco.emoji);
        ico.style.color = deco.color;
        const body = ce("div", "ms-opt-body");
        body.appendChild(ce("div", "ms-opt-title", i + 1 + ". " + o.title));
        body.appendChild(ce("div", "ms-opt-desc", o.desc));
        const bar = ce("div", "ms-bar");
        const track = ce("div", "ms-bar-track");
        const fill = ce("div", "ms-bar-fill");
        fill.style.width = o.fill + "%";
        fill.style.background = deco.color;
        track.appendChild(fill);
        const pct = ce("span", "ms-bar-pct", Math.round(o.fill) + "%");
        bar.append(ce("span", "ms-bar-label", "진행도"), track, pct);
        body.appendChild(bar);
        opt.append(ico, body);
        opt.addEventListener("pointerdown", (e) => onGaugeDown(e, i));
        gauge.appendChild(opt);
        msEls.opts.push({ fill, pct });
      });
      gw.appendChild(gauge);
      els.mirrorStage.appendChild(gw);
    }

    // 하티 가이드바 (일반 하티 박스와 동일 룩)
    const guidebar = ce("div", "ms-guidebar");
    const hati = ce("img", "ms-hati");
    hati.src = A + "/char/Hati/hati_explaining.webp";
    hati.alt = "하티";
    hati.addEventListener("error", () => (hati.style.visibility = "hidden"));
    const gbody = ce("div", "ms-guide-body");
    gbody.appendChild(ce("div", "ms-guide-name", "하티"));
    const gtext = ce("p", "ms-guidetext", vm.sPrompt);
    gbody.appendChild(gtext);
    msEls.guidetext = gtext;
    guidebar.append(hati, gbody);
    els.mirrorStage.appendChild(guidebar);

    // 드래그 카드 (mirrors 만, card 있을 때) — 화면 중앙 홀더
    if (vm.stage === "mirrors" && vm.sCard) {
      const holder = ce("div", "ms-card-holder");
      const card = ce("button", "ms-card", vm.sCard);
      card.type = "button";
      card.addEventListener("pointerdown", onMirrorCardDown);
      card.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      holder.appendChild(card);
      els.mirrorStage.appendChild(holder);
      msEls.card = card;
    }
    updateMirrorStageDynamic();
  }

  // 조작 중 부분 갱신(구조 재생성 없이): 거울 클래스/이미지/말풍선/게이지 채움.
  function updateMirrorStageDynamic() {
    if (vm.stage === "mirrors") {
      msEls.mirrors.forEach((m, i) => {
        const tg = vm.sTargets[i];
        m.mirror.classList.toggle("active", vm.sActive === i);
        m.mirror.classList.toggle(
          "touchable",
          vm.sRevealPhase !== "none" && vm.sRevealFriend === tg.friend,
        );
        m.char.src = tg.charImage || friendSrc(tg.friend);
        if (m.bubble) m.bubble.textContent = tg.bubble;
        m.arrow.style.display = vm.sActive === i ? "" : "none";
      });
    } else if (vm.stage === "gauge") {
      if (msEls.gaugeImg) msEls.gaugeImg.src = vm.sGaugeImage;
      if (msEls.gaugeChar) msEls.gaugeChar.src = friendSrc(vm.sFriend);
      if (msEls.gaugeBubble) msEls.gaugeBubble.textContent = vm.sFriendLine;
      msEls.opts.forEach((o, i) => {
        const fill = vm.sOptions[i].fill;
        o.fill.style.width = fill + "%";
        o.pct.textContent = Math.round(fill) + "%";
      });
    }
    if (msEls.guidetext) msEls.guidetext.textContent = vm.sPrompt;
  }

  // ---------- 화면 A: 이중 타깃 카드 드래그(순서 고정) + 라라 터치 reveal ----------
  function overMirror(idx, x, y) {
    const m = msEls.mirrors[idx];
    if (!m) return false;
    const r = m.mirror.getBoundingClientRect();
    const mg = 12;
    return x >= r.left - mg && x <= r.right + mg && y >= r.top - mg && y <= r.bottom + mg;
  }
  function finishMirrors() {
    const done = ms.done;
    ms.done = null;
    vm.stage = "none";
    els.mirrorStage.innerHTML = "";
    render();
    if (done) done();
  }
  function onMirrorAllDropped() {
    const r = ms.reveal;
    if (r) {
      vm.sPrompt = r.prompt; // 하티: "…라라를 터치…"
      vm.sRevealPhase = "await";
      updateMirrorStageDynamic();
      audio.play("stage");
    } else {
      finishMirrors();
    }
  }
  function onMirrorCardDown(e) {
    if (vm.stage !== "mirrors" || vm.sActive < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget;
    const scale = stageScale();
    const startX = e.clientX;
    const startY = e.clientY;
    const active = vm.sActive;
    card.classList.add("dragging");
    els.mirrorStage.classList.add("ms-dragging"); // 드래그 중 화살표 힌트 숨김
    audio.play("pop");
    const move = (ev) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      card.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
      const mm = msEls.mirrors[active];
      if (mm) mm.mirror.classList.toggle("over", overMirror(active, ev.clientX, ev.clientY));
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      els.mirrorStage.classList.remove("ms-dragging");
      const mm = msEls.mirrors[active];
      if (mm) mm.mirror.classList.remove("over");
      const dropped = overMirror(active, ev.clientX, ev.clientY);
      if (dropped && vm.stage === "mirrors") {
        audio.play("drop");
        vm.sTargets[active].bubble = vm.sTargets[active].onDrop; // 친구 반응으로 교체
        if (vm.sTargets[active].dropImage) vm.sTargets[active].charImage = vm.sTargets[active].dropImage;
        vm.sTargets[active].done = true;
        card.classList.remove("dragging");
        card.style.transform = "";
        const nextIdx = vm.sTargets.findIndex((t) => !t.done);
        vm.sActive = nextIdx;
        if (nextIdx < 0) {
          vm.sCard = ""; // 카드 소진
          if (msEls.card) {
            const holder = msEls.card.closest(".ms-card-holder");
            if (holder) holder.remove();
            msEls.card = null;
          }
          updateMirrorStageDynamic();
          onMirrorAllDropped();
        } else {
          updateMirrorStageDynamic();
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
  }
  function onMirrorTouch(idx) {
    if (vm.stage !== "mirrors" || vm.sRevealPhase !== "await") return;
    const r = ms.reveal;
    if (!r || vm.sTargets[idx].friend !== r.friend) return; // 지정 거울만
    vm.sTargets[idx].bubble = r.line; // 속마음으로 교체
    if (r.image) vm.sTargets[idx].charImage = r.image; // 속마음 공개 이미지로 교체
    vm.sRevealPhase = "done";
    audio.play("reveal");
    updateMirrorStageDynamic();
    window.setTimeout(finishMirrors, 1600);
  }

  // ---------- 화면 B: 게이지 드래그(0→100%) 선택 + 오답 리셋/정답 진행 ----------
  function commitGauge(idx) {
    const node = ms.node;
    const opt = node && node.options && node.options[idx];
    if (!opt) return;
    vm.sFriendLine = opt.onPick; // 루미 반응 말풍선(말풍선 숨김 노드에선 이미지가 대신함)
    if (opt.pickImage) vm.sGaugeImage = opt.pickImage; // 100% 반응 거울 이미지로 교체
    updateMirrorStageDynamic();
    if (opt.correct) {
      audio.play("correct");
      window.setTimeout(() => {
        const done = ms.done;
        ms.done = null;
        vm.stage = "none";
        els.mirrorStage.innerHTML = "";
        render();
        if (done) done();
      }, 1800);
    } else {
      audio.play("wrong");
      window.setTimeout(() => {
        if (vm.stage !== "gauge") return;
        vm.sOptions = vm.sOptions.map((o) => ({ ...o, fill: 0 })); // 게이지 리셋
        vm.sFriendLine = (node && node.text) || vm.sFriendLine; // 원래 대사로 복귀
        vm.sGaugeImage = (node && node.gaugeMirror) || vm.sGaugeImage; // 기본 거울 이미지로 복귀
        updateMirrorStageDynamic();
      }, 1800);
    }
  }
  function onGaugeDown(e, idx) {
    if (vm.stage !== "gauge") return;
    e.preventDefault();
    e.stopPropagation();
    const optEl = e.currentTarget;
    const track = optEl.querySelector(".ms-bar-track");
    const setFrom = (clientX) => {
      const r = (track || optEl).getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
      vm.sOptions[idx].fill = pct;
      updateMirrorStageDynamic();
      return pct;
    };
    audio.play("pop");
    setFrom(e.clientX);
    const move = (ev) => setFrom(ev.clientX);
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const pct = setFrom(ev.clientX);
      if (pct >= 100) commitGauge(idx);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  // ---------- 렌더 ----------
  // 선택지 카드는 상태가 바뀔 때만 다시 그린다.
  // 선택지 아이콘 조회 — 공백·줄바꿈·끝문장부호 차이를 무시(선택지 텍스트에 줄바꿈 넣어도 fallback 안 나게).
  function choiceIcon(text) {
    const norm = (s) => s.replace(/\s+/g, "").replace(/[.!?…]+$/, "");
    const want = norm(text);
    for (const k in THEME.choiceIcons) if (norm(k) === want) return THEME.choiceIcons[k];
    return { emoji: "💭", bg: "#eef2f7" };
  }
  function renderChoices() {
    els.choices.innerHTML = "";
    const many = vm.choices.length >= 4;
    vm.choices.forEach((c, idx) => {
      const deco = choiceIcon(c.text);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.sfx = "none";
      btn.className = "card" + (many ? " smaller" : "");

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

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (vm.mode !== "choices") return;
        audio.play("select");
        btn.classList.remove("picked");
        void btn.offsetWidth;
        btn.classList.add("picked");
        window.setTimeout(() => {
          if (vm.pick) vm.pick(idx, c);
        }, 200);
      });
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

    // 친구 + 말풍선(현재 대사 또는 hold 유지 대사)
    const reverting = vm.bubbleKind !== "friendBubble" && !!vm.heldText;
    const friendBubbleText = reverting ? vm.heldText : vm.bubbleKind === "friendBubble" ? vm.text : "";
    const friendSprite = reverting && vm.heldSprite ? vm.heldSprite : vm.friend;
    els.friend.src = THEME.friends[vm.friendId].char[friendSprite] || "";
    els.friendName.textContent = (THEME.friends[vm.friendId] && THEME.friends[vm.friendId].name) || ""; // 현재 친구 이름표
    // 스테이지(mirrors/gauge)가 뜨면 친구 레이어를 숨긴다(스테이지가 화면을 덮음).
    els.friendWrap.classList.toggle("hide", vm.fullHati || vm.stage !== "none" || vm.hideFriend);
    els.friendWrap.classList.toggle("glow", vm.friendGlow);
    els.friendBubble.classList.toggle("show", !!friendBubbleText && vm.stage === "none");
    els.friendBubbleText.textContent = friendBubbleText;

    // 선택지 패널
    els.choicePanel.classList.toggle("show", vm.choices.length > 0);
    els.choicePrompt.textContent = vm.choicePrompt;

    // 엔딩 카드(변경 시에만 재빌드)
    const cardsKey = vm.cards.map((c) => c.image).join("|");
    if (cardsKey !== lastCardsKey) {
      lastCardsKey = cardsKey;
      renderCards();
    }

    // 공감 거울 스테이지 (mirrors/gauge) — 활성 시 class 부여(#mirrorStage display:none 해제)
    els.mirrorStage.className = vm.stage === "none" ? "" : "mstage " + vm.stage;

    // 교훈 배너
    els.lessonBanner.classList.toggle("show", !!vm.lesson);
    els.lessonTitle.textContent = vm.lesson ? vm.lesson.title : "";
    els.lessonSub.textContent = vm.lesson ? vm.lesson.sub : "";

    // 우측 가운데 장식 이미지(노드 sideImage)
    if (vm.sideImage) {
      els.sideImage.src = vm.sideImage;
      els.sideImage.style.display = "";
    } else {
      els.sideImage.style.display = "none";
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
  window.__m2 = { vm, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission2] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
