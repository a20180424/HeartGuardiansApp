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
   API 클라이언트 + 진도 저장 (src/lib/{api,progress,session}.ts 이식)
   --------------------------------------------------------------------------
   ⚠ 진도 저장 패턴(Task 8/9c 확정처, www/planet1/mission3/script.js 의 completePlanet
   블록을 planet=2 로 복사). 이 API 는 세션 토큰이 없다. 보호된 요청은 매번 자격증명을
   x-* 헤더로 싣는다(x-school-id, x-grade, x-class, x-number, x-pin). 자격증명은 auth 가
   로그인 시 localStorage "hg.credentials" 에 저장해 둔다(intro 가 지우지 않음).
   ========================================================================== */
const API_BASE = "https://heartguardians-api.a20180424.workers.dev";
const CRED_KEY = "hg.credentials";

function apiError(status, message, body) {
  const e = new Error(message);
  e.name = "ApiError";
  e.status = status;
  e.body = body;
  return e;
}

async function apiRequest(path, opts) {
  opts = opts || {};
  const headers = new Headers(opts.headers || {});
  const hasBody = opts.body !== undefined;
  if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(API_BASE + path, {
    method: opts.method || "GET",
    headers,
    body: hasBody ? JSON.stringify(opts.body) : undefined,
    // MPA 는 홈 이동 시 페이지가 언로드된다. keepalive 로 진행중 PUT 이 취소되지 않게 한다
    // (원본 SPA 는 언로드가 없어 불필요했다 — 논블로킹·best-effort 의미는 동일).
    keepalive: !!opts.keepalive,
  });

  const raw = await res.text();
  let parsed;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      parsed = raw;
    }
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String(parsed.error)
        : res.statusText || "Request failed (" + res.status + ")";
    throw apiError(res.status, msg, parsed);
  }
  return parsed;
}

function authHeaders(creds) {
  if (!creds) throw apiError(401, "No stored credentials", null);
  return {
    "x-school-id": creds.school_id,
    "x-grade": String(creds.grade),
    "x-class": String(creds.class),
    "x-number": String(creds.number),
    "x-pin": creds.pin,
  };
}

const credentialStore = {
  get() {
    try {
      const raw = localStorage.getItem(CRED_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },
};

/** 서버 progress(숫자 0~4)까지의 행성을 hg_progress(행성 불리언)에 합집합 병합. (auth mergeProgress 형식) */
function mergeProgress(progress) {
  let cur = {};
  try {
    cur = JSON.parse(localStorage.getItem("hg_progress") || "{}") || {};
  } catch (_) {
    cur = {};
  }
  for (let n = 1; n <= 4; n++) {
    if (n <= progress) cur["planet" + n] = true;
  }
  try {
    localStorage.setItem("hg_progress", JSON.stringify(cur));
  } catch (_) {
    /* 무시 */
  }
}

/** hg_session.progress 를 max(현재, value) 로 갱신. */
function bumpSessionProgress(value) {
  try {
    const s = JSON.parse(localStorage.getItem("hg_session") || "null");
    if (s && typeof s === "object") {
      const cur = typeof s.progress === "number" ? s.progress : 0;
      s.progress = Math.max(cur, value);
      localStorage.setItem("hg_session", JSON.stringify(s));
    }
  } catch (_) {
    /* 무시 */
  }
}

/** 현재 완료 진도(0~4) — 홈 표시 진도와 동일: max(hg_session.progress, hg_progress 최고 행성). */
function currentProgress() {
  let p = 0;
  try {
    const s = JSON.parse(localStorage.getItem("hg_session") || "null");
    if (s && typeof s.progress === "number") p = s.progress;
  } catch (_) {
    /* 무시 */
  }
  try {
    const obj = JSON.parse(localStorage.getItem("hg_progress") || "{}") || {};
    for (let n = 1; n <= 4; n++) if (obj["planet" + n]) p = Math.max(p, n);
  } catch (_) {
    /* 무시 */
  }
  return p;
}

/**
 * 행성(1-4) 완료 저장 — 논블로킹 (src/lib/session.ts completePlanet 이식).
 *   1) 낙관적 로컬 갱신: hg_progress 에 {planetN:true} 병합 + hg_session.progress = max(현재, planet).
 *      → home 이 max(hg_session.progress, hg_progress) 로 잠금 해제를 즉시 반영(Task 4 확정).
 *      ⚠ local-first — 자격증명 가드보다 먼저 실행한다(의도적 확정 패턴). 자격증명이 없어
 *      서버 저장을 건너뛰어도 로컬 진도는 항상 남는다.
 *   2) 서버 저장은 백그라운드(await 없음): PUT /api/progress/{planet}, x-* 헤더,
 *      body.review 는 원본과 동일한 더미 문구(서버가 빈 문자열은 400 으로 거부).
 *      성공 시 서버 권위 progress 로 로컬 재동기화, 실패해도 throw 하지 않고 콘솔에만 남긴다
 *      → 서버 실패해도 로컬은 저장되고 진행이 막히지 않는다(원본 에러 처리와 동일).
 */
function completePlanet(planet) {
  // 재완료 스킵: 이미 완료한(진도 이하) 행성은 로컬 병합·서버 PUT을 모두 건너뛴다.
  // 서버가 progress를 max로 처리하지 않을 수 있어, 재완료가 서버 진도를 다운그레이드하고
  // 게시판 review를 중복 저장하는 것을 클라이언트에서 원천 차단한다.
  if (planet <= currentProgress()) return;

  // 1) 낙관적 로컬 갱신 (네트워크와 무관하게 홈 잠금 해제 즉시 반영) — 자격증명 가드보다 먼저.
  mergeProgress(planet);
  bumpSessionProgress(planet);

  // 세션 가드로 여기 닿을 땐 보통 자격증명이 있지만, 히든 점프 등으로 없을 수 있다.
  // 자격증명이 없으면 서버 저장을 건너뛴다(로컬은 이미 저장됨). — 원본 세션 가드와 동일 취지.
  const creds = credentialStore.get();
  if (!creds) {
    console.warn(`[progress] 자격증명 없음 — 행성 ${planet} 서버 저장을 건너뛴다(로컬만 저장)`);
    return;
  }

  // 2) 서버 저장(백그라운드, await 없음). review 는 원본과 동일한 더미 문구.
  apiRequest("/api/progress/" + planet, {
    method: "PUT",
    headers: authHeaders(creds),
    body: { review: "행성 " + planet + " 클리어" },
    keepalive: true,
  })
    .then((res) => {
      if (res && typeof res.progress === "number") {
        // 서버 권위값으로 로컬 동기화(session.ts 와 동일).
        bumpSessionProgress(res.progress);
        mergeProgress(res.progress);
      }
    })
    .catch((e) => {
      console.error(`[progress] 행성 ${planet} 완료 저장 실패`, e);
      // 서버가 못 받은 진도를 기록 — auth 로그인 때 재전송된다(hg_pending_sync).
      // (로그인 시 hg_progress 는 서버값으로 덮어써지므로, 이 기록이 없으면 유실됨.)
      try {
        const p = JSON.parse(localStorage.getItem("hg_pending_sync") || "{}") || {};
        p["planet" + planet] = true;
        localStorage.setItem("hg_pending_sync", JSON.stringify(p));
      } catch (_) {
        /* 무시 */
      }
    });
}

/* ==========================================================================
   미션3 데이터 — mission03.json 인라인 (별도 fetch 금지, 페이지 독립성).
   "/assets/..." 경로는 ASSETS 접두어로 치환한다. 전 6노드 verbatim(전수 대조 완료):
   line(5) + minigame(1). choice/branch 없음(mission03.json 미사용).
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "p2_m3_intro",
  nodes: [
    {
      id: "p2_m3_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감 레이더 가동 완료!\n친구들의 감정이 조금씩 드러나기 시작했어.\n공감 레이더로 안개 속 단서들을 찾고 숨은 감정을 찾아보자",
      next: "p2_m3_play",
    },
    { id: "p2_m3_play", type: "minigame", game: "hiddenEmotion", next: "p2_m3_cards" },
    {
      id: "p2_m3_cards",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "같은 감정도 사람마다 표현하는 방법은 달라. 그래서 우리는 겉모습만 보고 판단하면 안돼!",
      cards: [
        { image: A + "/planet2/fog-planet-empathy-card-5.webp" },
        { image: A + "/planet2/fog-planet-empathy-card-6.webp" },
      ],
      next: "p2_m3_result",
    },
    {
      id: "p2_m3_result",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "잘 했어! 주민들이 서로의 감정을 이해하게 되었어!\n축하해! 안개 행성의 모든 미션을 완료했어!",
      next: "p2_m3_end",
    },
    {
      id: "p2_m3_end",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "축하해! 대원은 이제 두 번째 공감 원석인 관찰의 호박석을 얻었어! 이 원석은 다른 사람들의 숨겨진 감정 신호를 찾아주는 힘을 담고 있단다.",
      image: A + "/ui/explore-success.webp",
      cards: [{ image: A + "/ui/planet2-reward-card.webp" }],
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션3 테마 — theme.ts 의 MISSION03_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ showRadar:false(레이더 HUD 없음)·choiceIcons/badgeColors(choice 노드 없음)·
   fx_result_glow(사용 안 함) 미포함. cast(플레이트 위 캐릭터 3명, 미션3 전용)는 포함. */
const THEME = {
  speakers: { hati: { name: "하티" } },
  bannerNode: "p2_m3_intro",
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
    byNode: {},
  },
  friends: {
    placeholder: {
      char: { sad: A + "/char/Lumi/lumi_sad.webp" },
      initial: "sad",
      byNode: {},
    },
  },
  // 무대(플레이트) 위 캐릭터 세트 — 미션3 전 구간 상시 표시. p2_m3_result 부터 3명 개별
  // 무표정을 웃는 3인 1장으로 교체(sparse — 이후 end 에서도 유지).
  cast: {
    platform: A + "/planet2/cast-platform.webp",
    members: [
      { img: A + "/planet2/cast-mira-blank.webp", name: "미라" },
      { img: A + "/planet2/cast-arji-blank.webp", name: "아르지" },
      { img: A + "/planet2/cast-nubi-blank.webp", name: "누비" },
    ],
    byNode: {
      p2_m3_result: [{ img: A + "/planet2/cast-trio-smile.webp" }],
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
   미니게임: 숨은 감정 찾기 (HiddenEmotionStage.tsx + hiddenEmotion.{data,logic}.ts 이식).
   원본: mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html. 3인물(아르지·누비·미라)
   × 5카드 전수 인라인.
   --------------------------------------------------------------------------
   전체 구조 rebuild(render, EmotionGuideStage 패턴)와 고빈도 타자기 갱신(updateGuide,
   28ms 간격)을 분리했다 — 결과 패널의 컨페티(confettiBurst)가 하티 대사 타이핑 중에
   매번 다시 그려지면 애니메이션이 끊기므로, 타이핑은 반드시 부분 갱신만 한다.
   ========================================================================== */
const HE_ASSET = A + "/planet2/hidden-emotion";

const HE_EMOTION_FACES = {
  "기쁨": "😄", "속상함": "😢", "아무렇지 않음": "😐", "신남": "🤩",
  "외로움": "☹️", "화남": "😡", "편안함": "🙂", "미안함": "🥺",
  "자랑스러움": "😌", "심심함": "😶",
};

const HE_MISSIONS = [
  {
    person: "아르지",
    intro: "공감 레이더를 사용하여 아르지의 숨겨진 감정을 찾아봐!",
    answer: "속상함",
    feedback:
      "겉으로는 웃는 얼굴만 보면 아르지가 기쁘다고 생각하기 쉬워. 하지만 행동과 상황을 함께 보면, 사실은 속상한 마음을 숨기고 있다는 걸 알 수 있어.",
    resultImage: HE_ASSET + "/arji-feeling.webp",
    resultFeedback:
      "기대했던 것보다 시험 결과가 좋지 못해서 속상했어. 하지만 친구들에게 나의 마음을 이야기하기가 싫었어. 내 마음을 알아줘서 고마워!",
    cards: [
      { text: "아르지는 기대하는 눈빛으로 시험 결과를 확인하고 있어요.", art: HE_ASSET + "/arji-card-1.webp" },
      { text: "친구에게 시험을 잘 봤다고 얘기하고 있어요.", art: HE_ASSET + "/arji-card-2.webp" },
      { text: "시험지를 금방 접었어요.", art: HE_ASSET + "/arji-card-3.webp" },
      { text: "시험지를 가방 맨 밑에 넣었어요.", art: HE_ASSET + "/arji-card-4.webp" },
      { text: "쉬는 시간 내내 창밖만 바라봤어요.", art: HE_ASSET + "/arji-card-5.webp" },
    ],
    emotions: ["기쁨", "속상함", "아무렇지 않음", "신남"],
  },
  {
    person: "누비",
    intro: "생일파티 이야기를 듣는 누비를 살펴봐요.",
    answer: "외로움",
    feedback:
      "\"안 가도 돼”라는 말만 들으면 정말 괜찮은 줄 알 수 있어. 하지만 손을 만지작거리는 행동과, 혼자만 초대받지 못한 상황을 보면 서운하고 외로운 마음이 숨어있다는 걸 알 수 있어.",
    resultImage: HE_ASSET + "/nubi-feeling.webp",
    resultFeedback:
      "사실은... 다들 파티 얘기하니까 나만 쏙 빠진 것 같아서 조금 외로웠거든. 그런데 네가 내 마음 알아채고 먼저 말 걸어줘서 정말 고마워. 마음이 되게 편해졌어!",
    cards: [
      { text: "친구들이 생일파티 이야기를 하는 걸 들었어요.", art: HE_ASSET + "/nubi-card-1.webp" },
      { text: "누비는 웃으며 이야기했어요.", art: HE_ASSET + "/nubi-card-2.webp" },
      { text: "손가락으로 옷자락을 만지작거렸어요.", art: HE_ASSET + "/nubi-card-3.webp" },
      { text: "친구들이 떠난 뒤에도 한참 그 자리에 있었어요.", art: HE_ASSET + "/nubi-card-4.webp" },
      { text: "자신만 초대받지 못했다고 느끼고 있어요", art: HE_ASSET + "/nubi-card-5.webp" },
    ],
    emotions: ["외로움", "신남", "화남", "편안함"],
  },
  {
    person: "미라",
    intro: "필통이 망가진 뒤 미라의 행동을 살펴봐요.",
    answer: "미안함",
    feedback:
      "겉으로는 화를 내는 모습만 보면 미라가 짜증난다고 생각하기 쉬워. 하지만 실수한 상황과 눈을 마주치지 못하는 행동을 함께 보면, 사실은 미안한 마음을 숨기고 있다는 걸 알 수 있어.",
    resultImage: HE_ASSET + "/mira-feeling.webp",
    resultFeedback:
      "내 마음을 알아줘서 고마워! 사실은 친구한테 너무 미안했는데, 친구가 나를 싫어하게 될까 봐 겁이 났어!",
    cards: [
      { text: "미라는 실수로 친구의 필통을 바닥에 떨궜어요.", art: HE_ASSET + "/mira-card-1.webp" },
      { text: "필통이 부서져서 친구가 깜짝 놀랐어요.", art: HE_ASSET + "/mira-card-2.webp" },
      { text: "미라는 큰소리로 화를 냈어요.", art: HE_ASSET + "/mira-card-3.webp" },
      { text: "짝꿍과 눈을 마주치지 못하고 손을 꼼지락거렸어요.", art: HE_ASSET + "/mira-card-4.webp" },
      { text: "부서진 필통을 보며 고개를 숙이고 아무말도 하지 않아요.", art: HE_ASSET + "/mira-card-5.webp" },
    ],
    emotions: ["미안함", "기쁨", "자랑스러움", "심심함"],
  },
];

/* hiddenEmotion.logic.ts 이식 — 순수 상태 전이 함수 */
const HE_START_REVEALED = 2;
const HE_TOTAL_CARDS = 5;
function heInitialState() {
  return { missionIndex: 0, revealedCount: HE_START_REVEALED, puzzleSolved: false, feedbackShown: false };
}
function heUseRadar(s) {
  if (s.revealedCount >= HE_TOTAL_CARDS) return s;
  return Object.assign({}, s, { revealedCount: s.revealedCount + 1 });
}
function heAllRevealed(s) {
  return s.revealedCount >= HE_TOTAL_CARDS;
}
function heSubmitPuzzle(s, picks, emotion) {
  if (picks.length < 2) return { kind: "need-more" };
  if (emotion !== HE_MISSIONS[s.missionIndex].answer) return { kind: "wrong" };
  return { kind: "solved", state: Object.assign({}, s, { puzzleSolved: true, feedbackShown: true }) };
}
function heNextMission(s) {
  return { missionIndex: s.missionIndex + 1, revealedCount: HE_START_REVEALED, puzzleSolved: false, feedbackShown: false };
}
function heIsLastMission(s) {
  return s.missionIndex >= HE_MISSIONS.length - 1;
}

const HiddenEmotionStage = (function () {
  const INTRO_LINE = "공감 레이더를 사용하여 친구의 숨겨진 감정을 찾아봐!";
  const MORE_CLUES_LINE = "좋아, 단서를 하나 더 찾았어. 공감 레이더로 계속 살펴보자!";
  const ALL_CLUES_LINE = "단서를 모두 찾았어. 이제 수집한 단서들을 조합해서 숨겨진 감정을 찾아봐.";
  const NEED_MORE_LINE = "단서를 2개 이상 골라야 마음 퍼즐을 풀 수 있어.";
  const WRONG_LINE = "조금 더 생각해볼까? 친구의 모습과 행동을 함께 살펴봐.";

  let state = null;
  let container = null;
  let root = null;
  let onFinish = null;

  let puzzleReady = false;
  let resultNextReady = false;
  let scanUsed = false; // radar-image-wrap 의 원본 scanning 상태(한 번 true 되면 계속 true)
  let hatiText = "";
  let hatiHidden = true;

  let typingTimer = 0;
  let hatiEndTimer = 0;
  let puzzleTimer = 0;
  let resultTimer = 0;

  let screenEl = null;
  let guideWrapEl = null;
  let guideTextEl = null;
  let puzzleCardEl = null;

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

  function clearAllTimers() {
    window.clearInterval(typingTimer);
    typingTimer = 0;
    window.clearTimeout(hatiEndTimer);
    hatiEndTimer = 0;
    window.clearTimeout(puzzleTimer);
    puzzleTimer = 0;
    window.clearTimeout(resultTimer);
    resultTimer = 0;
  }

  // 하티 말풍선만 갱신(고빈도, 28ms) — 나머지 구조(카드/퍼즐/결과 패널)는 손대지 않는다.
  function updateGuide() {
    if (guideWrapEl) guideWrapEl.classList.toggle("is-hidden", hatiHidden);
    if (guideTextEl) guideTextEl.textContent = hatiText;
  }

  function sayHati(text, onEnd) {
    window.clearInterval(typingTimer);
    typingTimer = 0;
    window.clearTimeout(hatiEndTimer);
    hatiEndTimer = 0;
    hatiHidden = false;
    hatiText = "";
    updateGuide();
    let i = 0;
    typingTimer = window.setInterval(() => {
      i += 1;
      hatiText = text.slice(0, i);
      updateGuide();
      if (i >= text.length) {
        window.clearInterval(typingTimer);
        typingTimer = 0;
        if (onEnd) {
          hatiEndTimer = window.setTimeout(() => {
            hatiEndTimer = 0;
            onEnd();
          }, 350);
        }
      }
    }, 28);
  }

  function puzzleOpen() {
    return heAllRevealed(state) && puzzleReady && !state.feedbackShown;
  }

  function handleUseRadar() {
    if (heAllRevealed(state) || state.feedbackShown) return;
    scanUsed = true;
    state = heUseRadar(state);
    audio.play("sparkle"); // 숨은 공감 카드 공개
    render(); // 구조 갱신(카드 공개·진행도·단서 목록) — 부분 갱신 대상 아님(빈도 낮음)
    if (state.revealedCount >= 5) {
      window.clearTimeout(puzzleTimer);
      puzzleTimer = window.setTimeout(() => {
        puzzleTimer = 0;
        puzzleReady = true;
        render();
        sayHati(ALL_CLUES_LINE);
      }, 1700);
    } else {
      sayHati(MORE_CLUES_LINE);
    }
  }

  function handlePuzzleSubmit() {
    const scope = puzzleCardEl;
    if (!scope) return;
    const checked = Array.prototype.slice.call(scope.querySelectorAll(".puzzle-check input:checked"));
    const emotionInput = scope.querySelector(".puzzle-emotion input:checked");
    const emotion = emotionInput ? emotionInput.value : "";
    const picks = checked.map((el2) => Number(el2.value));
    const r = heSubmitPuzzle(state, picks, emotion);
    if (r.kind === "need-more") {
      sayHati(NEED_MORE_LINE);
      return;
    }
    if (r.kind === "wrong") {
      audio.play("wrong");
      sayHati(WRONG_LINE);
      return;
    }
    state = r.state;
    audio.play("correct"); // 숨은 감정 정답
    render(); // 결과 패널(컨페티) 등장 — 이후 하티 대사는 updateGuide 로만 갱신
    hatiHidden = true;
    updateGuide();
    window.clearTimeout(resultTimer);
    const mission = HE_MISSIONS[state.missionIndex];
    resultTimer = window.setTimeout(() => {
      resultTimer = 0;
      sayHati(mission.feedback, () => {
        resultNextReady = true;
        render();
      });
    }, 1900);
  }

  function handleNextMission() {
    window.clearTimeout(puzzleTimer);
    puzzleTimer = 0;
    window.clearTimeout(resultTimer);
    resultTimer = 0;
    if (heIsLastMission(state)) return; // 방어 — 버튼 분기가 보장
    state = heNextMission(state);
    audio.play("stage"); // 다음 감정 상황으로
    puzzleReady = false;
    resultNextReady = false;
    render();
    sayHati(INTRO_LINE);
  }

  function handleFinish() {
    if (onFinish) onFinish();
  }

  const CONFETTI_SPECS = [
    ["-340px", "-150px", "18deg", "0s", "#ffcf4d"],
    ["-260px", "-205px", "66deg", "0.04s", "#8ee05b"],
    ["-180px", "-170px", "112deg", "0.02s", "#57c7ff"],
    ["-100px", "-230px", "158deg", "0.08s", "#ff8a65"],
    ["-30px", "-185px", "202deg", "0.01s", "#ffe27a"],
    ["70px", "-220px", "248deg", "0.05s", "#9be36c"],
    ["150px", "-175px", "294deg", "0.03s", "#62d0ff"],
    ["245px", "-205px", "332deg", "0.07s", "#ffb14f"],
    ["330px", "-145px", "28deg", "0.02s", "#f7db59"],
    ["-310px", "55px", "78deg", "0.05s", "#75d366"],
    ["-215px", "110px", "128deg", "0.09s", "#55c0ff"],
    ["-115px", "72px", "174deg", "0.03s", "#ff8f73"],
    ["120px", "78px", "214deg", "0.06s", "#ffd85b"],
    ["220px", "116px", "268deg", "0.04s", "#8fe96a"],
    ["316px", "58px", "318deg", "0.08s", "#65ccff"],
  ];
  function buildCelebration() {
    const wrap = el("div", { class: "celebration", "aria-hidden": "true" });
    CONFETTI_SPECS.forEach((s) => {
      const span = document.createElement("span");
      span.style.setProperty("--tx", s[0]);
      span.style.setProperty("--ty", s[1]);
      span.style.setProperty("--angle", s[2]);
      span.style.setProperty("--delay", s[3]);
      span.style.setProperty("--piece-color", s[4]);
      wrap.appendChild(span);
    });
    return wrap;
  }

  function render() {
    if (!screenEl) return;
    screenEl.innerHTML = "";
    screenEl.classList.toggle("puzzle-open", puzzleOpen());
    screenEl.classList.toggle("result-open", state.feedbackShown);

    const mission = HE_MISSIONS[state.missionIndex];
    const revealedCards = mission.cards.slice(0, state.revealedCount);

    // 카드 5장(카드게임판)
    const cardsGrid = el("div", { class: "cards" });
    mission.cards.forEach((card, index) => {
      const revealed = index < state.revealedCount;
      const btn = el("button", { type: "button", class: "card" + (revealed ? " revealed" : "") }, [
        el("span", { class: "card-inner" }, [
          el("span", { class: "card-face card-back" }),
          el("span", { class: "card-face card-front", style: "background-image:url(" + card.art + ")" }),
        ]),
      ]);
      btn.disabled = true;
      btn.setAttribute("aria-label", revealed ? card.text : (index + 1) + "번 공감 카드");
      cardsGrid.appendChild(btn);
    });

    // 공감 레이더 박스
    const radarBtn = el("button", { class: "radar-button", type: "button", text: "공감 레이더 사용하기" });
    if (heAllRevealed(state) || state.feedbackShown) radarBtn.disabled = true;
    radarBtn.addEventListener("click", handleUseRadar);
    const radarBox = el("div", { class: "radar-box" }, [
      el("div", { class: "radar-image-wrap" + (scanUsed ? " scanning" : "") }, [
        el("img", { class: "radar-image", src: HE_ASSET + "/radar.webp", alt: "공감 레이더" }),
      ]),
      el("div", {}, [radarBtn]),
    ]);

    const board = el("div", { class: "board", "aria-label": "카드 게임판" }, [
      el("div", { class: "scene-title" }, [
        el("div", {}, [el("h2", { text: "친구의 숨은 감정 찾기" }), el("p", { text: mission.intro })]),
        el("div", { class: "progress", text: state.revealedCount + " / 5 공개" }),
      ]),
      cardsGrid,
      radarBox,
    ]);

    // 사이드: 발견한 단서
    const clueList = el("div", { class: "clue-list" });
    if (revealedCards.length === 0) {
      clueList.appendChild(
        el("div", { class: "empty" }, [
          document.createTextNode("단서 수첩이 비어 있어요."),
          document.createElement("br"),
          document.createTextNode("공감 레이더로 단서를 찾아요."),
        ]),
      );
    } else {
      revealedCards.forEach((card, index) => {
        clueList.appendChild(
          el("div", { class: "clue-item" }, [
            el("span", { class: "clue-no", text: String(index + 1) }),
            el("span", { text: card.text }),
          ]),
        );
      });
    }
    const sidePanel = el("aside", { class: "side-panel", "aria-label": "발견한 단서" }, [
      el("div", { class: "panel-title", text: "💗 발견한 단서" }),
      clueList,
    ]);

    screenEl.appendChild(el("div", { class: "main-grid" }, [board, sidePanel]));

    // 하티 가이드(부분 갱신 대상 — 참조 저장)
    const guideWrap = el("div", { class: "game-guide" + (hatiHidden ? " is-hidden" : "") }, [
      el("img", { src: HE_ASSET + "/hati.webp", alt: "하티" }),
      el("div", { class: "game-guide-bubble", text: hatiText }),
    ]);
    screenEl.appendChild(guideWrap);
    guideWrapEl = guideWrap;
    guideTextEl = guideWrap.querySelector(".game-guide-bubble");

    // 퍼즐 모달
    if (puzzleOpen()) {
      const cardOptions = el("div", { class: "puzzle-options" });
      mission.cards.forEach((card, index) => {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = String(index);
        const label = el("label", { class: "puzzle-check" }, [
          input,
          el("span", { text: (index + 1) + ". " + card.text }),
        ]);
        cardOptions.appendChild(label);
      });
      const emotionOptions = el("div", { class: "puzzle-options" });
      mission.emotions.forEach((emotion) => {
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "emotionGuess";
        input.value = emotion;
        const label = el("label", { class: "puzzle-emotion" }, [
          input,
          el("span", { text: (HE_EMOTION_FACES[emotion] || "🙂") + " " + emotion }),
        ]);
        emotionOptions.appendChild(label);
      });
      const submitBtn = el("button", { class: "puzzle-submit", type: "button", text: "결과 확인" });
      submitBtn.addEventListener("click", handlePuzzleSubmit);

      const card = el("div", { class: "puzzle-card" }, [
        el("h2", { text: "🧩 마음 퍼즐 추리" }),
        el("div", {
          class: "puzzle-question",
          text: "어떤 단서들이 " + mission.person + "의 진짜 마음을 보여줄까요? (2개 이상 선택)",
        }),
        cardOptions,
        el("div", { class: "puzzle-question", text: mission.person + "의 진짜 마음은 무엇일까요?" }),
        emotionOptions,
        submitBtn,
      ]);
      puzzleCardEl = card;
      screenEl.appendChild(el("section", { class: "puzzle-modal", role: "dialog", "aria-modal": "true" }, [card]));
    } else {
      puzzleCardEl = null;
    }

    // 결과 패널(컨페티 + 정답 요약 + 친구 속마음)
    if (state.feedbackShown) {
      const resultCard = el("div", { class: "result-card" }, [
        buildCelebration(),
        el("div", { class: "celebration-star left", "aria-hidden": "true", text: "★" }),
        el("div", { class: "celebration-star right", "aria-hidden": "true", text: "★" }),
        el("h2", { text: "숨겨진 감정의 정체" }),
        el("div", { class: "result-summary" }, [
          el("p", { text: "100% 공감 성공!" }),
          el("p", {}, [
            document.createTextNode(mission.person + "의 진짜 마음:"),
            document.createElement("br"),
            el("strong", { text: mission.answer }),
          ]),
        ]),
        el("div", { class: "arji-feedback" }, [
          el("img", { src: mission.resultImage, alt: mission.person }),
          el("p", { text: mission.resultFeedback }),
        ]),
      ]);
      screenEl.appendChild(el("section", { class: "result-panel" }, [resultCard]));
    }

    // 다음 버튼(정답 피드백 타이핑까지 끝난 뒤에만 등장)
    if (state.feedbackShown && resultNextReady) {
      const isLast = heIsLastMission(state);
      const btn = el("button", { class: "friend-next", type: "button", text: isLast ? "미션 완료 ▶" : "다른 친구 만나기 ➡" });
      btn.addEventListener("click", isLast ? handleFinish : handleNextMission);
      screenEl.appendChild(btn);
    }
  }

  function mount(containerEl, finishCb) {
    state = heInitialState();
    puzzleReady = false;
    resultNextReady = false;
    scanUsed = false;
    hatiText = "";
    hatiHidden = true;
    container = containerEl;
    onFinish = finishCb;

    root = el("div", { class: "he-overlay" });
    root.addEventListener("click", (e) => e.stopPropagation());
    screenEl = el("div", { class: "he-screen" });
    root.appendChild(el("div", { class: "he-scale" }, [screenEl]));
    container.appendChild(root);

    render();
    sayHati(INTRO_LINE);
  }

  function unmount() {
    clearAllTimers();
    if (root) root.remove();
    root = null;
    container = null;
    screenEl = null;
    guideWrapEl = null;
    guideTextEl = null;
    puzzleCardEl = null;
  }

  return { mount: mount, unmount: unmount };
})();

/* ==========================================================================
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션3이 쓰는 부분만).
   지원 노드 타입: line / minigame. (mission03.json 은 choice/branch/mirrors/gauge/
   reveal/video 를 쓰지 않는다 — 미포함.) 레이더 HUD 는 showRadar:false 라 미포함.
   ========================================================================== */
(function missionPlayer() {
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const els = {
    bg: $("bg"),
    castStage: $("castStage"),
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

  // ---------- 상태(vm) — MissionPlayer VM 중 미션3이 쓰는 필드만 ----------
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
    castMembers: THEME.cast.members,
    choiceImage: "", // 화면 가운데 큰 이미지(node.image) — end 노드 리워드 리본
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

  // ---------- 씬(스프라이트/배경/캐릭터 세트) 갱신 ----------
  function updateScene(node) {
    if (node.speaker && node.speaker !== "hati" && node.speaker !== vm.friendId) {
      vm.friendId = node.speaker;
      const fs = THEME.friends[vm.friendId];
      vm.friend = (fs && fs.initial) || vm.friend;
    }
    const fs = THEME.friends[vm.friendId];
    if (fs && fs.byNode[node.id]) vm.friend = fs.byNode[node.id];
    if (THEME.hatiSprites.byNode[node.id]) vm.hati = THEME.hatiSprites.byNode[node.id];
    const cb = THEME.cast.byNode[node.id];
    if (cb) vm.castMembers = cb; // 무대 캐릭터 레이어 교체(sparse, 지정 노드부터 유지)
    const bg = THEME.bg.byNode[node.id];
    if (bg) vm.bg = bg;
    vm.hideFriend = !!node.hideFriend;
    vm.choiceImage = node.image || "";
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
        // 미션3은 모든 라인이 noAuto — 자동 진행 없음(탭으로만).
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
    HiddenEmotionStage.mount(els.minigameLayer, () => {
      HiddenEmotionStage.unmount();
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
    stage.classList.add("node-" + id); // planet2/Mission.css 오버라이드(castStage 위치·choiceImage 리본) 조준용
  }

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

  // ---------- 마지막 미션 완료 → 진도 저장 + 홈 이동 ----------
  // 원본 planet2/index.tsx onExit: completePlanet(2) → nav("/home"). 저장을 기다리지 않고 즉시 전환.
  els.nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    els.nextBtn.disabled = true;
    completePlanet(2); // 낙관적 로컬 갱신 + 백그라운드 서버 저장(논블로킹)
    fadeNav(ROOT + "home/index.html"); // 저장을 기다리지 않고 즉시 전환
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

  // 무대(플레이트) 위 캐릭터 세트(변경 시에만 재빌드) — castPlatform 은 index.html 에 정적으로 있다.
  let lastCastKey = "";
  function renderCast() {
    Array.prototype.slice.call(els.castStage.querySelectorAll(".cast-member")).forEach((n) => n.remove());
    vm.castMembers.forEach((m, i) => {
      const wrap = document.createElement("div");
      wrap.className = "cast-member";
      wrap.dataset.i = String(i);
      const img = document.createElement("img");
      img.className = "cast-char";
      img.src = m.img;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.addEventListener("error", () => (img.style.visibility = "hidden"));
      wrap.appendChild(img);
      if (m.name) {
        const name = document.createElement("span");
        name.className = "cast-name";
        name.textContent = m.name;
        wrap.appendChild(name);
      }
      els.castStage.appendChild(wrap);
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

  // 진행 스테퍼: 미션3 = step 3 고정(행성 마지막 미션이라 done 후 "다음 활성" 노드 없음).
  const STEP = 3;
  function applyStepper() {
    const missionDone = vm.progress === "done";
    const stepCls = (i) => (i < STEP ? "done" : i === STEP ? (missionDone ? "done" : "active") : "locked");
    [1, 2, 3].forEach((i) => {
      const node = document.getElementById("mission" + i);
      node.classList.remove("done", "active", "locked");
      node.classList.add(stepCls(i));
    });
    document.getElementById("conn1").classList.toggle("filled", true);
    document.getElementById("conn2").classList.toggle("filled", STEP < 3 || missionDone);
  }

  function render() {
    // 배경/밝기
    els.bg.src = THEME.bg.states[vm.bg] || "";
    stage.classList.toggle("bright", vm.bright);

    // 스테퍼
    applyStepper();

    // 무대 캐릭터 세트(변경 시에만 재빌드)
    const castKey = vm.castMembers.map((m) => m.img).join("|");
    if (castKey !== lastCastKey) {
      lastCastKey = castKey;
      renderCast();
    }

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

    // 가운데 큰 이미지(node.image) — end 노드의 리워드 리본
    if (vm.choiceImage) {
      els.choiceImage.src = vm.choiceImage;
      els.choiceImage.classList.add("show");
    } else {
      els.choiceImage.classList.remove("show");
    }

    // 공감 카드 / 리워드 카드(변경 시에만 재빌드)
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

    // 다음 버튼(우주선)
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
  window.__m3 = { vm, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission3] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
