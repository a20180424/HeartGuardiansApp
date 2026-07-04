# Planet2 미션1 감정 설명서 미니게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planet2 미션1의 `p2_m1_play` 노드에서 "가디언즈 감정 설명서" 10문항 미니게임(감정 8지선다 → 행동 6지선다 → 피드백)을 플레이하고, 결과를 메모리에 보관한 뒤 다음 노드로 진행한다.

**Architecture:** 공유 엔진에 범용 `minigame` 노드 타입을 추가하고(`types.ts`/`runner.ts`), `MissionPlayer`는 `games` prop으로 주입된 컴포넌트를 `mirrors`/`gauge`/`reveal`과 동일한 `vm.stage` 패턴으로 렌더한다. 게임 데이터·상태로직·컴포넌트는 planet2 안에 두고, planet2/index.tsx가 게임을 주입하며 결과를 `useRef`에 보관한다(서버 연동은 후속 TODO).

**Tech Stack:** React 19, TypeScript, Vitest(node 환경, DOM 테스트 없음), Vite. 원본: `mytemp/행성2_미션1_게임.html`.

## Global Constraints

- 레이아웃: 미션 엔진(`player/`)은 `#stage` **1920×1200** 좌표계 + `useFitStage` 스케일. 게임 오버레이는 `position:absolute; inset:0`으로 스테이지를 채우고 px로 절대배치한다. `100vw/100vh/vh/vw` 사용 금지.
- 오프라인 APK 대상: 외부 CDN/폰트(Tailwind, Google Fonts) 로드 금지. 순수 로컬 CSS만.
- 기능 우선, 비주얼 나중: 최소 스타일(가독성 위주)까지만. 초록/금색 양장본 룩 재현·planet2 톤 재스타일은 이 플랜 범위 밖.
- 테스트 컨벤션: 순수 로직은 `*.logic.ts` + `*.logic.test.ts`(vitest, node). 컴포넌트 DOM 테스트는 도입하지 않는다(jsdom/testing-library 미설치).
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 작업 브랜치: `feat/planet2-m1-emotion-game`.

## File Structure

- `src/scenes/planet/planet2/emotionGuide.content.json` (신규) — 지문(상황)·감정·행동/피드백 콘텐츠 데이터(원본 HTML 이식). 이후 문구 편집은 이 파일만 고친다.
- `src/scenes/planet/planet2/emotionGuide.data.ts` (신규) — 위 JSON을 타입과 함께 로드해 재노출하는 얇은 로더 + 타입 정의.
- `src/scenes/planet/planet2/emotionGuide.data.test.ts` (신규) — 데이터 정합성 검증.
- `src/scenes/planet/planet2/emotionGuide.logic.ts` (신규) — 순수 게임 상태 머신.
- `src/scenes/planet/planet2/emotionGuide.logic.test.ts` (신규) — 상태 머신 검증.
- `src/scenes/planet/planet2/EmotionGuideStage.tsx` (신규) — 게임 컴포넌트(렌더).
- `src/scenes/planet/planet2/EmotionGuideStage.css` (신규) — 게임 최소 스타일.
- `src/scenes/planet/engine/types.ts` (수정) — `minigame` 타입/`game` 필드/`showMinigame`.
- `src/scenes/planet/engine/runner.ts` (수정) — `minigame` 디스패치.
- `src/scenes/planet/engine/runner.test.ts` (수정) — fake view에 `showMinigame` + 디스패치 테스트.
- `src/scenes/planet/player/MissionPlayer.tsx` (수정) — `minigame` 스테이지 + `games` prop.
- `src/scenes/planet/planet2/mission01.json` (수정) — `p2_m1_play`를 minigame 노드로 교체.
- `src/scenes/planet/planet2/index.tsx` (수정) — 게임 주입 + 결과 ref.
- `src/scenes/planet/planet2/missions.test.ts` (수정) — fake view `showMinigame` + minigame 노드 검증.

---

### Task 1: 게임 콘텐츠 JSON + 데이터 로더

콘텐츠(지문/감정/행동/피드백)는 편집 편의를 위해 **JSON 파일**로 분리하고, `emotionGuide.data.ts`는 그 JSON을 타입과 함께 로드해 재노출하는 얇은 로더로 둔다. 다운스트림(Task 2/5/6)이 쓰는 export 표면은 로더가 그대로 유지하므로, 이후 문구 수정은 JSON만 고치면 된다.

**Files:**
- Create: `src/scenes/planet/planet2/emotionGuide.content.json`
- Create: `src/scenes/planet/planet2/emotionGuide.data.ts`
- Test: `src/scenes/planet/planet2/emotionGuide.data.test.ts`

**Interfaces:**
- Produces:
  - `interface Situation { id: number; title: string; desc: string }`
  - `interface Emotion { id: string; name: string; emoji: string }`
  - `interface CopingAction { id: number; text: string; emoji: string }`
  - `interface EmotionCoping { actions: CopingAction[]; feedbacks: Record<number, string> }`
  - `interface EmotionGuideResult { situationId: number; emotionId: string; actionId: number }` — 서버로 보낼 답변 1건. 텍스트 없이 **id만**(situationId=상황 id, emotionId=감정 키 예:"joy", actionId=행동 id 1~6).
  - `const SITUATIONS: Situation[]` (10개, id 1~10)
  - `const EMOTIONS: Emotion[]` (8개: joy, sad, anger, anxiety, anticipation, calm, proud, shy)
  - `const COPING_ACTIONS: Record<string, EmotionCoping>` (감정 id별 actions 6개(id 1~6) + feedbacks 키 1~6)

**데이터 이식 규칙:** `mytemp/행성2_미션1_게임.html`의 상수를 **내용 그대로** JSON으로 옮기되, TS 타입에 맞게 필드만 정리한다.
- `situations` (HTML 393~404행) → JSON `situations`: 필드 `id`, `title`, `desc` 그대로.
- `emotions` (HTML 407~416행) → JSON `emotions`: `id`, `name`, `emoji`만 남기고 `color`/`activeColor`(Tailwind 클래스)는 **버린다**.
- `copingActions` (HTML 419~564행) → JSON `copingActions`: 각 감정의 `actions`(각 `id`,`text`,`emoji`)와 `feedbacks`(키 "1"~"6") 그대로.

(참고: `resolveJsonModule`은 이미 `mission01.json` 등을 import 중이라 활성화돼 있어 별도 tsconfig 변경 불필요.)

- [ ] **Step 1: 데이터 정합성 테스트 작성**

Create `src/scenes/planet/planet2/emotionGuide.data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SITUATIONS, EMOTIONS, COPING_ACTIONS } from "./emotionGuide.data";

describe("emotionGuide 데이터", () => {
  it("상황은 10개이고 id가 1~10이다", () => {
    expect(SITUATIONS).toHaveLength(10);
    expect(SITUATIONS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    SITUATIONS.forEach((s) => {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
    });
  });

  it("감정은 8개이고 id가 유일하며 이모지/이름이 있다", () => {
    expect(EMOTIONS).toHaveLength(8);
    const ids = EMOTIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(8);
    EMOTIONS.forEach((e) => {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.emoji.length).toBeGreaterThan(0);
    });
  });

  it("모든 감정마다 행동 6개(id 1~6)와 피드백 6개(키 1~6)가 있다", () => {
    EMOTIONS.forEach((e) => {
      const coping = COPING_ACTIONS[e.id];
      expect(coping, `감정 ${e.id}의 copingActions`).toBeDefined();
      expect(coping.actions.map((a) => a.id)).toEqual([1, 2, 3, 4, 5, 6]);
      coping.actions.forEach((a) => {
        expect(a.text.length).toBeGreaterThan(0);
        expect(a.emoji.length).toBeGreaterThan(0);
      });
      [1, 2, 3, 4, 5, 6].forEach((k) => {
        expect(coping.feedbacks[k], `감정 ${e.id} 피드백 ${k}`).toBeTruthy();
      });
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/emotionGuide.data.test.ts`
Expected: FAIL — `emotionGuide.data` 모듈을 찾을 수 없음.

- [ ] **Step 3: 콘텐츠 JSON 작성**

Create `src/scenes/planet/planet2/emotionGuide.content.json`. 아래 shape에 "데이터 이식 규칙"대로 HTML 상수를 빠짐없이 옮긴다(상황 10개, 감정 8개, 감정별 actions 6 + feedbacks 6). 대표 형태:

```json
{
  "situations": [
    {
      "id": 1,
      "title": "기후 변동 위기",
      "desc": "내일 가디언즈 대원들과 함께 기분 좋은 야외 탐색을 가기로 했는데, 일기예보에서 하루 종일 강한 비바람이 몰아칠 확률이 90%라고 발표할 때"
    }
  ],
  "emotions": [
    { "id": "joy", "name": "기쁨/신남", "emoji": "😄" },
    { "id": "sad", "name": "슬픔/눈물", "emoji": "😢" },
    { "id": "anger", "name": "화남/억울", "emoji": "😡" },
    { "id": "anxiety", "name": "걱정/긴장", "emoji": "😰" },
    { "id": "anticipation", "name": "설렘/기대", "emoji": "🤩" },
    { "id": "calm", "name": "무덤덤/평온", "emoji": "😑" },
    { "id": "proud", "name": "뿌듯/자랑", "emoji": "🥳" },
    { "id": "shy", "name": "쑥스/부끄", "emoji": "🫣" }
  ],
  "copingActions": {
    "joy": {
      "actions": [
        { "id": 1, "text": "제자리에서 기분 좋게 방방 뛰어보기", "emoji": "🏃‍♂️" }
      ],
      "feedbacks": {
        "1": "방방 뛰며 기쁜 신체 에너지를 온몸으로 나누었군요. 긍정이 가득 차오릅니다!"
      }
    }
  }
}
```

주의:
- `situations`는 HTML 394~403행의 나머지 9개(id 2~10)까지 채운다.
- `copingActions`는 8개 감정 전부(joy/sad/anger/anxiety/anticipation/calm/proud/shy), 각 `actions` 6개(id 1~6)와 `feedbacks` 키 "1"~"6"을 HTML 419~564행에서 빠짐없이 옮긴다. 누락 시 Step 5 테스트가 실패한다.
- JSON이라 후행 콤마·주석은 넣지 않는다.

- [ ] **Step 4: 데이터 로더 작성**

Create `src/scenes/planet/planet2/emotionGuide.data.ts` — 위 JSON을 타입과 함께 로드해 재노출한다:

```ts
// 콘텐츠는 emotionGuide.content.json 에서 관리하고, 여기서 타입을 입혀 재노출한다.
import content from "./emotionGuide.content.json";

export interface Situation {
  id: number;
  title: string;
  desc: string;
}

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
}

export interface CopingAction {
  id: number;
  text: string;
  emoji: string;
}

export interface EmotionCoping {
  actions: CopingAction[];
  feedbacks: Record<number, string>;
}

// 서버로 전송할 답변 1건. 텍스트가 아니라 id만 담는다.
export interface EmotionGuideResult {
  situationId: number; // 상황 id
  emotionId: string; // 감정 키(예: "joy")
  actionId: number; // 행동 id(1~6)
}

export const SITUATIONS = content.situations as Situation[];
export const EMOTIONS = content.emotions as Emotion[];
// JSON의 feedbacks 키는 문자열("1"..)이지만 런타임 접근은 숫자 인덱스로도 동작한다.
export const COPING_ACTIONS = content.copingActions as unknown as Record<string, EmotionCoping>;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/emotionGuide.data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/planet/planet2/emotionGuide.content.json src/scenes/planet/planet2/emotionGuide.data.ts src/scenes/planet/planet2/emotionGuide.data.test.ts
git commit -m "$(printf 'feat(planet2): 감정 설명서 콘텐츠 JSON + 데이터 로더 이식\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 게임 상태 로직 모듈

**Files:**
- Create: `src/scenes/planet/planet2/emotionGuide.logic.ts`
- Test: `src/scenes/planet/planet2/emotionGuide.logic.test.ts`

**Interfaces:**
- Consumes: `EmotionGuideResult` (Task 1, `./emotionGuide.data`).
- Produces:
  - `const TOTAL_STEPS = 10`
  - `interface GameState { step: number; emotion: string | null; action: number | null; results: EmotionGuideResult[] }`
  - `function initialState(): GameState`
  - `function pickEmotion(state: GameState, emotion: string): GameState` — emotion 설정, action은 null로 리셋.
  - `function pickAction(state: GameState, action: number): GameState`
  - `function canAdvance(state: GameState): boolean`
  - `type AdvanceResult = { kind: "next"; state: GameState } | { kind: "done"; results: EmotionGuideResult[] }`
  - `function advance(state: GameState, total?: number): AdvanceResult`

- [ ] **Step 1: 로직 테스트 작성**

Create `src/scenes/planet/planet2/emotionGuide.logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  initialState,
  pickEmotion,
  pickAction,
  canAdvance,
  advance,
  TOTAL_STEPS,
} from "./emotionGuide.logic";

describe("emotionGuide 로직", () => {
  it("초기 상태는 step 1, 선택 없음, 결과 비어있음", () => {
    const s = initialState();
    expect(s).toEqual({ step: 1, emotion: null, action: null, results: [] });
  });

  it("pickEmotion은 감정을 설정하고 action을 리셋한다", () => {
    let s = initialState();
    s = pickAction(pickEmotion(s, "joy"), 3);
    expect(s.action).toBe(3);
    s = pickEmotion(s, "sad"); // 감정 바꾸면 action 리셋
    expect(s.emotion).toBe("sad");
    expect(s.action).toBeNull();
  });

  it("canAdvance는 감정과 행동이 둘 다 선택돼야 true", () => {
    let s = initialState();
    expect(canAdvance(s)).toBe(false);
    s = pickEmotion(s, "joy");
    expect(canAdvance(s)).toBe(false);
    s = pickAction(s, 2);
    expect(canAdvance(s)).toBe(true);
  });

  it("advance는 현재 선택을 결과에 넣고 다음 문항으로 간다", () => {
    let s = pickAction(pickEmotion(initialState(), "anger"), 5);
    const r = advance(s);
    expect(r.kind).toBe("next");
    if (r.kind === "next") {
      expect(r.state.step).toBe(2);
      expect(r.state.emotion).toBeNull();
      expect(r.state.action).toBeNull();
      expect(r.state.results).toEqual([{ situationId: 1, emotionId: "anger", actionId: 5 }]);
    }
  });

  it("마지막 문항에서 advance는 done과 10개 결과를 돌려준다", () => {
    let s = initialState();
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      s = pickAction(pickEmotion(s, "calm"), 1);
      const r = advance(s);
      if (i < TOTAL_STEPS) {
        expect(r.kind).toBe("next");
        if (r.kind === "next") s = r.state;
      } else {
        expect(r.kind).toBe("done");
        if (r.kind === "done") {
          expect(r.results).toHaveLength(10);
          expect(r.results.map((x) => x.situationId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        }
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/emotionGuide.logic.test.ts`
Expected: FAIL — `emotionGuide.logic` 모듈 없음.

- [ ] **Step 3: 로직 모듈 작성**

Create `src/scenes/planet/planet2/emotionGuide.logic.ts`:

```ts
import type { EmotionGuideResult } from "./emotionGuide.data";

export const TOTAL_STEPS = 10;

export interface GameState {
  step: number; // 1..TOTAL_STEPS
  emotion: string | null;
  action: number | null;
  results: EmotionGuideResult[];
}

export function initialState(): GameState {
  return { step: 1, emotion: null, action: null, results: [] };
}

// 감정 선택 시 이전에 고른 행동은 리셋(원본 selectEmotion 동작).
export function pickEmotion(state: GameState, emotion: string): GameState {
  return { ...state, emotion, action: null };
}

export function pickAction(state: GameState, action: number): GameState {
  return { ...state, action };
}

export function canAdvance(state: GameState): boolean {
  return state.emotion !== null && state.action !== null;
}

export type AdvanceResult =
  | { kind: "next"; state: GameState }
  | { kind: "done"; results: EmotionGuideResult[] };

// 현재 선택을 결과에 확정하고 다음 문항으로 가거나 전체 완료를 알린다.
// 호출 전 canAdvance(state) === true 를 보장해야 한다.
export function advance(state: GameState, total = TOTAL_STEPS): AdvanceResult {
  const results: EmotionGuideResult[] = [
    ...state.results,
    // 텍스트가 아니라 id만 저장 — 이 배열이 그대로 서버 payload가 된다.
    { situationId: state.step, emotionId: state.emotion!, actionId: state.action! },
  ];
  if (state.step >= total) return { kind: "done", results };
  return {
    kind: "next",
    state: { step: state.step + 1, emotion: null, action: null, results },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/emotionGuide.logic.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/planet/planet2/emotionGuide.logic.ts src/scenes/planet/planet2/emotionGuide.logic.test.ts
git commit -m "$(printf 'feat(planet2): 감정 설명서 미니게임 상태 로직 + 테스트\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: 엔진 `minigame` 노드 타입 배선

**Files:**
- Modify: `src/scenes/planet/engine/types.ts`
- Modify: `src/scenes/planet/engine/runner.ts`
- Test: `src/scenes/planet/engine/runner.test.ts`

**Interfaces:**
- Produces (엔진 계약):
  - `MissionNode.type`에 `"minigame"` 포함, `MissionNode.game?: string`.
  - `RunnerView.showMinigame(node: MissionNode, done: () => void): void`.
  - runner는 `minigame` 노드에서 `view.showMinigame(node, () => advance(node))` 호출.

- [ ] **Step 1: runner 테스트에 minigame 디스패치 케이스 추가(실패)**

기존 3개 FakeView 각각에 `showMinigame` 구현을 추가하고, minigame 디스패치 테스트를 새로 넣는다.

먼저 `src/scenes/planet/engine/runner.test.ts`의 **세 군데** fake view 객체에 아래 메서드를 추가한다(각 `showVideo(...)` 바로 다음 줄):

첫 번째 fake view(`makeFakeView`, 약 88행 `showVideo` 뒤):
```ts
    showMinigame(_node, done) {
      done();
    },
```
두 번째 fake view(mirrors/gauge 테스트, 약 145행 `showVideo` 뒤):
```ts
        showMinigame(_n, done) {
          done();
        },
```
세 번째 fake view(reveal 테스트, 약 195행 `showVideo` 뒤):
```ts
        showMinigame(_n, done) {
          done();
        },
```

그리고 파일 끝의 마지막 `it(...)` 다음, `describe` 닫기 전에 새 테스트를 추가한다:

```ts
  it("minigame 노드는 showMinigame 를 호출하고 done 시 next 로 진행한다", async () => {
    const seq: string[] = [];
    const md: MissionData = {
      id: "t4",
      title: "t4",
      start: "game",
      nodes: [
        { id: "game", type: "minigame", game: "demo", next: "fin" },
        { id: "fin", type: "line", speaker: "hati", text: "끝", next: null },
      ],
    };
    await new Promise<void>((resolve) => {
      const view: RunnerView = {
        reset() {},
        execCommands() {},
        showLine(node: MissionNode, onTyped: () => void) {
          seq.push("line:" + node.id);
          onTyped();
          return Promise.resolve();
        },
        showChoices() {},
        showMirrors(_n, done) {
          done();
        },
        showGauge(_n, done) {
          done();
        },
        showReveal(_n, done) {
          done();
        },
        showVideo(_n, done) {
          done();
        },
        showMinigame(node: MissionNode, done: () => void) {
          seq.push("minigame:" + node.id);
          Promise.resolve().then(done);
        },
        end() {
          expect(seq).toEqual(["minigame:game", "line:fin"]);
          resolve();
        },
      };
      new DialogueRunner(md, view).start();
    });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/engine/runner.test.ts`
Expected: FAIL — 타입 에러(`showMinigame`가 `RunnerView`에 없음) 또는 런타임에서 `view.showMinigame` 미정의.

- [ ] **Step 3: types.ts 수정**

`src/scenes/planet/engine/types.ts`에서 `MissionNode.type` 유니온에 `"minigame"`을 추가한다:

```ts
  type?: "line" | "choice" | "branch" | "mirrors" | "gauge" | "reveal" | "video" | "minigame";
```

같은 `MissionNode` 인터페이스 안, `next?: string | null;` 바로 위에 `game` 필드를 추가한다:

```ts
  // type: "minigame" 전용 — 렌더할 게임 식별자(games 맵의 키). 예: "emotionGuide".
  game?: string;
```

`RunnerView` 인터페이스에서 `showVideo(...)` 다음 줄에 추가한다:

```ts
  showMinigame(node: MissionNode, done: () => void): void;
```

- [ ] **Step 4: runner.ts 수정**

`src/scenes/planet/engine/runner.ts`의 `typeOf` 반환 타입 유니온에 `"minigame"`을 추가한다(선언·반환 타입 모두):

```ts
  private typeOf(
    n: MissionNode,
  ): "line" | "choice" | "branch" | "mirrors" | "gauge" | "reveal" | "video" | "minigame" {
    return n.type || (n.choices ? "choice" : "line");
  }
```

`go()`에서 `if (t === "video") { ... }` 블록 다음에 추가한다:

```ts
    if (t === "minigame") {
      this.view.showMinigame(node, () => this.advance(node));
      return;
    }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/engine/runner.test.ts`
Expected: PASS (기존 + 신규 minigame 테스트).

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/planet/engine/types.ts src/scenes/planet/engine/runner.ts src/scenes/planet/engine/runner.test.ts
git commit -m "$(printf 'feat(engine): 범용 minigame 노드 타입 + showMinigame 디스패치\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: MissionPlayer minigame 스테이지 + `games` prop

**Files:**
- Modify: `src/scenes/planet/player/MissionPlayer.tsx`

**Interfaces:**
- Consumes: `RunnerView.showMinigame`, `MissionNode.game` (Task 3).
- Produces (컴포넌트 계약):
  - `MissionPlayer` props에 `games?: Record<string, ComponentType<{ onDone: () => void }>>`.
  - `minigame` 노드 진입 시 `vm.stage="minigame"`, `vm.gameId=node.game`; 완료 시 `finishMinigame()`이 `vm.stage="none"` 후 `done()` 호출.
  - 주입된 게임 컴포넌트는 `onDone: () => void`(다음 노드로 진행)을 받는다.

이 태스크는 DOM 유닛테스트 없이 **타입체크로 검증**한다(코드베이스 컨벤션). 실동작은 Task 6의 missions.test와 최종 수동 검증에서 확인.

- [ ] **Step 1: react import에 `ComponentType` 추가**

`src/scenes/planet/player/MissionPlayer.tsx` 최상단 import에서 `type ReactNode,` 다음 줄에 추가:

```ts
  type ComponentType,
```

- [ ] **Step 2: VM 타입에 minigame 스테이지 + gameId 추가**

`VM` 인터페이스의 stage 필드를 교체한다:

```ts
  stage: "none" | "mirrors" | "gauge" | "reveal" | "minigame";
```

같은 인터페이스에서 `videoStarted: boolean;` 다음 줄에 추가:

```ts
  gameId: string; // type:"minigame" 렌더할 게임 식별자(games 맵 키). 없으면 ""
```

- [ ] **Step 3: vm 초기값과 reset()에 gameId 추가**

vm 초기 객체(약 192행)의 `videoStarted: false,` 다음 줄에 추가:

```ts
    gameId: "",
```

`view.reset()`의 `Object.assign` 리터럴(약 441행)의 `videoStarted: false,` 다음 줄에도 동일하게 추가:

```ts
          gameId: "",
```

- [ ] **Step 4: props에 games 추가**

`MissionPlayer`의 props 객체 타입에서 `finish?: { label: string; icon?: string };` 다음 줄에 추가:

```ts
  // type:"minigame" 노드가 참조하는 게임 컴포넌트 맵(node.game → 컴포넌트). 완료 시 onDone 호출.
  games?: Record<string, ComponentType<{ onDone: () => void }>>;
```

- [ ] **Step 5: view.showMinigame 구현**

`view` 객체에서 `showVideo(...) { ... },` 블록 다음, `end() {` 앞에 추가:

```ts
      showMinigame(node, done) {
        updateScene(node); // 배경/HUD 유지
        vm.stage = "minigame";
        vm.gameId = node.game || "";
        vm.mode = "idle";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.tapHint = "";
        ms.done = done;
        render();
      },
```

- [ ] **Step 6: finishMinigame 헬퍼 추가**

`finishReveal` 함수 정의(약 796~802행) 다음에 추가:

```ts
  const finishMinigame = () => {
    const done = ms.done;
    ms.done = undefined;
    vm.stage = "none";
    vm.gameId = "";
    force();
    done?.();
  };
```

- [ ] **Step 7: 렌더 블록 추가**

`return (` 직전(약 954행 `const many = ...` 위)에 주입 게임 컴포넌트를 계산한다:

```ts
  const MiniGame =
    vm.stage === "minigame" ? props.games?.[vm.gameId] : undefined;
```

그리고 JSX에서 reveal 렌더 블록(`{vm.stage === "reveal" && ( ... )}`, 약 1199~1207행) 다음에 추가:

```tsx
        {/* 미니게임 (minigame) — planet 컨테이너가 games prop으로 주입 */}
        {MiniGame && <MiniGame onDone={finishMinigame} />}
```

- [ ] **Step 8: 타입체크 통과 확인**

Run: `npx tsc -b`
Expected: 에러 없음(exit 0). MissionPlayer가 `showMinigame`를 구현했고 games prop 타입이 일관됨.

- [ ] **Step 9: 커밋**

```bash
git add src/scenes/planet/player/MissionPlayer.tsx
git commit -m "$(printf 'feat(player): MissionPlayer minigame 스테이지 + games 주입 prop\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: EmotionGuideStage 컴포넌트 + 최소 스타일

**Files:**
- Create: `src/scenes/planet/planet2/EmotionGuideStage.tsx`
- Create: `src/scenes/planet/planet2/EmotionGuideStage.css`

**Interfaces:**
- Consumes: Task 1 데이터(`SITUATIONS`/`EMOTIONS`/`COPING_ACTIONS`/`EmotionGuideResult`), Task 2 로직(`initialState`/`pickEmotion`/`pickAction`/`canAdvance`/`advance`/`GameState`).
- Produces: `export default function EmotionGuideStage(props: { onFinish: (results: EmotionGuideResult[]) => void })`.

DOM 유닛테스트 없음(컨벤션). 검증은 타입체크 + Task 6 후 수동 실행.

- [ ] **Step 1: 최소 스타일 CSS 작성**

Create `src/scenes/planet/planet2/EmotionGuideStage.css`:

```css
/* 감정 설명서 미니게임 최소 스타일(기능 우선). #stage(1920×1200) 위 오버레이. */
.eg-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 40px 56px;
  background: #0e1f10;
  color: #e5d3b3;
  font-family: inherit;
  overflow: hidden;
}
.eg-hud {
  flex: 0 0 auto;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 1px;
}
.eg-body {
  flex: 1 1 auto;
  display: flex;
  gap: 32px;
  min-height: 0;
}
.eg-col {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f7f3e3;
  color: #2b2b2b;
  border-radius: 20px;
  padding: 28px;
  overflow-y: auto;
}
.eg-title {
  font-size: 24px;
  font-weight: 800;
}
.eg-desc {
  font-size: 26px;
  line-height: 1.5;
  font-weight: 700;
}
.eg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: auto;
}
.eg-emo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  border: 2px solid #cbb98a;
  border-radius: 14px;
  background: #fffdf5;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}
.eg-emo.sel {
  border-color: #d4af37;
  box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.4);
}
.eg-emo .em {
  font-size: 34px;
}
.eg-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.eg-act {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #cbb98a;
  border-radius: 14px;
  background: #fffdf5;
  font-size: 22px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.eg-act.sel {
  border-color: #2e8b57;
  box-shadow: 0 0 0 4px rgba(46, 139, 87, 0.3);
}
.eg-badge {
  font-size: 15px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 8px;
  margin-left: auto;
  white-space: nowrap;
}
.eg-badge.self { background: #d7f0df; color: #1c6b3a; }
.eg-badge.wish { background: #f6e6bf; color: #916b12; }
.eg-locked {
  margin: auto;
  font-size: 24px;
  font-weight: 800;
  color: #7a6f55;
  text-align: center;
}
.eg-feedback {
  background: #eaf7ee;
  border: 2px dashed #57b07a;
  border-radius: 14px;
  padding: 16px;
  font-size: 20px;
  font-weight: 700;
  color: #245c39;
}
.eg-next {
  flex: 0 0 auto;
  padding: 20px;
  border: none;
  border-radius: 16px;
  font-size: 26px;
  font-weight: 800;
  cursor: pointer;
  background: #2e8b57;
  color: #fff;
}
.eg-next:disabled {
  background: #8a8a7a;
  cursor: not-allowed;
  opacity: 0.6;
}
```

- [ ] **Step 2: 컴포넌트 작성**

Create `src/scenes/planet/planet2/EmotionGuideStage.tsx`:

```tsx
import { useState } from "react";
import {
  SITUATIONS,
  EMOTIONS,
  COPING_ACTIONS,
  type EmotionGuideResult,
} from "./emotionGuide.data";
import {
  initialState,
  pickEmotion,
  pickAction,
  canAdvance,
  advance,
  TOTAL_STEPS,
  type GameState,
} from "./emotionGuide.logic";
import "./EmotionGuideStage.css";

export default function EmotionGuideStage(props: {
  onFinish: (results: EmotionGuideResult[]) => void;
}) {
  const [state, setState] = useState<GameState>(initialState);

  const situation = SITUATIONS[state.step - 1];
  const coping = state.emotion ? COPING_ACTIONS[state.emotion] : null;
  const feedback =
    coping && state.action != null ? coping.feedbacks[state.action] : "";

  const onNext = () => {
    if (!canAdvance(state)) return;
    const r = advance(state);
    if (r.kind === "done") props.onFinish(r.results);
    else setState(r.state);
  };

  return (
    <div className="eg-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="eg-hud">
        가디언즈 감정 설명서 · {state.step} / {TOTAL_STEPS}
      </div>

      <div className="eg-body">
        {/* 왼쪽: 상황 + 감정 8지선다 */}
        <div className="eg-col">
          <div className="eg-title">🧭 {situation.title}</div>
          <div className="eg-desc">{situation.desc}</div>
          <div className="eg-grid">
            {EMOTIONS.map((e) => (
              <button
                key={e.id}
                className={`eg-emo${state.emotion === e.id ? " sel" : ""}`}
                onClick={() => setState((s) => pickEmotion(s, e.id))}
              >
                <span className="em">{e.emoji}</span>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 감정 선택 후 행동 6지선다 + 피드백 */}
        <div className="eg-col">
          {!coping ? (
            <div className="eg-locked">
              🔒 먼저 왼쪽에서 지금 느끼는 감정을 하나 골라줘.
            </div>
          ) : (
            <>
              <div className="eg-title">🛡️ 나에게 맞는 해결책 하나 고르기</div>
              <div className="eg-actions">
                {coping.actions.map((a) => (
                  <button
                    key={a.id}
                    className={`eg-act${state.action === a.id ? " sel" : ""}`}
                    onClick={() => setState((s) => pickAction(s, a.id))}
                  >
                    <span className="em">{a.emoji}</span>
                    <span>{a.text}</span>
                    <span className={`eg-badge ${a.id <= 3 ? "self" : "wish"}`}>
                      {a.id <= 3 ? "스스로 해소" : "바라는 공감"}
                    </span>
                  </button>
                ))}
              </div>
              {feedback && <div className="eg-feedback">💡 {feedback}</div>}
            </>
          )}
        </div>
      </div>

      <button className="eg-next" disabled={!canAdvance(state)} onClick={onNext}>
        {state.step >= TOTAL_STEPS ? "설명서 완성하기 ✨" : "다음 상황으로 ➡️"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 타입체크 통과 확인**

Run: `npx tsc -b`
Expected: 에러 없음(exit 0).

- [ ] **Step 4: 커밋**

```bash
git add src/scenes/planet/planet2/EmotionGuideStage.tsx src/scenes/planet/planet2/EmotionGuideStage.css
git commit -m "$(printf 'feat(planet2): EmotionGuideStage 게임 컴포넌트 + 최소 스타일\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: 미션 노드 교체 + 게임 주입 + 결과 보관

**Files:**
- Modify: `src/scenes/planet/planet2/mission01.json`
- Modify: `src/scenes/planet/planet2/index.tsx`
- Test: `src/scenes/planet/planet2/missions.test.ts`

**Interfaces:**
- Consumes: `EmotionGuideStage`(Task 5), `EmotionGuideResult`(Task 1), MissionPlayer `games` prop(Task 4).
- Produces: mission01의 `p2_m1_play`가 `type:"minigame", game:"emotionGuide"` 노드. planet2가 결과를 `useRef`에 보관.

- [ ] **Step 1: missions.test 갱신 — fake view showMinigame + minigame 노드 검증(실패)**

`src/scenes/planet/planet2/missions.test.ts`의 fake view에서 `showVideo(...)` 다음 줄에 추가:

```ts
      showMinigame(_n, done) {
        done();
      },
```

그리고 `describe("planet2 mission skeletons", ...)` 안, 마지막 `it.each(...)` 다음에 새 테스트 추가:

```ts
  it("mission01은 emotionGuide minigame 노드를 가지고 p2_m1_result 로 이어진다", () => {
    const play = mission01.nodes.find((n) => n.id === "p2_m1_play");
    expect(play).toBeDefined();
    expect(play?.type).toBe("minigame");
    expect(play?.game).toBe("emotionGuide");
    expect(play?.next).toBe("p2_m1_result");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet2/missions.test.ts`
Expected: FAIL — `p2_m1_play`가 아직 `type:"line"`이라 새 테스트 실패.

- [ ] **Step 3: mission01.json 노드 교체**

`src/scenes/planet/planet2/mission01.json`의 `p2_m1_play` 노드 객체 전체를 아래로 교체한다(현재 line 대사 노드 → minigame 노드):

```json
    {
      "id": "p2_m1_play",
      "type": "minigame",
      "game": "emotionGuide",
      "next": "p2_m1_result"
    },
```

- [ ] **Step 4: planet2/index.tsx에 게임 주입 + 결과 ref**

`src/scenes/planet/planet2/index.tsx` 상단 import에 추가(`import MissionPlayer ...` 다음 줄):

```ts
import EmotionGuideStage from "./EmotionGuideStage";
import type { EmotionGuideResult } from "./emotionGuide.data";
```

`useState` import에 `useRef`가 포함되도록 첫 줄을 확인/수정한다:

```ts
import { useEffect, useRef, useState } from "react";
```

`Planet2()` 함수 본문 안, `const [fading, setFading] = useState(false);` 다음 줄에 결과 보관용 ref를 추가한다:

```ts
  // 미션1 미니게임 결과(감정/행동 선택). 서버 준비 전까지 세션 메모리에만 보관.
  const emotionResultRef = useRef<EmotionGuideResult[] | null>(null);
```

mission1의 `<MissionPlayer ... onExit={() => goTo("mission2")} />`에 `games` prop을 추가한다(`onExit` 라인 앞에 삽입):

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

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet2/missions.test.ts`
Expected: PASS — 기존 스켈레톤 테스트 + 신규 minigame 노드 테스트. (기존 "시작→끝 걸어 end 도달" 테스트도 fake view의 `showMinigame`가 `done()`을 부르므로 그대로 통과.)

- [ ] **Step 6: 전체 테스트 + 타입체크 + 린트**

Run: `npm test`
Expected: 전체 PASS.

Run: `npx tsc -b`
Expected: 에러 없음.

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/scenes/planet/planet2/mission01.json src/scenes/planet/planet2/index.tsx src/scenes/planet/planet2/missions.test.ts
git commit -m "$(printf 'feat(planet2): 미션1 p2_m1_play에 감정 설명서 게임 연결 + 결과 메모리 보관\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 7: 수동 검증(실제 앱에서 플레이)

**Files:** 없음(검증 전용).

- [ ] **Step 1: 개발 서버 실행 후 미션1 진입**

Run: `npm run dev`
브라우저에서 개발 단축 경로로 미션1에 진입: `#/planet/2?stage=mission1`.

- [ ] **Step 2: 흐름 확인**

확인 항목:
- intro → preplay(설명서 표지 이미지) 대사를 탭으로 넘기면 게임 오버레이가 뜬다.
- 왼쪽에서 감정을 고르면 오른쪽 잠금이 풀리고 행동 6개가 뜬다.
- 행동을 고르면 피드백 문구가 뜨고 "다음 상황으로" 버튼이 활성화된다.
- 10문항을 끝내면 게임이 사라지고 `p2_m1_result`(설명서 완성) 대사로 진행된다.
- 이후 cards → end(미션 완료 배너)까지 정상 진행.

- [ ] **Step 3: 결과 메모리 보관 확인(선택)**

`planet2/index.tsx`의 `onFinish` 콜백에 임시 `console.log(results)`를 넣어 10개 항목(situationId 1~10, 각 emotion/actionId)이 찍히는지 확인한 뒤 제거한다. 문제 없으면 이 플랜 완료.

## Self-Review

**Spec coverage**
- 제네릭 minigame 노드 + 주입 → Task 3, 4, 6. ✅
- 게임 컴포넌트(10문항 플레이, 표지·완료화면 제외) → Task 5. ✅
- 데이터 이식(콘텐츠 JSON 분리 + 타입 로더, Tailwind 색상 제거) → Task 1. ✅
- 결과 메모리(planet2 ref, 서버 전송 지점 = onFinish 콜백의 TODO) → Task 6 Step 4. ✅
- 테스트(data/logic/runner/missions) → Task 1,2,3,6. ✅
- mission01.json 노드 교체 → Task 6 Step 3. ✅
- 최소 스타일(#stage 오버레이, CDN 금지) → Task 5. ✅
- 스코프 제외(교사모드 등) → 어느 태스크도 구현하지 않음. ✅

**Placeholder scan:** 콘텐츠 JSON 본문(Task 1 Step 3)은 `mytemp` HTML의 정확한 행 범위를 출처로 지정하고 대표 예시 + 완전성 검증 테스트(Task 1)로 보증 — 150줄 데이터를 플랜에 재전사하면 오히려 전사 오류 위험이 커서 의도적으로 출처 참조 방식을 택함. 그 외 코드 단계(로더 포함)는 전부 실제 코드 포함.

**Type consistency:** `EmotionGuideResult`(data.ts) → logic.ts/컴포넌트/index.tsx 동일 사용. `GameState`/`advance`/`AdvanceResult` 시그니처 일관. `games?: Record<string, ComponentType<{ onDone: () => void }>>`가 MissionPlayer(정의)·planet2(주입)에서 동일. `showMinigame(node, done)` 시그니처가 types.ts/runner.ts/MissionPlayer/모든 fake view에서 일관.
