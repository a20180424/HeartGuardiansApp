# Planet2 미션1 — 감정 설명서 미니게임 설계

작성일: 2026-07-05
관련 브랜치: `feat/planet2-content`

## 배경 / 목표

Planet2 미션1(`src/scenes/planet/planet2/mission01.json`)의 `p2_m1_play` 노드 자리에
"가디언즈 감정 설명서" 미니게임을 넣는다. 원본은 `mytemp/행성2_미션1_게임.html`
(바닐라 JS + Tailwind CDN, ~1000줄, 전부 자체 코드).

원본에는 **학생 모드**(양면 책 플레이)와 **교사 모드**(대기록관 통계 대시보드)가 있는데,
이번 스코프는 **학생 모드의 10문항 플레이 부분만** 앱에 이식한다.

### 확정된 요구사항
- 학생 모드만 이식(교사 대기록관 제외).
- 10개 감정 상황을 전부 넣는다.
- 결과(감정/행동 선택)는 **서버에 저장할 예정이나 서버가 아직 없음** → 지금은 **메모리에만** 보관.

### 확정된 방향
- iframe 임베드가 아니라 **React 컴포넌트로 이식**(B안). 근거: 최종 실행 환경이
  오프라인 Galaxy Tab APK라 Tailwind/폰트 CDN 외부 로드가 위험하고, `#stage`
  1920×1200 좌표계·결과 추출·프레이밍/재스타일 통합 때문에 iframe이 오히려 총비용이 높다.
- **기능 우선, 비주얼은 나중.** 이번 단계는 10문항 로직·데이터·결과수집을 최소 스타일로
  동작시키는 것까지. 초록/금색 양장본 룩 재현·planet2 톤 재스타일은 별도 후속 단계.

## 기존 엔진 패턴 (이식이 따라갈 선례)

미션 엔진은 이미 인터랙티브 특별 노드(`mirrors`/`gauge`/`reveal`/`video`)를 다음 흐름으로 처리한다:

1. `engine/types.ts` — `MissionNode.type` 유니온에 타입 추가 + `RunnerView`에 view 메서드 추가.
2. `engine/runner.ts` — `go()`에서 해당 타입을 view 메서드로 디스패치, `done` 콜백은 `advance(node)`.
3. `player/MissionPlayer.tsx` — view 메서드가 `vm.stage`를 세팅하고 상태를 채움 →
   `vm.stage === X`일 때 전용 컴포넌트(`MirrorStage`/`RubReveal`)를 조건부 렌더 →
   완료 시 `finishX()`가 `vm.stage="none"` 후 `done()` 호출 → 엔진이 다음 노드로 진행.

이 미니게임도 정확히 이 패턴을 따르되, **공유 엔진을 planet2에 종속시키지 않도록**
게임 컴포넌트는 planet2에서 주입한다.

## 아키텍처

### 1) 제네릭 `minigame` 노드 타입 (공유 엔진, 범용)

특정 게임이 아니라 **범용 미니게임 훅**을 추가한다. 다른 행성/미션도 재사용 가능.

- `engine/types.ts`
  - `MissionNode.type` 유니온에 `"minigame"` 추가.
  - `MissionNode`에 `game?: string` 필드 추가(게임 식별자).
  - `RunnerView`에 `showMinigame(node: MissionNode, done: () => void): void` 추가.
- `engine/runner.ts`
  - `typeOf` 반환 유니온에 `"minigame"` 추가.
  - `go()`에 분기 추가: `if (t === "minigame") { this.view.showMinigame(node, () => this.advance(node)); return; }`

### 2) MissionPlayer — 게임 주입 지점

- `VM.stage` 유니온에 `"minigame"` 추가. `VM`에 `gameId: string` 필드 추가.
- MissionPlayer props에 추가:
  ```ts
  games?: Record<string, React.ComponentType<{ onDone: () => void }>>;
  ```
- `showMinigame(node, done)` 구현: `updateScene(node)` 호출(배경/HUD 유지),
  `vm.stage="minigame"`, `vm.gameId = node.game || ""`, `vm.mode="idle"`,
  `vm.bubbleKind="none"`, `vm.choices=[]`, `ms.done = done`, `render()`.
- `finishMinigame()` 헬퍼(`finishReveal` 패턴): `ms.done`을 비우고 `vm.stage="none"` 후 `done()`.
- 렌더 블록: `vm.stage === "minigame"`일 때 `const Game = props.games?.[vm.gameId]`을 찾아
  `<Game onDone={finishMinigame} />` 렌더. 없으면 아무것도 렌더하지 않음(안전).
- `reset()`의 상태 초기화 목록에 `stage`(이미 있음)·`gameId: ""` 반영.

MissionPlayer는 게임 내용·결과를 전혀 모른다. `onDone`(=다음 노드로 진행)만 넘긴다.

### 3) planet2에서 게임 주입 + 결과 보관

- `planet2/index.tsx`
  - 결과 보관용 `const emotionResultRef = useRef<EmotionGuideResult[] | null>(null);`
  - mission1 `MissionPlayer`에 prop 추가:
    ```tsx
    games={{
      emotionGuide: ({ onDone }) => (
        <EmotionGuideStage
          onFinish={(results) => {
            emotionResultRef.current = results; // TODO: 서버 준비 시 이 지점에서 POST
            onDone();
          }}
        />
      ),
    }}
    ```
  - 지금은 메모리(ref) 보관까지만. 서버 연동은 후속.

### 4) 게임 컴포넌트 — `planet2/EmotionGuideStage.tsx`

원본 학생 모드 양면 책 플레이를 이식. **이름입력 표지·완료 축하 화면은 제외**
(이미 JSON의 `p2_m1_preplay`(설명서 표지)·`p2_m1_result`(완성)가 담당).

- props: `{ onFinish: (results: EmotionGuideResult[]) => void }`
- 내부 상태(React state): `currentStep`(1~10), `selectedEmotion`, `selectedAction`,
  누적 `results`.
- 흐름(원본 `loadSituation`/`selectEmotion`/`selectCopingAction`/`nextPage` 이식):
  왼쪽 = 상황 제시 + 감정 8버튼 중 1택 / 오른쪽 = 감정 선택 후 해당 감정의 행동 6개 중 1택 →
  피드백 문구 표시 → 다음. 10문항 반복 후 `onFinish(results)`.
- 배치: `#stage`(1920×1200 좌표계) 위 오버레이. **최소 스타일**(가독성 위주, 절대배치 px).
  Tailwind/외부폰트 없음. 비주얼 폴리싱은 후속 단계.

### 5) 데이터 — `planet2/emotionGuide.data.ts`

원본 JS 상수를 TS 모듈로 이식(내용 1:1, Tailwind 색상 클래스는 제거):

```ts
export interface Situation { id: number; title: string; desc: string; }
export interface Emotion { id: string; name: string; emoji: string; }
export interface CopingAction { id: number; text: string; emoji: string; }
export interface EmotionCoping { actions: CopingAction[]; feedbacks: Record<number, string>; }

export const SITUATIONS: Situation[];                 // 10개
export const EMOTIONS: Emotion[];                      // 8개
export const COPING_ACTIONS: Record<string, EmotionCoping>; // 감정 id → 6 actions + 6 feedbacks

export interface EmotionGuideResult { situationId: number; emotion: string; actionId: number; }
```

## 데이터 흐름

```
runner: p2_m1_play(minigame) → view.showMinigame(node, done=advance→p2_m1_result)
MissionPlayer: vm.stage="minigame", gameId="emotionGuide" → <EmotionGuideStage onFinish=…/>
EmotionGuideStage: 10문항 진행 → results 누적 → onFinish(results)
planet2/index wrapper: emotionResultRef.current = results; onDone()
finishMinigame(): vm.stage="none"; done() → 엔진 advance → p2_m1_result
```

## mission01.json 변경

`p2_m1_play` 노드를 line에서 minigame으로 교체:

```json
{
  "id": "p2_m1_play",
  "type": "minigame",
  "game": "emotionGuide",
  "next": "p2_m1_result"
}
```

나머지 노드(intro/preplay/result/cards/end)는 그대로 둔다.

## 에러 처리 / 엣지

- `games[gameId]`가 없으면 MissionPlayer는 게임을 렌더하지 않음(크래시 방지). 개발 중엔 콘솔 경고.
- 게임 도중 홈 이탈(`missionExit`) 시 결과는 저장하지 않음(미완료). 기존 exit 동작 그대로.
- 결과는 세션 메모리(ref)만. 새로고침/앱 재시작 시 소실(서버 없으므로 의도된 동작).

## 테스트

- `planet2/emotionGuide.data.test.ts`(신규): `EMOTIONS` 8개, 각 감정마다 `COPING_ACTIONS`에
  `actions` 6개(id 1~6) + `feedbacks` 6개(1~6 키)가 존재, `SITUATIONS` 10개(id 1~10).
- `engine/runner.test.ts`(기존 확장): `type:"minigame"` 노드가 `showMinigame`을 호출하고,
  `done()` 호출 시 `next`로 advance 하는지.
- `planet2/missions.test.ts`(기존 확장): mission01에 `game:"emotionGuide"` minigame 노드가
  존재하고 `next: "p2_m1_result"`인지.

## 스코프에서 제외 (YAGNI)

- 교사용 대기록관 전체(통계/순위/mock 데이터).
- 이름입력 표지·완료 축하 화면(JSON 프레이밍 노드가 대체).
- 공감 에너지 정교한 연출, Tailwind/외부폰트, 초록·금색 양장본 룩 재현.
- 서버 연동(결과 POST) — ref 보관 지점에 TODO만 남김.
- planet2 톤 재스타일 — 별도 후속 단계.
