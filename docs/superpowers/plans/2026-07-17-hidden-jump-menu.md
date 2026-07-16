# 히든 점프 메뉴 (교사 시연용) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사가 태블릿 APK에서 좌상단 두 손가락 롱프레스 + 4자리 PIN으로 히든 메뉴를 열어 16개 미션 위치와 홈으로 즉시 점프할 수 있게 한다.

**Architecture:** 점프 URL 파라미터(`?m=` / `?end=` / `?node=`)는 이미 `src/scenes/planet/devJump.ts`에 구현돼 있고 지금은 `import.meta.env.DEV` 뒤에 잠겨 있다. 이 계획은 (1) 그 게이트를 런타임 잠금 해제(`isUnlocked()`)로 바꾸고, (2) 앱 루트에 전역 오버레이를 얹어 제스처 → PIN → 17칸 그리드 → `fadeNav(url)` 흐름을 만든다. URL이 단일 진실 공급원으로 남고, 같은 행성 안에서의 점프는 라우트 래퍼가 리마운트로 처리한다.

**Tech Stack:** React 19, react-router-dom(HashRouter), Vite 8, TypeScript, vitest(node 환경)

## Global Constraints

- 설계 스펙: `docs/superpowers/specs/2026-07-17-hidden-jump-menu-design.md` — 충돌 시 스펙이 기준.
- **`location.reload()` 절대 금지.** 세션은 `src/lib/session.ts`의 `let current`(메모리 전용)이라 리로드하면 교사가 로그인 화면으로 튕긴다. 화면 이동은 반드시 react-router로 한다.
- **PIN 값을 소스·문서·커밋 메시지에 절대 쓰지 않는다.** 값은 `.env.local`에만 존재한다.
- **기본 PIN 상수를 두지 않는다** (fail closed). PIN 미설정 빌드에서는 메뉴가 열리지 않는다.
- 해제 상태를 `localStorage`/`sessionStorage`에 저장하지 않는다. 앱 실행당 1회, 모듈 변수로만.
- 오버레이는 앱 루트(무대 밖)에만 둔다. FixedStage(1280×800)·미션 `#stage`(1920×1200) 내부에 넣지 않는다. 이 오버레이는 무대 밖 앱 크롬이므로 vw/vh 사용이 허용된다(CLAUDE.md의 vh/vw 금지는 무대 안 씬 규칙).
- 커밋 메시지는 한국어, 본문에 이유를 적는다. 기존 커밋 스타일을 따른다.
- 각 태스크 끝에 `npx tsc -b`가 통과해야 한다.

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/hiddenMenu.ts` (신규) | 잠금 상태 store. PIN 검증, fail closed 판정. React 의존성 없는 순수 모듈 |
| `src/lib/hiddenMenu.test.ts` (신규) | 위 store의 단위 테스트 (vitest) |
| `src/vite-env.d.ts` (수정) | `VITE_HG_MENU_PIN` 타입 선언 |
| `.env.example` (수정) | 키 이름·설명만 문서화 (값은 절대 아님) |
| `src/scenes/planet/devJump.ts` (수정) | 게이트를 `DEV → DEV \|\| isUnlocked()`로 교체 |
| `src/App.tsx` (수정) | `/planet/N` 라우트 리마운트 래퍼 + `<HiddenMenu />` 마운트 |
| `src/lib/useCornerLongPress.ts` (신규) | 좌상단 두 손가락 롱프레스 + 단축키 감지 훅 |
| `src/lib/HiddenMenu.tsx` (신규) | 오버레이 UI: PIN 패드 + 17칸 그리드 |
| `src/lib/hidden-menu.css` (신규) | 오버레이 스타일 |

`HiddenMenu`를 `src/shared/components/`가 아닌 `src/lib/`에 두는 이유: `shared/components`는 씬 안에서 쓰는 UI(`Modal`)고, `lib/`는 App에 마운트되는 앱 인프라(`FixedStage`, `sceneTransition`, `bgm`)다. 히든 메뉴는 후자다. (스펙은 `shared/components`라 적었으나 이 관례를 따라 변경한다.)

**테스트 범위에 대한 정직한 메모:** 이 저장소에는 vitest만 있고 testing-library/jsdom이 없다(`src/lib/session.test.ts`가 유일한 테스트, node 환경 순수 로직). 따라서 TDD 단위 테스트는 **보안 핵심인 `hiddenMenu.ts`에만** 적용한다. 훅·컴포넌트·제스처는 브라우저 검증(Task 7)으로 확인한다. 이를 위해 jsdom을 새로 도입하는 것은 이 작업의 범위를 넘는다.

---

### Task 1: 잠금 store + 단위 테스트

**Files:**
- Create: `src/lib/hiddenMenu.ts`
- Test: `src/lib/hiddenMenu.test.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `configuredPin(): string | null` — 빌드에 주입된 4자리 PIN, 아니면 null
  - `isMenuAvailable(): boolean` — 이 빌드에서 메뉴를 열 수 있는지
  - `isUnlocked(): boolean` — 현재 세션 해제 여부
  - `unlock(pin: string): boolean` — 성공 시 true
  - `lock(): void` — 다시 잠금

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/hiddenMenu.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configuredPin, isUnlocked, unlock, lock } from "./hiddenMenu";

describe("hiddenMenu 잠금 store", () => {
  beforeEach(() => lock());
  afterEach(() => vi.unstubAllEnvs());

  it("PIN이 비어 있으면 configuredPin은 null", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "");
    expect(configuredPin()).toBeNull();
  });

  it("4자리 숫자가 아니면 null", () => {
    for (const bad of ["123", "12345", "abcd", "12a4", " 1234"]) {
      vi.stubEnv("VITE_HG_MENU_PIN", bad);
      expect(configuredPin()).toBeNull();
    }
  });

  it("4자리 숫자면 그 값을 돌려준다", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    expect(configuredPin()).toBe("7402");
  });

  it("초기 상태는 잠김", () => {
    expect(isUnlocked()).toBe(false);
  });

  it("맞는 PIN이면 해제된다", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    expect(unlock("7402")).toBe(true);
    expect(isUnlocked()).toBe(true);
  });

  it("틀린 PIN이면 잠긴 채로 false", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    expect(unlock("1234")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("PIN 미설정이면 어떤 입력으로도 해제되지 않는다 (fail closed)", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "");
    expect(unlock("")).toBe(false);
    expect(unlock("0000")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("lock()으로 다시 잠긴다", () => {
    vi.stubEnv("VITE_HG_MENU_PIN", "7402");
    unlock("7402");
    lock();
    expect(isUnlocked()).toBe(false);
  });
});
```

> 위 `7402`는 **테스트 픽스처일 뿐 실제 PIN이 아니다.** 실제 값은 `.env.local`에만 둔다.

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

```bash
npx vitest run src/lib/hiddenMenu.test.ts
```

Expected: FAIL — `Failed to load ./hiddenMenu` (모듈이 아직 없음)

- [ ] **Step 3: 최소 구현을 쓴다**

`src/lib/hiddenMenu.ts`:

```ts
// 히든 점프 메뉴(교사 시연용)의 잠금 상태. 학생에게 노출되면 안 된다.
//
// - PIN은 빌드 타임에 VITE_HG_MENU_PIN으로 주입한다(.env.local, gitignored).
//   VITE_ 접두어라 번들에 인라인된다 — APK를 뜯으면 보인다. 위협 모델은 교실의
//   초등학생이지 리버서가 아니므로 수용한다.
// - fail closed: PIN이 없거나 4자리가 아니면 프로덕션에서 메뉴가 열리지 않는다.
//   기본 PIN 상수를 두지 않는다 — 소스에 공개된 백도어가 되고, 아무도 env를
//   설정하지 않는 미래를 부른다.
// - 해제 상태는 모듈 변수에만 둔다. localStorage에 남기면 영구 해제되어 학생에게
//   노출된다. APK 재실행 = 새 웹뷰 = 자동 잠김.

let unlocked = false;

/** 빌드에 주입된 PIN. 4자리 숫자가 아니면 null(= 메뉴 사용 불가). */
export function configuredPin(): string | null {
  const raw = import.meta.env.VITE_HG_MENU_PIN;
  return typeof raw === "string" && /^\d{4}$/.test(raw) ? raw : null;
}

/** 이 빌드에서 메뉴를 열 수 있는지. DEV는 PIN 없이도 연다. */
export function isMenuAvailable(): boolean {
  return import.meta.env.DEV || configuredPin() !== null;
}

/** 현재 세션이 해제되었는지. devJump가 점프 파라미터 허용 여부를 판단할 때 쓴다. */
export function isUnlocked(): boolean {
  return unlocked;
}

/** PIN이 맞으면 해제하고 true. 틀리거나 PIN 미설정이면 false(fail closed). */
export function unlock(pin: string): boolean {
  const expected = configuredPin();
  if (expected === null) return false;
  if (pin !== expected) return false;
  unlocked = true;
  return true;
}

/** 다시 잠근다. */
export function lock(): void {
  unlocked = false;
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

```bash
npx vitest run src/lib/hiddenMenu.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: env 타입을 선언한다**

`src/vite-env.d.ts`의 `interface ImportMetaEnv` 안, `VITE_API_URL` 아래에 추가:

```ts
  /** 히든 점프 메뉴(교사 시연용) PIN. 4자리 숫자.
   *  .env.local 에만 두고 커밋하지 않는다. 미설정이면 프로덕션에서 메뉴가
   *  열리지 않는다(fail closed). 값은 번들에 인라인되므로 비밀이 아니다 —
   *  교실의 학생을 막는 용도다. */
  readonly VITE_HG_MENU_PIN?: string;
```

- [ ] **Step 6: .env.example에 키를 문서화한다 (값은 쓰지 않는다)**

`.env.example` 끝에 추가:

```
# 히든 점프 메뉴(교사 시연용) PIN. 4자리 숫자.
# 값은 .env.local 에만 두고 절대 커밋하지 않는다(.gitignore: *.local).
# 미설정 상태로 프로덕션 빌드하면 메뉴가 열리지 않는다(fail closed) — APK를
# 배포하기 전 반드시 설정할 것.
# 아이들이 반사적으로 찍는 값(1234 0000 1111 2580 1379 4321 2026)과 학생
# 로그인 PIN 패턴은 피한다.
VITE_HG_MENU_PIN=
```

- [ ] **Step 7: 타입체크와 전체 테스트를 돌린다**

```bash
npx tsc -b && npx vitest run
```

Expected: 타입 에러 없음, 모든 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add src/lib/hiddenMenu.ts src/lib/hiddenMenu.test.ts src/vite-env.d.ts .env.example
git commit -m "feat(hidden-menu): 잠금 store + PIN 검증 (fail closed)

PIN은 VITE_HG_MENU_PIN으로 빌드 타임 주입하고 값은 .env.local에만 둔다.
기본 PIN 상수를 두지 않아 미설정 빌드에선 메뉴가 열리지 않는다 — 상수를
두면 소스에 공개된 백도어가 되기 때문이다.

해제 상태는 모듈 변수에만 둔다. localStorage에 남기면 영구 해제되어
학생에게 노출된다. APK 재실행 = 새 웹뷰 = 자동 잠김.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 9: 사용자에게 PIN 설정을 요청한다 (수동 단계)**

`.env.local`에 다음 줄을 추가해야 한다. **값은 사용자가 직접 고른다** — 계획·소스·커밋 어디에도 적지 않는다.

```
VITE_HG_MENU_PIN=<사용자가 고른 4자리>
```

브라우저 개발 중에는 PIN을 건너뛰므로 이 값 없이도 Task 7까지 진행할 수 있다. 프로덕션 빌드 검증(Task 7 Step 5) 전에는 반드시 필요하다.

---

### Task 2: devJump 게이트를 런타임 잠금으로 교체

**Files:**
- Modify: `src/scenes/planet/devJump.ts:29-45`

**Interfaces:**
- Consumes: `isUnlocked()` (Task 1)
- Produces: 없음 (동작 변경만)

- [ ] **Step 1: import를 추가한다**

`src/scenes/planet/devJump.ts` 상단 import 블록에 추가:

```ts
import { isUnlocked } from "../../lib/hiddenMenu";
```

- [ ] **Step 2: 파일 헤더 주석을 갱신한다**

기존:

```ts
// 행성 씬 개발용 점프 파라미터를 한 곳에서 해석한다.
// 프로덕션 빌드(APK)에선 import.meta.env.DEV 가 false 라 모든 파라미터가 무시되고
// 항상 stages[0](=prologue)부터 시작한다.
```

교체:

```ts
// 행성 씬의 점프 파라미터를 한 곳에서 해석한다.
//
// 개발 중(vite dev)에는 항상 열려 있다. 프로덕션 빌드(APK)에서는 히든 메뉴가
// PIN으로 해제된 뒤에만(isUnlocked) 파라미터가 해석되고, 그전까지는 전부
// 무시되어 항상 stages[0](=prologue)부터 시작한다.
// APK는 주소창 없는 immersive 웹뷰라 URL 파라미터 자체가 학생 손에 닿지 않는다 —
// 실질 방어선은 히든 메뉴의 제스처 + PIN이다.
```

- [ ] **Step 3: 게이트 한 줄을 바꾼다**

기존:

```ts
  const dev = import.meta.env.DEV;
```

교체:

```ts
  // DEV는 항상 허용, 프로덕션은 히든 메뉴로 해제된 뒤에만.
  const dev = import.meta.env.DEV || isUnlocked();
```

> `dev` 지역 변수명은 그대로 둔다 — 파일 안의 나머지 사용처(`requested`, `node`, `end`, `has`)가 모두 이 값을 참조하므로 이름만 바꾸면 diff가 불필요하게 커진다. 의미는 위 주석이 설명한다.

- [ ] **Step 4: 타입체크와 기존 테스트를 돌린다**

```bash
npx tsc -b && npx vitest run
```

Expected: 통과. (이 변경은 DEV에서 동작이 동일하다 — `true || isUnlocked()`)

- [ ] **Step 5: 개발 서버에서 회귀가 없는지 확인한다**

```bash
npx vite --port 5233 --strictPort
```

브라우저에서 `http://localhost:5233/#/planet/1?m=3&end=1` 접속 → 탐험 성공 보상 화면(우주선 버튼)이 그대로 떠야 한다. 확인 후 서버를 끈다.

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/planet/devJump.ts
git commit -m "feat(hidden-menu): 점프 게이트를 DEV 상수에서 런타임 잠금으로 교체

프로덕션 APK에서도 히든 메뉴로 해제하면 점프 파라미터가 동작한다.
DEV에서는 지금처럼 PIN 없이 그대로 열려 있다.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 같은 행성 안에서의 점프를 위한 리마운트 래퍼

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (라우팅 동작 변경)

**왜 필요한가:** react-router는 같은 라우트에서 search만 바뀌면 컴포넌트를 재사용한다. 각 행성의 `useState(initialStage)`는 마운트 때 1회만 읽으므로, 히든 메뉴로 `/planet/2?m=1` → `/planet/2?m=3&end=1`을 눌러도 화면이 그대로다. search를 key로 걸어 리마운트시킨다.

- [ ] **Step 1: 래퍼 컴포넌트를 추가한다**

`src/App.tsx`의 import를 수정한다. 기존:

```ts
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
```

교체:

```ts
import { Fragment, useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
```

`export default function App()` 위에 추가:

```tsx
// react-router는 같은 라우트에서 search만 바뀌면 컴포넌트를 재사용한다.
// 각 행성은 useState(initialStage)로 마운트 때 딱 한 번 점프 파라미터를 읽으므로,
// 히든 메뉴로 같은 행성의 다른 미션에 점프하면 화면이 그대로였다.
// search를 key로 걸어 파라미터가 바뀌면 리마운트시킨다.
function Keyed({ children }: { children: ReactNode }) {
  const { search } = useLocation();
  return <Fragment key={search}>{children}</Fragment>;
}
```

- [ ] **Step 2: 네 행성 라우트를 감싼다**

기존:

```tsx
          <Route path="/planet/1" element={<Planet1 />} />
          <Route path="/planet/2" element={<Planet2 />} />
          <Route path="/planet/3" element={<Planet3 />} />
          <Route path="/planet/4" element={<Planet4 />} />
```

교체:

```tsx
          <Route path="/planet/1" element={<Keyed><Planet1 /></Keyed>} />
          <Route path="/planet/2" element={<Keyed><Planet2 /></Keyed>} />
          <Route path="/planet/3" element={<Keyed><Planet3 /></Keyed>} />
          <Route path="/planet/4" element={<Keyed><Planet4 /></Keyed>} />
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc -b
```

Expected: 에러 없음

- [ ] **Step 4: 브라우저에서 리마운트를 확인한다**

```bash
npx vite --port 5233 --strictPort
```

DevTools 콘솔에서 주소를 바꿔가며 확인한다(리로드 없이):

```js
location.hash = "#/planet/2?m=1";   // → p2_m1_intro
location.hash = "#/planet/2?m=3&end=1";  // → p2_m3_end 로 바뀌어야 한다
document.querySelector("#stage").className;  // node-<id> 확인
```

Expected: 두 번째 이동에서 화면이 실제로 미션3 엔딩으로 바뀐다. (이 래퍼가 없으면 첫 화면이 그대로 남는다 — 이 태스크의 핵심 회귀 지점이다.)

- [ ] **Step 5: 커밋**

```bash
git add src/App.tsx
git commit -m "fix(router): 점프 파라미터가 바뀌면 행성 씬을 리마운트

react-router가 search만 바뀔 때 컴포넌트를 재사용해서, 같은 행성 안의
다른 미션으로 점프해도 화면이 그대로였다. 각 행성은 마운트 때 한 번만
점프 파라미터를 읽기 때문이다. search를 key로 걸어 해결한다.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 제스처·단축키 감지 훅 + 오버레이 골격

**Files:**
- Create: `src/lib/useCornerLongPress.ts`
- Create: `src/lib/HiddenMenu.tsx`
- Create: `src/lib/hidden-menu.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `isMenuAvailable()`, `isUnlocked()` (Task 1)
- Produces:
  - `useCornerLongPress(onTrigger: () => void): void` — 좌상단 두 손가락 롱프레스 + `Ctrl+Shift+J`
  - `HiddenMenu` (default export, props 없음) — App에 마운트하는 전역 오버레이

- [ ] **Step 1: 감지 훅을 만든다**

`src/lib/useCornerLongPress.ts`:

```ts
import { useEffect, useRef } from "react";

// 히든 메뉴 진입 제스처: 화면 좌상단 모서리를 두 손가락으로 길게 누른다.
// 태블릿엔 키보드가 없어 히든 "키"는 터치 제스처여야 한다. 아이가 우연히
// 두 손가락 롱프레스를 할 확률은 거의 없고, 게임 속 탭·드래그와도 겹치지 않는다.
// 좌표는 실제 뷰포트 기준이다 — 이 훅은 무대(FixedStage/#stage) 바깥에서 돈다.

const CORNER_PX = 100; // 좌상단 감지 정사각형 한 변
const HOLD_MS = 2000; // 두 손가락을 유지해야 하는 시간
const MOVE_TOLERANCE_PX = 24; // 이만큼 움직이면 취소(스크롤·드래그 오인 방지)

export function useCornerLongPress(onTrigger: () => void): void {
  // 콜백을 ref에 담아 리스너를 매 렌더 다시 붙이지 않는다.
  const cb = useRef(onTrigger);
  cb.current = onTrigger;

  useEffect(() => {
    const points = new Map<number, { x: number; y: number }>();
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.clientX > CORNER_PX || e.clientY > CORNER_PX) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size === 2 && timer === undefined) {
        timer = window.setTimeout(() => {
          timer = undefined;
          points.clear();
          cb.current();
        }, HOLD_MS);
      }
    };

    const onMove = (e: PointerEvent) => {
      const start = points.get(e.pointerId);
      if (!start) return;
      const moved =
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX;
      if (moved) {
        points.delete(e.pointerId);
        clearTimer();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!points.delete(e.pointerId)) return;
      clearTimer();
    };

    // 캡처 단계로 듣되 아무것도 삼키지 않는다 — 감지만 하고 이벤트는 그대로 흘린다.
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    return () => {
      clearTimer();
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, []);

  // 브라우저 개발용 단축키. 제스처와 완전히 동일한 흐름을 연다(PIN도 동일하게 요구).
  // 태블릿엔 키보드가 없어 실질적으로 개발용이다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        cb.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
```

- [ ] **Step 2: 오버레이 골격을 만든다 (열림/닫힘만)**

`src/lib/HiddenMenu.tsx`:

```tsx
import { useCallback, useState } from "react";
import { useCornerLongPress } from "./useCornerLongPress";
import { isMenuAvailable, isUnlocked } from "./hiddenMenu";
import "./hidden-menu.css";

// 교사 시연용 히든 점프 메뉴. 앱 루트(무대 바깥)에 마운트되는 전역 오버레이다.
// 진입: 좌상단 두 손가락 2초 롱프레스(또는 개발용 Ctrl+Shift+J) → PIN → 그리드.

type Phase = "closed" | "pin" | "grid";

export default function HiddenMenu() {
  const [phase, setPhase] = useState<Phase>("closed");

  const open = useCallback(() => {
    if (!isMenuAvailable()) return; // PIN 미설정 프로덕션 빌드 — fail closed
    // DEV에서는 PIN을 건너뛴다. devJump 게이트도 어차피 DEV면 열려 있다.
    setPhase(import.meta.env.DEV || isUnlocked() ? "grid" : "pin");
  }, []);

  useCornerLongPress(open);

  if (phase === "closed") return null;

  return (
    <div className="hidden-menu" role="dialog" aria-label="교사용 점프 메뉴">
      <div className="hidden-menu__panel">
        <div className="hidden-menu__head">
          <strong>교사용 점프 메뉴</strong>
          <button
            type="button"
            className="hidden-menu__close"
            onClick={() => setPhase("closed")}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        {phase === "pin" ? <p>PIN 패드 자리 (Task 5)</p> : <p>그리드 자리 (Task 6)</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 스타일을 만든다**

`src/lib/hidden-menu.css`:

```css
/* 교사용 히든 점프 메뉴. 앱 루트(무대 바깥)에 뜨는 전역 오버레이라
   FixedStage(1280×800)·미션 #stage(1920×1200) 좌표계와 무관하다.
   여기서는 vw/vh를 쓴다 — CLAUDE.md의 vh/vw 금지는 무대 안 씬에 대한 규칙이고
   이 오버레이는 무대 밖 앱 크롬이다. */

.hidden-menu {
  position: fixed;
  inset: 0;
  z-index: 10001; /* sceneTransition 페이드(10000)보다 위 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  font-family: system-ui, sans-serif;
}

.hidden-menu__panel {
  width: min(920px, 92vw);
  max-height: 88vh;
  overflow: auto;
  padding: 20px;
  border-radius: 12px;
  background: #12161f;
  color: #e8eef8;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.hidden-menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 18px;
}

.hidden-menu__close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: #263041;
  color: #e8eef8;
  font-size: 16px;
  cursor: pointer;
}
```

- [ ] **Step 4: App에 마운트한다**

`src/App.tsx` import에 추가:

```ts
import HiddenMenu from "./lib/HiddenMenu";
```

`</BgmProvider>` 바로 위, `</Routes>` 아래에 추가한다. 기존:

```tsx
        </Routes>
      </BgmProvider>
```

교체:

```tsx
        </Routes>
        {/* 교사용 히든 점프 메뉴. Routes 바깥 = 어느 씬에서도 뜬다.
            SceneTransitionProvider 안이라 useFadeNav를 쓸 수 있다. */}
        <HiddenMenu />
      </BgmProvider>
```

- [ ] **Step 5: 타입체크**

```bash
npx tsc -b
```

Expected: 에러 없음

- [ ] **Step 6: 브라우저에서 확인한다**

```bash
npx vite --port 5233 --strictPort
```

`http://localhost:5233/#/home` 접속 후:
1. `Ctrl+Shift+J` → 패널이 뜨고 "그리드 자리 (Task 6)"가 보인다(DEV라 PIN 건너뜀).
2. ✕ → 닫힌다.
3. 미션 화면(`#/planet/1?m=1`)에서도 `Ctrl+Shift+J`로 열린다.
4. DevTools의 device toolbar로 터치 에뮬레이션을 켜고 좌상단 모서리를 확인하거나, 실기기 확인(Task 7)으로 미룬다.

- [ ] **Step 7: 커밋**

```bash
git add src/lib/useCornerLongPress.ts src/lib/HiddenMenu.tsx src/lib/hidden-menu.css src/App.tsx
git commit -m "feat(hidden-menu): 진입 제스처 + 오버레이 골격

좌상단 100px 모서리 두 손가락 2초 롱프레스로 연다(개발용 Ctrl+Shift+J 병행).
태블릿엔 키보드가 없어 히든 키는 제스처여야 한다.

오버레이는 Routes 바깥 앱 루트에 둔다 — 무대(FixedStage 1280x800,
미션 #stage 1920x1200) 어느 쪽에도 속하지 않아 두 좌표계와 충돌하지 않고
어느 씬에서도 뜬다.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: PIN 패드

**Files:**
- Modify: `src/lib/HiddenMenu.tsx`
- Modify: `src/lib/hidden-menu.css`

**Interfaces:**
- Consumes: `unlock(pin: string): boolean` (Task 1)
- Produces: 없음 (컴포넌트 내부)

- [ ] **Step 1: PIN 패드를 구현한다**

`src/lib/HiddenMenu.tsx`를 전체 교체한다:

```tsx
import { useCallback, useState } from "react";
import { useCornerLongPress } from "./useCornerLongPress";
import { isMenuAvailable, isUnlocked, unlock } from "./hiddenMenu";
import "./hidden-menu.css";

// 교사 시연용 히든 점프 메뉴. 앱 루트(무대 바깥)에 마운트되는 전역 오버레이다.
// 진입: 좌상단 두 손가락 2초 롱프레스(또는 개발용 Ctrl+Shift+J) → PIN → 그리드.

type Phase = "closed" | "pin" | "grid";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function HiddenMenu() {
  const [phase, setPhase] = useState<Phase>("closed");
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const open = useCallback(() => {
    if (!isMenuAvailable()) return; // PIN 미설정 프로덕션 빌드 — fail closed
    setEntry("");
    setWrong(false);
    // DEV에서는 PIN을 건너뛴다. devJump 게이트도 어차피 DEV면 열려 있다.
    setPhase(import.meta.env.DEV || isUnlocked() ? "grid" : "pin");
  }, []);

  useCornerLongPress(open);

  const close = () => setPhase("closed");

  // 4자리가 차면 즉시 판정한다 — 확인 버튼을 따로 두지 않는다.
  const press = (k: string) => {
    setWrong(false);
    if (k === "clear") return setEntry("");
    if (k === "back") return setEntry((s) => s.slice(0, -1));
    setEntry((s) => {
      const next = (s + k).slice(0, 4);
      if (next.length === 4) {
        if (unlock(next)) {
          setPhase("grid");
          return "";
        }
        setWrong(true);
        return "";
      }
      return next;
    });
  };

  if (phase === "closed") return null;

  return (
    <div className="hidden-menu" role="dialog" aria-label="교사용 점프 메뉴">
      <div className="hidden-menu__panel">
        <div className="hidden-menu__head">
          <strong>교사용 점프 메뉴</strong>
          <button type="button" className="hidden-menu__close" onClick={close} aria-label="닫기">
            ✕
          </button>
        </div>

        {phase === "pin" ? (
          <div className="hidden-menu__pin">
            <div className="hidden-menu__dots" aria-label={`${entry.length}자리 입력됨`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < entry.length ? "on" : ""} />
              ))}
            </div>
            {wrong && <p className="hidden-menu__wrong">PIN이 맞지 않습니다</p>}
            <div className="hidden-menu__keys">
              {KEYS.map((k) => (
                <button type="button" key={k} onClick={() => press(k)}>
                  {k === "clear" ? "지움" : k === "back" ? "←" : k}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p>그리드 자리 (Task 6)</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: PIN 패드 스타일을 추가한다**

`src/lib/hidden-menu.css` 끝에 추가:

```css
.hidden-menu__pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
}

.hidden-menu__dots {
  display: flex;
  gap: 12px;
}

.hidden-menu__dots span {
  width: 14px;
  height: 14px;
  border: 2px solid #4a5a70;
  border-radius: 50%;
}

.hidden-menu__dots span.on {
  background: #e8eef8;
  border-color: #e8eef8;
}

.hidden-menu__wrong {
  margin: 0;
  color: #ff8a8a;
  font-size: 14px;
}

.hidden-menu__keys {
  display: grid;
  grid-template-columns: repeat(3, 72px);
  gap: 8px;
}

.hidden-menu__keys button {
  height: 56px;
  border: 0;
  border-radius: 8px;
  background: #263041;
  color: #e8eef8;
  font-size: 18px;
  cursor: pointer;
}

.hidden-menu__keys button:active {
  background: #36435c;
}
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc -b
```

Expected: 에러 없음

- [ ] **Step 4: PIN 흐름을 브라우저에서 확인한다**

DEV에서는 PIN을 건너뛰므로, PIN 화면을 보려면 `HiddenMenu.tsx`의 `open`에서 `import.meta.env.DEV ||` 를 **임시로** 지우고 `.env.local`에 PIN을 넣은 뒤 확인한다.

```bash
npx vite --port 5233 --strictPort
```

1. `Ctrl+Shift+J` → PIN 패드가 뜬다.
2. 틀린 PIN 4자리 → "PIN이 맞지 않습니다", 점이 비워진다.
3. 맞는 PIN 4자리 → 그리드 자리로 넘어간다.
4. 닫고 다시 열기 → PIN을 다시 묻지 않는다(앱 실행당 1회).

**확인 후 `import.meta.env.DEV ||` 를 반드시 되돌린다.**

- [ ] **Step 5: 커밋**

```bash
git add src/lib/HiddenMenu.tsx src/lib/hidden-menu.css
git commit -m "feat(hidden-menu): PIN 패드

4자리가 차면 즉시 판정한다(확인 버튼 없음). 한 번 통과하면 앱을 닫을
때까지 다시 묻지 않는다. 오입력 잠금은 두지 않았다 — 교사 오타 시 바로
재시도하는 쪽을 택했다.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 17칸 그리드 + 경고 라벨

**Files:**
- Modify: `src/lib/HiddenMenu.tsx`
- Modify: `src/lib/hidden-menu.css`

**Interfaces:**
- Consumes: `useFadeNav()` from `./sceneTransition` (기존)
- Produces: 없음

**목적지 표 (네 행성 모두 동일한 규칙):**

| 열 | URL |
|---|---|
| 미션1 | `/planet/N?m=1` |
| 미션2 | `/planet/N?m=2` |
| 미션3 | `/planet/N?m=3` |
| 엔딩 | `/planet/N?m=3&end=1` |

홈 = `/home`. 행성3은 미션3이 미션2 미니게임의 stage2지만 `devJump`의 `mission3 → mission2` 별칭이 흡수하므로 **메뉴에 특례가 없다.**

- [ ] **Step 1: 그리드를 구현한다**

`src/lib/HiddenMenu.tsx`의 import에 `useFadeNav`를 추가한다:

```ts
import { useFadeNav } from "./sceneTransition";
```

`const KEYS = ...` 아래에 추가:

```tsx
const PLANETS = [1, 2, 3, 4] as const;

// 네 행성 모두 같은 규칙이다. 행성3은 미션3이 독립 시나리오가 아니라 미션2
// 미니게임의 stage2지만, devJump의 mission3 → mission2 별칭이 흡수한다.
const COLUMNS: { label: string; query: string }[] = [
  { label: "미션1", query: "?m=1" },
  { label: "미션2", query: "?m=2" },
  { label: "미션3", query: "?m=3" },
  { label: "엔딩", query: "?m=3&end=1" },
];
```

컴포넌트 안, `const close = ...` 아래에 추가:

```tsx
  const fadeNav = useFadeNav();
  const go = (to: string) => {
    setPhase("closed");
    fadeNav(to);
  };
```

`<p>그리드 자리 (Task 6)</p>` 를 교체:

```tsx
          <div className="hidden-menu__grid-wrap">
            <p className="hidden-menu__warn">
              ⚠️ 엔딩에서 "우주선으로 이동"을 누르면 진도가 자동 저장됩니다
            </p>
            <div className="hidden-menu__grid">
              <span />
              {COLUMNS.map((c) => (
                <span key={c.label} className="hidden-menu__col">
                  {c.label}
                </span>
              ))}
              {PLANETS.map((p) => (
                <Fragment key={p}>
                  <span className="hidden-menu__row">행성{p}</span>
                  {COLUMNS.map((c) => (
                    <button
                      type="button"
                      key={c.label}
                      onClick={() => go(`/planet/${p}${c.query}`)}
                    >
                      {c.label}
                    </button>
                  ))}
                </Fragment>
              ))}
            </div>
            <button type="button" className="hidden-menu__home" onClick={() => go("/home")}>
              홈으로
            </button>
          </div>
```

`Fragment`를 import에 추가한다:

```ts
import { Fragment, useCallback, useState } from "react";
```

- [ ] **Step 2: 그리드 스타일을 추가한다**

`src/lib/hidden-menu.css` 끝에 추가:

```css
.hidden-menu__warn {
  margin: 0 0 12px;
  padding: 8px 12px;
  border: 1px solid #7a5a20;
  border-radius: 8px;
  background: #3a2a10;
  color: #ffd479;
  font-size: 14px;
}

.hidden-menu__grid {
  display: grid;
  grid-template-columns: 72px repeat(4, 1fr);
  gap: 8px;
  align-items: center;
}

.hidden-menu__col,
.hidden-menu__row {
  font-size: 13px;
  color: #9fb0c8;
}

.hidden-menu__col {
  text-align: center;
}

.hidden-menu__grid button {
  height: 48px;
  border: 0;
  border-radius: 8px;
  background: #263041;
  color: #e8eef8;
  font-size: 14px;
  cursor: pointer;
}

.hidden-menu__grid button:active {
  background: #36435c;
}

.hidden-menu__home {
  width: 100%;
  height: 48px;
  margin-top: 12px;
  border: 0;
  border-radius: 8px;
  background: #2f5d3a;
  color: #e8eef8;
  font-size: 15px;
  cursor: pointer;
}
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc -b
```

Expected: 에러 없음

- [ ] **Step 4: 17칸을 전부 눌러본다**

```bash
npx vite --port 5233 --strictPort
```

**먼저 로그인한다.** `/home`은 세션이 없으면 `/auth`로 튕기므로(`src/scenes/home/index.tsx`),
"홈으로" 칸을 제대로 검증하려면 로그인 상태여야 한다. 테스트 계정은 `.env.local`의
`HG_TEST_*`에 있다. 로그인 화면에 입력하거나 콘솔에서 주입한다:

```js
localStorage.setItem('hg.credentials', JSON.stringify({
  school_id: '<HG_TEST_SCHOOL_ID>', grade: <HG_TEST_GRADE>,
  class: <HG_TEST_CLASS>, number: <HG_TEST_NUMBER>, pin: '<HG_TEST_PIN>' }));
```

(행성 라우트는 세션을 요구하지 않아 로그인 없이도 열리지만, 홈 칸 검증에는 필요하다.)

로그인 후 `#/home`에서 `Ctrl+Shift+J`로 열고 16칸 + 홈을 하나씩 누른다. 각 칸마다 도착 노드를 확인한다:

```js
document.querySelector("#stage").className;  // node-<id> 포함
```

기대값:

| 칸 | 도착 노드 |
|---|---|
| 행성1 미션1/2/3/엔딩 | `m1_intro` / `m2_intro` / `m3_intro` / `m3_end` |
| 행성2 미션1/2/3/엔딩 | `p2_m1_intro` / `p2_m2_intro` / `p2_m3_intro` / `p2_m3_end` |
| 행성3 미션1/2/3/엔딩 | `p3_m1_intro` / `p3_m2_play`(스테퍼2, 3D stage1) / `p3_m2_play`(스테퍼3, 3D stage2) / `p3_m2_end` |
| 행성4 미션1/2/3/엔딩 | `p4_m1_intro` / `p4_m2_intro` / `p4_m3_intro` / `p4_m3_end` |

홈 → `#/home`으로 이동하고 **로그인 화면으로 튕기지 않아야 한다**(세션 유지 확인).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/HiddenMenu.tsx src/lib/hidden-menu.css
git commit -m "feat(hidden-menu): 17칸 점프 그리드 + 진도 저장 경고

행성1~4 x (미션1/2/3/엔딩) + 홈. 네 행성 모두 ?m=1 / ?m=2 / ?m=3 /
?m=3&end=1 한 규칙이라 행성3 특례가 메뉴에 없다 — devJump의
mission3 -> mission2 별칭이 흡수한다.

엔딩에서 우주선 버튼을 누르면 completePlanet이 서버에 진도를 저장하므로
경고 라벨을 상단에 고정했다.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 프로덕션 게이트 검증

**Files:**
- 코드 변경 없음 (검증 전용). 문제가 나오면 해당 태스크로 돌아간다.

- [ ] **Step 1: 전체 테스트와 타입체크**

```bash
npx tsc -b && npx vitest run && npx oxlint
```

Expected: 전부 통과

- [ ] **Step 2: fail closed 확인 — PIN 없이 프로덕션 빌드**

`.env.local`을 잠시 치워 PIN이 주입되지 않게 한다(값이 셸 env로 새는 것을 막기 위해 파일을 옮기는 방식을 쓴다):

```bash
mv .env.local .env.local.bak
npx vite build
npx vite preview --port 4173 --strictPort
```

`http://localhost:4173/#/home`에서:
1. `Ctrl+Shift+J` → **아무 일도 일어나지 않아야 한다**(메뉴 안 열림).
2. 주소를 `#/planet/1?m=3&end=1`로 바꿔도 **프롤로그**가 떠야 한다(게이트 잠김).

```bash
mv .env.local.bak .env.local
```

> `.env.local`을 반드시 되돌린다. 되돌리지 않으면 로그인 테스트 계정 정보도 함께 사라진다.

- [ ] **Step 3: PIN 있는 프로덕션 빌드 확인**

`.env.local`에 `VITE_HG_MENU_PIN`이 설정된 상태에서:

```bash
npx vite build
npx vite preview --port 4173 --strictPort
```

`http://localhost:4173/`에서 **먼저 로그인한다**(Task 6 Step 4와 같은 테스트 계정). 그 다음:
1. `Ctrl+Shift+J` → **PIN 패드**가 뜬다(프로덕션이라 건너뛰지 않음).
2. 틀린 PIN → 거부.
3. 맞는 PIN → 그리드. 아무 칸이나 눌러 점프되는지 확인.
4. 점프 후 "홈으로" → 세션 유지(로그인 화면으로 안 튕김). **이게 이 계획에서 가장 중요한
   회귀 확인이다** — 어딘가에서 리로드가 일어나면 여기서 드러난다.
5. 페이지를 새로고침(F5)하면 다시 잠기는지 확인 → `Ctrl+Shift+J`가 PIN을 다시 묻는다.
   (새로고침은 세션도 함께 날리므로 로그인 화면으로 가는 게 정상이다.)

- [ ] **Step 4: 실기기 APK 확인**

```bash
npm run apk
```

갤럭시 탭 A9+에 설치 후:
1. 홈 화면에서 **좌상단 모서리를 두 손가락으로 2초** → PIN 패드가 뜬다.
2. 미션 진행 중에도 열리는지 확인.
3. **행성3 3D 월드(`?m=2`)에서도** 열리는지 확인 — 캔버스가 포인터 이벤트를 잡는 곳이라 가장 위험한 지점이다.
4. 좌상단 "탐험 진행도" 버튼이 여전히 단일 탭으로 정상 동작하는지 확인(제스처가 삼키지 않는지).
5. 두 손가락이 100×100px 안에 들어가기 좁으면 `useCornerLongPress.ts`의 `CORNER_PX`를 키운다(예: 140).

- [ ] **Step 5: 검증 결과를 기록하고 PR을 연다**

```bash
git push -u origin feat/hidden-jump-menu
gh pr create --title "feat: 교사용 히든 점프 메뉴 (16개 미션 위치 + 홈)" --body "$(cat <<'EOF'
## 무엇

교사가 태블릿 APK에서 좌상단 두 손가락 롱프레스 + 4자리 PIN으로 히든 메뉴를 열어
16개 미션 위치와 홈으로 즉시 점프한다.

설계: `docs/superpowers/specs/2026-07-17-hidden-jump-menu-design.md`
계획: `docs/superpowers/plans/2026-07-17-hidden-jump-menu.md`

## 어떻게

- `?m=` / `?end=` / `?node=` 점프 파라미터를 `devJump.ts`로 공용화(선행 커밋)
- 게이트를 `import.meta.env.DEV` → `DEV || isUnlocked()`로 교체
- PIN은 `VITE_HG_MENU_PIN`으로 빌드 타임 주입. **미설정이면 메뉴가 열리지 않는다(fail closed)**
- 오버레이는 앱 루트(무대 바깥)에 마운트 — 어느 씬에서도 뜨고 두 무대 좌표계와 무관

## 배포 전 필수

`.env.local`에 `VITE_HG_MENU_PIN`(4자리)을 설정해야 교사가 메뉴를 열 수 있다.
설정하지 않으면 조용히 비활성 상태로 배포된다.

## 알려진 위험

엔딩에서 "우주선으로 이동"을 누르면 `completePlanet`이 학생 계정 진도를 서버에
저장한다. 되돌리는 UI는 없다. 경고 라벨이 유일한 완화책이며 의도된 트레이드오프다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 참고: 검증에 재사용할 순회 스크립트

playwright MCP의 `browser_run_code_unsafe`로 도착 노드를 일괄 확인할 수 있다.
해시만 바꾸면 리마운트 래퍼가 처리하지만, **세션이 필요한 경로는 로그인 상태를 유지해야 하므로 `page.goto`로 매번 리로드하지 말 것**(세션이 메모리 전용이라 날아간다).

```js
async (page) => {
  const out = [];
  for (const p of [1, 2, 3, 4]) {
    for (const q of ["?m=1", "?m=2", "?m=3", "?m=3&end=1"]) {
      await page.evaluate((h) => { location.hash = h; }, `#/planet/${p}${q}`);
      await page.waitForTimeout(600);
      const node = await page.evaluate(() => {
        const s = document.querySelector("#stage");
        const c = s && [...s.classList].find((x) => x.startsWith("node-"));
        return c ? c.slice(5) : "(none)";
      });
      out.push(`planet${p}${q} -> ${node}`);
    }
  }
  return out.join("\n");
}
```
