# 전역 메뉴 버튼 + 팝업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전 페이지 우측 상단에 무대 안 고정 메뉴 버튼(☰)을 두고, 클릭 시 팝업(음소거 토글 + 앱 종료)을 띄운다. 기존 독립 음소거 버튼은 이 팝업으로 이관한다.

**Architecture:** 순수 vanilla 무빌드 MPA. 페이지 간 js/css 공유 금지 → 각 페이지 `script.js`/`style.css`의 "공통 블록 3-② 음소거 버튼"을 "메뉴 버튼+팝업" 블록으로 **복사 교체**. 버튼·팝업은 `#stage`(무대) 자식으로 `position:absolute` 배치 → fitStage 스케일을 같이 받는다. 무대 계열별 크기 세트: 1920 무대 = 1280 무대 × 1.5.

**Tech Stack:** Vanilla HTML/JS/CSS, Capacitor 8 (`@capacitor/app` → `App.exitApp()`), playwright MCP 검증.

## Global Constraints

- 페이지 간 js/css 공유 금지. 공통 블록은 **페이지마다 복사** (assets/·libs/만 공유).
- 스케일 계산은 반드시 `document.documentElement.clientWidth` (`window.innerWidth` 금지).
- 무대 내부는 px 절대배치. `vw/vh/dvh/svh` 금지 (히든 메뉴 오버레이만 예외).
- 텍스트 요소는 기본 `white-space: pre-line` + `word-break: keep-all`.
- 앱 종료는 `window.Capacitor?.Plugins?.App?.exitApp()` — 네이티브만 동작, 브라우저 no-op(가드 필수).
- 무대 계열: 1920×1200 무대 = 큰 세트, 1280×800 무대 = 큰 세트 ÷1.5.
- 테스트 프레임워크 없음(무빌드 MPA). "테스트" = playwright MCP 실제 실행 검증(콘솔 에러 0 + 스크린샷).
- 커밋 메시지 말미에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 교사용 히든 PIN 메뉴(공통 블록 3-③) 및 오디오 모듈(3-①)은 손대지 않는다.

## File Structure

Phase 1 (기준 구현):
- Modify: `www/planet1/mission1/script.js` — 공통 블록 3-② 교체 (현재 line 227–241)
- Modify: `www/planet1/mission1/style.css` — `.mute-btn` 규칙 교체 (현재 line 1001–1021)

Phase 2 (확산) — 같은 두 블록을 아래 페이지에 복사:
- 1920 무대 (10개 남음): `www/planet1/mission2`, `www/planet1/mission3`, `www/planet2/mission1`, `www/planet2/mission2`, `www/planet2/mission3`, `www/planet3/mission1`, `www/planet3/mission23`, `www/planet4/mission1`, `www/planet4/mission2`, `www/planet4/mission3` (각 `script.js`+`style.css`)
- 1280 무대 (7개): `www/`(intro), `www/auth`, `www/home`, `www/planet1/prologue`, `www/planet2/prologue`, `www/planet3/prologue`, `www/planet4/prologue` (각 `script.js`+`style.css`) — CSS만 작은 세트
- 특수: `www/guide/index.html` — `#stage` 없음(오디오 모듈은 있음). 뷰포트 고정 + body append, audio.* 재사용. 별도 처리(Task 4).
- 제외: `www/planet1~4/index.html` (리다이렉트 스텁, UI 없음).

---

## Task 1: planet1/mission1 기준 구현 (Phase 1)

**Files:**
- Modify: `www/planet1/mission1/script.js:227-241` (공통 블록 3-② 음소거 버튼 → 메뉴 버튼+팝업)
- Modify: `www/planet1/mission1/style.css:1001-1021` (`.mute-btn` 규칙 → 메뉴 버튼+팝업 규칙)

**Interfaces:**
- Consumes: `audio.isMuted()`, `audio.toggleMute()`, `audio.onMuteChange(fn)` (script.js 공통 블록 3-① 에 이미 존재), `document.getElementById("stage")`.
- Produces: 이후 모든 페이지가 이 **JS 블록·CSS 블록을 그대로 복사**한다. 클래스명 계약: `.hg-menu-btn`, `.hg-menu-overlay`, `.hg-menu-panel`, `.hg-menu-close`, `.hg-menu-item`(+`.hg-menu-mute`/`.hg-menu-exit`/`.hg-menu-cancel`), `.hg-menu-msg`.

- [ ] **Step 1: 기존 음소거 버튼 JS 블록 교체**

`www/planet1/mission1/script.js` 의 현재 line 227–241 (아래 원본)을

```js
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
```

다음으로 **통째 교체**한다:

```js
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
  // stage 의 탭-진행 핸들러(stage.addEventListener("click", …))로 버블링되지 않게 stopPropagation.
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
```

- [ ] **Step 2: 기존 `.mute-btn` CSS 교체 (1920 세트)**

`www/planet1/mission1/style.css` 의 현재 line 1001–1021 (`.mute-btn { … }` ~ `.mute-btn:focus-visible { opacity:1; }`)을 다음으로 **통째 교체**한다:

```css
/* ==========================================================================
   공통 블록 3-② 메뉴 버튼 + 팝업 (음소거·앱 종료) — 무대 안 배치
   ⚠ 이 페이지는 1920 무대(세트). 1280 무대 페이지는 값 ×2/3.
   ========================================================================== */
.hg-menu-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 9000;
  width: 60px;
  height: 60px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
}
.hg-menu-btn:hover,
.hg-menu-btn:focus-visible {
  opacity: 1;
}
.hg-menu-overlay {
  position: absolute;
  inset: 0;
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}
.hg-menu-overlay[hidden] {
  display: none;
}
.hg-menu-panel {
  position: relative;
  width: 520px;
  max-width: 92%;
  padding: 56px 40px 40px;
  border-radius: 22px;
  background: #201a4a;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  white-space: pre-line;
  word-break: keep-all;
}
.hg-menu-close {
  position: absolute;
  top: 15px;
  right: 20px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
}
.hg-menu-item {
  width: 100%;
  height: 96px;
  border: none;
  border-radius: 16px;
  font-family: inherit;
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  white-space: pre-line;
  word-break: keep-all;
}
.hg-menu-mute {
  background: #3a3f86;
}
.hg-menu-exit {
  background: #c0413f;
}
.hg-menu-cancel {
  background: #4a4a5e;
}
.hg-menu-msg {
  margin: 0;
  text-align: center;
  font-size: 36px;
  font-weight: 700;
  white-space: pre-line;
  word-break: keep-all;
}
```

- [ ] **Step 3: dev 서버 기동 (없으면)**

Run: `npm run dev` (background) — browser-sync 로컬 URL(예: `http://localhost:3000`) 확인. 이미 떠 있으면 생략.

- [ ] **Step 4: playwright 검증 — 세션 시드 후 미션 진입**

R2 세션 가드 때문에 `hg_session` 없이 미션 페이지로 가면 auth 로 튕긴다. 먼저 autologin 으로 세션을 만든 뒤 이동:

1. playwright `browser_navigate` → `http://localhost:3000/auth/index.html?autologin=1` (로그인 → home 이동됨)
2. `browser_navigate` → `http://localhost:3000/planet1/mission1/index.html`
3. `browser_snapshot` — 우측 상단 `☰` 버튼(`.hg-menu-btn`) 존재 확인
4. `browser_take_screenshot` — 버튼이 무대 우측 상단, 이전(44)보다 큼 확인

Expected: ☰ 버튼 표시, 콘솔 에러 0.

- [ ] **Step 5: playwright 검증 — 팝업 동작**

1. `browser_click` `.hg-menu-btn` → 팝업 열림. `browser_snapshot`으로 `🔊 소리 끄기`, `🚪 앱 종료`, `×` 확인. 스크린샷.
2. `browser_click` `.hg-menu-mute` → 라벨이 `🔇 소리 켜기`로 바뀌는지 확인(음소거 토글). `hg_muted` localStorage `"1"` 확인(`browser_evaluate` `localStorage.getItem('hg_muted')`). 다시 클릭해 원복.
3. `browser_click` `.hg-menu-exit` → 확인 뷰 전환. `앱을 종료할까요?` + `종료`/`취소` 표시. 스크린샷.
4. `browser_click` `.hg-menu-cancel` → 메뉴 첫 뷰 복귀 확인.
5. `browser_click` `.hg-menu-exit` → `종료` 클릭 → 브라우저에선 no-op(페이지 그대로, 콘솔 에러 0) 확인.
6. 다시 열어 배경(dim, `.hg-menu-overlay` 여백) 클릭 → 닫힘 확인. `×` 로도 닫힘 확인.
7. `browser_console_messages` — 에러 0 확인.

Expected: 위 전부 통과. 실패 시 크기·z-index 조정 후 재검증.

- [ ] **Step 6: 크기 미세 조정 (필요 시)**

스크린샷 상 버튼/팝업이 과하거나 작으면 Step 2 CSS 수치 조정 후 Step 4–5 재실행.

- [ ] **Step 7: 커밋**

```bash
git add www/planet1/mission1/script.js www/planet1/mission1/style.css
git commit -m "$(cat <<'EOF'
feat(menu): planet1/mission1 전역 메뉴 버튼+팝업(음소거·앱종료) 기준 구현

무대 안 배치, 기존 독립 음소거 버튼을 팝업으로 이관, 앱 종료 확인 흐름.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 나머지 1920 무대 미션 페이지 확산 (Phase 2-a)

**Files (각 script.js + style.css, 10개):**
- Modify: `www/planet1/mission2`, `www/planet1/mission3`, `www/planet2/mission1`, `www/planet2/mission2`, `www/planet2/mission3`, `www/planet3/mission1`, `www/planet3/mission23`, `www/planet4/mission1`, `www/planet4/mission2`, `www/planet4/mission3`

**Interfaces:**
- Consumes: Task 1이 확정한 JS 블록·CSS 블록(1920 큰 세트) 전체를 **문자 그대로 복사**.
- Produces: 없음(리프).

- [ ] **Step 1: 각 페이지 JS 블록 교체**

각 페이지 `script.js` 에서 "공통 블록 3-② 음소거 버튼" 블록(`.mute-btn` 생성 ~ `document.body.appendChild(muteBtn);`)을 찾아 Task 1 Step 1의 새 JS 블록으로 **통째 교체**. (모든 미션 페이지가 동일 원본을 갖는다 — Task 1에서 본 것과 같음.)

- [ ] **Step 2: 각 페이지 CSS 교체**

각 페이지 `style.css` 에서 `.mute-btn { … }` ~ `.mute-btn:hover, .mute-btn:focus-visible { opacity:1; }` 블록을 Task 1 Step 2의 새 CSS 블록(1920 큰 세트)으로 **통째 교체**.

- [ ] **Step 3: 확산 누락 점검**

Run: `grep -rl "mute-btn" www/planet*/mission*/` — 결과가 비어야 한다(모든 미션 페이지 교체 완료). 남아 있으면 그 페이지 처리.

Expected: 빈 출력.

- [ ] **Step 4: playwright 표본 검증**

특성이 다른 3개를 실제 검증: 일반 미션 `www/planet2/mission1`, 미니게임 `www/planet2/mission2`, 3D 월드 `www/planet3/mission23`. 각각 autologin 세션 후 진입 → ☰ 표시 / 팝업 열림·음소거 토글·종료 확인창·닫기 / 콘솔 에러 0 / 스크린샷.

특히 `planet3/mission23`: 메모리 상 `.efg-overlay z:100` 등 오버레이가 있으니 팝업(z 9500)이 그 위에 뜨는지, 3D 캔버스 위 ☰ 버튼이 보이는지 확인.

Expected: 3개 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add www/planet1/mission2 www/planet1/mission3 www/planet2 www/planet3/mission1 www/planet3/mission23 www/planet4/mission1 www/planet4/mission2 www/planet4/mission3
git commit -m "$(cat <<'EOF'
feat(menu): 1920 무대 미션 10개에 메뉴 버튼+팝업 확산

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 1280 무대 페이지 확산 (Phase 2-b)

**Files (각 script.js + style.css, 7개):**
- Modify: `www/`(intro: `www/script.js`+`www/style.css`), `www/auth`, `www/home`, `www/planet1/prologue`, `www/planet2/prologue`, `www/planet3/prologue`, `www/planet4/prologue`

**Interfaces:**
- Consumes: Task 1 JS 블록(그대로) + CSS 블록의 **작은 세트(÷1.5)**.
- Produces: 없음(리프).

- [ ] **Step 1: 각 페이지 JS 블록 교체**

각 페이지 `script.js`(intro 는 `www/script.js`)의 "공통 블록 3-② 음소거 버튼" 블록을 Task 1 Step 1의 새 JS 블록으로 **통째 교체**. JS는 1920/1280 공통(크기는 CSS만 다름).

- [ ] **Step 2: 각 페이지 CSS 교체 (1280 작은 세트)**

각 페이지 `style.css`(intro 는 `www/style.css`)의 `.mute-btn` 블록을 아래 **작은 세트**로 통째 교체:

```css
/* ==========================================================================
   공통 블록 3-② 메뉴 버튼 + 팝업 (음소거·앱 종료) — 무대 안 배치
   ⚠ 이 페이지는 1280 무대(작은 세트 = 1920 값 ×2/3).
   ========================================================================== */
.hg-menu-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 9000;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
}
.hg-menu-btn:hover,
.hg-menu-btn:focus-visible {
  opacity: 1;
}
.hg-menu-overlay {
  position: absolute;
  inset: 0;
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}
.hg-menu-overlay[hidden] {
  display: none;
}
.hg-menu-panel {
  position: relative;
  width: 350px;
  max-width: 92%;
  padding: 38px 28px 28px;
  border-radius: 15px;
  background: #201a4a;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  white-space: pre-line;
  word-break: keep-all;
}
.hg-menu-close {
  position: absolute;
  top: 10px;
  right: 14px;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.hg-menu-item {
  width: 100%;
  height: 64px;
  border: none;
  border-radius: 11px;
  font-family: inherit;
  font-size: 23px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  white-space: pre-line;
  word-break: keep-all;
}
.hg-menu-mute {
  background: #3a3f86;
}
.hg-menu-exit {
  background: #c0413f;
}
.hg-menu-cancel {
  background: #4a4a5e;
}
.hg-menu-msg {
  margin: 0;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  white-space: pre-line;
  word-break: keep-all;
}
```

- [ ] **Step 3: intro/auth 주의 — 오디오 모듈 존재 확인**

intro(`www/script.js`)·auth 에도 오디오 모듈(공통 블록 3-①)과 mute-btn 이 있는지 먼저 확인:
Run: `grep -l "audio.isMuted\|toggleMute" www/script.js www/auth/script.js`
둘 다 나와야 새 블록의 `audio.*` 참조가 유효하다. (없으면 그 페이지는 Task 5 방식으로 별도 처리 후보 — 하지만 앞선 조사상 둘 다 mute-btn 보유.)

Expected: 두 파일 모두 매치.

- [ ] **Step 4: 확산 누락 점검**

Run: `grep -rl "mute-btn" www/script.js www/style.css www/auth www/home www/planet*/prologue`
Expected: 빈 출력.

- [ ] **Step 5: playwright 표본 검증**

`http://localhost:3000/` (intro), `http://localhost:3000/auth/index.html`, `http://localhost:3000/home/index.html`(autologin 후), `http://localhost:3000/planet1/prologue/index.html`(autologin 후) 진입 → ☰ 표시(작은 세트, 무대 우측 상단) / 팝업 음소거·종료 동작 / 콘솔 에러 0 / 스크린샷.

home 은 기존 팝업(탐험 일지 등)과의 겹침을 육안 확인만 하고(설계상 후속 조정) 에러 없음만 확정.

Expected: 4개 통과.

- [ ] **Step 6: 커밋**

```bash
git add www/script.js www/style.css www/auth www/home www/planet1/prologue www/planet2/prologue www/planet3/prologue www/planet4/prologue
git commit -m "$(cat <<'EOF'
feat(menu): 1280 무대 페이지 7개에 메뉴 버튼+팝업 확산

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: guide 페이지 특수 처리

**Files:**
- Modify: `www/guide/index.html` (인라인 CSS+JS 단일 파일; `#stage`·fitStage·오디오 모듈 없음)

**Interfaces:**
- Consumes: guide 인라인 스크립트의 `audio.isMuted()/toggleMute()/onMuteChange(fn)`(이미 존재, line ~1107), `window.Capacitor?.Plugins?.App?.exitApp()`.
- Produces: 없음(리프).

**Note:** guide 는 `min-height:100svh` 반응형 문서형 페이지라 **`#stage` 무대 좌표계가 없다** → 메뉴 버튼·팝업은 **뷰포트 고정(`position:fixed`)**, `document.body` 에 append. 단, guide 도 **오디오 모듈(`audio.*`)은 이미 갖고 있다**(SFX용; 다만 지금까지 음소거 버튼이 노출돼 있지 않았을 뿐). 따라서 음소거 행은 미션 페이지와 **똑같이 `audio.toggleMute()` 등을 재사용**한다(이게 `hg_muted` 를 저장 → 전 페이지 공유). JS 블록은 미션판과 사실상 동일하고 `stage` 대신 `document.body` 에 붙이는 것만 다르다.

- [ ] **Step 1: guide 인라인 `<style>` 에 메뉴 CSS 추가**

`www/guide/index.html` 의 `</style>` 직전에 추가(뷰포트 고정, 작은 세트 기준):

```css
    .hg-menu-btn {
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 9000;
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.35);
      color: #fff;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      opacity: 0.6;
    }
    .hg-menu-btn:hover,
    .hg-menu-btn:focus-visible { opacity: 1; }
    .hg-menu-overlay {
      position: fixed;
      inset: 0;
      z-index: 9500;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.55);
    }
    .hg-menu-overlay[hidden] { display: none; }
    .hg-menu-panel {
      position: relative;
      width: min(350px, 90vw);
      padding: 38px 28px 28px;
      border-radius: 15px;
      background: #201a4a;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
      white-space: pre-line;
      word-break: keep-all;
    }
    .hg-menu-close {
      position: absolute;
      top: 10px;
      right: 14px;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }
    .hg-menu-item {
      width: 100%;
      height: 64px;
      border: none;
      border-radius: 11px;
      font-family: inherit;
      font-size: 23px;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      white-space: pre-line;
      word-break: keep-all;
    }
    .hg-menu-mute { background: #3a3f86; }
    .hg-menu-exit { background: #c0413f; }
    .hg-menu-cancel { background: #4a4a5e; }
    .hg-menu-msg {
      margin: 0;
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      white-space: pre-line;
      word-break: keep-all;
    }
```

- [ ] **Step 2: guide 인라인 `<script>` 에 메뉴 JS 추가 (audio.* 재사용, body append)**

`www/guide/index.html` 의 첫 `<script>` 블록 안, `audio` 정의(약 line 1107) 뒤·`</script>`(약 line 1286) 앞에 추가. 미션판과 동일하되 `stage` 대신 `document.body` 에 append:

```js
/* ==========================================================================
   공통 블록 3-② 메뉴 버튼 + 팝업 (음소거·앱 종료) — guide 전용(무대 없음 → 뷰포트 고정)
   ========================================================================== */
(function menuButton() {
  const root = document.body;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hg-menu-btn";
  btn.dataset.sfx = "none";
  btn.textContent = "☰";
  btn.setAttribute("aria-label", "메뉴 열기");
  root.appendChild(btn);

  const overlay = document.createElement("div");
  overlay.className = "hg-menu-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "메뉴");
  overlay.hidden = true;

  const panel = document.createElement("div");
  panel.className = "hg-menu-panel";
  overlay.appendChild(panel);
  root.appendChild(overlay);

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
      if (App && App.exitApp) App.exitApp();
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
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());
  overlay.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === overlay) close();
  });
})();
```

- [ ] **Step 3: playwright 검증 (음소거 크로스-페이지 지속 포함)**

1. `http://localhost:3000/guide/index.html` 진입 → ☰ 표시(우측 상단 뷰포트 고정) / 팝업에 `🔊 소리 끄기` + `🚪 앱 종료` / 종료 확인창 / 닫기 / 콘솔 에러 0 / 스크린샷.
2. 음소거 행 클릭 → 라벨 `🔇 소리 켜기` 로 바뀜 + `browser_evaluate` `localStorage.getItem('hg_muted')` === `"1"` 확인.
3. **크로스-페이지 지속 확인:** `browser_navigate` → `http://localhost:3000/home/index.html`(autologin 후) 진입 → 팝업 열어 음소거 행이 `🔇 소리 켜기`(=음소거 상태 유지) 인지 확인. 원복 위해 다시 토글.

Expected: 통과. guide 에서 바꾼 음소거가 home 에 반영됨.

- [ ] **Step 4: 커밋**

```bash
git add www/guide/index.html
git commit -m "$(cat <<'EOF'
feat(menu): guide 페이지에 메뉴 버튼+팝업(음소거·앱종료) 적용

guide는 무대·오디오 모듈이 없어 뷰포트 고정 + hg_muted 직접 조작.
음소거 설정은 hg_muted 로 전 페이지 공유.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 전체 마감 점검 + PR

- [ ] **Step 1: 잔여 mute-btn 전수 점검**

Run: `grep -rln "mute-btn" www/`
Expected: 빈 출력(모든 페이지 이관 완료). 남으면 해당 페이지 처리.

- [ ] **Step 2: 새 클래스 전수 확인**

Run: `grep -rln "hg-menu-btn" www/ | wc -l`
Expected: 19 (18 스테이지 페이지 script/style 는 별도 파일이므로 파일 수로는 script.js 18개 + guide 1 = 19개 파일에 등장; style.css 는 별도 카운트). 실제 값은 표본이 아닌 "모든 대상 페이지에 존재"를 육안 확인하는 용도.

- [ ] **Step 3: PR 생성**

```bash
git push -u origin worktree-feat+global-menu-button
gh pr create --title "feat: 전역 메뉴 버튼 + 팝업(음소거·앱 종료)" --body "$(cat <<'EOF'
## 요약
전 페이지 우측 상단에 무대 안 고정 메뉴 버튼(☰)을 추가하고, 팝업에 음소거 토글 + 앱 종료(확인 경유)를 담았다. 기존 독립 음소거 버튼은 팝업으로 이관.

## 변경
- planet1/mission1 기준 구현 → 1920 미션 10개 / 1280 페이지 7개 확산 / guide 특수 처리
- 무대 계열별 크기 세트(1920 = 1280 ×1.5), 이전보다 큰 버튼
- 앱 종료: `Capacitor.Plugins.App.exitApp()` (네이티브만)

## 검증
playwright MCP 표본 검증(intro·auth·home·미션·미니게임·3D 월드·guide) — 콘솔 에러 0.

## 후속(별도)
- Home 화면 기존 팝업과의 레이아웃 겹침 조정.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

- **Spec coverage:** 무대 안 배치(Task1 Step1-2)·계열별 크기(Task1 1920/Task3 1280)·팝업 두 항목(음소거·종료, Task1 JS)·종료 확인 흐름(renderConfirm)·기존 mute-btn 제거(블록 통째 교체 + Task5 grep)·Phase1 planet1/mission1 우선(Task1)·Phase2 확산(Task2/3)·Home 겹침 보류(Task3 Step5 노트) — 모두 태스크 존재. guide 특수 처리(Task4)는 스펙의 "모든 페이지" 이행 보강.
- **Placeholder scan:** TBD/TODO 없음. 모든 코드 스텝에 완전한 코드. Step "필요 시 조정"은 검증 기반 실제 행동으로 구체화됨.
- **Type consistency:** 클래스명(`hg-menu-btn/overlay/panel/close/item/mute/exit/cancel/msg`) JS·CSS 전 태스크 일치. `audio.isMuted/toggleMute/onMuteChange` 원본 시그니처와 일치. `renderMenu/renderConfirm/open/close` 내부 일관.
