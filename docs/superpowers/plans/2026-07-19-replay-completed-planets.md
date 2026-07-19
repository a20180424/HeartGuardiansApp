# 완료 행성 재탐험 허용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈에서 완료한 행성도 다시 탐험할 수 있게 하고, 재완료 시 진도 저장을 클라이언트에서 스킵한다.

**Architecture:** 홈 행성 버튼의 `playable` 판정을 `completed`까지 확장하고(변경 1·2), 완료 저장 함수 `completePlanet`에 "이미 완료한 행성이면 로컬 병합·서버 PUT 전부 스킵" 가드를 각 완료 지점(4개 파일)에 복사한다(변경 3). 서버 거동에 의존하지 않고 다운그레이드·게시판 중복을 원천 차단한다.

**Tech Stack:** 순수 vanilla HTML/JS/CSS 무빌드 MPA. 테스트 러너 없음 — 검증은 playwright MCP 실제 실행.

## Global Constraints

- 페이지 간 js/css 공유 금지 — 공통 로직은 **페이지마다 복사**한다(의도된 설계). `completePlanet` 가드는 4개 파일에 각각 동일하게 넣는다.
- 무대 내부 레이아웃은 px 절대배치. `vw/vh/dvh/svh` 금지.
- 페이지 이동은 상대경로(`ROOT` 접두어) `fadeNav`/`location.href`.
- UI/씬 수정 후 playwright MCP로 실제 실행 검증(스크린샷·플레이·콘솔 에러 0).
- 완료 행성 외관은 불변 — 로켓 라벨("탐험 시작!")은 unlocked에만, 완료 행성엔 `cursor: pointer`만 추가.
- DEV 점프 파라미터: home `?prog=N` 으로 진도 오버라이드.

---

### Task 1: 홈 — 완료 행성 클릭 가능

**Files:**
- Modify: `www/home/script.js` (행성 버튼 렌더 블록, 현재 L718–L752)
- Modify: `www/home/style.css` (`.home-planet--completed`, 현재 L304–L306)

**Interfaces:**
- Consumes: 기존 `planetState(id, progress)` (반환 `"completed" | "unlocked" | "locked"`), `fadeNav(href)`, `ROOT`.
- Produces: 홈 렌더 결과 — 완료 행성 버튼이 `disabled`가 아니고 클릭 시 `planetN/prologue`로 이동.

- [ ] **Step 1: `playable` 판정 확장**

`www/home/script.js`의 행성 버튼 렌더 블록에서 아래 한 줄을 바꾼다.

변경 전:
```js
    const status = planetState(id, progress);
    const playable = status === "unlocked";
```
변경 후:
```js
    const status = planetState(id, progress);
    // unlocked(다음 행성) + completed(이미 완료) 모두 탐험 가능. 이동 목적지는 동일한 prologue.
    const playable = status === "unlocked" || status === "completed";
```

- [ ] **Step 2: 로켓 라벨이 여전히 unlocked 전용인지 확인(코드 변경 없음)**

같은 블록의 아래 조건이 **그대로 `status === "unlocked"`** 인지 눈으로 확인한다. 완료 행성엔 로켓 라벨을 붙이지 않는다.
```js
    if (status === "unlocked") {
      btn.appendChild(
        el("span", {
          class: "home-planet__rocket",
          style: `background-image:url(${A}home/RocketButton.webp)`,
          text: "탐험 시작!",
        }),
      );
    }
```
그리고 클릭 핸들러가 `playable` 기준인지 확인한다(이미 그러함 — 완료 행성도 자동으로 핸들러가 붙는다):
```js
    if (playable) {
      btn.addEventListener("click", () => fadeNav(ROOT + "planet" + id + "/prologue/index.html"));
    }
```

- [ ] **Step 3: CSS 커서 변경**

`www/home/style.css`의 `.home-planet--completed` 규칙을 바꾼다.

변경 전:
```css
.home-planet--completed {
  cursor: default;
}
```
변경 후:
```css
.home-planet--completed {
  cursor: pointer;
}
```

- [ ] **Step 4: playwright로 완료 행성 클릭 검증**

`npm run dev`가 떠 있다는 전제로 playwright MCP:
1. `http://localhost:3000/home/?prog=3` 접속(포트는 browser-sync 출력에 맞춘다).
2. 스크린샷 — 행성 1·2·3은 Happy 이미지(로켓 라벨 없음), 행성 4는 unlocked(로켓 라벨 있음), 잠긴 행성 없음 확인.
3. 완료 행성(행성 2) 클릭 → URL이 `planet2/prologue/index.html`로 이동하는지 확인.
4. 뒤로/홈 재진입 후 잠긴 상태 행성(예: `?prog=1`에서 행성 3·4)은 클릭해도 이동 안 하는지 확인.
5. 콘솔 에러 0.

Expected: 완료 행성 클릭 시 프롤로그 진입, locked는 이동 없음, 콘솔 깨끗.

- [ ] **Step 5: Commit**

```bash
git add www/home/script.js www/home/style.css
git commit -m "feat(home): 완료 행성도 재탐험 가능하게 클릭 허용

- planetState completed도 playable로 포함, prologue로 이동(unlocked와 동일)
- 로켓 라벨은 unlocked 전용 유지, 완료 행성은 cursor:pointer만 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 재완료 스킵 가드 (completePlanet ×4)

**Files:**
- Modify: `www/planet1/mission3/script.js` (`function completePlanet` 정의부, 현재 L587)
- Modify: `www/planet2/mission3/script.js` (`function completePlanet` 정의부)
- Modify: `www/planet3/mission23/script.js` (`function completePlanet` 정의부)
- Modify: `www/planet4/mission3/script.js` (`function completePlanet` 정의부)

**Interfaces:**
- Consumes: 각 파일에 이미 있는 `mergeProgress(progress)`, `bumpSessionProgress(value)`, `localStorage` 키 `hg_session`(`.progress` 숫자), `hg_progress`(`{planetN:true}`).
- Produces: `completePlanet(planet)` — `planet <= currentProgress()`이면 아무 것도 하지 않고 즉시 return(로컬 병합·서버 PUT 모두 스킵). 신규 헬퍼 `currentProgress()` (반환: 0~4 숫자).

- [ ] **Step 1: `currentProgress()` 헬퍼 추가 — 4개 파일 각각**

각 파일에서 `function completePlanet(planet) {` **바로 앞**에 아래 헬퍼를 삽입한다. 4개 파일에 동일한 코드를 복사한다(공통 블록 복사 설계).

```js
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
```

- [ ] **Step 2: `completePlanet` 진입부에 가드 추가 — 4개 파일 각각**

각 파일의 `function completePlanet(planet) {` 바로 다음 줄(첫 주석/`mergeProgress` 호출 이전)에 가드를 넣는다.

변경 전(예: planet1/mission3):
```js
function completePlanet(planet) {
  // 1) 낙관적 로컬 갱신 (네트워크와 무관하게 홈 잠금 해제 즉시 반영)
  mergeProgress(planet);
  bumpSessionProgress(planet);
```
변경 후:
```js
function completePlanet(planet) {
  // 재완료 스킵: 이미 완료한(진도 이하) 행성은 로컬 병합·서버 PUT을 모두 건너뛴다.
  // 서버가 progress를 max로 처리하지 않을 수 있어, 재완료가 서버 진도를 다운그레이드하고
  // 게시판 review를 중복 저장하는 것을 클라이언트에서 원천 차단한다.
  if (planet <= currentProgress()) return;

  // 1) 낙관적 로컬 갱신 (네트워크와 무관하게 홈 잠금 해제 즉시 반영)
  mergeProgress(planet);
  bumpSessionProgress(planet);
```

나머지 3개 파일(`planet2/mission3`, `planet3/mission23`, `planet4/mission3`)도 각 파일의 `completePlanet` 첫 본문 주석 문구는 파일마다 다를 수 있으니, **가드 4줄(주석 3줄 + `if` 1줄)을 함수 본문 맨 앞에** 동일하게 삽입한다.

- [ ] **Step 3: 4개 파일 가드가 동일한지 확인**

`grep`으로 4개 파일 모두 가드가 들어갔는지 확인한다.

Run:
```bash
grep -rn "planet <= currentProgress()" www/planet1/mission3/script.js www/planet2/mission3/script.js www/planet3/mission23/script.js www/planet4/mission3/script.js
```
Expected: 4개 파일 각각 1건씩, 총 4줄 출력.

- [ ] **Step 4: playwright로 재완료 스킵 검증(대표 1개 행성 E2E)**

`npm run dev` 전제, playwright MCP로 **이미 완료된 행성을 재플레이**해 진도가 안 바뀌는지 확인한다. 가장 짧은 경로를 쓴다 — home `?prog=3`으로 시작해 완료 행성 하나를 재완료 지점까지 플레이.

1. localStorage를 진도 3 상태로 세팅: `http://localhost:3000/home/?prog=3` 접속 후, playwright `browser_evaluate`로
   ```js
   localStorage.setItem("hg_progress", JSON.stringify({planet1:true,planet2:true,planet3:true}));
   const s = JSON.parse(localStorage.getItem("hg_session")||"{}"); s.progress = 3; localStorage.setItem("hg_session", JSON.stringify(s));
   ```
   (hg_session이 없으면 auth `?autologin=1`로 먼저 로그인.)
2. `browser_evaluate`로 완료 행성 재완료를 직접 호출하는 대신, 실제 미션 완료 버튼 경로로 검증하려면 완료 지점 페이지로 점프(히든 메뉴 또는 URL). 최소 검증은 완료 지점의 `completePlanet(2)` 호출 후 상태 확인:
   ```js
   // 완료 지점 페이지(예: planet2/mission3)에서 실행되는 completePlanet(2)가 스킵되는지.
   // 대리 검증: 홈 진도 계산 입력값이 그대로인지 확인.
   const before = localStorage.getItem("hg_progress");
   // completePlanet(2) 호출은 미션 완료 버튼으로 트리거됨(플레이).
   ```
3. 완료 행성(행성 2)을 프롤로그→미션 순서로 플레이해 **완료 버튼**을 누른 뒤 홈으로 복귀.
4. 홈에서 스크린샷 — 공감 에너지 `75%`, 하트 3개, 닉네임 `Lv4 연결의 가디언`, 하티 멘트가 진도 3 그대로인지 확인(진도 미갱신).
5. `browser_evaluate`로 `localStorage.getItem("hg_progress")`와 `hg_session.progress`가 재플레이 전과 동일한지 확인.
6. 네트워크 탭/콘솔에 `PUT /api/progress/2` 요청이 **발생하지 않았는지** 확인(가드가 서버 PUT도 막음). 콘솔 에러 0.

Expected: 재완료해도 진도(로컬 + 표시)가 3으로 불변, `PUT /api/progress/2` 미발생.

- [ ] **Step 5: 회귀 — 신규 행성 완료는 정상 증가**

1. home `?prog=2` 상태(hg_progress planet1·2)에서 unlocked 행성 3을 플레이해 완료.
2. 완료 후 홈 복귀 시 진도가 3으로 **증가**하고 `PUT /api/progress/3`가 발생하는지 확인.

Expected: 신규 행성 완료는 진도 증가 + 서버 PUT 정상(회귀 없음).

- [ ] **Step 6: Commit**

```bash
git add www/planet1/mission3/script.js www/planet2/mission3/script.js www/planet3/mission23/script.js www/planet4/mission3/script.js
git commit -m "feat(progress): 이미 완료한 행성 재완료 시 진도 저장 스킵

completePlanet 진입부에 planet<=currentProgress() 가드 추가(4개 완료 지점 복사).
로컬 병합·서버 PUT 모두 스킵해 서버 진도 다운그레이드·게시판 review 중복 차단.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- 변경 1(완료 행성 클릭) → Task 1 Step 1–2. ✓
- 변경 2(cursor:pointer) → Task 1 Step 3. ✓
- 변경 3(재완료 스킵 가드 ×4) → Task 2 Step 1–3. ✓
- 검증 1(완료 행성 클릭 이동) → Task 1 Step 4. ✓
- 검증 2(재완료 진도 불변) → Task 2 Step 4. ✓
- 검증 3(신규 행성 진도 증가 회귀) → Task 2 Step 5. ✓
- 검증 4(locked 클릭 불가) → Task 1 Step 4-4. ✓
- 검증 5(콘솔 에러 0) → 각 검증 스텝에 포함. ✓

**Placeholder scan:** 코드 스텝에 실제 코드 포함, TBD/TODO 없음. Task 2 Step 4-2는 검증 접근 설명이라 실행 코드가 대리 검증임을 명시 — 실제 트리거는 Step 4-3의 플레이. ✓

**Type consistency:** `currentProgress()`(반환 0~4 숫자)는 Task 2 전체에서 일관. `planetState`/`fadeNav`/`ROOT`는 기존 시그니처 그대로 사용. `playable` 판정 확장은 기존 변수 재사용. ✓
