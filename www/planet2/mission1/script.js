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
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1200);
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
   API 클라이언트 (src/lib/api.ts 이식 — 인증/요청 부분만. 이 페이지는 진도 저장이
   없어 completePlanet/mergeProgress 는 미포함(Task 8 블록에서 뺀 부분집합)).
   ⚠ 이 API 는 세션 토큰이 없다. 보호된 요청은 매번 자격증명을 x-* 헤더로 싣는다
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

/* ==========================================================================
   미션1 데이터 — mission01.json 인라인 (별도 fetch 금지, 페이지 독립성).
   "/assets/..." 경로는 ASSETS 접두어로 치환한다. 전 5노드 verbatim(전수 대조 완료):
   line(4) + minigame(1). choice/branch 없음(mission01.json 미사용).
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "p2_m1_intro",
  nodes: [
    {
      id: "p2_m1_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "다른 사람의 감정을 잘 이해하려면, 먼저 내 감정을 잘 알아야해. 미션 1을 통해 마음의 차이를 발견해보자",
      next: "p2_m1_preplay",
    },
    {
      id: "p2_m1_preplay",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "가디언즈 감정 설명서를 완성해보자",
      image: A + "/planet2/guardians-emotion-guide-cover.png",
      next: "p2_m1_play",
    },
    { id: "p2_m1_play", type: "minigame", game: "emotionGuide", next: "p2_m1_result" },
    {
      id: "p2_m1_result",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "가디언즈 감정 설명서가 완성되었어. 공감 카드를 확인해보자!",
      image: A + "/planet2/guardians-emotion-guide-complete.png",
      onEnter: [{ cmd: "fx", value: "fx_result_glow" }],
      next: "p2_m1_cards",
    },
    {
      id: "p2_m1_cards",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "사람마다 감정과 공감 방식이 다르다는 걸 이해하는 것이 중요해",
      cards: [
        { image: A + "/planet2/fog-planet-empathy-card-1.png" },
        { image: A + "/planet2/fog-planet-empathy-card-2.png" },
      ],
      next: "p2_m1_end",
    },
    {
      id: "p2_m1_end",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "친구들의 감정이 조금씩 드러나기 시작했어. 다음 미션도 계속해보자",
      completeBanner: "미션 완료!",
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션1 테마 — theme.ts 의 MISSION01_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ showRadar:false(레이더 HUD 없음)·choiceIcons/badgeColors(choice 노드 없음) 미포함. */
const THEME = {
  speakers: { hati: { name: "하티" } },
  bannerNode: "p2_m1_intro",
  initialFriend: "placeholder",
  bg: {
    states: { main: A + "/bg/fog-planet-stage1.png" },
    initial: "main",
    byNode: {},
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
    byNode: {}, // MISSION01_THEME.hatiSprites.byNode 는 원본도 빈 객체 — 전 구간 "thinking" 고정
  },
  friends: {
    // placeholder 친구 — 안개 행성 아트 미확정, 전 노드 hideFriend:true 라 화면엔 안 보인다.
    placeholder: {
      char: { sad: A + "/char/Lumi/lumi_sad.png" },
      initial: "sad",
      byNode: {},
    },
  },
  fx: { fx_result_glow: "resultGlow", fx_light_return: "lightReturn" },
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
   미니게임: 감정 설명서 (EmotionGuideStage.tsx + emotionGuide.{data,logic,content}.ts
   이식). content.json(situations 10·emotions 8·copingActions 8×6) 전수 인라인.
   --------------------------------------------------------------------------
   ⚠ 범위 축소(Task 9a 지시): 원본은 10문항 완료 후 "반 결과 대시보드"
   (ClassResultsBoard — 실시간 학급 집계·리더보드)로 전환하지만, 그 컴포넌트는
   classResults.source/classResults.logic 을 포함한 별도 실시간 폴링 기능이라
   다음 태스크(mission2·3·ClassResultsBoard) 몫으로 남겨둔다.
   이 포트는 "play"(10문항) 단계만 구현: 10문항 완료 시 답을 서버에 제출(POST,
   논블로킹 — 원본도 대시보드 진입을 답변 제출 완료와 무관하게 진행시킨다)하고
   바로 다음 노드(p2_m1_result)로 진행한다.
   ========================================================================== */
const EG_CONTENT = {
  situations: [
    { id: 1, title: "기후 변동 위기", desc: "내일 가디언즈 대원들과 함께 기분 좋은 야외 탐색을 가기로 했는데, 일기예보에서 하루 종일 강한 비바람이 몰아칠 확률이 90%라고 발표할 때" },
    { id: 2, title: "칭찬과 주목", desc: "친구들 모두가 보는 교단에 올라가 3분간 나를 소개하는 큰 발표를 용기 내어 안전하게 마쳤더니, 우리 반 친구들이 모두 활짝 웃으며 우렁찬 박수를 쳐 줄 때" },
    { id: 3, title: "용기의 전파", desc: "쉬는 시간, 친구들이 모여서 무척 신나고 재미있는 모둠 놀이를 하고 있는 모습을 보고, 같이 어울려 놀고 싶어 조심스레 다가가 '나도 같이 놀아도 될까?'라고 물어볼 때" },
    { id: 4, title: "소유물 침범", desc: "내가 정말 귀하게 아껴 쓰던 새 연필을 옆에 앉은 짝꿍이 내 허락도 하나 구하지 않고 마음대로 내 필통에서 꺼내서 쓰고 있는 모습을 우연히 발견할 때" },
    { id: 5, title: "애착물 훼손", desc: "내 귀여운 동생이 내 방에 몰래 들어와 내가 몇 시간 동안 정교하게 성을 쌓아 조립해 둔 소중한 블록 장난감을 실수로 와르르 무너뜨렸을 때" },
    { id: 6, title: "자랑스러운 숨은 선행", desc: "교실 구석에 버려진 쓰레기를 아무도 보지 않을 때 조용히 주워서 쓰레기통에 넣었는데, 선생님께서 전교생 아침 모임 시간에 내 행동을 모두에게 칭찬해 주실 때" },
    { id: 7, title: "대회와 기대", desc: "내일 우리 학급에서 푸짐한 간식 상이 걸린 '슬기로운 감정 퀴즈 대회'를 다 함께 연다는 특급 소식을 아침 조회 시간에 전달받았을 때" },
    { id: 8, title: "아파하는 친구", desc: "학교 계단에서 넘어져 무릎을 세게 부딪친 친구가 상처를 붙잡고 너무 아파 소리도 내지 못한 채 서러운 눈물을 뚝뚝 흘리고 있는 모습을 바로 앞에서 볼 때" },
    { id: 9, title: "스스로 해결한 과제", desc: "도무지 풀리지 않아 며칠 동안 나를 끙끙 앓게 만들었던 엄청 까다롭고 신비한 마법 퍼즐 문제의 정답을 마침내 스스로의 힘으로 끝까지 풀어냈을 때" },
    { id: 10, title: "새로운 음식 도전", desc: "오늘 가장 좋아하는 즐거운 급식 시간, 식판에 내가 단 한 번도 먹어본 적 없고 무척 낯설어 보이는 요리가 수북하게 담겨 나왔는데 선생님께서 맛있는 맛이라며 권유하실 때" },
  ],
  emotions: [
    { id: "joy", name: "기쁨/신남", emoji: "😄" },
    { id: "sad", name: "슬픔/눈물", emoji: "😢" },
    { id: "anger", name: "화남/억울", emoji: "😡" },
    { id: "anxiety", name: "걱정/긴장", emoji: "😰" },
    { id: "anticipation", name: "설렘/기대", emoji: "🤩" },
    { id: "calm", name: "무덤덤/평온", emoji: "😑" },
    { id: "proud", name: "뿌듯/자랑", emoji: "🥳" },
    { id: "shy", name: "쑥스/부끄", emoji: "🫣" },
  ],
  copingActions: {
    joy: {
      actions: [
        { id: 1, text: "제자리에서 기분 좋게 방방 뛰어보기", emoji: "🏃‍♂️" },
        { id: 2, text: "오늘 있었다 기쁜 일 일기장에 예쁘게 적기", emoji: "✍️" },
        { id: 3, text: "콧노래를 부르며 신나게 마음껏 낙서하기", emoji: "🎵" },
        { id: 4, text: "친구들과 즐겁게 하이파이브를 나누며 웃기", emoji: "🤝" },
        { id: 5, text: "선생님이나 부모님께 자랑하며 함께 기뻐해 주기", emoji: "🗣️" },
        { id: 6, text: "친구가 함께 축하 노래나 신나는 박수 쳐주기", emoji: "🧸" },
      ],
      feedbacks: {
        1: "방방 뛰며 기쁜 신체 에너지를 온몸으로 나누었군요. 긍정이 가득 차오릅니다!",
        2: "기록은 행복을 붙잡아 두는 아름다운 마법이에요. 나중에 다시 보면 분명 웃음이 지어질 거예요.",
        3: "예술로 흘려보내는 즐거운 몰입은 창의력을 기르고 긍정 에너지를 발산하는 훌륭한 해소법이에요.",
        4: "친구와 기쁨을 나누면 행복이 두 배로 커진답니다. 최고의 마음 나눔이네요!",
        5: "기쁜 감정을 주변 사람들과 솔직하게 공유하며 기쁨의 시너지를 넓히는 멋진 방법입니다.",
        6: "축하와 따뜻한 박수를 나누는 분위기 속에서 우정과 공감은 더욱 찬란해집니다.",
      },
    },
    sad: {
      actions: [
        { id: 1, text: "참지 않고 내 방에 엎드려 시원하게 눈물 흘리기", emoji: "😭" },
        { id: 2, text: "좋아하는 인형이나 포근한 담요 꼬옥 끌어안기", emoji: "🧸" },
        { id: 3, text: "조용한 구석으로 가서 가만히 눈을 감고 쉬기", emoji: "🛌" },
        { id: 4, text: "친구가 다가와 내 손을 조용히 잡아주기", emoji: "🤝" },
        { id: 5, text: "선생님이나 어른이 따뜻한 눈빛으로 토닥여 주기", emoji: "🫂" },
        { id: 6, text: "친구들이 괜찮아질 때까지 서두르지 않고 묵묵히 지켜봐 주기", emoji: "🤫" },
      ],
      feedbacks: {
        1: "눈물은 슬픔을 비워내는 가장 자연스럽고 깨끗한 마음의 정화 장치입니다.",
        2: "부드럽고 포근한 대상을 안는 것만으로도 마음속 상처가 따뜻하게 보살펴집니다.",
        3: "어둡고 조용한 쉼터 속 충전은 소모된 정서를 가라앉히고 스스로 회복하게 돕습니다.",
        4: "말이 없어도 친구가 잡아주는 손끝의 온기를 통해 안심의 파동이 전달됩니다.",
        5: "신뢰할 수 있는 선생님이나 부모님의 다정은 슬픔을 눈 녹듯 부드럽게 지워줄 것입니다.",
        6: "조용히 마음을 추스를 수 있게 공백을 마련해 주는 성숙한 위로 방식입니다.",
      },
    },
    anger: {
      actions: [
        { id: 1, text: "숫자 5까지 천천히 코로 깊게 상자 호흡하기", emoji: "🧘‍♂️" },
        { id: 2, text: "운동장으로 뛰어나가 바람을 맞으며 힘껏 달리기", emoji: "🏃‍♂️" },
        { id: 3, text: "속상하고 억울한 마음을 종이에 꾹꾹 낙서한 뒤 찢기", emoji: "🗑️" },
        { id: 4, text: "친구가 내 억울한 이야기를 자르지 않고 끝까지 들어주기", emoji: "🗣️" },
        { id: 5, text: "친구들이 내가 차분해질 때까지 화 풀릴 공간 내주기", emoji: "🤫" },
        { id: 6, text: "선생님이 내 속상한 편을 들며 든든히 위로해 주기", emoji: "🧼" },
      ],
      feedbacks: {
        1: "천천히 들이마시는 깊은 숨결은 흥분된 편도체를 진정시키는 가장 현명한 브레이크입니다.",
        2: "신체를 사용해 건강한 방법으로 마음의 끓는 불기운을 안전하게 방출하는 방법입니다.",
        3: "공격성을 타인이 아닌 종이에 분출하여 정화하고 시원하게 처리하는 똑똑한 해소법입니다.",
        4: "마음속 응어리를 아무 제재 없이 누군가 끝까지 들어줄 때, 화는 자연스레 가라앉습니다.",
        5: "감정이 휘몰아칠 때 주변에서 한걸음 물러나 공간을 비워주는 존중과 배려의 공감법입니다.",
        6: "지지받는다는 느낌은 억울함을 해소하고 내면의 정의를 복구해 주는 든든한 힘입니다.",
      },
    },
    anxiety: {
      actions: [
        { id: 1, text: "두 손을 꽉 쥐었다가 손가락을 쫙 펴며 긴장 풀기", emoji: "✊" },
        { id: 2, text: "속으로 '할 수 있어!'라고 스스로에게 3번 외치기", emoji: "🗣️" },
        { id: 3, text: "시원한 물을 한 모금 천천히 삼키며 숨 가다듬기", emoji: "💧" },
        { id: 4, text: "친구가 다정하게 눈을 맞추며 괜찮다고 응원해 주기", emoji: "🤝" },
        { id: 5, text: "선생님이 긴장하지 않도록 가볍게 어깨를 다독여 주기", emoji: "🎒" },
        { id: 6, text: "사람들이 서툴러도 비웃지 않고 열렬한 격려의 박수 쳐주기", emoji: "🎢" },
      ],
      feedbacks: {
        1: "몸의 근육을 수축했다 풀면 극도로 긴장되어 있던 마음에 평온한 릴랙스를 선사합니다.",
        2: "셀프 다독임은 뇌 속에 튼튼한 안전 방어막을 구축해 주는 고마운 정서 수칙입니다.",
        3: "차가운 감각을 부드럽게 들이키면 흥분된 신경이 일시적으로 진정되는 효과가 있습니다.",
        4: "단짝의 따뜻한 시선과 응원은 내 마음의 흔들리는 배를 정박시켜 주는 든든한 닻입니다.",
        5: "선생님의 신뢰 가득한 손길은 두려움을 이겨낼 수 있는 막강한 추진력을 만듭니다.",
        6: "모두가 한마음으로 격려해 주는 분위기 속에서 두려움은 설렘의 에너지로 멋지게 변환됩니다.",
      },
    },
    anticipation: {
      actions: [
        { id: 1, text: "디데이 달력에 하트 표시를 크게 해두고 손꼽기", emoji: "📝" },
        { id: 2, text: "설레는 내일의 아름다운 장면 도화지에 미리 그리기", emoji: "🎨" },
        { id: 3, text: "가져갈 가방이나 소품들을 혼자 미리 가지런히 정돈하기", emoji: "🎒" },
        { id: 4, text: "친구들에게 먼저 다가가 설레는 마음 신나게 이야기하기", emoji: "🗣️" },
        { id: 5, text: "부모님이 미소를 지으며 '정말 신나겠다!' 하고 안아주기", emoji: "🤝" },
        { id: 6, text: "친구들이 내 신난 분위기에 맞춰 재미난 계획 같이 세우기", emoji: "📖" },
      ],
      feedbacks: {
        1: "기당림의 가치를 스스로 가시화하며 기대감을 즐기는 건강한 마음 가꾸기의 진수입니다.",
        2: "상상 속의 미래를 도화지에 투영하며 기쁨의 주파수를 가득 끌어올리는 승화 방식입니다.",
        3: "흥분을 가라앉히며 주체적이고 꼼꼼하게 만반의 채비를 하는 성실한 준비 태도입니다.",
        4: "내가 가진 찬란한 에너지를 적극적으로 친구들에게 물들여 함께 즐기는 사교적 나눔입니다.",
        5: "기쁜 감정을 온전히 지지해주고 맞장구쳐 주는 동반자가 곁에 있어 기쁨이 배가 됩니다.",
        6: "설렘을 구체적인 행동과 협동으로 이어가며 교실의 활력을 다함께 공유하게 됩니다.",
      },
    },
    calm: {
      actions: [
        { id: 1, text: "조용히 눈을 감고 바람 소리와 호흡 소리에 귀 기울이기", emoji: "🧘‍♂️" },
        { id: 2, text: "좋아하는 엉뚱하고 재미있는 상상 소설책 집중해 읽기", emoji: "📖" },
        { id: 3, text: "느긋하게 뒷짐을 쥐고 교실 한 바퀴 천천히 산책하기", emoji: "🚶‍♂️" },
        { id: 4, text: "친구가 억지로 소란스레 부추기지 않고 내 평화를 지켜주기", emoji: "🗣️" },
        { id: 5, text: "주변 대원이 다가와 아무 말 없이 나란히 같이 앉아 쉬기", emoji: "🛌" },
        { id: 6, text: "부모님이 '조용히 충전하는 네 모습이 참 이쁘다' 해 주기", emoji: "✍️" },
      ],
      feedbacks: {
        1: "자신의 내면 감각에 온전히 집중하는 평정심은 성숙한 내면의 무궁무진한 밑거름입니다.",
        2: "평온한 정서 상태를 배경 삼아 영감의 활력을 마음껏 충전하는 현명한 독서 사색입니다.",
        3: "조금 느린 보행은 뇌파를 가장 편안하고 지혜로운 수치로 안정시켜 줍니다.",
        4: "내 차분한 주파수를 그대로 안정적이라 수용하고 존중해 주는 친구의 속 깊은 우정입니다.",
        5: "침묵 속에서도 전혀 어색하지 않고 곁을 지켜주는 진정한 마음 공감의 순간입니다.",
        6: "평화롭게 조용히 안축하는 모습도 크나큰 정서의 지능임을 따스히 인정받는 기적입니다.",
      },
    },
    proud: {
      actions: [
        { id: 1, text: "거울을 마주 보고 '오늘 진짜 멋졌어!' 하며 머리 쓰다듬기", emoji: "🗣️" },
        { id: 2, text: "내가 거둔 달콤한 성취 이야기를 일기장에 기분 좋게 기록하기", emoji: "🤝" },
        { id: 3, text: "나 자신에게 고마운 마음을 담아 주변 사물 깔끔하게 정돈하기", emoji: "🧹" },
        { id: 4, text: "친구가 진심으로 다가와 멋진 엄지척을 보내며 칭찬해 주기", emoji: "🎁" },
        { id: 5, text: "선생님이 학급 친구들 모두 앞에서 내 좋은 본보기 알려주기", emoji: "🧑‍🏫" },
        { id: 6, text: "부모님이 활짝 웃으며 내 도전을 안아주고 최고라 말해 주기", emoji: "🎨" },
      ],
      feedbacks: {
        1: "스스로를 신뢰하고 자기 효능감을 불어넣어 주는 자아 존중의 가장 빛나는 순간입니다.",
        2: "뿌듯한 정서를 기록으로 고정해 두면 힘든 시기에 꺼내볼 나만의 건강한 비법 백서가 됩니다.",
        3: "성취를 통해 축적된 에너지를 생산적인 환경 개선(청소)으로 승화하는 행동은 자립심과 협동심을 동시에 키웁니다.",
        4: "타인의 순수한 엄지척은 내가 나아가는 마음 탐험 노선을 더 활기차게 밀어 줍니다.",
        5: "선생님의 대외적인 지지는 긍정적인 사회적 효능감을 무럭무럭 기르게 돕는 멋진 선물입니다.",
        6: "가장 소중한 부모님의 다정 가득한 격려는 마음을 가장 기분좋게 채워줍니다.",
      },
    },
    shy: {
      actions: [
        { id: 1, text: "두 손으로 뜨거워진 양 볼을 지긋이 누르며 가만히 숨쉬기", emoji: "🫣" },
        { id: 2, text: "부끄러움을 분산하기 위해 잠시 저 멀리 창밖의 풍경 보기", emoji: "🧘" },
        { id: 3, text: "내 주머니 속에 들어있는 안심 스퀴시 인형 꼬물거리기", emoji: "🧸" },
        { id: 4, text: "친구가 큰 소리로 웃지 않고 내 속도에 맞춰 소곤소곤 말하기", emoji: "🤝" },
        { id: 5, text: "친구들이 부끄러워하는 내 모습을 못 본 척 가볍게 지나치기", emoji: "🤫" },
        { id: 6, text: "선생님이 조용히 다가와 손을 살짝 쥐며 미소로 비밀 응원하기", emoji: "🗣️" },
      ],
      feedbacks: {
        1: "쑥스러운 신체의 감각을 손바닥 온기로 천천히 쓰다듬는 부드러운 자가 해소 행동입니다.",
        2: "시각적 자극을 일시적으로 분산하여 어색한 감정 과부하로부터 스스로를 지키는 영리한 지혜입니다.",
        3: "주머니 속 비밀 안심 촉감을 문지르며 기분의 긴장을 조율하는 안전한 수칙입니다.",
        4: "내가 부끄럽지 않게 목소리를 나지막하게 깔고 세심하게 우정을 건네는 고마운 공감입니다.",
        5: "과도한 관심이 부끄러운 대원에게 가장 어울리는 '모르는 척'이라는 천사 같은 배려형 위로법입니다.",
        6: "대외적인 긴장을 한 방에 걷어내 주는 선생님과 대원만의 따사로운 귓속말 연대입니다.",
      },
    },
  },
};
const EG_SITUATIONS = EG_CONTENT.situations;
const EG_EMOTIONS = EG_CONTENT.emotions;
const EG_COPING = EG_CONTENT.copingActions;
const EG_TOTAL_STEPS = 10;

/* emotionGuide.logic.ts 이식 — 순수 상태 전이 함수 */
function egInitialState() {
  return { step: 1, emotion: null, action: null, results: [] };
}
function egPickEmotion(state, emotionId) {
  return Object.assign({}, state, { emotion: emotionId, action: null });
}
function egPickAction(state, actionId) {
  return Object.assign({}, state, { action: actionId });
}
function egCanAdvance(state) {
  return state.emotion !== null && state.action !== null;
}
function egAdvance(state) {
  const results = state.results.concat([
    { situationId: state.step, emotionId: state.emotion, actionId: state.action },
  ]);
  if (state.step >= EG_TOTAL_STEPS) return { kind: "done", results: results };
  return { kind: "next", state: { step: state.step + 1, emotion: null, action: null, results: results } };
}

/* emotionGuide.api.ts 이식 — POST /api/planet2/emotion-guide/answers */
function submitEmotionGuideAnswers(answers) {
  const creds = credentialStore.get();
  if (!creds) return Promise.reject(apiError(401, "No stored credentials", null));
  return apiRequest("/api/planet2/emotion-guide/answers", {
    method: "POST",
    headers: authHeaders(creds),
    body: { answers: answers },
  });
}

/* emotionGuide.api.ts 이식 — GET /api/planet2/emotion-guide/class-answers.
   오늘(KST) 우리 반의 모든 답변을 flat 배열로 조회(ClassResultsBoard 10초 폴링에서 호출). */
function fetchClassAnswers() {
  const creds = credentialStore.get();
  if (!creds) return Promise.reject(apiError(401, "No stored credentials", null));
  return apiRequest("/api/planet2/emotion-guide/class-answers", {
    headers: authHeaders(creds),
  }).then((res) => res.votes);
}

/* ==========================================================================
   반 결과 대시보드 (ClassResultsBoard.tsx + classResults.{logic,source}.ts 이식).
   emotionGuide.data.ts 의 EMOTIONS/COPING_ACTIONS 는 위 EG_EMOTIONS/EG_COPING(이
   미션1 데이터 인라인 블록에서 이미 선언됨)을 그대로 재사용한다 — 별도 정의 없음.
   EmotionGuideStage 가 10문항 완료 후 자신의 패널(eg-panel) 안에 이 모듈을 mount 한다.
   ========================================================================== */
const ClassResultsBoard = (function () {
  const POLL_MS = 10000; // 서버 "오늘 우리 반" 조회 폴링 간격(원본과 동일 10초)
  const RANK_BADGE = ["👑", "🥈", "🥉"];

  let mountEl = null;
  let onComplete = null;
  let snap = { votes: [] };
  let situationId = 1;
  let emotionId = EG_EMOTIONS[0].id;
  let pollTimer = 0;
  let doneBusy = false; // "다음으로" 재진입 가드 — 폴링 중에도 중복 클릭으로 onComplete 이중 발사 방지

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

  function emotionName(id) {
    const e = EG_EMOTIONS.find((x) => x.id === id);
    return e ? e.name : id;
  }
  function emotionEmoji(id) {
    const e = EG_EMOTIONS.find((x) => x.id === id);
    return e ? e.emoji : "";
  }

  // classResults.logic.ts 이식 — 순수 집계 함수(ClassVote[] 만 받는다).
  function votesFor(votes, sid) {
    return votes.filter((v) => v.situationId === sid);
  }
  function emotionDistribution(votes, sid) {
    const sit = votesFor(votes, sid);
    const total = sit.length || 1;
    return EG_EMOTIONS.map((e) => {
      const count = sit.filter((v) => v.emotionId === e.id).length;
      return { emotionId: e.id, count: count, pct: Math.round((count / total) * 100) };
    });
  }
  function leaderboard(votes, sid) {
    const sorted = emotionDistribution(votes, sid).slice().sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 3);
    while (top.length < 3) top.push({ emotionId: "", count: 0, pct: 0 });
    return top;
  }
  function actionBreakdown(votes, sid, eid) {
    const matching = votesFor(votes, sid).filter((v) => v.emotionId === eid);
    const actions = (EG_COPING[eid] && EG_COPING[eid].actions) || [];
    return actions.map((a) => {
      const picked = matching.filter((v) => v.actionId === a.id);
      return { actionId: a.id, count: picked.length, voterNames: picked.map((v) => v.studentName) };
    });
  }

  function render() {
    if (!mountEl) return;
    mountEl.innerHTML = "";

    const dist = emotionDistribution(snap.votes, situationId);
    const maxCount = Math.max(1, ...dist.map((d) => d.count));
    const respondedCount = new Set(snap.votes.map((v) => v.studentId)).size;
    const board = leaderboard(snap.votes, situationId);
    const actions = actionBreakdown(snap.votes, situationId, emotionId);

    const doneBtn = el("button", { class: "crb-done", text: "다음으로 ➡️" });
    doneBtn.type = "button";
    doneBtn.addEventListener("click", () => {
      // 재진입 가드 — 폴링(10초)이 계속 돌아 보드가 즉시 unmount 되지 않으므로
      // 클릭 연타로 onComplete(→ 다음 노드 진행)가 이중 발사되지 않게 막는다.
      if (doneBusy) return;
      doneBusy = true;
      doneBtn.disabled = true;
      if (onComplete) onComplete();
    });

    const top = el("div", { class: "crb-top" }, [
      el("div", { class: "crb-hati" }, [
        el("span", { class: "crb-hati-name", text: "🛰️ 하티" }),
        el("span", {
          class: "crb-hati-line",
          text: "우리 반 친구들은 어떤 대답을 했는지 알아보자. 결과가 실시간으로 채워지고 있어!",
        }),
      ]),
      el("div", { class: "crb-count" }, [
        el("span", { class: "crb-count-label", text: "응답한 친구" }),
        el("span", { class: "crb-count-num", text: respondedCount + "명" }),
      ]),
      doneBtn,
    ]);

    // 왼쪽: 상황 선택 + 감정 분포 막대 + 순위표
    const select = document.createElement("select");
    select.className = "crb-select";
    EG_SITUATIONS.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = s.id + ". " + s.title;
      if (s.id === situationId) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      situationId = Number(select.value);
      render();
    });
    const selectRow = el("div", { class: "crb-select-row" }, [
      el("span", { class: "crb-select-label", text: "🔍 감정 상황" }),
    ]);
    selectRow.appendChild(select);

    const chart = el("div", { class: "crb-chart" });
    dist.forEach((d) => {
      const row = el("button", { class: "crb-bar-row" + (d.emotionId === emotionId ? " sel" : "") }, [
        el("span", { class: "crb-bar-name", text: emotionEmoji(d.emotionId) + " " + emotionName(d.emotionId) }),
        el("span", { class: "crb-bar-track" }, [
          el("span", { class: "crb-bar-fill", style: "width:" + (d.count / maxCount) * 100 + "%" }),
          el("span", { class: "crb-bar-num", text: d.count + "명 (" + d.pct + "%)" }),
        ]),
      ]);
      row.type = "button";
      row.addEventListener("click", () => {
        emotionId = d.emotionId;
        render();
      });
      chart.appendChild(row);
    });

    const leaderboardEl = el("div", { class: "crb-leaderboard" });
    board.forEach((item, i) => {
      if (item.count > 0) {
        leaderboardEl.appendChild(
          el("div", { class: "crb-rank" }, [
            el("span", { class: "crb-rank-badge", text: RANK_BADGE[i] }),
            el("span", {
              class: "crb-rank-name",
              text: emotionEmoji(item.emotionId) + " " + emotionName(item.emotionId).split("/")[0],
            }),
            el("span", { class: "crb-rank-count", text: item.count + "명 (" + item.pct + "%)" }),
          ]),
        );
      } else {
        leaderboardEl.appendChild(
          el("div", { class: "crb-rank empty" }, [el("span", { class: "crb-rank-wait", text: "기록 대기" })]),
        );
      }
    });

    const leftCol = el("div", { class: "crb-col crb-left" }, [
      selectRow,
      el("div", { class: "crb-section-label", text: "📊 감정 분포 (감정을 누르면 대처가 보여요)" }),
      chart,
      el("div", { class: "crb-section-label", text: "🏆 감정 분포 순위 (1~3위)" }),
      leaderboardEl,
    ]);

    // 오른쪽: 선택 감정의 해소 & 공감 분석
    const actionsEl = el("div", { class: "crb-actions" });
    actions.forEach((a) => {
      const meta = (EG_COPING[emotionId] && EG_COPING[emotionId].actions.find((x) => x.id === a.actionId)) || {};
      const isSelf = a.actionId <= 3;
      actionsEl.appendChild(
        el("div", { class: "crb-action" }, [
          el("div", { class: "crb-action-head" }, [
            el("span", { class: "crb-action-emoji", text: meta.emoji || "" }),
            el("span", { class: "crb-action-text", text: meta.text || "" }),
            el("span", {
              class: "crb-action-badge " + (isSelf ? "self" : "wish"),
              text: isSelf ? "스스로 해소" : "바라는 공감",
            }),
            el("span", { class: "crb-action-count", text: a.count + "명" }),
          ]),
          el("div", { class: "crb-action-voters" }, [
            el("span", { class: "crb-voters-label", text: "📝 선택 대원:" }),
            document.createTextNode(" " + (a.voterNames.length ? a.voterNames.join(", ") : "아직 없어요")),
          ]),
        ]),
      );
    });

    const rightCol = el("div", { class: "crb-col crb-right" }, [
      el("div", { class: "crb-section-label" }, [
        document.createTextNode("🛡️ 해소 & 공감 분석 · "),
        el("span", { class: "crb-sel-emotion", text: emotionEmoji(emotionId) + " " + emotionName(emotionId) }),
      ]),
      actionsEl,
    ]);

    const body = el("div", { class: "crb-body" }, [leftCol, rightCol]);

    mountEl.appendChild(el("div", { class: "crb" }, [top, body]));
  }

  function tick() {
    fetchClassAnswers()
      .then((votes) => {
        snap = { votes: votes };
        render();
      })
      .catch((e) => {
        console.error("[classResults] 조회 실패", e);
      });
  }

  // 서버의 10초 폴링 모델과 동일: mount 즉시 + POLL_MS 마다 fetch.
  function mount(containerEl, opts) {
    mountEl = containerEl;
    onComplete = (opts && opts.onComplete) || null;
    snap = { votes: [] };
    situationId = 1;
    emotionId = EG_EMOTIONS[0].id;
    doneBusy = false;
    render();
    tick();
    pollTimer = window.setInterval(tick, POLL_MS);
  }

  function unmount() {
    window.clearInterval(pollTimer);
    pollTimer = 0;
    mountEl = null;
    onComplete = null;
  }

  return { mount: mount, unmount: unmount };
})();

/* EmotionGuideStage.tsx 이식 — 10문항 플레이 → 반 결과 대시보드(ClassResultsBoard). */
const EmotionGuideStage = (function () {
  let state = egInitialState();
  let container = null;
  let root = null;
  let onFinish = null;
  // 게임 단계: 10문항 플레이 → 반 결과 대시보드(phase "board" 는 eg-panel 안에 CRB 를 mount).
  let phase = "play"; // play | board
  let finalResults = [];
  // 재진입 가드 — CRB 는 즉시 unmount 되지 않으므로(10초 폴링 유지) "done" 전이가
  // 두 번 실행돼 서버 제출(submitEmotionGuideAnswers)이 이중 발사되지 않도록 막는다.
  let submitted = false;

  function situation() {
    return EG_SITUATIONS[state.step - 1];
  }
  function coping() {
    return state.emotion ? EG_COPING[state.emotion] : null;
  }
  function feedback() {
    const c = coping();
    return c && state.action != null ? c.feedbacks[state.action] : "";
  }

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === "class") n.className = props[k];
        else if (k === "text") n.textContent = props[k];
        else if (k === "html") n.innerHTML = props[k];
        else n.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach((c) => {
      if (c) n.appendChild(c);
    });
    return n;
  }

  function render() {
    if (!root) return;
    root.innerHTML = "";

    if (phase === "board") {
      // 반 결과 대시보드 — 패널의 네 귀퉁이 경첩/책등은 유지하고 본문만 CRB 에 위임.
      const boardMount = el("div", { class: "eg-board-mount" });
      const panel = el("div", { class: "eg-panel" }, [
        el("span", { class: "eg-hinge tl" }),
        el("span", { class: "eg-hinge tr" }),
        el("span", { class: "eg-hinge bl" }),
        el("span", { class: "eg-hinge br" }),
        el("span", { class: "eg-spine" }),
        boardMount,
      ]);
      root.appendChild(panel);
      ClassResultsBoard.mount(boardMount, {
        onComplete: () => {
          if (onFinish) onFinish(finalResults);
        },
      });
      return;
    }

    const sit = situation();
    const cop = coping();
    const fb = feedback();
    const completed = state.step - 1;
    const energyPct = (completed / EG_TOTAL_STEPS) * 100;

    // 상단 HUD
    const hud = el("div", { class: "eg-hud" }, [
      el("div", { class: "eg-ribbon" }, [
        el("span", { class: "eg-ribbon-label", text: "감정 알기" }),
        el("span", { class: "eg-ribbon-count", text: state.step + " / " + EG_TOTAL_STEPS }),
      ]),
      el("div", { class: "eg-energy" }, [
        el("div", { class: "eg-energy-head" }, [
          el("span", { class: "eg-energy-label", text: "공감 에너지" }),
          el("span", { class: "eg-energy-text", text: energyPct + "%" }),
        ]),
        el("div", { class: "eg-energy-track" }, [
          el("div", { class: "eg-energy-fill", style: "width:" + energyPct + "%" }),
        ]),
      ]),
    ]);

    // 왼쪽 페이지: 상황 일지 + 감정 8지선다
    const emoGrid = el("div", { class: "eg-grid" });
    EG_EMOTIONS.forEach((e) => {
      const sel = state.emotion === e.id;
      const btn = el(
        "button",
        { class: "eg-emo eg-emo--" + e.id + (sel ? " sel" : "") },
        [el("span", { class: "em", text: e.emoji }), el("span", { text: e.name })],
      );
      btn.addEventListener("click", () => {
        state = egPickEmotion(state, e.id);
        render();
      });
      emoGrid.appendChild(btn);
    });

    const leftPage = el("div", { class: "eg-page eg-page--left" }, [
      el("div", { class: "eg-page-index" }, [
        el("span", { class: "eg-tag", text: "감정 상황 " + state.step }),
        el("span", { class: "eg-pagenum", text: "P. " + (state.step * 2 - 1) }),
      ]),
      el("div", { class: "eg-journal" }, [
        el("span", { class: "eg-journal-deco", text: "🌫️" }),
        el("div", { class: "eg-journal-head", text: "🧭 가디언즈 감정 상황 일지" }),
        el("div", { class: "eg-title", text: sit.title }),
        el("div", { class: "eg-desc", text: sit.desc }),
      ]),
      el("div", { class: "eg-emo-section" }, [
        el("div", { class: "eg-section-label", text: "◆ 이 상황에서 느끼는 내 기분" }),
        emoGrid,
      ]),
    ]);

    // 오른쪽 페이지: 잠금 또는 해소&공감 6지선다
    let rightBody;
    if (!cop) {
      rightBody = el("div", { class: "eg-locked" }, [
        el("div", { class: "eg-lock-icon", text: "🔒" }),
        el("div", { class: "eg-lock-title", text: "해소 & 공감 행동소 대기 중" }),
        el("div", {
          class: "eg-lock-sub",
          text: "왼쪽 페이지에서 먼저 느껴지는 감정을 하나 선택하면 잠금이 해제됩니다.",
        }),
      ]);
    } else {
      const kids = [];
      if (fb) {
        kids.push(
          el("div", { class: "eg-feedback" }, [
            el("span", { class: "eg-feedback-icon", text: "💡" }),
            el("div", {}, [
              el("div", { class: "eg-feedback-title", text: "마음 연구 선배의 공감 지혜" }),
              el("div", { class: "eg-feedback-desc", text: fb }),
            ]),
          ]),
        );
      }
      kids.push(el("div", { class: "eg-section-label", text: "◆ 나에게 가장 잘 맞을 것 같은 해결책" }));
      const actions = el("div", { class: "eg-actions" });
      cop.actions.forEach((a) => {
        const sel = state.action === a.id;
        const isSelf = a.id <= 3;
        const btn = el("button", { class: "eg-act" + (sel ? " sel" : "") }, [
          el("span", { class: "eg-act-emoji", text: a.emoji }),
          el("span", { class: "eg-act-text", text: a.text }),
          el("span", { class: "eg-badge " + (isSelf ? "self" : "wish"), text: isSelf ? "스스로 해소" : "바라는 공감" }),
        ]);
        btn.addEventListener("click", () => {
          state = egPickAction(state, a.id);
          render();
        });
        actions.appendChild(btn);
      });
      kids.push(actions);
      rightBody = el("div", { class: "eg-right-scroll" }, kids);
    }

    const rightPage = el("div", { class: "eg-page eg-page--right" }, [
      el("div", { class: "eg-page-index" }, [
        el("span", { class: "eg-tag eg-tag--right", text: "🛡️ 해소 & 공감" }),
        el("span", { class: "eg-pagenum", text: "P. " + state.step * 2 }),
      ]),
      rightBody,
    ]);

    const body = el("div", { class: "eg-body" }, [leftPage, rightPage]);

    const canAdvance = egCanAdvance(state);
    const nextBtn = el("button", {
      class: "eg-next",
      text: state.step >= EG_TOTAL_STEPS ? "설명서 완성하기 ✨" : "행동 기록 완료 · 다음 상황으로 ➡️",
    });
    if (!canAdvance) nextBtn.disabled = true;
    nextBtn.addEventListener("click", onNext);

    const panel = el("div", { class: "eg-panel" }, [
      el("span", { class: "eg-hinge tl" }),
      el("span", { class: "eg-hinge tr" }),
      el("span", { class: "eg-hinge bl" }),
      el("span", { class: "eg-hinge br" }),
      el("span", { class: "eg-spine" }),
      hud,
      body,
      nextBtn,
    ]);
    root.appendChild(panel);
  }

  function onNext() {
    if (!egCanAdvance(state)) return;
    const r = egAdvance(state);
    if (r.kind === "done") {
      if (submitted) return; // 재진입 가드 — 이미 제출·전환된 done 을 다시 처리하지 않는다.
      submitted = true;
      finalResults = r.results;
      // 10문항 완료 → 반 결과 대시보드로 전환(아직 미션 진행 아님).
      // 서버에 내 답 제출(upsert). 실패해도 대시보드는 진행 — 다음 폴링에 내 표가 합류한다.
      submitEmotionGuideAnswers(r.results).catch((e) => {
        console.error("[emotionGuide] 답변 제출 실패", e);
      });
      phase = "board";
      render();
    } else {
      state = r.state;
      render();
    }
  }

  function mount(containerEl, finishCb) {
    state = egInitialState();
    phase = "play";
    finalResults = [];
    submitted = false;
    container = containerEl;
    onFinish = finishCb;
    root = el("div", { class: "eg-overlay" });
    root.addEventListener("click", (e) => e.stopPropagation());
    container.appendChild(root);
    render();
  }

  function unmount() {
    ClassResultsBoard.unmount(); // 보드가 떠 있었다면 폴링 인터벌 정리(방어적 — 보통은 이미 unmount됨)
    if (root) root.remove();
    root = null;
    container = null;
  }

  return { mount: mount, unmount: unmount };
})();

/* ==========================================================================
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션1이 쓰는 부분만).
   지원 노드 타입: line / minigame. (mission01.json 은 choice/branch/mirrors/gauge/
   reveal/video 를 쓰지 않는다 — 미포함.)
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
    choiceGlow: $("choiceGlow"),
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
    bookGlow: false, // 완성 이미지 뒤 금빛 후광(fx resultGlow)
    cards: [],
    completeBanner: "",
    bright: false,
    progress: "start", // start | done
    tapHint: "",
    showNext: false,
    stage: "none", // none | minigame
  };
  // 미니게임 완료 콜백
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
    EmotionGuideStage.mount(els.minigameLayer, () => {
      EmotionGuideStage.unmount();
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
    setNodeClass(id); // #stage.node-<id> (planet2/Mission.css 오버라이드용 — preplay/result)
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
    fadeNav("../mission2/"); // 다음 미션(다음 태스크에서 구현 — 현재 404 예상)
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

    // 완성 이미지 후광(fx resultGlow) — choiceImage 있을 때만
    els.choiceGlow.classList.toggle("show", vm.bookGlow && !!vm.choiceImage);

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
  window.__m1 = { vm, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission1] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
