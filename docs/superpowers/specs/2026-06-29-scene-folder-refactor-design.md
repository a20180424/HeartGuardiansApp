# Scene 폴더 구조 리팩터링 — 설계

> 상태: **승인됨.** 브랜치 `refactor/scene-folders` (최신 main 기준).
> 선행 제안: [docs/scene-folder-refactor.md](../../scene-folder-refactor.md).

## 목적

scene을 **폴더째 이해/이동/삭제**할 수 있도록 구조를 일관화한다. 핵심 원칙은
"같이 바뀌는 건 같이 둔다". 앞으로 8개 Scene을 계속 추가하는데 현재는 절반만
scene 기반이라 일관성이 없다.

**기능 변경 0.** 순수 파일 이동 + import 경로 수정. 동작은 그대로다.

## 범위

| 포함 | 제외 (보류) |
|---|---|
| Intro / Auth / Home 3개 scene 폴더화 | Planet1~4 / Outro |
| `scenes/home/Modal.tsx` → `shared/components/` | `mission/`, `missions/`, `engine/`, `three/` |
| `src/assets/{auth,home}/` co-locate | `lib/` 내부 구조 |

**Planet 엔진군 제외 이유:** `engine/`·`mission/`은 Planet1·2·4가 공유하는
인프라(scene 종속 아님), `missions/mission01/`은 미션 콘텐츠, `three/`는
Planet3 전용이다. Planet scene들이 아직 얇은 스텁이라 실제 사용 패턴이 나오기
전에 배치를 정하면 추측성이다. Planet 본격 구현 때 별도로 결정한다.

## 확정된 결정 (brainstorming Q1~Q5)

1. **부품 배치** → 각 scene 폴더 아래 `components/` 하위 폴더.
2. **공용 폴더** → `lib/` 유지(순수 유틸, import churn 회피) + 공용 UI는
   `shared/components/` 신설.
3. **에셋** → `scenes/<scene>/assets/` 로 co-locate.
4. **진입 파일명** → `index.tsx` (import 경로 `./scenes/home` 로 깔끔).
5. **Planet 엔진군** → 이번 범위 제외.

## 목표 구조

```
src/
  scenes/
    intro/
      index.tsx              (← Intro.tsx)
      Intro.css
      intro.logic.ts         (← src/scenes/intro.logic.ts)
      intro.logic.test.ts    (← src/scenes/intro.logic.test.ts)
      (부품·에셋 없음 — 비디오는 public/)
    auth/
      index.tsx              (← Auth.tsx)
      Auth.css               (← src/scenes/Auth.css)
      auth.logic.ts          (이미 scenes/auth/ 에 있음)
      auth.logic.test.ts
      components/
        Chooser.tsx, CredentialForm.tsx, SchoolPicker.tsx, WelcomePanel.tsx
      assets/                (← src/assets/auth/)
    home/
      index.tsx              (← Home.tsx)
      Home.css               (← src/scenes/Home.css)
      home.logic.ts, home.logic.test.ts, home.data.ts  (이미 scenes/home/ 에 있음)
      components/
        EnergyGauge.tsx, ProfileCard.tsx, Mothership.tsx,
        PlanetButton.tsx, MenuBar.tsx, HatiHelper.tsx
      assets/                (← src/assets/home/)
    Planet1.tsx ~ Planet4.tsx, Outro.tsx        (그대로 — 보류)
  shared/
    components/
      Modal.tsx              (← scenes/home/Modal.tsx, "Generic Modal")
  lib/                       (그대로: api, auth, progress, session, useFitStage + tests)
  mission/ missions/ engine/ three/             (그대로 — 보류)
  styles/global.css          (그대로)
  assets/                    (auth/·home/ 빠짐 → hero.png, react.svg, vite.svg 등 잔여)
```

- CSS 파일명은 기존(`Intro.css`/`Auth.css`/`Home.css`) 유지, 폴더로만 이동 —
  churn 최소화.
- `auth/`·`home/`의 logic/data/test 파일은 **이미 해당 하위 폴더에 있으므로**
  부품만 `components/` 로 한 단계 더 내린다. 진입 파일(`Auth.tsx`/`Home.tsx`)을
  폴더 안으로 끌어내려 `index.tsx` 로 만든다.
- `intro` 는 현재 부품 하위 폴더가 없고 `intro.logic.*` 가 `scenes/` 최상위에
  평면으로 있다 → `scenes/intro/` 폴더로 모은다.

## 마이그레이션 방식

- **`git mv` 로 이동** → 히스토리 보존. 17MB 에셋도 rename으로 추적되어 저장소
  비대화 없음.
- **상대 import 깊이 재계산.** 이동으로 바뀌는 대표 케이스:
  - `home/index.tsx`: `../assets/home/X` → `./assets/X`
  - `home/components/*.tsx`: `../../assets/home/X` → `../assets/X`
    (components 는 home 한 단계 아래, assets 는 home 직속 → `../assets/X`)
  - `home/components/*` 가 `home.logic`/`home.data` 참조 시: `../X` 로 한 단계 위
  - `index.tsx` 의 Modal: `./home/Modal` → `../../shared/components/Modal`
  - auth 도 동일 패턴 (assets/auth → assets, 부품은 components/ 로)
- **`App.tsx`**: `./scenes/Intro|Auth|Home` 3줄은 폴더 resolve(index.tsx)로
  **경로 문자열 그대로 동작.** Planet/Outro 줄은 변경 없음.
- **`scripts/process_home_assets.py`**: `DST = Path("src/assets/home")` →
  `Path("src/scenes/home/assets")` 1줄 수정. (`src/assets/auth` 는 스크립트
  대상 아님 — 수동 자산.)
- Modal을 참조하는 곳은 현재 `Home.tsx` 단 한 곳 → import 한 줄만 갱신.

## 검증

기능 무변경이므로 **타입체크 + 테스트 + 빌드 그린**이 곧 성공 기준이다.

- `tsc` (또는 `vite build` 의 타입체크) — 끊어진 import 0.
- `vitest` — 기존 logic/session 테스트 (intro/auth/home logic, session) 통과.
- `vite build` — 번들 성공, 에셋 fingerprint 정상 emit.
- 마지막에 앱 실제 구동으로 Intro/Auth/Home 3개 scene 렌더 + 에셋 표시 육안 확인.

## 비범위 / YAGNI

- Planet/mission/engine/three 재배치 (위 "범위" 참조).
- `lib/` → `shared/` 이름 통일 (import churn 대비 이득 없음, 보류).
- CSS 파일명 정규화 (`Home.css` → `index.css` 등) — 불필요한 churn.
