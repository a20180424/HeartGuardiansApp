# Planet2 걸을 수 있는 골격 (walkable skeleton) — 설계

작성일: 2026-07-04
브랜치: `feat/planet2`

## 목표

Planet2를 planet1과 **동일한 전체 구성**으로 세운다:

```
Prologue → 미션1 → 미션2 → 미션3 → Home
```

이번 작업 범위는 **끝까지 걸을 수 있는 골격**까지다. 각 미션은 **시작 노드 +
끝 노드 2개만** 정의하여 미션1→2→3→홈 흐름을 실제로 작동시킨다. 미션 가운데
콘텐츠(선택지/거울/게이지 등)는 이후 별도 작업에서 채운다.

비주얼은 **planet1 에셋을 placeholder로 재사용**한다. 안개 행성 전용 아트가
준비되면 `theme.ts`의 경로 문자열만 교체한다.

## 원칙: 공유 vs Planet2 전용

planet1이 이미 정립한 구조를 그대로 따른다.

> **엔진·레이아웃 틀 = 공유 / 시나리오·테마·데이터 = planet 전용**

### 🔵 공유 (import만, 복제 안 함)
- `player/*` — `MissionPlayer`, `MirrorStage`, `RubReveal`, `audio.ts`,
  **`mission.css`**. 미션 렌더링 엔진. planet2는 `MissionPlayer`를 쓰는 것만으로
  이 CSS를 그대로 받는다.
- `engine/*` — `runner.ts`, `types.ts`. 시나리오 그래프 실행기.
- `planet1/Prologue.css` — 프롤로그 레이아웃 템플릿 (planet2가 이미 import 중).
- `planet1/Planet1.css` (`.planet-fade`) — subscene 전환 오버레이. planet2/index에서
  cross-import. (Prologue.css를 planet2가 planet1에서 import하는 기존 선례와 동일.)
- `/assets/**` — 하티 스프라이트·레이더·배경 등 실제 이미지.

> ⚠️ `mission.css`는 두 행성 공유. Planet2 미션 룩을 바꾸려 여기를 직접 고치면
> planet1까지 바뀐다. 공유 vs Planet1-전용 규칙 분리는 **의도적으로 나중 과제**로
> 미뤘다(2026-07-04 결정). 지금 골격 단계에선 건드리지 않는다.

### 🟢 Planet2 전용
- `planet2/Prologue.tsx` + `Prologue.css` — **이미 있음**. 안개 행성 내용까지 채워짐.
- `planet2/index.tsx` — **수정**. 지금은 Prologue만 렌더. 상태 머신으로 확장.
- `planet2/theme.ts` — **신규**. 미션 테마 3개 + JSON import.
- `planet2/mission01.json`, `mission02.json`, `mission03.json` — **신규**. 각 2노드.

## 상세 설계

### 1) 미션 JSON 골격

각 미션은 `line` 타입 시작 노드 → `line` 타입 끝 노드 2개. 시작 노드는 하티
인트로 대사 후 끝 노드로 직결, 끝 노드는 완료 배너 + `next: null`.

> ⚠️ **핵심 제약 — 끝 노드는 반드시 `fx_light_return`을 쏴야 한다.**
> "다음 미션으로 / 우주선" 버튼(`vm.showNext`)은 `MissionPlayer`에서 **오직
> `lightReturn` fx가 실행될 때만** 켜진다([MissionPlayer.tsx:338-342](../../../src/scenes/planet/player/MissionPlayer.tsx#L338-L342)).
> `completeBanner` + `next: null`만으로는 버튼이 안 떠서 **흐름이 막힌다.**
> planet1도 미션1·2·3 전부 마지막 노드 `onEnter`에서 `fx_light_return`을 쏜다.
> 따라서 세 미션 모두 끝 노드에 이 fx를 넣고, `theme.fx`에
> `fx_light_return: "lightReturn"`을 매핑한다.

미션1·2 예시 (mission01.json):

```json
{
  "id": "mission01",
  "title": "(임시) 미션 1",
  "start": "p2m1_intro",
  "nodes": [
    {
      "id": "p2m1_intro",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "text": "(임시) 미션1 시작 대사입니다. 여기에 인트로가 들어갈 예정.",
      "next": "p2m1_end"
    },
    {
      "id": "p2m1_end",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "text": "(임시) 미션1 완료!",
      "completeBanner": "미션 완료!",
      "onEnter": [{ "cmd": "fx", "value": "fx_light_return" }],
      "next": null
    }
  ]
}
```

미션2는 동일 구조 (`p2m2_intro` → `p2m2_end`, 끝 노드에 동일한 `fx_light_return`).

미션3 끝 노드는 여기에 보상 카드까지 더해 planet1 마무리 톤을 살린다:

```json
{
  "id": "p2m3_end",
  "type": "line",
  "speaker": "hati",
  "hideFriend": true,
  "text": "(임시) 미션3 완료! 안개 행성 탐험 끝.",
  "completeBanner": "미션 완료!",
  "cards": [{ "image": "/assets/ui/planet1-reward-card.png" }],
  "onEnter": [{ "cmd": "fx", "value": "fx_light_return" }],
  "next": null
}
```

**노드 ID 규칙:** `p2m1_`/`p2m2_`/`p2m3_` 접두어. planet1의 `m1_`과 grep 시
섞이지 않게 한다.

### 2) theme.ts (placeholder)

`MissionTheme` 필수 필드를 모두 채우되 값은 planet1 재사용 / 최소값.

- `speakers`: `hati`만 실제 사용. 친구는 아직 없음.
- `friends` + `initialFriend`: 타입상 필수라 planet1 m3처럼 **placeholder 친구
  1개**(Lumi 스프라이트 재사용)를 두고 `initialFriend`로 가리킨다. 모든 노드가
  `hideFriend: true`라 화면엔 안 보인다.
- `banner`: 미션별 문구(pill "미션 1/2/3" 등). `bannerNode`: `p2mN_intro`.
- `bg` / `hatiSprites` / `radar`: **planet1 경로 재사용** (light-planet 배경, HATI_CHAR,
  radar_*).
- `showRadar: false` — 골격 화면을 깔끔하게. (콘텐츠 확정 후 미션별로 켠다.)
- `badgeColors`: planet1 값 재사용.
- `choiceIcons: {}` — 선택지 노드가 아직 없음.
- `fx`: **세 미션 모두** `{ fx_light_return: "lightReturn" }` — 끝 노드의 다음
  버튼을 띄우는 데 필수(위 핵심 제약 참고).
- `sfx: { byNode: {} }`.
- `MISSION0N_DATA`: 각 JSON을 `as unknown as MissionData`로 import (planet1 관례).

### 3) index.tsx (상태 머신)

planet1/index.tsx와 **동일 구조**로 교체한다. 데이터/테마 import만 `./theme`로 바꾼다.

- `type Stage = "prologue" | "mission1" | "mission2" | "mission3"`
- `STAGES` 배열, `goTo()` 페이드 전환(검은 오버레이 페이드아웃→교체→페이드인).
- DEV 단축키: `?stage=mission2` / `?m=2` (프로덕션에선 항상 prologue).
- 배경 프리캐시 `useEffect` (미션 테마 bg를 Image로 미리 로드).
- Prologue `onStart` → `goTo("mission1")`, `onHome` → `nav("/home")`.
- 미션1 완료 → `goTo("mission2")`, 미션2 완료 → `goTo("mission3")`.
- 미션3: `finish={{ label: "우주선으로 이동", icon: "/assets/char/SpaceshipIcon.png" }}`
  + `onExit` → `nav("/home")`.
- `<div className={planet-fade ...}>` 오버레이 + `import "../planet1/Planet1.css"`.

## 검증

구현 후 dev 서버에서 `#/planet/2` 진입하여:
1. Prologue "탐험 시작!" → 미션1 인트로 → 완료 배너 → "다음 미션으로" 버튼
2. → 미션2 → 미션3 → "우주선으로 이동" → Home 도착

까지 클릭만으로 끝까지 걸어지는지 확인한다. 버튼 흐름은 이미 코드로 검증됨:
`fx_light_return` → `vm.showNext=true` → `#nextBtn`(finish 있으면 `.ship`) →
`onExit` → 부모 상태 머신이 다음 stage로.

## 범위 밖 (이후 작업)

- 각 미션 가운데 콘텐츠(선택지/거울/게이지/영상) 채우기.
- 안개 행성 전용 배경·캐릭터 아트 교체.
- `mission.css` 공유 vs planet-전용 규칙 분리.
- 프롤로그 스텝 라벨과 실제 미션 제목 정합성 맞추기.
