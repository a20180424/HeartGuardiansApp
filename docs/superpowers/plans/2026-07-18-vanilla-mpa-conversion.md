# Vanilla MPA 전환 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React 19 + Vite SPA를 "초보자가 씬마다 독립적으로 만들어 이어붙인 것 같은" 순수 vanilla HTML/JS/CSS 무빌드 MPA로 전환하고, Capacitor APK 파이프라인을 유지한다.

**Architecture:** `www/`에 씬(행성은 미션)마다 독립 폴더(`index.html`+`script.js`+`style.css`)를 만들고 `location.href`로 이동하는 MPA. 상태는 전부 `localStorage`. 공통 코드는 파일 공유 없이 페이지마다 복사(중복 허용이 설계 목표). 변환 기간 동안 기존 React 앱(`src/`)과 공존하다가 마지막에 제거.

**Tech Stack:** vanilla HTML/JS/CSS, three.js(파일 복사본), Capacitor 8(유지), browser-sync(개발 서버 전용)

## Global Constraints

- 최종 실행 환경: Galaxy Tab A9+ 전체화면(immersive) APK. **1280×800 CSS px 고정 무대** (CLAUDE.md 기준 유지).
- `vw/vh/dvh/svh` 금지 — 무대 내부는 px 절대배치 (기존 규칙 그대로).
- 미션 페이지는 기존 관례에 따라 **1920×1200 무대**를 쓸 수 있음 (그 페이지 안에서만).
- TypeScript·vitest·React 코드 신규 작성 금지. `www/` 안은 순수 `.html` `.js` `.css`만.
- `www/` 안의 페이지는 **다른 폴더의 js/css를 import/link 하지 않는다.** 필요하면 복사한다. 유일한 공유는 `www/assets/`(이미지·영상·오디오)와 `www/libs/`(three.module.js 등 외부 라이브러리 원본).
- 폴더 구조·중복은 초보자스럽게, **코드 자체는 깔끔하게** (변수명·로직은 정상 품질).
- 씬 하나 변환할 때마다: playwright MCP로 실제 동작 검증 → 커밋. 브랜치+PR 워크플로우 (사용자가 머지).
- 변환 완료 전까지 `src/` React 앱은 건드리지 않는다 (main은 항상 동작 상태).
- 기능은 기존과 100% 동일 목표 (연출·사운드·진도 저장·교사 히든 메뉴 포함).
- 에셋은 `public/assets` → `www/assets`로 **이동**(중복 금지 — APK 크기는 에셋이 지배).

---

## 공통 규약 (모든 씬 태스크가 따른다)

### R1. 페이지 뼈대 — FixedStage 인라인

모든 페이지는 아래 뼈대에서 시작한다 (1280×800 씬 기준; 1920×1200 미션 페이지는 숫자만 교체):

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>하트가디언즈 — (씬 이름)</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="stage">
      <!-- 씬 내용: 1280×800 좌표계, px 절대배치 -->
    </div>
    <script src="script.js"></script>
  </body>
</html>
```

```css
/* style.css 상단 공통(페이지마다 복사) */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
#stage {
  position: absolute; left: 50%; top: 50%;
  width: 1280px; height: 800px;
  transform-origin: center;
  overflow: hidden;
}
```

```js
// script.js 상단 공통(페이지마다 복사)
function fitStage() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  document.getElementById("stage").style.transform =
    `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener("resize", fitStage);
fitStage();
```

### R2. localStorage 스키마

| 키 | 값 | 쓰는 곳 | 읽는 곳 |
| --- | --- | --- | --- |
| `hg_session` | `{ token, name, classBoard: [url,url,url], ... }` JSON | auth 로그인 성공 시 | 전 페이지 (세션 가드) |
| `hg_progress` | `{ planet1: true, ... }` JSON | 각 행성 마지막 미션 완료 시 | home (진도 표시) |
| `hg_muted` | `"1"` / 없음 | 음소거 버튼 | 전 페이지 |

- intro(`www/index.html`)는 **앱 시작 초기화 지점**: 세션 관련 임시 키를 여기서 정리한다 (진도는 유지 — 기존 동작과 동일하게 서버/로컬 병합).
- **표시 진도 = `max(hg_session.progress, hg_progress)`** (Task 4 확정): home은 두 키를 병합해 표시하므로 행성 완료 태스크가 어느 키를 갱신하든 반영된다. `hg_progress` 형식은 auth의 mergeProgress가 확정한 `{ planetN: true }` — 소비처는 이 형식을 따를 것.
- intro·auth 이외 페이지는 최상단에 세션 가드: `if (!localStorage.getItem("hg_session")) location.href = "<상대경로>/auth/";`
- 정확한 필드 구성은 각 태스크에서 [src/lib/session.ts](../../../src/lib/session.ts), [src/lib/progress.ts](../../../src/lib/progress.ts), [src/lib/classBoard.ts](../../../src/lib/classBoard.ts)를 읽고 맞춘다.

### R3. 페이지 간 이동

- 상대경로 링크만: `location.href = "../mission2/"` 식.
- 점프 파라미터는 쿼리로 유지: `mission2/?step=5` 등 (씬마다 DEV 점프 지원 필수 — HMR 부재 완화책).
- React의 Keyed 리마운트 트릭은 MPA에선 불필요 (모든 이동이 새 로드).

### R4. 페이지마다 복사해 넣는 공통 블록 3종

각 씬 태스크는 아래 3종을 그 페이지의 `script.js`/`style.css`에 복사해 넣는다.
원본 로직: [HiddenMenuOverlay.tsx](../../../src/lib/HiddenMenuOverlay.tsx), [useCornerLongPress.ts](../../../src/lib/useCornerLongPress.ts), [MuteButton.tsx](../../../src/lib/MuteButton.tsx), [audio.ts](../../../src/lib/audio.ts), [uiSfx.ts](../../../src/lib/uiSfx.ts). **Task 2(intro)에서 vanilla 버전을 처음 작성·검증하고, 이후 태스크는 그 검증본을 복사**한다 (같은 코드를 다시 발명하지 말 것).

1. **히든 메뉴(교사용)**: 구석 롱프레스 → 씬/미션 점프 오버레이. MPA에선 각 항목이 `location.href` 링크.
2. **음소거 버튼**: `hg_muted` 토글 + 페이지 내 오디오 mute.
3. **효과음 헬퍼**: 버튼 `data-sfx` 속성 → 효과음 재생. 첫 pointerdown에서 unlock.

### R5. Android 뒤로가기 무시 (전 페이지)

Capacitor WebView에서만 동작, 브라우저에선 no-op:

```js
// 하드웨어 뒤로가기 무시 (키오스크형 앱 — App.tsx의 기존 정책 유지)
if (window.Capacitor?.Plugins?.App) {
  window.Capacitor.Plugins.App.addListener("backButton", () => {});
}
```

### R6. 검증 절차 (모든 씬 태스크의 마지막 단계)

1. `npm run dev` (browser-sync)가 떠 있는지 확인, 아니면 백그라운드로 실행.
2. playwright MCP로 해당 페이지 접속 → 스크린샷 → 기존 React 씬과 시각 비교.
3. 씬의 핵심 인터랙션을 끝까지 실제 조작 (미션이면 클리어까지, DEV 점프 파라미터 활용).
4. 이동 흐름 확인: 이전 씬 → 이 씬 → 다음 씬.
5. 콘솔 에러 0 확인.

---

### Task 1: 골격 — www/, 개발 서버, 에셋 이동

**Files:**
- Create: `www/index.html` (임시 placeholder — Task 2에서 intro로 교체)
- Create: `www/libs/` (빈 폴더, three.js는 Task 12에서)
- Modify: `package.json` (browser-sync devDependency + `dev:www` 스크립트)
- Move: `public/assets` → `www/assets`, `public/video` → `www/video`, `public/icons.svg`·`public/favicon.svg` → `www/`
- Modify: `vite.config.*` — `publicDir`이 사라졌으니 React 앱이 에셋을 계속 찾도록 `publicDir: "www"` 지정 (전환 기간 공존용)

**Interfaces:**
- Produces: `www/` 폴더 규약, `npm run dev:www` → `http://localhost:3000`, 에셋 경로 `assets/...` (페이지에서 상대경로 `../assets/...` 또는 `../../assets/...`)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/vanilla-www-skeleton
```

- [ ] **Step 2: www/ 골격 + placeholder 페이지 작성**

`www/index.html`에 R1 뼈대 + "vanilla 전환 준비 중" 텍스트만 넣는다 (스모크 테스트용).

- [ ] **Step 3: 에셋 이동 + vite publicDir 전환**

```bash
git mv public/assets www/assets
git mv public/video www/video
git mv public/favicon.svg www/favicon.svg
git mv public/icons.svg www/icons.svg
```

`vite.config`에 `publicDir: "www"` 추가. **주의:** 이러면 React dev/build가 `www/` 전체를 정적 자원으로 취급한다 — 전환 기간에만 쓰는 공존 장치이고 Task 14에서 vite 자체가 사라진다.

- [ ] **Step 4: browser-sync 설치 + 스크립트**

```bash
npm i -D browser-sync
```

`package.json` scripts에 추가:

```json
"dev:www": "browser-sync start --server www --files \"www/**/*\" --no-open --no-notify"
```

- [ ] **Step 5: 검증**

- `npm run dev:www` → playwright로 `http://localhost:3000` 접속, placeholder 확인, 콘솔 에러 0.
- `npm run dev` (기존 React) → 에셋 이동 후에도 홈·행성 씬 이미지가 전부 뜨는지 확인 (`/assets/...` 경로 불변이므로 떠야 함).
- `npm run build` 성공 확인 (dist에 www 내용물이 복사되는지 확인).

- [ ] **Step 6: 커밋 + PR**

```bash
git add -A && git commit -m "feat: www/ vanilla MPA 골격 + 에셋 이동 + browser-sync"
```

---

### Task 2: intro 씬 (+ 공통 블록 3종 초판)

**Files:**
- Modify: `www/index.html` (placeholder → 실제 intro)
- Create: `www/style.css`, `www/script.js`
- 원본: [src/scenes/intro/index.tsx](../../../src/scenes/intro/index.tsx), [Intro.css](../../../src/scenes/intro/Intro.css), [intro.logic.ts](../../../src/scenes/intro/intro.logic.ts)

**Interfaces:**
- Consumes: Task 1의 `www/assets`, `www/video`
- Produces: **공통 블록 3종(히든 메뉴·음소거·효과음)의 검증된 vanilla 초판** — 이후 모든 태스크가 이 파일에서 복사. 히든 메뉴의 점프 목록은 아직 없는 페이지를 가리켜도 됨(경로 규약: `auth/`, `home/`, `planetN/prologue/`, `planetN/missionM/`, `planet3/mission23/`).

- [ ] **Step 1:** 원본 3파일 + [sceneTransition.tsx](../../../src/lib/sceneTransition.tsx)(페이드 아웃 연출 참고), [bgm.tsx](../../../src/lib/bgm.tsx)(이 씬에서 트는 소리 유무 확인)를 읽는다.
- [ ] **Step 2:** R1 뼈대 위에 intro를 이식 — 오프닝 영상 재생, 터치/클릭 시 `auth/`로 이동(페이드 아웃은 CSS transition으로), R2 초기화 지점 코드, R4 공통 블록 3종 vanilla 초판 작성, R5 블록.
- [ ] **Step 3:** R6 검증 (영상 재생, 클릭 → auth 이동 시도(404 예상 — Task 3 전이므로 URL 이동까지만 확인), 히든 메뉴 롱프레스 출현, 음소거 토글).
- [ ] **Step 4:** 커밋 `feat: vanilla intro 씬 + 공통 블록(히든메뉴·음소거·SFX) 초판`

---

### Task 3: auth 씬 (로그인 → hg_session)

**Files:**
- Create: `www/auth/index.html`, `www/auth/style.css`, `www/auth/script.js`
- Create: `www/dev-config.js` (gitignore — 테스트 계정, `.env.local`의 `HG_TEST_*` 대체)
- Modify: `.gitignore` (`www/dev-config.js` 추가)
- 원본: [src/scenes/auth/index.tsx](../../../src/scenes/auth/index.tsx), [Auth.css](../../../src/scenes/auth/Auth.css), [auth.logic.ts](../../../src/scenes/auth/auth.logic.ts), [src/lib/auth.ts](../../../src/lib/auth.ts), [api.ts](../../../src/lib/api.ts), [classBoard.ts](../../../src/lib/classBoard.ts), [session.ts](../../../src/lib/session.ts)

**Interfaces:**
- Consumes: Task 2의 공통 블록 3종(복사)
- Produces: `hg_session` 저장 형식 확정 (R2 표의 실제 필드 — 이후 태스크는 auth의 `script.js`를 참조해 맞춘다). 로그인 성공 → `../home/` 이동.

- [ ] **Step 1:** 원본을 읽고 로그인 API 호출(fetch)·세션 저장·class-board 응답 저장을 vanilla로 이식. API base URL은 원본 api.ts에서 확인해 `script.js` 상단 상수로.
- [ ] **Step 2:** dev-config.js — `window.HG_DEV = { testId: "...", testPw: "..." }` 형식, `.env.local` 값 복사. `index.html`에서 `<script src="../dev-config.js">`를 **존재할 때만** 로드(onerror 무시). DEV 파라미터 `?autologin=1` 지원.
- [ ] **Step 3:** R6 검증 — 실제 테스트 계정 로그인 → localStorage에 `hg_session` 저장 확인 → home 이동(404 예상, URL까지).
- [ ] **Step 4:** 커밋 + PR (Task 2와 묶어도 좋음)

---

### Task 4: home 씬 (행성 선택 + 진도 + 탐험 일지 팝업)

**Files:**
- Create: `www/home/index.html`, `www/home/style.css`, `www/home/script.js`
- 원본: [src/scenes/home/](../../../src/scenes/home/) 전체, [progress.ts](../../../src/lib/progress.ts), [session.ts](../../../src/lib/session.ts)

**Interfaces:**
- Consumes: `hg_session`(Task 3 형식), `hg_progress`
- Produces: 행성 이동 링크 `../planetN/prologue/`. `hg_progress` 읽기/표시 형식 확정.

- [ ] **Step 1:** 원본 이식 — 행성 4개 버튼(+잠금/진도 표시), 탐험 일지(class board) 팝업 → 외부 링크는 `window.Capacitor?.Plugins?.InAppBrowser` 사용, 브라우저 폴백 `window.open`. 원본 [openExternal.ts](../../../src/lib/openExternal.ts) 로직 참조.
- [ ] **Step 2:** R6 검증 — intro → auth → home 전체 흐름 통주(通奏), 진도 표시, 팝업.
- [ ] **Step 3:** 커밋 + PR

---

### Task 5–8: planet1 (프롤로그 + 미션 1·2·3) — 미션 엔진 해체의 표준 패턴 확립

planet1은 3개 미션 전부가 공유 엔진 [MissionPlayer.tsx](../../../src/scenes/planet/player/MissionPlayer.tsx)(56KB) + [mission.css](../../../src/scenes/planet/player/mission.css)(50KB) + `missionNN.json` 데이터로 구동된다. **여기서 확립하는 해체 패턴을 planet2·4가 재사용(복사·변형)한다.**

**해체 원칙:**
- 미션 페이지마다 그 미션의 JSON 내용을 `script.js` 안의 데이터 배열로 인라인하고, **그 미션이 실제로 쓰는 스텝 타입만** 처리하는 소형 러너를 작성한다 (엔진의 40개 vm 필드를 다 옮기지 말 것 — JSON을 먼저 읽고 등장하는 타입만).
- `mission.css`에서 **그 미션 화면에 실제 적용되는 규칙만** 추출해 페이지 `style.css`로 가져온다 (playwright로 기존 화면과 픽셀 비교하며).
- 미션 무대는 기존 관례대로 1920×1200 가능 (R1 숫자 교체).
- 미션 완료 시: 다음 미션으로 `location.href`, 마지막 미션이면 진도 저장(서버 POST — [session.ts](../../../src/lib/session.ts)의 completePlanet 로직 이식, review 필드는 기존과 같은 더미 문구) 후 `../../home/`.

**Task 5: planet1 프롤로그** — Create: `www/planet1/prologue/{index.html,style.css,script.js}`. 원본: [Prologue.tsx](../../../src/scenes/planet/planet1/Prologue.tsx), [prologue/PrologueTemplate.tsx](../../../src/scenes/planet/prologue/PrologueTemplate.tsx), [Prologue.css](../../../src/scenes/planet/prologue/Prologue.css). 완료 → `../mission1/`.

**Task 6: planet1 미션1** — Create: `www/planet1/mission1/`. 원본: [mission01.json](../../../src/scenes/planet/planet1/mission01.json), [theme.ts](../../../src/scenes/planet/planet1/theme.ts), MissionPlayer 중 이 미션이 쓰는 부분, [index.tsx](../../../src/scenes/planet/planet1/index.tsx)(미션 전환 흐름). DEV 점프 `?step=N` 구현.

**Task 7: planet1 미션2** — mission02.json (12KB — 제일 큼). [MirrorStage.tsx](../../../src/scenes/planet/player/MirrorStage.tsx)·[RubReveal.tsx](../../../src/scenes/planet/player/RubReveal.tsx) 사용 여부를 JSON에서 확인하고 쓰이면 이식.

**Task 8: planet1 미션3** — mission03.json + 완료 시 진도 저장(planet1 완료 POST) → home. **이 태스크에서 진도 저장 패턴 확정** (이후 행성이 복사).

각 태스크 공통 스텝: 원본 읽기 → 이식 → R6 검증(기존 React 씬을 나란히 띄워 비교, 미션 클리어까지 실제 플레이) → 커밋. planet1 완주 후 PR 1개.

---

### Task 9: planet2 (프롤로그 + 미션 1·2·3 + 학급 결과판)

**Files:** Create: `www/planet2/{prologue,mission1,mission2,mission3}/...`
- 원본: [src/scenes/planet/planet2/](../../../src/scenes/planet/planet2/) 전체. 미션별 스테이지 컴포넌트(EmotionGuideStage/EmpathyRadarStage/HiddenEmotionStage)는 이미 미션별 독립 + 독립 CSS라 거의 1:1 이식. 대화 부분은 planet1 패턴 복사. ClassResultsBoard는 원본 [index.tsx](../../../src/scenes/planet/planet2/index.tsx)에서 어느 미션 흐름에 속하는지 확인 후 해당 미션 폴더에 포함.
- emotionGuide는 API 호출([emotionGuide.api.ts](../../../src/scenes/planet/planet2/emotionGuide.api.ts)) 있음 — fetch로 이식.

스텝: 미션당 (원본 읽기 → 이식 → R6 검증 → 커밋) × 4페이지, 완주 후 PR.

---

### Task 10: planet4 (프롤로그 + 미션 1·2·3)

**Files:** Create: `www/planet4/{prologue,mission1,mission2,mission3}/...`
- 원본: [src/scenes/planet/planet4/](../../../src/scenes/planet/planet4/) 전체 (EmpathyCompassStage, CourageCompassStage, HeartConnectStage + 데이터 파일들). planet2와 같은 방식. courageCompass는 "배경 박제" 기법이 적용돼 있음(메모리 참조) — 시각 결과만 같으면 됨.
- 마지막 미션 완료 → 진도 저장 → home (planet1 패턴 복사).

스텝: planet2와 동일 사이클, 완주 후 PR.

---

### Task 11: planet3 프롤로그 + 미션1

**Files:** Create: `www/planet3/{prologue,mission1}/...`
- 원본: [Prologue.tsx](../../../src/scenes/planet/planet3/Prologue.tsx), [EmpathyManualGame.tsx](../../../src/scenes/planet/planet3/EmpathyManualGame.tsx)(+.css), [mission01.json](../../../src/scenes/planet/planet3/mission01.json), [index.tsx](../../../src/scenes/planet/planet3/index.tsx)(미션1 → 미션23 전환 흐름).
- 미션1 완료 → `../mission23/`.

---

### Task 12: planet3 미션23 (three.js world 통합 페이지)

**Files:** Create: `www/planet3/mission23/{index.html,style.css,script.js,world/*.js}`, Create: `www/libs/three.module.js`
- 원본: [src/scenes/planet/planet3/world/](../../../src/scenes/planet/planet3/world/) — **이미 React 없는 순수 TS 모듈**(mountWorld.ts 외). 타입 제거해 `.js`로 변환, import 경로를 `../../libs/three.module.js` 상대경로(또는 import map)로.
- three.module.js는 `node_modules/three/build/`에서 복사 (버전 0.185.0 고정 — 파일 상단에 버전 주석).
- r3f 파일(World.tsx/Npc.tsx/Planet3Sample.tsx)은 이식하지 않는다 — world/가 실제 구현인지 [EmpathyFuelGame.tsx](../../../src/scenes/planet/planet3/EmpathyFuelGame.tsx)와 index.tsx에서 먼저 확인.
- stage1(연료 채우기) → stage2(NPC) → 완료 → 진도 저장 → home. DEV 점프 `?stage2=1` 유지.
- 이 페이지는 world의 여러 `.js` 모듈 파일을 가질 수 있다 (한 폴더 안이므로 규약 위반 아님 — "미션23을 만든 초보자"의 파일들).
- planet3 완주 후 PR.

---

### Task 13: 전체 통주 검증

- [ ] intro → auth → home → 행성 4개 각각 입장 → 전 미션 클리어 → 진도 저장 → home 복귀를 playwright로 끝까지 1회 통주.
- [ ] 히든 메뉴로 임의 점프 몇 개 확인.
- [ ] localStorage를 비우고 재시작 → 초기화 동작 확인.
- [ ] 서버 진도 API에 실제 저장됐는지 확인 (기존 검증 방식과 동일).

---

### Task 14: React·Vite 제거 + APK 컷오버

**Files:**
- Modify: `capacitor.config.ts` → **`webDir: "www"`** (파일 자체를 `capacitor.config.json`으로 바꿔 TS 의존 제거: `{ "appId": "com.heartguardians.app", "appName": "HeartGuardians", "webDir": "www" }`)
- Modify: `scripts/build-apk.mjs` — `npm run build` 단계 제거 (www/를 그대로 sync)
- Modify: `package.json` — react·react-dom·react-router-dom·three(npm)·@react-three/*·vite·@vitejs/plugin-react·typescript·@types/*·vitest 제거. scripts에서 build/dev(vite)/test 제거, `dev:www` → `dev`로 개명. @capacitor/*, browser-sync, prettier는 유지(oxlint는 제거).
- Delete: `src/`, `index.html`(루트 vite 진입점), `vite.config.*`, `tsconfig*`, `dist/`
- Modify: `CLAUDE.md`, `docs/runtime-environment.md` — 새 구조 반영 (FixedStage 규칙 → R1 인라인 규약으로, 빌드 절차 → 무빌드로)

- [ ] **Step 1:** 위 제거/수정 일괄 적용 → `npm install`로 lock 정리.
- [ ] **Step 2:** `npx cap sync` → `npm run apk` → **실기기(태블릿)에서 전체 흐름 확인** (뒤로가기 무시·immersive·영상·3D 월드 포함).
- [ ] **Step 3:** APK 크기 기존과 비교 (에셋 이동뿐이라 비슷해야 정상).
- [ ] **Step 4:** 커밋 + PR (제거는 되돌리기 쉽도록 단일 PR로).

---

## 자가 검토 노트

- **미션 엔진 코드는 이 계획에 리터럴로 싣지 않았다** — 56KB 엔진의 미션별 부분 추출은 원본 JSON을 읽어야만 정확해서, 각 태스크의 "원본 읽기" 스텝이 선행 조건이다. 대신 어떤 파일을 읽고 어떤 기준으로 추출하는지(쓰는 스텝 타입만·적용되는 CSS만)를 규약으로 고정했다.
- ClassResultsBoard의 소속 미션, planet3 world/와 r3f 파일의 관계 등 **불확실 지점은 해당 태스크 Step 1에서 원본으로 확정**하도록 명시했다.
- 씬 간 인터페이스는 localStorage 스키마(R2)와 폴더 경로 규약(Task 2 Produces)으로 고정 — 태스크를 순서대로 하는 한 충돌 없음.
