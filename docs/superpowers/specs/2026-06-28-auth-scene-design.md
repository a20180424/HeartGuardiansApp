# Auth Scene 설계 (2026-06-28)

> 대상: `src/scenes/Auth.tsx` (라우트 `/auth`). 8개 Scene 중 2번째.
> 흐름: Intro → **Auth** → Home → Planet 1~4 → Outro.

## 1. 배경 / 목표

초등학생용 교육 앱의 로그인 화면. 일반적인 인증이 아니라
**학교 + 학년 + 반 + 번호 + 4자리 비밀번호(PIN)** 를 자격증명으로 쓴다.
서버에는 세션/토큰이 없고, 보호된 요청마다 이 값들을 `x-*` 헤더로 보낸다.

핵심 요구사항:

- 회원가입, 로그인 (비회원/게스트는 **제외**).
- 한 번 로그인한 자격증명은 기기에 저장 → 다음 실행 시 자동 점검(verify) 후 자동 로그인.
- 로그아웃 가능(자격증명 삭제).
- 로그인 후 Profile + **Progress(0~4, 완료한 Planet 수)** 를 메모리에 보관해 다른 Scene에서 사용.
- 비밀번호 입력은 숫자만. 안드로이드 시스템 키보드 대신 **앱 내장 숫자 키패드** 사용.
- 서버 통신은 이미 캡슐화되어 있음(`src/lib/`) — 이 Scene은 그 함수만 호출.

## 2. 이미 존재하는 것 (재사용, 수정 없음)

서버 레이어는 완성되어 있어 그대로 호출만 한다:

- `src/lib/api.ts` — `credentialStore`(localStorage `hg.credentials`), `authHeaders`,
  `request`, `ApiError`, `Credentials` 타입.
- `src/lib/auth.ts` — `getSchools()`, `signup(body)`, `verify(creds)`(성공 시 자격증명 저장),
  `getProfile()`, `deleteAccount()`, `hasCredentials()`, `logout()`, `Profile`/`School`/`SignupBody` 타입.
- `src/lib/progress.ts` — `getProgress()`, `completePlanet()`, `getPlanetReviews()`.

서버 주소는 `VITE_API_URL` 환경변수. 자격증명 모델:
`{ school_id: string(UUID), grade: number(1~6), class: number, number: number, pin: string(4자리) }`.
회원가입은 여기에 `name: string` 추가.

## 3. 화면 흐름 (Auth = 상태 머신)

Intro가 끝나면 항상 `/auth`로 이동한다. Auth는 mount 시 상태를 결정한다.

```
checking ─ mount 시 hasCredentials()면 verify()를 백그라운드 호출(배경 위 스피너)
  │
  ├─ verify OK ──→ welcome     "○○님, 환영해요!"  [계속하기] [다른 계정으로 로그인]
  │                              계속하기 → progress 로드 → /home
  │                              다른 계정 → logout() → chooser
  │
  ├─ verify 실패(자격증명 불일치/삭제) → 자격증명 삭제 → chooser + 안내 메시지
  │
  ├─ 네트워크 오류 → "인터넷 연결을 확인해 주세요" + [다시 시도] (자격증명 유지)
  │
  └─ 자격증명 없음 ──→ chooser   [로그인] [회원가입]
                          │           │
                        login 폼    signup 폼
                          │           │
                       verify OK   signup 성공 → 같은 값으로 자동 verify
                          └────┬────────┘
                            progress 로드 → /home
```

상태 enum: `checking | welcome | chooser | login | signup`.

### 3.1 chooser (Decision 1B)

배경 + 타이틀 배너 + 패널 안에 큰 버튼 2개. 첨부 스크린샷과 동일한 시각 언어.

```
┌────────── PANEL ──────────┐
│      어떻게 시작할까요?      │
│   [      로그인       ]    │
│   [     회원가입      ]    │
└───────────────────────────┘
```

교사 안내와 잘 맞음("오늘은 회원가입 누르세요" / 평소엔 "로그인").

### 3.2 welcome

자동 점검 성공 시. 스크린샷의 환영 패널과 동일하되 게스트 버튼은 없음.

```
┌──────────────────────────┐
│   이현수님, 환영해요!       │
│   [     계속하기      ]    │
│   [ 다른 계정으로 로그인 ]   │
└──────────────────────────┘
```

- 계속하기 → `getProgress()`로 진행도 로드 후 `/home`.
- 다른 계정으로 로그인 → `logout()` + 세션 초기화 → chooser.

### 3.3 login 폼 (Decision 2A — 좌측 필드 + 우측 공용 키패드)

```
┌──────────────── PANEL ────────────────┐
│  학년 [1][2][3][4][5][6]   ┌─────────┐ │
│                            │ 1  2  3 │ │
│  반     [  3 ]  ← active    │ 4  5  6 │ │
│  번호    [ 12 ]             │ 7  8  9 │ │
│  비밀번호  ● ● ● ○          │    0  ⌫ │ │
│        [   로그인   ]       └─────────┘ │
└───────────────────────────────────────┘
```

- **학교**: 폼 상단에 picker로 **항상 표시**(학교 1개여도). 마지막 사용 학교가 기본 선택됨(4.1 참고).
- **학년**: 버튼 6개(1~6), 키패드 불필요.
- **반 / 번호 / 비밀번호**: 좌측에 세로로 배치. 탭하면 그 필드가 active(글로우 강조)되고,
  우측 공용 숫자 키패드가 active 필드에 입력. 입력이 차면 자동으로 다음 필드로 이동
  (반→번호→비밀번호). 비밀번호는 ● ● ● ○ 점 4개, 4자리 채워지면 자동 제출 시도.
- **로그인 버튼**: 모든 값이 채워지면 활성화. 누르면 `verify(creds)` 호출.

### 3.4 signup 폼

login 폼과 동일 + **이름** 필드 추가. 이름은 유일한 텍스트 입력 →
안드로이드 시스템 키보드 사용(한글). 나머지는 키패드.

```
이름   [ 홍길동 ]          ← 텍스트 입력(시스템 키보드)
학년   [1][2][3][4][5][6]
반/번호/비밀번호 …          ← login과 동일(공용 키패드)
        [   가입하기   ]
```

- 가입하기 → `signup(body)` → 성공 시 같은 자격증명으로 `verify()` 자동 호출 → progress 로드 → `/home`.
  (아이가 가입 직후 다시 입력하지 않도록 자동 로그인.)

## 4. 컴포넌트 분리

각 단위는 한 가지 책임만 갖고 독립적으로 이해/테스트 가능해야 한다.

- **`Auth.tsx`** — 상태 머신 + 라우팅. 위 상태 enum을 관리하고 하위 화면을 렌더.
- **`NumberKeypad`** (`src/scenes/auth/NumberKeypad.tsx`) — 0~9 + ⌫ 버튼만 그리는 표현 컴포넌트.
  props: `onDigit(d)`, `onBackspace()`. 서버/폼 로직 없음.
  → 내장 키패드가 문제되면 이 컴포넌트만 교체(안드로이드 키보드 fallback).
- **`PinDots`** — 현재 입력 자릿수를 ● ○ 로 표시.
- **`CredentialForm`** (login/signup 공용) — 학년 버튼 + 반/번호/비밀번호 필드 + active 필드 관리,
  키패드 입력을 active 필드에 반영. signup일 때 이름 필드를 추가로 노출.
  완성된 `Credentials`(+이름)를 `onSubmit`으로 올림. **서버 호출은 하지 않음** — 부모(Auth)가 처리.
- **`SchoolPicker`** — 4.1 참고. 단일 학교 단계에서는 렌더되지 않을 수 있음.

### 4.1 학교 선택 (다중 학교 대비)

- mount 시 또는 chooser 진입 시 `getSchools()` 호출.
- **학교 picker는 학교가 1개여도 항상 표시**한다(자동 숨김/자동 선택 안 함).
  나중에 학교가 늘었을 때 UI가 갑자기 바뀌어 아이/교사가 헷갈리는 일을 막기 위함.
- 마지막 사용 학교(localStorage `hg.lastSchoolId`)를 기본 선택값으로 두어 탭 수를 줄임.
  학교가 1개면 그 1개가 기본 선택된 상태로 보이고, 아이는 확인/변경만 하면 됨.
- 학교가 많으면 검색/스크롤 가능한 picker로 표시.
- 선택된 `school_id`는 login/signup 자격증명에 포함.

## 5. 세션 저장 (다른 Scene과 공유)

- 새 모듈 **`src/lib/session.ts`** — 메모리 보관소.
  - `setSession({ profile, progress })`, `getSession()`, `clearSession()`.
  - 보관 대상: `Profile`(이름/학년/반/번호/학교) + `progress: number`(0~4).
- 자격증명(localStorage)과 분리: 자격증명은 자동 로그인용으로만 영구 저장,
  Profile/Progress는 매 실행 시 `verify()` + `getProgress()`로 새로 받아 메모리에 보관 → 항상 최신.
- Home/Planet Scene은 `getSession()`으로 progress를 읽어 잠금/해제 등에 사용(이후 작업).
- `logout()` 시 `clearSession()`도 함께 호출.

## 6. 입력 방식 상세

- **숫자 필드(반/번호/비밀번호)**: 앱 내장 `NumberKeypad`. 안드로이드 키보드 안 뜸 →
  immersive 전체화면 레이아웃이 키보드에 가려지지 않음. "비밀번호는 숫자만" 요구 자연 충족.
- **이름(signup)**: 텍스트 → 안드로이드 시스템 키보드(한글). 유일한 예외.
- **fallback**: 내장 키패드가 실사용에서 문제되면 숫자 필드를 `inputmode="numeric"` +
  시스템 키보드로 전환. `NumberKeypad`/`CredentialForm` 경계가 분리돼 있어 교체 비용 작음.

## 7. 에러 / 엣지 처리 (아이 친화적 한국어)

- verify 실패(자격증명 틀림/계정 삭제): "번호나 비밀번호가 맞지 않아요. 선생님께 물어보세요."
  + 자동 로그인 경우 저장된 자격증명 삭제 후 chooser로.
- 네트워크 오류: "인터넷 연결을 확인해 주세요" + [다시 시도]. 저장된 자격증명은 **삭제하지 않음**.
- 회원가입 중복: "이미 등록된 번호예요. 로그인해 주세요." → login으로 유도.
- 입력 미완성: 로그인/가입 버튼 비활성(회색).
- 로딩 중: 버튼 스피너, 중복 제출 방지.

## 8. 레이아웃 기준

- 1280×800 CSS px, DPR 1.5, landscape 고정(CLAUDE.md 기준).
- 배경(`Background01.png`) + 타이틀 배너(`TitleBanner.png`) + 패널(`PanelBackground01.png`).
  `mytemp/`의 3개 에셋을 `public/`(또는 `src/assets`)로 옮겨 사용.
- 세로 높이 `100dvh`/`100svh`, 가장자리 UI는 `env(safe-area-inset-*)` 고려.
- 패널 내부는 가로 폭을 활용: 좌측 필드 / 우측 키패드 2열 배치.

## 9. 범위 밖 (이번 Scene에서 안 함)

- 로그아웃 **버튼의 배치**는 Home/설정 Scene 몫(여기선 `logout()`+`clearSession()` 로직만 준비).
- 비회원/게스트 모드.
- 비밀번호 변경/찾기(서버 API 없음 — 교사가 처리).
- Home/Planet의 progress 소비 로직(세션에서 읽기만 가능하게 준비).

## 10. 테스트 방향

- `CredentialForm`: 키패드 입력 → active 필드 이동 → 완성 시 `onSubmit` 페이로드 검증(단위).
- 상태 머신: 자격증명 유무 / verify 성공·실패·네트워크오류에 따른 상태 전이(단위, 서버 함수 mock).
- `session.ts`: set/get/clear 동작(단위).
- 수동: APK/웹에서 키패드만으로 로그인, 이름만 시스템 키보드, 자동 로그인/환영 패널 흐름.

## 11. 구현 편차 (Implementation deviations)

최종 리뷰에서 확인된, 스펙 대비 의도적으로 단순화한 부분. (수용 가능 — 추후 개선 후보)

- **Auth.tsx 상태 전이 단위 테스트 없음** (§10 대비): 순수 로직(`auth.logic.ts`, `session.ts`)은
  단위 테스트가 있으나, `Auth.tsx`의 화면 전이(checking/welcome/chooser/login/signup) 자체는
  Node 환경(jsdom 없음)에서 컴포넌트 렌더 테스트가 어려워 **수동(브라우저) 검증으로 갈음**한다.
  추후 개선: 전이 표를 순수 `nextScreen(event, state)` 리듀서로 추출해 단위 테스트화.
- **마지막 학교 기억(`hg.lastSchoolId`) 미구현** (§4.1 대비): `pickDefaultSchool`에 항상 `null`을
  넘겨 **첫 번째 학교를 기본 선택**한다. 초기 단일 학교 단계에서는 차이가 없음. 다중 학교로
  넓힐 때 localStorage 영속화를 추가한다.
