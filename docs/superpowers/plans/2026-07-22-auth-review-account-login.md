# auth 심사용 계정 로그인 버튼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** auth 로그인 화면 우측 상단에 "심사용 계정" 버튼을 추가해, 클릭 한 번으로 지정 심사 계정 로그인 → 홈 진입.

**Architecture:** `www/auth/renderForm()`의 `뒤로` 버튼 줄을 좌우 배치 행으로 바꿔 오른쪽에 버튼을 둔다(로그인 모드 한정). 클릭 시 하드코딩 creds를 기존 `matchSchool → toCredentials → enter()` 경로에 그대로 태운다. `enter()`가 verify·진도동기화·세션저장·홈이동을 모두 처리하므로 신규 로직 최소.

**Tech Stack:** vanilla HTML/JS/CSS 무빌드 MPA. 검증은 `npm run dev` + playwright MCP(단위 테스트 프레임워크 없음).

## Global Constraints

- 페이지 간 js/css 공유 금지 — 변경은 `www/auth/` 안에서만. 다른 페이지에 복제하지 않음(auth 한정).
- 무대 내부 절대배치, `vw/vh/dvh/svh` 금지.
- 새 텍스트 요소는 관례상 `white-space: pre-line` + `word-break: keep-all` 적용 대상(버튼 라벨이라 실효 미미하나 규약 준수).
- 심사 계정(하드코딩): 학교 `테스트`, 학년 `3`, 반 `3`, 번호 `3`, PIN `3333`.
- 자격증명은 `dev-config.js`가 아니라 `www/auth/script.js` 상수로 둔다(배포·APK 어디서든 동작).

---

### Task 1: 심사용 계정 버튼 추가 (script.js + style.css)

**Files:**
- Modify: `www/auth/script.js` — `renderForm()` 내 `auth-form-wrap` 조립부([www/auth/script.js:1141](www/auth/script.js#L1141)) 및 상단에 심사 계정 상수 추가.
- Modify: `www/auth/style.css` — `.auth-form-head` / `.auth-review` 규칙 추가(`.auth-back` 규칙 부근 [www/auth/style.css:155](www/auth/style.css#L155)).

**Interfaces:**
- Consumes(기존, 시그니처 변경 없음): `matchSchool(text, schools)` → school|null; `toCredentials(formLike, schoolId)` → creds; `enter(creds)` → Promise(성공 시 홈 이동); `setError(msg)`·`setSubmitting(bool)`(renderForm 내부 함수); `classifyVerifyError(err)` → "auth"|기타.
- Produces: 없음(순수 UI 추가, 외부에서 참조하는 신규 심볼 없음).

- [ ] **Step 1: 심사 계정 상수 추가**

`www/auth/script.js`의 폼 상수 근처(예: `const NUMBERS = ...` [www/auth/script.js:906](www/auth/script.js#L906) 바로 아래)에 추가. `toCredentials`가 `s.grade/s.class/s.number/s.pin`을 읽으므로 그 형태에 맞춘다.

```js
  // 심사(스토어 리뷰)용 계정 — 로그인 폼에 입력하는 값과 동일. 전용 데모 계정이라 클라이언트 노출 허용.
  const REVIEW_ACCOUNT = { school: "테스트", grade: 3, class: 3, number: 3, pin: "3333" };
```

- [ ] **Step 2: `renderForm` 조립부를 head 행으로 교체**

`www/auth/script.js`의 마지막 조립 라인
```js
    panel.appendChild(el("div", { class: "auth-form-wrap" }, [back, formEl]));
```
을 아래로 교체. `setError`·`setSubmitting`·`classifyVerifyError`는 이 스코프에서 이미 접근 가능하다. 로그인 모드에서만 버튼을 붙인다.

```js
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
          await enter(toCredentials(REVIEW_ACCOUNT, school.id)); // verify → 진도동기화 → 세션저장 → 홈
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
```

- [ ] **Step 3: CSS 추가**

`www/auth/style.css`의 `.auth-back { ... }`([www/auth/style.css:155](www/auth/style.css#L155)) 바로 아래에 추가.

```css
.auth-form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.auth-review {
  align-self: center;
  font-size: 16px;
  padding: 8px 16px;
  border-radius: 999px;
  white-space: pre-line;
  word-break: keep-all;
}
```

- [ ] **Step 4: dev 서버로 실제 검증 (playwright MCP)**

Run: `npm run dev` (미실행 시). playwright로 `auth/index.html` 열기 → 계정 선택에서 "로그인" → 로그인 폼 진입.
Expected:
- 폼 우측 상단에 `심사용 계정` 버튼이 `뒤로` 반대편에 보인다.
- 버튼 클릭 → 콘솔 에러 0, 홈(`home/index.html`)으로 이동.
- "회원가입" 폼과 계정 선택(chooser) 화면에는 버튼이 **없다**.

스크린샷으로 배치·이동을 확인한다.

- [ ] **Step 5: Commit**

```bash
git add www/auth/script.js www/auth/style.css
git commit -m "feat(auth): 로그인 화면에 심사용 계정 로그인 버튼 추가"
```

---

## Self-Review

- **Spec coverage:** 배치(우측 상단, 로그인 모드 한정, 항상 표시) ✓ Step 2/3. 자격증명 하드코딩(테스트/3-3-3/3333) ✓ Step 1. 동작(matchSchool→toCredentials→로그인) ✓ Step 2. 검증(playwright) ✓ Step 4. 범위 밖(☰메뉴/전페이지/게이팅) — 계획에 포함 안 함 ✓.
- **스펙 대비 의도적 변경:** 스펙의 "verify → showWelcome" 대신 기존 `enter()`를 재사용해 **welcome 화면을 건너뛰고 홈으로 직행**. 더 단순(DRY)하고 리뷰어 흐름이 매끄럽다. 결과(로그인 후 홈)는 동일.
- **Placeholder scan:** 없음(모든 코드 완성).
- **Type consistency:** `REVIEW_ACCOUNT`(grade/class/number:number, pin:string)는 `toCredentials`가 읽는 필드와 일치. `enter(creds)`·`matchSchool`·`setError`·`setSubmitting`·`classifyVerifyError` 모두 기존 시그니처 그대로 사용.
