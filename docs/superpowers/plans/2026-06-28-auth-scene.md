# Auth Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Auth scene (`/auth`): chooser → login/signup with an in-app numeric keypad, auto-login via stored credentials with a welcome panel, and a session store other scenes read for progress.

**Architecture:** Auth is a small client state machine (`checking | welcome | chooser | login | signup`). All server I/O reuses the existing, already-encapsulated `src/lib/` layer (`auth.ts`, `api.ts`, `progress.ts`) — no new network code. All branchy logic lives in pure functions (`src/scenes/auth/auth.logic.ts`, `src/lib/session.ts`) tested with vitest; React components are thin and verified manually. Login uses an in-app `NumberKeypad` (no Android keyboard); only signup's name field uses the system keyboard.

**Tech Stack:** React 19, react-router-dom 7 (HashRouter), Vite 8, vitest 4 (Node env — no jsdom), TypeScript, oxlint + prettier.

## Global Constraints

- Layout target: **1280×800 CSS px, DPR 1.5, landscape fixed**, immersive fullscreen. Use `100dvh`/`min-height:100svh`, never `100vh`. Edge UI honors `env(safe-area-inset-*)`. (CLAUDE.md)
- Tests run in **Node** (no DOM, no `localStorage`). Only test pure functions; never render components in tests. Mirror the `intro.logic.ts` + `intro.logic.test.ts` pattern.
- Korean code comments and Korean user-facing copy, matching existing scenes.
- Credentials model: `{ school_id: string(UUID), grade: number(1–6), class: number, number: number, pin: string(exactly 4 digits) }`; signup adds `name: string`.
- Do **not** modify `src/lib/api.ts`, `src/lib/auth.ts`, `src/lib/progress.ts` — call them only.
- Server base URL comes from `VITE_API_URL` (already wired in `api.ts`).
- After each task: `npm run lint` and `npm test` must pass; for UI tasks also `npm run build`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Branch: `feat/auth-scene` (already checked out).

---

## File Structure

**Create:**
- `src/lib/session.ts` — in-memory session store (Profile + progress) for cross-scene reads.
- `src/lib/session.test.ts` — unit tests for the store.
- `src/scenes/auth/auth.logic.ts` — pure logic: credential-form state machine, default-school pick, verify-error classification.
- `src/scenes/auth/auth.logic.test.ts` — unit tests for the above.
- `src/scenes/auth/NumberKeypad.tsx` — presentational 0–9 + ⌫ keypad.
- `src/scenes/auth/PinDots.tsx` — presentational ● ○ PIN indicator.
- `src/scenes/auth/SchoolPicker.tsx` — school dropdown (always visible).
- `src/scenes/auth/CredentialForm.tsx` — grade buttons + class/number/pin fields + keypad; login & signup modes.
- `src/scenes/auth/Chooser.tsx` — 로그인 / 회원가입 two-button screen.
- `src/scenes/auth/WelcomePanel.tsx` — 환영해요 + 계속하기 / 다른 계정.
- `src/scenes/Auth.css` — background + banner + panel + form layout.

**Modify:**
- `src/scenes/Auth.tsx` — replace stub with the state-machine container.

**Assets:**
- Copy `mytemp/{Background01,PanelBackground01,TitleBanner}.png` → `src/assets/auth/` (imported/`url()`-referenced so Vite fingerprints them and they resolve under `base: "./"` in the APK, not just the dev server).

---

## Task 1: Session store

**Files:**
- Create: `src/lib/session.ts`
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Consumes: `Profile` from `src/lib/auth.ts`.
- Produces: `interface SessionData { profile: Profile; progress: number }`, `setSession(d: SessionData): void`, `getSession(): SessionData | null`, `clearSession(): void`, `getProgressValue(): number` (returns `0` when no session).

- [ ] **Step 1: Write the failing test**

Create `src/lib/session.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { setSession, getSession, clearSession, getProgressValue, type SessionData } from "./session";
import type { Profile } from "./auth";

const profile: Profile = {
  id: "u1",
  name: "이현수",
  grade: 3,
  class: 2,
  number: 12,
  school: { id: "s1", name: "행복초등학교" },
};
const data: SessionData = { profile, progress: 2 };

describe("session store", () => {
  beforeEach(() => clearSession());

  it("초기 상태는 null", () => {
    expect(getSession()).toBeNull();
  });

  it("setSession 후 getSession이 같은 데이터를 돌려준다", () => {
    setSession(data);
    expect(getSession()).toEqual(data);
  });

  it("clearSession 후 다시 null", () => {
    setSession(data);
    clearSession();
    expect(getSession()).toBeNull();
  });

  it("getProgressValue는 세션이 없으면 0", () => {
    expect(getProgressValue()).toBe(0);
  });

  it("getProgressValue는 세션의 progress를 돌려준다", () => {
    setSession(data);
    expect(getProgressValue()).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- session`
Expected: FAIL (cannot find module `./session`).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/session.ts`:

```ts
// 로그인 후 현재 사용자 정보를 메모리에 보관한다. (자격증명은 api.ts가 localStorage에 별도 저장)
// Profile/Progress는 매 실행 시 verify + getProgress로 새로 받아 항상 최신 상태를 유지한다.
// Home/Planet 등 다른 Scene이 progress를 읽는 단일 출처.

import type { Profile } from "./auth";

export interface SessionData {
  profile: Profile;
  progress: number; // 0~4, 완료한 Planet 수
}

let current: SessionData | null = null;

export function setSession(d: SessionData): void {
  current = d;
}

export function getSession(): SessionData | null {
  return current;
}

export function clearSession(): void {
  current = null;
}

/** 세션이 없으면 0을 돌려준다(잠금 계산 기본값). */
export function getProgressValue(): number {
  return current?.progress ?? 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- session`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/session.test.ts
git commit -m "feat(auth): add in-memory session store for cross-scene progress

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Auth pure logic

**Files:**
- Create: `src/scenes/auth/auth.logic.ts`
- Test: `src/scenes/auth/auth.logic.test.ts`

**Interfaces:**
- Consumes: `Credentials`, `ApiError` from `src/lib/api.ts`; `School` from `src/lib/auth.ts`.
- Produces:
  - `type FieldKey = "class" | "number" | "pin"`
  - `interface FormState { grade: number | null; class: string; number: string; pin: string; active: FieldKey }`
  - `MAX_LEN: Record<FieldKey, number>` (`class:2, number:2, pin:4`)
  - `initialForm(): FormState`
  - `applyDigit(s: FormState, d: string): FormState`
  - `applyBackspace(s: FormState): FormState`
  - `setActive(s: FormState, f: FieldKey): FormState`
  - `setGrade(s: FormState, g: number): FormState`
  - `isComplete(s: FormState): boolean`
  - `toCredentials(s: FormState, schoolId: string): Credentials`
  - `pickDefaultSchool(schools: School[], lastId: string | null): School | null`
  - `classifyVerifyError(err: unknown): "auth" | "network"`

- [ ] **Step 1: Write the failing test**

Create `src/scenes/auth/auth.logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  initialForm,
  applyDigit,
  applyBackspace,
  setActive,
  setGrade,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  classifyVerifyError,
} from "./auth.logic";
import { ApiError } from "../../lib/api";
import type { School } from "../../lib/auth";

describe("credential form logic", () => {
  it("initialForm은 class가 active인 빈 폼", () => {
    expect(initialForm()).toEqual({ grade: null, class: "", number: "", pin: "", active: "class" });
  });

  it("applyDigit은 active 필드에 숫자를 덧붙인다", () => {
    const s = applyDigit(initialForm(), "3");
    expect(s.class).toBe("3");
  });

  it("active 필드가 최대 길이에 도달하면 다음 필드로 자동 이동한다", () => {
    let s = initialForm();
    s = applyDigit(s, "1");
    s = applyDigit(s, "2"); // class=12 (max 2) → active=number
    expect(s.class).toBe("12");
    expect(s.active).toBe("number");
  });

  it("필드가 가득 차면 더 입력해도 무시한다(pin 4자리)", () => {
    let s = setActive(initialForm(), "pin");
    for (const d of ["1", "2", "3", "4", "5"]) s = applyDigit(s, d);
    expect(s.pin).toBe("1234");
  });

  it("applyBackspace는 active 필드의 마지막 글자를 지운다", () => {
    let s = applyDigit(initialForm(), "3");
    s = applyBackspace(s);
    expect(s.class).toBe("");
  });

  it("active가 비어 있으면 backspace는 이전 필드로 이동한다", () => {
    let s = setActive(initialForm(), "number");
    s = applyBackspace(s);
    expect(s.active).toBe("class");
  });

  it("setGrade는 학년을 설정한다", () => {
    expect(setGrade(initialForm(), 4).grade).toBe(4);
  });

  it("isComplete는 모든 값이 채워졌을 때만 true", () => {
    let s = setGrade(initialForm(), 3);
    s = { ...s, class: "2", number: "12", pin: "1234" };
    expect(isComplete(s)).toBe(true);
    expect(isComplete({ ...s, pin: "12" })).toBe(false);
  });

  it("toCredentials는 숫자 필드를 number로 변환한다", () => {
    let s = setGrade(initialForm(), 3);
    s = { ...s, class: "2", number: "12", pin: "1234" };
    expect(toCredentials(s, "school-uuid")).toEqual({
      school_id: "school-uuid",
      grade: 3,
      class: 2,
      number: 12,
      pin: "1234",
    });
  });
});

describe("pickDefaultSchool", () => {
  const schools: School[] = [
    { id: "a", name: "가나초" },
    { id: "b", name: "다라초" },
  ];
  it("lastId와 일치하는 학교를 고른다", () => {
    expect(pickDefaultSchool(schools, "b")?.id).toBe("b");
  });
  it("lastId가 없거나 안 맞으면 첫 번째 학교", () => {
    expect(pickDefaultSchool(schools, null)?.id).toBe("a");
    expect(pickDefaultSchool(schools, "zzz")?.id).toBe("a");
  });
  it("학교가 없으면 null", () => {
    expect(pickDefaultSchool([], "a")).toBeNull();
  });
});

describe("classifyVerifyError", () => {
  it("4xx ApiError는 auth(자격증명 문제)", () => {
    expect(classifyVerifyError(new ApiError(401, "nope", null))).toBe("auth");
    expect(classifyVerifyError(new ApiError(404, "nope", null))).toBe("auth");
  });
  it("5xx ApiError는 network", () => {
    expect(classifyVerifyError(new ApiError(500, "boom", null))).toBe("network");
  });
  it("ApiError가 아니면(fetch 실패) network", () => {
    expect(classifyVerifyError(new TypeError("Failed to fetch"))).toBe("network");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth.logic`
Expected: FAIL (cannot find module `./auth.logic`).

- [ ] **Step 3: Write minimal implementation**

Create `src/scenes/auth/auth.logic.ts`:

```ts
// Auth Scene의 순수 로직(서버/DOM 의존 없음). 컴포넌트는 이 함수들만 호출한다.
import { ApiError, type Credentials } from "../../lib/api";
import type { School } from "../../lib/auth";

export type FieldKey = "class" | "number" | "pin";

export interface FormState {
  grade: number | null; // 1~6, 버튼으로 선택
  class: string; // 숫자 키패드 입력(문자열로 누적)
  number: string;
  pin: string; // 4자리
  active: FieldKey; // 키패드가 입력할 현재 필드
}

const ORDER: FieldKey[] = ["class", "number", "pin"];
export const MAX_LEN: Record<FieldKey, number> = { class: 2, number: 2, pin: 4 };

export function initialForm(): FormState {
  return { grade: null, class: "", number: "", pin: "", active: "class" };
}

export function setActive(s: FormState, f: FieldKey): FormState {
  return { ...s, active: f };
}

export function setGrade(s: FormState, g: number): FormState {
  return { ...s, grade: g };
}

/** active 필드에 숫자 한 자리 추가. 가득 차면 다음 필드로 자동 이동. */
export function applyDigit(s: FormState, d: string): FormState {
  const cur = s[s.active];
  if (cur.length >= MAX_LEN[s.active]) return s; // 가득 참 → 무시
  const next: FormState = { ...s, [s.active]: cur + d };
  if (next[s.active].length >= MAX_LEN[s.active]) {
    const i = ORDER.indexOf(s.active);
    if (i < ORDER.length - 1) next.active = ORDER[i + 1];
  }
  return next;
}

/** active 필드의 마지막 글자 삭제. 비어 있으면 이전 필드로 이동. */
export function applyBackspace(s: FormState): FormState {
  const cur = s[s.active];
  if (cur.length > 0) return { ...s, [s.active]: cur.slice(0, -1) };
  const i = ORDER.indexOf(s.active);
  if (i > 0) return { ...s, active: ORDER[i - 1] };
  return s;
}

export function isComplete(s: FormState): boolean {
  return s.grade !== null && s.class !== "" && s.number !== "" && s.pin.length === 4;
}

export function toCredentials(s: FormState, schoolId: string): Credentials {
  return {
    school_id: schoolId,
    grade: s.grade ?? 0,
    class: Number(s.class),
    number: Number(s.number),
    pin: s.pin,
  };
}

/** 마지막 사용 학교를 기본 선택, 없으면 첫 번째. 목록이 비면 null. */
export function pickDefaultSchool(schools: School[], lastId: string | null): School | null {
  if (schools.length === 0) return null;
  return schools.find((s) => s.id === lastId) ?? schools[0];
}

/** verify 실패 원인을 분류: 자격증명 문제(4xx)면 "auth", 통신/서버 문제면 "network". */
export function classifyVerifyError(err: unknown): "auth" | "network" {
  if (err instanceof ApiError) return err.status >= 500 ? "network" : "auth";
  return "network";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- auth.logic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/auth/auth.logic.ts src/scenes/auth/auth.logic.test.ts
git commit -m "feat(auth): add pure form/state logic for the Auth scene

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Assets + Auth shell rendering the chooser

**Files:**
- Create: `src/assets/auth/Background01.png`, `src/assets/auth/PanelBackground01.png`, `src/assets/auth/TitleBanner.png` (copied)
- Create: `src/scenes/Auth.css`
- Create: `src/scenes/auth/Chooser.tsx`
- Modify: `src/scenes/Auth.tsx` (replace stub)

**Interfaces:**
- Consumes: nothing from prior tasks (UI only).
- Produces: `Chooser` component with props `{ onLogin: () => void; onSignup: () => void }`; `Auth` renders the background/banner/panel frame and screen-routes on an internal `screen` state (`"chooser"` only for now).

- [ ] **Step 1: Copy the art assets into src/assets/**

Run:
```bash
mkdir -p src/assets/auth
cp mytemp/Background01.png mytemp/PanelBackground01.png mytemp/TitleBanner.png src/assets/auth/
ls src/assets/auth
```
Expected: the three PNGs listed. (They live under `src/` — not `public/` — so Vite processes their URLs and they work under `base: "./"` in the APK WebView.)

- [ ] **Step 2: Write the chooser component**

Create `src/scenes/auth/Chooser.tsx`:

```tsx
// 첫 화면: 로그인 / 회원가입 두 갈래(게스트 없음).
interface Props {
  onLogin: () => void;
  onSignup: () => void;
}

export default function Chooser({ onLogin, onSignup }: Props) {
  return (
    <div className="auth-chooser">
      <p className="auth-panel__title">어떻게 시작할까요?</p>
      <button type="button" className="btn auth-bigbtn" onClick={onLogin}>
        로그인
      </button>
      <button type="button" className="btn ghost auth-bigbtn" onClick={onSignup}>
        회원가입
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write the scene container**

Replace `src/scenes/Auth.tsx` entirely:

```tsx
import { useState } from "react";
import Chooser from "./auth/Chooser";
import "./Auth.css";
import bannerUrl from "../assets/auth/TitleBanner.png";

type Screen = "checking" | "welcome" | "chooser" | "login" | "signup";

export default function Auth() {
  const [screen, setScreen] = useState<Screen>("chooser");

  return (
    <div className="auth">
      <img className="auth__banner" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />
      <div className="auth__panel">
        {screen === "chooser" && (
          <Chooser onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} />
        )}
        {screen === "login" && <p className="auth-panel__title">로그인 (다음 작업)</p>}
        {screen === "signup" && <p className="auth-panel__title">회원가입 (다음 작업)</p>}
      </div>
    </div>
  );
}
```

Note: the banner is imported (`import bannerUrl from "../assets/auth/TitleBanner.png"`) so Vite fingerprints it and emits a base-relative URL that works in the dev server AND the Capacitor WebView (`base: "./"`). Do not hardcode a `/img/...` path — a leading `/` fails under the APK's `file://` origin.

- [ ] **Step 4: Write the layout CSS**

Create `src/scenes/Auth.css`:

```css
.auth {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;
  background:
    url("../assets/auth/Background01.png") center / cover no-repeat,
    #0b1020;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2vh, 24px);
}

.auth__banner {
  width: min(52vw, 720px);
  height: auto;
  margin-top: calc(env(safe-area-inset-top) + 1vh);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5));
}

/* 패널: PanelBackground01.png을 border-image처럼 늘려 쓰는 대신 단순 배경 + 발광 테두리 */
.auth__panel {
  position: relative;
  width: min(70vw, 900px);
  min-height: 46vh;
  padding: clamp(20px, 4vh, 40px);
  background: url("../assets/auth/PanelBackground01.png") center / 100% 100% no-repeat;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.auth-panel__title {
  font-size: clamp(22px, 3.4vh, 34px);
  font-weight: 800;
  margin: 0 0 clamp(12px, 2.4vh, 28px);
  text-align: center;
}

.auth-chooser {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(14px, 2.6vh, 26px);
  width: 100%;
}

.auth-bigbtn {
  width: min(60%, 420px);
  font-size: clamp(20px, 3vh, 28px);
  padding: clamp(14px, 2.4vh, 22px);
  border-radius: 999px;
}
```

- [ ] **Step 5: Verify lint + build pass**

Run: `npm run lint && npm run build`
Expected: both succeed, no type errors.

- [ ] **Step 6: Manual check**

Run: `npm run dev`, open the app, navigate Intro → 시작하기 (or go to `/#/auth`). Confirm: space background, title banner on top, panel with "어떻게 시작할까요?" and 로그인 / 회원가입 buttons. Tapping a button swaps to the placeholder text.

- [ ] **Step 7: Commit**

```bash
git add src/assets/auth src/scenes/Auth.tsx src/scenes/Auth.css src/scenes/auth/Chooser.tsx
git commit -m "feat(auth): scaffold Auth scene frame + chooser screen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: NumberKeypad + PinDots components

**Files:**
- Create: `src/scenes/auth/NumberKeypad.tsx`
- Create: `src/scenes/auth/PinDots.tsx`
- Modify: `src/scenes/Auth.css` (append keypad/dots styles)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `NumberKeypad` props `{ onDigit: (d: string) => void; onBackspace: () => void }`.
  - `PinDots` props `{ length: number; total?: number }` (default `total = 4`).

- [ ] **Step 1: Write NumberKeypad**

Create `src/scenes/auth/NumberKeypad.tsx`:

```tsx
// 앱 내장 숫자 키패드(0~9, ⌫). 표현만 담당 — 상태/서버 로직 없음.
// 내장 키패드가 문제되면 이 컴포넌트만 안드로이드 키보드로 교체한다.
interface Props {
  onDigit: (d: string) => void;
  onBackspace: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function NumberKeypad({ onDigit, onBackspace }: Props) {
  return (
    <div className="keypad" role="group" aria-label="숫자 키패드">
      {KEYS.map((k) => (
        <button key={k} type="button" className="keypad__key" onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <span className="keypad__spacer" aria-hidden="true" />
      <button type="button" className="keypad__key" onClick={() => onDigit("0")}>
        0
      </button>
      <button
        type="button"
        className="keypad__key keypad__key--back"
        onClick={onBackspace}
        aria-label="지우기"
      >
        ⌫
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write PinDots**

Create `src/scenes/auth/PinDots.tsx`:

```tsx
// 비밀번호 입력 자릿수를 ● ○ 로 표시(4자리).
interface Props {
  length: number;
  total?: number;
}

export default function PinDots({ length, total = 4 }: Props) {
  return (
    <div className="pin-dots" aria-label={`비밀번호 ${length}자리 입력됨`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pin-dots__dot${i < length ? " is-filled" : ""}`} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Append styles**

Append to `src/scenes/Auth.css`:

```css
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(8px, 1.4vh, 14px);
  width: min(38%, 300px);
}
.keypad__key {
  aspect-ratio: 3 / 2;
  font-size: clamp(22px, 3.4vh, 30px);
  font-weight: 800;
  color: #fff;
  background: #1e293b;
  border: none;
  border-radius: 16px;
  box-shadow: 0 5px 0 #0f172a;
}
.keypad__key:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #0f172a;
}
.keypad__key--back {
  font-size: clamp(20px, 3vh, 26px);
}
.keypad__spacer {
  /* 0 키를 가운데 칸에 두기 위한 빈 칸 */
}

.pin-dots {
  display: flex;
  gap: 14px;
  justify-content: center;
}
.pin-dots__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #93c5fd;
  background: transparent;
}
.pin-dots__dot.is-filled {
  background: #93c5fd;
}
```

- [ ] **Step 4: Verify lint + build pass**

Run: `npm run lint && npm run build`
Expected: success (components compile; unused-import warnings are acceptable only if the linter passes — both are imported in Task 5, so if `npm run lint` fails on "unused", skip wiring verification here and rely on Task 5's gate; do NOT add throwaway usage).

Note: if oxlint flags the new components as unused exports, that's expected until Task 5 imports them; oxlint does not error on unused module exports, so `lint` should pass. If `build` fails on unused, it will be `noUnusedLocals` inside a file only — these files have none.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/auth/NumberKeypad.tsx src/scenes/auth/PinDots.tsx src/scenes/Auth.css
git commit -m "feat(auth): add NumberKeypad and PinDots presentational components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: CredentialForm + SchoolPicker, wired into the login flow

**Files:**
- Create: `src/scenes/auth/SchoolPicker.tsx`
- Create: `src/scenes/auth/CredentialForm.tsx`
- Modify: `src/scenes/Auth.tsx` (login screen → verify → session → navigate)
- Modify: `src/scenes/Auth.css` (append form layout)

**Interfaces:**
- Consumes: `auth.logic.ts` (all form helpers, `pickDefaultSchool`, `classifyVerifyError`); `NumberKeypad`, `PinDots`; `getSchools`, `verify`, `type School` from `src/lib/auth.ts`; `getProgress` from `src/lib/progress.ts`; `setSession` from `src/lib/session.ts`; `Credentials` from `src/lib/api.ts`.
- Produces:
  - `SchoolPicker` props `{ schools: School[]; value: string | null; onChange: (id: string) => void }`.
  - `CredentialForm` props `{ mode: "login" | "signup"; schools: School[]; submitting: boolean; errorMsg: string | null; onSubmit: (creds: Credentials, name: string) => void }`. (For login, `name` is `""`.)

- [ ] **Step 1: Write SchoolPicker**

Create `src/scenes/auth/SchoolPicker.tsx`:

```tsx
// 학교 선택. 학교가 1개여도 항상 표시한다(나중에 학교가 늘어도 UI가 그대로).
import type { School } from "../../lib/auth";

interface Props {
  schools: School[];
  value: string | null;
  onChange: (id: string) => void;
}

export default function SchoolPicker({ schools, value, onChange }: Props) {
  return (
    <label className="field field--school">
      <span className="field__label">학교</span>
      <select
        className="field__select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Write CredentialForm**

Create `src/scenes/auth/CredentialForm.tsx`:

```tsx
// 학교 + 학년(버튼) + 반/번호/비밀번호(공용 키패드) [+ 이름(signup만, 시스템 키보드)].
// 서버 호출은 하지 않는다 — 완성된 Credentials를 onSubmit으로 올린다.
import { useState } from "react";
import type { School } from "../../lib/auth";
import type { Credentials } from "../../lib/api";
import {
  initialForm,
  applyDigit,
  applyBackspace,
  setActive,
  setGrade,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  type FieldKey,
} from "./auth.logic";
import NumberKeypad from "./NumberKeypad";
import PinDots from "./PinDots";

interface Props {
  mode: "login" | "signup";
  schools: School[];
  submitting: boolean;
  errorMsg: string | null;
  onSubmit: (creds: Credentials, name: string) => void;
}

const GRADES = [1, 2, 3, 4, 5, 6];

export default function CredentialForm({ mode, schools, submitting, errorMsg, onSubmit }: Props) {
  const [form, setForm] = useState(initialForm);
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(
    () => pickDefaultSchool(schools, null)?.id ?? null,
  );

  const nameOk = mode === "login" || name.trim().length > 0;
  const canSubmit = !submitting && schoolId !== null && isComplete(form) && nameOk;

  const numField = (key: FieldKey, label: string, value: string) => (
    <button
      type="button"
      className={`field field--num${form.active === key ? " is-active" : ""}`}
      onClick={() => setForm(setActive(form, key))}
    >
      <span className="field__label">{label}</span>
      <span className="field__value">{value || "—"}</span>
    </button>
  );

  return (
    <div className="auth-form">
      <div className="auth-form__left">
        <SchoolRow schools={schools} value={schoolId} onChange={setSchoolId} />

        {mode === "signup" && (
          <label className="field field--name">
            <span className="field__label">이름</span>
            <input
              className="field__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              maxLength={20}
            />
          </label>
        )}

        <div className="grade-row">
          <span className="field__label">학년</span>
          <div className="grade-row__btns">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                className={`grade-btn${form.grade === g ? " is-active" : ""}`}
                onClick={() => setForm(setGrade(form, g))}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="num-row">
          {numField("class", "반", form.class)}
          {numField("number", "번호", form.number)}
          <button
            type="button"
            className={`field field--num${form.active === "pin" ? " is-active" : ""}`}
            onClick={() => setForm(setActive(form, "pin"))}
          >
            <span className="field__label">비밀번호</span>
            <PinDots length={form.pin.length} />
          </button>
        </div>

        {errorMsg && <p className="auth-error">{errorMsg}</p>}

        <button
          type="button"
          className="btn auth-submit"
          disabled={!canSubmit}
          onClick={() => schoolId && onSubmit(toCredentials(form, schoolId), name.trim())}
        >
          {submitting ? "잠시만요…" : mode === "login" ? "로그인" : "가입하기"}
        </button>
      </div>

      <div className="auth-form__right">
        <NumberKeypad
          onDigit={(d) => setForm((s) => applyDigit(s, d))}
          onBackspace={() => setForm((s) => applyBackspace(s))}
        />
      </div>
    </div>
  );
}

// SchoolPicker를 form 내부 행으로 감싼 얇은 래퍼(라벨 정렬용).
import SchoolPicker from "./SchoolPicker";
function SchoolRow(props: { schools: School[]; value: string | null; onChange: (id: string) => void }) {
  return <SchoolPicker {...props} />;
}
```

(Keep the `import SchoolPicker` line at the top with the other imports when you write the file — it is shown here at the bottom only for readability; move it up so all imports are grouped.)

- [ ] **Step 3: Append form layout CSS**

Append to `src/scenes/Auth.css`:

```css
.auth-form {
  display: flex;
  gap: clamp(16px, 3vw, 40px);
  width: 100%;
  align-items: center;
}
.auth-form__left {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.8vh, 18px);
  min-width: 0;
}
.auth-form__right {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
}

.field__label {
  font-size: clamp(13px, 1.8vh, 16px);
  font-weight: 700;
  opacity: 0.85;
}
.field--school,
.field--name {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}
.field__select,
.field__input {
  font: inherit;
  font-size: clamp(16px, 2.2vh, 20px);
  padding: 10px 12px;
  border-radius: 12px;
  border: none;
  background: #0f172a;
  color: #fff;
}

.grade-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}
.grade-row__btns {
  display: flex;
  gap: 8px;
}
.grade-btn {
  flex: 1 1 0;
  padding: clamp(8px, 1.6vh, 14px) 0;
  font-size: clamp(16px, 2.4vh, 22px);
  font-weight: 800;
  color: #fff;
  background: #1e293b;
  border: 2px solid transparent;
  border-radius: 12px;
}
.grade-btn.is-active {
  background: #7c3aed;
  border-color: #c4b5fd;
}

.num-row {
  display: flex;
  gap: 10px;
}
.field--num {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: clamp(8px, 1.6vh, 14px);
  background: #0f172a;
  border: 2px solid transparent;
  border-radius: 14px;
  color: #fff;
}
.field--num.is-active {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.35);
}
.field__value {
  font-size: clamp(20px, 3vh, 28px);
  font-weight: 800;
  letter-spacing: 2px;
}

.auth-error {
  color: #fca5a5;
  font-size: clamp(14px, 2vh, 18px);
  font-weight: 700;
  margin: 0;
}
.auth-submit {
  align-self: center;
  width: min(70%, 360px);
  font-size: clamp(20px, 3vh, 26px);
  border-radius: 999px;
}
.auth-submit:disabled {
  opacity: 0.5;
  box-shadow: none;
}
```

- [ ] **Step 4: Wire login into Auth.tsx**

Replace `src/scenes/Auth.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chooser from "./auth/Chooser";
import CredentialForm from "./auth/CredentialForm";
import { classifyVerifyError } from "./auth/auth.logic";
import { getSchools, verify, type School } from "../lib/auth";
import { getProgress } from "../lib/progress";
import { setSession } from "../lib/session";
import type { Credentials } from "../lib/api";
import "./Auth.css";
import bannerUrl from "../assets/auth/TitleBanner.png";

type Screen = "checking" | "welcome" | "chooser" | "login" | "signup";

export default function Auth() {
  const nav = useNavigate();
  const [screen, setScreen] = useState<Screen>("chooser");
  const [schools, setSchools] = useState<School[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 학교 목록은 로그인/회원가입 진입 시 필요 — 처음 한 번 불러온다.
  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  // 로그인 성공 공통 처리: 세션 채우고 Home으로.
  async function enter(creds: Credentials) {
    const profile = await verify(creds); // 성공 시 자격증명 저장(api 레이어)
    const { progress } = await getProgress();
    setSession({ profile, progress });
    nav("/home");
  }

  async function handleLogin(creds: Credentials) {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await enter(creds);
    } catch (err) {
      setErrorMsg(
        classifyVerifyError(err) === "auth"
          ? "번호나 비밀번호가 맞지 않아요. 선생님께 물어보세요."
          : "인터넷 연결을 확인해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <img className="auth__banner" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />
      <div className="auth__panel">
        {screen === "chooser" && (
          <Chooser onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} />
        )}
        {screen === "login" && (
          <CredentialForm
            mode="login"
            schools={schools}
            submitting={submitting}
            errorMsg={errorMsg}
            onSubmit={(creds) => handleLogin(creds)}
          />
        )}
        {screen === "signup" && <p className="auth-panel__title">회원가입 (다음 작업)</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify lint + build + tests pass**

Run: `npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Manual check**

Run `npm run dev`. Chooser → 로그인. Confirm: school dropdown shows (even with one school), 학년 buttons select, tapping 반/번호/비밀번호 highlights the active field, the keypad types into the active field and auto-advances, PIN shows dots and stops at 4. Enter a known-good account → lands on `/home`. Enter a wrong PIN → red message, no navigation.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/auth/SchoolPicker.tsx src/scenes/auth/CredentialForm.tsx src/scenes/Auth.tsx src/scenes/Auth.css
git commit -m "feat(auth): implement login form with keypad, school picker, verify

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Auto-login (checking) + welcome panel

**Files:**
- Create: `src/scenes/auth/WelcomePanel.tsx`
- Modify: `src/scenes/Auth.tsx` (initial `checking` state, auto-verify, welcome screen)

**Interfaces:**
- Consumes: `hasCredentials`, `verify`, `logout`, `getProfile`-not-needed; `credentialStore` from `src/lib/api.ts`; `classifyVerifyError`; `setSession`, `clearSession`.
- Produces: `WelcomePanel` props `{ name: string; onContinue: () => void; onSwitch: () => void; busy: boolean }`.

- [ ] **Step 1: Write WelcomePanel**

Create `src/scenes/auth/WelcomePanel.tsx`:

```tsx
// 자동 로그인 성공 시 환영 패널. 계속하기 / 다른 계정으로 로그인.
interface Props {
  name: string;
  onContinue: () => void;
  onSwitch: () => void;
  busy: boolean;
}

export default function WelcomePanel({ name, onContinue, onSwitch, busy }: Props) {
  return (
    <div className="auth-chooser">
      <p className="auth-panel__title">{name}님, 환영해요!</p>
      <button type="button" className="btn auth-bigbtn" disabled={busy} onClick={onContinue}>
        {busy ? "잠시만요…" : "계속하기"}
      </button>
      <button type="button" className="btn ghost auth-bigbtn" disabled={busy} onClick={onSwitch}>
        다른 계정으로 로그인
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add auto-login to Auth.tsx**

Edit `src/scenes/Auth.tsx`. Add imports:

```tsx
import WelcomePanel from "./auth/WelcomePanel";
import { credentialStore } from "../lib/api";
import { logout } from "../lib/auth";
import { clearSession } from "../lib/session";
```

Change the initial screen and add state:

```tsx
const [screen, setScreen] = useState<Screen>(() =>
  credentialStore.get() ? "checking" : "chooser",
);
const [welcomeName, setWelcomeName] = useState("");
```

Add an effect that runs the auto-verify when starting in `checking` (place after the `getSchools` effect):

```tsx
// 저장된 자격증명이 있으면 자동 점검. 성공→welcome, 자격증명 문제→삭제 후 chooser,
// 통신 문제→자격증명 유지하고 chooser(나중에 다시 시도 가능).
useEffect(() => {
  if (screen !== "checking") return;
  const creds = credentialStore.get();
  if (!creds) {
    setScreen("chooser");
    return;
  }
  let alive = true;
  verify(creds)
    .then((profile) => {
      if (!alive) return;
      setWelcomeName(profile.name);
      setScreen("welcome");
    })
    .catch((err) => {
      if (!alive) return;
      if (classifyVerifyError(err) === "auth") logout(); // 잘못된 자격증명 삭제
      setScreen("chooser");
    });
  return () => {
    alive = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Add the continue/switch handlers:

```tsx
async function handleContinue() {
  const creds = credentialStore.get();
  if (!creds) return setScreen("chooser");
  setSubmitting(true);
  try {
    await enter(creds);
  } catch {
    setSubmitting(false);
    setErrorMsg("인터넷 연결을 확인해 주세요.");
    setScreen("login");
  }
}

function handleSwitch() {
  logout();
  clearSession();
  setScreen("login");
}
```

Render the `checking` and `welcome` screens (add inside `.auth__panel`):

```tsx
{screen === "checking" && <p className="auth-panel__title">잠시만요…</p>}
{screen === "welcome" && (
  <WelcomePanel
    name={welcomeName}
    busy={submitting}
    onContinue={handleContinue}
    onSwitch={handleSwitch}
  />
)}
```

- [ ] **Step 3: Verify lint + build + tests pass**

Run: `npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 4: Manual check**

With a valid account already logged in once (credentials stored): reload the app → after Intro you briefly see "잠시만요…" then "○○님, 환영해요!". 계속하기 → `/home`. 다른 계정으로 로그인 → login form. Then clear storage (DevTools → Application → Local Storage → remove `hg.credentials`) and reload → goes straight to chooser.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/auth/WelcomePanel.tsx src/scenes/Auth.tsx
git commit -m "feat(auth): auto-login with verify on launch + welcome panel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Signup

**Files:**
- Modify: `src/scenes/Auth.tsx` (signup screen → signup → auto verify)

**Interfaces:**
- Consumes: `signup`, `type SignupBody` from `src/lib/auth.ts`; the existing `enter()` helper; `CredentialForm` in `mode="signup"`.
- Produces: nothing new.

- [ ] **Step 1: Add the signup handler and render**

Edit `src/scenes/Auth.tsx`. Add import:

```tsx
import { getSchools, verify, logout, signup, type School } from "../lib/auth";
```

(merge with the existing `../lib/auth` import — don't duplicate.)

Add a handler near `handleLogin`:

```tsx
async function handleSignup(creds: Credentials, name: string) {
  setSubmitting(true);
  setErrorMsg(null);
  try {
    await signup({ ...creds, name }); // 가입
    await enter(creds); // 같은 값으로 자동 로그인
  } catch (err) {
    setErrorMsg(
      classifyVerifyError(err) === "auth"
        ? "이미 등록된 번호이거나 입력이 올바르지 않아요. 선생님께 물어보세요."
        : "인터넷 연결을 확인해 주세요.",
    );
    setSubmitting(false);
  }
}
```

Replace the signup placeholder render:

```tsx
{screen === "signup" && (
  <CredentialForm
    mode="signup"
    schools={schools}
    submitting={submitting}
    errorMsg={errorMsg}
    onSubmit={handleSignup}
  />
)}
```

- [ ] **Step 2: Verify lint + build + tests pass**

Run: `npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 3: Manual check**

Chooser → 회원가입. Confirm the 이름 field appears and tapping it brings up the Android/system keyboard (text), while 반/번호/비밀번호 still use the in-app keypad. Fill a new account → 가입하기 → on success lands on `/home` (auto-logged-in). Try a duplicate → friendly error, stays on the form.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/Auth.tsx
git commit -m "feat(auth): signup that auto-logs-in on success

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Back navigation + final gate

**Files:**
- Modify: `src/scenes/auth/CredentialForm.tsx` (add a 뒤로 button), `src/scenes/Auth.tsx` (pass `onBack`)
- Modify: `src/scenes/Auth.css` (back button style)

**Interfaces:**
- Consumes: existing components.
- Produces: `CredentialForm` gains prop `onBack: () => void`.

- [ ] **Step 1: Add onBack to CredentialForm**

In `src/scenes/auth/CredentialForm.tsx`, add `onBack: () => void;` to `Props`, destructure it, and add a back button as the first child of `.auth-form` (above the two columns is fine — wrap the existing `.auth-form` content so the button sits at the top-left):

```tsx
return (
  <div className="auth-form-wrap">
    <button type="button" className="btn ghost auth-back" onClick={onBack}>
      ← 뒤로
    </button>
    <div className="auth-form">
      {/* ...existing left/right columns unchanged... */}
    </div>
  </div>
);
```

- [ ] **Step 2: Pass onBack from Auth.tsx**

In both `CredentialForm` usages (login and signup), add:

```tsx
onBack={() => { setErrorMsg(null); setScreen("chooser"); }}
```

- [ ] **Step 3: Style the back button + wrapper**

Append to `src/scenes/Auth.css`:

```css
.auth-form-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.6vh, 16px);
}
.auth-back {
  align-self: flex-start;
  font-size: clamp(14px, 2vh, 18px);
  padding: 8px 16px;
  border-radius: 999px;
}
```

- [ ] **Step 4: Final verification gate**

Run: `npm run lint && npm test && npm run build`
Expected: all green.

- [ ] **Step 5: Manual full-flow check**

Cold start (no creds) → chooser → 회원가입 → create → home. Logout path not yet in Home, so clear storage manually, reload → chooser. 로그인 → log in → home. Reload → welcome → 계속하기 → home. 다른 계정 → login. 뒤로 buttons return to chooser. Confirm landscape layout: nothing clipped, keypad reachable, no Android keyboard except the name field.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/auth/CredentialForm.tsx src/scenes/Auth.tsx src/scenes/Auth.css
git commit -m "feat(auth): add back navigation from login/signup to chooser

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** chooser (§3.1, Task 3), welcome/auto-login (§3.2, Task 6), login form + keypad (§3.3, Tasks 4–5), signup + name/system keyboard (§3.4, Task 7), school picker always-visible (§4.1, Task 5), components split (§4, Tasks 1–8), session store (§5, Task 1), keypad input + fallback isolation (§6 — `NumberKeypad` isolated in Task 4), error copy (§7, Tasks 5–7), layout (§8, Task 3), out-of-scope logout button placement deferred to Home (§9 — `logout()`/`clearSession()` wired here, button is Home's).
- **Logout (§5/§9):** `handleSwitch` calls `logout()` + `clearSession()`; a dedicated logout button lives in Home (later scene), out of scope here as the spec states.
- **Type consistency:** `FormState`/`FieldKey`/`MAX_LEN`, `Credentials`, `School`, `Profile`, `SessionData`, `classifyVerifyError`, `pickDefaultSchool` names match across Tasks 1–8 and the existing `src/lib` signatures.
- **Progress consumption:** Home/Planet reading `getSession()`/`getProgressValue()` is intentionally out of scope (separate scenes); the store is ready for them.
```