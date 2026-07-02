# Mission02 "공감 거울의 비밀" 특별 파트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mission02의 `m2_q4_correct_hati` 와 `m2_end1` 사이에, 3종의 새 인터랙션(하티 대사 4줄 → 2거울 카드 드래그 + 라라 터치 reveal → 1거울 게이지 선택)으로 이루어진 "공감 거울의 비밀" 특별 파트를 추가한다.

**Architecture:** 기존 엔진(`DialogueRunner`)을 확장한다 — 별도 runner를 만들지 않는다. 연속 그래프에 새 노드 타입 `mirrors`, `gauge` 2개를 추가하고 runner의 `go()` 디스패처에 케이스만 붙인다. 특별 화면 UI는 `MissionPlayer.tsx`에 인라인으로 넣지 않고 별도 컴포넌트 `MirrorStage.tsx`로 격리하되, 드래그/스케일 원시 함수는 재사용한다. 각 특별 화면은 "1 노드 = 1 화면"으로 self-contained(내부 순차 게이팅·오답 재시도·reveal 을 노드가 소유)라, runner 는 노드가 끝나면 `node.next` 로만 진행한다.

**Tech Stack:** Capacitor 8 + React 19 + Vite + TypeScript, Vitest. 포인터 드래그는 기존 `onCardDown`(view.js 이식) 패턴을 따른다.

## Global Constraints

- 레이아웃 기준: **1280 × 800 CSS px, DPR 1.5, landscape 고정**. 세로 높이는 `100dvh`/`min-height:100svh` 사용, `100vh` 금지.
- 스테이지는 CSS scale 되므로 포인터 델타는 반드시 `stageScale()`로 나눈다 (기존 드래그 로직과 동일).
- 배너 문구는 데이터로 주입: **"공감 거울의 비밀"** (거울=mirror, 이미지 목업의 "겨울" 오타 무시).
- 화면 A 거울 이미지와 화면 B 거울 이미지는 **서로 다른 에셋**을 쓴다.
- 화면 A HUD(진행 스테퍼·레이더)는 **유지**. (이미지 배치 시 거울이 상단 HUD와 겹치지 않게 세로 위치 조정 — 이번 구현은 배치만, 정밀 위치는 후속.)
- 화면 A 카드 흐름: **순서 고정 (루미 먼저 → 라라)**. 카드 1장 재사용. 루미에 놓기 전 라라 거울은 비활성.
- 화면 A reveal(라라 속마음)은 **같은 화면에서 라라 거울 터치 → 말풍선 텍스트만 교체**. 노드의 `reveal` 필드를 지우면 통째로 제거 가능해야 한다.
- 화면 B는 **루미** ("지금은 혼자 있고 싶어"). 화면 A → B 는 **컷 전환**.
- 화면 B 게이지 오답: **게이지 0%로 리셋 후 재시도** (정답 고를 때까지).
- 아트 에셋(거울 프레임, 거울 내부 씬)은 후속 제공 → 이번엔 **플레이스홀더 경로**로 배선하고, 파일이 없어도 앱이 죽지 않게 한다.

---

## File Structure

- `src/scenes/planet/engine/types.ts` — MissionNode 에 `mirrors`/`gauge` 필드, 새 인터페이스(`MirrorTarget`/`MirrorReveal`/`GaugeOption`), `RunnerView.showMirrors/showGauge`, `MissionTheme.mirror/gaugeIcons` 추가.
- `src/scenes/planet/engine/runner.ts` — `typeOf` 유니온 확장 + `go()` 에 두 케이스 디스패치.
- `src/scenes/planet/engine/runner.test.ts` — 새 노드 디스패치 테스트 추가.
- `src/scenes/planet/planet1/mission02.json` — 특별 파트 노드 삽입 + `m2_q4_correct_hati.next` 재배선 + 엔딩 fx 재배치.
- `src/scenes/planet/planet1/theme.ts` — MISSION02_THEME 에 `lumi` friend, `mirror`, `gaugeIcons`, byNode 매핑, 엔딩 fx 재배치 반영.
- `src/scenes/planet/player/MirrorStage.tsx` — **신규**. 화면 A/B 전용 렌더 컴포넌트(프레젠테이셔널). props 로 vm 상태와 포인터 핸들러를 받는다.
- `src/scenes/planet/player/MissionPlayer.tsx` — vm 에 stage 상태 추가, `showMirrors`/`showGauge` 구현, 드래그/터치/게이지 핸들러, `<MirrorStage>` 렌더.
- `src/scenes/planet/player/mission.css` — 거울 스테이지/게이지 바 스타일.
- `public/assets/bg/mirror/` , `public/assets/ui/` — 플레이스홀더 에셋(단색 PNG 또는 기존 bg 재사용).

---

## Task 1: 스키마 확장 (types.ts + theme.ts)

**Files:**
- Modify: `src/scenes/planet/engine/types.ts`
- Modify: `src/scenes/planet/planet1/theme.ts`

**Interfaces:**
- Produces:
  - `MirrorTarget { friend: string; title: string; scene: string; line: string; onDrop: string }`
  - `MirrorReveal { prompt: string; friend: string; line: string }`
  - `GaugeOption { icon: string; title: string; desc: string; correct: boolean; onPick: string }`
  - `MissionNode` 추가 필드: `banner?`, `card?`, `targets?: MirrorTarget[]`, `reveal?: MirrorReveal`, `header?`, `lead?`, `scene?`, `options?: GaugeOption[]`
  - `RunnerView.showMirrors(node, done)` / `RunnerView.showGauge(node, done)`
  - `MissionTheme.mirror?: { frameA: string; frameB: string; scenes: Record<string,string> }`
  - `MissionTheme.gaugeIcons?: Record<string, { emoji: string; color: string }>`

- [ ] **Step 1: types.ts — 새 인터페이스 + MissionNode 필드 + type 유니온**

`MissionNode.type` 유니온을 확장하고 필드를 추가한다:

```ts
export interface MirrorTarget {
  friend: string;   // theme.friends 키 (예: "lumi" | "lala")
  title: string;    // 거울 위 뱃지 타이틀 (예: "루미의 마음")
  scene: string;    // theme.mirror.scenes 키 (거울 안쪽 배경)
  line: string;     // 거울 안 친구 말풍선
  onDrop: string;   // 카드 드롭 후 친구 반응 대사
}

export interface MirrorReveal {
  prompt: string;   // 터치 유도 하티 대사(하단 바)
  friend: string;   // 터치 대상 거울의 friend
  line: string;     // 터치 후 드러나는 속마음 말풍선
}

export interface GaugeOption {
  icon: string;     // theme.gaugeIcons 키 (예: "run" | "meditate")
  title: string;    // "계속 다가가기"
  desc: string;     // "용기를 내서 다가가 보자."
  correct: boolean; // 정답 여부
  onPick: string;   // 100% 도달 시 친구 반응 대사
}
```

`MissionNode` 에 다음 optional 필드를 추가 (기존 필드는 그대로):

```ts
  // type: "mirrors" (화면 A) 전용
  banner?: string;
  card?: string;
  targets?: MirrorTarget[];
  reveal?: MirrorReveal;
  // type: "gauge" (화면 B) 전용
  header?: string;   // 선택 패널 제목 ("어떻게 도와줄래?")
  lead?: string;     // 게이지 등장 전 하티 도입 대사
  scene?: string;    // 거울 안쪽 배경 키
  options?: GaugeOption[];
```

`type` 유니온을 확장:

```ts
  type?: "line" | "choice" | "branch" | "mirrors" | "gauge";
```

`RunnerView` 에 메서드 2개 추가:

```ts
  showMirrors(node: MissionNode, done: () => void): void;
  showGauge(node: MissionNode, done: () => void): void;
```

`MissionTheme` 에 필드 2개 추가:

```ts
  mirror?: { frameA: string; frameB: string; scenes: Record<string, string> };
  gaugeIcons?: Record<string, { emoji: string; color: string }>;
```

- [ ] **Step 2: theme.ts — MISSION02_THEME 에 lumi friend + mirror + gaugeIcons 추가**

`SOLA_SPRITES` 정의 아래에 루미 스프라이트 세트를 추가한다. 기존 mission1 루미 에셋을 재사용:

```ts
const M2_LUMI_SPRITES: SpriteSet = {
  char: {
    sad: `${A}/char/Lumi/lumi_sad.png`,
    confused: `${A}/char/Lumi/lumi_confused.png`,
    happy: `${A}/char/Lumi/lumi_happy.png`,
  },
  initial: "sad",
  byNode: {},
};
```

`MISSION02_THEME` 를 다음과 같이 수정한다:

1. `speakers` 에 lumi 추가:
```ts
    lumi: { name: "루미" },
```
2. `friends` 에 lumi 추가:
```ts
  friends: { lala: LALA_SPRITES, sola: SOLA_SPRITES, lumi: M2_LUMI_SPRITES },
```
3. 객체 끝에 `mirror`, `gaugeIcons` 추가:
```ts
  mirror: {
    frameA: `${A}/ui/mirror_frame_a.png`,
    frameB: `${A}/ui/mirror_frame_b.png`,
    scenes: {
      stadium: `${A}/bg/mirror/stadium.png`,
      study: `${A}/bg/mirror/study.png`,
      alone_room: `${A}/bg/mirror/alone_room.png`,
    },
  },
  gaugeIcons: {
    run: { emoji: "🏃", color: "#3b82f6" },
    meditate: { emoji: "🧘", color: "#22c55e" },
  },
```
4. `choiceIcons` 는 그대로 둔다(게이지는 gaugeIcons 사용).

- [ ] **Step 3: 빌드로 타입 검증**

Run: `npm run build`
Expected: PASS (타입 에러 없음). 아직 runner/view 는 안 고쳤지만, RunnerView 에 새 메서드를 추가했으므로 `MissionPlayer.tsx` 의 `view` 객체가 인터페이스를 만족하지 못해 **타입 에러가 날 수 있다.** 그럴 경우 Step 4 로 임시 stub 을 넣는다.

- [ ] **Step 4: MissionPlayer.tsx 에 임시 stub 추가 (컴파일 통과용)**

`view: RunnerView` 객체 안 `end()` 위에 임시 stub 을 넣어 컴파일을 통과시킨다 (Task 5/6 에서 실제 구현으로 교체):

```ts
      showMirrors(_node, done) { done(); },
      showGauge(_node, done) { done(); },
```

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/engine/types.ts src/scenes/planet/planet1/theme.ts src/scenes/planet/player/MissionPlayer.tsx
git commit -m "feat(planet): add mirrors/gauge node schema + mission2 lumi/mirror theme"
```

---

## Task 2: Runner 디스패치 + 테스트

**Files:**
- Modify: `src/scenes/planet/engine/runner.ts:18-52`
- Test: `src/scenes/planet/engine/runner.test.ts`

**Interfaces:**
- Consumes: `RunnerView.showMirrors/showGauge` (Task 1)
- Produces: runner 가 `mirrors`/`gauge` 노드를 만나면 해당 view 메서드를 호출하고, `done()` 콜백에서 `advance(node)` (즉 `node.next` 진행)한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`runner.test.ts` 의 `describe` 블록 안에 테스트를 추가한다:

```ts
  it("mirrors/gauge 노드는 view 메서드를 호출하고 done 시 next 로 진행한다", async () => {
    const seq: string[] = [];
    const md: MissionData = {
      id: "t2", title: "t2", start: "mir",
      nodes: [
        { id: "mir", type: "mirrors", next: "gau" },
        { id: "gau", type: "gauge", next: "fin" },
        { id: "fin", type: "line", speaker: "hati", text: "끝", next: null },
      ],
    };
    await new Promise<void>((resolve) => {
      const view: RunnerView = {
        reset() {},
        execCommands() {},
        showLine(node, onTyped) { seq.push("line:" + node.id); onTyped(); return Promise.resolve(); },
        showChoices() {},
        showMirrors(node, done) { seq.push("mirrors:" + node.id); Promise.resolve().then(done); },
        showGauge(node, done) { seq.push("gauge:" + node.id); Promise.resolve().then(done); },
        end() {
          expect(seq).toEqual(["mirrors:mir", "gauge:gau", "line:fin"]);
          resolve();
        },
      };
      new DialogueRunner(md, view).start();
    });
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/scenes/planet/engine/runner.test.ts`
Expected: FAIL — `showMirrors is not a function` 또는 `mirrors` 노드가 `line` 으로 처리되어 seq 불일치.

- [ ] **Step 3: runner.ts 수정**

`typeOf` 반환 유니온을 확장:

```ts
  private typeOf(n: MissionNode): "line" | "choice" | "branch" | "mirrors" | "gauge" {
    return n.type || (n.choices ? "choice" : "line");
  }
```

`go()` 의 branch/choice 분기 아래, `typeLine(node)` 호출 직전에 두 케이스를 추가:

```ts
    if (t === "mirrors") {
      this.view.showMirrors(node, () => this.advance(node));
      return;
    }
    if (t === "gauge") {
      this.view.showGauge(node, () => this.advance(node));
      return;
    }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/scenes/planet/engine/runner.test.ts`
Expected: PASS (기존 테스트 + 새 테스트 모두)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/engine/runner.ts src/scenes/planet/engine/runner.test.ts
git commit -m "feat(planet): dispatch mirrors/gauge nodes in DialogueRunner"
```

---

## Task 3: mission02.json 특별 파트 노드 삽입

**Files:**
- Modify: `src/scenes/planet/planet1/mission02.json`

**Interfaces:**
- Consumes: `mirrors`/`gauge` 스키마 (Task 1)
- Produces: 노드 id `m2_secret_intro1..4`, `m2_mirror_ab`, `m2_lumi_gauge`, `m2_secret_wake`, `m2_secret_lesson`. 그래프: `m2_q4_correct_hati → m2_secret_intro1 → … → m2_end1`.

- [ ] **Step 1: `m2_q4_correct_hati` 재배선**

기존:
```json
{ "id": "m2_q4_correct_hati", "type": "line", "speaker": "hati", "text": "좋아! 친구는 지금 속상한 마음이 커. 함께 있어주는 것만으로도 큰 힘이 될 수 있어.", "hold": false, "next": "m2_end1" },
```
`"next": "m2_end1"` → `"next": "m2_secret_intro1"` 로 변경.

- [ ] **Step 2: 특별 파트 노드 삽입 (m2_q4_correct_hati 다음, m2_end1 앞)**

```json
    { "id": "m2_secret_intro1", "type": "line", "speaker": "hati", "text": "좋아, 이제 공감은 좋은 말이나 행동을 하는 것이 아니라 상대방에게 필요한 말과 행동을 선택하는 것이라는 걸 알게 되었어.", "next": "m2_secret_intro2" },
    { "id": "m2_secret_intro2", "type": "line", "speaker": "hati", "text": "앗, 공감 거울이 깨어나려고 해! 하지만 아직 완전히 깨어나지는 않았어.", "next": "m2_secret_intro3" },
    { "id": "m2_secret_intro3", "type": "line", "speaker": "hati", "text": "거울 속에 숨겨진 마지막 비밀을 알아내야 해!", "next": "m2_secret_intro4" },
    { "id": "m2_secret_intro4", "type": "line", "speaker": "hati", "text": "친구에게 위로의 말을 건네봐.", "next": "m2_mirror_ab" },

    {
      "id": "m2_mirror_ab", "type": "mirrors",
      "banner": "공감 거울의 비밀",
      "prompt": "친구에게 전하고 싶은 말을 드래그해서 거울 속 친구에게 전해 주세요!",
      "card": "괜찮아! 다음에 잘 하면 돼!",
      "targets": [
        { "friend": "lumi", "title": "루미의 마음", "scene": "stadium", "line": "축구 경기에서 져서 아쉬워.", "onDrop": "응 고마워." },
        { "friend": "lala", "title": "라라의 마음", "scene": "study", "line": "시험 점수가 안 나와서 속상해.", "onDrop": "그런데 아직 속상해." }
      ],
      "reveal": {
        "prompt": "똑같은 응원의 말을 건넸는데, 왜 라라의 거울은 빛나지 않을까? 거울 속 라라를 터치해서 진짜 속마음을 알아보자.",
        "friend": "lala",
        "line": "응원해 준 건 고맙지만, 내 속상한 마음을 먼저 알아주길 바랐어."
      },
      "next": "m2_lumi_gauge"
    },

    {
      "id": "m2_lumi_gauge", "type": "gauge",
      "banner": "공감 거울의 비밀",
      "speaker": "lumi", "scene": "alone_room",
      "text": "지금은 혼자 있고 싶어.",
      "lead": "속상한 친구를 어떻게 도와줄 수 있을까? 먼저 계속 다가가 볼까?",
      "header": "어떻게 도와줄래?",
      "prompt": "진행도 100%가 되도록 드래그해봐!",
      "options": [
        { "icon": "run", "title": "계속 다가가기", "desc": "용기를 내서 다가가 보자.", "correct": false, "onPick": "걱정해 주는 건 좋지만, 지금은 내 감정을 정리할 혼자만의 시간이 필요해." },
        { "icon": "meditate", "title": "기다려주기", "desc": "조금 기다려주며 지켜보자.", "correct": true, "onPick": "기다려줘서 고마워. 지금은 내 감정을 정리할 혼자만의 시간이 필요해." }
      ],
      "next": "m2_secret_wake"
    },

    { "id": "m2_secret_wake", "type": "line", "speaker": "hati", "text": "공감 거울이 깨어났어!", "next": "m2_secret_lesson" },
    { "id": "m2_secret_lesson", "type": "line", "speaker": "hati", "text": "공감은 상대방의 마음에 먼저 집중하는 것이야. 내 생각과 판단은 잠시 접어두기로 해.", "next": "m2_end1" },
```

- [ ] **Step 3: 엔딩 노드는 그대로 둔다 (fx 재배치 안 함)**

**공감카드(fx_empathy_card)는 미션 엔딩마다 등장하는 공통 요소**이므로 `m2_end2` 에 그대로 유지한다. 거울 깨어남(`fx_mirror_wake`)도 `m2_end1` 에 그대로 유지한다. 즉 `m2_end1/m2_end2/m2_end3` 는 **수정하지 않는다.** 새 노드 `m2_secret_wake`/`m2_secret_lesson` 은 fx 없는 순수 하티 라인이다 (mirror_wake/empathy_card 중복 없음). 이 Step 은 확인만 하고 코드 변경 없음.

- [ ] **Step 4: JSON 유효성 + 그래프 연결 검증**

Run: `node -e "const d=require('./src/scenes/planet/planet1/mission02.json'); const ids=new Set(d.nodes.map(n=>n.id)); const bad=[]; for(const n of d.nodes){ const nx=[n.next, ...(n.targets? []:[]), n.reveal?undefined:undefined].filter(x=>x!=null); for(const t of nx){ if(!ids.has(t)) bad.push(n.id+' -> '+t);} } console.log('nodes',d.nodes.length,'dangling',bad);"`
Expected: `dangling []` (모든 `next` 가 존재하는 노드를 가리킴). `nodes` 개수는 기존 + 8.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet1/mission02.json
git commit -m "feat(planet1): insert empathy-mirror secret part into mission02"
```

---

## Task 4: MirrorStage 컴포넌트 + CSS (정적 렌더)

**Files:**
- Create: `src/scenes/planet/player/MirrorStage.tsx`
- Modify: `src/scenes/planet/player/mission.css`
- Modify: `src/scenes/planet/player/MissionPlayer.tsx` (vm 필드 + 렌더 배선)

**Interfaces:**
- Produces: `MirrorStage` 컴포넌트. props:
  ```ts
  interface MirrorStageProps {
    stage: "mirrors" | "gauge";
    theme: MissionTheme;
    banner: string;
    prompt: string;
    // mirrors
    card: string;                        // "" 이면 카드 숨김
    targets: MirrorVM[];                 // { friend,title,scene,line,bubble,done }
    activeTarget: number;                // 현재 드롭 가능한 타깃 idx, -1=없음
    revealPhase: "none"|"await"|"done";
    revealFriend: string;
    // gauge
    friend: string; scene: string; friendLine: string;
    header: string;
    options: GaugeVM[];                  // { icon,title,desc,fill }
    // handlers
    cardRef: React.RefObject<HTMLButtonElement>;
    mirrorRefs: React.MutableRefObject<(HTMLDivElement|null)[]>;
    onCardDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onMirrorTouch: (idx: number) => void;
    onGaugeDown: (e: React.PointerEvent<HTMLDivElement>, idx: number) => void;
  }
  ```
  타입 `MirrorVM = { friend:string; title:string; scene:string; line:string; bubble:string; done:boolean }`,
  `GaugeVM = { icon:string; title:string; desc:string; fill:number }` 는 MirrorStage.tsx 상단에 export 한다.

- [ ] **Step 1: vm 필드 추가 (MissionPlayer.tsx)**

`VM` 인터페이스에 stage 상태를 추가:

```ts
  stage: "none" | "mirrors" | "gauge";
  sBanner: string;
  sPrompt: string;
  // mirrors
  sCard: string;
  sTargets: { friend: string; title: string; scene: string; line: string; bubble: string; done: boolean }[];
  sActive: number;
  sRevealPhase: "none" | "await" | "done";
  sRevealFriend: string;
  // gauge
  sFriend: string;
  sScene: string;
  sFriendLine: string;
  sHeader: string;
  sOptions: { icon: string; title: string; desc: string; fill: number }[];
```

`vm` 초기값과 `reset()` 의 `Object.assign` 양쪽에 동일 기본값을 넣는다:

```ts
    stage: "none", sBanner: "", sPrompt: "",
    sCard: "", sTargets: [], sActive: -1, sRevealPhase: "none", sRevealFriend: "",
    sFriend: "", sScene: "", sFriendLine: "", sHeader: "", sOptions: [],
```

- [ ] **Step 2: MirrorStage.tsx 작성 (프레젠테이셔널)**

거울 프레임 이미지는 `onError` 로 숨겨 파일 부재 시에도 레이아웃이 유지되게 한다. 전체 마크업:

```tsx
import type { MissionTheme } from "../engine/types";
import type { RefObject, MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

export type MirrorVM = { friend: string; title: string; scene: string; line: string; bubble: string; done: boolean };
export type GaugeVM = { icon: string; title: string; desc: string; fill: number };

export interface MirrorStageProps {
  stage: "mirrors" | "gauge";
  theme: MissionTheme;
  banner: string; prompt: string;
  card: string; targets: MirrorVM[]; activeTarget: number;
  revealPhase: "none" | "await" | "done"; revealFriend: string;
  friend: string; scene: string; friendLine: string; header: string; options: GaugeVM[];
  cardRef: RefObject<HTMLButtonElement | null>;
  mirrorRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  onCardDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMirrorTouch: (idx: number) => void;
  onGaugeDown: (e: ReactPointerEvent<HTMLDivElement>, idx: number) => void;
}

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
};

export default function MirrorStage(p: MirrorStageProps) {
  const t = p.theme;
  return (
    <div id="mirrorStage" className={`mstage ${p.stage}`}>
      <div className="ms-banner">
        <span className="ms-pill">특별 미션</span>
        <h2 className="ms-title">{p.banner}</h2>
        <p className="ms-sub">친구의 마음을 이해하고, 따뜻한 말을 전해 보세요!</p>
      </div>

      {p.stage === "mirrors" && (
        <div className="ms-mirrors">
          {p.targets.map((tg, i) => (
            <div className="ms-col" key={i}>
              <div className="ms-badge"><b>{i + 1}</b> {tg.title}</div>
              <div
                className={`ms-mirror${p.activeTarget === i ? " active" : ""}${p.revealPhase !== "none" && p.revealFriend === tg.friend ? " touchable" : ""}`}
                ref={(el) => { p.mirrorRefs.current[i] = el; }}
                onClick={() => p.onMirrorTouch(i)}
              >
                <img className="ms-frame" src={t.mirror?.frameA} alt="" onError={hideOnError} />
                {tg.scene && t.mirror?.scenes[tg.scene] && (
                  <img className="ms-scene" src={t.mirror.scenes[tg.scene]} alt="" onError={hideOnError} />
                )}
                <img className="ms-char" src={t.friends[tg.friend]?.char[t.friends[tg.friend]?.initial]} alt={tg.title} />
                <div className="ms-bubble">{tg.bubble}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {p.stage === "gauge" && (
        <div className="ms-gaugeWrap">
          <div className="ms-mirror single active">
            <img className="ms-frame" src={t.mirror?.frameB} alt="" onError={hideOnError} />
            {p.scene && t.mirror?.scenes[p.scene] && (
              <img className="ms-scene" src={t.mirror.scenes[p.scene]} alt="" onError={hideOnError} />
            )}
            <img className="ms-char" src={t.friends[p.friend]?.char[t.friends[p.friend]?.initial]} alt={p.friend} />
            <div className="ms-bubble">{p.friendLine}</div>
          </div>

          <div className="ms-gauge">
            <div className="ms-gauge-head">✧ {p.header} ✧</div>
            {p.options.map((o, i) => {
              const deco = t.gaugeIcons?.[o.icon] || { emoji: "💭", color: "#64748b" };
              return (
                <div className="ms-opt" key={i} onPointerDown={(e) => p.onGaugeDown(e, i)}>
                  <div className="ms-opt-ico" style={{ color: deco.color }}>{deco.emoji}</div>
                  <div className="ms-opt-body">
                    <div className="ms-opt-title">{i + 1}. {o.title}</div>
                    <div className="ms-opt-desc">{o.desc}</div>
                    <div className="ms-bar">
                      <span className="ms-bar-label">진행도</span>
                      <div className="ms-bar-track">
                        <div className="ms-bar-fill" style={{ width: `${o.fill}%`, background: deco.color }} />
                      </div>
                      <span className="ms-bar-pct">{Math.round(o.fill)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="ms-guidebar">
        <img className="ms-hati" src="/assets/char/Hati/hati_explaining.png" alt="하티" onError={hideOnError} />
        <p className="ms-guidetext">{p.prompt}</p>
        {p.stage === "mirrors" && p.card && (
          <button className="ms-card" ref={p.cardRef} onPointerDown={p.onCardDown} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            {p.card}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: mission.css 에 스테이지 스타일 추가**

`mission.css` 맨 아래에 추가 (좌표는 1280×800 기준의 대략치 — 후속 미세조정 전제):

```css
#mirrorStage { position: absolute; inset: 0; z-index: 30; display: none; }
#stage .mstage { display: block; }
.ms-banner { position: absolute; top: 8px; left: 0; right: 0; text-align: center; }
.ms-pill { display: inline-block; padding: 2px 14px; border-radius: 999px; background: #b4863b; color: #1a1200; font-weight: 700; font-size: 20px; }
.ms-title { margin: 4px 0 0; font-size: 44px; color: #ffe9b0; text-shadow: 0 2px 8px #000; }
.ms-sub { margin: 2px 0 0; font-size: 22px; color: #dbe4ff; }
.ms-mirrors { position: absolute; top: 150px; left: 40px; right: 40px; display: flex; justify-content: center; gap: 60px; }
.ms-col { display: flex; flex-direction: column; align-items: center; }
.ms-badge { padding: 4px 16px; border-radius: 999px; border: 2px solid #b4863b; color: #ffe9b0; font-size: 22px; margin-bottom: 8px; }
.ms-badge b { color: #fff; }
.ms-mirror { position: relative; width: 420px; height: 420px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 40px rgba(120,160,255,.35); }
.ms-mirror.single { width: 480px; height: 480px; }
.ms-mirror.active { outline: 4px solid rgba(120,200,255,.7); }
.ms-mirror.touchable { cursor: pointer; animation: msPulse 1.2s infinite; }
@keyframes msPulse { 0%,100% { box-shadow: 0 0 40px rgba(120,160,255,.35);} 50% { box-shadow: 0 0 70px rgba(180,220,255,.8);} }
.ms-frame { position: absolute; inset: -6%; width: 112%; height: 112%; object-fit: contain; z-index: 2; pointer-events: none; }
.ms-scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
.ms-char { position: absolute; bottom: 6%; left: 50%; transform: translateX(-50%); height: 60%; z-index: 1; }
.ms-bubble { position: absolute; top: 30%; right: 6%; max-width: 46%; background: #fff; color: #222; border-radius: 16px; padding: 8px 12px; font-size: 20px; z-index: 3; }
.ms-mirror.over { filter: brightness(1.15); }
.ms-gaugeWrap { position: absolute; top: 150px; left: 40px; right: 40px; display: flex; gap: 40px; align-items: flex-start; }
.ms-gauge { flex: 1; }
.ms-gauge-head { text-align: center; font-size: 30px; color: #ffe9b0; margin-bottom: 12px; }
.ms-opt { display: flex; gap: 14px; align-items: center; background: rgba(10,20,45,.8); border: 2px solid #b4863b55; border-radius: 16px; padding: 14px; margin-bottom: 14px; cursor: grab; touch-action: none; }
.ms-opt-ico { font-size: 40px; }
.ms-opt-body { flex: 1; }
.ms-opt-title { font-size: 26px; color: #fff; font-weight: 700; }
.ms-opt-desc { font-size: 20px; color: #cbd5e1; margin: 2px 0 8px; }
.ms-bar { display: flex; align-items: center; gap: 8px; }
.ms-bar-label { font-size: 18px; color: #ffd27a; }
.ms-bar-track { flex: 1; height: 16px; background: #1e293b; border-radius: 999px; overflow: hidden; }
.ms-bar-fill { height: 100%; border-radius: 999px; transition: width 60ms linear; }
.ms-bar-pct { font-size: 18px; color: #fff; min-width: 48px; text-align: right; }
.ms-guidebar { position: absolute; left: 40px; right: 40px; bottom: 24px; min-height: 96px; display: flex; align-items: center; gap: 18px; background: rgba(8,16,38,.85); border: 2px solid #b4863b55; border-radius: 20px; padding: 12px 20px; }
.ms-hati { height: 84px; }
.ms-guidetext { flex: 1; font-size: 24px; color: #eaf2ff; }
.ms-card { border: none; background: linear-gradient(#eafbe7,#c8f0c0); color: #14532d; font-size: 24px; font-weight: 800; border-radius: 20px; padding: 16px 22px; box-shadow: 0 8px 20px rgba(0,0,0,.4); cursor: grab; touch-action: none; }
.ms-card.dragging { z-index: 60; }
.ms-card.snapback { transition: transform .24s ease; }
```

- [ ] **Step 4: MissionPlayer 에서 조건부 렌더 배선**

`import MirrorStage from "./MirrorStage";` 추가. `#fxLayer` 바로 위(또는 stage 자식 마지막)에 렌더:

```tsx
        {vm.stage !== "none" && (
          <MirrorStage
            stage={vm.stage}
            theme={theme}
            banner={vm.sBanner}
            prompt={vm.sPrompt}
            card={vm.sCard}
            targets={vm.sTargets}
            activeTarget={vm.sActive}
            revealPhase={vm.sRevealPhase}
            revealFriend={vm.sRevealFriend}
            friend={vm.sFriend}
            scene={vm.sScene}
            friendLine={vm.sFriendLine}
            header={vm.sHeader}
            options={vm.sOptions}
            cardRef={msCardRef}
            mirrorRefs={msMirrorRefs}
            onCardDown={onMirrorCardDown}
            onMirrorTouch={onMirrorTouch}
            onGaugeDown={onGaugeDown}
          />
        )}
```

이 Step 에서는 아직 핸들러/refs 가 없으므로, 임시로 refs 와 no-op 핸들러를 선언해 컴파일만 통과시킨다 (Task 5/6 에서 실제 구현):

```tsx
  const msCardRef = useRef<HTMLButtonElement>(null);
  const msMirrorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const onMirrorCardDown = (_e: ReactPointerEvent<HTMLButtonElement>) => {};
  const onMirrorTouch = (_idx: number) => {};
  const onGaugeDown = (_e: ReactPointerEvent<HTMLDivElement>, _idx: number) => {};
```

- [ ] **Step 5: 정적 렌더 수동 확인용 임시 showMirrors stub 강화**

Task 1 의 stub 을 잠시 아래로 바꿔, 화면 A 정적 배치를 눈으로 확인한다 (확인 후 Task 5 에서 교체):

```ts
      showMirrors(node, done) {
        vm.stage = "mirrors";
        vm.sBanner = node.banner || "";
        vm.sPrompt = node.prompt || "";
        vm.sCard = node.card || "";
        vm.sTargets = (node.targets || []).map((t) => ({ ...t, bubble: t.line, done: false }));
        vm.sActive = 0;
        render();
        window.setTimeout(done, 4000); // 임시: 4초 후 자동 통과
      },
```

Run: `npm run dev` → 브라우저에서 mission02 진입 → q4 정답까지 진행 → intro 4줄 뒤 거울 2개 + 카드 + 배너가 화면에 뜨는지 확인.
Expected: 좌/우 거울, 뱃지("1 루미의 마음"/"2 라라의 마음"), 각 말풍선, 하단 하티바 + 초록 카드가 보인다. (프레임/씬 이미지는 플레이스홀더 부재로 안 보일 수 있으나 레이아웃은 유지.)

- [ ] **Step 6: Commit**

```bash
git add src/scenes/planet/player/MirrorStage.tsx src/scenes/planet/player/mission.css src/scenes/planet/player/MissionPlayer.tsx
git commit -m "feat(planet): MirrorStage component + mirror/gauge static layout"
```

---

## Task 5: 화면 A — 이중 타깃 카드 드래그 + 순차 게이팅 + 라라 터치 reveal

**Files:**
- Modify: `src/scenes/planet/player/MissionPlayer.tsx`

**Interfaces:**
- Consumes: vm.stage/sTargets/sActive/sCard/sRevealPhase (Task 4), `stageScale()` (기존)
- Produces: 완성된 `showMirrors`, `onMirrorCardDown`, `onMirrorTouch`.

- [ ] **Step 1: showMirrors 실제 구현 (Task 4 stub 교체)**

```ts
      showMirrors(node, done) {
        updateScene(node);           // 배경/레이더/HUD 유지
        vm.stage = "mirrors";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.sBanner = node.banner || "";
        vm.sPrompt = node.prompt || "";
        vm.sCard = node.card || "";
        vm.sTargets = (node.targets || []).map((t) => ({ ...t, bubble: t.line, done: false }));
        vm.sActive = 0;              // 순서 고정: 첫 타깃(루미)부터
        vm.sRevealPhase = "none";
        vm.sRevealFriend = node.reveal?.friend || "";
        (mirrorsDone as { fn?: () => void }).fn = done;
        (mirrorsReveal as { r?: import("../engine/types").MirrorReveal | null }).r = node.reveal || null;
        render();
        audio.play("pop");
      },
```

`view` 객체 밖(useEffect 내부 상단)에 헬퍼 참조를 선언:

```ts
    const mirrorsDone: { fn?: () => void } = {};
    const mirrorsReveal: { r?: import("../engine/types").MirrorReveal | null } = {};
```

- [ ] **Step 2: onMirrorCardDown — 순차 이중 타깃 드롭**

기존 `overFriend` 를 참고해 "특정 거울 위인지" 판정하는 `overMirror(idx,x,y)` 를 추가하고, 드롭 로직을 작성한다:

```ts
  const overMirror = (idx: number, x: number, y: number) => {
    const el = msMirrorRefs.current[idx];
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const m = 12;
    return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
  };
```

`onMirrorCardDown` 구현 (기존 `onCardDown` 구조 재사용, 드롭 타깃을 `vm.sActive` 거울로 제한):

```ts
  const onMirrorCardDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (vm.stage !== "mirrors" || vm.sActive < 0) return;
    e.preventDefault(); e.stopPropagation();
    const card = e.currentTarget;
    const scale = stageScale();
    const startX = e.clientX, startY = e.clientY;
    const active = vm.sActive;
    card.classList.add("dragging");
    audio.play("pop");
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale, dy = (ev.clientY - startY) / scale;
      card.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
      msMirrorRefs.current[active]?.classList.toggle("over", overMirror(active, ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      msMirrorRefs.current[active]?.classList.remove("over");
      const dropped = overMirror(active, ev.clientX, ev.clientY);
      if (dropped) {
        audio.play("drop");
        vm.sTargets[active].bubble = vm.sTargets[active].onDrop; // 친구 반응으로 교체
        vm.sTargets[active].done = true;
        card.classList.remove("dragging");
        card.style.transform = "";
        // 다음 미완료 타깃으로 이동, 없으면 카드 숨기고 완료 처리
        const nextIdx = vm.sTargets.findIndex((t) => !t.done);
        vm.sActive = nextIdx;
        if (nextIdx < 0) { vm.sCard = ""; onMirrorAllDropped(); }
        render();
      } else {
        audio.play("whoosh");
        card.classList.remove("dragging");
        card.classList.add("snapback");
        card.style.transform = "";
        window.setTimeout(() => card.classList.remove("snapback"), 240);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
```

- [ ] **Step 3: 둘 다 드롭 후 처리 — reveal 있으면 터치 대기, 없으면 완료**

`onMirrorAllDropped` 와 `onMirrorTouch` 를 추가한다. reveal 프롬프트는 하단 가이드바(`vm.sPrompt`)에 띄운다:

```ts
  const onMirrorAllDropped = () => {
    const r = mirrorsReveal.r;
    if (r) {
      vm.sPrompt = r.prompt;          // 하티: "…라라를 터치…"
      vm.sRevealPhase = "await";
      audio.play("stage");
    } else {
      finishMirrors();
    }
  };
  const onMirrorTouch = (idx: number) => {
    if (vm.stage !== "mirrors" || vm.sRevealPhase !== "await") return;
    const r = mirrorsReveal.r;
    if (!r || vm.sTargets[idx].friend !== r.friend) return; // 지정 거울만
    vm.sTargets[idx].bubble = r.line;   // 속마음으로 교체
    vm.sRevealPhase = "done";
    audio.play("reveal");
    render();
    window.setTimeout(finishMirrors, 1600);
  };
  const finishMirrors = () => {
    const fn = mirrorsDone.fn; mirrorsDone.fn = undefined;
    vm.stage = "none";
    render();
    fn?.();
  };
```

> `finishMirrors` 는 `vm.stage="none"` 으로 스테이지를 닫고 runner 의 `done()`(→ `advance` → `m2_lumi_gauge`) 을 호출한다.

- [ ] **Step 4: 수동 검증 (화면 A 전체 플로우)**

Run: `npm run dev` → mission02 → q4 정답 → intro 4줄 → 거울 화면.
Expected 순서:
1. 처음엔 **루미 거울만 활성**(outline). 카드를 라라에 놓으면 무시(스냅백), 루미에 놓으면 루미 말풍선이 "응 고마워."로 바뀌고 카드가 라라 쪽으로 재활성.
2. 카드를 라라에 놓으면 라라 말풍선이 "그런데 아직 속상해."로 바뀌고 카드 사라짐.
3. 하단 바가 "…거울 속 라라를 터치…"로 바뀌고 라라 거울이 pulse.
4. 라라 거울 터치 → 라라 말풍선이 "응원해 준 건 고맙지만…"으로 교체 → 1.6초 뒤 화면 B로 전환.
5. 루미 거울을 터치해도 아무 일 없음(지정 거울만).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/player/MissionPlayer.tsx
git commit -m "feat(planet): screen A dual-target card drag + lala touch reveal"
```

---

## Task 6: 화면 B — 게이지 드래그 선택 + 오답 리셋/정답 진행

**Files:**
- Modify: `src/scenes/planet/player/MissionPlayer.tsx`

**Interfaces:**
- Consumes: vm.stage/sFriend/sScene/sFriendLine/sHeader/sOptions/sPrompt (Task 4)
- Produces: 완성된 `showGauge`, `onGaugeDown`.

- [ ] **Step 1: showGauge 실제 구현 (Task 1 stub 교체)**

먼저 하티 도입 대사(`lead`)를 잠깐 하티바에 보여준 뒤 게이지를 노출한다. `gaugeDone`/`gaugeNode` 참조를 useEffect 상단에 선언:

```ts
    const gaugeDone: { fn?: () => void } = {};
    const gaugeNode: { n?: MissionNode } = {};
```

```ts
      showGauge(node, done) {
        updateScene(node);
        vm.stage = "gauge";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.sBanner = node.banner || "";
        vm.sFriend = node.speaker && node.speaker !== "hati" ? node.speaker : "lumi";
        vm.sScene = node.scene || "";
        vm.sFriendLine = node.text || "";
        vm.sHeader = node.header || "";
        vm.sPrompt = node.lead || "";                 // 먼저 도입 대사
        vm.sOptions = (node.options || []).map((o) => ({ icon: o.icon, title: o.title, desc: o.desc, fill: 0 }));
        gaugeDone.fn = done;
        gaugeNode.n = node;
        render();
        audio.play("pop");
        // 2.2초 뒤 하티바를 드래그 안내로 교체(게이지는 계속 조작 가능)
        window.setTimeout(() => {
          if (vm.stage === "gauge") { vm.sPrompt = node.prompt || ""; render(); }
        }, 2200);
      },
```

- [ ] **Step 2: onGaugeDown — 세로/가로 드래그로 0→100% 채우기**

바 트랙을 기준으로 포인터 x 위치를 % 로 환산해 해당 옵션의 fill 을 채운다. 100% 도달 시 확정:

```ts
  const onGaugeDown = (e: ReactPointerEvent<HTMLDivElement>, idx: number) => {
    if (vm.stage !== "gauge") return;
    e.preventDefault(); e.stopPropagation();
    const optEl = e.currentTarget;
    const track = optEl.querySelector(".ms-bar-track") as HTMLElement | null;
    const setFrom = (clientX: number) => {
      const r = (track ?? optEl).getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
      vm.sOptions[idx].fill = pct;
      render();
      return pct;
    };
    audio.play("pop");
    setFrom(e.clientX);
    const move = (ev: PointerEvent) => setFrom(ev.clientX);
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const pct = setFrom(ev.clientX);
      if (pct >= 100) commitGauge(idx);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
```

- [ ] **Step 3: commitGauge — 정답/오답 처리**

정답이면 친구 반응 → 이후 하티 대사로 진행(gaugeDone). 오답이면 친구 반응 후 게이지 리셋하고 재시도:

```ts
  const commitGauge = (idx: number) => {
    const node = gaugeNode.n;
    const opt = node?.options?.[idx];
    if (!opt) return;
    vm.sFriendLine = opt.onPick;          // 루미 반응 말풍선
    render();
    if (opt.correct) {
      audio.play("correct");
      window.setTimeout(() => {
        const fn = gaugeDone.fn; gaugeDone.fn = undefined;
        vm.stage = "none"; render(); fn?.();
      }, 1800);
    } else {
      audio.play("wrong");
      window.setTimeout(() => {
        if (vm.stage !== "gauge") return;
        vm.sOptions = vm.sOptions.map((o) => ({ ...o, fill: 0 })); // 게이지 리셋
        vm.sFriendLine = node?.text || vm.sFriendLine;             // 원래 대사로 복귀
        render();
      }, 1800);
    }
  };
```

- [ ] **Step 4: 수동 검증 (화면 B 전체 플로우)**

Run: `npm run dev` → 화면 A 통과 후 화면 B.
Expected:
1. 좌측에 루미 단일 거울("지금은 혼자 있고 싶어") + 우측 게이지 2개. 하단 바가 처음엔 "…먼저 계속 다가가 볼까?" → 2.2초 뒤 "진행도 100%가 되도록 드래그해봐!".
2. "계속 다가가기" 바를 100%까지 끌면(오답) 루미가 "걱정해 주는 건 좋지만…" → 1.8초 뒤 게이지 0% 리셋.
3. "기다려주기" 바를 100%까지 끌면(정답) 루미가 "기다려줘서 고마워…" → 1.8초 뒤 화면 B 닫히고 "공감 거울이 깨어났어!"(하티, fx 없음) → "공감은…"(하티, fx 없음) → 엔딩 m2_end1~3(기존 그대로: 거울 깨어남 fx → **공감카드 등장** → 빛 복귀 + 다음 미션 버튼).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/player/MissionPlayer.tsx
git commit -m "feat(planet): screen B gauge drag selection with wrong-reset/correct-advance"
```

---

## Task 7: 플레이스홀더 에셋 + 전체 플레이스루 검증

**Files:**
- Create: `public/assets/bg/mirror/stadium.png`, `study.png`, `alone_room.png` (플레이스홀더)
- Create: `public/assets/ui/mirror_frame_a.png`, `mirror_frame_b.png` (플레이스홀더)

**Interfaces:**
- Consumes: theme.mirror 경로 (Task 1)

- [ ] **Step 1: 플레이스홀더 이미지 배치**

아트 확정 전까지 레이아웃 확인용 단색/반투명 PNG 를 넣는다. 기존 bg 를 복사해 임시 사용해도 된다. (실제 아트는 후속 교체 — 경로만 맞으면 됨.) `onError` 가드 덕분에 파일이 없어도 앱은 정상 동작하므로, 이 Step 은 선택적이며 아트 도착 시 교체한다.

- [ ] **Step 2: 빌드 + 린트 + 테스트 전체 통과**

Run: `npm run build && npm run lint && npm test`
Expected: 모두 PASS.

- [ ] **Step 3: 전체 미션 플레이스루 (회귀 확인)**

Run: `npm run dev` → mission02 처음부터 끝까지 진행.
Expected: 기존 라라/솔라 Q1~Q4 정상 → 특별 파트(intro 4줄 → 화면 A → 화면 B) 정상 → 엔딩 연출(거울 깨어남/공감카드/빛 복귀) 정상, fx 중복 없음, "다음 미션으로" 버튼 노출.

- [ ] **Step 4: Commit**

```bash
git add public/assets
git commit -m "chore(planet): placeholder assets for empathy-mirror stage"
```

---

## Self-Review 결과

- **Spec 커버리지:** 하티 4줄(Task3), 2거울 카드 드래그(Task5), 순차 게이팅(Task5 sActive), 라라 터치 reveal(Task5), 루미 컷 전환(Task3 next), 게이지 선택(Task6), 오답 리셋(Task6 commitGauge), 정답 진행+엔딩(Task6/3), HUD 유지(showMirrors/showGauge 의 updateScene 호출), 다른 거울 이미지(frameA/frameB), 게이지 아이콘/설명 데이터(GaugeOption) — 전부 태스크에 매핑됨.
- **플레이스홀더:** 아트 에셋만 후속(Task7 명시). 코드 스텝엔 실제 코드/명령 포함.
- **타입 일관성:** `showMirrors/showGauge(node, done)` 시그니처가 types.ts·runner.ts·MissionPlayer.tsx 에서 일치. `MirrorVM/GaugeVM` 은 MirrorStage.tsx 에서 export, vm 필드와 형태 일치.

## 확정 사항 (사용자 확인 완료)

1. **공감카드 = 미션 엔딩 공통 요소** → 기존 엔딩(m2_end2)에 유지, 특별 파트로 이동 안 함. 엔딩 노드 fx 무수정 (Task3 Step3).
2. **게이지 = 끌어서 채우기** (포인터 x → %, Task6 Step2 그대로).
3. **위치/겹침/이미지는 지금 신경 안 씀** — 동작 우선. 아트는 후속 대량 교체 예정, `onError` 가드로 파일 부재에도 앱 정상. Task7 플레이스홀더도 선택적.
