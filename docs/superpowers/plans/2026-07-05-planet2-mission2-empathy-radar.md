# 공감 레이더 미니게임(행성2 미션2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감정 단어를 성격에 맞는 감정으로 분류해 레이더 부품 9개를 모으는 미션2 팝업 미니게임을 완성한다.

**Architecture:** 순수 게임 로직(`empathyRadar.logic.ts`)과 콘텐츠 데이터(`empathyRadar.data.ts`)를 분리하고(미션1 `emotionGuide.*` 관례), UI는 `EmpathyRadarStage.tsx`가 담당한다. 팝업은 좌측 "조립기" 인벤토리(배경 이미지 + 획득 부품 오버레이) + 우측 플레이 영역(감정 상자 3개 + 드래그/탭 단어 버블)으로 구성한다. 배선(노드 `p2_m2_play` → `games.empathyRadar` → 컴포넌트)은 이미 완료돼 손대지 않는다.

**Tech Stack:** React 19 + TypeScript, Vitest(로직/데이터 단위 테스트), Pointer Events(드래그), 정적 PNG 에셋.

## Global Constraints

- 미션 엔진 팝업이므로 **`#stage` 1920×1200 좌표계**를 따른다. FixedStage로 감싸지 않는다. (CLAUDE.md)
- **`vh`/`vw`/`100dvh`/`100svh` 금지.** px 절대배치. 오버레이 루트는 `position:absolute; inset:0`.
- **불필요 요소 제외**(사용자 확정): 이름 입력, 점수, 임명장, 긍정/부정 라벨, 화려한 부품 비행 연출.
- 완료 조건 충족 시 **`onDone()`** 호출 → 다음 노드 `p2_m2_complete` 진행.
- 에셋은 `mytemp/`에서 **영문 리네임 후** `public/assets/planet2/`로 옮겨 사용(CLAUDE.md mytemp 원칙).
- 테스트 실행: `npm test` (= `vitest run`). 단일 파일: `npx vitest run <path>`.

---

## File Structure

- **Create** `public/assets/planet2/radar-assembler.png` — 좌측 인벤토리 배경(조립기, 빈 슬롯 3×3). `mytemp/공감 레이더 부품 조립기(0단계).png`에서 이동.
- **Create** `public/assets/planet2/radar-part-1.png` … `radar-part-9.png` — 부품 이미지 9개. `mytemp/1..9.*.png`에서 이동.
- **Create** `src/scenes/planet/planet2/empathyRadar.data.ts` — 3스테이지 × 3감정 × 2단어 데이터 + 타입 + 순수 헬퍼(`stageWords`, `findEmotion`).
- **Create** `src/scenes/planet/planet2/empathyRadar.data.test.ts` — 데이터 무결성 테스트.
- **Create** `src/scenes/planet/planet2/empathyRadar.logic.ts` — `GameState` + `initialState`/`currentWord`/`classify` 순수 로직.
- **Create** `src/scenes/planet/planet2/empathyRadar.logic.test.ts` — 로직 단위 테스트.
- **Modify (rewrite)** `src/scenes/planet/planet2/EmpathyRadarStage.tsx` — 스텁 → 실제 게임 UI.
- **Modify (rewrite)** `src/scenes/planet/planet2/EmpathyRadarStage.css` — 셸 → 인벤토리+플레이 레이아웃.
- **No change** `src/scenes/planet/planet2/index.tsx`, `mission02.json` — 배선 이미 완료.

---

## Task 1: 에셋 반입 (리네임·이동)

**Files:**
- Create: `public/assets/planet2/radar-assembler.png`, `public/assets/planet2/radar-part-1.png` … `radar-part-9.png`
- Source: `mytemp/공감 레이더 부품 조립기(0단계).png`, `mytemp/1. 외곽 골드 프레임.png` … `mytemp/9. 빨간 보석 버튼.png`

**Interfaces:**
- Produces: 에셋 경로 `/assets/planet2/radar-assembler.png`, `/assets/planet2/radar-part-{1..9}.png` (컴포넌트가 참조).

- [ ] **Step 1: 조립기 배경 복사**

Bash:
```bash
cp "mytemp/공감 레이더 부품 조립기(0단계).png" public/assets/planet2/radar-assembler.png
```

- [ ] **Step 2: 부품 9개 복사(번호 → radar-part-N.png)**

Bash (파일명이 `1.`~`3.`,`5.`~`9.`는 "N. 이름.png", `4.`는 "4.레이더..." 로 공백 없음 — glob으로 안전 처리):
```bash
for n in 1 2 3 4 5 6 7 8 9; do
  src=$(ls mytemp/${n}.*\ *.png mytemp/${n}.*.png 2>/dev/null | head -n1)
  cp "$src" "public/assets/planet2/radar-part-${n}.png"
done
```

- [ ] **Step 3: 10개 파일 존재 확인**

Bash:
```bash
ls -1 public/assets/planet2/radar-assembler.png public/assets/planet2/radar-part-{1..9}.png
```
Expected: 10줄, 누락/에러 없음.

- [ ] **Step 4: Commit**

```bash
git add public/assets/planet2/radar-assembler.png public/assets/planet2/radar-part-*.png
git commit -m "assets(planet2): 공감 레이더 조립기·부품 이미지 반입"
```

---

## Task 2: 게임 데이터 (`empathyRadar.data.ts`)

**Files:**
- Create: `src/scenes/planet/planet2/empathyRadar.data.ts`
- Test: `src/scenes/planet/planet2/empathyRadar.data.test.ts`

**Interfaces:**
- Produces:
  - `interface Word { id: string; text: string; emoji: string; emotionId: string }`
  - `interface Emotion { id: string; name: string; emoji: string; color: string; partId: number; words: Word[] }`
  - `interface Stage { id: number; title: string; emotions: Emotion[] }`
  - `const STAGES: Stage[]` (길이 3)
  - `function stageWords(stage: Stage): Word[]` — 스테이지의 6단어 평탄화(감정 순서대로)
  - `function findEmotion(emotionId: string, stages?: Stage[]): Emotion` — 감정 조회(없으면 throw)

- [ ] **Step 1: 실패 테스트 작성**

`src/scenes/planet/planet2/empathyRadar.data.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { STAGES, stageWords, findEmotion } from "./empathyRadar.data";

describe("empathyRadar 데이터", () => {
  it("3스테이지, 각 3감정, 각 감정 2단어", () => {
    expect(STAGES).toHaveLength(3);
    for (const stage of STAGES) {
      expect(stage.emotions).toHaveLength(3);
      for (const e of stage.emotions) {
        expect(e.words).toHaveLength(2);
        // 각 단어의 emotionId는 소속 감정과 일치해야 한다
        for (const w of e.words) expect(w.emotionId).toBe(e.id);
      }
    }
  });

  it("총 18단어, 단어 id는 유일", () => {
    const words = STAGES.flatMap(stageWords);
    expect(words).toHaveLength(18);
    expect(new Set(words.map((w) => w.id)).size).toBe(18);
  });

  it("partId는 1..9 유일", () => {
    const parts = STAGES.flatMap((s) => s.emotions.map((e) => e.partId)).sort((a, b) => a - b);
    expect(parts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("stageWords는 감정 순서대로 6단어를 준다", () => {
    expect(stageWords(STAGES[0]).map((w) => w.emotionId)).toEqual([
      "joy", "joy", "sad", "sad", "anger", "anger",
    ]);
  });

  it("findEmotion은 감정을 찾고, 없으면 throw", () => {
    expect(findEmotion("joy").partId).toBe(1);
    expect(() => findEmotion("nope")).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/empathyRadar.data.test.ts`
Expected: FAIL — `Cannot find module './empathyRadar.data'`.

- [ ] **Step 3: 데이터 파일 작성**

`src/scenes/planet/planet2/empathyRadar.data.ts`:
```ts
// 공감 레이더 미니게임 콘텐츠. 3스테이지 × 3감정 × 2단어 = 18단어, 부품 9개.
// partId(1..9)는 좌측 조립기 3×3 슬롯 번호와 1:1 대응(1행=S1, 2행=S2, 3행=S3).

export interface Word {
  id: string;
  text: string;
  emoji: string;
  emotionId: string;
}

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string; // 감정 상자 강조색
  partId: number; // 조립기 슬롯 번호 1..9
  words: Word[];
}

export interface Stage {
  id: number;
  title: string;
  emotions: Emotion[];
}

export const STAGES: Stage[] = [
  {
    id: 1,
    title: "기초 감정",
    emotions: [
      {
        id: "joy", name: "기쁨", emoji: "🟡", color: "#f4c430", partId: 1,
        words: [
          { id: "joy-1", text: "신나다", emoji: "🎵", emotionId: "joy" },
          { id: "joy-2", text: "행복하다", emoji: "✨", emotionId: "joy" },
        ],
      },
      {
        id: "sad", name: "슬픔", emoji: "🔵", color: "#4aa3e0", partId: 2,
        words: [
          { id: "sad-1", text: "울적하다", emoji: "🌧️", emotionId: "sad" },
          { id: "sad-2", text: "우울하다", emoji: "🌫️", emotionId: "sad" },
        ],
      },
      {
        id: "anger", name: "분노", emoji: "🔴", color: "#e05a4a", partId: 3,
        words: [
          { id: "anger-1", text: "화나다", emoji: "🔥", emotionId: "anger" },
          { id: "anger-2", text: "짜증나다", emoji: "⚡", emotionId: "anger" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "사회적 감정",
    emotions: [
      {
        id: "fear", name: "두려움", emoji: "🟣", color: "#9b6fd4", partId: 4,
        words: [
          { id: "fear-1", text: "무섭다", emoji: "👻", emotionId: "fear" },
          { id: "fear-2", text: "불안하다", emoji: "😰", emotionId: "fear" },
        ],
      },
      {
        id: "gratitude", name: "감사", emoji: "🟢", color: "#4bbf87", partId: 5,
        words: [
          { id: "gratitude-1", text: "고맙다", emoji: "🎁", emotionId: "gratitude" },
          { id: "gratitude-2", text: "감사하다", emoji: "🙏", emotionId: "gratitude" },
        ],
      },
      {
        id: "shame", name: "창피함", emoji: "💗", color: "#e97fb0", partId: 6,
        words: [
          { id: "shame-1", text: "민망하다", emoji: "😅", emotionId: "shame" },
          { id: "shame-2", text: "부끄럽다", emoji: "😳", emotionId: "shame" },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "복합 감정",
    emotions: [
      {
        id: "calm", name: "평온", emoji: "🟢", color: "#3fc9b0", partId: 7,
        words: [
          { id: "calm-1", text: "차분하다", emoji: "🧘", emotionId: "calm" },
          { id: "calm-2", text: "느긋하다", emoji: "🛋️", emotionId: "calm" },
        ],
      },
      {
        id: "envy", name: "샘나기", emoji: "🟠", color: "#f0913f", partId: 8,
        words: [
          { id: "envy-1", text: "부럽다", emoji: "🙄", emotionId: "envy" },
          { id: "envy-2", text: "시샘하다", emoji: "😈", emotionId: "envy" },
        ],
      },
      {
        id: "flutter", name: "설레임", emoji: "🔵", color: "#6f7fe0", partId: 9,
        words: [
          { id: "flutter-1", text: "기다려지다", emoji: "⏱️", emotionId: "flutter" },
          { id: "flutter-2", text: "두근거리다", emoji: "💓", emotionId: "flutter" },
        ],
      },
    ],
  },
];

// 스테이지의 6단어를 감정 순서대로 평탄화.
export function stageWords(stage: Stage): Word[] {
  return stage.emotions.flatMap((e) => e.words);
}

// 감정 id로 Emotion 조회. 데이터 무결성상 항상 존재해야 하므로 없으면 throw.
export function findEmotion(emotionId: string, stages: Stage[] = STAGES): Emotion {
  for (const stage of stages) {
    for (const e of stage.emotions) {
      if (e.id === emotionId) return e;
    }
  }
  throw new Error(`unknown emotionId: ${emotionId}`);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/empathyRadar.data.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet2/empathyRadar.data.ts src/scenes/planet/planet2/empathyRadar.data.test.ts
git commit -m "feat(planet2): 공감 레이더 게임 데이터(3단계 18단어) + 테스트"
```

---

## Task 3: 게임 로직 (`empathyRadar.logic.ts`)

**Files:**
- Create: `src/scenes/planet/planet2/empathyRadar.logic.ts`
- Test: `src/scenes/planet/planet2/empathyRadar.logic.test.ts`

**Interfaces:**
- Consumes: `STAGES`, `Word`, `Stage`, `stageWords`, `findEmotion` (Task 2).
- Produces:
  - `interface GameState { stageIndex: number; words: Word[]; wordIndex: number; correctCounts: Record<string, number>; earnedParts: number[] }`
  - `type Shuffle = <T>(arr: T[]) => T[]`
  - `function initialState(stages?: Stage[], shuffle?: Shuffle): GameState`
  - `function currentWord(state: GameState): Word | null`
  - `type ClassifyResult = { kind: "wrong" } | { kind: "correct"; state: GameState; earnedPartId: number | null; stageCleared: boolean; gameDone: boolean }`
  - `function classify(state: GameState, emotionId: string, stages?: Stage[], shuffle?: Shuffle): ClassifyResult`

- [ ] **Step 1: 실패 테스트 작성**

`src/scenes/planet/planet2/empathyRadar.logic.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { STAGES } from "./empathyRadar.data";
import { initialState, currentWord, classify } from "./empathyRadar.logic";

// 테스트는 shuffle=identity(기본값)로 결정적으로 진행.
// stage0 단어 순서: joy, joy, sad, sad, anger, anger.

describe("empathyRadar 로직", () => {
  it("초기 상태: stage0, 6단어, 진행 0, 부품 없음", () => {
    const s = initialState();
    expect(s.stageIndex).toBe(0);
    expect(s.words).toHaveLength(6);
    expect(s.wordIndex).toBe(0);
    expect(s.earnedParts).toEqual([]);
    expect(currentWord(s)?.emotionId).toBe("joy");
  });

  it("오답: 상태 변화 없이 wrong", () => {
    const s = initialState();
    const r = classify(s, "sad"); // 현재 단어는 joy
    expect(r.kind).toBe("wrong");
  });

  it("정답 1개로는 부품이 안 생기고, 2개째에 부품 획득", () => {
    let s = initialState();
    let r = classify(s, "joy"); // joy 1개째
    expect(r.kind).toBe("correct");
    if (r.kind !== "correct") return;
    expect(r.earnedPartId).toBeNull();
    expect(r.state.wordIndex).toBe(1);
    r = classify(r.state, "joy"); // joy 2개째 → 부품 1
    expect(r.kind).toBe("correct");
    if (r.kind !== "correct") return;
    expect(r.earnedPartId).toBe(1);
    expect(r.state.earnedParts).toEqual([1]);
  });

  it("스테이지 6단어 완료 시 자동으로 다음 스테이지로", () => {
    let s = initialState();
    for (const id of ["joy", "joy", "sad", "sad", "anger", "anger"]) {
      const r = classify(s, id);
      expect(r.kind).toBe("correct");
      if (r.kind === "correct") s = r.state;
    }
    expect(s.stageIndex).toBe(1);
    expect(s.wordIndex).toBe(0);
    expect(s.earnedParts).toEqual([1, 2, 3]);
    expect(currentWord(s)?.emotionId).toBe("fear");
  });

  it("마지막 스테이지 마지막 단어에서 gameDone, 부품 9개", () => {
    let s = initialState();
    const order = STAGES.flatMap((st) => st.emotions.flatMap((e) => [e.id, e.id]));
    let last;
    for (const id of order) {
      last = classify(s, id);
      if (last.kind === "correct") s = last.state;
    }
    expect(last!.kind).toBe("correct");
    if (last!.kind !== "correct") return;
    expect(last!.gameDone).toBe(true);
    expect(s.earnedParts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/empathyRadar.logic.test.ts`
Expected: FAIL — `Cannot find module './empathyRadar.logic'`.

- [ ] **Step 3: 로직 파일 작성**

`src/scenes/planet/planet2/empathyRadar.logic.ts`:
```ts
import { STAGES, stageWords, findEmotion, type Stage, type Word } from "./empathyRadar.data";

export interface GameState {
  stageIndex: number; // 0..2
  words: Word[]; // 현재 스테이지의 셔플된 6단어
  wordIndex: number; // 0..6 (6이면 스테이지 끝)
  correctCounts: Record<string, number>; // 현재 스테이지 감정별 정답 수(0..2)
  earnedParts: number[]; // 획득한 부품 partId 목록(획득 순서)
}

export type Shuffle = <T>(arr: T[]) => T[];
const identity: Shuffle = (arr) => arr;

function zeroCounts(stage: Stage): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of stage.emotions) counts[e.id] = 0;
  return counts;
}

export function initialState(stages: Stage[] = STAGES, shuffle: Shuffle = identity): GameState {
  const stage = stages[0];
  return {
    stageIndex: 0,
    words: shuffle(stageWords(stage)),
    wordIndex: 0,
    correctCounts: zeroCounts(stage),
    earnedParts: [],
  };
}

export function currentWord(state: GameState): Word | null {
  return state.words[state.wordIndex] ?? null;
}

export type ClassifyResult =
  | { kind: "wrong" }
  | {
      kind: "correct";
      state: GameState;
      earnedPartId: number | null; // 이번 분류로 완성된 부품(2개째 정답), 아니면 null
      stageCleared: boolean; // 이번 분류로 스테이지 6단어를 끝냈는가
      gameDone: boolean; // 이번 분류로 게임 전체가 끝났는가
    };

// 현재 단어를 emotionId 상자에 넣었을 때의 결과. 오답이면 상태 불변(wrong).
export function classify(
  state: GameState,
  emotionId: string,
  stages: Stage[] = STAGES,
  shuffle: Shuffle = identity,
): ClassifyResult {
  const word = currentWord(state);
  if (!word || word.emotionId !== emotionId) return { kind: "wrong" };

  const newCount = state.correctCounts[emotionId] + 1;
  const correctCounts = { ...state.correctCounts, [emotionId]: newCount };

  let earnedPartId: number | null = null;
  let earnedParts = state.earnedParts;
  if (newCount === 2) {
    earnedPartId = findEmotion(emotionId, stages).partId;
    earnedParts = [...earnedParts, earnedPartId];
  }

  const nextWordIndex = state.wordIndex + 1;
  const stageCleared = nextWordIndex >= state.words.length;

  if (!stageCleared) {
    return {
      kind: "correct",
      earnedPartId,
      stageCleared: false,
      gameDone: false,
      state: { ...state, wordIndex: nextWordIndex, correctCounts, earnedParts },
    };
  }

  const isLastStage = state.stageIndex >= stages.length - 1;
  if (isLastStage) {
    return {
      kind: "correct",
      earnedPartId,
      stageCleared: true,
      gameDone: true,
      state: { ...state, wordIndex: nextWordIndex, correctCounts, earnedParts },
    };
  }

  // 다음 스테이지로 자동 전환(단어 셔플, 카운트 리셋).
  const nextStage = stages[state.stageIndex + 1];
  return {
    kind: "correct",
    earnedPartId,
    stageCleared: true,
    gameDone: false,
    state: {
      stageIndex: state.stageIndex + 1,
      words: shuffle(stageWords(nextStage)),
      wordIndex: 0,
      correctCounts: zeroCounts(nextStage),
      earnedParts,
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/empathyRadar.logic.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet2/empathyRadar.logic.ts src/scenes/planet/planet2/empathyRadar.logic.test.ts
git commit -m "feat(planet2): 공감 레이더 게임 로직(분류·부품획득·스테이지전환) + 테스트"
```

---

## Task 4: 게임 UI (`EmpathyRadarStage.tsx` + `.css`)

**Files:**
- Modify (rewrite): `src/scenes/planet/planet2/EmpathyRadarStage.tsx`
- Modify (rewrite): `src/scenes/planet/planet2/EmpathyRadarStage.css`

**Interfaces:**
- Consumes: `STAGES`, `Emotion` (Task 2); `initialState`, `currentWord`, `classify`, `GameState` (Task 3); 에셋 `/assets/planet2/radar-assembler.png`, `/assets/planet2/radar-part-{1..9}.png` (Task 1).
- Props: `{ onDone: () => void }` (index.tsx가 이미 이 시그니처로 렌더).

UI 검증은 단위 테스트가 아니라 dev 서버 육안 확인으로 한다(미션1 컴포넌트도 컴포넌트 테스트 없음). 로직은 Task 3이 이미 커버.

- [ ] **Step 1: 컴포넌트 전체 재작성**

`src/scenes/planet/planet2/EmpathyRadarStage.tsx` (파일 전체를 아래로 교체):
```tsx
import { useRef, useState } from "react";
import { STAGES, type Emotion } from "./empathyRadar.data";
import { initialState, currentWord, classify, type GameState } from "./empathyRadar.logic";
import "./EmpathyRadarStage.css";

const ASSET = "/assets/planet2";

// Fisher-Yates 셔플(런타임용). 로직/테스트는 기본 identity를 쓰므로 여기서 주입.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 조립기 배경 이미지 위 9개 부품 슬롯 중심(이미지 컨테이너 대비 %).
// ⚠️ dev 서버에서 배경과 겹쳐보며 미세조정할 것(Step 6).
const SLOT_POS: { left: string; top: string }[] = [
  { left: "42%", top: "31%" }, // 1
  { left: "52%", top: "31%" }, // 2
  { left: "62%", top: "31%" }, // 3
  { left: "42%", top: "45%" }, // 4
  { left: "52%", top: "45%" }, // 5
  { left: "62%", top: "45%" }, // 6
  { left: "42%", top: "58%" }, // 7
  { left: "52%", top: "58%" }, // 8
  { left: "62%", top: "58%" }, // 9
];

export default function EmpathyRadarStage({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<GameState>(() => initialState(STAGES, shuffle));
  const [wrongBox, setWrongBox] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const doneRef = useRef(false);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragOrigin = useRef<{ px: number; py: number } | null>(null);

  const stage = STAGES[state.stageIndex];
  const word = currentWord(state);
  const earned = new Set(state.earnedParts);

  // 현재 단어를 emotionId 상자에 넣는 시도(탭/드롭 공용).
  function attempt(emotionId: string) {
    if (doneRef.current || !word) return;
    const r = classify(state, emotionId, STAGES, shuffle);
    if (r.kind === "wrong") {
      setWrongBox(emotionId);
      window.setTimeout(() => setWrongBox(null), 450);
      return;
    }
    setState(r.state);
    if (r.gameDone) {
      doneRef.current = true;
      setBanner("공감 레이더 완성! 🛰️");
      window.setTimeout(() => onDone(), 1100);
      return;
    }
    if (r.stageCleared) {
      const next = STAGES[r.state.stageIndex];
      setBanner(`${next.id}단계 · ${next.title}`);
      window.setTimeout(() => setBanner(null), 1200);
    }
  }

  // 드래그: 단어 버블을 포인터로 옮기고, 놓은 지점의 감정 상자를 판정.
  function onBubbleDown(e: React.PointerEvent) {
    if (!word || doneRef.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragOrigin.current = { px: e.clientX, py: e.clientY };
    setDrag({ x: 0, y: 0 });
  }
  function onBubbleMove(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    setDrag({ x: e.clientX - dragOrigin.current.px, y: e.clientY - dragOrigin.current.py });
  }
  function onBubbleUp(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    setDrag(null);
    // 놓은 지점이 어느 감정 상자 안인가 히트테스트.
    const hit = Object.entries(boxRefs.current).find(([, el]) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (hit) attempt(hit[0]);
  }

  return (
    <div className="er-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="er-panel">
        {/* 좌: 조립기 인벤토리 */}
        <div className="er-inventory">
          <img className="er-assembler" src={`${ASSET}/radar-assembler.png`} alt="공감 레이더 조립기" draggable={false} />
          {SLOT_POS.map((pos, i) => {
            const partId = i + 1;
            if (!earned.has(partId)) return null;
            return (
              <img
                key={partId}
                className="er-part"
                src={`${ASSET}/radar-part-${partId}.png`}
                alt={`부품 ${partId}`}
                style={{ left: pos.left, top: pos.top }}
                draggable={false}
              />
            );
          })}
        </div>

        {/* 우: 플레이 영역 */}
        <div className="er-play">
          <div className="er-header">
            <span className="er-stage">{stage.id}단계 · {stage.title}</span>
            <span className="er-progress">부품 {state.earnedParts.length} / 9</span>
          </div>
          <div className="er-instruction">감정 단어를 성격에 맞게 분류해 보자!</div>

          {/* 감정 상자 3개(드롭 존 + 탭) */}
          <div className="er-boxes">
            {stage.emotions.map((e: Emotion) => (
              <div
                key={e.id}
                ref={(el) => { boxRefs.current[e.id] = el; }}
                className={`er-box${wrongBox === e.id ? " er-box--wrong" : ""}`}
                style={{ ["--box-color" as string]: e.color }}
                onClick={() => attempt(e.id)}
              >
                <span className="er-box-emoji">{e.emoji}</span>
                <span className="er-box-name">{e.name}</span>
              </div>
            ))}
          </div>

          {/* 현재 단어 버블(드래그 가능) */}
          <div className="er-word-area">
            {word && (
              <div
                ref={bubbleRef}
                className="er-word"
                style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)`, transition: "none" } : undefined}
                onPointerDown={onBubbleDown}
                onPointerMove={onBubbleMove}
                onPointerUp={onBubbleUp}
              >
                <span className="er-word-emoji">{word.emoji}</span>
                <span className="er-word-text">{word.text}</span>
              </div>
            )}
          </div>
        </div>

        {banner && <div className="er-banner">{banner}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS 전체 재작성**

`src/scenes/planet/planet2/EmpathyRadarStage.css` (파일 전체를 아래로 교체):
```css
/* 미션2 공감 레이더 미니게임. #stage(1920×1200) 위 오버레이. px 절대배치(vh/vw 금지). */
.er-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  font-family: inherit;
}
.er-panel {
  position: relative;
  width: 1632px;
  height: 1020px;
  display: flex;
  gap: 32px;
  padding: 40px;
  background: #14261f;
  color: #dcefe4;
  border: 6px solid #6fae8e;
  border-radius: 32px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

/* 좌: 조립기 인벤토리 */
.er-inventory {
  position: relative;
  width: 900px;
  height: 940px;
  flex: none;
}
.er-assembler {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
.er-part {
  position: absolute;
  width: 11%;
  transform: translate(-50%, -50%);
  user-select: none;
  -webkit-user-drag: none;
  animation: er-part-pop 0.4s ease;
}
@keyframes er-part-pop {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  70% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

/* 우: 플레이 영역 */
.er-play {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.er-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.er-stage {
  padding: 10px 24px;
  font-size: 28px;
  font-weight: 800;
  color: #06251a;
  background: linear-gradient(180deg, #9be9c6, #52c793);
  border-radius: 999px;
}
.er-progress {
  font-size: 28px;
  font-weight: 800;
  color: #ffe066;
}
.er-instruction {
  margin-top: 20px;
  font-size: 30px;
  font-weight: 700;
  text-align: center;
}

/* 감정 상자 3개 */
.er-boxes {
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.er-box {
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 5px solid var(--box-color, #6fae8e);
  border-radius: 28px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
  user-select: none;
}
.er-box:hover { transform: translateY(-4px); background: rgba(255, 255, 255, 0.14); }
.er-box-emoji { font-size: 64px; }
.er-box-name { font-size: 36px; font-weight: 800; }
.er-box--wrong { animation: er-shake 0.45s ease; border-color: #ff6b6b; }
@keyframes er-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

/* 현재 단어 버블 */
.er-word-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.er-word {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 28px 48px;
  font-size: 44px;
  font-weight: 800;
  color: #06251a;
  background: linear-gradient(180deg, #ffffff, #d7f2e6);
  border: 4px solid #ffffff;
  border-radius: 28px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.er-word:active { cursor: grabbing; }
.er-word-emoji { font-size: 48px; }

/* 스테이지 전환 / 완료 배너 */
.er-banner {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 28px 56px;
  font-size: 48px;
  font-weight: 900;
  color: #06251a;
  background: linear-gradient(180deg, #ffe89b, #ffcf52);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
```

- [ ] **Step 3: 타입체크·린트·테스트 통과 확인**

Run: `npm test && npx tsc -b`
Expected: 테스트 PASS(데이터+로직 10건), 타입 에러 없음.

- [ ] **Step 4: dev 서버로 육안 검증(핵심)**

Run: `npm run dev` → 브라우저에서 행성2 → 미션2 진입 → 인트로 내레이션 뒤 팝업 확인. 아래를 모두 확인:
- 좌측에 조립기 이미지가 보이고, 정답 2개를 맞힌 감정의 **부품이 해당 슬롯 위치에 정확히** 나타난다.
- 우측 감정 상자 **탭**으로 분류된다(현재 단어가 그 감정이면 정답).
- 단어 버블을 **드래그해서 상자에 놓으면** 분류된다.
- 오답 시 상자가 흔들리고 단어는 유지된다.
- 6단어 완료 시 배너가 뜨고 자동으로 다음 스테이지 감정/단어로 바뀐다.
- 9/9 완료 시 "완성" 배너 후 `onDone()`으로 `p2_m2_complete` 내레이션으로 넘어간다.

- [ ] **Step 5: 슬롯 좌표 미세조정**

Step 4에서 부품이 슬롯과 어긋나면 `SLOT_POS`의 `left`/`top` %와 `.er-part { width }`를 조정해 각 부품이 조립기 빈 링 중앙에 오도록 맞춘다. 조정 후 Step 4 재확인.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/planet/planet2/EmpathyRadarStage.tsx src/scenes/planet/planet2/EmpathyRadarStage.css
git commit -m "feat(planet2): 공감 레이더 미니게임 UI(인벤토리·드래그/탭 분류·자동 전환)"
```

---

## Self-Review Notes

- **Spec 커버리지:** 3스테이지×3감정×2단어(Task2) / 2단어 정답 시 부품 획득·1개는 대기(Task3 `earnedPartId` null→partId) / 오답 재시도·실패없음(Task3 wrong + Task4 흔들림) / 드래그+탭(Task4) / 자동 스테이지 전환(Task3) / 슬롯 오버레이 표시(Task4) / 이름·점수·임명장·긍정부정라벨 제외(전 Task) / `onDone()` 호출(Task4). 모두 태스크 존재.
- **타입 일관성:** `classify`/`initialState`의 `Shuffle`·`GameState`·`ClassifyResult` 필드명이 컴포넌트 사용처와 일치(`earnedParts`, `earnedPartId`, `stageCleared`, `gameDone`).
- **미해결(구현 중 확인):** `SLOT_POS` 좌표·`.er-part` 크기는 배경 이미지 기준 시작값이며 Step 5에서 실측 조정.
```
