# Planet2 미션3 "숨은 감정 찾기" 미니게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html` 프로토타입을 React로 1:1 이식해, 임시 스텁 `HiddenEmotionStage.tsx`를 실제 "숨은 감정 찾기" 미니게임으로 대체한다.

**Architecture:** mission2 `empathyRadar`와 동일한 3분할 — `hiddenEmotion.data.ts`(콘텐츠+타입), `hiddenEmotion.logic.ts`(순수 상태머신 + vitest), `HiddenEmotionStage.tsx`(뷰: 연출·타이머). 게임은 `#stage`(1920×1200)를 덮는 오버레이 안에서 프로토타입의 1280×800 캔버스를 `transform: scale(1.5)`로 통째 확대해 렌더한다.

**Tech Stack:** React 19, TypeScript, Vite, vitest. 상태는 `useState<GameState>` + 순수 로직 함수. 스타일은 컴포넌트 로컬 CSS.

## Global Constraints

- 레이아웃은 무대(1920×1200) 좌표계 px 절대배치. **`vh`/`vw`/`dvh`/`svh` 금지** (CLAUDE.md).
- 미니게임 컴포넌트 계약: `export default function ({ onDone }: { onDone: () => void })`. 게임 종료 시 `onDone()` 1회 호출.
- 에셋은 `public/assets/planet2/hidden-emotion/`에 두고 코드에서 `/assets/planet2/hidden-emotion/<name>.png`로 참조. 한글·공백 파일명 금지.
- `mission03.json`·`index.tsx` 배선은 **수정하지 않는다**(이미 `hiddenEmotion` 노드/매핑 존재).
- 게임 콘텐츠 텍스트(상황·대사·피드백)는 프로토타입 원문을 **글자 그대로** 옮긴다.
- 친구 진행 순서: 아르지 → 누비 → 미라. 정답: 아르지=속상함, 누비=외로움, 미라=미안함.

---

## File Structure

- **Create** `public/assets/planet2/hidden-emotion/*.png` — 게임 전용 에셋 18장 (mytemp에서 이동·rename).
- **Create** `src/scenes/planet/planet2/hiddenEmotion.data.ts` — 친구 3명 콘텐츠 + 타입 + `emotionFaces`.
- **Create** `src/scenes/planet/planet2/hiddenEmotion.data.test.ts` — 데이터 무결성 테스트.
- **Create** `src/scenes/planet/planet2/hiddenEmotion.logic.ts` — 순수 상태머신.
- **Create** `src/scenes/planet/planet2/hiddenEmotion.logic.test.ts` — 로직 테스트.
- **Rewrite** `src/scenes/planet/planet2/HiddenEmotionStage.tsx` — 스텁 → 실제 뷰.
- **Rewrite** `src/scenes/planet/planet2/HiddenEmotionStage.css` — 스텁 → 프로토타입 스타일 이식(fog 배경 제거 + scale 래퍼).

참조 원본(리포 내): `mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html` — 마크업·스타일·연출의 정본. 이 계획은 그 파일을 React로 옮기는 지침이다.

---

### Task 1: 에셋 반입 (mytemp → hidden-emotion 폴더)

**Files:**
- Create: `public/assets/planet2/hidden-emotion/` (18 png)
- Source: `mytemp/안개행성_미션3_숨은감정찾기_게임/assets/`

**Interfaces:**
- Produces: 아래 경로의 에셋들. data.ts / CSS가 이 경로를 참조.
  - `card-back.png`
  - `arji-card-1.png`..`arji-card-5.png`
  - `nubi-card-1.png`..`nubi-card-5.png`
  - `mira-card-1.png`..`mira-card-5.png`
  - `radar.png`, `hati.png`
  - `arji-feeling.png`, `nubi-feeling.png`, `mira-feeling.png`

원본→대상 매핑:
| 원본 | 대상 |
|------|------|
| `card-back.png` | `card-back.png` |
| `card-1.png`..`card-5.png` | `arji-card-1.png`..`arji-card-5.png` |
| `card2-1.png`..`card2-5.png` | `nubi-card-1.png`..`nubi-card-5.png` |
| `card3-1.png`..`card3-5.png` | `mira-card-1.png`..`mira-card-5.png` |
| `empathy-radar.png` | `radar.png` |
| `hati-explain.png` | `hati.png` |
| `arji2.png` | `arji-feeling.png` |
| `nubi2.png` | `nubi-feeling.png` |
| `mira2.png` | `mira-feeling.png` |
| `fog-planet-bg.png` | (반입 안 함) |

- [ ] **Step 1: 대상 폴더 생성 + 파일 복사·rename**

Bash 도구로 실행:
```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp"
SRC="mytemp/안개행성_미션3_숨은감정찾기_게임/assets"
DST="public/assets/planet2/hidden-emotion"
mkdir -p "$DST"
cp "$SRC/card-back.png" "$DST/card-back.png"
for i in 1 2 3 4 5; do cp "$SRC/card-$i.png"  "$DST/arji-card-$i.png"; done
for i in 1 2 3 4 5; do cp "$SRC/card2-$i.png" "$DST/nubi-card-$i.png"; done
for i in 1 2 3 4 5; do cp "$SRC/card3-$i.png" "$DST/mira-card-$i.png"; done
cp "$SRC/empathy-radar.png" "$DST/radar.png"
cp "$SRC/hati-explain.png"  "$DST/hati.png"
cp "$SRC/arji2.png" "$DST/arji-feeling.png"
cp "$SRC/nubi2.png" "$DST/nubi-feeling.png"
cp "$SRC/mira2.png" "$DST/mira-feeling.png"
```

- [ ] **Step 2: 18개 파일 존재 확인**

Run: `ls public/assets/planet2/hidden-emotion/ | wc -l`
Expected: `18`

- [ ] **Step 3: Commit**

```bash
git add public/assets/planet2/hidden-emotion
git commit -m "feat(planet2): 미션3 숨은감정찾기 게임 에셋 반입"
```

---

### Task 2: 콘텐츠 데이터 (`hiddenEmotion.data.ts`)

**Files:**
- Create: `src/scenes/planet/planet2/hiddenEmotion.data.ts`
- Test: `src/scenes/planet/planet2/hiddenEmotion.data.test.ts`

**Interfaces:**
- Produces:
  - `interface Mission { person, intro, answer, feedback, resultImage, resultFeedback, cards: Card[], emotions: string[] }`
  - `interface Card { text: string; art: string }`
  - `const MISSIONS: Mission[]` (길이 3)
  - `const EMOTION_FACES: Record<string, string>`
- Consumes: 없음.

텍스트·정답·이미지 경로는 `mytemp/.../index2.html`의 `missions` 배열과 `emotionFaces`에서 그대로 옮긴다. 카드 아트는 친구별 파일(`arji-card-N` 등)로 지정한다.

- [ ] **Step 1: 데이터 테스트 작성 (실패 예정)**

Create `src/scenes/planet/planet2/hiddenEmotion.data.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { MISSIONS, EMOTION_FACES } from "./hiddenEmotion.data";

describe("hiddenEmotion 데이터", () => {
  it("친구 3명, 순서는 아르지·누비·미라", () => {
    expect(MISSIONS.map((m) => m.person)).toEqual(["아르지", "누비", "미라"]);
  });

  it("각 친구는 카드 5장·감정 선택지 4개를 가진다", () => {
    for (const m of MISSIONS) {
      expect(m.cards).toHaveLength(5);
      expect(m.emotions).toHaveLength(4);
    }
  });

  it("정답 감정은 각 친구의 선택지 안에 있다", () => {
    for (const m of MISSIONS) {
      expect(m.emotions).toContain(m.answer);
    }
  });

  it("정답표: 아르지=속상함, 누비=외로움, 미라=미안함", () => {
    expect(MISSIONS.map((m) => m.answer)).toEqual(["속상함", "외로움", "미안함"]);
  });

  it("모든 감정 선택지는 이모지 얼굴을 가진다", () => {
    for (const m of MISSIONS) {
      for (const e of m.emotions) expect(EMOTION_FACES[e]).toBeTruthy();
    }
  });

  it("카드 아트는 hidden-emotion 폴더 경로", () => {
    for (const m of MISSIONS) {
      for (const c of m.cards) {
        expect(c.art).toMatch(/^\/assets\/planet2\/hidden-emotion\/.+\.png$/);
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/hiddenEmotion.data.test.ts`
Expected: FAIL (`Cannot find module './hiddenEmotion.data'`)

- [ ] **Step 3: 데이터 파일 작성**

Create `src/scenes/planet/planet2/hiddenEmotion.data.ts`. 카드 텍스트·intro·feedback·resultFeedback은 `index2.html`의 `missions`에서 글자 그대로 옮긴다(아래는 구조와 아르지 예시; 누비·미라도 동일 구조로 원문 이관):
```typescript
// 미션3 "숨은 감정 찾기" 콘텐츠. 원본: mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html.
const ASSET = "/assets/planet2/hidden-emotion";

export interface Card {
  text: string;
  art: string;
}

export interface Mission {
  person: string;
  intro: string;
  answer: string;
  feedback: string; // 정답 후 하티의 교훈
  resultImage: string;
  resultFeedback: string; // 친구의 속마음 대사
  cards: Card[]; // 5장
  emotions: string[]; // 선택지 4개(정답 포함)
}

export const EMOTION_FACES: Record<string, string> = {
  "기쁨": "😄", "속상함": "😢", "아무렇지 않음": "😐", "신남": "🤩",
  "외로움": "☹️", "화남": "😡", "편안함": "🙂", "미안함": "🥺",
  "자랑스러움": "😌", "심심함": "😶",
};

export const MISSIONS: Mission[] = [
  {
    person: "아르지",
    intro: "공감 레이더를 사용하여 아르지의 숨겨진 감정을 찾아봐!",
    answer: "속상함",
    feedback:
      "겉으로는 웃는 얼굴만 보면 아르지가 기쁘다고 생각하기 쉬워. 하지만 행동과 상황을 함께 보면, 사실은 속상한 마음을 숨기고 있다는 걸 알 수 있어.",
    resultImage: `${ASSET}/arji-feeling.png`,
    resultFeedback:
      "기대했던 것보다 시험 결과가 좋지 못해서 속상했어. 하지만 친구들에게 나의 마음을 이야기하기가 싫었어. 내 마음을 알아줘서 고마워!",
    cards: [
      { text: "아르지는 기대하는 눈빛으로 시험 결과를 확인하고 있어요.", art: `${ASSET}/arji-card-1.png` },
      { text: "친구에게 시험을 잘 봤다고 얘기하고 있어요.", art: `${ASSET}/arji-card-2.png` },
      { text: "시험지를 금방 접었어요.", art: `${ASSET}/arji-card-3.png` },
      { text: "시험지를 가방 맨 밑에 넣었어요.", art: `${ASSET}/arji-card-4.png` },
      { text: "쉬는 시간 내내 창밖만 바라봤어요.", art: `${ASSET}/arji-card-5.png` },
    ],
    emotions: ["기쁨", "속상함", "아무렇지 않음", "신남"],
  },
  // 누비: card2-* → nubi-card-*, resultImage nubi-feeling.png, answer "외로움"
  // 미라: card3-* → mira-card-*, resultImage mira-feeling.png, answer "미안함"
  // ↑ index2.html의 missions[1], missions[2] 원문을 위와 동일한 구조로 이관.
];
```
누비·미라 항목은 `index2.html` `missions[1]`, `missions[2]`의 `intro/answer/feedback/resultFeedback/cards.text/emotions`를 그대로 옮기고, `resultImage`와 각 카드 `art`만 위 표의 새 파일명으로 바꾼다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/hiddenEmotion.data.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet2/hiddenEmotion.data.ts src/scenes/planet/planet2/hiddenEmotion.data.test.ts
git commit -m "feat(planet2): 미션3 숨은감정찾기 콘텐츠 데이터"
```

---

### Task 3: 상태 로직 (`hiddenEmotion.logic.ts`)

**Files:**
- Create: `src/scenes/planet/planet2/hiddenEmotion.logic.ts`
- Test: `src/scenes/planet/planet2/hiddenEmotion.logic.test.ts`

**Interfaces:**
- Consumes: `MISSIONS` from `./hiddenEmotion.data`.
- Produces:
  - `interface GameState { missionIndex: number; revealedCount: number; puzzleSolved: boolean; feedbackShown: boolean; }`
  - `initialState(): GameState`
  - `useRadar(s: GameState): GameState` — `revealedCount` +1 (상한 5).
  - `allRevealed(s: GameState): boolean` — `revealedCount >= 5`.
  - `type SubmitResult = { kind: "need-more" } | { kind: "wrong" } | { kind: "solved"; state: GameState }`
  - `submitPuzzle(s, picks: number[], emotion: string, missions?: Mission[]): SubmitResult`
  - `nextMission(s: GameState): GameState`
  - `isLastMission(s: GameState, missions?: Mission[]): boolean`

연출(타이머·타자기·콘페티·결과 시퀀스)은 로직에 넣지 않는다 — 뷰(Task 4)가 담당.

- [ ] **Step 1: 로직 테스트 작성 (실패 예정)**

Create `src/scenes/planet/planet2/hiddenEmotion.logic.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  initialState, useRadar, allRevealed, submitPuzzle, nextMission, isLastMission,
} from "./hiddenEmotion.logic";

describe("hiddenEmotion 로직", () => {
  it("초기 상태: 미션0, 카드 2장 공개, 미해결", () => {
    const s = initialState();
    expect(s.missionIndex).toBe(0);
    expect(s.revealedCount).toBe(2);
    expect(s.puzzleSolved).toBe(false);
    expect(s.feedbackShown).toBe(false);
  });

  it("useRadar 3회로 5장까지 공개되고 그 이상은 안 올라감", () => {
    let s = initialState();
    s = useRadar(s); s = useRadar(s); s = useRadar(s);
    expect(s.revealedCount).toBe(5);
    expect(allRevealed(s)).toBe(true);
    s = useRadar(s);
    expect(s.revealedCount).toBe(5);
  });

  it("퍼즐: 단서 2개 미만이면 need-more", () => {
    const s = initialState();
    expect(submitPuzzle(s, [0], "속상함").kind).toBe("need-more");
  });

  it("퍼즐: 감정 오답이면 wrong", () => {
    const s = initialState();
    expect(submitPuzzle(s, [0, 2], "기쁨").kind).toBe("wrong");
  });

  it("퍼즐: 단서 2개+정답이면 solved (puzzleSolved·feedbackShown true)", () => {
    const s = initialState();
    const r = submitPuzzle(s, [0, 4], "속상함"); // 미션0 정답=속상함
    expect(r.kind).toBe("solved");
    if (r.kind !== "solved") return;
    expect(r.state.puzzleSolved).toBe(true);
    expect(r.state.feedbackShown).toBe(true);
  });

  it("nextMission: 인덱스 +1, 미션 상태 리셋", () => {
    let s = initialState();
    s = { ...s, revealedCount: 5, puzzleSolved: true, feedbackShown: true };
    s = nextMission(s);
    expect(s.missionIndex).toBe(1);
    expect(s.revealedCount).toBe(2);
    expect(s.puzzleSolved).toBe(false);
    expect(s.feedbackShown).toBe(false);
  });

  it("isLastMission: 미션2에서 true", () => {
    let s = initialState();
    expect(isLastMission(s)).toBe(false);
    s = nextMission(nextMission(s));
    expect(s.missionIndex).toBe(2);
    expect(isLastMission(s)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/hiddenEmotion.logic.test.ts`
Expected: FAIL (`Cannot find module './hiddenEmotion.logic'`)

- [ ] **Step 3: 로직 구현**

Create `src/scenes/planet/planet2/hiddenEmotion.logic.ts`:
```typescript
import { MISSIONS, type Mission } from "./hiddenEmotion.data";

export interface GameState {
  missionIndex: number; // 0..2
  revealedCount: number; // 2..5
  puzzleSolved: boolean;
  feedbackShown: boolean;
}

const START_REVEALED = 2;
const TOTAL_CARDS = 5;

export function initialState(): GameState {
  return { missionIndex: 0, revealedCount: START_REVEALED, puzzleSolved: false, feedbackShown: false };
}

export function useRadar(s: GameState): GameState {
  if (s.revealedCount >= TOTAL_CARDS) return s;
  return { ...s, revealedCount: s.revealedCount + 1 };
}

export function allRevealed(s: GameState): boolean {
  return s.revealedCount >= TOTAL_CARDS;
}

export type SubmitResult =
  | { kind: "need-more" }
  | { kind: "wrong" }
  | { kind: "solved"; state: GameState };

export function submitPuzzle(
  s: GameState,
  picks: number[],
  emotion: string,
  missions: Mission[] = MISSIONS,
): SubmitResult {
  if (picks.length < 2) return { kind: "need-more" };
  if (emotion !== missions[s.missionIndex].answer) return { kind: "wrong" };
  return { kind: "solved", state: { ...s, puzzleSolved: true, feedbackShown: true } };
}

export function nextMission(s: GameState): GameState {
  return {
    missionIndex: s.missionIndex + 1,
    revealedCount: START_REVEALED,
    puzzleSolved: false,
    feedbackShown: false,
  };
}

export function isLastMission(s: GameState, missions: Mission[] = MISSIONS): boolean {
  return s.missionIndex >= missions.length - 1;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/hiddenEmotion.logic.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet2/hiddenEmotion.logic.ts src/scenes/planet/planet2/hiddenEmotion.logic.test.ts
git commit -m "feat(planet2): 미션3 숨은감정찾기 상태 로직 + 테스트"
```

---

### Task 4: 스타일 이식 (`HiddenEmotionStage.css`)

**Files:**
- Rewrite: `src/scenes/planet/planet2/HiddenEmotionStage.css`
- Reference: `mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html` `<style>` 블록

**Interfaces:**
- Produces: 아래 클래스들을 Task 5 뷰가 사용 — `he-overlay`, `he-scale`, `he-screen`(+`puzzle-open`/`result-open`), `main-grid`, `board`, `scene-title`, `progress`, `cards`, `card`(+`revealed`), `card-inner`, `card-face`, `card-back`, `card-front`, `radar-box`, `radar-image-wrap`(+`scanning`), `radar-image`, `radar-button`, `side-panel`, `panel-title`, `clue-list`, `clue-item`, `clue-no`, `empty`, `game-guide`(+`is-hidden`), `game-guide-bubble`, `puzzle-modal`, `puzzle-card`, `puzzle-question`, `puzzle-options`, `puzzle-check`, `puzzle-emotion`, `puzzle-submit`, `result-panel`, `result-card`, `celebration`, `celebration-star`, `result-summary`, `arji-feedback`, `friend-next`.

이식 규칙(프로토타입 `<style>`을 그대로 옮기되 아래만 변경):
1. `:root` 변수, `button`, 모든 `.` 클래스 규칙을 그대로 복사. (`body`/`.app`/`#app` 규칙은 옮기지 않는다 — 무대 밖 전역이라 불필요.)
2. `#gameScreen` 셀렉터를 **`.he-screen`**으로 치환(전역 id 대신 로컬 클래스). 관련 규칙 전부 rename: `#gameScreen.puzzle-open` → `.he-screen.puzzle-open` 등.
3. **fog 배경 제거:** `.he-screen::before` 규칙(= 원본 `#gameScreen::before`, `fog-planet-bg.png`) 삭제. `::after`(어두운 스크림)는 유지.
4. **카드 아트 CSS 매핑 삭제:** 원본의 `.card-art-1..5` 및 `#gameScreen.mission-2/3 .card-art-*` 규칙 전부 삭제. 카드 앞면은 뷰에서 인라인 `background-image`로 지정한다. `.card-front`는 `background-size: cover; background-position: center;`만 남긴다.
5. 라디얼 그라디언트 이미지 경로가 있으면 `assets/...` → `/assets/planet2/hidden-emotion/...`로. (radar/hati/card-back 등은 뷰의 `<img>`·인라인 스타일로 다루므로 CSS엔 카드-백 정도만 남음 → `.card-back { background: url("/assets/planet2/hidden-emotion/card-back.png") center / cover no-repeat; }`)
6. `@media (max-width: ...)` 반응형 블록 2개 삭제(무대는 1280×800 고정).
7. 새 래퍼 규칙 추가(오버레이 + 1.5배 스케일):
```css
/* #stage(1920×1200) 위 오버레이. 프로토타입 1280×800 캔버스를 통째 1.5배 확대. */
.he-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  font-family: inherit;
}
.he-scale {
  width: 1280px;
  height: 800px;
  transform: scale(1.5);
  transform-origin: center center;
  flex: none;
}
.he-screen {
  position: relative;
  width: 1280px;
  height: 800px;
  min-height: 800px;
  padding: 14px;
  overflow: hidden;
  isolation: isolate;
  box-sizing: border-box;
}
```
(원본 `#gameScreen`의 `width: min(1280px,100vw)`·`height:800px`는 위 `.he-screen`으로 대체 — `vw` 제거.)

- [ ] **Step 1: CSS 재작성**

`index2.html`의 `<style>` 내용을 위 규칙 1~7에 따라 `HiddenEmotionStage.css`로 옮긴다. 파일 상단 주석:
```css
/* 미션3 "숨은 감정 찾기" 미니게임. #stage(1920×1200) 오버레이 안에서
   1280×800 캔버스를 transform:scale(1.5)로 통째 확대. 원본: mytemp/.../index2.html.
   변경점: fog 배경(::before) 제거, 카드 아트는 뷰 인라인 배경, 반응형 제거. px 절대배치(vh/vw 금지). */
```

- [ ] **Step 2: 빌드로 CSS 문법 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (CSS는 타입체크 대상 아님 — Task 5에서 실제 렌더 검증. 여기선 기존 코드가 안 깨졌는지만 확인.)

- [ ] **Step 3: Commit**

```bash
git add src/scenes/planet/planet2/HiddenEmotionStage.css
git commit -m "feat(planet2): 미션3 숨은감정찾기 스타일 이식(fog 제거·scale 래퍼)"
```

---

### Task 5: 뷰 컴포넌트 (`HiddenEmotionStage.tsx`)

**Files:**
- Rewrite: `src/scenes/planet/planet2/HiddenEmotionStage.tsx`
- Reference: `mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html` `<script>` 블록

**Interfaces:**
- Consumes: `MISSIONS`, `EMOTION_FACES` from `./hiddenEmotion.data`; `initialState`, `useRadar`, `allRevealed`, `submitPuzzle`, `nextMission`, `isLastMission`, `type GameState` from `./hiddenEmotion.logic`; `"./HiddenEmotionStage.css"`.
- Produces: `export default function HiddenEmotionStage({ onDone }: { onDone: () => void })`.

프로토타입 `<script>`의 명령형 DOM 조립을 React 선언형으로 옮긴다. 상태는 `useState<GameState>(initialState)` + 로직 함수. 연출(타자기·레이더 스캔·콘페티·결과 시퀀스 지연)은 이 컴포넌트의 로컬 state/ref/`useEffect`로 구현한다.

구조(프로토타입 대응):
- 루트: `<div className="he-overlay" onClick={(e) => e.stopPropagation()}>` → `<div className="he-scale">` → `<div className="he-screen" (+puzzle-open/result-open 클래스)>` → `<div className="main-grid">`(board + side-panel).
- **board:** scene-title(제목 고정 "친구의 숨은 감정 찾기" + `mission.intro` + `revealedCount / 5 공개`), `cards`(5장: `index < revealedCount`면 `revealed`, 앞면은 `style={{ backgroundImage: url(card.art) }}`), radar-box(`radar-image` + `radar-button`).
- **side-panel:** 공개된 카드만 `clue-item`으로. 없으면 `empty`.
- **game-guide:** 하단 하티. `hatiText` 로컬 state를 타자기 효과로 렌더. `is-hidden` 토글.
- **puzzle-modal:** `allRevealed && puzzleReady && !state.feedbackShown`일 때. 단서 체크박스(각 카드) + 감정 라디오(`EMOTION_FACES[e]` + 이름) + "결과 확인" 버튼.
- **result-panel:** `state.feedbackShown`일 때. celebration(span 14개 + 별 2개, 원본 인라인 스타일 그대로), result-summary, arji-feedback(`mission.resultImage` + `mission.resultFeedback`).
- **완료/다음 버튼:** 결과 하티 피드백이 끝나면(`resultNextReady`) — `isLastMission`이면 **`friend-next` 스타일의 "미션 완료 ▶"** 버튼 → `onDone()`; 아니면 "다른 친구 만나기 ➡" → `nextMission`.

상태 전이 매핑(프로토타입 함수 → React):
- `useRadar()`(원본): `setState(useRadar(state))`. 5 도달 시 `setTimeout(1700ms)` 후 `setPuzzleReady(true)`. 5 미만이면 하티 "좋아, 단서를 하나 더 찾았어...". 스캔 애니메이션은 `radarWrap`에 `scanning` 클래스 토글.
- 퍼즐 제출: `submitPuzzle(state, picks, emotion)` → `need-more`/`wrong`이면 하티 힌트, `solved`면 `setState(r.state)`(feedbackShown=true).
- 결과 진입(`feedbackShown` true): `setTimeout(1900ms)` 후 하티가 `mission.feedback` 타자기 → 끝나면 `setResultNextReady(true)`.
- `nextMission`: `setState(nextMission(state))` + puzzleReady/resultNextReady 리셋 + 하티 인트로 대사.
- **모든 `setTimeout`/`setInterval`은 ref에 보관하고 `useEffect` cleanup + 미션 전환 시 clear** (언마운트/전환 시 누수 방지).

타자기 헬퍼(원본 `sayHati` 대응) 예시:
```tsx
const typingRef = useRef<number | null>(null);
const [hatiText, setHatiText] = useState("");
const [hatiHidden, setHatiHidden] = useState(false);

function sayHati(text: string, onEnd?: () => void) {
  if (typingRef.current) window.clearInterval(typingRef.current);
  setHatiHidden(false);
  setHatiText("");
  let i = 0;
  typingRef.current = window.setInterval(() => {
    i += 1;
    setHatiText(text.slice(0, i));
    if (i >= text.length) {
      if (typingRef.current) window.clearInterval(typingRef.current);
      typingRef.current = null;
      if (onEnd) window.setTimeout(onEnd, 350);
    }
  }, 28);
}

useEffect(() => () => { if (typingRef.current) window.clearInterval(typingRef.current); }, []);
```

- [ ] **Step 1: 컴포넌트 재작성**

`HiddenEmotionStage.tsx`를 위 구조로 작성한다. 마크업·연출 파라미터(지연 1700/1900/350ms, 28ms 타자, celebration span 인라인 스타일)는 `index2.html` `<script>`를 정본으로 그대로 옮긴다. 퍼즐/결과의 콘페티 마크업은 원본 `renderSuccessFeedback`의 span 14개 인라인 스타일을 그대로 복사한다.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 전체 테스트 실행(회귀 확인)**

Run: `npx vitest run src/scenes/planet/planet2/`
Expected: PASS (data·logic·missions·theme 등 기존 포함 전부 통과).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/planet/planet2/HiddenEmotionStage.tsx
git commit -m "feat(planet2): 미션3 숨은감정찾기 미니게임 뷰 이식(스텁 대체)"
```

---

### Task 6: 수동 검증 (dev 서버)

**Files:** 없음(검증만).

- [ ] **Step 1: dev 서버 실행 + 미션3 진입**

Run: `npm run dev` → 브라우저에서 planet2 → mission3 진입(또는 라우팅 진입점). `p2_m3_intro` 라인 넘긴 뒤 게임 팝업 확인.

- [ ] **Step 2: 플레이 플로우 확인 (체크리스트)**

- [ ] 게임이 화면을 꽉 채우고 프로토타입과 동일 비율(뒤에 미션 배경 비침, fog 이미지 없음).
- [ ] 카드 5장 중 2장 공개 상태로 시작, 레이더 버튼으로 1장씩 공개, 우측 단서 누적.
- [ ] 5장 공개 → 잠시 후 마음 퍼즐 모달. 단서 1개만 고르면 하티 힌트, 오답 감정이면 하티 힌트.
- [ ] 정답(단서 2개+정답 감정) → 콘페티 결과 패널 + 친구 표정/속마음, 이어서 하티 교훈.
- [ ] 아르지→누비→미라 순으로 "다른 친구 만나기"로 진행.
- [ ] 미라 완료 후 "미션 완료 ▶" 버튼 → 클릭 시 게임 닫히고 `p2_m3_cards`(하티 공감카드 라인)로 진행.

- [ ] **Step 3: (문제 발견 시) 수정 후 관련 커밋. 없으면 완료.**

---

## Self-Review

**Spec coverage:**
- ① 파일 구조 3분할 → Task 2·3·5. ✓
- ② 상태 로직 필드/함수 → Task 3 (spec의 결과-시퀀스 플래그는 "연출은 뷰" 원칙에 따라 GameState에서 제외하고 뷰 로컬 state로 이동 — spec 아키텍처 노트와 일치). ✓
- ③ 레이아웃 & 스케일(overlay + scale 1.5, fog 제거) → Task 4. ✓
- ④ 끝맺음("미션 완료" 버튼 → onDone) + 통합(노드/배선 불변) → Task 5, Global Constraints. ✓
- ⑤ 에셋 반입(18장, hidden-emotion 폴더, fog 제외) → Task 1. ✓
- ⑥ 테스트(logic.test + 기존 missions.test 유지) → Task 3, Task 5 Step 3. ✓

**Placeholder scan:** data.ts의 누비·미라 항목은 "원문 이관"으로 지시(원본이 리포 내 `index2.html`에 존재하므로 DRY — 400줄 재타이핑 대신 정본 참조). view/CSS도 정본 파일 참조 + 변경점 명시. 그 외 TBD/TODO 없음.

**Type consistency:** `GameState`, `SubmitResult`, 함수 시그니처가 Task 3 정의와 Task 5 소비에서 일치. `Card`/`Mission` 타입이 Task 2와 Task 5에서 일치. `he-*` CSS 클래스가 Task 4 produces와 Task 5 구조에서 일치.
