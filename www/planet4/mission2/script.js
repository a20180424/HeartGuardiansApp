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
   "/assets/..." 경로는 ASSETS 접두어로 치환한다. 전 5노드 verbatim(전수 대조 완료):
   line(4) + minigame(1). choice/branch 없음.
   ========================================================================== */
const A = ASSETS;

const MISSION = {
  start: "p4_m2_intro",
  nodes: [
    {
      id: "p4_m2_intro",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감 나침반 만이\n공감의 길을 찾을 수 있어\n용기 조각을 찾아서\n그림자 행성의 용기를 되찾아줘!",
      next: "p4_m2_play",
    },
    {
      id: "p4_m2_play",
      type: "minigame",
      hideFriend: true,
      noAuto: true,
      game: "courageCompass",
      next: "p4_m2_cards",
    },
    {
      id: "p4_m2_cards",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감하기 어려운 상황도 있어.\n지혜롭게 공감하기를 실천하자!",
      cards: [
        { image: A + "/planet4/shadow-planet-empathy-card-3.webp" },
        { image: A + "/planet4/shadow-planet-empathy-card-4.webp" },
      ],
      next: "p4_m2_postplay",
    },
    {
      id: "p4_m2_postplay",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "공감은 특별한 능력이 아니야.\n매 순간 '공감의 길'을 선택하는 작은 용기야.",
      completeBanner: "미션 완료!",
      next: "p4_m2_end",
    },
    {
      id: "p4_m2_end",
      type: "line",
      speaker: "hati",
      hideFriend: true,
      noAuto: true,
      text: "축하해! 대원은 용기의 에메랄드와 공감 나침반을 얻었어! 이제 먼저 다가갈 용기를 낼 수 있을 거야.",
      image: A + "/ui/explore-success.webp",
      cards: [{ image: A + "/ui/planet4-reward-card.webp" }],
      onEnter: [{ cmd: "fx", value: "fx_light_return" }],
      next: null,
    },
  ],
};

/* 미션2 테마 — theme.ts 의 MISSION02_THEME 중 이 미션이 실제 쓰는 값만.
   ⚠ fullHatiNodes 없음(인트로만 전신 하티 — postplay/cards/end 는 하단 #hatiBox) ·
   showRadar:false(레이더 HUD 없음) · cast(캐릭터 무대, 이 테마는 미사용) 미포함.
   "banner" 텍스트는 index.html 에 정적으로 박아 넣었다(다른 미션 템플릿과 동일 관례). */
const THEME = {
  speakers: { hati: { name: "하티" } },
  bannerNode: "p4_m2_intro",
  initialFriend: "placeholder",
  bg: {
    // main = 인트로 / stage2 = 미니게임 무대 / stage3 = 공감카드·보상(엔딩까지 유지, sparse)
    states: {
      main: A + "/planet4/shadow-mission2-bg1.webp",
      stage2: A + "/planet4/shadow-mission2-bg2.webp",
      stage3: A + "/planet4/shadow-mission2-bg3.webp",
    },
    initial: "main",
    byNode: { p4_m2_intro: "main", p4_m2_play: "stage2", p4_m2_cards: "stage3" },
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
   미니게임: 공감 나침반 작전 (CourageCompassStage.tsx + courageCompass.data.ts 이식).
   원본: mytemp/그림자행성 미션2 게임/index.html 의 #game·#reward 화면.
   흐름: 갈림길(나침반을 눌러 길을 밝힘 → 표지판 선택 → 친구의 말 2지선다) × 8시나리오
   (4스테이지 × 2시나리오) → 스테이지 클리어마다 보상(용기 조각 + 하티 교훈) → 마지막
   스테이지 보상 후 onDone.
   ⚠ 원본은 이 스테이지 안에서 효과음을 재생하지 않는다(audio import/호출 없음) — 그대로 무음.
   구현 노트: React 는 시나리오가 바뀔 때 `key`로 갈림길 DOM 을 통째로 새로 마운트해
   나침반 바늘·표지판의 CSS 트랜지션이 매번 "안 밝혀진 초기 상태"에서 시작하게 한다.
   여기서는 그 대신 시나리오가 바뀔 때만 갈림길 DOM 을 실제로 새로 만들고(loadScenario),
   그 안에서의 상태 변화(나침반 회전·표지판 뒤집기)는 이미 존재하는 DOM 에 클래스만
   추가해 트랜지션이 실제로 재생되게 한다(풀 리렌더 시 새 엘리먼트가 최종 상태로 바로
   생성되면 트랜지션이 재생되지 않는 문제 회피).
   ========================================================================== */
const CC_ASSET = A + "/planet4";

const CC_STAGES = [
  {
    title: "다가갈 용기",
    learn: "친구의 마음은 이해해 주었지만 잘못된 행동까지 함께하지는 않았구나!",
    shard: CC_ASSET + "/courage-shard1.webp",
    scenarios: [
      {
        situation: "친구가 경기에서 져서 화가 났습니다.",
        image: CC_ASSET + "/situation-1-1.webp",
        good: "괜찮은지 조심스럽게 말을 건다.",
        bad: "괜히 어색하니까 그냥 지나간다.",
        reply: "“다음에는 반칙을 해서라도 이길 거야.”",
        choices: ["그래! 같이 반칙하자.", "많이 화가 났겠구나. 하지만 반칙은 모두에게 공평하지 않아."],
        answer: 1,
      },
      {
        situation: "친구가 놀림을 당해서 울고 있습니다.",
        image: CC_ASSET + "/situation-1-2.webp",
        good: "무슨 일인지 차분히 들어본다.",
        bad: "모른 척 지나간다.",
        reply: "“나도 더 심하게 놀릴 거야.”",
        choices: ["정말 속상했겠다. 하지만 같이 놀리면 더 큰 싸움이 될 수도 있어.", "그래! 같이 놀리자."],
        answer: 0,
      },
    ],
  },
  {
    title: "존중할 용기",
    learn: "친구가 원하는 방법을 존중해 주었구나!",
    shard: CC_ASSET + "/courage-shard2.webp",
    scenarios: [
      {
        situation: "친구가 쉬는 시간에 혼자 창밖을 바라보고 있습니다.",
        image: CC_ASSET + "/situation-2-1.webp",
        good: "친구 곁으로 가서 괜찮은지 물어본다.",
        bad: "“괜히 방해될 거야.” 하며 돌아선다.",
        reply: "“괜찮아. 조금만 혼자 있을게.”",
        choices: ["혼자 있고 싶은 마음이 있구나. 편해지면 언제든 이야기해 줘.", "혼자 있으면 더 힘들어. 같이 가자."],
        answer: 0,
      },
      {
        situation: "친구가 점심시간에 혼자서 앉아 밥을 먹고 있습니다.",
        image: CC_ASSET + "/situation-2-2.webp",
        good: "같이 있어도 괜찮은지 물어본다.",
        bad: "모른 척 다른 자리로 간다.",
        reply: "“오늘은 혼자 먹고 싶어.”",
        choices: ["같이 먹어야 덜 외롭잖아.", "오늘은 혼자 있고 싶은 마음이구나. 나중에 같이 이야기하자."],
        answer: 1,
      },
    ],
  },
  {
    title: "함께 해결할 용기",
    learn: "혼자 해결하기 어려울 때는 함께 도움을 요청하는 것도 용기란다.",
    shard: CC_ASSET + "/courage-shard3.webp",
    scenarios: [
      {
        situation: "친구가 계속 괴롭힘을 당하고 있습니다.",
        image: CC_ASSET + "/situation-3-1.webp",
        good: "친구에게 다가가 무슨 일이 있었는지 들어본다.",
        bad: "괜히 나까지 피해를 볼까 봐 지나간다.",
        reply: "“혼자 해결하기 어려워.”",
        choices: ["많이 힘들었겠구나. 우리 함께 믿을 수 있는 어른께 도움을 요청하자.", "조금만 더 참자."],
        answer: 0,
      },
      {
        situation: "친구가 물건을 잃어버려 울고 있습니다.",
        image: CC_ASSET + "/situation-3-2.webp",
        good: "친구의 이야기를 끝까지 들어준다.",
        bad: "그냥 다시 찾으라고 한다.",
        reply: "“어떻게 해야 할지 모르겠어.”",
        choices: ["혼자 한번 더 찾아봐.", "많이 당황했겠구나. 우리 같이 선생님께 말씀드리자."],
        answer: 1,
      },
    ],
  },
  {
    title: "나를 지킬 용기",
    learn: "친구를 아끼는 만큼 나의 마음도 소중하단다.",
    shard: CC_ASSET + "/courage-shard4.webp",
    scenarios: [
      {
        situation: "친구가 매일 고민을 이야기합니다.",
        image: CC_ASSET + "/situation-4-1.webp",
        good: "친구 이야기를 차분히 들어준다.",
        bad: "귀찮아서 피한다.",
        reply: "“앞으로도 계속 너만 내 이야기를 들어줘.”",
        choices: [
          "네 이야기를 들어주는 건 좋지만, 나도 잠시 쉬면서 함께 다른 방법을 찾아보자.",
          "알겠어. 계속 내가 다 들어줄게.",
        ],
        answer: 0,
      },
      {
        situation: "다른 친구와 다투고 화가 난 친구가 “나 쟤랑 이제 안 놀 거야!”라고 말합니다.",
        image: CC_ASSET + "/situation-4-2.webp",
        good: "친구의 이야기를 끝까지 들어준다.",
        bad: "“그만 좀 해.” 하며 자리를 떠난다.",
        reply: "“너도 쟤랑 놀면 안 돼! 너는 내 편이야, 그렇지?”",
        choices: ["많이 속상했겠구나. 그래도 나는 다른 친구와도 사이좋게 지내고 싶어.", "응! 나도 이제 그 친구랑 안 놀 거야."],
        answer: 0,
      },
    ],
  },
];
const CC_SIGN_LEFT = { back: CC_ASSET + "/sign1-back.webp", front: CC_ASSET + "/sign1-front.webp" };
const CC_SIGN_RIGHT = { back: CC_ASSET + "/sign2-back.webp", front: CC_ASSET + "/sign2-front.webp" };
const CC_HATI_DEFAULT = CC_ASSET + "/hati-default.webp";
const CC_HATI_HAPPY = CC_ASSET + "/hati-clap.webp";
const CC_NEEDLE_END_LEFT = 1035; // 공감의 길이 왼쪽
const CC_NEEDLE_END_RIGHT = 1125; // 공감의 길이 오른쪽

const CourageCompassStage = (function () {
  const REVEAL_MS = 1700; // 나침반 회전 → 표지판이 뒤집히기까지
  const TYPE_MS = 45; // 보상 교훈 타자기 속도(글자당)

  let phase = "fork"; // fork | reward
  let stageIndex = 0;
  let scenarioIndex = 0;
  let revealed = false;
  let spinning = false;
  let goodOnLeft = []; // 판마다 좌/우 배치(원본 shufflePaths) — mount 시 8개를 한 번에 뽑는다.

  let container = null;
  let onFinish = null;
  let root = null;
  let frame = null;
  let chromeEl = null;
  let shardEls = []; // 용기 조각 span 들(part-update 패치 대상)
  let pillEls = []; // 스테이지바 알약들(part-update 패치 대상)
  let shardsAria = null; // .cc-shards (aria-label 갱신용)
  let screenEl = null; // 현재 .cc-game 또는 .cc-reward
  let hatiEl = null; // 하티 피드백 모달(있을 때만)
  let dialogEl = null; // 친구의 말 대화창(있을 때만)
  let leftSignBtn = null;
  let rightSignBtn = null;
  let compassBtn = null;
  let tipEl = null;

  const timers = [];
  function after(ms, fn) {
    timers.push(window.setTimeout(fn, ms));
  }
  function clearTimers() {
    timers.forEach((id) => window.clearTimeout(id));
    timers.length = 0;
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

  function resetState() {
    phase = "fork";
    stageIndex = 0;
    scenarioIndex = 0;
    revealed = false;
    spinning = false;
    goodOnLeft = Array.from({ length: 8 }, () => Math.random() >= 0.5);
  }

  /* ---------- 상단 크롬(용기 조각 + 스테이지바) ----------
     한 번만 만들고 이후엔 클래스만 패치한다(part-update). 매번 재생성하면 이미 획득한
     조각들도 삽입 시마다 ccPop 애니메이션을 다시 재생한다 — 원본 React 는 key 안정성으로
     "이번에 새로 켜진 조각"만 애니메이션되므로, classList.toggle 로 같은 효과를 낸다
     (이미 .on 인 엘리먼트에 toggle(_, true)는 no-op이라 애니메이션이 재시작되지 않는다). */
  function renderChrome() {
    const shardsOn = phase === "reward" ? stageIndex + 1 : stageIndex;
    if (!chromeEl) {
      shardEls = CC_STAGES.map(() => el("span", { class: "cc-shard", text: "◆" }));
      pillEls = CC_STAGES.map((s, i) =>
        el("div", { class: "cc-stage-pill", text: i + 1 + ". " + s.title }),
      );
      const shards = el("div", { class: "cc-shards" }, shardEls);
      shardsAria = shards;
      const stagebar = el("div", { class: "cc-stagebar" }, pillEls);
      chromeEl = el("div", { class: "cc-chrome" }, [shards, stagebar]);
      frame.appendChild(chromeEl);
    }
    shardsAria.setAttribute("aria-label", "용기 조각 " + shardsOn + " / " + CC_STAGES.length);
    shardEls.forEach((s, i) => s.classList.toggle("on", i < shardsOn));
    pillEls.forEach((p, i) => {
      p.classList.toggle("active", i === stageIndex);
      p.classList.toggle("done", i < stageIndex);
    });
  }

  /* ---------- 표지판(뒷면 → 앞면 3D 뒤집기) ---------- */
  function buildSign(side, stage, scenario, leftIsGood) {
    const isGood = side === "left" ? leftIsGood : !leftIsGood;
    const art = side === "left" ? CC_SIGN_LEFT : CC_SIGN_RIGHT;
    const kind = isGood ? "good" : "bad";
    const btn = el("button", { class: "cc-sign " + kind, type: "button", "aria-label": "숨겨진 길" });
    btn.disabled = true;
    const back = el("span", { class: "cc-face back" }, [img(art.back, "표지판 뒷면")]);
    const copy = el("span", { class: "cc-sign-copy" }, [
      el("b", { text: isGood ? "💚 공감의 길" : "🌑 그림자의 길" }),
      el("span", { text: isGood ? scenario.good : scenario.bad }),
    ]);
    const front = el("span", { class: "cc-face front" }, [img(art.front, ""), copy]);
    const inner = el("span", { class: "cc-sign-inner" }, [back, front]);
    btn.appendChild(inner);
    btn.addEventListener("click", () => choosePath(kind));
    return btn;
  }

  /* ---------- 갈림길 화면(시나리오 전환 시에만 새로 만든다 — React key 트릭과 동일 의미) ---------- */
  function loadScenario(s, sc) {
    stageIndex = s;
    scenarioIndex = sc;
    revealed = false;
    spinning = false;
    phase = "fork";
    clearTimers();
    removeDialog();
    removeHati();
    renderChrome();

    const stage = CC_STAGES[stageIndex];
    const scenario = stage.scenarios[scenarioIndex];
    const leftIsGood = goodOnLeft[stageIndex * 2 + scenarioIndex];

    const situation = el("div", { class: "cc-situation" }, [
      img(scenario.image, ""),
      el("div", { class: "cc-situation-copy" }, [
        el("span", { class: "cc-speaker", text: "친구의 상황" }),
        el("span", { text: scenario.situation }),
      ]),
    ]);
    situation.querySelector("img").className = "cc-situation-image";

    leftSignBtn = buildSign("left", stage, scenario, leftIsGood);
    rightSignBtn = buildSign("right", stage, scenario, leftIsGood);

    tipEl = el("div", { class: "cc-compass-tip" });
    tipEl.append(document.createTextNode("나침반을 눌러"), document.createElement("br"), document.createTextNode("길을 밝혀 주세요"));

    compassBtn = el("button", { class: "cc-compass", type: "button", "aria-label": "공감 나침반" });
    compassBtn.style.setProperty(
      "--needle-end",
      (leftIsGood ? CC_NEEDLE_END_LEFT : CC_NEEDLE_END_RIGHT) + "deg",
    );
    compassBtn.appendChild(el("span", { class: "cc-needle" }));
    compassBtn.addEventListener("click", reveal);

    const compassWrap = el("div", { class: "cc-compass-wrap" }, [
      tipEl,
      compassBtn,
      el("div", { class: "cc-compass-label", text: "공감 나침반" }),
    ]);

    const fork = el("div", { class: "cc-fork" }, [leftSignBtn, compassWrap, rightSignBtn]);

    const gameEl = el("div", { class: "cc-game shadowed" }, [
      el("h2", { class: "cc-stage-title", text: stage.title }),
      situation,
      fork,
    ]);

    if (screenEl) screenEl.remove();
    screenEl = gameEl;
    frame.appendChild(screenEl);
  }

  // 나침반 클릭 → 어둠이 걷히고 바늘이 정답 쪽을 가리키며 회전, 1.7초 뒤 표지판이 뒤집힌다.
  function reveal() {
    if (spinning || revealed) return;
    spinning = true;
    audio.play("whoosh"); // 나침반 바늘 회전
    compassBtn.classList.add("spinning");
    compassBtn.disabled = true;
    after(REVEAL_MS, () => {
      revealed = true;
      screenEl.classList.remove("shadowed");
      [leftSignBtn, rightSignBtn].forEach((b) => {
        b.classList.add("revealed", "selectable");
        b.disabled = false;
        b.removeAttribute("aria-label");
      });
      tipEl.textContent = "표지판을 선택하세요";
      tipEl.classList.add("choose-mode");
    });
  }

  function choosePath(kind) {
    if (!revealed) return;
    if (kind === "bad") {
      audio.play("wrong");
      showHati({
        message: "그림자의 길보다 친구의 마음을 살피는 공감의 길을 선택해 볼까?",
        success: false,
        button: "다시 생각하기",
        onClose: null,
      });
      return;
    }
    openDialog();
  }

  function openDialog() {
    const stage = CC_STAGES[stageIndex];
    const scenario = stage.scenarios[scenarioIndex];
    removeDialog();
    const choices = el(
      "div",
      { class: "cc-choices" },
      scenario.choices.map((c, i) => {
        const b = el("button", { class: "cc-choice" }, [
          el("span", { class: "cc-num", text: String(i + 1) }),
          document.createTextNode(c),
        ]);
        b.addEventListener("click", () => answer(i));
        return b;
      }),
    );
    dialogEl = el("div", { class: "cc-dialog" }, [
      el("span", { class: "cc-speaker", text: "친구의 말" }),
      el("h3", { text: scenario.reply }),
      choices,
    ]);
    screenEl.appendChild(dialogEl);
  }
  function removeDialog() {
    if (dialogEl) {
      dialogEl.remove();
      dialogEl = null;
    }
  }

  function answer(i) {
    const stage = CC_STAGES[stageIndex];
    const scenario = stage.scenarios[scenarioIndex];
    // ⚠ 원본(React)은 오답/첫 시나리오 정답 경로에서 dialogOpen 을 유지한다 — 하티 모달만
    // 위에 띄우고(z-index 40 > 다이얼로그 5), 모달을 닫으면 선택 다이얼로그가 그대로 열려
    // 있어 즉시 재선택/재시도할 수 있다. 여기서 removeDialog() 를 부르면 갈림길 화면으로
    // 떨어져 표지판을 다시 탭해야 하는 원본에 없는 추가 스텝이 생긴다.
    if (i !== scenario.answer) {
      audio.play("wrong");
      showHati({
        message: "친구의 마음을 이해하면서도 친구와 나, 모두를 지키는 말을 골라 보자!",
        success: false,
        button: "다시 생각하기",
        onClose: null,
      });
      return;
    }
    audio.play("correct"); // 공감의 말 정답
    if (scenarioIndex < stage.scenarios.length - 1) {
      // 다이얼로그는 모달 아래 유지 — "다음 상황으로" 의 loadScenario 가 정리한다.
      showHati({
        message: "잘했어! 공감의 길을 선택했구나.",
        success: true,
        button: "다음 상황으로",
        onClose: () => loadScenario(stageIndex, scenarioIndex + 1),
      });
      return;
    }
    removeDialog(); // 원본의 setDialogOpen(false) 대응(보상 화면 진입 시에만 닫는다)
    phase = "reward";
    buildRewardScreen();
  }

  /* ---------- 하티 피드백 모달 ---------- */
  function showHati(opts) {
    removeHati();
    const face = img(opts.success ? CC_HATI_HAPPY : CC_HATI_DEFAULT, "하티");
    face.className = "cc-hati-face";
    const actionBtn = el("button", { class: "cc-hati-action", type: "button", text: opts.button });
    actionBtn.addEventListener("click", () => {
      removeHati();
      if (opts.onClose) opts.onClose();
    });
    const copy = el("div", { class: "cc-hati-copy" }, [
      el("span", { class: "cc-hati-name", text: "하티" }),
      el("p", { class: "cc-hati-message", text: opts.message }),
      actionBtn,
    ]);
    const card = el("div", { class: "cc-hati-card" + (opts.success ? " success" : "") }, [face, copy]);
    hatiEl = el("div", { class: "cc-hati-feedback", role: "dialog", "aria-modal": "true" }, [card]);
    frame.appendChild(hatiEl);
    actionBtn.focus();
  }
  function removeHati() {
    if (hatiEl) {
      hatiEl.remove();
      hatiEl = null;
    }
  }

  /* ---------- 보상 화면 ---------- */
  function buildRewardScreen() {
    clearTimers();
    audio.play("fanfare"); // 용기 조각 획득 축하
    if (screenEl) screenEl.remove();
    renderChrome();

    const stage = CC_STAGES[stageIndex];
    const isLastStage = stageIndex + 1 >= CC_STAGES.length;

    const shardImg = img(stage.shard, "획득한 용기 조각");
    shardImg.className = "cc-big-shard";
    const shardPanel = el("div", { class: "cc-reward-shard-panel" }, [
      shardImg,
      el("div", { class: "cc-reward-shard-copy" }, [
        el("span", { class: "cc-reward-shard-label", text: "용기의 조각 획득" }),
        el("h2", { text: stage.title + " 획득!" }),
      ]),
    ]);

    const hatiImg = img(CC_HATI_HAPPY, "기뻐하는 하티");
    hatiImg.className = "cc-reward-hati";
    const learnP = el("p", {});
    const hatiPanel = el("div", { class: "cc-reward-hati-panel" }, [
      hatiImg,
      el("div", { class: "cc-reward-feedback" }, [el("span", { class: "cc-reward-hati-name", text: "하티" }), learnP]),
    ]);

    const rewardEl = el("div", { class: "cc-reward" }, [shardPanel, hatiPanel]);
    screenEl = rewardEl;
    frame.appendChild(screenEl);

    // 보상 교훈 타자기 — 다 찍혀야 '다음 구역으로' 버튼이 나온다(원본 typeRewardFeedback).
    const chars = Array.from(stage.learn);
    let i = 0;
    const typeId = window.setInterval(() => {
      i += 1;
      learnP.textContent = chars.slice(0, i).join("");
      if (i >= chars.length) {
        window.clearInterval(typeId);
        const btn = el("button", {
          class: "cc-primary cc-reveal",
          type: "button",
          text: isLastStage ? "공감 카드 공부하기  →" : "다음 구역으로  →",
        });
        btn.addEventListener("click", nextArea);
        rewardEl.appendChild(btn);
      }
    }, TYPE_MS);
    timers.push(typeId);
  }

  // 보상 화면의 '다음 구역으로' — 마지막 스테이지였다면 미니게임 종료(공감카드 노드로).
  function nextArea() {
    if (stageIndex + 1 >= CC_STAGES.length) {
      if (onFinish) onFinish();
      return;
    }
    loadScenario(stageIndex + 1, 0);
  }

  function mount(containerEl, finishCb) {
    resetState();
    container = containerEl;
    onFinish = finishCb;
    root = el("div", { class: "cc-root" });
    root.addEventListener("click", (e) => e.stopPropagation());
    frame = el("div", { class: "cc-frame" });
    root.appendChild(frame);
    container.appendChild(root);
    loadScenario(0, 0);
  }

  function unmount() {
    clearTimers();
    if (root) root.remove();
    root = null;
    frame = null;
    chromeEl = null;
    shardEls = [];
    pillEls = [];
    shardsAria = null;
    screenEl = null;
    hatiEl = null;
    dialogEl = null;
  }

  return { mount, unmount };
})();

/* ==========================================================================
   미션 러너 + 뷰 (engine/runner.ts + player/MissionPlayer.tsx 중 미션2가 쓰는 부분만).
   지원 노드 타입: line / minigame. (mission02.json 은 choice/branch/mirrors/gauge/
   reveal/video 를 쓰지 않는다 — 미포함.) 레이더 HUD·cast 무대·sideImageLeft 는
   showRadar:false·theme.cast 미사용·노드에 sideImageLeft 없음이라 미포함.
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
    choiceImage: "", // 화면 가운데 이미지(node.image, 없으면 "")
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
    if (bg) vm.bg = bg; // sparse — 지정 없는 노드는 이전 배경 유지(postplay/end 는 stage3 유지)
    vm.hideFriend = !!node.hideFriend;
    vm.choiceImage = node.image || "";
    vm.cards = node.cards || [];
    vm.completeBanner = node.completeBanner || "";
    vm.intro = node.id === THEME.bannerNode;
    // 전신 하티: bannerNode(인트로)만(이 미션은 fullHatiNodes 미사용 — 나머지는 하단 hatiBox).
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
    CourageCompassStage.mount(els.minigameLayer, () => {
      CourageCompassStage.unmount();
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
  // 원본 planet4/index.tsx: mission2 onExit → goTo("mission3") (completePlanet 아님, 최종 미션 아님).
  // finish 커스터마이즈 없음 → 기본(텍스트) 버튼("다음 미션으로 ➜")은 index.html 에 정적으로 박혀 있다.
  els.nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (exiting) return;
    exiting = true;
    els.nextBtn.disabled = true;
    fadeNav("../mission3/index.html"); // 다음 미션으로
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

  // 진행 스테퍼: 미션2 = step 2(완료 시 다음 노드가 "활성"으로 풀린다 — 최종 미션 아님).
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

    // 화면 가운데 큰 이미지(노드 image = p4_m2_end 의 "탐험 성공!" 리본)
    if (vm.choiceImage) els.choiceImage.src = vm.choiceImage;
    els.choiceImage.classList.toggle("show", !!vm.choiceImage);

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
  window.__m2 = { vm, current: () => current };

  // 최초 렌더 후 시작 노드로 진입.
  render();
  console.info(
    "[mission2] DEV 점프: ?step=N (0~" + (MISSION.nodes.length - 1) + "), ?node=<id>, ?end · 노드:",
    MISSION.nodes.map((n, i) => i + ":" + n.id).join("  "),
  );
  go(resolveStart());
})();
