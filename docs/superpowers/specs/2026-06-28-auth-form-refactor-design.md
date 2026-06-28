# Auth 입력 폼 리팩토링 설계

날짜: 2026-06-28
관련: [2026-06-28-auth-scene-design.md](./2026-06-28-auth-scene-design.md)

## 배경 / 문제

현재 로그인·회원가입 폼은 **2단 레이아웃(좌측 입력 필드 + 우측 공용 숫자 키패드)** 에
`PinDots`까지 더해져 세로로 길다. 패널을 화면 아래로 내린 뒤(`296baa8`)부터는
제일 긴 **signup 폼의 `가입하기` 버튼이 화면 바닥에서 17px 잘리는** 회귀가 생겼다.

근본 원인은 폼이 길어 패널 높이가 내용에 따라 커지는 것. 입력 방식을 바꿔 폼을 짧게 만들고,
패널을 **모든 상태에서 단일 고정 크기**로 통일하면 잘림과 상태 전환 시 출렁임이 함께 사라진다.

## 목표

- 키패드/`PinDots` 제거, 2단 → 1단 레이아웃.
- 숫자 입력 방식 변경: **PIN은 시스템 키보드**, **학년/반/번호는 드롭다운**.
- 패널을 5개 상태(checking/welcome/chooser/login/signup) **단일 고정 px 크기**로 통일, 내용 세로 가운데 정렬.
- signup에 **비밀번호 확인** 필드 추가.

비목표: 서버 API·검증 흐름([Auth.tsx](../../../src/scenes/Auth.tsx)) 변경, scale-to-fit 도입(별도 과제).

## 결정 사항

| 항목 | 결정 |
|---|---|
| 반(class) 범위 | 1–10 |
| 번호(number) 범위 | 1–30 |
| 학년(grade) 범위 | 1–6 (기존) |
| 필드 배치 | 학년·반·번호를 **한 줄(가로)** 에 작은 select 3개 |
| PIN 표시 | **숫자 그대로 표시**(마스킹 안 함), 시스템 숫자 키보드, 4자리 |
| 드롭다운 시작값 | **미선택("선택")** — 명시적으로 골라야 함(실수 제출 방지) |
| 패널 크기 | **단일 고정 px**, 모든 상태 공통, 내용 가운데 정렬 |
| signup 비밀번호 확인 | **추가**, 클라이언트에서 일치 검사 |

## 컴포넌트 변경

### 제거
- `src/scenes/auth/NumberKeypad.tsx`
- `src/scenes/auth/PinDots.tsx`
- 2단 레이아웃 마크업/CSS(`auth-form`, `auth-form__left/right`, `num-row`, `field--num`, `grade-row`, `keypad*`, `pin-dots*` 등 미사용분)

### 유지
- `src/scenes/auth/SchoolPicker.tsx` (이미 `<select>`)
- `Auth.tsx`의 서버 호출·상태 전환 흐름 (폼이 만든 `Credentials`만 그대로 올림)

### 폼 필드 (CredentialForm)

**signup (7요소):**
1. 학교 — `<select>` (SchoolPicker)
2. 이름 — `<input type="text">` (시스템 키보드)
3. 학년 · 반 · 번호 — `<select>` 3개, 한 줄
4. 비밀번호 — `<input inputmode="numeric" maxlength=4>` (숫자 표시)
5. 비밀번호 확인 — 동일 input
6. 가입하기 — 제출

**login (5요소):** signup에서 **이름·비밀번호 확인 제외** → 학교 / [학년·반·번호] / 비밀번호 / 로그인.

## 레이아웃 / 패널 (Auth.css)

- 1단 세로 폼. 라벨 + 컨트롤이 행당 컴팩트하게(~48px).
- `학년·반·번호`는 `display:flex`로 한 줄에 균등 분배.
- `.auth__panel`을 **단일 고정 크기**로: `auth__panel--compact` 분기 제거, `min-height`/내용 기반 가변 제거 → 고정 `width`·`height`. 내용은 `justify-content:center`.
- 9-slice border-image 글로우 프레임 유지(코너 안정).
- 시작 고정 크기는 **signup(제일 긴 상태) 기준**으로 잡고, 실제 화면에서 확인 후 **DevTools로 미세조정한 px 값을 반영**.
- 위치(`.auth` `padding-top`/`gap`)는 현재 값 유지하되, 고정 패널이 800 안에 들어오도록 필요 시 함께 조정.

## 로직 / 데이터 (auth.logic.ts)

### 변경 전 `FormState`
```ts
{ grade: number|null; class: string; number: string; pin: string; active: FieldKey }
```
키패드 누적용 문자열 + `active` 포인터 + `MAX_LEN`/`ORDER`/`applyDigit`/`applyBackspace`/`setActive`.

### 변경 후 `FormState`
```ts
{ grade: number|null; class: number|null; number: number|null; pin: string; pinConfirm: string }
```
- select 값은 `number|null` (미선택=null).
- 키패드 전용 로직(`FieldKey`,`ORDER`,`MAX_LEN`,`applyDigit`,`applyBackspace`,`setActive`) **제거**.
- `isComplete(s, mode, name)`: 학교(schoolId는 컴포넌트 보유) 외 학년 + 반 + 번호 + pin 4자리, signup이면 추가로 `name.trim()` 비어있지 않음 + `pin === pinConfirm`. 폼 완성 판정은 **`isComplete` 한 곳으로 단일화**(현재 컴포넌트의 `nameOk` 인라인 검사 제거).
- `toCredentials(s, schoolId)`: 기존 유지(`class`/`number`는 이제 number라 `Number()` 불필요).
- `pickDefaultSchool`, `classifyVerifyError`: 유지.

### 검증 메시지
- 미완성: 제출 버튼 disabled(기존과 동일).
- signup PIN 불일치: "비밀번호가 일치하지 않아요" 표시, 제출 차단.

## 테스트 (auth.logic.test.ts)

- 제거: `applyDigit`/`applyBackspace`/`setActive`/자동 이동 관련 케이스.
- 갱신: `isComplete`(새 시그니처, mode별·PIN 일치 포함), `toCredentials`(number 입력).
- 유지: `pickDefaultSchool`, `classifyVerifyError`.

## 검증 방법

1. 단위 테스트(`npm test`) 통과.
2. 1280×800 뷰포트에서 5개 상태 스크린샷:
   - checking("잠시만요…") — 고정 패널 가운데 한 줄.
   - chooser / welcome — 변동 없음 확인.
   - login — 4필드 폼이 고정 패널 안, 잘림 없음.
   - signup — 7요소(비밀번호 확인 포함)가 고정 패널 안, **`가입하기` 안 잘림**.
3. 실제 로그인(서룡초/1학년/1반/1번/5555)으로 end-to-end 한 번.
4. 고정 패널 크기는 위 확인 중 DevTools로 잡은 px로 확정.
