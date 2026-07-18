"use strict";

/* ==========================================================================
   경로 상수 (페이지마다 이 값만 바꾼다)
   --------------------------------------------------------------------------
   ROOT = 이 페이지에서 www 루트까지의 상대 접두어.
     · 루트(intro, www/index.html)          → ""
     · 한 단계(auth/, home/)                 → "../"
     · 두 단계(planetN/prologue/, missionM/) → "../../"
   히든 메뉴 점프·씬 이동·영상 경로가 모두 이 상수를 기준으로 조립된다.
   ========================================================================== */
const ROOT = "";

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
   R2 앱 시작 초기화 — intro 전용
   --------------------------------------------------------------------------
   intro는 앱 시작 지점이다. React 앱은 세션을 메모리에만 두어 매 실행 시 로그인이
   필요했다(clearSession). vanilla는 세션을 localStorage(hg_session)에 두므로, 앱을
   새로 시작하는 intro에서 세션 임시 키를 지워 같은 동작(재실행=재로그인)을 만든다.
   진도(hg_progress)·음소거(hg_muted)는 유지한다.
   (이 블록은 intro 전용 — 다른 페이지로 복사하지 않는다.)
   ========================================================================== */
try {
  localStorage.removeItem("hg_session");
} catch (_) {
  /* localStorage 미지원 환경 무시 */
}

/* ==========================================================================
   공통 블록: 씬 전환 페이드 (sceneTransition.tsx 이식)
   --------------------------------------------------------------------------
   검은 오버레이를 FADE_MS 동안 덮은 뒤 location.href 로 이동한다. MPA라 도착
   페이지는 새 로드로 뜬다(도착 측 페이드-인은 각 페이지가 opacity 0에서 시작해
   자연히 처리). 모든 씬 이동은 이 함수를 거친다.
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
   공통 블록 3-① 효과음 — audio (src/lib/audio.ts 이식, React 의존 제거)
   --------------------------------------------------------------------------
   에셋 파일 없이 oscillator + gain 엔벨로프로 소리를 생성한다. 자동재생 정책상
   첫 사용자 제스처(pointerdown)에서 unlock() 해야 소리가 난다. 음소거(master gain 0)는
   localStorage("hg_muted")에 저장한다. onMuteChange 로 음소거 변경을 구독할 수 있다
   (음소거 버튼·인트로 영상 볼륨이 여기에 반응).
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

  /* 사운드 라이브러리 — name → 함수. gain 은 사람이 사운드 벤치에서 맞춘 값이라
     들쭉날쭉한 게 정상이다(파형·동시음 개수·주파수별 민감도가 다름). */
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

/* App.tsx 의 전역 리스너 이식: 첫 제스처에서 unlock + 버튼 data-sfx 효과음.
   캡처 단계로 듣되 아무것도 삼키지 않는다.
   ※ 원본은 미션 엔진(#stage)에 자체 사운드가 있어 `btn.closest("#stage")`를 건너뛰었다.
     vanilla MPA에선 #stage 가 (미션이 아니라) 모든 씬의 공통 무대 래퍼라 그 신호로
     못 쓴다 — 미션 페이지의 중복음은 미션 엔진 이식 시 그쪽에서 처리한다.
     버튼은 data-sfx="none" 으로 개별 opt-out 한다. */
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

/* ==========================================================================
   공통 블록 3-② 음소거 버튼 (MuteButton.tsx + mute-button.css 이식)
   --------------------------------------------------------------------------
   무대 밖(body 직속) 우상단 전역 버튼. audio.toggleMute() 토글 + hg_muted 반영.
   data-sfx="none": 음소거를 켜는 순간 tap 이 나면 앞뒤가 안 맞는다.
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
   (HiddenMenuOverlay.tsx + useCornerLongPress.ts + hiddenMenu.ts 이식)
   --------------------------------------------------------------------------
   진입: 좌상단 200×200 을 두 손가락으로 2초 롱프레스 (또는 개발용 Ctrl+Alt+J)
         → PIN → 점프 그리드. 각 항목은 fadeNav 로 해당 페이지로 이동한다.
   ========================================================================== */
(function hiddenMenu() {
  /* --- 잠금(hiddenMenu.ts) ---
     원본 PIN 은 빌드타임 env(VITE_HG_MENU_PIN)로 주입됐다. no-build MPA엔 env 주입
     경로가 없어 소스 상수로 둔다. 위협 모델은 교실의 초등학생(리버서 아님)이라
     APK 를 뜯으면 보이는 건 원본과 동일하게 감수한다. 프로덕션 배포 전 교체할 것.
     해제 상태는 이 클로저 변수에만 둔다 — localStorage에 남기면 영구 해제되어
     학생에게 노출된다. MPA는 페이지 이동마다 새 로드라 매번 다시 잠긴다. */
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

  /* --- 점프 목록(MPA 페이지 경로) ---
     React SPA는 한 planet 컴포넌트 안에서 ?m= 쿼리로 미션을 갈아끼웠지만, vanilla
     MPA는 프롤로그·미션마다 별도 페이지다. 아직 없는 페이지를 가리켜도 된다.
     경로는 ROOT(이 페이지→루트 접두어) 기준. */
  const COMMON = [
    { label: "로그인(auth)", href: ROOT + "auth/" },
    { label: "홈(home)", href: ROOT + "home/" },
  ];
  const COL_HEAD = ["프롤로그", "미션1", "미션2", "미션3"];
  // 각 행성의 4칸(프롤로그, 미션1, 미션2, 미션3). 없는 칸은 null.
  // 행성3은 미션2·3이 한 미니게임(stage2)이라 mission23 한 칸으로 합치고 미션3 칸은 비운다.
  const PLANETS = [
    { n: 1, cells: ["planet1/prologue/", "planet1/mission1/", "planet1/mission2/", "planet1/mission3/"] },
    { n: 2, cells: ["planet2/prologue/", "planet2/mission1/", "planet2/mission2/", "planet2/mission3/"] },
    { n: 3, cells: ["planet3/prologue/", "planet3/mission1/", "planet3/mission23/", null] },
    { n: 4, cells: ["planet4/prologue/", "planet4/mission1/", "planet4/mission2/", "planet4/mission3/"] },
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
    // 해제는 실행(로드)당 1회. 이미 해제됐으면 바로 그리드로.
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
      // grid
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

  /* --- 진입 제스처(useCornerLongPress.ts 이식) ---
     좌상단 200×200 안에서 두 손가락을 2초 유지. 24px 이상 움직이면 취소.
     좌표는 실제 뷰포트 기준(무대 밖에서 돈다). */
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

  /* 개발용 단축키 Ctrl+Alt+J (제스처와 동일 흐름). e.code 로 판정 — 자판/IME 무관. */
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && e.code === "KeyJ") {
      e.preventDefault();
      open();
    }
  });
})();

/* ==========================================================================
   intro 씬 로직 (src/scenes/intro/index.tsx + intro.logic.ts 이식)
   ========================================================================== */
(function intro() {
  const video = document.getElementById("intro-video");
  const playing = document.getElementById("intro-playing");
  const soundHint = document.getElementById("intro-sound-hint");
  const startBtn = document.getElementById("intro-start");
  const skipBtn = document.getElementById("intro-skip");
  const tapLayer = document.getElementById("intro-tap");

  // 로컬 muted(자동재생 정책용) + 앱 음소거(hg_muted) 중 하나라도 켜져 있으면 실제 무음.
  let localMuted = true;
  let appMuted = audio.isMuted();
  let status = "playing"; // playing | ended

  function applyVideoMuted() {
    video.muted = localMuted || appMuted;
  }
  applyVideoMuted();

  // 앱 음소거가 바뀌면 영상 볼륨도 따라간다(교사가 🔇 눌렀는데 영상만 크면 안 된다).
  audio.onMuteChange((m) => {
    appMuted = m;
    applyVideoMuted();
  });

  // 첫 프레임 디코드 전엔 숨겨 WebView 회색 플레이스홀더를 가리고, 준비되면 페이드 인.
  function markReady() {
    video.classList.add("is-ready");
  }
  video.addEventListener("loadeddata", markReady);
  video.addEventListener("playing", markReady);

  // 힌트는 로컬 muted 인 동안만 보인다.
  function updateHint() {
    soundHint.style.display = status === "playing" && localMuted ? "" : "none";
  }
  updateHint();

  // 영상 탭: 소리 켜기 (+ 자동재생이 막혀 멈춰 있으면 재생도 시도).
  // muted 를 DOM 에 직접 쓰는 이유: WebView 자동재생 정책상 제스처 핸들러 안에서
  // 바로 풀어야 소리가 붙는다. 다만 그 값은 appMuted 와 같아야 한다 — false 를
  // 박아버리면 앱이 이미 음소거일 때 교사의 🔇를 이긴다.
  tapLayer.addEventListener("click", () => {
    if (video.paused) video.play().catch(() => {});
    video.muted = appMuted; // 앱이 음소거면 탭해도 무음 유지
    localMuted = false;
    updateHint();
  });

  // 건너뛰기: 마지막 프레임 근처(끝에서 0.1초 전)로 보내 정지 → ended.
  // 정확히 duration 으로 seek 하면 프레임이 안 보일 수 있어 약간 앞으로 둔다.
  function skipSeekTarget(duration) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return Math.max(0, duration - 0.1);
  }
  skipBtn.addEventListener("click", () => {
    video.currentTime = skipSeekTarget(video.duration);
    video.pause();
    toEnded();
  });

  video.addEventListener("ended", toEnded);

  function toEnded() {
    if (status === "ended") return;
    status = "ended";
    playing.hidden = true;
    startBtn.hidden = false;
    updateHint();
  }

  // 시작하기 → auth 로 이동(페이드 아웃). Task 3 전이라 404 예상.
  startBtn.addEventListener("click", () => fadeNav(ROOT + "auth/"));
})();
