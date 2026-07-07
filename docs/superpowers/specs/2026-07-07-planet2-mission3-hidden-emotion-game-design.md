# Planet2 미션3 "숨은 감정 찾기" 미니게임 설계

- 날짜: 2026-07-07
- 브랜치: feat/planet2-mission3
- 대상 노드: `p2_m3_play` (`type:"minigame"`, `game:"hiddenEmotion"`)

## 목표

`mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html` 프로토타입(바닐라 JS/HTML/CSS)을
React 컴포넌트로 **1:1 충실 이식**하여, 현재 임시 스텁인
[`HiddenEmotionStage.tsx`](../../../src/scenes/planet/planet2/HiddenEmotionStage.tsx)를 실제 게임으로 대체한다.

게임 흐름·콘텐츠·연출은 프로토타입과 동일하게 유지한다. 코드는 mission2 `empathyRadar`와 같은
data / logic / view 3분할 패턴으로 구성한다.

## 배경 · 통합 상태 (이미 준비됨)

- 시나리오 노드: [`mission03.json`](../../../src/scenes/planet/planet2/mission03.json) `p2_m3_play`
  (`type:"minigame"`, `game:"hiddenEmotion"`, `next:"p2_m3_cards"`) — **수정하지 않음**.
- 배선: [`index.tsx`](../../../src/scenes/planet/planet2/index.tsx) `games={{ hiddenEmotion: ... }}` — **그대로 유지**.
- 엔진: `MissionPlayer`가 `type:"minigame"` 노드에서 `games[node.game]` 컴포넌트를 `{ onDone }` 계약으로 렌더.
  `onDone()` → `finishMinigame()` → 다음 노드(`p2_m3_cards`)로 진행.

즉 남은 작업은 **스텁 내부를 실제 게임으로 채우는 것**뿐이다.

## 게임 사양 (프로토타입과 동일)

친구 3명을 순서대로 진행: **아르지 → 누비 → 미라**. 각 친구마다:

1. **카드 게임판** — 상황 카드 5장. 시작 시 2장 공개, 3장은 뒷면.
2. **공감 레이더 버튼** — 누를 때마다 카드 1장씩 추가 공개(단서 획득). 우측 "발견한 단서" 수첩에 누적.
3. **마음 퍼즐 모달** — 5장 모두 공개되면 등장. 단서 2개 이상 선택 + 진짜 감정 1개 선택.
   - 단서 2개 미만 또는 감정 오답 → 하티가 힌트, 재시도.
   - 정답 → 결과 단계로.
4. **결과 패널** — 콘페티 + 친구의 진짜 표정 이미지 + 속마음 대사. 1.9초 뒤 하티가 교훈 설명.
5. **다음 친구** — 하티 교훈이 끝나면 "다른 친구 만나기 ➡" 버튼 → 다음 친구.
6. **끝맺음** — 마지막 친구(미라) 하티 교훈이 끝나면 "다른 친구 만나기" 대신 **"미션 완료 ▶"** 버튼 →
   `onDone()` 호출 → `p2_m3_cards`로 진행.

하티 가이드는 하단에서 타자기 효과(`sayHati`)로 코칭한다.

정답표:
| 친구 | 정답 감정 |
|------|-----------|
| 아르지 | 속상함 |
| 누비 | 외로움 |
| 미라 | 미안함 |

## 아키텍처 (파일 구조)

mission2 `empathyRadar`와 동일한 3분할 패턴:

### `hiddenEmotion.data.ts`
- 프로토타입 `missions` 배열을 타입 지정해 그대로 이관: 친구별
  `{ person, intro, answer, feedback, resultImage, resultFeedback, cards[5], emotions[4] }`.
- `emotionFaces` 이모지 맵.
- 에셋 경로는 `hidden-emotion/` 폴더 기준으로 갱신.

### `hiddenEmotion.logic.ts` (+ `.test.ts`)
순수 함수 상태머신. 연출(타이머·타자기·콘페티)은 포함하지 않는다.

상태(`GameState`):
```
missionIndex: 0..2
revealedCount: 2..5
puzzleReady, puzzleSolved, feedbackShown: boolean
resultHatiShown, resultSequenceStarted, resultNextReady: boolean
```

함수:
- `initialState(): GameState`
- `useRadar(s): GameState` — `revealedCount` +1 (최대 5). 5 도달 시 `puzzleReady` 준비 신호.
- `submitPuzzle(s, picks: number[], emotion: string): { kind: "need-more" | "wrong" | "solved", state }`
  - `picks.length < 2` → `need-more`
  - `emotion !== answer` → `wrong`
  - 정답 → `solved` (+ `puzzleSolved`, `feedbackShown`)
- `nextMission(s): GameState` — `missionIndex` +1, 미션 상태 리셋.
- `isLastMission(s): boolean`

### `HiddenEmotionStage.tsx`
뷰. `{ onDone }` 계약. `useState<GameState>` + `useEffect`로 타이머/타자기/콘페티 연출.
프로토타입의 DOM 조립 로직을 JSX + 상태 파생 렌더로 옮긴다.

- 카드판, 레이더 버튼, 단서 수첩
- 마음 퍼즐 모달 (`puzzle-open` blur)
- 결과 패널 + 콘페티 + 별 (`result-open` blur)
- 하티 가이드 버블 (타자기)
- 마지막 미션에서 "미션 완료 ▶" 버튼 → `onDone()`

### `HiddenEmotionStage.css`
프로토타입 `<style>` 이관. 변경점:
- **`fog-planet-bg` 배경 제거** (`#gameScreen::before` 삭제). 뒤로 MissionPlayer의 미션 배경이 비침.
- `::after` 어두운 스크림은 유지(카드·패널 가독성).
- 반응형 미디어쿼리(`max-width`) 제거 — 무대는 항상 1280×800 고정.

## 레이아웃 & 스케일

- 루트 `.he-overlay` (`position:absolute; inset:0; z-index:100`) — 어두운 스크림.
- 그 안에 **1280×800 고정 캔버스**(프로토타입 `#gameScreen`) 하나를 두고
  `transform: scale(1.5)` 로 1920×1200 `#stage`에 통째로 맞춘다(FixedStage와 동일 발상).
- 내부는 프로토타입의 px 절대배치를 그대로 재사용 → 비율·모양이 프로토타입과 완전히 동일.
- `vh/vw/dvh` 미사용(무대 좌표계 규칙 준수).

## 에셋 반입

`mytemp/안개행성_미션3_숨은감정찾기_게임/assets/` → `public/assets/planet2/hidden-emotion/`.
영문 rename(한글·공백 금지). **`fog-planet-bg.png`는 반입하지 않음**(배경 제거).

| 원본 | 이관 후 |
|------|---------|
| `card-back.png` | `card-back.png` |
| `card-1~5.png` | `arji-card-1~5.png` |
| `card2-1~5.png` | `nubi-card-1~5.png` |
| `card3-1~5.png` | `mira-card-1~5.png` |
| `empathy-radar.png` | `radar.png` |
| `hati-explain.png` | `hati.png` |
| `arji2.png` | `arji-feeling.png` |
| `nubi2.png` | `nubi-feeling.png` |
| `mira2.png` | `mira-feeling.png` |
| `fog-planet-bg.png` | (반입 안 함) |

총 18장. 데이터 파일의 카드 아트는 CSS에서 친구별 클래스로 매핑
(`mission-1/2/3` 스왑 대신 `missionIndex` 기반 클래스 또는 인라인 배경).

## 테스트

- `hiddenEmotion.logic.test.ts` (vitest):
  - 초기 상태: `revealedCount === 2`, `missionIndex === 0`.
  - `useRadar` 3회 → `revealedCount === 5`, `puzzleReady`.
  - `submitPuzzle` 단서 1개 → `need-more`. 오답 감정 → `wrong`. 정답 → `solved`.
  - `nextMission` → `missionIndex` +1, 상태 리셋.
  - `isLastMission`: index 2에서 true.
- 기존 [`missions.test.ts`](../../../src/scenes/planet/planet2/missions.test.ts)는 `hiddenEmotion` 노드를 이미 검증 — 유지.
- 수동 검증: dev 서버에서 미션3 진입 → 3명 완주 → "미션 완료" → `p2_m3_cards` 진행 확인.

## 범위 밖 (하지 않음)

- `mission03.json` 라인 노드(`intro/cards/result/result2/end`) 수정 — 게임 뒤 흐름은 그대로.
- `index.tsx` 배선 변경 — 이미 `hiddenEmotion` 매핑 존재.
- 서버 전송/결과 저장 — 이 게임은 로컬 완결(mission1 EmotionGuide와 달리 결과 POST 없음).
- 게임성 재설계(카드 직접 탭/드래그 등) — 프로토타입 상호작용 그대로.
