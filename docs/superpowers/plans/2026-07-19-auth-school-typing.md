# auth 학교 직접입력 + 학년 기본값 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** auth 로그인/회원가입 폼에서 학교 드롭다운(목록 노출)을 텍스트 입력 + 정규화 매칭으로 바꾸고, 학년 기본값을 3으로 둔다.

**Architecture:** 단일 독립 페이지 `www/auth/script.js`만 수정한다. 학교 표기 변주 흡수는 모듈 스코프의 순수 함수 `normalizeSchool`/`matchSchool`로 분리하고, `renderForm` 내부의 학교 필드·학년 select·submit 핸들러를 이 함수에 맞춰 배선한다.

**Tech Stack:** vanilla HTML/JS/CSS 무빌드 MPA. 테스트 러너 없음 — 순수 함수는 일회용 Node 스모크 스크립트로, DOM 동작은 playwright MCP로 검증.

## Global Constraints

- 무빌드: `www/`의 정적 파일이 곧 앱. 빌드 스텝 없음.
- auth는 다른 페이지와 js/css 공유 금지 — 변경은 `www/auth/` 안에 국한.
- 화면 어디에도 학교 목록/이름이 미리 노출되면 안 됨(공모전 감점 회피가 이 작업의 목적).
- 매칭은 **정확 일치 하나**만 통과(부분 일치 금지). 접미사 `초등학교`/`초등`/`초`는 입력·서버 양쪽에서 제거.
- 서버 API 변경 없음. `/api/schools` 응답은 `{ id, name }[]` 그대로 사용.
- DB 학교명은 이미 `서룡`/`테스트`로 축약 완료(코드가 데이터 상태와 무관하게 동작해야 함).

---

### Task 1: 정규화 + 매칭 순수 함수 추가

**Files:**
- Modify: `www/auth/script.js` — `pickDefaultSchool`(692-696) 아래에 두 함수 추가
- Test: `<scratchpad>/school-match.test.mjs` (일회용, 커밋 안 함)

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `normalizeSchool(s: string) => string` — 공백·특수문자 제거 후 초등학교 접미사 제거
  - `matchSchool(text: string, schools: {id,name}[]) => {id,name} | null` — 정규화 정확 일치가 딱 하나면 그 학교, 아니면 null

- [ ] **Step 1: 스모크 테스트 스크립트 작성**

경로: 스크래치패드에 `school-match.test.mjs` 생성. (함수 본문을 복사해 넣어 단독 실행 — script.js는 모듈 export가 없으므로 검증용으로 함수만 복제한다.)

```js
// school-match.test.mjs — Task 1 순수 함수 검증
function normalizeSchool(s) {
  return String(s ?? "")
    .replace(/\s+/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .replace(/초등학교$/, "")
    .replace(/초등$/, "")
    .replace(/초$/, "");
}
function matchSchool(text, schools) {
  const key = normalizeSchool(text);
  if (!key) return null;
  const hits = schools.filter((s) => normalizeSchool(s.name) === key);
  return hits.length === 1 ? hits[0] : null;
}

import assert from "node:assert";
const schools = [{ id: "a", name: "서룡" }, { id: "b", name: "테스트" }];

// 표기 변주 모두 서룡에 매칭
for (const t of ["서룡", "서룡초", "서룡초등학교", "서룡 초등학교", " 서룡_초! ", "서룡초등"]) {
  assert.strictEqual(matchSchool(t, schools)?.id, "a", `실패: ${t}`);
}
// 서버명이 축약 안 됐어도(초등학교 붙어있어도) 매칭
assert.strictEqual(matchSchool("서룡", [{ id: "a", name: "서룡초등학교" }])?.id, "a");
// 없는 학교 → null
assert.strictEqual(matchSchool("없는학교", schools), null);
// 빈 입력 → null
assert.strictEqual(matchSchool("   ", schools), null);
// 부분 일치 불가: "서"는 "서룡"에 매칭 안 됨
assert.strictEqual(matchSchool("서", schools), null);
// 모호(2개 매치) → null
assert.strictEqual(matchSchool("서룡", [{ id: "a", name: "서룡" }, { id: "c", name: "서룡초" }]), null);
console.log("OK: 모든 케이스 통과");
```

- [ ] **Step 2: 실행해서 실패 확인 (아직 함수 없음 → 여기선 복제본이라 통과할 것)**

Run: `node <scratchpad>/school-match.test.mjs`
Expected: `OK: 모든 케이스 통과` (스크립트가 함수 복제본을 포함하므로 통과 — 이 스텝은 로직 자체의 정확성 확인용이다. 통과하지 않으면 아래 Step 3 함수 본문을 스크립트와 일치하도록 고친다.)

- [ ] **Step 3: script.js에 함수 추가**

`www/auth/script.js`의 `pickDefaultSchool` 함수 닫는 `}`(696줄) 바로 다음 줄에 삽입:

```js

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
```

- [ ] **Step 4: 문법 확인**

Run: `node --check www/auth/script.js`
Expected: 출력 없음(문법 OK, 종료코드 0)

- [ ] **Step 5: 커밋**

```bash
git add www/auth/script.js
git commit -m "feat(auth): 학교명 정규화·매칭 순수 함수 추가"
```

---

### Task 2: 학년 기본값 3

**Files:**
- Modify: `www/auth/script.js` — `renderForm` 내 `numSelect`(895-908), form 초기화(813), row2(938-942)

**Interfaces:**
- Consumes: 없음
- Produces: `numSelect(key, label, options, defaultValue?)` — defaultValue 주면 그 값을 선택·초기화

- [ ] **Step 1: form 초기 상태의 grade를 3으로**

813줄:
```js
    const form = { grade: null, class: null, number: null, pin: "", pinConfirm: "", gender: null };
```
→
```js
    const form = { grade: 3, class: null, number: null, pin: "", pinConfirm: "", gender: null };
```

- [ ] **Step 2: numSelect에 defaultValue 인자 추가**

895-908줄 `numSelect` 함수를 아래로 교체:
```js
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
```

- [ ] **Step 3: 학년 호출에 기본값 3 전달**

939줄 `numSelect("grade", "학년", GRADES),` → `numSelect("grade", "학년", GRADES, 3),`
(반·번호 줄은 그대로 둔다.)

- [ ] **Step 4: 문법 확인**

Run: `node --check www/auth/script.js`
Expected: 출력 없음(종료코드 0)

- [ ] **Step 5: 커밋**

```bash
git add www/auth/script.js
git commit -m "feat(auth): 학년 select 기본값 3"
```

---

### Task 3: 학교 드롭다운 → 텍스트 입력 + 제출 시 매칭

**Files:**
- Modify: `www/auth/script.js` — `renderForm` 내 schoolId 초기화(815), 학교 필드 블록(822-843), updateValidity(967-973), submit 핸들러 creds 생성부(983)

**Interfaces:**
- Consumes: `matchSchool`(Task 1), `toCredentials(form, schoolId)`(기존)
- Produces: 없음(파일 내부 배선)

- [ ] **Step 1: schoolId 사전결정 제거, schoolText 상태 도입**

815줄:
```js
    let schoolId = pickDefaultSchool(schools, null) ? pickDefaultSchool(schools, null).id : null;
```
→
```js
    let schoolText = "";
```

- [ ] **Step 2: 학교 select 블록을 텍스트 input으로 교체**

822-843줄(주석 `// 학교 선택 (SchoolPicker.tsx)`부터 `schoolField` 정의까지) 전체를 아래로 교체:
```js
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
```

- [ ] **Step 3: updateValidity의 학교 조건 교체**

971줄:
```js
      const canSubmit = !submitting && schoolId !== null && isComplete(form, mode, name);
```
→
```js
      const canSubmit = !submitting && schoolText.trim() !== "" && isComplete(form, mode, name);
```

- [ ] **Step 4: submit 핸들러에서 클릭 시 매칭**

983줄:
```js
      const creds = toCredentials(form, schoolId);
```
→
```js
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
```
(주의: 이 블록은 `if (submit.disabled) return;` 다음, `const trimmedName = name.trim();` 앞에 온다. `setError` 호출이 아래 `setError(null)`보다 앞서므로, 매칭 실패 시 return 하여 에러가 유지된다.)

- [ ] **Step 5: 문법 확인**

Run: `node --check www/auth/script.js`
Expected: 출력 없음(종료코드 0)

- [ ] **Step 6: 사용하지 않게 된 코드 확인·정리**

`fillSchools`와 `schoolSel`은 Step 2에서 제거됨. `pickDefaultSchool`는 이제 호출처가 없다.
Run(확인): 아래 두 grep 결과가 모두 비어야 한다.
```bash
grep -n "fillSchools\|schoolSel" www/auth/script.js
grep -n "pickDefaultSchool" www/auth/script.js
```
`pickDefaultSchool`가 남아 있으면(692-696 정의) 정의째 삭제한다. `fillSchools`/`schoolSel` 잔여가 있으면 제거한다. 다시 `node --check www/auth/script.js`로 문법 확인.

- [ ] **Step 7: 커밋**

```bash
git add www/auth/script.js
git commit -m "feat(auth): 학교 드롭다운을 직접입력+정규화매칭으로 교체"
```

---

### Task 4: playwright MCP 실행 검증

**Files:** (코드 변경 없음 — 검증 전용)

**Interfaces:**
- Consumes: Task 1~3의 통합 결과

- [ ] **Step 1: dev 서버 기동**

Run: `npm run dev` (browser-sync). 브라우저에서 auth 페이지 URL 확인(예: `http://localhost:3000/auth/`).
DEV 자동로그인 파라미터는 쓰지 않는다(폼 UI를 봐야 하므로). 필요 시 `?` 없이 chooser→로그인으로 진입.

- [ ] **Step 2: 학년 기본값 확인**

playwright: auth → "로그인" 클릭 → 폼 진입. 학년 select 값이 `3`인지 스냅샷/evaluate로 확인.
회원가입 폼도 동일 확인.

- [ ] **Step 3: 학교 매칭 변주 확인**

playwright로 로그인 폼에서 학교칸에 다음을 각각 넣고, 유효 자격증명(테스트 계정)과 함께 제출:
`서룡`, `서룡초`, `서룡 초등학교`, `서룡초등학교` → 모두 로그인 진행(welcome 화면 도달 또는 인증에러 아닌 정상 흐름).
Expected: 학교 매칭 단계에서 "학교 이름을 찾을 수 없어요"가 뜨지 않는다.

- [ ] **Step 4: 오입력 에러 확인**

학교칸에 `없는학교` 입력 + 나머지 채우고 제출 → "학교 이름을 찾을 수 없어요. 다시 확인해 주세요." 표시되고 제출 안 됨.

- [ ] **Step 5: 목록 미노출 + 콘솔 확인**

폼 어디에도 학교 드롭다운/이름 목록이 없는지 스냅샷 확인. `browser_console_messages`로 에러 0 확인.

- [ ] **Step 6: 검증 결과 기록**

스크린샷/콘솔 결과를 사용자에게 보고. 코드 변경이 없으므로 커밋 없음.

---

## Self-Review

**Spec coverage:**
- 학년 기본값 3 → Task 2 ✓
- 학교 텍스트 입력(드롭다운 제거) → Task 3 Step 2 ✓
- 정규화 매칭(변주 흡수) → Task 1 ✓
- 없는 학교 오류 → Task 3 Step 4 ✓
- 제출 시에만 검증(실시간 힌트 없음) → Task 3 Step 3(버튼 활성은 비어있지 않음만), Step 4(클릭 시 매칭) ✓
- 목록 미노출 → Task 3 Step 2 + Task 4 Step 5 ✓
- 검증 방법(playwright) → Task 4 ✓

**Placeholder scan:** 모든 코드 스텝에 실제 코드/명령 포함. TBD·TODO 없음.

**Type consistency:** `normalizeSchool`/`matchSchool` 시그니처가 Task 1 정의와 Task 3 사용에서 일치. `matchSchool`은 `{id,name}|null` 반환, Task 3에서 `school.id`로 사용 — 일치. `numSelect`의 4번째 인자 `defaultValue`가 Task 2 정의·호출에서 일치.
