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
   API 클라이언트 (src/lib/api.ts + auth.ts + progress.ts + classBoard.ts 이식)
   --------------------------------------------------------------------------
   이 API는 세션 토큰이 없다. 보호된 요청은 매번 자격증명을 x-* 헤더로 싣는다
   (x-school-id, x-grade, x-class, x-number, x-pin). 자격증명은 localStorage
   "hg.credentials" 에 보관하고, hg_session 이 활성 세션을 담는다.
   ========================================================================== */
// .env 의 VITE_API_URL (PUBLIC — 커밋 안전). no-build 라 소스 상수로 둔다.
const API_BASE = "https://heartguardians-api.a20180424.workers.dev";
const CRED_KEY = "hg.credentials"; // 영속 자격증명 (intro 가 지우지 않음 → 재방문 자동 확인)

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
  set(creds) {
    try {
      localStorage.setItem(CRED_KEY, JSON.stringify(creds));
    } catch (_) {
      /* 무시 */
    }
  },
  clear() {
    try {
      localStorage.removeItem(CRED_KEY);
    } catch (_) {
      /* 무시 */
    }
  },
};

function getSchools() {
  return apiRequest("/api/schools");
}
function signup(body) {
  return apiRequest("/api/auth/signup", { method: "POST", body });
}
async function verify(creds) {
  const profile = await apiRequest("/api/auth/verify", { method: "POST", body: creds });
  credentialStore.set(creds); // 성공 시 자격증명 영속 저장
  return profile;
}
function getProgress() {
  return apiRequest("/api/progress", { headers: authHeaders(credentialStore.get()) });
}
function getClassBoard() {
  return apiRequest("/api/class-board", { headers: authHeaders(credentialStore.get()) });
}

/** verify 실패 원인 분류: 4xx → "auth", 5xx/네트워크 → "network". */
function classifyVerifyError(err) {
  if (err && err.name === "ApiError") return err.status >= 500 ? "network" : "auth";
  return "network";
}

/* ==========================================================================
   세션 저장 — hg_session 형식 확정 (R2). 이후 태스크가 이 형식을 읽는다.
   --------------------------------------------------------------------------
   이 API 는 토큰이 없으므로 R2 표의 `token` 자리에 자격증명(creds)을 둔다 —
   보호된 페이지가 hg_session 하나만 읽어도 API 호출용 x-* 헤더를 만들 수 있게.
   classBoard 는 [planet1_url, planet2_url, planet3_url, planet4_url] 배열(없으면 각 null).
   progress(0~4)는 서버 권위값을 담고, 동시에 hg_progress(행성 불리언)를 이 값으로
   덮어쓴다 — 로그인 시점엔 서버가 권위라 교사의 서버 리셋이 기기에 반영된다.
   (PUT 실패로 서버가 못 받은 진도는 hg_pending_sync 재전송이 로그인 직전에 복구.)
   ========================================================================== */
function saveSession(creds, profile, progress, board) {
  const classBoard = board
    ? [
        board.planet1_url || null,
        board.planet2_url || null,
        board.planet3_url || null,
        board.planet4_url || null,
      ]
    : [null, null, null, null];
  const session = {
    creds: creds, // 토큰 대체 — 보호된 페이지의 x-* 헤더 재료
    profile: profile, // { id, name, grade, class, number, gender, school }
    name: profile.name, // R2 표의 top-level name (편의 미러)
    progress: progress, // 0~4, 서버 권위값
    classBoard: classBoard, // [url|null × 4] = planet1~4
  };
  try {
    localStorage.setItem("hg_session", JSON.stringify(session));
  } catch (_) {
    /* 무시 */
  }
  overwriteProgress(progress);
  return session;
}

/** 서버 progress(숫자 0~4)로 hg_progress(행성 불리언)를 **덮어쓴다** — 로그인 시점은 서버가 권위.
 *  상향 병합이 아니라 덮어쓰기인 이유: 교사가 서버에서 진도를 리셋하면 다음 로그인에 기기에도
 *  반영돼야 한다. PUT 실패로 서버가 못 받은 진도는 syncPendingProgress 가 로그인 직전에 재전송해
 *  여기서 받는 서버값에 이미 포함된다. (플레이 중에는 completePlanet 이 상향 병합만 하므로
 *  세션 중 진도가 깎이는 일은 없다.) */
function overwriteProgress(progress) {
  const next = {};
  for (let n = 1; n <= 4; n++) {
    if (n <= progress) next["planet" + n] = true;
  }
  try {
    localStorage.setItem("hg_progress", JSON.stringify(next));
  } catch (_) {
    /* 무시 */
  }
}

/** 행성 완료 PUT 이 실패했던 기록(hg_pending_sync)을 로그인 때 재전송한다.
 *  성공한 행성만 기록에서 지운다 — 곧이어 받는 서버 progress 에 반영되게 하기 위함.
 *  재전송이 실패해도 로그인은 막지 않는다(기록이 남아 다음 로그인에 재시도). */
async function syncPendingProgress(creds) {
  let pending = {};
  try {
    pending = JSON.parse(localStorage.getItem("hg_pending_sync") || "{}") || {};
  } catch (_) {
    pending = {};
  }
  for (let n = 1; n <= 4; n++) {
    if (!pending["planet" + n]) continue;
    try {
      await apiRequest("/api/progress/" + n, {
        method: "PUT",
        headers: authHeaders(creds),
        body: { review: "행성 " + n + " 클리어" },
      });
      delete pending["planet" + n];
      console.log("[progress] 보류 진도 재전송 성공: 행성", n);
    } catch (e) {
      console.warn("[progress] 보류 진도 재전송 실패 — 다음 로그인에 재시도: 행성", n, e);
    }
  }
  try {
    localStorage.setItem("hg_pending_sync", JSON.stringify(pending));
  } catch (_) {
    /* 무시 */
  }
}

/* ==========================================================================
   auth 씬 로직 (src/scenes/auth/auth.logic.ts 이식)
   ========================================================================== */
/** 숫자만 남기고 최대 4자리로 자른다. */
function sanitizePin(raw) {
  return raw.replace(/\D/g, "").slice(0, 4);
}
/** 폼 완성 여부. signup 이면 이름·비밀번호 확인 일치·성별까지 본다. */
function isComplete(s, mode, name) {
  const base = s.grade !== null && s.class !== null && s.number !== null && s.pin.length === 4;
  if (mode === "login") return base;
  return base && name.trim().length > 0 && s.pin === s.pinConfirm && s.gender !== null;
}
function toCredentials(s, schoolId) {
  return {
    school_id: schoolId,
    grade: s.grade == null ? 0 : s.grade,
    class: s.class == null ? 0 : s.class,
    number: s.number == null ? 0 : s.number,
    pin: s.pin,
  };
}
/** 표기 변주(공백·특수문자·초등학교 접미사)를 흡수해 핵심 학교명만 남긴다. */
function normalizeSchool(s) {
  return String(s ?? "")
    .replace(/\s+/g, "")               // 공백 전부 제거
    .replace(/[^가-힣a-zA-Z0-9]/g, "") // 한글·영숫자 외 특수문자 제거
    .replace(/초등학교$/, "")
    .replace(/초등$/, "")
    .replace(/초$/, "");
}
/** 정규화 정확 일치가 딱 하나면 그 학교, 아니면 null(0개=없음, 2개↑=모호). */
function matchSchool(text, schools) {
  const key = normalizeSchool(text);
  if (!key) return null;
  const hits = schools.filter((s) => normalizeSchool(s.name) === key);
  return hits.length === 1 ? hits[0] : null;
}

/* ==========================================================================
   auth 씬 렌더링 (src/scenes/auth/index.tsx + 컴포넌트 이식)
   ========================================================================== */
(function auth() {
  const panel = document.getElementById("auth-panel");

  // 상태 (React useState 대응)
  let schools = [];
  let submitting = false;
  let welcomeName = "";

  // 작은 DOM 헬퍼
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
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  // 학교 목록은 로그인/회원가입 진입 시 필요 — 처음 한 번 불러온다.
  getSchools()
    .then((list) => {
      schools = Array.isArray(list) ? list : [];
    })
    .catch(() => {
      schools = [];
    });

  /* ---- 로그인 성공 공통 처리: 세션 채우고 Home 으로 (index.tsx enter()) ---- */
  async function enter(creds) {
    const profile = await verify(creds); // 성공 시 자격증명 저장
    // PUT 실패로 서버가 못 받은 진도가 있으면 먼저 재전송 — 아래 getProgress 가 반영된 값을 받는다.
    await syncPendingProgress(creds);
    // progress 는 필수, board 는 부가정보라 실패해도 null 로 진행.
    const [prog, board] = await Promise.all([getProgress(), getClassBoard().catch(() => null)]);
    const progress = prog && typeof prog.progress === "number" ? prog.progress : 0;
    console.log("[progress] 서버에서 받아온 progress:", progress);
    console.log("[class-board] 서버에서 받아온 board:", board);
    saveSession(creds, profile, progress, board);
    fadeNav(ROOT + "home/index.html");
  }

  /* ---- 화면: checking (저장된 자격증명 자동 점검) ---- */
  function showChecking() {
    panel.innerHTML = "";
    panel.appendChild(el("p", { class: "auth-panel__title", text: "잠시만요…" }));
  }

  /* ---- 화면: welcome (자동/로그인 성공 후 확인) ---- */
  function showWelcome() {
    panel.innerHTML = "";
    const title = el("p", { class: "auth-panel__title", html: welcomeName + "님<br>환영해요!" });
    const cont = el("button", { type: "button", class: "btn auth-bigbtn", text: "계속하기" });
    const sw = el("button", { type: "button", class: "btn ghost auth-bigbtn", text: "다른 계정으로 로그인" });
    function setBusy(b) {
      submitting = b;
      cont.disabled = b;
      sw.disabled = b;
      cont.textContent = b ? "잠시만요…" : "계속하기";
    }
    cont.addEventListener("click", async () => {
      const creds = credentialStore.get();
      if (!creds) return showChooser();
      setBusy(true);
      try {
        await enter(creds);
      } catch (_) {
        setBusy(false);
        showLogin("인터넷 연결을 확인해 주세요.");
      }
    });
    sw.addEventListener("click", () => {
      logout();
      try {
        localStorage.removeItem("hg_session");
      } catch (_) {
        /* 무시 */
      }
      showLogin(null);
    });
    panel.appendChild(el("div", { class: "auth-chooser" }, [title, cont, sw]));
  }

  /* ---- 화면: chooser (로그인 / 회원가입) ---- */
  function showChooser() {
    panel.innerHTML = "";
    const title = el("p", { class: "auth-panel__title", text: "어떻게 시작할까요?" });
    const login = el("button", { type: "button", class: "btn auth-bigbtn", text: "로그인" });
    const signupBtn = el("button", { type: "button", class: "btn ghost auth-bigbtn", text: "회원가입" });
    login.addEventListener("click", () => showLogin(null));
    signupBtn.addEventListener("click", () => showSignup(null));
    panel.appendChild(el("div", { class: "auth-chooser" }, [title, login, signupBtn]));
  }

  /* ---- 폼 화면 (login / signup) — CredentialForm.tsx 이식 ---- */
  const GRADES = Array.from({ length: 6 }, (_, i) => i + 1);
  const CLASSES = Array.from({ length: 10 }, (_, i) => i + 1);
  const NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

  // 심사(스토어 리뷰)용 계정 — 로그인 폼에 입력하는 값과 동일. 전용 데모 계정이라 클라이언트 노출 허용.
  const REVIEW_ACCOUNT = { school: "테스트", grade: 3, class: 3, number: 3, pin: "3333" };

  function showLogin(errorMsg) {
    renderForm("login", errorMsg);
  }
  function showSignup(errorMsg) {
    renderForm("signup", errorMsg);
  }

  function renderForm(mode, errorMsg) {
    submitting = false;
    const form = { grade: 3, class: null, number: null, pin: "", pinConfirm: "", gender: null };
    let name = "";
    let schoolText = "";

    panel.innerHTML = "";

    const back = el("button", { type: "button", class: "btn ghost auth-back", text: "← 뒤로" });
    back.addEventListener("click", () => showChooser());

    // 학교 직접 입력 (목록 미노출 — 제출 시 matchSchool로 대조).
    const schoolInput = el("input", {
      class: "field__input",
      type: "text",
      placeholder: "학교 이름",
      maxlength: "30",
    });
    schoolInput.addEventListener("input", () => {
      schoolText = schoolInput.value;
      updateValidity();
    });
    const schoolField = el("label", { class: "field field--school" }, [
      el("span", { class: "field__label", text: "학교" }),
      schoolInput,
    ]);

    // 이름 (signup)
    let nameField = null;
    if (mode === "signup") {
      const nameInput = el("input", {
        class: "field__input",
        type: "text",
        placeholder: "이름",
        maxlength: "20",
      });
      nameInput.addEventListener("input", () => {
        name = nameInput.value;
        updateValidity();
      });
      nameField = el("label", { class: "field field--name" }, [
        el("span", { class: "field__label", text: "이름" }),
        nameInput,
      ]);
    }

    // 성별 토글 (signup)
    let genderField = null;
    let genderBtns = {};
    if (mode === "signup") {
      const wrap = el("div", { class: "gender-toggle" });
      ["male", "female"].forEach((g) => {
        const b = el("button", {
          type: "button",
          class: "gender-toggle__btn",
          "aria-pressed": "false",
          text: g === "male" ? "남자" : "여자",
        });
        b.addEventListener("click", () => {
          form.gender = g;
          ["male", "female"].forEach((k) => {
            const on = k === g;
            genderBtns[k].classList.toggle("is-selected", on);
            genderBtns[k].setAttribute("aria-pressed", on ? "true" : "false");
          });
          updateValidity();
        });
        genderBtns[g] = b;
        wrap.appendChild(b);
      });
      genderField = el("div", { class: "field field--gender", role: "group", "aria-label": "성별" }, [
        el("span", { class: "field__label", text: "성별" }),
        wrap,
      ]);
    }

    // 숫자 select (학년/반/번호). defaultValue 주면 그 값을 미리 선택.
    function numSelect(key, label, options, defaultValue) {
      const sel = el("select", { class: "field__select" });
      const placeholder = el("option", { value: "", disabled: "", text: "선택" });
      if (defaultValue == null) placeholder.setAttribute("selected", "");
      sel.appendChild(placeholder);
      options.forEach((n) => {
        const o = el("option", { value: String(n), text: String(n) });
        if (defaultValue != null && n === defaultValue) o.setAttribute("selected", "");
        sel.appendChild(o);
      });
      sel.value = defaultValue == null ? "" : String(defaultValue);
      sel.addEventListener("change", () => {
        form[key] = sel.value === "" ? null : Number(sel.value);
        updateValidity();
      });
      return el("label", { class: "field field--select" }, [
        el("span", { class: "field__label", text: label }),
        sel,
      ]);
    }

    // PIN 입력
    function pinInput(key, label, placeholder) {
      const input = el("input", {
        class: "field__input",
        type: "text",
        inputmode: "numeric",
        pattern: "[0-9]*",
        maxlength: "4",
        placeholder: placeholder,
      });
      input.addEventListener("input", () => {
        const clean = sanitizePin(input.value);
        form[key] = clean;
        if (input.value !== clean) input.value = clean;
        updateValidity();
      });
      return el("label", { class: "field field--pin" }, [
        el("span", { class: "field__label", text: label }),
        input,
      ]);
    }

    const row1Kids = [schoolField];
    if (mode === "signup") {
      row1Kids.push(nameField);
      row1Kids.push(genderField);
    }
    const row1 = el("div", { class: "field-row" }, row1Kids);
    const row2 = el("div", { class: "field-row" }, [
      numSelect("grade", "학년", GRADES, 3),
      numSelect("class", "반", CLASSES),
      numSelect("number", "번호", NUMBERS),
    ]);
    const row3Kids = [pinInput("pin", "비밀번호", "숫자 4자리")];
    if (mode === "signup") row3Kids.push(pinInput("pinConfirm", "비밀번호 확인", "다시 입력"));
    const row3 = el("div", { class: "field-row" }, row3Kids);

    const mismatchP = el("p", { class: "auth-error", text: "비밀번호가 일치하지 않아요." });
    mismatchP.style.display = "none";
    const errorP = el("p", { class: "auth-error" });
    errorP.style.display = "none";
    function setError(msg) {
      if (msg) {
        errorP.textContent = msg;
        errorP.style.display = "";
      } else {
        errorP.style.display = "none";
      }
    }
    setError(errorMsg);

    const submit = el("button", {
      type: "button",
      class: "btn auth-submit",
      text: mode === "login" ? "로그인" : "가입하기",
    });

    function updateValidity() {
      const mismatch =
        mode === "signup" && form.pinConfirm.length === 4 && form.pin !== form.pinConfirm;
      mismatchP.style.display = mismatch ? "" : "none";
      const canSubmit = !submitting && schoolText.trim() !== "" && isComplete(form, mode, name);
      submit.disabled = !canSubmit;
    }

    function setSubmitting(b) {
      submitting = b;
      submit.textContent = b ? "잠시만요…" : mode === "login" ? "로그인" : "가입하기";
      updateValidity();
    }

    submit.addEventListener("click", async () => {
      if (submit.disabled) return;
      const school = matchSchool(schoolText, schools);
      if (!school) {
        setError(
          schools.length === 0
            ? "인터넷 연결을 확인해 주세요."
            : "학교 이름을 찾을 수 없어요. 다시 확인해 주세요.",
        );
        return;
      }
      const creds = toCredentials(form, school.id);
      const trimmedName = name.trim();
      setError(null);
      setSubmitting(true);
      if (mode === "login") {
        try {
          const profile = await verify(creds);
          audio.play("title");
          welcomeName = profile.name;
          showWelcome();
        } catch (err) {
          audio.play("wrong");
          setSubmitting(false);
          setError(
            classifyVerifyError(err) === "auth"
              ? "번호나 비밀번호가 맞지 않아요. 선생님께 물어보세요."
              : "인터넷 연결을 확인해 주세요.",
          );
        }
      } else {
        try {
          await signup({ ...creds, name: trimmedName, gender: form.gender });
          const profile = await verify(creds);
          audio.play("title");
          welcomeName = profile.name;
          showWelcome();
        } catch (err) {
          audio.play("wrong");
          setSubmitting(false);
          setError(
            classifyVerifyError(err) === "auth"
              ? "이미 등록된 번호이거나 입력이 올바르지 않아요. 선생님께 물어보세요."
              : "인터넷 연결을 확인해 주세요.",
          );
        }
      }
    });

    const formEl = el("div", { class: "auth-form" }, [
      row1,
      row2,
      row3,
      mismatchP,
      errorP,
      submit,
    ]);
    const head = el("div", { class: "auth-form-head" }, [back]);
    if (mode === "login") {
      const reviewBtn = el("button", {
        type: "button",
        class: "btn ghost auth-review",
        text: "심사용 계정",
      });
      reviewBtn.dataset.sfx = "none";
      reviewBtn.addEventListener("click", async () => {
        if (submitting) return;
        const school = matchSchool(REVIEW_ACCOUNT.school, schools);
        if (!school) {
          setError(
            schools.length === 0
              ? "인터넷 연결을 확인해 주세요."
              : "심사용 계정 학교를 찾을 수 없어요.",
          );
          return;
        }
        setError(null);
        setSubmitting(true);
        try {
          // 일반 로그인 submit(login 분기)과 동일 흐름 — 이후 환영 화면 → 홈.
          const profile = await verify(toCredentials(REVIEW_ACCOUNT, school.id));
          audio.play("title");
          welcomeName = profile.name;
          showWelcome();
        } catch (err) {
          audio.play("wrong");
          setSubmitting(false);
          setError(
            classifyVerifyError(err) === "auth"
              ? "심사용 계정 로그인에 실패했어요."
              : "인터넷 연결을 확인해 주세요.",
          );
        }
      });
      head.appendChild(reviewBtn);
    }
    panel.appendChild(el("div", { class: "auth-form-wrap" }, [head, formEl]));
    updateValidity();
  }

  function logout() {
    credentialStore.clear();
  }

  /* ---- checking 자동 점검 (index.tsx useEffect) ----
     저장된 자격증명이 있으면 verify 로 확인. 성공→welcome, 자격증명 문제→삭제 후 chooser,
     통신 문제→자격증명 유지하고 chooser. ---- */
  function autoCheck() {
    const creds = credentialStore.get();
    if (!creds) return showChooser();
    showChecking();
    verify(creds)
      .then((profile) => {
        welcomeName = profile.name;
        showWelcome();
      })
      .catch((err) => {
        if (classifyVerifyError(err) === "auth") logout();
        showChooser();
      });
  }

  /* ---- DEV: ?autologin=1 — dev-config.js 의 테스트 계정으로 바로 로그인해 홈까지. ---- */
  const params = new URLSearchParams(window.location.search);
  if (params.get("autologin") === "1" && window.HG_DEV && window.HG_DEV.creds) {
    showChecking();
    enter(window.HG_DEV.creds).catch((err) => {
      console.warn("[autologin] 실패 — 일반 흐름으로 전환", err);
      autoCheck();
    });
  } else {
    autoCheck();
  }
})();
