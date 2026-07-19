# Planet3 Stage2 공감 송신기 HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미션3(stage2) 동안 화면 하단 가운데에 공감 송신기 이미지를 상시 표시하고, NPC 대화 중에는 신호파 방사+글로우를 강화한다.

**Architecture:** `scorehud.js`/`minimap.js`와 같은 독립 위젯 모듈(`transmitterHud.js`)을 새로 만들고, `stages.js`가 stage2 진입 시 마운트·대화 열림/닫힘에 따라 `.active`를 토글·완료 시 제거한다. 시각효과는 전부 `style.css`의 `.efg-overlay` 스코프 CSS.

**Tech Stack:** 순수 vanilla ES 모듈 + CSS. 빌드 없음. three.js 월드 위에 얹히는 DOM HUD.

## Global Constraints

- 무빌드 MPA: `www/` 정적 파일이 곧 앱. 빌드 스텝 없음.
- 페이지 간 js/css 공유 금지. 이 작업은 `www/planet3/mission23/`만 건드린다.
- 무대 좌표계 1920×1200 절대배치. `vw/vh/dvh/svh` 금지(공통 블록 예외 아님).
- CSS 신규 규칙은 전부 `.efg-overlay` 스코프.
- 에셋 경로는 문서 기준 상대경로 `../../assets/planet3/...` (ROOT="../../").
- 에셋은 기존 `www/assets/planet3/empathy-transmitter-icon.webp` **재사용**(신규 에셋 없음).
- 자동화 테스트 프레임워크 없음 → 검증은 `npm run dev` + playwright MCP 실행/스크린샷/콘솔에러 0.
- 세션 가드: 미션 페이지는 `hg_session` 없으면 auth로 리다이렉트. playwright 검증 시 localStorage에 `hg_session` 주입 필요.
- DEV 점프: `?stage2=1` 로 stage2 직접 진입.

## File Structure

- **Create** `www/planet3/mission23/world/transmitterHud.js` — 송신기 HUD 위젯. `createTransmitterHud() -> { element, setActive(on), remove() }`.
- **Modify** `www/planet3/mission23/style.css` — `.transmitter-hud*` 규칙(idle/active) 추가.
- **Modify** `www/planet3/mission23/world/stages.js` — import·마운트·active 토글·제거 배선 + "3명" 주석 정정.

---

### Task 1: `transmitterHud.js` 모듈 + CSS (idle/active 시각)

**Files:**
- Create: `www/planet3/mission23/world/transmitterHud.js`
- Modify: `www/planet3/mission23/style.css` (연료 게이지 HUD 규칙 블록 뒤, 공통 블록 A 앞에 추가)

**Interfaces:**
- Produces: `createTransmitterHud()` → `{ element: HTMLDivElement, setActive(on: boolean): void, remove(): void }`.
  - `element`는 `.transmitter-hud` 컨테이너. 호출부가 `.efg-overlay`(=`ctx.uiRoot`)에 append.
  - `setActive(true)`는 `.active` 클래스 부여, `setActive(false)`는 제거.
  - `remove()`는 `element`를 DOM에서 제거.

- [ ] **Step 1: 모듈 작성**

Create `www/planet3/mission23/world/transmitterHud.js`:

```js
// stage2 공감 송신기 HUD: 하단 가운데 상시 표시 + 대화 중 active 애니메이션.
// scorehud.js / minimap.js 와 같은 독립 위젯 패턴 — 다른 페이지·모듈과 격리.
//   createTransmitterHud() -> { element, setActive(on), remove() }
export function createTransmitterHud() {
  const el = document.createElement('div');
  el.className = 'transmitter-hud';

  // 안테나 위쪽으로 퍼지는 신호파 링 3개(각기 다른 delay 로 순차 방사).
  const waves = document.createElement('div');
  waves.className = 'transmitter-hud__waves';
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('span');
    ring.className = 'transmitter-hud__ring';
    waves.appendChild(ring);
  }
  el.appendChild(waves);

  // stage1 충전바에서 쓴 동일 에셋 재사용.
  const img = document.createElement('img');
  img.className = 'transmitter-hud__img';
  img.src = '../../assets/planet3/empathy-transmitter-icon.webp';
  img.alt = '';
  el.appendChild(img);

  function setActive(on) { el.classList.toggle('active', !!on); }
  function remove() { el.remove(); }

  return { element: el, setActive, remove };
}
```

- [ ] **Step 2: CSS 추가**

In `www/planet3/mission23/style.css`, 연료 게이지 HUD 규칙(`.efg-overlay .fuel-cell.filled { ... }`) 바로 뒤, `/* 공통 블록 A */` 주석 앞에 추가:

```css
/* ==========================================================================
   stage2 공감 송신기 HUD — 하단 가운데 상시 표시(idle) + 대화 중(.active) 강화.
   신호파는 안테나 위쪽(=NPC 방향)으로 방사. 좌표계는 .efg-overlay(1920×1200) 기준.
   ========================================================================== */
.efg-overlay .transmitter-hud {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8; /* 캔버스 위, 대화 팝업(z:20) 아래 */
  pointer-events: none;
  user-select: none;
  --wave-op: 0.4; /* idle 신호파 최대 opacity */
  --wave-dur: 2.8s; /* idle 신호파 주기 */
}
.efg-overlay .transmitter-hud__img {
  position: relative;
  display: block;
  height: 150px;
  width: auto;
  filter:
    drop-shadow(0 0 10px rgba(255, 120, 165, 0.35))
    drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
  transition: filter 0.45s ease; /* idle↔active 글로우 완충 */
  animation: transmitter-bob 3.4s ease-in-out infinite;
}
.efg-overlay .transmitter-hud.active .transmitter-hud__img {
  filter:
    drop-shadow(0 0 24px rgba(255, 120, 165, 0.85))
    drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
}
@keyframes transmitter-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.efg-overlay .transmitter-hud__waves {
  position: absolute;
  left: 50%;
  top: 2px; /* 안테나 끝 근처 */
  width: 44px;
  height: 44px;
  transform: translateX(-50%);
}
.efg-overlay .transmitter-hud__ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px; /* transform 은 keyframe 전용이라 margin 으로 중앙정렬 */
  border-radius: 50%;
  border: 3px solid rgba(255, 120, 165, 0.9);
  opacity: 0;
  animation: transmitter-wave var(--wave-dur) ease-out infinite;
}
.efg-overlay .transmitter-hud__ring:nth-child(2) {
  animation-delay: calc(var(--wave-dur) / 3);
}
.efg-overlay .transmitter-hud__ring:nth-child(3) {
  animation-delay: calc(var(--wave-dur) / 3 * 2);
}
@keyframes transmitter-wave {
  0% { opacity: var(--wave-op); transform: scale(0.4) translateY(0); }
  100% { opacity: 0; transform: scale(2.4) translateY(-34px); } /* 위로 드리프트 = NPC 방향 */
}

.efg-overlay .transmitter-hud.active {
  --wave-op: 0.85;
  --wave-dur: 1.4s; /* 대화 중 더 빠르게 방사 */
}
```

- [ ] **Step 3: dev 서버 실행(이미 떠 있으면 생략)**

Run: `npm run dev`
Expected: `Local: http://localhost:3010` 출력. browser-sync가 `www/` 서빙.

- [ ] **Step 4: playwright — idle 상태 확인**

playwright MCP로:
1. `http://localhost:3010/planet3/mission23/index.html` 로 이동(세션 가드로 auth 리다이렉트됨).
2. `browser_evaluate` 로 세션 주입:
   `() => localStorage.setItem('hg_session', JSON.stringify({creds:{id:'dev'},profile:{},name:'테스트',progress:{},classBoard:[]}))`
3. `browser_resize` 1280×800.
4. `http://localhost:3010/planet3/mission23/index.html` 재이동.
5. 로딩 대기(3~4초) 후, 아직 stages.js 배선 전이므로 `browser_evaluate` 로 위젯을 직접 주입해 CSS만 검증:
```js
() => {
  const root = document.querySelector('.efg-overlay');
  const el = document.createElement('div');
  el.className = 'transmitter-hud __preview';
  el.innerHTML =
    '<div class="transmitter-hud__waves"><span class="transmitter-hud__ring"></span>' +
    '<span class="transmitter-hud__ring"></span><span class="transmitter-hud__ring"></span></div>' +
    '<img class="transmitter-hud__img" src="../../assets/planet3/empathy-transmitter-icon.webp" alt="">';
  root.appendChild(el);
  return 'ok';
}
```
6. `browser_take_screenshot` → 하단 가운데에 송신기 + 위로 퍼지는 분홍 신호파(연하게) 확인.

Expected: 하단 가운데(미니맵·리모콘 사이 빈 공간)에 송신기 표시, 신호파가 위로 은은하게 방사. 콘솔 에러 0.

- [ ] **Step 5: playwright — active 상태 확인**

`browser_evaluate`:
`() => { document.querySelector('.transmitter-hud.__preview').classList.add('active'); return 'active'; }`
`browser_take_screenshot` → 글로우가 밝아지고 신호파가 더 진하고 빠르게 방사되는지 확인.

그 후 미리보기 제거:
`() => { document.querySelector('.transmitter-hud.__preview')?.remove(); return 'removed'; }`

Expected: active에서 글로우/신호파가 눈에 띄게 강해짐. 콘솔 에러 0.

- [ ] **Step 6: 커밋**

```bash
git add www/planet3/mission23/world/transmitterHud.js www/planet3/mission23/style.css
git commit -m "feat(planet3/m3): stage2 공감 송신기 HUD 위젯 + idle/active CSS

하단 가운데 상시 표시 위젯(transmitterHud.js)과 신호파 방사+글로우
애니메이션(idle/active) CSS 추가. 배선은 다음 커밋.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `stages.js` 배선 (마운트 · active 토글 · 제거) + 주석 정정

**Files:**
- Modify: `www/planet3/mission23/world/stages.js`

**Interfaces:**
- Consumes: `createTransmitterHud()` from Task 1 (`{ element, setActive, remove }`).

- [ ] **Step 1: import 추가**

In `www/planet3/mission23/world/stages.js`, import 블록(현재 `createNpcs` import 아래)에 추가:

```js
import { createTransmitterHud } from './transmitterHud.js';
```

- [ ] **Step 2: 상태 변수 추가**

`createStageManager(ctx)` 상단 상태 변수 블록(`let doneGreetedId = null;` 다음 줄)에 추가:

```js
  let transmitter = null; // stage2 공감 송신기 HUD
```

- [ ] **Step 3: startStage2에서 마운트**

`startStage2()` 안에서, `npcs = loaded;` 성공 대입 직후에 추가(로드 실패 catch 전, try 블록 끝):

```js
      npcs = loaded;
      transmitter = createTransmitterHud();
      ctx.uiRoot.appendChild(transmitter.element);
```

- [ ] **Step 4: 대화 열림/닫힘에 active 토글**

`openNpcDialogue(def)` 에서 `ctx.setInputLocked(true);` 바로 다음 줄에 추가:

```js
    transmitter?.setActive(true);
```

그리고 같은 함수의 `showDialogue(...)` 콜백 안, `ctx.setInputLocked(false);` 바로 다음 줄에 추가:

```js
      transmitter?.setActive(false);
```

- [ ] **Step 5: 완료 시 제거**

`onAllNpcsDone()` 의 `showInfo(...)` 완료 콜백 안에서 `npcs = null;` 다음 줄에 추가:

```js
        transmitter?.remove();
        transmitter = null;
```

- [ ] **Step 6: "3명/세 NPC" 주석 정정**

같은 파일에서 아래 두 주석 문구를 정정(동작 변화 없음):
- `// Stage 2 — 얼어붙은 마음(NPC 3명)을 녹인다.` → `// Stage 2 — 얼어붙은 마음(NPC 4명)을 녹인다.`
- `// 세 NPC 모두 lv3 → 축하 후 미션3(=행성3 최종) 완료.` → `// NPC 4명 모두 lv3 → 축하 후 미션3(=행성3 최종) 완료.`

- [ ] **Step 7: playwright — 실제 stage2 진입 검증(idle)**

playwright MCP로(dev 서버 실행 중 가정, 세션 이미 주입됨):
1. `http://localhost:3010/planet3/mission23/index.html?stage2=1` 로 이동.
2. 로딩 대기(NPC glb 로드까지 4~6초).
3. `browser_take_screenshot` → 하단 가운데에 송신기(idle) 표시 확인. 미니맵·리모콘과 안 겹침.

Expected: stage2 화면에 송신기가 idle로 상시 표시. 콘솔 에러 0.

- [ ] **Step 8: playwright — 대화 active 검증**

NPC로 이동해 대화를 열기 어려우면(3D 운전) 다음으로 확인:
- `browser_evaluate` 로 키 입력을 흉내내 전진하거나, 여의치 않으면 이 스텝은 사용자 실기기 검증으로 넘긴다(계획상 허용).
- 최소 검증: `browser_evaluate` 로 `document.querySelector('.transmitter-hud')?.classList.add('active')` 를 임시 적용해 active 시각을 스크린샷으로 확인 후 원복.

Expected: active에서 글로우·신호파 강화. 콘솔 에러 0.

- [ ] **Step 9: 커밋**

```bash
git add www/planet3/mission23/world/stages.js
git commit -m "feat(planet3/m3): stage2 송신기 HUD 배선(마운트·active·제거)

startStage2 에서 송신기 HUD 마운트, 대화 열림/닫힘에 active 토글,
전원 완료 시 제거. NPC 3명 주석을 4명으로 정정.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 튜닝 패스 (사용자와 함께)

**Files:**
- Modify: `www/planet3/mission23/style.css` (필요 시 크기/위치/애니 강도)

- [ ] **Step 1: 사용자 확인 요청**

stage2 실행 화면(idle + 대화 active) 스크린샷을 사용자에게 제시하고, 다음을 함께 결정:
- 크기(이미지 높이 150px 기준) 조정 여부.
- 상시 표시가 이동/시야에 방해되는지 → 필요 시 크기 축소 또는 opacity 하향.
- 신호파 색/속도/글로우 강도.

- [ ] **Step 2: 합의된 값 반영 후 커밋**

조정이 있으면 `style.css` 수정 후:
```bash
git add www/planet3/mission23/style.css
git commit -m "style(planet3/m3): stage2 송신기 HUD 튜닝(크기·강도)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
조정이 없으면 이 태스크는 스킵.

---

## Self-Review

**Spec coverage:**
- 하단 가운데 상시 표시 → Task 1 CSS(`bottom:16px; left:50%`) + Task 2 마운트. ✓
- idle/active 2단계 신호파+글로우 → Task 1 CSS + Task 2 active 토글. ✓
- 신호파 위쪽(NPC 방향) 방사 → `transmitter-wave` keyframe `translateY(-34px)`. ✓
- 에셋 재사용 → Task 1 img src 기존 webp. ✓
- stages.js 배선(startStage2 마운트/openNpcDialogue 토글/onAllNpcsDone 제거) → Task 2. ✓
- DEV `?stage2=1` 공통 진입점 커버 → startStage2 마운트로 정식·DEV 모두. ✓
- dispose 자동 정리 → mountWorld `container.replaceChildren()` (기존 동작, 변경 없음). ✓
- "3명" 주석 정정 → Task 2 Step 6. ✓
- 튜닝 전제 → Task 3. ✓

**Placeholder scan:** 코드/CSS/커맨드 모두 실제 내용. TBD 없음. ✓

**Type consistency:** `createTransmitterHud` 반환 `{ element, setActive, remove }` 를 Task 2가 그대로 사용(`transmitter.element`, `transmitter.setActive`, `transmitter.remove`). `?.` 옵셔널 체이닝으로 null 가드. ✓
