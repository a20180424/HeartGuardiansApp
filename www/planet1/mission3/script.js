"use strict";

/* ==========================================================================
   경로 상수 (페이지마다 이 값만 바꾼다) — planetN/missionM/ 는 두 단계 깊이
   ========================================================================== */
const ROOT = "../../";
const ASSETS = ROOT + "assets"; // 미션 데이터의 "/assets/..." → 이 접두어로 치환
const VIDEO = ROOT + "video"; // 미션 데이터의 "/video/..." → 이 접두어로 치환

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
   API 클라이언트 + 진도 저장 (src/lib/{api,progress,session}.ts 이식)
   --------------------------------------------------------------------------
   ⚠ 진도 저장 패턴 확정처(Task 8): 이후 행성(2·3·4)의 마지막 미션이 이 블록을 복사한다.
   이 API 는 세션 토큰이 없다. 보호된 요청은 매번 자격증명을 x-* 헤더로 싣는다
   (x-school-id, x-grade, x-class, x-number, x-pin). 자격증명은 auth 가 로그인 시
   localStorage "hg.credentials" 에 저장해 둔다(intro 가 지우지 않음).
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

  // 1) 낙관적 로컬 갱신 (네트워크와 무관하게 홈 잠금 해제 즉시 반영)
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
   "/assets/..." → ASSETS, "/video/..." → VIDEO 로 치환.
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "m3_intro",
  nodes: [
    { id: "m3_intro", type: "line", noAuto: true, speaker: "hati", text: "루나가 걱정돼. 루나는 지금 어떤 마음일까? 친구의 마음을 이해하고 사라진 이해의 빛을 되찾아보자!", next: "m3_video" },

    { id: "m3_video", type: "video", src: VIDEO + "/Planet1_Mission3.mp4", holdAfter: 800, hideFriend: true, next: "m3_q1_choice" },

    {
      id: "m3_q1_choice", type: "choice", speaker: "hati",
      text: "대원이 루나와 같은 상황이라면 어떤 기분일까?",
      hideFriend: true,
      image: A + "/char/Luna/luna_unheard1.webp",
      choices: [
        { text: "슬픔", next: "m3_q2_choice" },
        { text: "화남", next: "m3_q2_choice" },
        { text: "걱정", next: "m3_q2_choice" },
        { text: "외로움", next: "m3_q2_choice" },
        { text: "관심없음", next: "m3_q2_choice" },
        { text: "혼란스러움", next: "m3_q2_choice" },
        { text: "지침", next: "m3_q2_choice" },
      ],
    },
    {
      id: "m3_q2_choice", type: "choice",
      hideFriend: true,
      image: A + "/char/Luna/luna_unheard2.webp",
      choices: [
        { text: "슬픔", next: "m3_mirror1" },
        { text: "화남", next: "m3_mirror1" },
        { text: "걱정", next: "m3_mirror1" },
        { text: "외로움", next: "m3_mirror1" },
        { text: "관심없음", next: "m3_mirror1" },
        { text: "혼란스러움", next: "m3_mirror1" },
        { text: "지침", next: "m3_mirror1" },
      ],
    },

    {
      id: "m3_mirror1", type: "line", noAuto: true, speaker: "hati",
      hideFriend: true,
      text: "대원! 공감 없는 이 세상에서 행복할 수 있을까?",
      images: [A + "/char/Luna/luna_unheard1.webp", A + "/char/Luna/luna_unheard2.webp"],
      next: "m3_mirror2",
    },
    {
      id: "m3_mirror2", type: "line", noAuto: true, speaker: "hati",
      hideFriend: true,
      text: "공감 거울을 이용하여 루나의 마음을 이해해보자!",
      images: [A + "/char/Luna/luna_unheard1.webp", A + "/char/Luna/luna_unheard2.webp"],
      next: "m3_mirror3",
    },
    {
      id: "m3_mirror3", type: "reveal",
      text: "공감 거울을 터치해서 이 차가운 화면 위로 슥슥 문질러봐!",
      mirrorImage: A + "/ui/empathy-mirror2.webp",
      pairs: [
        { before: A + "/char/Luna/luna_unheard1.webp", after: A + "/char/Luna/luna_heard1.webp" },
        { before: A + "/char/Luna/luna_unheard2.webp", after: A + "/char/Luna/luna_heard2.webp" },
      ],
      threshold: 0.97,
      next: "m3_lesson",
    },

    {
      id: "m3_lesson", type: "line", noAuto: true, speaker: "hati",
      hideFriend: true,
      text: "루나의 마음을 완전히 공감 했구나!!!",
      images: [A + "/char/Luna/luna_heard1.webp", A + "/char/Luna/luna_heard2.webp"],
      next: "m3_card",
    },
    {
      id: "m3_card", type: "line", noAuto: true, speaker: "hati",
      hideFriend: true,
      text: "공감은 사람들의 마음을 이어주는 힘이야. 그래서 친구들과 행복하게 지낼 수 있단다.",
      cards: [
        { image: A + "/planet1/light-planet-empathy-card-5.webp" },
        { image: A + "/planet1/light-planet-empathy-card-6.webp" },
      ],
      next: "m3_complete",
    },
    {
      id: "m3_complete", type: "line", noAuto: true, speaker: "hati",
      hideFriend: true,
      text: "드디어 사라진 빛이 돌아왔어!",
      completeBanner: "미션 완료!",
      next: "m3_end",
    },

    {
      id: "m3_end", type: "line", noAuto: true, speaker: "hati",
      hideFriend: true,
      text: "축하해! 이제 첫 번째 공감 원석인 이해의 사파이어를 얻었어! 이 원석은 다른 사람의 마음을 이해하려는 힘을 담고 있어.",
      image: A + "/ui/explore-success.webp",
      cards: [{ image: A + "/ui/planet1-reward-card.webp" }],
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* ==========================================================================
   미션3 감정 선택지 아이콘 — theme.ts M3_CHOICE_ICONS 이식.
   광택 있는 컬러 구체 + 표정(인라인 SVG 데이터URI). 어두운 카드 위 컬러 얼굴.
   ========================================================================== */
const INK = "#332c46";
const BROW = "fill='none' stroke='" + INK + "' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'";
const MOUTH = "fill='none' stroke='" + INK + "' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'";
const EYE = "fill='" + INK + "'";
function emoFace(base, gloss, feat) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
        "<defs><radialGradient id='g' cx='36%' cy='28%' r='80%'>" +
        "<stop offset='0%' stop-color='" + gloss + "'/>" +
        "<stop offset='60%' stop-color='" + base + "'/>" +
        "<stop offset='100%' stop-color='" + base + "'/>" +
        "</radialGradient></defs>" +
        "<circle cx='50' cy='52' r='45' fill='url(#g)'/>" +
        "<ellipse cx='40' cy='29' rx='20' ry='11' fill='#ffffff' opacity='0.25'/>" +
        feat +
        "</svg>",
    )
  );
}

const M3_CHOICE_ICONS = {
  슬픔: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#3fa0ef",
      "#8fd0ff",
      "<path d='M27 41 L43 37' " + BROW + "/><path d='M57 37 L73 41' " + BROW + "/>" +
        "<ellipse cx='36' cy='51' rx='4.5' ry='5.5' " + EYE + "/><ellipse cx='64' cy='51' rx='4.5' ry='5.5' " + EYE + "/>" +
        "<path d='M38 71 Q50 63 62 71' " + MOUTH + "/>" +
        "<circle cx='30' cy='62' r='3.2' fill='#cfe9ff'/>",
    ),
  },
  화남: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#ef4d3d",
      "#ff8a72",
      "<path d='M27 37 L44 44' " + BROW + "/><path d='M56 44 L73 37' " + BROW + "/>" +
        "<ellipse cx='36' cy='52' rx='4.5' ry='5.5' " + EYE + "/><ellipse cx='64' cy='52' rx='4.5' ry='5.5' " + EYE + "/>" +
        "<path d='M38 71 Q50 63 62 71' " + MOUTH + "/>",
    ),
  },
  걱정: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#f0c23a",
      "#ffe28c",
      "<path d='M28 40 Q36 36 44 40' " + BROW + "/><path d='M56 40 Q64 36 72 40' " + BROW + "/>" +
        "<ellipse cx='36' cy='52' rx='4.5' ry='5.5' " + EYE + "/><ellipse cx='64' cy='52' rx='4.5' ry='5.5' " + EYE + "/>" +
        "<path d='M41 70 Q50 64 59 70' " + MOUTH + "/>",
    ),
  },
  외로움: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#a273e0",
      "#caa8f2",
      "<path d='M31 51 Q36 56 41 51' " + MOUTH + "/><path d='M59 51 Q64 56 69 51' " + MOUTH + "/>" +
        "<path d='M40 70 Q50 65 60 70' " + MOUTH + "/>",
    ),
  },
  관심없음: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#54cfae",
      "#9be9d3",
      "<path d='M31 50 L41 50' " + MOUTH + "/><path d='M59 50 L69 50' " + MOUTH + "/>" +
        "<path d='M40 67 L60 67' " + MOUTH + "/>",
    ),
  },
  혼란스러움: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#ef85b0",
      "#ffb8d4",
      "<ellipse cx='36' cy='51' rx='5' ry='6' " + EYE + "/><circle cx='64' cy='50' r='3.3' " + EYE + "/>" +
        "<path d='M39 68 Q44.5 63 50 68 T61 68' " + MOUTH + "/>" +
        "<text x='69' y='31' font-family='sans-serif' font-size='30' font-weight='700' fill='" + INK + "'>?</text>",
    ),
  },
  지침: {
    emoji: "",
    bg: "transparent",
    img: emoFace(
      "#9dc45a",
      "#c8e58c",
      "<path d='M31 49 Q36 55 41 49' " + MOUTH + "/><path d='M59 49 Q64 55 69 49' " + MOUTH + "/>" +
        "<path d='M40 68 Q45 64 50 68 T60 68' " + MOUTH + "/>",
    ),
  },
};

/* 미션3 테마 — theme.ts 의 MISSION03_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ radar(showRadar:false)·lesson·sideImage·mirrors·gauge 는 미션3가 안 써서 미포함. */
const THEME = {
  speakers: { hati: { name: "하티" }, luna: { name: "루나" } },
  bannerNode: "m3_intro",
  initialFriend: "luna",
  showRadar: false,
  bg: {
    states: {
      main: A + "/bg/mission3-main-bg.webp",
      stage4: A + "/bg/light-planet-stage4.webp",
      black: "", // 까만 화면(동영상/거울 구간): #bg 숨김 + #stage.blackbg(#000)
    },
    initial: "main",
    byNode: {
      m3_intro: "main",
      m3_video: "black", // 동영상 구간부터 까만 화면(reveal 까지 유지)
      m3_card: "main", // 공감 카드 등장: main 배경 복귀
      m3_complete: "stage4", // "빛이 돌아왔어"부터 엔딩 배경
      m3_end: "stage4",
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
      m3_intro: "explaining",
      m3_lesson: "proud",
      m3_complete: "cheering",
      m3_end: "celebrating",
    },
  },
  friends: {
    // 루나 아트 미확정 → 루미 스프라이트 placeholder(모든 노드 hideFriend 라 화면엔 안 보임).
    luna: {
      char: { sad: A + "/char/Lumi/lumi_sad.webp" },
      initial: "sad",
      byNode: {},
    },
  },
  badgeColors: ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"],
  choiceIcons: M3_CHOICE_ICONS,
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
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션3가 쓰는 부분만).
   지원 노드 타입: line / choice / video / reveal.
   (미션2 대비: video·reveal(RubReveal) + line 의 image/images/completeBanner 추가.
    mirrors·gauge·lesson·sideImage 는 미션3가 안 써서 제거.)
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
    choicePanel: $("choicePanel"),
    choicePrompt: $("choicePrompt"),
    choices: $("choices"),
    choiceImage: $("choiceImage"),
    imageStack: $("imageStack"),
    cardStage: $("cardStage"),
    hatiBox: $("hatiBox"),
    hatiAvatar: $("hatiAvatar"),
    hatiText: $("hatiText"),
    nextBtn: $("nextBtn"),
    tapHint: $("tapHint"),
    fxLayer: $("fxLayer"),
  };

  // ---------- 상태(vm) — MissionPlayer VM 중 미션3가 쓰는 필드만 ----------
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
    hati: THEME.hatiSprites.initial,
    bg: THEME.bg.initial,
    hideFriend: false,
    choiceImage: "", // 화면 가운데 큰 이미지(node.image)
    stackImages: [], // 화면 가운데 나란한 이미지들(node.images)
    cards: [],
    completeBanner: "", // "미션 완료!" 배너 문구(node.completeBanner)
    bright: false,
    progress: "start", // start | done
    tapHint: "",
    showNext: false,
    // 특별 파트
    stage: "none", // none | video | reveal
    videoSrc: "", // 재생 중 동영상 경로
    rPairs: [], // reveal: [{before, after}]
    rMirror: "", // reveal: 공감 거울 이미지
    rThreshold: 0.85,
  };
  // 스테이지(video/reveal) 완료 콜백 + 현재 노드 참조(holdAfter 등)
  const ms = { done: null, node: null };

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
    vm.choiceImage = node.image || ""; // 가운데 큰 이미지(지정 노드에서만)
    vm.stackImages = node.images || []; // 가운데 나란한 이미지들(지정 노드에서만)
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
      vm.stage = "none"; // 이전 스테이지(video/reveal) 잔류 방지
      vm.choices = [];
      vm.choicePrompt = "";
      vm.pick = null;
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
        // 미션3는 모든 라인이 noAuto — 자동 진행 없음(탭으로만).
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
    const showCards = () => {
      vm.mode = "choices";
      vm.choices = node.choices || [];
      renderChoices();
      render();
      audio.play("pop");
    };
    if (node.speaker === "hati" && node.text) {
      // 선택 노드가 직접 하티 대사를 가지면 라인처럼 타자기로 먼저 노출 → 끝난 뒤 선택지 카드.
      vm.bubbleKind = "hatiBox";
      vm.choices = [];
      renderChoices();
      render();
      typeInto(node.text, "hati", showCards);
    } else {
      // 직전 하티박스 멘트를 유지(인트로/친구 말풍선만 감춤). 즉시 선택지 표시.
      if (vm.bubbleKind !== "hatiBox") vm.bubbleKind = "none";
      showCards();
    }
  }

  function endMission() {
    vm.mode = "end";
    render();
  }

  // ---------- 동영상 (showVideo + finishVideo, MissionPlayer 이식) ----------
  function showVideo(node, done) {
    updateScene(node); // 배경(black) 적용
    vm.mode = "idle"; // 탭 진행 안 됨(건너뛰기 없음)
    vm.bubbleKind = "none";
    vm.choices = [];
    vm.tapHint = "";
    vm.stage = "video";
    vm.videoSrc = node.src || "";
    ms.done = done;
    ms.node = node; // holdAfter 참조용
    renderChoices();
    render();
    buildVideo();
  }
  function buildVideo() {
    clearVideo();
    if (!vm.videoSrc) return;
    const video = document.createElement("video");
    video.id = "missionVideo";
    video.src = vm.videoSrc;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.addEventListener("ended", onVideoEnded);
    // 첫 프레임 준비 전엔 video 를 숨겨 회색 Play 플레이스홀더를 가린다(intro is-ready 패턴).
    // '재생 시작' 버튼(z-index 8)은 위에 그대로 보인다.
    const markReady = () => video.classList.add("is-ready");
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("playing", markReady);
    stage.appendChild(video);
    // 자동재생하지 않고 '재생 시작' 버튼(사용자 제스처)으로만 재생 → 자동재생 정책과 무관, hang 없음.
    const btn = document.createElement("button");
    btn.id = "videoPlayBtn";
    btn.type = "button";
    btn.dataset.sfx = "none";
    const icon = document.createElement("span");
    icon.className = "vpb-icon";
    icon.textContent = "▶";
    btn.append(icon, document.createTextNode(" 재생 시작"));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      video.play().catch(() => {});
      btn.remove();
    });
    stage.appendChild(btn);
  }
  function clearVideo() {
    const v = $("missionVideo");
    if (v) v.remove();
    const b = $("videoPlayBtn");
    if (b) b.remove();
  }
  function onVideoEnded() {
    const hold = (ms.node && ms.node.holdAfter) || 0;
    window.setTimeout(finishVideo, hold);
  }
  function finishVideo() {
    const done = ms.done;
    ms.done = null;
    vm.stage = "none";
    vm.videoSrc = "";
    clearVideo();
    render();
    if (done) done();
  }

  // ---------- 공감 거울 긁어서 드러내기 (reveal / RubReveal.tsx 이식) ----------
  const RR_COLS = 36;
  const RR_ROWS = 20;
  const RR_LENS = 0.3; // 거울 폭 대비 렌즈 반경 비율
  const rr = { canvases: [], grids: [], mirror: null, done: false, root: null };

  function showReveal(node, done) {
    updateScene(node); // 배경(black) 유지
    vm.mode = "idle";
    vm.bubbleKind = "hatiBox"; // 가이드 대사는 일반 하티 박스(#hatiBox)를 재사용
    vm.text = node.text || "";
    vm.choices = [];
    vm.tapHint = "";
    vm.stage = "reveal";
    vm.rPairs = node.pairs || [];
    vm.rMirror = node.mirrorImage || "";
    vm.rThreshold = node.threshold != null ? node.threshold : 0.85;
    ms.done = done;
    renderChoices();
    render();
    buildReveal();
    audio.play("pop");
  }

  function buildReveal() {
    clearReveal();
    rr.canvases = [];
    rr.grids = [];
    rr.mirror = null;
    rr.done = false;

    const root = document.createElement("div");
    root.id = "rubStage";
    root.className = "rr-enter";

    const imagesWrap = document.createElement("div");
    imagesWrap.id = "rubImages";
    vm.rPairs.forEach((p, i) => {
      const slot = document.createElement("div");
      slot.className = "rr-slot";
      const after = document.createElement("img");
      after.className = "rr-after";
      after.src = p.after;
      after.alt = "";
      const cv = document.createElement("canvas");
      cv.className = "rr-canvas";
      slot.append(after, cv);
      imagesWrap.appendChild(slot);
      rr.canvases[i] = cv;
    });
    root.appendChild(imagesWrap);

    const mirror = document.createElement("img");
    mirror.className = "rr-mirror";
    mirror.src = vm.rMirror;
    mirror.alt = "공감 거울";
    mirror.addEventListener("pointerdown", onMirrorDown);
    root.appendChild(mirror);
    rr.mirror = mirror;

    const sparks = document.createElement("div");
    sparks.className = "rr-sparks";
    sparks.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 6; i++) {
      const sp = document.createElement("span");
      sp.className = "rr-spark s" + i;
      sp.textContent = "✦";
      sparks.appendChild(sp);
    }
    root.appendChild(sparks);

    stage.appendChild(root);
    rr.root = root;

    // before 이미지를 각 캔버스에 그린다(슬롯은 CSS aspect-ratio 로 크기 확정 → 로드 전에도 offset 유효).
    vm.rPairs.forEach((p, i) => {
      const cv = rr.canvases[i];
      if (!cv) return;
      const w = cv.offsetWidth;
      const h = cv.offsetHeight;
      cv.width = w;
      cv.height = h;
      rr.grids[i] = { marks: new Uint8Array(RR_COLS * RR_ROWS), done: false };
      const img = new Image();
      img.onload = () => {
        const ctx = cv.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = p.before;
    });
  }

  function clearReveal() {
    if (rr.root) rr.root.remove();
    rr.root = null;
  }

  function rrStageScale() {
    const r = stage.getBoundingClientRect();
    return r ? r.width / 1920 : 1;
  }
  function rrLensRadius() {
    return (rr.mirror ? rr.mirror.offsetWidth || 200 : 200) * RR_LENS;
  }
  function rrMaybeFinish() {
    if (rr.done) return;
    const all =
      rr.grids.length === vm.rPairs.length && rr.grids.every((g) => g && g.done);
    if (!all) return;
    rr.done = true;
    if (rr.mirror) rr.mirror.classList.add("rr-mirror-done");
    window.setTimeout(finishReveal, 700);
  }
  // 한 점에서 각 캔버스를 지우고 커버리지 그리드 갱신
  function rrStampAt(clientX, clientY) {
    const scale = rrStageScale();
    const R = rrLensRadius();
    rr.canvases.forEach((cv, i) => {
      const g = rr.grids[i];
      if (!cv || !g || g.done) return;
      const rect = cv.getBoundingClientRect();
      const x = (clientX - rect.left) / scale;
      const y = (clientY - rect.top) / scale;
      if (x < -R || y < -R || x > cv.width + R || y > cv.height + R) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const grad = ctx.createRadialGradient(x, y, R * 0.55, x, y, R);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const cw = cv.width / RR_COLS;
      const ch = cv.height / RR_ROWS;
      const c0 = Math.max(0, Math.floor((x - R) / cw));
      const c1 = Math.min(RR_COLS - 1, Math.floor((x + R) / cw));
      const r0 = Math.max(0, Math.floor((y - R) / ch));
      const r1 = Math.min(RR_ROWS - 1, Math.floor((y + R) / ch));
      for (let cc = c0; cc <= c1; cc++) {
        for (let rrow = r0; rrow <= r1; rrow++) {
          const ccx = (cc + 0.5) * cw;
          const ccy = (rrow + 0.5) * ch;
          if ((ccx - x) ** 2 + (ccy - y) ** 2 <= R * R) g.marks[rrow * RR_COLS + cc] = 1;
        }
      }
      let covered = 0;
      for (let k = 0; k < g.marks.length; k++) covered += g.marks[k];
      if (covered / g.marks.length >= vm.rThreshold) {
        g.done = true;
        ctx.clearRect(0, 0, cv.width, cv.height);
        rrMaybeFinish();
      }
    });
  }
  function onMirrorDown(e) {
    if (rr.done) return;
    e.preventDefault();
    e.stopPropagation();
    const mirror = rr.mirror;
    const scale = rrStageScale();
    const stageRect = stage.getBoundingClientRect();
    let lastX = e.clientX;
    let lastY = e.clientY;
    const moveMirror = (cx, cy) => {
      if (!mirror) return;
      mirror.style.left = (cx - stageRect.left) / scale - mirror.offsetWidth / 2 + "px";
      mirror.style.top = (cy - stageRect.top) / scale - mirror.offsetHeight / 2 + "px";
      mirror.style.right = "auto";
      mirror.style.bottom = "auto";
    };
    moveMirror(e.clientX, e.clientY);
    rrStampAt(e.clientX, e.clientY);
    const move = (ev) => {
      const dist = Math.hypot(ev.clientX - lastX, ev.clientY - lastY);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let s = 1; s <= steps; s++) {
        rrStampAt(
          lastX + ((ev.clientX - lastX) * s) / steps,
          lastY + ((ev.clientY - lastY) * s) / steps,
        );
      }
      lastX = ev.clientX;
      lastY = ev.clientY;
      moveMirror(ev.clientX, ev.clientY);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  function finishReveal() {
    const done = ms.done;
    ms.done = null;
    vm.stage = "none";
    clearReveal();
    render();
    if (done) done();
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
    return n.type || (n.choices ? "choice" : "line");
  }
  function go(id) {
    if (id == null) return endMission();
    current = id;
    const node = nodes[id];
    setNodeClass(id); // #stage.node-<id> (원본 오버라이드용, 특히 m3_end)
    execCommands(node.onEnter);
    const t = typeOf(node);
    if (t === "choice") return enterChoice(node);
    if (t === "video") return showVideo(node, () => advance(node));
    if (t === "reveal") return showReveal(node, () => advance(node));
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
    if (vm.stage === "video") return; // 동영상 중 탭 무시(건너뛰기 없음)
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
  // 원본 planet1/index.tsx onExit: completePlanet(1) → nav("/home"). 저장을 기다리지 않고 즉시 전환.
  els.nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    els.nextBtn.disabled = true;
    completePlanet(1); // 낙관적 로컬 갱신 + 백그라운드 서버 저장(논블로킹)
    fadeNav(ROOT + "home/index.html"); // 저장을 기다리지 않고 즉시 전환
  });

  // ---------- 렌더 ----------
  function renderChoices() {
    els.choices.innerHTML = "";
    const many = vm.choices.length >= 4;
    vm.choices.forEach((c, idx) => {
      const deco = THEME.choiceIcons[c.text] || { emoji: "💭", bg: "#eef2f7" };
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
      if (deco.img) {
        const im = document.createElement("img");
        im.className = "icon-img";
        im.src = deco.img;
        im.alt = "";
        icon.appendChild(im);
      } else {
        icon.textContent = deco.emoji;
      }
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

  let lastStackKey = "";
  function renderStack() {
    els.imageStack.innerHTML = "";
    vm.stackImages.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.addEventListener("error", () => (img.style.visibility = "hidden"));
      els.imageStack.appendChild(img);
    });
  }

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

  // 진행 스테퍼: 미션3 = step 3 고정.
  const STEP = 3;
  function applyStepper() {
    const missionDone = vm.progress === "done";
    const stepCls = (i) =>
      i < STEP ? "done" : i === STEP ? (missionDone ? "done" : "active") : "locked";
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
    // 배경/밝기 — black 상태에선 #bg 숨기고 #stage.blackbg(#000)
    const bgSrc = THEME.bg.states[vm.bg] || "";
    if (bgSrc) {
      els.bg.src = bgSrc;
      els.bg.style.display = "";
    } else {
      els.bg.removeAttribute("src");
      els.bg.style.display = "none";
    }
    stage.classList.toggle("bright", vm.bright);
    stage.classList.toggle("blackbg", vm.bg === "black");

    // 스테퍼
    applyStepper();

    // 타이틀 배너 / 전신 하티
    els.titleBanner.classList.toggle("show", vm.intro);
    els.hatiFull.classList.toggle("show", vm.fullHati);

    // 하티 인트로 말풍선
    els.hatiBubble.classList.toggle("show", vm.bubbleKind === "hatiBubble");
    els.hatiBubbleText.textContent = vm.bubbleKind === "hatiBubble" ? vm.text : "";

    // 친구(미션3는 항상 숨김) + 말풍선
    const friendBubbleText = vm.bubbleKind === "friendBubble" ? vm.text : "";
    els.friend.src = THEME.friends[vm.friendId].char[vm.friend] || "";
    els.friendWrap.classList.toggle("hide", vm.fullHati || vm.stage !== "none" || vm.hideFriend);
    els.friendBubble.classList.toggle("show", !!friendBubbleText && vm.stage === "none");
    els.friendBubbleText.textContent = friendBubbleText;

    // 선택지 패널 (이미지 있는 선택이면 img-choice: 어두운 카드 우측 하단)
    els.choicePanel.classList.toggle("show", vm.choices.length > 0);
    els.choicePanel.classList.toggle("img-choice", !!vm.choiceImage);
    els.choicePrompt.textContent = vm.choicePrompt;

    // 가운데 큰 이미지(node.image)
    if (vm.choiceImage) {
      els.choiceImage.src = vm.choiceImage;
      els.choiceImage.classList.add("show");
    } else {
      els.choiceImage.classList.remove("show");
    }

    // 가운데 나란한 이미지들(node.images) — 변경 시에만 재빌드
    const stackKey = vm.stackImages.join("|");
    if (stackKey !== lastStackKey) {
      lastStackKey = stackKey;
      renderStack();
    }
    els.imageStack.classList.toggle("show", vm.stackImages.length > 0);

    // 엔딩/공감 카드(변경 시에만 재빌드)
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

    // 완료(우주선) 버튼
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
