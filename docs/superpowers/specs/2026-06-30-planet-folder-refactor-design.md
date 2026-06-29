# Planet 엔진 폴더 정리 — 설계

> 상태: **승인됨.** 브랜치 `refactor/planet-folders` (최신 main 기준).
> 선행: [[scene-folder-refactor]] (intro/auth/home, PR #5 머지 완료)의 후속.
> 관련: [docs/scene-folder-refactor.md](../../scene-folder-refactor.md) 의 Planet 보류 항목.

## 목적

흩어진 Planet 미션 엔진/콘텐츠를 `scenes/planet/` 패밀리 폴더로 흡수해, intro/auth/home과 같은 "scene을 폴더째 이해/이동/삭제" 일관성을 완성한다.

**기능 변경 0.** 순수 파일 이동 + import 경로 수정. 동작은 그대로다.

## 현재 진단 (결합 실측)

엔진 스택은 **전부 Planet 패밀리 전용** — 밖에서 쓰는 곳 0:

| 위치 | 정체 | 사용처 |
|---|---|---|
| `src/engine/` (runner.ts 95줄, types.ts 45줄, runner.test.ts 97줄) | 범용 대화 상태머신 + 타입 (React 없음) | `mission/MissionPlayer` 만 |
| `src/mission/` (MissionPlayer.tsx 721줄, audio.ts 140줄, mission.css 901줄) | 범용 React 플레이어 | Planet1·2·4 |
| `src/missions/mission01/theme.ts` (136줄) | `MissionTheme` 인터페이스 + `MISSION01_THEME` 인스턴스 | MissionPlayer(타입) + Planet1·2·4(인스턴스) |
| `src/three/` (World.tsx 61줄, Npc.tsx 57줄) | Planet3 전용 3D | Planet3 만 |
| `public/scenarios/mission01.json` | 대사 스크립트 | URL fetch (`scenarioUrl`) |

문제: `mission/`(단수, 플레이어)와 `missions/`(복수, 콘텐츠) 혼동, 범용 엔진이 top-level에 흩어져 Planet과 분리됨, 타입 위치 역결합(아래).

## 확정된 결정 (brainstorming)

1. **범위:** 순수 구조 리팩터링, 기능 변경 0.
2. **Planet별 폴더:** 진입 파일 + 전용 콘텐츠를 Planet 폴더로 완전 co-locate.
3. **엔진 내부:** `engine/`(순수 로직) + `player/`(React UI) 두 갈래 유지, `mission/`→`player/` 리네임.
4. **Outro도 폴더화:** Planet은 아니지만 마지막 평면 scene이라 일관성 위해 `scenes/outro/`로.

## 목표 구조

```
src/scenes/
  planet/
    engine/
      runner.ts, types.ts, runner.test.ts   (← src/engine/*)
      └ types.ts 가 MissionTheme 인터페이스를 흡수
    player/
      MissionPlayer.tsx, audio.ts, mission.css   (← src/mission/*, mission→player)
    planet1/
      index.tsx    (← Planet1.tsx)
      theme.ts     (← missions/mission01/theme.ts 의 MISSION01_THEME 인스턴스만)
    planet2/
      index.tsx    (← Planet2.tsx)
    planet3/
      index.tsx    (← Planet3.tsx)
      World.tsx, Npc.tsx   (← src/three/*)
    planet4/
      index.tsx    (← Planet4.tsx)
  outro/
    index.tsx      (← Outro.tsx)
```

**사라지는 top-level:** `src/engine/`, `src/mission/`, `src/missions/`, `src/three/` — 전부 흡수.

진입 파일은 소문자 폴더 + `index.tsx` (intro/auth/home 동일 규칙). `App.tsx` 라우트 import 는 `./scenes/planet/planetN`, `./scenes/outro` 로 갱신 (case-sensitive 빌드 대비).

## 강제되는 두 결정 (구조의 결과)

1. **`MissionTheme` 인터페이스 → `engine/types.ts`.** 범용 계약인 `MissionTheme`가 현재 특정 미션 콘텐츠 파일(`missions/mission01/theme.ts`)에 산다. 인스턴스(`MISSION01_THEME`)를 `planet1/theme.ts`로 옮기면, 타입을 거기 남길 경우 **범용 `player`가 특정 `planet1`에서 타입을 import**하는 역방향 결합이 생긴다. 따라서:
   - `MissionTheme` 인터페이스 → `engine/types.ts` (다른 계약 `MissionData`·`RunnerView`와 함께).
   - `MISSION01_THEME` 인스턴스 → `planet1/theme.ts` (engine에서 타입 import).
   - `MissionPlayer` 의 `import type { MissionTheme } from "../missions/mission01/theme"` → `from "../engine/types"`.
   - 동작 변경 0 (타입은 컴파일 타임).

2. **scenario JSON은 `public/scenarios/` 유지.** `scenarioUrl="/scenarios/mission01.json"` 로 런타임 URL fetch라, src로 옮기면 로딩 방식(URL fetch → JSON import)을 바꿔야 = 동작 변경. 범위 밖이라 그대로 둔다.

## 마이그레이션 방식

- **`git mv`** 로 이동, 히스토리 보존.
- **상대 import 재계산** (대표):
  - `player/MissionPlayer.tsx`: `../engine/*` 그대로(여전히 sibling), `../missions/mission01/theme`(MissionTheme 타입) → `../engine/types`, `../lib/useFitStage` → `../../../lib/useFitStage`, `./audio`·`./mission.css` 그대로.
  - `planet1/index.tsx`: `../mission/MissionPlayer` → `../player/MissionPlayer`, `../missions/mission01/theme` → `./theme`.
  - `planet2/index.tsx`·`planet4/index.tsx`: 위 planet1과 동일 패턴(현재 동일 코드).
  - `planet3/index.tsx`: `../three/World` → `./World`. `World.tsx`의 `./Npc` 그대로(sibling).
  - `planet1/theme.ts`: 새로 `import type { MissionTheme } from "../engine/types"`.
  - `engine/runner.test.ts`: `./types` 그대로.
  - `outro/index.tsx`: 상대 import 없음(react-router만).
- **`App.tsx`**: Planet1~4 → `./scenes/planet/planetN`, Outro → `./scenes/outro`.

## 검증

기능 무변경이므로 **타입체크 + 테스트 + 빌드 그린**이 성공 기준.

- `npm run build` (tsc -b && vite build) — 끊어진 import 0, 에셋 정상 emit.
- `npm test` — `engine/runner.test.ts`(미션 엔진 단위 테스트) 포함 전체 PASS.
- 앱 구동: `/planet/1`(MissionPlayer 대화), `/planet/3`(3D World), `/outro` 렌더 확인.

## 비범위 / YAGNI

- Planet2/3/4 실제 콘텐츠 구축 (별도 기능 작업).
- scenario JSON 로딩 방식 변경 (URL fetch 유지).
- `mission.css` 파일명 변경 (player/ 안에 두되 이름 유지 — churn 회피).
- intro/auth/home 재정리 (이미 완료).
