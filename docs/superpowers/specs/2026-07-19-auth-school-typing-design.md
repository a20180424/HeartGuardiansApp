# auth 로그인/회원가입 UI 변경 — 학교 직접 입력 + 학년 기본값

작성일: 2026-07-19
브랜치: `feat/auth-school-typing`

## 배경 / 목적

이 앱은 공모전 출품용이며, 화면에 **특정 학교 이름이 노출되면 감점** 대상이 된다.
현재 `www/auth/`의 로그인/회원가입 폼은 학교를 `<select>` 드롭다운으로 고르게 되어 있어,
서버(`/api/schools`)에서 받아온 모든 학교 이름이 그대로 화면에 나열된다.

이 목록 노출을 없애기 위해, 학교를 **직접 타이핑**하게 바꾸고 입력값을 정규화해
서버 학교 목록과 매칭한다. 겸사겸사 학년 기본값을 3으로 둔다.

## 요구사항

1. **학년 기본값 3** — 로그인·회원가입 폼 모두, 학년 select가 `3`을 선택한 상태로 시작.
   반·번호는 기존대로 "선택"(미선택) 유지.
2. **학교: 드롭다운 → 텍스트 입력** — 학교 목록이 화면에 노출되지 않는다.
3. **정규화 매칭** — 사용자가 친 표기 변주를 흡수해 서버 학교와 대조.
   `서룡`, `서룡초`, `서룡초등학교`, `서룡 초등학교`, 공백·특수문자 섞인 입력 → 모두 매칭.
4. **없는 학교면 오류** — 매칭 실패 시 에러 표시하고 제출 중단.

## 서버 데이터 (확인 완료)

- `public.schools` 테이블: `id`(uuid PK), `name`(text), `created_at`.
- `profiles`, `class_boards`, `emotion_guide_submissions` 모두 **`school_id`(uuid) FK로만** 참조.
  `name` 텍스트를 참조하는 외래키는 없음 → 이름 텍스트 변경은 안전.
- 이 작업의 사전 조치로 DB 학교명을 핵심 이름으로 축약 완료:
  `서룡초등학교` → `서룡`, `테스트학교` → `테스트`. (코드 정규화는 접미사를 양쪽에서
  제거하므로, 설령 축약 안 됐어도 동작한다 — 데이터 상태와 무관하게 견고.)

## 설계

대상 파일: `www/auth/script.js` (렌더링), 필요 시 `www/auth/style.css`.
현재 auth는 다른 페이지와 코드 공유가 없는 독립 페이지다(프로젝트 규약). 이 변경도 auth 폴더에 국한된다.

### 1. 학년 기본값 3

`renderForm()` 내부의 `numSelect(key, label, options)` 헬퍼에 **기본값 인자**를 추가한다:
`numSelect(key, label, options, defaultValue)`.

- `defaultValue`가 주어지면: 해당 option을 `selected`로 렌더하고 select의 `value`를 맞추며,
  `form[key]`를 그 값으로 초기화한다.
- 학년만 `numSelect("grade", "학년", GRADES, 3)`로 호출. 반·번호는 인자 없이 기존대로.
- `form` 초기 상태의 `grade`도 `null` → `3`으로 맞춘다(초기값과 UI 일치).

### 2. 학교: 텍스트 입력 필드

기존 학교 `<select>`(`schoolSel`, `fillSchools`, `pickDefaultSchool` 사용 부분)를 제거하고
텍스트 input으로 대체한다.

- input: `class="field__input"`, `type="text"`, `placeholder="학교 이름"`, `maxlength="30"`.
  (placeholder에 학교명 힌트를 넣지 않는다.)
- 상태: `let schoolText = ""` — input 이벤트로 갱신. 기존 `schoolId` 사전결정 로직은 제거.
- 라벨: `field field--school` 재사용 (`.field__input` 스타일 이미 존재 → 신규 CSS 불필요).

### 3. 정규화 + 매칭 헬퍼 (신규, 순수 함수)

`renderForm` 바깥(모듈 스코프)에 순수 함수로 추가해 단독 테스트/추론이 쉽게 한다.

```js
// 표기 변주를 흡수: 공백·특수문자 제거 후 초등학교 접미사 제거 → 핵심 이름.
function normalizeSchool(s) {
  return String(s ?? "")
    .replace(/\s+/g, "")               // 공백 전부 제거
    .replace(/[^가-힣a-zA-Z0-9]/g, "") // 한글·영숫자 외 특수문자 제거
    .replace(/초등학교$/, "")
    .replace(/초등$/, "")
    .replace(/초$/, "");
}

// 정규화 정확 일치가 "딱 하나"면 그 학교, 아니면 null(0개=없음, 2개↑=모호).
function matchSchool(text, schools) {
  const key = normalizeSchool(text);
  if (!key) return null;
  const hits = schools.filter((s) => normalizeSchool(s.name) === key);
  return hits.length === 1 ? hits[0] : null;
}
```

- 매칭 규칙은 **정확 일치**(부분 일치 불가) — 오입력 방지 + 학교명 유추 힌트 차단.
- 학교 수는 최대 ~10개, 이름이 2~3자로 뚜렷 → 모호(2개↑ 매치) 케이스는 사실상 없음.
  발생 시엔 안전하게 실패 처리(null).

### 4. 검증 · 제출 흐름 (제출 시에만 검증)

실시간 힌트 없음 = 목록이 새지 않음.

- **제출 버튼 활성 조건** (`updateValidity`): 기존 `schoolId !== null` 조건을
  `schoolText.trim() !== ""`로 교체. 나머지(필드 완성, pin 등)는 유지.
  → 매칭 성공 여부는 버튼 활성에 **반영하지 않는다**(입력 중 피드백 없음).
- **submit 핸들러**: 클릭 시 `const school = matchSchool(schoolText, schools);`
  - `school`이 있으면: 기존대로 `toCredentials(form, school.id)` → `verify`/`signup` 진행.
  - `school`이 null이고 `schools.length > 0`: 에러
    `"학교 이름을 찾을 수 없어요. 다시 확인해 주세요."`, `setSubmitting(false)`, 중단.
  - `schools.length === 0` (목록 로드 실패): 에러
    `"인터넷 연결을 확인해 주세요."`, 중단.

### 제거/정리 대상

- `pickDefaultSchool()` 호출 및 `schoolId` 사전결정.
- `fillSchools()`, `schoolSel`(select) 생성·이벤트.
- (원하면 `pickDefaultSchool` 함수 자체도 미사용이면 제거 가능 — 다른 곳에서 안 쓰면.)

## 범위 밖 (이번 작업 제외)

- 비주얼 리스타일(색/버튼/폰트) — 이번엔 안 함.
- 서버 API 변경 — 없음. `/api/schools`는 그대로 사용.
- DB 학교명 축약 — 이미 완료(위 "서버 데이터" 참고).

## 검증 방법

프로젝트 규약대로 **playwright MCP로 실제 실행 검증**:

1. 로그인 폼: 학년이 3으로 선택되어 있는지.
2. 학교칸에 `서룡`, `서룡초`, `서룡 초등학교`, `서룡초등학교` 각각 입력 → 로그인/가입 정상 진행.
3. 학교칸에 `없는학교` 입력 → "학교 이름을 찾을 수 없어요" 에러, 제출 안 됨.
4. 화면 어디에도 학교 목록/이름이 미리 노출되지 않는지(드롭다운 제거) 확인.
5. 콘솔 에러 0.
