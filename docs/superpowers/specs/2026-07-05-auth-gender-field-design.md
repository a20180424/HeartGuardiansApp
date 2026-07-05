# Auth: 사용자 성별(gender) 필드 추가 — 설계

- 날짜: 2026-07-05
- 대상 저장소: HeartGuardiansApp (프론트엔드). 백엔드(Cloudflare Workers)는 별도 저장소이며 이미 gender를 지원한다.
- API 규격: `https://heartguardians-api.a20180424.workers.dev/api/openapi.json` (v3.0.0)

## 배경 / 목적

API가 사용자 정보에 `gender`를 추가했다. 프론트엔드를 규격에 맞춰 회원가입 시 성별을 입력받고, 프로필 응답의 `gender`를 세션·화면에 반영한다.

### API 규격이 확정한 사실 (검증 완료)

| 스키마 | gender | 필수 |
|---|---|---|
| `SignupBody` (`POST /api/auth/signup`) | `"male" \| "female"` | ✅ required |
| `VerifyResponse` (`POST /api/auth/verify`) | `"male" \| "female"` | ✅ required |
| `ProfileResponse` (`GET /api/me`) | `"male" \| "female"` | ✅ required |
| `VerifyBody` (로그인 입력) | 없음 | — |

핵심 결론:
1. **gender는 신원 키가 아니라 프로필 데이터다.** `VerifyBody`에 없으므로 로그인 자격증명(`Credentials` = `x-*` 헤더)과 `authHeaders`는 건드리지 않는다.
2. gender는 **회원가입 시 필수 입력**이다(누락 시 서버 400).
3. 값이 정확히 `"male" | "female"`이라 [ProfileCard](../../../src/scenes/home/components/ProfileCard.tsx)의 `FACES` 키와 완전히 일치한다 → **매핑 코드 불필요.**

## 범위

### 포함
- 데이터 모델(`Profile`, `SignupBody`)에 `gender` 추가
- 회원가입 폼에 성별 선택 UI 추가 및 전송
- 프로필의 gender를 Home `ProfileCard`에 연결
- 관련 순수 로직 및 테스트 갱신

### 제외 (YAGNI)
- female 얼굴 에셋 제작 → **현행 male 폴백 유지** (기능은 동작, 비주얼만 후속 과제)
- 로그인 폼의 gender 입력 (로그인은 gender 불필요)
- 프로필 수정 화면

## 설계

### 1. 데이터 모델 — [src/lib/auth.ts](../../../src/lib/auth.ts)

```ts
export type Gender = "male" | "female";

export interface Profile {
  // ...기존 필드
  gender: Gender;   // 추가 (verify/me 응답에 항상 포함)
}

export interface SignupBody extends Credentials {
  name: string;
  gender: Gender;   // 추가
}
```

- `Credentials`([src/lib/api.ts](../../../src/lib/api.ts)) · `authHeaders` · `VerifyBody` 상당물: **변경 없음.**

### 2. 폼 순수 로직 — [src/scenes/auth/auth.logic.ts](../../../src/scenes/auth/auth.logic.ts)

```ts
export interface FormState {
  // ...기존 필드
  gender: Gender | null;   // 추가
}

export function initialForm(): FormState {
  return { grade: null, class: null, number: null, pin: "", pinConfirm: "", gender: null };
}
```

- `isComplete(s, mode, name)`: signup 분기에 `s.gender !== null` 조건 추가. login 분기는 불변.
- `toCredentials`: **불변.** gender는 `Credentials`에 속하지 않으므로 여기서 다루지 않는다.

### 3. 폼 UI — [CredentialForm.tsx](../../../src/scenes/auth/components/CredentialForm.tsx) + [Auth.css](../../../src/scenes/auth/Auth.css)

- 성별 필드는 **signup 모드에서만** 렌더링(login 모드엔 없음).
- **새 세로 줄을 추가하지 않는다.** 회원가입 1번 줄을 `[학교][이름]` → `[학교][이름][성별]` 3분할로 확장한다. 고정 패널(600×480) 세로 높이를 유지하기 위함.
- 컨트롤 형태:
  - **선호: 세그먼트 탭 토글**(남자 / 여자 두 버튼, 화면 표시는 "남자/여자", 내부 값은 `male/female`, 선택 시 강조). 탭 한 번으로 선택 완료.
  - **폴백: native `<select>` 드롭다운**(학년/반/번호와 동일 스타일). 3분할 시 가로 공간이 부족해 두 버튼이 깨질 경우.
  - **최종 형태는 구현 단계에서 1280×800 무대 실제 렌더링을 보고 확정한다**(런타임 분기가 아니라 개발 시 한쪽으로 고정). 어느 쪽이든 값은 `Gender`, signup 필수.
- `onSubmit` 시그니처 확장: 현재 `(creds: Credentials, name: string)` → gender를 함께 올린다. name과 동일한 방식(별도 인자)으로 `(creds, name, gender)` 전달. login 모드는 gender를 넘기지 않음.
- `canSubmit`은 기존대로 `isComplete`에 의존하며, signup에서 gender 미선택 시 비활성.
- CSS: 탭 토글용 `.field--gender` / `.gender-toggle` 클래스 신설(선택/비선택 상태 스타일). 드롭다운 폴백 시 기존 `.field--select` 재사용.

### 4. 가입/세션 흐름 — [auth/index.tsx](../../../src/scenes/auth/index.tsx)

- `handleSignup(creds, name, gender)`로 확장 → `signup({ ...creds, name, gender })`.
- verify 응답(`Profile`)에 gender가 실려 오므로 `setSession`을 통해 자동으로 세션에 포함된다. 추가 배선 불필요.

### 5. 소비처 — [home/index.tsx](../../../src/scenes/home/index.tsx)

- `<ProfileCard name={profile.name} progress={progress} gender={profile.gender} />`로 연결.
- `ProfileCard`는 이미 `gender?: "male" | "female"` prop을 지원하며 값 규격이 일치하므로 매핑 없이 전달.
- female 에셋 부재로 [ProfileCard.tsx](../../../src/scenes/home/components/ProfileCard.tsx)의 `FACES.female`은 당분간 male 이미지로 폴백(현행 유지). 기능상 오류 아님.

### 6. 테스트 — [auth.logic.test.ts](../../../src/scenes/auth/auth.logic.test.ts)

- `initialForm` 기대값에 `gender: null` 추가.
- `isComplete` signup: gender가 있으면 true, 없으면 false인 케이스 추가.
- `toCredentials` 기대값: **변경 없음**(gender 미포함이 정상) — 기존 케이스 그대로 통과.

## 데이터 흐름

```
[회원가입 폼]
  FormState(gender) ──┐
                      ├─ onSubmit(creds, name, gender)
[index.handleSignup] ─┘
  signup({ ...creds, name, gender })  → POST /api/auth/signup
  verify(creds)                       → POST /api/auth/verify → Profile(gender 포함)
  setSession({ profile, progress })

[Home] getSession().profile.gender → <ProfileCard gender=…> → FACES[gender] (female는 male 폴백)
```

## 에러 처리

- 기존 signup 에러 처리 흐름([classifyVerifyError](../../../src/scenes/auth/auth.logic.ts)) 재사용. gender 누락은 클라이언트에서 `canSubmit` 비활성으로 사전 차단하므로 정상 흐름에선 서버 400에 도달하지 않는다. 도달하더라도 기존 "입력이 올바르지 않아요" 경로로 처리된다.

## 검증 계획

- `auth.logic.test.ts` 단위 테스트 통과.
- 개발 서버에서 회원가입 → 성별 선택 → 가입 → welcome → Home에서 프로필 표시까지 실제 흐름 확인(성별 미선택 시 가입 버튼 비활성 확인 포함).
- 1280×800 무대에서 signup 1번 줄 3분할 레이아웃이 깨지지 않는지 확인(→ 탭 토글 vs 드롭다운 최종 결정).
```
