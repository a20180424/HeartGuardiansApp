# Auth 성별(gender) 필드 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API v3.0.0의 `gender` 필드를 프론트에 반영한다 — 회원가입 시 성별을 입력받아 전송하고, 프로필 응답의 gender를 세션·Home 화면에 표시한다.

**Architecture:** gender는 신원 키가 아니라 프로필 데이터다. `Credentials`(=`x-*` 로그인 헤더)와 `VerifyBody`는 건드리지 않고, `SignupBody`(입력)와 `Profile`(verify/me 응답)에만 gender를 추가한다. 회원가입 폼은 새 세로 줄을 만들지 않고 1번 줄을 `[학교][이름][성별]` 3분할로 확장한다.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest(테스트), oxlint. 순수 로직은 `auth.logic.ts`에 격리되어 DOM/서버 의존 없이 단위 테스트한다.

## Global Constraints

- gender 값은 정확히 `"male" | "female"` 두 개뿐. 화면 표시는 "남자/여자", 내부/전송 값은 `male/female`.
- gender는 **회원가입 시 필수**. 로그인 폼에는 gender UI 없음.
- `Credentials`(`src/lib/api.ts`) · `authHeaders` · `toCredentials`는 **변경 금지**(gender는 자격증명이 아님).
- 레이아웃 기준 1280×800 CSS px, 가로 고정. 회원가입 폼은 고정 패널 600×480 안에 들어가야 하며 **새 세로 줄 추가 금지**.
- female 얼굴 에셋은 이번 범위 밖 — `ProfileCard`의 male 폴백 현행 유지.
- 테스트 실행: `npx vitest run <파일경로>`. 타입체크: `npx tsc -b`.
- 커밋 메시지 말미에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 포함.

---

### Task 1: 데이터 모델 + 폼 순수 로직에 gender 추가

**Files:**
- Modify: `src/lib/auth.ts` (Gender 타입, Profile.gender, SignupBody.gender)
- Modify: `src/scenes/auth/auth.logic.ts` (FormState.gender, initialForm, isComplete)
- Test: `src/scenes/auth/auth.logic.test.ts`

**Interfaces:**
- Consumes: 기존 `Credentials`(`src/lib/api.ts`).
- Produces:
  - `export type Gender = "male" | "female";` (from `src/lib/auth.ts`)
  - `Profile` 에 `gender: Gender` 필드
  - `SignupBody` 에 `gender: Gender` 필드
  - `FormState` 에 `gender: Gender | null` 필드
  - `initialForm(): FormState` — gender는 `null`로 초기화
  - `isComplete(s: FormState, mode: "login" | "signup", name: string): boolean` — signup일 때 `s.gender !== null` 추가 요구

- [ ] **Step 1: 실패하는 테스트 작성**

`src/scenes/auth/auth.logic.test.ts`를 수정한다.

상단 `filled` 상수에 gender를 추가:

```ts
const filled: FormState = { grade: 3, class: 2, number: 12, pin: "1234", pinConfirm: "1234", gender: "male" };
```

`initialForm` 기대값 테스트를 수정:

```ts
  it("initialForm은 모든 값이 비어있다", () => {
    expect(initialForm()).toEqual({
      grade: null,
      class: null,
      number: null,
      pin: "",
      pinConfirm: "",
      gender: null,
    });
  });
```

signup isComplete 테스트에 gender 케이스를 추가(기존 it 블록을 아래로 교체):

```ts
  it("signup isComplete는 이름·비밀번호 확인·성별까지 맞아야 true", () => {
    expect(isComplete(filled, "signup", "이시형")).toBe(true);
    expect(isComplete(filled, "signup", "  ")).toBe(false); // 이름 공백
    expect(isComplete({ ...filled, pinConfirm: "0000" }, "signup", "이시형")).toBe(false); // 불일치
    expect(isComplete({ ...filled, gender: null }, "signup", "이시형")).toBe(false); // 성별 미선택
  });
```

login isComplete 테스트는 gender 없이도 true여야 함을 확인(기존 it 블록을 아래로 교체):

```ts
  it("login isComplete는 학년/반/번호/pin(4)만 채우면 true (성별 무관)", () => {
    expect(isComplete(filled, "login", "")).toBe(true);
    expect(isComplete({ ...filled, gender: null }, "login", "")).toBe(true);
    expect(isComplete({ ...filled, pin: "12" }, "login", "")).toBe(false);
    expect(isComplete({ ...filled, class: null }, "login", "")).toBe(false);
  });
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run src/scenes/auth/auth.logic.test.ts`
Expected: FAIL — `filled`/`initialForm`에 `gender`가 없어 타입 에러 또는 assertion 실패.

- [ ] **Step 3: 모델에 Gender 추가**

`src/lib/auth.ts`를 수정한다.

`School` 인터페이스 위(또는 아래)에 Gender 타입을 추가:

```ts
export type Gender = "male" | "female";
```

`Profile` 인터페이스에 gender 추가:

```ts
export interface Profile {
  id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  gender: Gender;
  school: School | null;
}
```

`SignupBody` 인터페이스에 gender 추가:

```ts
export interface SignupBody extends Credentials {
  name: string;
  gender: Gender;
}
```

- [ ] **Step 4: 폼 로직에 gender 추가**

`src/scenes/auth/auth.logic.ts`를 수정한다.

import에 Gender 추가:

```ts
import type { School, Gender } from "../../lib/auth";
```

`FormState`에 gender 추가:

```ts
export interface FormState {
  grade: number | null; // 1~6 (select)
  class: number | null; // 1~10 (select)
  number: number | null; // 1~30 (select)
  pin: string; // 4자리, 시스템 키보드 입력
  pinConfirm: string; // signup 전용 확인 입력
  gender: Gender | null; // signup 전용, male/female
}
```

`initialForm`에 gender 추가:

```ts
export function initialForm(): FormState {
  return { grade: null, class: null, number: null, pin: "", pinConfirm: "", gender: null };
}
```

`isComplete`의 signup 분기에 gender 조건 추가:

```ts
export function isComplete(s: FormState, mode: "login" | "signup", name: string): boolean {
  const base = s.grade !== null && s.class !== null && s.number !== null && s.pin.length === 4;
  if (mode === "login") return base;
  return base && name.trim().length > 0 && s.pin === s.pinConfirm && s.gender !== null;
}
```

`toCredentials`는 **수정하지 않는다**(gender는 Credentials가 아님).

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/scenes/auth/auth.logic.test.ts`
Expected: PASS — 모든 케이스 통과. `toCredentials` 기존 케이스도 그대로 통과(gender 미포함이 정상).

- [ ] **Step 6: 타입체크**

Run: `npx tsc -b`
Expected: 에러 없음 — 단, `CredentialForm.tsx`/`index.tsx`에서 `FormState`에 gender가 빠졌다는 에러가 날 수 있다. 이는 Task 2에서 해소된다. **이 시점에 `initialForm`을 쓰는 컴포넌트는 gender가 자동 포함되므로 새 에러는 없어야 한다.** 새 타입 에러가 있으면 그 파일은 Task 2 대상이니 여기서는 로직/모델 관련 에러만 없으면 통과로 본다.

- [ ] **Step 7: 커밋**

```bash
git add src/lib/auth.ts src/scenes/auth/auth.logic.ts src/scenes/auth/auth.logic.test.ts
git commit -m "feat(auth): 모델·폼로직에 gender 필드 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 회원가입 폼 성별 선택 UI + 전송 배선

**Files:**
- Modify: `src/scenes/auth/components/CredentialForm.tsx` (성별 컨트롤, onSubmit 시그니처)
- Modify: `src/scenes/auth/Auth.css` (`.field--gender`, `.gender-toggle` 스타일)
- Modify: `src/scenes/auth/index.tsx` (handleSignup/handleLogin이 새 onSubmit 시그니처 수용, signup에 gender 전송)

**Interfaces:**
- Consumes: Task 1의 `FormState.gender`, `initialForm`, `isComplete`, `Gender` 타입, `SignupBody.gender`.
- Produces:
  - `CredentialForm`의 `onSubmit` prop 시그니처: `(creds: Credentials, name: string, gender: Gender | null) => void`
  - `index.tsx`의 `handleSignup(creds: Credentials, name: string, gender: Gender | null)` — 내부에서 gender null 가드 후 `signup({ ...creds, name, gender })`

- [ ] **Step 1: CredentialForm onSubmit 시그니처 확장 + 성별 컨트롤 추가**

`src/scenes/auth/components/CredentialForm.tsx`를 수정한다.

import에 Gender 추가:

```ts
import type { School, Gender } from "../../../lib/auth";
```

`Props`의 onSubmit 시그니처를 확장:

```ts
interface Props {
  mode: "login" | "signup";
  schools: School[];
  submitting: boolean;
  errorMsg: string | null;
  onSubmit: (creds: Credentials, name: string, gender: Gender | null) => void;
  onBack: () => void;
}
```

컴포넌트 본문에서 성별 세그먼트 토글을 렌더링하는 헬퍼를 추가한다(`pinInput` 헬퍼 아래에 추가). **선호 형태는 두 버튼 세그먼트 토글**이다. 구현 후 실제 1280×800 무대에서 1번 줄이 넘치면 이 헬퍼만 native `<select>`로 교체한다(설계 문서의 폴백 조항):

```tsx
  const genderToggle = () => (
    <label className="field field--gender">
      <span className="field__label">성별</span>
      <div className="gender-toggle">
        {(["male", "female"] as const).map((g) => (
          <button
            key={g}
            type="button"
            className={"gender-toggle__btn" + (form.gender === g ? " is-selected" : "")}
            aria-pressed={form.gender === g}
            onClick={() => setForm((s) => ({ ...s, gender: g }))}
          >
            {g === "male" ? "남자" : "여자"}
          </button>
        ))}
      </div>
    </label>
  );
```

signup 모드의 1번 줄(학교+이름)에 성별을 인라인으로 추가한다. 기존 첫 `field-row`를 아래로 교체:

```tsx
        <div className="field-row">
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
          {mode === "signup" && genderToggle()}
        </div>
```

제출 핸들러에서 gender를 함께 올린다. 기존 제출 버튼 onClick을 교체:

```tsx
          onClick={() => schoolId && onSubmit(toCredentials(form, schoolId), name.trim(), form.gender)}
```

- [ ] **Step 2: index.tsx가 새 시그니처를 수용하도록 수정**

`src/scenes/auth/index.tsx`를 수정한다.

import에 Gender 추가:

```ts
import { getSchools, verify, logout, signup, type School, type Gender } from "../../lib/auth";
```

`handleSignup` 시그니처와 본문을 gender 수용으로 교체:

```tsx
  async function handleSignup(creds: Credentials, name: string, gender: Gender | null) {
    if (!gender) return; // 폼에서 canSubmit으로 보장되지만 타입 안전 가드
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await signup({ ...creds, name, gender }); // 가입
      const profile = await verify(creds); // 같은 값으로 자동 로그인(자격증명 저장) + 이름 확인
      setWelcomeName(profile.name);
      setSubmitting(false);
      setScreen("welcome"); // 로그인과 동일하게 welcome을 거쳐 '계속하기'로 Home
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

`handleLogin`은 gender를 무시한다. login `CredentialForm`의 onSubmit은 `(creds) => handleLogin(creds)`로 이미 여분 인자를 버리므로 **변경 불필요**. signup `CredentialForm`은 `onSubmit={handleSignup}`이라 새 시그니처와 그대로 일치한다.

- [ ] **Step 3: Auth.css에 성별 토글 스타일 추가**

`src/scenes/auth/Auth.css`를 수정한다.

`.field--gender`를 기존 셀렉터 목록에 추가(레이아웃 정렬 공유). 기존 규칙을 아래로 교체:

```css
.field--school,
.field--name,
.field--select,
.field--pin,
.field--gender {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}
```

파일 끝에 토글 버튼 스타일을 추가:

```css
/* 성별 세그먼트 토글: 남자/여자 두 버튼을 붙여 하나만 선택 강조. */
.gender-toggle {
  display: flex;
  gap: 6px;
}
.gender-toggle__btn {
  flex: 1 1 0;
  min-width: 0;
  font: inherit;
  font-size: 18px;
  padding: 10px 4px;
  border-radius: 12px;
  border: none;
  background: #0f172a;
  color: #fff;
  opacity: 0.55;
  cursor: pointer;
}
.gender-toggle__btn.is-selected {
  opacity: 1;
  background: #2563eb;
  font-weight: 700;
}
```

- [ ] **Step 4: 타입체크 + 린트 + 테스트**

Run: `npx tsc -b && npx vitest run src/scenes/auth/auth.logic.test.ts`
Expected: 타입 에러 없음, 테스트 PASS.

- [ ] **Step 5: 개발 서버에서 실제 흐름 확인**

Run: `npm run dev` 후 브라우저에서 회원가입 화면 진입.
Expected 확인 항목:
- 회원가입 1번 줄에 `학교 / 이름 / 성별(남자|여자)`이 한 줄에 보이고 고정 패널(600×480)이 세로로 넘치지 않는다.
- 성별을 고르기 전에는 "가입하기" 버튼이 비활성(disabled).
- 성별 탭을 누르면 해당 버튼이 파랗게 강조되고, 나머지 필드가 다 차면 버튼이 활성화된다.
- ⚠️ 만약 1번 줄 3분할이 좁아 깨지면: `genderToggle()` 헬퍼를 native `<select>`(학년/반/번호와 동일 마크업)로 교체한다. 값/필수 로직은 동일하게 `form.gender`를 갱신하면 된다.

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/auth/components/CredentialForm.tsx src/scenes/auth/index.tsx src/scenes/auth/Auth.css
git commit -m "feat(auth): 회원가입 폼에 성별 선택 UI 추가 및 전송

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Home ProfileCard에 gender 연결

**Files:**
- Modify: `src/scenes/home/index.tsx:50` (ProfileCard에 gender prop 전달)

**Interfaces:**
- Consumes: Task 1의 `Profile.gender`(세션의 `profile.gender`), 기존 `ProfileCard`의 `gender?: "male" | "female"` prop.
- Produces: 없음(최종 소비처).

- [ ] **Step 1: ProfileCard에 gender 전달**

`src/scenes/home/index.tsx`의 50번째 줄을 교체:

```tsx
      <ProfileCard name={profile.name} progress={progress} gender={profile.gender} />
```

`ProfileCard`는 이미 `gender` prop을 지원하고 값 규격(`"male"|"female"`)이 일치하므로 매핑 불필요. female 에셋 부재는 `ProfileCard` 내부 male 폴백으로 처리됨(현행 유지).

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b`
Expected: 에러 없음. `profile.gender`가 `Gender`이고 `ProfileCard`의 prop이 `"male"|"female"`이라 호환.

- [ ] **Step 3: 개발 서버에서 확인**

Run: `npm run dev` 후 회원가입/로그인하여 Home 진입.
Expected: 프로필 카드가 정상 렌더(gender에 따라 female도 현재는 male 얼굴로 표시 — 폴백, 정상).

- [ ] **Step 4: 커밋**

```bash
git add src/scenes/home/index.tsx
git commit -m "feat(home): 프로필 카드에 gender 연결

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- 모델(Profile/SignupBody) gender → Task 1 ✅
- 폼 로직(FormState/initialForm/isComplete) → Task 1 ✅
- Credentials/authHeaders/toCredentials 불변 → Task 1에서 명시적으로 미변경 ✅
- 폼 UI(인라인, 새 줄 없음, 탭 토글 선호 + 드롭다운 폴백) → Task 2 ✅
- 가입/세션 흐름(handleSignup gender 전송) → Task 2 ✅
- Home ProfileCard 연결 → Task 3 ✅
- female 에셋 폴백 유지 → Task 2 Step 5 / Task 3 Step 1에 명시 ✅
- 테스트 갱신 → Task 1 ✅

**Placeholder scan:** TBD/TODO 없음. 모든 코드 블록 실제 내용 포함. 드롭다운 폴백은 "미완성"이 아니라 설계된 조건부 대안이며 교체 지점을 명시함.

**Type consistency:** `Gender`(`src/lib/auth.ts`) 단일 출처. `FormState.gender: Gender | null`, onSubmit `gender: Gender | null`, handleSignup 가드 후 `signup({...creds, name, gender})`에서 `SignupBody.gender: Gender`로 좁혀짐 — 일관. `Profile.gender: Gender` → ProfileCard `"male"|"female"` 호환.
