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
   블록을 planet=4 로 복사, www/planet2/mission3/script.js 의 최신 복사본을 재복사).
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
   "/assets/..." 경로는 ASSETS 접두어로 치환한다. 전 2노드 verbatim(전수 대조 완료):
   line(1) + minigame(1). choice/branch 없음.
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "p4_m3_intro",
  bannerNode: "p4_m3_intro",
  nodes: [
    {
      id: "p4_m3_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      sideImageLeft: A + "/planet4/heart-connect-space.webp",
      text: "하트 커넥트를 복원하라!다섯 공감 원석을 깨워서 공감 다이아몬드를 완성하자!\n누군가의 마음과 또 다른 마음이 연결될 때 비로소 하트 커넥트는 빛날 수 있어!",
      next: "p4_m3_play",
    },
    {
      id: "p4_m3_play",
      type: "minigame",
      hideFriend: true,
      noAuto: true,
      game: "heartConnect",
      next: null,
    },
  ],
};

/* ==========================================================================
   타자기 blip 순수 로직 (src/lib/typeSound.ts 이식) — 이 미션은 하티만 말한다.
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

/* ==========================================================================
   미니게임: 하트 커넥트 : 마지막 연결 (HeartConnectStage.tsx + heartConnect.data.ts 이식).
   원본: mytemp/그림자 행성 미션3 게임/index.html.
   phase: story(하티 대사 3줄) → quiz(원석 5개 연결, 정답 시퀀스 데이터 기반) → video(복원
   영상, ended 후 버튼) → epilogue(배경 타임라인 전환·타이핑 6줄) → success(최종 화면).
   ⚠ 원본은 엔진 completeBanner/#nextBtn 을 우회한다 — p4_m3 에는 fx_light_return 이 없고,
   success 화면의 "우주선으로 이동" 버튼이 completePlanet(4)+홈 이동을 직접 호출한다
   (missionPlayer 의 showMinigame 에서 그 콜백을 이 모듈의 mount() 두 번째 인자로 넘긴다).
   타이머가 많아(각 phase 마다 별도) phase 전환마다 그 phase 의 cleanup 함수가 전부 정리한다
   (React useEffect cleanup 과 동일 의미 — setPhase 가 이전 phase 의 cleanup 을 먼저 호출).
   ========================================================================== */
const HC_ASSET = A + "/planet4";
const HC_IMG_DIAMOND = HC_ASSET + "/empathy-diamond.webp";
const HC_IMG_VIDEO = HC_ASSET + "/heart-connect-ending.mp4";
const HC_IMG_SUCCESS_BG = HC_ASSET + "/success-bg.webp";
const HC_IMG_TITLE_BANNER = HC_ASSET + "/title-banner.webp";
const HC_IMG_SUCCESS_BANNER = HC_ASSET + "/mission-success-banner.webp";
const HC_HATI_PONDERING = HC_ASSET + "/hati-pondering.webp";
const HC_HATI_PROPOSING = HC_ASSET + "/hati-proposing.webp";
const HC_HATI_DEFAULT = HC_ASSET + "/hati-default.webp";

// 후일담 배경(크로스페이드 순서: earth1→2→3 → school → classroom)
const HC_EPILOGUE_BG = {
  earth1: HC_ASSET + "/earth-1.webp",
  earth2: HC_ASSET + "/earth-2.webp",
  earth3: HC_ASSET + "/earth-3.webp",
  school: HC_ASSET + "/school.webp",
  classroom: HC_ASSET + "/classroom.webp",
};
const HC_EPILOGUE_BG_ORDER = ["earth1", "earth2", "earth3", "school", "classroom"];

// 스토리 인트로 3줄(원본 story[] + storyLine()의 하티 교체 순서).
const HC_STORY_LINES = [
  { hati: HC_HATI_PONDERING, text: "왜일까? 공감 원석도, 공감 에너지도 모두 완성되었는데…" },
  {
    hati: HC_HATI_PROPOSING,
    text: "하트 커넥트를 복원하기 위해서는 다섯 공감 원석이 하나로 연결된 공감 다이아몬드가 필요해.",
  },
  {
    hati: HC_HATI_DEFAULT,
    text: "누군가의 마음과 또 다른 마음이 연결될 때 비로소 다섯 원석이 깨어난단다.\n다섯 공감 원석을 모두 연결해 공감 다이아몬드를 완성하자.",
  },
];

// 5원석 퀴즈(원본 missions[]). 정답 시퀀스: [1,0,2,0,1](전수 대조 완료).
const HC_MISSIONS = [
  {
    gem: "이해의 사파이어",
    image: HC_ASSET + "/gem-sapphire-understanding.webp",
    text: "친구가 발표를 앞두고 손을 떨고 있어. 어떤 마음인지 이해해 볼까?",
    options: ["발표가 싫은가 봐.", "많이 긴장되고 떨리겠구나.", "연습을 안 했나 봐."],
    correct: 1,
  },
  {
    gem: "관찰의 호박석",
    image: HC_ASSET + "/gem-amber-observation.webp",
    text: "쉬는 시간, 한 친구가 혼자 창밖만 보고 있어. 어떻게 말하는 것이 좋을까?",
    options: ["표정이 조금 어두워 보여. 무슨 일 있어?", "왜 혼자 있어?", "같이 놀기 싫은가 봐."],
    correct: 0,
  },
  {
    gem: "경청의 토파즈",
    image: HC_ASSET + "/gem-topaz-listening.webp",
    text: "친구가 속상한 일을 이야기하기 시작했어.",
    options: ["내 이야기도 들어 봐.", "그건 별일 아니야.", "응, 천천히 말해 줘. 내가 듣고 있어."],
    correct: 2,
  },
  {
    gem: "표현의 루비",
    image: HC_ASSET + "/gem-ruby-expression.webp",
    text: "열심히 준비했지만 결과가 좋지 않아 속상하다는 친구에게 어떻게 말할까?",
    options: ["많이 노력했는데 속상했겠다.", "다음엔 잘하면 되지.", "울지 마."],
    correct: 0,
  },
  {
    gem: "용기의 에메랄드",
    image: HC_ASSET + "/gem-emerald-courage.webp",
    text: "전학 온 친구에게 먼저 다가가고 싶지만 망설여져.",
    options: ["괜히 어색해질 거야.", "용기 내서 함께 인사해 보자.", "그냥 기다리면 돼."],
    correct: 1,
  },
];

// 후일담 6줄(원본 postLines[]). 마지막 줄은 '\n' 뒤가 강조 span.
const HC_POST_LINES = [
  "지금 연결된 원석들의 마음은.",
  "사실 우주에 있는 친구들만이 아니야.",
  "교실에서도…",
  "친구를 이해하려고 하는 작은 말 한마디가…",
  "또 하나의 공감 에너지를 만든단다.",
  "게임은 끝났지만, 하트 커넥트는 계속 연결되고 있어.\n교실에서 그 연결을 이어 가는 건 바로 너야.",
];

// 성공 화면 최종 타이핑 2줄(원본 startFinalTyping()).
const HC_FINAL_LINES = [
  "“공감 탐험은 끝난 것이 아니야.”",
  "“이제 지구, 그리고 우리 교실에서 계속 이어질 거야.”",
];

// SVG 연결선 좌표(원본 viewBox="0 0 650 540"의 5개 <line>, g1~g5 순서와 1:1 대응).
const HC_LINK_COORDS = [
  { x1: 325, y1: 70, x2: 325, y2: 270 }, // g1 (상단)
  { x1: 539, y1: 178, x2: 325, y2: 270 }, // g2 (우상단)
  { x1: 494, y1: 464, x2: 325, y2: 270 }, // g3 (우하단)
  { x1: 156, y1: 464, x2: 325, y2: 270 }, // g4 (좌하단)
  { x1: 111, y1: 178, x2: 325, y2: 270 }, // g5 (좌상단)
];

const HC_DEFAULT_FEEDBACK = "공감의 힘으로 원석을 깨워 줘.";
const HC_WRONG_FEEDBACK = "친구의 마음을 한 번 더 바라볼까?";
const HC_CORRECT_FEEDBACK = "원석의 빛이 공감 다이아몬드로 연결됐어!";

const HC_STORY_TYPE_MS = 42; // 원본 storyLine() 타자 속도
const HC_POST_TYPE_MS = 55; // 원본 typePostLine() 타자 속도
const HC_FINAL_TYPE_MS = 58; // 원본 typeFinalLine() 타자 속도
const HC_FINAL_FIRST_DELAY_MS = 650; // 원본 startFinalTyping() 진입 지연
const HC_FINAL_SECOND_DELAY_MS = 380; // 원본 startFinalTyping() 1→2번째 줄 사이 지연

const HeartConnectStage = (function () {
  let container = null;
  let onFinish = null;
  let root = null;
  let frame = null;
  let hudEl = null;
  let phase = "story"; // story | quiz | video | epilogue | success
  let phaseCleanup = null;

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
  function img(src, alt) {
    const i = el("img", { src: src, alt: alt || "" });
    i.draggable = false;
    return i;
  }

  // 위치 HUD(원본 #locationHud) — story·quiz 동안만 우측 상단에 상시 표시.
  function renderHud() {
    if (hudEl) {
      hudEl.remove();
      hudEl = null;
    }
    if (phase !== "story" && phase !== "quiz") return;
    hudEl = el("div", { class: "hc-location-hud" }, [
      el("div", { class: "hc-location-title", text: "우주 중앙 · 하트 커넥트 내부" }),
      el("div", { class: "hc-location-status" }, [
        el("span", { class: "hc-status-dot" }),
        document.createTextNode("현재 상태 · 비활성화"),
      ]),
    ]);
    frame.appendChild(hudEl);
  }

  function setPhase(next) {
    if (phaseCleanup) {
      phaseCleanup();
      phaseCleanup = null;
    }
    phase = next;
    frame.innerHTML = "";
    hudEl = null;
    if (next === "story") phaseCleanup = renderStory();
    else if (next === "quiz") phaseCleanup = renderQuiz();
    else if (next === "video") phaseCleanup = renderVideo();
    else if (next === "epilogue") phaseCleanup = renderEpilogue();
    else if (next === "success") phaseCleanup = renderSuccess();
    renderHud();
  }

  /* ---------- story phase ---------- */
  function renderStory() {
    let index = 0;
    let typing = true;
    let typed = "";
    let typeTimer = 0;

    const hatiImg = img(HC_STORY_LINES[0].hati, "하티");
    hatiImg.className = "hc-story-hati";
    const speaker = el("span", { class: "hc-speaker", text: "하티" });
    const progress = el("span", { class: "hc-story-progress" });
    const dialogue = el("p", { class: "hc-dialogue" });
    const nextHint = el("span", { class: "hc-story-next", text: "▶" });
    const box = el("div", { class: "hc-story-box" }, [speaker, progress, dialogue, nextHint]);
    const wrap = el("div", { class: "hc-story" }, [hatiImg, box]);
    wrap.addEventListener("click", advance);
    frame.appendChild(wrap);

    function updateDialogue() {
      dialogue.classList.toggle("typing", typing);
      const line = HC_STORY_LINES[index];
      if (!typing && index === HC_STORY_LINES.length - 1 && line.text.indexOf("\n") !== -1) {
        const parts = line.text.split("\n");
        dialogue.textContent = "";
        dialogue.appendChild(document.createTextNode(parts[0]));
        dialogue.appendChild(document.createElement("br"));
        dialogue.appendChild(el("span", { class: "hc-story-emphasis", text: parts[1] }));
      } else {
        dialogue.textContent = typed;
      }
    }

    function typeLine() {
      typed = "";
      typing = true;
      updateDialogue();
      const chars = Array.from(HC_STORY_LINES[index].text);
      let i = 0;
      window.clearInterval(typeTimer);
      typeTimer = window.setInterval(() => {
        i += 1;
        typed = chars.slice(0, i).join("");
        updateDialogue();
        if (i >= chars.length) {
          window.clearInterval(typeTimer);
          typeTimer = 0;
          typing = false;
          updateDialogue();
        }
      }, HC_STORY_TYPE_MS);
    }

    function loadIndex() {
      const line = HC_STORY_LINES[index];
      hatiImg.src = line.hati;
      progress.textContent = index + 1 + " / " + HC_STORY_LINES.length;
      // React key={index} 리마운트로 재생되던 hc-hatiEnter 애니메이션을 강제 재생(reflow).
      hatiImg.style.animation = "none";
      void hatiImg.offsetWidth;
      hatiImg.style.animation = "";
      typeLine();
    }

    function advance() {
      if (typing) {
        window.clearInterval(typeTimer);
        typeTimer = 0;
        typed = HC_STORY_LINES[index].text;
        typing = false;
        updateDialogue();
        return;
      }
      if (index + 1 >= HC_STORY_LINES.length) {
        setPhase("quiz");
      } else {
        index += 1;
        loadIndex();
      }
    }

    function onKey(e) {
      if (e.key === "Enter" || e.key === " ") advance();
    }
    document.addEventListener("keydown", onKey);

    loadIndex();

    return function cleanup() {
      window.clearInterval(typeTimer);
      document.removeEventListener("keydown", onKey);
    };
  }

  /* ---------- quiz phase ---------- */
  function renderQuiz() {
    let missionIndex = 0;
    let connected = HC_MISSIONS.map(() => false);
    let locked = false;
    let feedback = HC_DEFAULT_FEEDBACK;
    let wrongIndex = null;
    let coreOn = false;
    let flashing = false;
    let wrongTimer = 0;
    let advanceTimer = 0;
    let finishTimer = 0;

    const flashEl = el("div", { class: "hc-flash" });
    const badge = el("span", { class: "hc-phase-badge", text: "최종 미션 · 공감 원석 연결" });

    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "hc-links");
    svg.setAttribute("viewBox", "0 0 650 540");
    svg.setAttribute("aria-hidden", "true");
    const lineEls = HC_LINK_COORDS.map((c) => {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("class", "hc-link");
      line.setAttribute("x1", c.x1);
      line.setAttribute("y1", c.y1);
      line.setAttribute("x2", c.x2);
      line.setAttribute("y2", c.y2);
      svg.appendChild(line);
      return line;
    });

    const coreImg = img(HC_IMG_DIAMOND, "공감 다이아몬드");
    const coreEl = el("div", { class: "hc-core" }, [coreImg]);

    const gemEls = HC_MISSIONS.map((m, i) => {
      const gi = img(m.image, m.gem);
      const label = el("small", { text: m.gem });
      return el("div", { class: "hc-node hc-gem hc-g" + (i + 1) }, [gi, label]);
    });

    const spaceEl = el("div", { class: "hc-space" }, [badge, svg, coreEl].concat(gemEls));

    const progressCount = el("span");
    const progressLabel = el("div", { class: "hc-progress-label" }, [
      el("span", { text: "원석 연결 진행도" }),
      progressCount,
    ]);
    const progressFill = el("div");
    const progressBar = el("div", { class: "hc-progress" }, [progressFill]);
    const stageTitle = el("p", { class: "hc-stage-title" });
    const iconImg = img("", "");
    const iconWrap = el("div", { class: "hc-icon" }, [iconImg]);
    const promptP = el("p", { class: "hc-prompt" });
    const choicesWrap = el("div", { class: "hc-choices" });
    const feedbackHati = img(HC_HATI_DEFAULT, "하티");
    feedbackHati.className = "hc-feedback-hati";
    const feedbackP = el("p", { class: "hc-feedback" });
    const feedbackWrap = el("div", { class: "hc-hati-feedback" }, [feedbackHati, feedbackP]);

    const asideEl = el("aside", { class: "hc-mission" }, [
      progressLabel,
      progressBar,
      stageTitle,
      iconWrap,
      promptP,
      choicesWrap,
      feedbackWrap,
    ]);

    const layout = el("div", { class: "hc-game-layout" }, [spaceEl, asideEl]);
    const wrap = el("div", { class: "hc-quiz" }, [flashEl, layout]);
    frame.appendChild(wrap);

    function render() {
      const mission = HC_MISSIONS[missionIndex];
      const done = connected.filter(Boolean).length;

      lineEls.forEach((l, i) => l.classList.toggle("on", connected[i]));
      coreEl.classList.toggle("on", coreOn);
      gemEls.forEach((g, i) => g.classList.toggle("connected", connected[i]));

      progressCount.textContent = done + " / " + HC_MISSIONS.length;
      progressFill.style.width = (done / HC_MISSIONS.length) * 100 + "%";
      stageTitle.textContent = "공감 원석 · " + mission.gem;
      iconImg.src = mission.image;
      iconImg.alt = mission.gem;
      promptP.textContent = "“" + mission.text + "”";

      choicesWrap.innerHTML = "";
      mission.options.forEach((option, i) => {
        const btn = el("button", { type: "button", text: option });
        btn.className =
          "hc-choice" +
          (wrongIndex === i ? " wrong" : "") +
          (locked && i === mission.correct ? " correct" : "");
        btn.disabled = locked;
        btn.addEventListener("click", () => choose(i));
        choicesWrap.appendChild(btn);
      });

      feedbackP.textContent = feedback;
      flashEl.classList.toggle("go", flashing);
    }

    function choose(i) {
      if (locked) return;
      const mission = HC_MISSIONS[missionIndex];
      if (i !== mission.correct) {
        // 오답: 해당 버튼만 흔들고 650ms 후 해제, 페널티 없이 같은 문제 유지.
        wrongIndex = i;
        feedback = HC_WRONG_FEEDBACK;
        window.clearTimeout(wrongTimer);
        wrongTimer = window.setTimeout(() => {
          wrongIndex = null;
          wrongTimer = 0;
          render();
        }, 650);
        render();
        return;
      }
      // 정답: 잠그고, 버튼 전체 비활성화 + 원석·연결선 점등 + 진행도 갱신.
      window.clearTimeout(wrongTimer);
      wrongTimer = 0;
      wrongIndex = null;
      locked = true;
      connected[missionIndex] = true;
      feedback = HC_CORRECT_FEEDBACK;
      render();
      advanceTimer = window.setTimeout(() => {
        advanceTimer = 0;
        const nextIndex = missionIndex + 1;
        if (nextIndex < HC_MISSIONS.length) {
          missionIndex = nextIndex;
          locked = false;
          feedback = HC_DEFAULT_FEEDBACK;
          render();
        } else {
          // 원본 choose()→finish(): 코어 점등 + flash 재생을 먼저 보여주고, 700ms 뒤에
          // video phase 로 전환한다.
          coreOn = true;
          flashing = true;
          render();
          finishTimer = window.setTimeout(() => {
            finishTimer = 0;
            setPhase("video");
          }, 700);
        }
      }, 1150);
    }

    render();

    return function cleanup() {
      window.clearTimeout(wrongTimer);
      window.clearTimeout(advanceTimer);
      window.clearTimeout(finishTimer);
    };
  }

  /* ---------- video phase ---------- */
  // 원본 finish()(영상 재생 + muted 폴백) + #endingVideo 의 ended 리스너 이식.
  function renderVideo() {
    const video = document.createElement("video");
    video.className = "hc-ending-video";
    video.preload = "auto";
    video.playsInline = true;
    video.src = HC_IMG_VIDEO;
    const shade = el("div", { class: "hc-video-shade" });
    const btn = el("button", { type: "button", class: "hc-video-complete", text: "복원 완료 확인" });
    const wrap = el("div", { class: "hc-video-root" }, [video, shade, btn]);
    frame.appendChild(wrap);

    // 첫 프레임 준비 전엔 video 를 숨겨 회색 Play 플레이스홀더를 가린다(intro is-ready 패턴).
    function markReady() {
      video.classList.add("is-ready");
    }
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("playing", markReady);

    let cancelled = false;
    // 원본: const attempt = video.play(); if(attempt) attempt.catch(()=>{video.muted=true; video.play()})
    const attempt = video.play();
    if (attempt && attempt.catch) {
      attempt.catch(() => {
        if (cancelled) return;
        video.muted = true;
        video.play().catch(() => {});
      });
    }

    function onEnded() {
      video.pause();
      // 원본: Number.isFinite(video.duration) 이면 마지막 프레임 근처(duration-.04)에 정지.
      if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - 0.04);
      shade.classList.add("ready");
      btn.classList.add("show");
    }
    video.addEventListener("ended", onEnded);
    btn.addEventListener("click", () => setPhase("epilogue"));

    return function cleanup() {
      cancelled = true;
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("playing", markReady);
      video.pause();
    };
  }

  /* ---------- epilogue phase ---------- */
  // 원본 startPostRecovery()/typePostLine()/completePostTyping()/advancePost() 이식.
  function renderEpilogue() {
    let postIndex = 0;
    let typed = "";
    let typing = false; // 진입 900ms 지연 동안은 타이핑 중이 아니다(조기 클릭 시 즉시완성 방지).
    let bgActive = "earth1";
    const bgTimers = [];
    let typeTimer = 0;

    function clearBgTimers() {
      bgTimers.forEach((id) => window.clearTimeout(id));
      bgTimers.length = 0;
    }

    const bgEls = {};
    const bgDivs = HC_EPILOGUE_BG_ORDER.map((key) => {
      const d = el("div", { class: "hc-post-bg" });
      d.style.backgroundImage = "url(" + HC_EPILOGUE_BG[key] + ")";
      bgEls[key] = d;
      return d;
    });
    const blackout = el("div", { class: "hc-post-blackout" });
    const hatiImg = img(HC_HATI_DEFAULT, "기본 하티");
    hatiImg.className = "hc-post-hati";
    const speaker = el("span", { class: "hc-post-speaker", text: "하티" });
    const textP = el("p", { class: "hc-post-text" });
    const nextHint = el("span", { class: "hc-post-next", text: "▶" });
    const dialogue = el("div", { class: "hc-post-dialogue" }, [hatiImg, speaker, textP, nextHint]);

    const wrap = el("div", { class: "hc-epilogue-root" }, bgDivs.concat([blackout, dialogue]));
    wrap.addEventListener("click", advance);
    frame.appendChild(wrap);

    // blackout 리빌: 마운트 시 1회(원본: go 클래스 제거→강제 reflow→go 클래스 추가).
    const raf = requestAnimationFrame(() => blackout.classList.add("go"));

    function setBgActive(key) {
      bgActive = key;
      Object.keys(bgEls).forEach((k) => bgEls[k].classList.toggle("active", k === key));
    }

    function updateText() {
      textP.classList.toggle("typing", typing);
      const text = HC_POST_LINES[postIndex];
      if (!typing && postIndex === HC_POST_LINES.length - 1 && text.indexOf("\n") !== -1) {
        const parts = text.split("\n");
        textP.textContent = "";
        textP.appendChild(document.createTextNode(parts[0]));
        textP.appendChild(document.createElement("br"));
        textP.appendChild(el("span", { class: "hc-post-emphasis", text: parts[1] }));
      } else {
        textP.textContent = typed;
      }
    }

    function runLine() {
      if (postIndex === 0) {
        setBgActive("earth1");
        bgTimers.push(window.setTimeout(() => setBgActive("earth2"), 2800));
        bgTimers.push(window.setTimeout(() => setBgActive("earth3"), 5600));
      } else if (postIndex === 1) {
        setBgActive("school");
        bgTimers.push(window.setTimeout(() => setBgActive("classroom"), 4800));
      } else {
        setBgActive("classroom");
      }

      const text = HC_POST_LINES[postIndex];
      typed = "";
      typing = true;
      updateText();
      const chars = Array.from(text);
      let i = 0;
      window.clearInterval(typeTimer);
      typeTimer = window.setInterval(() => {
        i += 1;
        typed = chars.slice(0, i).join("");
        updateText();
        if (i >= chars.length) {
          window.clearInterval(typeTimer);
          typeTimer = 0;
          typing = false;
          updateText();
        }
      }, HC_POST_TYPE_MS);
    }

    // 원본 startPostRecovery(): 900ms 지연은 첫 줄(index0)에만 걸리고, advancePost() 이후
    // 줄 전환(index1 이상)은 즉시 시작한다.
    function loadPostIndex() {
      clearBgTimers();
      window.clearInterval(typeTimer);
      typeTimer = 0;
      if (postIndex === 0) {
        setBgActive("earth1");
        bgTimers.push(window.setTimeout(runLine, 900));
      } else {
        runLine();
      }
    }

    function advance() {
      if (typing) {
        window.clearInterval(typeTimer);
        typeTimer = 0;
        typed = HC_POST_LINES[postIndex];
        typing = false;
        updateText();
        return;
      }
      // 가드: index0은 earth3, index1은 classroom 배경이 활성화된 뒤에만 진행(원본과 동일).
      if (postIndex === 0 && bgActive !== "earth3") return;
      if (postIndex === 1 && bgActive !== "classroom") return;
      if (postIndex < HC_POST_LINES.length - 1) {
        postIndex += 1;
        loadPostIndex();
      } else {
        setPhase("success");
      }
    }

    function onKey(e) {
      if (e.key === "Enter" || e.key === " ") advance();
    }
    document.addEventListener("keydown", onKey);

    loadPostIndex();

    return function cleanup() {
      cancelAnimationFrame(raf);
      clearBgTimers();
      window.clearInterval(typeTimer);
      document.removeEventListener("keydown", onKey);
    };
  }

  /* ---------- success phase ---------- */
  // 원본 #endingScreen(.success-ending) 이식: startFinalTyping()/typeFinalLine().
  function renderSuccess() {
    const logo = img(HC_IMG_TITLE_BANNER, "하트 가디언즈 우주 공감 탐험대");
    logo.className = "hc-success-logo";
    const bannerImg = img(HC_IMG_SUCCESS_BANNER, "탐험대 성공!");
    bannerImg.className = "hc-success-banner-img";
    const sparkles = el(
      "div",
      { class: "hc-success-sparkles" },
      ["✦", "★", "✦", "★", "✦", "✦", "★", "✦"].map((s) => el("span", { text: s })),
    );
    const burst = el("div", { class: "hc-success-burst" }, [bannerImg, sparkles]);

    const line1 = el("p", { class: "hc-final-typed-line" });
    const line2 = el("p", { class: "hc-final-typed-line hc-final-line-two" });
    const restartBtn = el("button", { type: "button", class: "hc-restart", text: "우주선으로 이동" });
    const message = el("div", { class: "hc-success-message" }, [line1, line2, restartBtn]);

    const wrap = el("div", { class: "hc-success-root" }, [logo, burst, message]);
    wrap.style.backgroundImage = "url(" + HC_IMG_SUCCESS_BG + ")";
    frame.appendChild(wrap);

    let delayTimer = 0;
    let typeTimer = 0;

    function typeLine(text, target, onComplete) {
      const chars = Array.from(text);
      let i = 0;
      target.textContent = "";
      target.classList.add("typing");
      typeTimer = window.setInterval(() => {
        i += 1;
        target.textContent = chars.slice(0, i).join("");
        if (i >= chars.length) {
          window.clearInterval(typeTimer);
          typeTimer = 0;
          target.classList.remove("typing");
          if (onComplete) onComplete();
        }
      }, HC_FINAL_TYPE_MS);
    }

    delayTimer = window.setTimeout(() => {
      delayTimer = 0;
      typeLine(HC_FINAL_LINES[0], line1, () => {
        delayTimer = window.setTimeout(() => {
          delayTimer = 0;
          typeLine(HC_FINAL_LINES[1], line2);
        }, HC_FINAL_SECOND_DELAY_MS);
      });
    }, HC_FINAL_FIRST_DELAY_MS);

    // 원본: 성공 화면 버튼 = onDone(mount() 두 번째 인자, 이 미션에선 completePlanet(4)+홈 이동).
    restartBtn.addEventListener("click", () => {
      if (onFinish) onFinish();
    });

    return function cleanup() {
      window.clearTimeout(delayTimer);
      window.clearInterval(typeTimer);
    };
  }

  function mount(containerEl, finishCb) {
    container = containerEl;
    onFinish = finishCb;
    root = el("div", { class: "hc-root" });
    frame = el("div", { class: "hc-frame" });
    root.appendChild(frame);
    container.appendChild(root);
    setPhase("story");
  }

  function unmount() {
    if (phaseCleanup) {
      phaseCleanup();
      phaseCleanup = null;
    }
    if (root) root.remove();
    root = null;
    frame = null;
    hudEl = null;
  }

  return { mount, unmount };
})();

/* ==========================================================================
   미션 러너(간이) — engine/runner.ts + player/MissionPlayer.tsx 중 이 미션(line 1개 +
   minigame 1개)이 쓰는 부분만. showChoices/showMirrors/showGauge/showReveal/showVideo/
   레이더 HUD(showRadar:false)/cast/friend(전 구간 hideFriend:true)/hatiBox(하티 대사가
   항상 인트로 hatiBubble 뿐)/completeBanner/cardStage/choiceImage/lightOverlay·bright(fx
   없음)/fxLayer(sparkle 미사용) 전부 미포함(YAGNI).
   ========================================================================== */
(function missionPlayer() {
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const els = {
    bg: $("bg"),
    sideImageLeft: $("sideImageLeft"),
    titleBanner: $("titleBanner"),
    hatiFull: $("hatiFull"),
    hatiBubble: $("hatiBubble"),
    hatiBubbleText: $("hatiBubble").querySelector("span"),
    minigameLayer: $("minigameLayer"),
    tapHint: $("tapHint"),
  };

  // 배경은 정적(theme.bg.byNode 가 전 노드에서 동일한 "main" 을 가리킨다) — 1회만 세팅.
  els.bg.src = A + "/planet4/heart-connect-interior-bg.webp";

  // ---------- 상태(vm) — MissionPlayer VM 중 이 미션이 쓰는 필드만 ----------
  const vm = {
    mode: "idle", // idle | typing | await
    text: "",
    lineActive: false, // true = 인트로 라인 표시 중(titleBanner/hatiFull/hatiBubble/sideImageLeft)
    sideImageLeft: "",
    tapHint: "",
    stage: "none", // none | minigame
  };

  const timers = { typer: 0, resolve: null, finish: null };

  // ---------- 타자기 ----------
  function typeInto(txt, onDone) {
    vm.text = "";
    vm.mode = "typing";
    render();
    let i = 0;
    window.clearInterval(timers.typer);
    timers.typer = window.setInterval(() => {
      const at = i;
      vm.text = txt.slice(0, ++i);
      render();
      if (blipAt(txt, at)) audio.play("blipHati"); // 이 미션은 하티만 말한다.
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

  // ---------- view ----------
  function showLine(node) {
    return new Promise((resolve) => {
      timers.resolve = resolve;
      vm.lineActive = true;
      vm.sideImageLeft = node.sideImageLeft || "";
      vm.tapHint = "";
      if (node.id === MISSION.bannerNode) audio.play("title");
      render();
      typeInto(node.text || "", () => {
        vm.mode = "await";
        vm.tapHint = node.next ? "▼ 화면을 탭하면 계속" : "🎉 미션 완료!";
        render();
        // 이 미션의 유일한 라인 노드는 noAuto:true — 자동 진행 없음(탭으로만).
      });
    });
  }

  function showMinigame() {
    vm.stage = "minigame";
    vm.lineActive = false;
    vm.sideImageLeft = ""; // 인트로 장식 이미지(하트커넥트 우주)는 첫화면에서만 — 미니게임엔 남기지 않는다
    vm.mode = "idle";
    vm.tapHint = "";
    render();
    HeartConnectStage.mount(els.minigameLayer, () => {
      // 원본 planet4/index.tsx: heartConnect 미니게임의 onDone = exitToHome 직접 호출
      // (completePlanet(4) + nav home). 엔진 finishMinigame/advance(node) 를 거치지 않는다 —
      // 이 미션이 행성4 마지막 미션이라 완료를 미니게임 자체가 소유한다(p4_m3_play.next 도 null).
      HeartConnectStage.unmount();
      completePlanet(4); // 낙관적 로컬 갱신 + 백그라운드 서버 저장(논블로킹)
      fadeNav(ROOT + "home/index.html"); // 저장을 기다리지 않고 즉시 전환
    });
  }

  // ---------- DialogueRunner(간이) ----------
  const nodes = {};
  MISSION.nodes.forEach((n) => (nodes[n.id] = n));
  let current;

  function go(id) {
    current = id;
    const node = nodes[id];
    if ((node.type || "line") === "minigame") return showMinigame();
    showLine(node).then(() => {
      if (node.next) go(node.next);
    });
  }

  // ---------- 스테이지 탭(라인 진행) ----------
  stage.addEventListener("click", () => {
    if (!vm.lineActive) return; // 미니게임 중 탭은 미니게임 내부가 처리
    if (vm.mode === "typing") {
      if (timers.finish) timers.finish();
    } else if (vm.mode === "await") {
      audio.play("tap");
      vm.tapHint = "";
      vm.mode = "idle";
      render();
      const r = timers.resolve;
      timers.resolve = null;
      if (r) r();
    }
  });

  // 진행 스테퍼: 이 미션은 행성4 마지막 미션 — 완료 즉시 홈으로 이동해 "done" 상태를
  // 보여줄 새가 없다(원본도 fx_light_return 이 없어 vm.progress 가 "done" 이 되지 않는다).
  // step3 만 active, 1·2는 done, conn1 은 항상 채움, conn2 는 done 이 되지 않아 항상 빈 채로.
  function applyStepper() {
    document.getElementById("mission1").classList.add("done");
    document.getElementById("mission2").classList.add("done");
    document.getElementById("mission3").classList.add("active");
    document.getElementById("conn1").classList.add("filled");
  }

  function render() {
    // 타이틀 배너 / 전신 하티 / 인트로 말풍선 — 이 미션의 유일한 라인 노드가 bannerNode
    // 라 셋이 항상 같이 켜진다(하티는 항상 fullHati, hatiBox 는 이 미션에서 쓰지 않는다).
    els.titleBanner.classList.toggle("show", vm.lineActive);
    els.hatiFull.classList.toggle("show", vm.lineActive);
    els.hatiBubble.classList.toggle("show", vm.lineActive);
    els.hatiBubbleText.textContent = vm.lineActive ? vm.text : "";

    // 좌측 장식 이미지(노드 sideImageLeft)
    if (vm.sideImageLeft) {
      els.sideImageLeft.src = vm.sideImageLeft;
      els.sideImageLeft.style.display = "";
    } else {
      els.sideImageLeft.style.display = "none";
    }

    // 탭 힌트
    els.tapHint.classList.toggle("show", !!vm.tapHint);
    els.tapHint.textContent = vm.tapHint;
  }

  // ---------- DEV 점프 (HMR 부재 완화책) ----------
  // ?node=<id>  : 특정 노드부터
  // ?step=N     : nodes 배열의 N번째(0-based)부터
  // ?end        : 마지막 노드(미니게임)부터
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
  applyStepper();
  render();
  console.info(
    "[mission3] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
