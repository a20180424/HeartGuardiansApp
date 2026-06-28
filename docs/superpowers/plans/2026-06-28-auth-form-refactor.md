# Auth Input-Form Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auth login/signup form's shared number-keypad + PinDots UI with dropdowns (학년/반/번호) and system-keyboard PIN inputs, in a single fixed-size panel, adding a signup password-confirm field.

**Architecture:** Pure form logic lives in `auth.logic.ts` (refactored, TDD). `CredentialForm.tsx` is rewritten as a single-column form of `<select>`/`<input>` controls. `Auth.css` collapses the panel to one fixed size for all states and replaces the 2-column/keypad styles. `Auth.tsx` drops its compact/wide panel branch.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest. CSS in `src/scenes/Auth.css`.

## Global Constraints

- Target viewport: **1280 × 800 CSS px, DPR 1.5, landscape**, immersive fullscreen (use `100dvh`/`100svh`, no browser chrome). All visual checks at this size.
- Dropdown ranges: **학년 1–6, 반 1–10, 번호 1–30**.
- Dropdowns start **unselected** (placeholder "선택"); user must choose.
- PIN: 4 digits, **shown as digits** (not masked), system numeric keyboard.
- Panel: **single fixed px size** for all 5 states (checking/welcome/chooser/login/signup), content vertically centered. Final px tuned via DevTools in Task 4.
- Do not change `Auth.tsx` server-call / state-transition flow; the form only produces `Credentials` + `name`.
- Keep the 9-slice `border-image` glow frame on `.auth__panel`.

---

### Task 1: Refactor `auth.logic.ts` and its tests

**Files:**
- Modify: `src/scenes/auth/auth.logic.ts`
- Test: `src/scenes/auth/auth.logic.test.ts`

**Interfaces:**
- Consumes: `Credentials` from `../../lib/api`, `School` from `../../lib/auth`, `ApiError` from `../../lib/api`.
- Produces:
  - `interface FormState { grade: number|null; class: number|null; number: number|null; pin: string; pinConfirm: string }`
  - `initialForm(): FormState`
  - `sanitizePin(raw: string): string`
  - `isComplete(s: FormState, mode: "login"|"signup", name: string): boolean`
  - `toCredentials(s: FormState, schoolId: string): Credentials`
  - `pickDefaultSchool(schools: School[], lastId: string|null): School|null` (unchanged)
  - `classifyVerifyError(err: unknown): "auth"|"network"` (unchanged)
  - **Removed:** `FieldKey`, `MAX_LEN`, `setActive`, `setGrade`, `applyDigit`, `applyBackspace`.

- [ ] **Step 1: Replace the test file**

Replace the entire contents of `src/scenes/auth/auth.logic.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import {
  initialForm,
  sanitizePin,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  classifyVerifyError,
  type FormState,
} from "./auth.logic";
import { ApiError } from "../../lib/api";
import type { School } from "../../lib/auth";

const filled: FormState = { grade: 3, class: 2, number: 12, pin: "1234", pinConfirm: "1234" };

describe("credential form logic", () => {
  it("initialForm은 모든 값이 비어있다", () => {
    expect(initialForm()).toEqual({
      grade: null,
      class: null,
      number: null,
      pin: "",
      pinConfirm: "",
    });
  });

  it("sanitizePin은 숫자만 남기고 4자리로 자른다", () => {
    expect(sanitizePin("12a3b456")).toBe("1234");
    expect(sanitizePin("")).toBe("");
    expect(sanitizePin("99")).toBe("99");
  });

  it("login isComplete는 학년/반/번호/pin(4)만 채우면 true", () => {
    expect(isComplete(filled, "login", "")).toBe(true);
    expect(isComplete({ ...filled, pin: "12" }, "login", "")).toBe(false);
    expect(isComplete({ ...filled, class: null }, "login", "")).toBe(false);
  });

  it("signup isComplete는 이름과 비밀번호 확인까지 맞아야 true", () => {
    expect(isComplete(filled, "signup", "이시형")).toBe(true);
    expect(isComplete(filled, "signup", "  ")).toBe(false); // 이름 공백
    expect(isComplete({ ...filled, pinConfirm: "0000" }, "signup", "이시형")).toBe(false); // 불일치
  });

  it("toCredentials는 폼 값을 그대로 Credentials로 만든다", () => {
    expect(toCredentials(filled, "school-uuid")).toEqual({
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

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- auth.logic`
Expected: FAIL — `sanitizePin` is not exported, `initialForm` shape mismatch, `isComplete` arity mismatch.

- [ ] **Step 3: Replace `auth.logic.ts`**

Replace the entire contents of `src/scenes/auth/auth.logic.ts` with:

```ts
// Auth Scene의 순수 로직(서버/DOM 의존 없음). 컴포넌트는 이 함수들만 호출한다.
import { ApiError, type Credentials } from "../../lib/api";
import type { School } from "../../lib/auth";

export interface FormState {
  grade: number | null; // 1~6 (select)
  class: number | null; // 1~10 (select)
  number: number | null; // 1~30 (select)
  pin: string; // 4자리, 시스템 키보드 입력
  pinConfirm: string; // signup 전용 확인 입력
}

export function initialForm(): FormState {
  return { grade: null, class: null, number: null, pin: "", pinConfirm: "" };
}

/** 숫자만 남기고 최대 4자리로 자른다(PIN/확인 입력 정제). */
export function sanitizePin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

/** 폼 완성 여부. signup이면 이름(공백 아님)과 비밀번호 확인 일치까지 본다. */
export function isComplete(s: FormState, mode: "login" | "signup", name: string): boolean {
  const base = s.grade !== null && s.class !== null && s.number !== null && s.pin.length === 4;
  if (mode === "login") return base;
  return base && name.trim().length > 0 && s.pin === s.pinConfirm;
}

export function toCredentials(s: FormState, schoolId: string): Credentials {
  return {
    school_id: schoolId,
    grade: s.grade ?? 0,
    class: s.class ?? 0,
    number: s.number ?? 0,
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- auth.logic`
Expected: PASS (all cases in `auth.logic.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/auth/auth.logic.ts src/scenes/auth/auth.logic.test.ts
git commit -m "refactor(auth): form logic for select/input inputs (drop keypad logic)"
```

---

### Task 2: Rewrite `CredentialForm.tsx`, delete keypad/dots components

**Files:**
- Modify: `src/scenes/auth/CredentialForm.tsx`
- Delete: `src/scenes/auth/NumberKeypad.tsx`, `src/scenes/auth/PinDots.tsx`

**Interfaces:**
- Consumes: `initialForm`, `isComplete`, `toCredentials`, `pickDefaultSchool`, `sanitizePin` (Task 1); `SchoolPicker` (unchanged); `School`, `Credentials` types.
- Produces: default export `CredentialForm` with unchanged `Props` (`mode`, `schools`, `submitting`, `errorMsg`, `onSubmit(creds, name)`, `onBack`). New CSS classes consumed by Task 3: `.auth-form` (now column), `.select-row`, `.field--select`, `.field--pin`.

- [ ] **Step 1: Replace `CredentialForm.tsx`**

Replace the entire contents of `src/scenes/auth/CredentialForm.tsx` with:

```tsx
// 학교 + 이름(signup) + 학년/반/번호(드롭다운) + 비밀번호[/확인](시스템 키보드).
// 서버 호출은 하지 않는다 — 완성된 Credentials를 onSubmit으로 올린다.
import { useEffect, useState } from "react";
import type { School } from "../../lib/auth";
import type { Credentials } from "../../lib/api";
import {
  initialForm,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  sanitizePin,
} from "./auth.logic";
import SchoolPicker from "./SchoolPicker";

interface Props {
  mode: "login" | "signup";
  schools: School[];
  submitting: boolean;
  errorMsg: string | null;
  onSubmit: (creds: Credentials, name: string) => void;
  onBack: () => void;
}

const GRADES = Array.from({ length: 6 }, (_, i) => i + 1); // 1..6
const CLASSES = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10
const NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1); // 1..30

export default function CredentialForm({ mode, schools, submitting, errorMsg, onSubmit, onBack }: Props) {
  const [form, setForm] = useState(initialForm);
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(
    () => pickDefaultSchool(schools, null)?.id ?? null,
  );

  // 학교 목록은 비동기로 도착한다. 아직 미선택이면 기본 학교를 채운다.
  useEffect(() => {
    if (schoolId === null) {
      const def = pickDefaultSchool(schools, null);
      if (def) setSchoolId(def.id);
    }
  }, [schools, schoolId]);

  const mismatch =
    mode === "signup" && form.pinConfirm.length === 4 && form.pin !== form.pinConfirm;
  const canSubmit = !submitting && schoolId !== null && isComplete(form, mode, name);

  const numSelect = (key: "grade" | "class" | "number", label: string, options: number[]) => (
    <label className="field field--select">
      <span className="field__label">{label}</span>
      <select
        className="field__select"
        value={form[key] ?? ""}
        onChange={(e) =>
          setForm((s) => ({ ...s, [key]: e.target.value === "" ? null : Number(e.target.value) }))
        }
      >
        <option value="" disabled>
          선택
        </option>
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  const pinInput = (key: "pin" | "pinConfirm", label: string, placeholder: string) => (
    <label className="field field--pin">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={form[key]}
        onChange={(e) => setForm((s) => ({ ...s, [key]: sanitizePin(e.target.value) }))}
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <div className="auth-form-wrap">
      <button type="button" className="btn ghost auth-back" onClick={onBack}>
        ← 뒤로
      </button>

      <div className="auth-form">
        <SchoolPicker schools={schools} value={schoolId} onChange={setSchoolId} />

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

        <div className="select-row">
          {numSelect("grade", "학년", GRADES)}
          {numSelect("class", "반", CLASSES)}
          {numSelect("number", "번호", NUMBERS)}
        </div>

        {pinInput("pin", "비밀번호", "숫자 4자리")}
        {mode === "signup" && pinInput("pinConfirm", "비밀번호 확인", "다시 입력")}

        {mismatch && <p className="auth-error">비밀번호가 일치하지 않아요.</p>}
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
    </div>
  );
}
```

- [ ] **Step 2: Delete the keypad and dots components**

```bash
git rm src/scenes/auth/NumberKeypad.tsx src/scenes/auth/PinDots.tsx
```

- [ ] **Step 3: Verify there are no remaining imports of the deleted files**

Run: `grep -rn "NumberKeypad\|PinDots" src/`
Expected: no output (no remaining references).

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (CSS classes don't typecheck; styling lands in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/auth/CredentialForm.tsx
git commit -m "refactor(auth): rewrite CredentialForm with selects + system-keyboard PIN"
```

---

### Task 3: Fixed-size panel + form styles (`Auth.css`, `Auth.tsx`)

**Files:**
- Modify: `src/scenes/Auth.css`
- Modify: `src/scenes/Auth.tsx`

**Interfaces:**
- Consumes: classes emitted by Task 2 (`.auth-form` column, `.select-row`, `.field--select`, `.field--pin`).
- Produces: `.auth__panel` at one fixed size for all states; `.auth__panel--compact` removed.

- [ ] **Step 1: `Auth.tsx` — drop the compact/wide panel branch**

In `src/scenes/Auth.tsx`, remove the `compact` variable and use a plain panel class. Replace:

```tsx
  // 내용이 적은 화면(고르기·환영·점검)은 컴팩트 패널, 폼 화면은 넓은 패널.
  const compact = screen === "checking" || screen === "welcome" || screen === "chooser";

  return (
    <div className="auth">
      <img className="auth__banner" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />
      <div className={`auth__panel${compact ? " auth__panel--compact" : ""}`}>
```

with:

```tsx
  return (
    <div className="auth">
      <img className="auth__banner" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />
      <div className="auth__panel">
```

- [ ] **Step 2: `Auth.css` — fixed panel size, remove compact variant**

In `src/scenes/Auth.css`, replace the `.auth__panel` rule and the `.auth__panel--compact` rule with this single rule (drops `width: min(...)`, `min-height`, and the whole `--compact` block):

```css
.auth__panel {
  position: relative;
  /* ── 노브: 단일 고정 패널 크기 (모든 상태 공통, Task 4에서 DevTools로 확정) ── */
  width: 600px;
  height: 460px;
  /* ── 노브: 글로우 테두리 두께(↑면 글로우 두껍게/코너 크게) ── */
  border: 34px solid transparent;
  border-image: url("../assets/auth/PanelBackground01.png") 44 fill / 34px / 0 stretch;
  padding: clamp(10px, 2vh, 22px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 3: `Auth.css` — replace 2-column/keypad form styles with single-column styles**

In `src/scenes/Auth.css`, **delete** these now-unused rules entirely:
`.keypad`, `.keypad__key`, `.keypad__key:active`, `.keypad__key--back`, `.keypad__spacer`, `.pin-dots`, `.pin-dots__dot`, `.pin-dots__dot.is-filled`, `.auth-form__left`, `.auth-form__right`, `.grade-row`, `.grade-row__btns`, `.grade-btn`, `.grade-btn.is-active`, `.num-row`, `.field--num`, `.field--num.is-active`, `.field__value`.

Then **replace** the `.auth-form` rule with the column layout below, and add `.select-row` + extend the `.field--*` group. Final state of the form-related rules:

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

.auth-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.4vh, 14px);
}

/* 학년·반·번호를 한 줄에 균등 분배 */
.select-row {
  display: flex;
  gap: 10px;
}
.field--select {
  flex: 1 1 0;
  min-width: 0;
}

.field--school,
.field--name,
.field--select,
.field--pin {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.field__label {
  font-size: clamp(13px, 1.8vh, 16px);
  font-weight: 700;
  opacity: 0.85;
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

.auth-error {
  color: #fca5a5;
  font-size: clamp(14px, 2vh, 18px);
  font-weight: 700;
  margin: 0;
}
.auth-submit {
  align-self: center;
  width: min(70%, 360px);
  font-size: clamp(18px, 2.6vh, 24px);
  border-radius: 999px;
}
.auth-submit:disabled {
  opacity: 0.5;
  box-shadow: none;
}
```

> Note: the existing `.field__label`, `.field__select`, `.field__input`, `.auth-error`, `.auth-submit`, `.auth-back`, `.auth-form-wrap` rules already exist in the file — consolidate so each selector appears once with the values above (remove the old duplicates you replaced).

- [ ] **Step 4: Typecheck and run tests**

Run: `npx tsc -b && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/Auth.css src/scenes/Auth.tsx
git commit -m "style(auth): single fixed panel + single-column select/input form"
```

---

### Task 4: Visual verification at 1280×800 and finalize panel size

**Files:**
- Modify: `src/scenes/Auth.css` (final fixed `.auth__panel` `width`/`height` and, if needed, `.auth` `padding-top`/`gap`)

**Interfaces:**
- Consumes: rendered app from Tasks 1–3.
- Produces: final tuned panel px values.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev -- --host 127.0.0.1 --port 5199`
Then load `http://127.0.0.1:5199/#/auth` in a browser at a **1280×800** viewport.

- [ ] **Step 2: Screenshot/inspect all five states**

Verify, at 1280×800, that each state's content fits inside the fixed glow panel with no clipping:
- chooser ("어떻게 시작할까요?" + 2 buttons)
- login (학교 / [학년·반·번호] / 비밀번호 / 로그인)
- signup (학교 / 이름 / [학년·반·번호] / 비밀번호 / 비밀번호 확인 / 가입하기) — **the tallest; confirm `가입하기` is not clipped at the screen bottom**
- welcome (requires a stored credential; reach via real login below) — "이시형님 / 환영해요!" + 2 buttons
- checking ("잠시만요…") — single line centered

For exact measurements, in the browser console:
```js
const p = document.querySelector('.auth__panel').getBoundingClientRect();
const s = document.querySelector('.auth-submit')?.getBoundingClientRect();
console.log({ panelBottom: p.bottom, submitBottom: s?.bottom, vh: innerHeight });
```
Expected: `panelBottom <= 800` and `submitBottom <= 800` (no clipping).

- [ ] **Step 3: Tune the fixed panel size**

If signup overflows or there is excess empty space, adjust in `src/scenes/Auth.css`:
- `.auth__panel { width; height }` — the fixed panel size.
- `.auth { padding-top; gap }` — vertical position, if the panel needs to sit higher to fit 800.

Re-check Step 2 after each change until all five states fit with the panel bottom ≤ 800.

- [ ] **Step 4: End-to-end login check**

Log in with 서룡초등학교 / 학년 1 / 반 1 / 번호 1 / 비밀번호 5555 → expect navigation to `/home`. Reload `#/auth` → expect the **welcome** state to render inside the fixed panel without clipping.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/Auth.css
git commit -m "style(auth): finalize fixed auth panel size for all states"
```

---

## Self-Review

**Spec coverage:**
- Remove keypad/PinDots → Task 2. ✓
- 학년/반/번호 dropdowns (1–6 / 1–10 / 1–30), unselected start → Task 1 (`FormState`/`isComplete`) + Task 2 (`GRADES/CLASSES/NUMBERS`, `선택` option). ✓
- PIN system keyboard, digits shown → Task 2 (`pinInput`, `inputMode="numeric"`, `type="text"`, `sanitizePin`). ✓
- signup 비밀번호 확인 + match check → Task 1 (`isComplete` signup branch) + Task 2 (`pinConfirm`, `mismatch` message). ✓
- Single fixed panel, content centered, all states → Task 3 (`.auth__panel` fixed, `--compact` removed, `Auth.tsx` branch removed). ✓
- isComplete single source of truth (no inline `nameOk`) → Task 1 signature + Task 2 `canSubmit`. ✓
- Tests updated (keypad cases removed; isComplete/toCredentials) → Task 1. ✓
- Unchanged server flow → Tasks leave `Auth.tsx` handlers intact. ✓
- Visual verification at 1280×800 + DevTools-tuned px → Task 4. ✓

**Placeholder scan:** No TBD/TODO; all code blocks are complete; CSS deletions enumerated by selector.

**Type consistency:** `FormState` keys (`grade/class/number/pin/pinConfirm`) match across Task 1 and Task 2; `isComplete(s, mode, name)` arity consistent in logic, test, and `canSubmit`; `sanitizePin` signature consistent.
