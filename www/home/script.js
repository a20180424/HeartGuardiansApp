"use strict";

/* ==========================================================================
   경로 상수 (페이지마다 이 값만 바꾼다)
   --------------------------------------------------------------------------
   ROOT = 이 페이지에서 www 루트까지의 상대 접두어.
     · 루트(intro, www/index.html)          → ""
     · 한 단계(auth/, home/)                 → "../"
     · 두 단계(planetN/prologue/, missionM/) → "../../"
   히든 메뉴 점프·씬 이동이 모두 이 상수를 기준으로 조립된다.
   ========================================================================== */
const ROOT = "../";

/* ==========================================================================
   R2 세션 가드 — hg_session 없으면 로그인으로. (intro·auth 이외 전 페이지)
   ========================================================================== */
if (!localStorage.getItem("hg_session")) {
  location.href = ROOT + "auth/index.html";
}

/* ==========================================================================
   R1 공통 뼈대 — FixedStage 인라인 (페이지마다 복사)
   ========================================================================== */
function fitStage() {
  const stage = document.getElementById("stage");
  // clientWidth 사용: DevTools DPR 에뮬레이션·OS 배율 환경에서 innerWidth가 CSS 뷰포트와 어긋나는
  // 간헐 버그(로드 직후 1.25~1.5배 보고) 회피. 실기기에선 두 값이 같다.
  const scale = Math.min(
    document.documentElement.clientWidth / 1280,
    document.documentElement.clientHeight / 800,
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
const FADE_MS = 160; // 원본과 동일
const sceneFade = document.createElement("div");
sceneFade.id = "scene-fade";
sceneFade.setAttribute("aria-hidden", "true");
document.body.appendChild(sceneFade);

let fadeBusy = false;
function fadeNav(href) {
  if (fadeBusy) return; // 전환 중 중복 이동 방지
  fadeBusy = true;
  sceneFade.classList.add("is-on"); // 0 → 1 (fade to black)
  window.setTimeout(() => {
    window.location.href = href;
  }, FADE_MS);
}

/* ==========================================================================
   공통 블록 3-① 효과음 — audio (src/lib/audio.ts 이식) — intro 검증본 복사
   ========================================================================== */
const audio = (function createAudio() {
  const VOL = 0.5; // 음소거 아닐 때 master 볼륨
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

  /* 한 음: 빠른 attack + 지수 release */
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

  return {
    unlock,
    play,
    setMuted,
    toggleMute,
    onMuteChange,
    isMuted: () => muted,
  };
})();

/* uiSfx.ts 이식 — data-sfx 속성 → 효과음 이름 */
function sfxNameFor(dataSfx) {
  if (dataSfx === "none") return null;
  if (dataSfx === "pop") return "pop";
  return "tap"; // 오타가 무음으로 새지 않게 기본은 tap
}

/* App.tsx 의 전역 리스너 이식: 첫 제스처에서 unlock + 버튼 data-sfx 효과음. */
window.addEventListener(
  "pointerdown",
  (e) => {
    audio.unlock(); // play() 보다 먼저 — 첫 탭부터 소리가 나야 한다
    const target = e.target;
    const btn = target && target.closest ? target.closest("button") : null;
    if (!btn) return;
    if (btn.disabled) return;
    const name = sfxNameFor(btn.dataset.sfx);
    if (name) audio.play(name);
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
   공통 블록 3-② 음소거 버튼 (MuteButton.tsx + mute-button.css 이식) — intro 검증본 복사
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
   (HiddenMenuOverlay.tsx + useCornerLongPress.ts + hiddenMenu.ts 이식) — intro 검증본 복사
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

  let phase = "closed"; // closed | pin | grid
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
      grid.appendChild(el("span", {})); // 좌상단 빈 코너
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

  /* --- 진입 제스처(useCornerLongPress.ts 이식) --- */
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

  /* 개발용 단축키 Ctrl+Alt+J */
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && e.code === "KeyJ") {
      e.preventDefault();
      open();
    }
  });
})();

/* ==========================================================================
   외부 링크 열기 (src/lib/openExternal.ts 이식)
   --------------------------------------------------------------------------
   APK(Capacitor WebView)에서는 <a target="_blank">가 무시되므로 InAppBrowser
   플러그인을 거쳐야 한다. 웹/DEV에서는 새 탭(window.open)으로 폴백한다.
   ========================================================================== */
function openExternal(url) {
  const cap = window.Capacitor;
  const native = cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform();
  const iab = cap && cap.Plugins && cap.Plugins.InAppBrowser;
  if (native && iab) {
    iab
      .openInWebView({
        url,
        options: {
          // 원본(openExternal.ts)의 DefaultWebViewOptions/DefaultAndroidWebViewOptions
          // 스프레드는 의도적으로 생략 — no-build라 패키지 상수를 import할 수 없고,
          // 플러그인이 미지정 옵션에 같은 기본값을 채워 동작은 동일하다.
          showURL: false, // 주소창은 초등 사용자에게 불필요한 노이즈
          closeButtonText: "닫기",
          // 기본값이 true라 열 때마다 쿠키가 지워져 로그인이 필요한 게시판이면
          // 매번 다시 로그인해야 한다. 세션을 유지하도록 끈다.
          clearCache: false,
          clearSessionCache: false,
          android: { allowZoom: true }, // 태블릿에서 게시판 글 확대해 읽기
        },
      })
      .catch((e) => console.error("[openExternal] openInWebView 실패", e));
  } else {
    // 웹: 새 탭. noopener/noreferrer로 원본 창 참조 차단.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/* ==========================================================================
   home 표시용 상수표 (src/scenes/home/home.data.ts 이식)
   ========================================================================== */
/** progress 0~4에 대응하는 별명. */
const NICKNAMES = [
  "견습 가디언",
  "이해의 가디언",
  "관찰의 가디언",
  "연결의 가디언",
  "하트 가디언",
];

/** progress 0~4에 대응하는 하티 멘트. */
const COMMENTS = [
  "가디언즈가 되려면 가장 먼저 필요한 것이 있어!\n바로 '마음 신호 탐색기'야.\n이 도구는 친구의 마음에 관심을 갖게 해 주는 특별한 장비란다.\n이제 이 탐색기와 함께 빛의 행성으로 떠나 보자!",
  "빛의 행성을 멋지게 해냈구나!\n이번엔 안개 행성이 너를 기다리고 있어.",
  "안개 행성도 통과!\n다음은 차가운 얼음 행성이야.\n준비됐지?",
  "얼음 행성까지 클리어하다니 대단해!\n마지막은 그림자 행성이야.\n끝까지 가보자!",
  "우리는 다음 탐험에서 다시 만나자!\n안녕",
];

/** progress 0~4에 대응하는 공감 에너지 게이지 하단 안내 문구. */
const ENERGY_NOTES = [
  "다음 행성까지 25% 필요!",
  "다음 행성까지 50% 필요!",
  "다음 행성까지 75% 필요!",
  "그림자 행성 출발!",
  "공감 에너지 완성!",
];

/** 행성 1~4 이름 (이미지에도 박혀 있으나 alt/접근성용). */
const PLANET_NAMES = ["빛의 행성", "안개 행성", "얼음 행성", "그림자 행성"];

/* ==========================================================================
   home 로직 (src/scenes/home/home.logic.ts 이식)
   ========================================================================== */
function clampIndex(n, len) {
  return Math.max(0, Math.min(len - 1, n));
}

/** 행성 id(1~4)와 progress(0~4)로 상태를 판정한다. 진행은 순차적이다. */
function planetState(id, progress) {
  if (id <= progress) return "completed";
  if (id === progress + 1) return "unlocked";
  return "locked";
}

function nicknameFor(progress) {
  return NICKNAMES[clampIndex(progress, NICKNAMES.length)];
}
function commentFor(progress) {
  return COMMENTS[clampIndex(progress, COMMENTS.length)];
}
function energyNoteFor(progress) {
  return ENERGY_NOTES[clampIndex(progress, ENERGY_NOTES.length)];
}

/**
 * DEV 전용: `?prog=N` 쿼리로 progress를 덮어써 DB 없이 Home 상태를 테스트한다.
 * 예) home/?prog=3. (원본은 해시쿼리였으나 MPA에선 실제 쿼리스트링을 쓴다.)
 */
function devProgressOverride(progress) {
  const raw = new URLSearchParams(window.location.search).get("prog");
  if (raw === null || raw === "") return progress;
  const n = Number(raw);
  if (!Number.isFinite(n)) return progress;
  return Math.max(0, Math.min(4, Math.trunc(n)));
}

/* ==========================================================================
   home 렌더링 (src/scenes/home/index.tsx + 컴포넌트 이식)
   ========================================================================== */
(function home() {
  const root = document.getElementById("home");

  // 세션 로드 (가드는 파일 상단에서 이미 통과). 파싱 실패 시 로그인으로.
  let session;
  try {
    session = JSON.parse(localStorage.getItem("hg_session"));
  } catch (_) {
    session = null;
  }
  if (!session || !session.profile) {
    location.href = ROOT + "auth/index.html";
    return;
  }

  const profile = session.profile;
  // classBoard: [planet1_url, planet2_url, planet3_url, planet4_url] 배열 (Task 3 형식).
  const classBoard = Array.isArray(session.classBoard) ? session.classBoard : [];

  /* hg_progress(행성 불리언 — auth의 mergeProgress가 쓰는 형식 그대로) → 0~4 숫자.
     파싱 실패/부재 시 0. 진행이 순차라 true인 가장 높은 행성 번호가 곧 진도다. */
  function readLocalProgress() {
    let obj = {};
    try {
      obj = JSON.parse(localStorage.getItem("hg_progress") || "{}") || {};
    } catch (_) {
      obj = {};
    }
    let p = 0;
    for (let n = 1; n <= 4; n++) {
      if (obj["planet" + n]) p = n;
    }
    return p;
  }

  // 표시 진도 = max(세션, hg_progress) — 행성 완료가 어느 키를 갱신하든 home에 반영.
  // (R2: hg_progress는 서버/로컬 병합 진도, 읽는 곳이 home이다.) 결과는 0~4로 클램프.
  const sessionProgress = typeof session.progress === "number" ? session.progress : 0;
  const progress = devProgressOverride(
    Math.max(0, Math.min(4, Math.max(sessionProgress, readLocalProgress()))),
  );

  const A = ROOT + "assets/"; // 에셋 접두어

  // ── 작은 DOM 헬퍼 ──
  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === "class") n.className = props[k];
        else if (k === "text") n.textContent = props[k];
        else if (k === "html") n.innerHTML = props[k];
        else if (k === "style") n.setAttribute("style", props[k]);
        else n.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  /* ---- 타이틀 배너 ---- */
  root.appendChild(
    el("img", {
      class: "home-title",
      src: A + "ui/TitleBanner.webp",
      alt: "하트 가디언즈: 우주 공감 탐험대",
    }),
  );

  /* ---- 프로필 카드 (ProfileCard.tsx) ---- */
  const gender = profile.gender === "female" ? "female" : "male";
  const faceSrc = gender === "female" ? "AvatarFaceFemale.webp" : "AvatarFaceMale.webp";
  root.appendChild(
    el("div", { class: "home-profile", style: `background-image:url(${A}home/PlayerButton.webp)` }, [
      el("img", { class: "home-profile__face", src: A + "home/" + faceSrc, alt: "" }),
      el("div", { class: "home-profile__info" }, [
        el("span", { class: "home-profile__level", text: "Lv" + (progress + 1) + " " + nicknameFor(progress) }),
        el("span", { class: "home-profile__name", text: profile.name }),
      ]),
    ]),
  );

  /* ---- 과목·학년 표기 (home-profile 아래) ---- */
  root.appendChild(el("div", { class: "home-subject", text: "도덕 3학년" }));

  /* ---- 학습 목표 버튼 (index.tsx home-goal → GoalBook 팝업) ---- */
  const goalBtn = el(
    "button",
    {
      type: "button",
      class: "home-goal",
      "data-sfx": "pop",
      style: `background-image:url(${A}home/BannerPlate03.webp)`,
    },
    [
      el("img", { class: "home-goal__star", src: A + "home/PurposeStart.webp", alt: "" }),
      el("span", { class: "home-goal__text", html: "학습 로드맵<br><small>클릭해서 학습 단계를 확인하세요</small>" }),
    ],
  );
  goalBtn.addEventListener("click", () => openBookPopup([A + "home/LearningGoal.webp"], 0, "학습 로드맵"));
  root.appendChild(goalBtn);

  /* ---- 공감 에너지 게이지 (EnergyGauge.tsx) ---- */
  const percent = Math.max(0, Math.min(4, progress)) * 25;
  const hearts = el("div", { class: "home-energy__hearts" });
  for (let i = 0; i < 4; i++) {
    hearts.appendChild(
      el("img", {
        class: "home-energy__heart",
        src: A + "home/" + (i < progress ? "HeartFull.webp" : "HeartEmpty.webp"),
        alt: "",
      }),
    );
  }
  hearts.appendChild(el("span", { class: "home-energy__percent", text: percent + "%" }));
  root.appendChild(
    el("div", { class: "home-energy", style: `background-image:url(${A}home/HeartScorePlate.webp)` }, [
      el("span", { class: "home-energy__label", text: "공감 에너지" }),
      hearts,
      el("span", { class: "home-energy__next", text: energyNoteFor(progress) }),
    ]),
  );

  /* ---- 완료 행성 에너지 빔 SVG 오버레이 ----
     viewBox 1280×800 = 무대 좌표계. drawBeams()가 완료 행성마다 line 2겹을 채운다.
     el() 헬퍼는 HTML 전용이라 SVG는 createElementNS로 직접 만든다.
     append 순서(모선 뒤·행성 앞)로 모선 위·행성 아래에 빔이 그려진다. */
  const SVGNS = "http://www.w3.org/2000/svg";
  const beamSvg = document.createElementNS(SVGNS, "svg");
  beamSvg.setAttribute("class", "home-beams");
  beamSvg.setAttribute("viewBox", "0 0 1280 800");
  beamSvg.setAttribute("aria-hidden", "true");

  /* ---- 모선 (Mothership.tsx) ---- */
  const mothership = el("img", { class: "home-mothership", src: A + "home/HeartConnect.webp", alt: "" });
  root.appendChild(mothership);
  root.appendChild(beamSvg); // 모선 뒤·행성 앞에 append → 모선 위·행성 아래에 빔이 그려짐

  /* ---- 행성 버튼 4개 (PlanetButton.tsx) ---- */
  const planetsWrap = el("div", { class: "home-planets" });
  const completedPlanets = []; // 에너지 빔을 그릴 완료 행성 버튼들
  [1, 2, 3, 4].forEach((id) => {
    const status = planetState(id, progress);
    // unlocked(다음 행성) + completed(이미 완료) 모두 탐험 가능. 이동 목적지는 동일한 prologue.
    const playable = status === "unlocked" || status === "completed";
    const img = status === "completed" ? id + "_Happy" : id + "_Sad";
    const btn = el(
      "button",
      {
        type: "button",
        class: "home-planet home-planet--" + status,
        "aria-label": PLANET_NAMES[id - 1],
      },
      [],
    );
    if (!playable) btn.disabled = true;
    if (status === "unlocked") {
      btn.appendChild(
        el("span", {
          class: "home-planet__rocket",
          style: `background-image:url(${A}home/RocketButton.webp)`,
          text: "탐험 시작!",
        }),
      );
    }
    if (status === "locked") {
      btn.appendChild(el("img", { class: "home-planet__lock", src: A + "home/Lock.webp", alt: "잠김" }));
    }
    btn.appendChild(el("img", { class: "home-planet__char", src: A + "home/Alien0" + img + ".webp", alt: "" }));
    if (playable) {
      btn.addEventListener("click", () => fadeNav(ROOT + "planet" + id + "/prologue/index.html"));
    }
    if (status === "completed") completedPlanets.push(btn);
    planetsWrap.appendChild(btn);
  });
  root.appendChild(planetsWrap);

  /* ---- 에너지 빔 그리기 ----
     모선 하단 중앙 → 각 완료 행성 중심으로 line 2겹(베이스 글로우 + 흐르는 펄스).
     fitStage가 무대를 transform scale로 줄이므로, getBoundingClientRect(화면 px)를
     scale로 나눠 1280×800 viewBox 좌표로 되돌린다. resize·모선 로드 시 재계산. */
  function drawBeams() {
    while (beamSvg.firstChild) beamSvg.removeChild(beamSvg.firstChild);
    if (!completedPlanets.length) return;
    const homeRect = root.getBoundingClientRect();
    const scale = homeRect.width / 1280 || 1;
    const vbX = (px) => (px - homeRect.left) / scale;
    const vbY = (px) => (px - homeRect.top) / scale;
    const mr = mothership.getBoundingClientRect();
    const mx = vbX(mr.left + mr.width / 2); // 모선 중심
    const my = vbY(mr.top + mr.height / 2);
    completedPlanets.forEach((btn) => {
      const br = btn.getBoundingClientRect();
      const px = vbX(br.left + br.width / 2); // 행성 중심
      const py = vbY(br.top + br.height / 2);
      // 대시 흐름을 행성→모선 방향으로: line 시작점=행성, 끝점=모선.
      for (const cls of ["home-beam--base", "home-beam--pulse"]) {
        const ln = document.createElementNS(SVGNS, "line");
        ln.setAttribute("class", "home-beam " + cls);
        ln.setAttribute("x1", px);
        ln.setAttribute("y1", py);
        ln.setAttribute("x2", mx);
        ln.setAttribute("y2", my);
        beamSvg.appendChild(ln);
      }
    });
  }
  requestAnimationFrame(drawBeams);
  if (!mothership.complete) mothership.addEventListener("load", drawBeams);
  window.addEventListener("resize", drawBeams);

  /* ---- 하단 메뉴 (MenuBar.tsx) ---- */
  const MENU = [
    { key: "mission", img: "MissionButton.webp", label: "미션" },
    { key: "gem", img: "GemBookButton.webp", label: "원석 도감" },
    { key: "inventory", img: "InventoryButton.webp", label: "가디언즈 가방" },
    { key: "history", img: "HistoryButton.webp", label: "탐험 일지" },
  ];
  const menuWrap = el("div", { class: "home-menu" });
  MENU.forEach((it) => {
    const b = el("button", { type: "button", class: "home-menu__btn", "data-sfx": "pop", "aria-label": it.label }, [
      el("img", { src: A + "home/" + it.img, alt: "" }),
    ]);
    b.addEventListener("click", () => openMenu(it.key));
    menuWrap.appendChild(b);
  });
  root.appendChild(menuWrap);

  /* ---- 하티 + 말풍선 타이핑 (HatiHelper.tsx) ---- */
  const hatiSrc =
    progress === 0
      ? "hati_signal_detector.webp"
      : progress >= 4
        ? "hati_happy.webp"
        : "hati_default.webp";
  const hatiText = el("p", { class: "home-hati__text" });
  root.appendChild(
    el("div", { class: "home-hati" }, [
      el("img", { class: "home-hati__robot", src: A + "char/Hati/" + hatiSrc, alt: "하티" }),
      el("div", { class: "home-hati__bubble" }, [hatiText]),
    ]),
  );
  // 타이핑 효과 (45ms/글자, 원본과 동일).
  (function typeHati() {
    const full = commentFor(progress);
    // 타이핑 중 발화음(blip) — 미션 페이지 typeInto 와 같은 관례:
    // 발화 문자(공백·문장부호 제외) 4개마다 한 번 blipHati.
    const SILENT_CHAR = /[\s.,!?…·'"“”‘’\-—~()[\]{}:;]/;
    let count = 0;
    let speak = 0; // 연속 발화 문자 카운터
    const id = setInterval(() => {
      count += 1;
      const ch = full[count - 1];
      if (ch !== undefined && !SILENT_CHAR.test(ch)) {
        speak += 1;
        if (speak % 4 === 1) audio.play("blipHati");
      } else {
        speak = 0;
      }
      hatiText.textContent = full.slice(0, count);
      if (count >= full.length) clearInterval(id);
    }, 45);
  })();

  /* ==========================================================================
     팝업 (index.tsx의 popup 상태 이식) — 한 번에 하나만 뜬다.
     ========================================================================== */
  let popupEl = null;
  function closePopup() {
    if (popupEl) {
      popupEl.remove();
      popupEl = null;
    }
  }

  /** 단계별 도감 팝업(BookPopup.tsx) — 이미지 자체가 완성된 팝업. */
  function openBookPopup(images, prog, alt) {
    closePopup();
    const idx = Math.max(0, Math.min(images.length - 1, prog));
    const closeBtn = el("button", { type: "button", class: "book-popup__close", "aria-label": "닫기" });
    closeBtn.addEventListener("click", closePopup);
    const panel = el("div", { class: "book-popup__panel" }, [
      el("img", { class: "book-popup__img", src: images[idx], alt: alt }),
      closeBtn,
    ]);
    panel.addEventListener("click", (e) => e.stopPropagation());
    popupEl = el("div", { class: "book-popup" }, [panel]);
    popupEl.addEventListener("click", closePopup); // 딤 배경 클릭으로 닫힘
    root.appendChild(popupEl);
  }

  /** 탐험 일지 팝업 — 이미지(HistoryBoard.webp) 자체가 완성된 보드.
     제목·행성 라벨·X는 이미지에 그려져 있고, 오른쪽 4개 점선칸 위에 게시판 URL(행성1~4)을
     절대배치로 얹는다. 각 칸의 세로 중심(%)은 SLOT_TOP, X 클릭영역은 CSS. */
  function openHistoryBoard() {
    closePopup();
    const SLOT_TOP = [38.8, 56.2, 73.6, 91.0]; // 4개 점선칸의 세로 중심(%)
    const closeBtn = el("button", {
      type: "button",
      class: "history-board__close",
      "aria-label": "닫기",
    });
    closeBtn.addEventListener("click", closePopup);
    const children = [
      el("img", { class: "history-board__img", src: A + "home/HistoryBoard.webp", alt: "탐험 일지" }),
      closeBtn,
    ];
    for (let i = 0; i < 4; i++) {
      const url = classBoard[i] || null;
      let inner;
      if (url) {
        inner = el("a", {
          class: "history-board__link",
          href: url,
          target: "_blank",
          rel: "noreferrer",
          text: url,
        });
        // APK(WebView)에서는 target=_blank가 무시되므로 클릭을 가로채 외부로 연다.
        inner.addEventListener("click", (e) => {
          e.preventDefault();
          openExternal(url);
        });
      } else {
        inner = el("span", { class: "history-board__empty", text: "등록된 게시판이 없어요" });
      }
      children.push(
        el("div", { class: "history-board__slot", style: `top:${SLOT_TOP[i]}%` }, [inner]),
      );
    }
    const panel = el("div", { class: "history-board__panel" }, children);
    panel.addEventListener("click", (e) => e.stopPropagation());
    popupEl = el("div", { class: "history-board" }, [panel]);
    popupEl.addEventListener("click", closePopup); // 딤 배경 클릭으로 닫힘
    root.appendChild(popupEl);
  }

  /** 하단 메뉴 클릭 → 해당 팝업. */
  function openMenu(key) {
    if (key === "inventory") {
      openBookPopup(
        [0, 1, 2, 3, 4].map((i) => A + "home/EmpathyTool" + i + ".webp"),
        progress,
        "공감 도구 도감",
      );
    } else if (key === "gem") {
      openBookPopup(
        [0, 1, 2, 3, 4].map((i) => A + "home/GemBook" + i + ".webp"),
        progress,
        "원석 도감",
      );
    } else if (key === "history") {
      openHistoryBoard();
    } else {
      // mission: 탐험 안내서 씬으로 전환 (guide/index.html).
      fadeNav(ROOT + "guide/index.html");
    }
  }
})();
