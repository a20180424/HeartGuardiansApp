# 공용 Prologue 추출 + planet3/4 walkable skeleton — 설계

작성일: 2026-07-04
브랜치: `feat/planet3-4-skeleton`

## 목표

1. planet1↔planet2에서 사실상 복제된 Prologue.tsx를 **데이터 주도형 공용 컴포넌트**로
   추출한다(시각 변화 없이).
2. 그 공용 컴포넌트를 써서 **planet3(얼음 행성)·planet4(그림자 행성)** 를 planet2와
   동일한 walkable skeleton으로 세운다: `Prologue → 미션1→2→3 → Home`(각 미션 시작·끝 2노드).

두 단계로 진행하며, 1단계(리팩터)가 2단계(골격)의 전제다. **PR은 1개**로 통합한다.

관련 선행 작업: planet2 골격([2026-07-04-planet2-walkable-skeleton-design.md](2026-07-04-planet2-walkable-skeleton-design.md), PR #16).

## 원칙 (planet2에서 확립)

> 엔진·레이아웃 틀 = 공유 / 시나리오·테마·데이터 = planet 전용.

이번엔 여기에 **프롤로그 레이아웃도 공유**를 추가한다(지금까진 planet1 CSS를 import해
공유했지만 TSX는 복제였다).

## 1단계 — 공용 Prologue 컴포넌트 추출

### 컴포넌트 위치·인터페이스

**신규** `src/scenes/planet/prologue/PrologueTemplate.tsx` — 프롤로그 9개 요소
(타이틀/하티+말풍선/학습목표/보상/오늘의탐험+시작버튼/스텝/우주선버튼) 레이아웃을 담는
공용 컴포넌트. `FixedStage`로 감싼다.

```ts
interface PrologueContent {
  modifier?: string; // 루트 추가 클래스, 예: "prologue--planet3" (planet1: 없음=기본 색)
  planetName: string; // 타이틀 텍스트, 예: "얼음 행성"
  hatiLines: string[]; // 하티 말풍선 줄들 (사이에 <br/> 삽입)
  objectives: string[]; // 🎯 학습 목표 항목들
  rewards: { icon: string; name: string; desc: string }[]; // ✨ 보상 항목들
  questTitle: string; // 오늘의 탐험 제목
  questSub: string; // 오늘의 탐험 부제
  questMascot: string; // 마스코트 이미지 경로
  questMascotAlt: string; // 마스코트 alt
  steps: string[]; // 미션 흐름 스텝 라벨들
}

interface PrologueProps extends PrologueContent {
  onStart: () => void;
  onHome: () => void;
}
```

고정(공용 컴포넌트에 하드코딩): 타이틀 별 아이콘, "하티" 이름표, 하티 이미지
(`hati_robot_worried.png`), "오늘의 탐험" 탭, "탐험 시작!" 버튼, "우주선으로 이동" 홈
버튼, 우주선 아이콘, 섹션 헤더("🎯 학습 목표" / "✨ 획득 가능한 보상").

### CSS 이동

- `planet1/Prologue.css` → **`src/scenes/planet/prologue/Prologue.css`로 이동**
  (공용 레이아웃 + 기본 CSS 변수/배경). `PrologueTemplate.tsx`가 import.
- 각 planet의 색/배경 override(`.prologue--planetN`)는 해당 planet의 `Prologue.css`에 유지.

### 각 planet은 얇은 wrapper로

`planetN/Prologue.tsx`는 데이터만 정의하고 공용 컴포넌트를 렌더한다. **파일명·default
export는 `Prologue` 그대로** → `index.tsx`의 `import Prologue from "./Prologue"`가 안
바뀌므로 index.tsx를 건드리지 않는다(진행 중인 planet2 PR과 무충돌).

planet1 wrapper 예시:

```tsx
import PrologueTemplate from "../prologue/PrologueTemplate";
// planet1 은 기본 색이라 전용 override CSS 없음(공용 Prologue.css의 기본값 사용).

const OBJECTIVES = [ /* 기존 planet1 값 그대로 */ ];
const REWARDS = [ /* 기존 planet1 값 그대로 */ ];
const STEPS = [ /* 기존 planet1 값 그대로 */ ];

export default function Prologue({ onStart, onHome }: { onStart: () => void; onHome: () => void }) {
  return (
    <PrologueTemplate
      planetName="빛의 행성"
      hatiLines={["이해의 빛이 사라졌어…", "친구들의 마음을 이해하면", "빛을 되찾을 수 있어!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="사라진 이해의 빛을 찾아라!"
      questSub="친구들의 마음을 이해하고 빛을 되찾아보자!"
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="루미"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
```

planet2 wrapper는 동일 형태 + `modifier="prologue--planet2"` + `import "./Prologue.css"`
(기존 안개 행성 값 그대로 이전).

### 1단계 검증 (시각 회귀 없음)

리팩터 전후로 `#/planet/1`, `#/planet/2` 프롤로그가 **픽셀 수준으로 동일**해야 한다.
브라우저로 두 프롤로그 스크린샷을 찍어 리팩터 전 모습과 비교한다. 텍스트·색·배경·배치
차이가 없어야 한다.

## 2단계 — planet3/4 walkable skeleton

각 행성(planet3, planet4)에 planet2와 동일 구조를 만든다.

### 파일 (행성마다)

- `Prologue.tsx` — 얇은 wrapper. placeholder 데이터 + `planetName`만 지정
  (planet3="얼음 행성", planet4="그림자 행성"). 나머지(목표/보상/스텝/마스코트/하티대사)는
  planet2 톤의 placeholder 문구, 마스코트는 planet1 에셋 재사용.
- `Prologue.css` — `.prologue--planet3`/`.prologue--planet4` modifier에 placeholder 포인트색만
  지정(planet3=얼음 블루 계열, planet4=그림자 퍼플/그레이 계열). **배경은 공용 기본값 상속**
  (새 배경 아트 없음).
- `theme.ts` — `MISSION01~03_DATA`/`_THEME`. planet2 theme.ts와 동일한 placeholder 구성
  (planet1 에셋 재사용, 하티만 노출, `showRadar:false`, `fx_light_return` 매핑).
- `mission01~03.json` — 각 시작·끝 2노드. 끝 노드는 `fx_light_return` 발화. 미션3 끝은
  보상 카드 포함(planet2와 동일).
- `index.tsx` — `prologue|mission1|mission2|mission3` 상태 머신. planet2 index.tsx 복제,
  import만 `./theme`로. 미션3 완료 시 우주선 버튼 → `nav("/home")`.
- `missions.test.ts`, `theme.test.ts` — planet2 테스트 미러(흐름·id·정합성).

**노드 ID 접두어**: planet3=`p3m1_`/`p3m2_`/`p3m3_`, planet4=`p4m1_`/… (grep 분리).

### planet3 three.js 보존

- `planet3/World.tsx`, `planet3/Npc.tsx`는 **그대로 둔다**(골격이 import하지 않음).
- 현재 three.js 진입점인 `planet3/index.tsx`를 **`planet3/Planet3Sample.tsx`로 이름 변경**해
  보존한다(내용 유지, 상단에 "행성3 실제 작업 시 index에서 이 컴포넌트를 꺼내 연결" 주석).
  export 이름은 `Planet3Sample`로 바꾼다.
- 새 `planet3/index.tsx` = 상태 머신(위).

### planet4 정리

현재 `planet4/index.tsx`는 planet1의 `MISSION01_THEME/DATA`를 빌려 `MissionPlayer`를 직접
렌더한다. 이를 자체 `theme.ts` 기반 상태 머신으로 교체한다.

## 공유 vs 전용 요약

- 🔵 공유(신규 포함): `prologue/PrologueTemplate.tsx` + `prologue/Prologue.css`,
  `player/*`, `engine/*`, `planet1/Planet1.css`(fade), `/assets/**`.
- 🟢 planet 전용: 각 `planetN/Prologue.tsx`(+override css), `theme.ts`, `mission0N.json`,
  `index.tsx`. planet3의 `World/Npc/Planet3Sample`.

## 제약

- 공용 컴포넌트 추출은 **시각 변화 0**(1단계 검증 필수).
- 각 planet의 `Prologue.tsx` default export 이름은 `Prologue` 유지 → index.tsx 무변경
  (단, planet3/4는 index.tsx를 새로 쓰므로 해당 없음; planet1/2는 index.tsx 절대 불변).
- 미션 끝 노드는 `fx_light_return` 필수(다음 버튼 조건). theme.fx에 매핑.
- planet1 에셋을 placeholder로 재사용. 새 아트 없음.
- `mission.css` 수정 금지(두 행성 공유).
- 단일 PR.

## 검증

1. 1단계: planet1/2 프롤로그 시각 동일(스크린샷 비교).
2. 2단계: `#/planet/3`, `#/planet/4`에서 Prologue→미션1→2→3→홈 클릭 걸음. 각 미션 끝
   "다음 미션으로", 미션3 "우주선으로 이동" 확인.
3. 전체 `npm test`(planet3/4 missions·theme 테스트 포함) + `tsc -b` + `oxlint` 통과.

## 범위 밖 (후속)

- planet3/4 실제 미션 콘텐츠, 전용 아트·배경·마스코트.
- planet3 three.js 재연결 및 3D 콘텐츠.
- `mission.css` 공유/전용 분리.
