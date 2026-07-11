# 행성3 미션3 (stage2) NPC 감정 녹이기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 행성3 3D 얼음 숲 stage2에, 감정 클립(lv0~lv3)을 가진 NPC 3명을 배치해 근접 대화 2지선택으로 감정을 lv0→lv3까지 녹이는 미션3 미니게임을 구현한다.

**Architecture:** stage1의 "순수 로직(`collectgame.ts`) / 3D 렌더(`bubbles.ts`)" 분리를 그대로 따른다. `npcgame.ts`(순수 상태머신, 단위 테스트) + `npcs.ts`(GLB·감정 crossfade)로 나누고, `stages.ts`의 임시 버튼을 실제 콘텐츠로 교체한다. 레퍼런스 `threejs_test/index.html`의 "모든 클립 weight 0 재생 + `crossFadeTo`" 감정 전환 기법을 이식한다.

**Tech Stack:** Capacitor 8 / React 19 / Vite / three.js 0.160 (GLTFLoader, AnimationMixer) / Vitest.

## Global Constraints

- three.js는 `three` + `three/addons/` importmap 별칭으로만 import (기존 world 파일 관례).
- GLB 에셋 파일명은 영문·공백 없음 (CLAUDE.md). `public/assets/planet3/world/models/` 아래 배치.
- `player/` 바깥이 아니라 미션 엔진 내부이므로 FixedStage 규칙 대상 아님 — 이 world는 자체 캔버스를 쓴다. 좌표·CSS는 기존 world 파일 관례를 따른다.
- popup DOM은 컨테이너(`.efg-overlay`)에 append → CSS는 `.efg-overlay .popup-*` 스코프(EmpathyFuelGame.css)를 상속한다.
- 타입체크는 `npx tsc -b` (repo 관례 — `tsc --noEmit`는 아무것도 검사 안 함).
- 배치 좌표는 stage1 말풍선 목록에 존재하는(=걷기 가능 검증된) 칸을 재사용: NPC0 `(6,-10)`, NPC1 `(-6,13)`, NPC2 `(9,0)`.
- 커밋은 각 Task 끝에서. 브랜치는 `feat/planet3-mission3-stage2` (이미 체크아웃됨).

---

## 파일 구조

| 파일 | 종류 | 책임 |
|------|------|------|
| `public/assets/planet3/world/models/npc-01~03.glb` | 에셋(신규) | 외부 GLB 3개 영문 rename 반입 |
| `src/scenes/planet/planet3/world/stage2-npcs.json` | 데이터(신규) | NPC 3명 × 3라운드 대사 + 배치 좌표 |
| `src/scenes/planet/planet3/world/assets.ts` | 변경 | npc GLB URL 3개 + `STAGE2_DATA` export |
| `src/scenes/planet/planet3/world/npcgame.ts` | 순수 로직(신규) | 데이터 검증 + 감정 상태머신 |
| `src/scenes/planet/planet3/world/npcgame.test.ts` | 테스트(신규) | 상태머신·검증 단위 테스트 |
| `src/scenes/planet/planet3/world/npcs.ts` | 3D(신규) | GLB 로드·배치·감정 crossfade·근접·미니맵 좌표 |
| `src/scenes/planet/planet3/world/popup.ts` | 변경 | `showDialogue` 추가 + `showFeedback` 텍스트 인자 |
| `src/scenes/planet/planet3/EmpathyFuelGame.css` | 변경 | `.popup-btn.dialogue` 중립 스타일 |
| `src/scenes/planet/planet3/world/minimap.ts` | 변경 | NPC 마커 렌더 |
| `src/scenes/planet/planet3/world/stages.ts` | 변경 | `startStage2()` 교체 + `npcPoints()` + ctx `hexTopY` |
| `src/scenes/planet/planet3/world/mountWorld.ts` | 변경 | ctx에 `hexTopY` 전달 + 미니맵에 `npcPoints()` |

---

## Task 1: 에셋 반입 + stage2-npcs.json + assets.ts 배선

**Files:**
- Create: `public/assets/planet3/world/models/npc-01.glb`, `npc-02.glb`, `npc-03.glb` (외부 GLB 복사)
- Create: `src/scenes/planet/planet3/world/stage2-npcs.json`
- Modify: `src/scenes/planet/planet3/world/assets.ts`

**Interfaces:**
- Produces: `MODEL_URLS.npc1 | npc2 | npc3` (string URL), `STAGE2_DATA: { npcs: unknown[] }` (raw JSON, Task 2에서 검증).

- [ ] **Step 1: 외부 GLB 3개를 영문명으로 복사**

```bash
mkdir -p public/assets/planet3/world/models
cp "D:/Work-HeartGuardians/BunnyBlenderWork/threejs_test/bunny_01_facebaked.glb" public/assets/planet3/world/models/npc-01.glb
cp "D:/Work-HeartGuardians/BunnyBlenderWork/threejs_test/bunny_02_facebaked.glb" public/assets/planet3/world/models/npc-02.glb
cp "D:/Work-HeartGuardians/BunnyBlenderWork/threejs_test/bunny_03_facebaked.glb" public/assets/planet3/world/models/npc-03.glb
ls -l public/assets/planet3/world/models/npc-0*.glb
```
Expected: 3개 파일(각 ~4.3~5.0MB) 존재.

- [ ] **Step 2: stage2-npcs.json 작성 (3명 × 3라운드)**

Create `src/scenes/planet/planet3/world/stage2-npcs.json`:
```json
{
  "npcs": [
    {
      "id": 0, "q": 6, "r": -10, "name": "외로운 토끼", "emoji": "🐰",
      "rounds": [
        { "prompt": "아무도 나랑 놀아주지 않아…", "warm": "내가 너랑 놀아줄게!", "cold": "그럼 혼자 놀아.", "feedback": "정말? 너랑 놀면 재밌겠다!" },
        { "prompt": "친구를 사귀는 게 무서워…", "warm": "천천히 같이 해보자.", "cold": "네가 이상해서 그래.", "feedback": "네가 있으니 용기가 나." },
        { "prompt": "내가 먼저 다가가도 될까?", "warm": "그럼! 웃으면서 인사해봐.", "cold": "괜히 나서지 마.", "feedback": "좋아, 한번 해볼게! 고마워!" }
      ]
    },
    {
      "id": 1, "q": -6, "r": 13, "name": "실수쟁이 토끼", "emoji": "🐰",
      "rounds": [
        { "prompt": "내가 또 실수했어… 난 왜 이럴까.", "warm": "누구나 실수해. 괜찮아!", "cold": "넌 맨날 실수야.", "feedback": "그렇게 말해줘서 고마워." },
        { "prompt": "다들 나 때문에 화났을 거야.", "warm": "말해보면 이해해줄 거야.", "cold": "맞아, 다 너 때문이야.", "feedback": "용기 내서 말해볼게." },
        { "prompt": "다시 해봐도 안 되면 어떡하지?", "warm": "실패해도 내가 도와줄게.", "cold": "어차피 또 실패할걸.", "feedback": "너와 함께라면 해볼 수 있어!" }
      ]
    },
    {
      "id": 2, "q": 9, "r": 0, "name": "속상한 토끼", "emoji": "🐰",
      "rounds": [
        { "prompt": "친구랑 싸워서 너무 속상해.", "warm": "무슨 일인지 얘기해 줄래?", "cold": "싸운 네 잘못이지.", "feedback": "들어줘서 마음이 조금 풀렸어." },
        { "prompt": "먼저 사과하면 지는 것 같아.", "warm": "사과는 지는 게 아니라 멋진 거야.", "cold": "그냥 모른 척해.", "feedback": "그렇게 생각하니 마음이 가벼워." },
        { "prompt": "친구가 안 받아주면 어쩌지?", "warm": "진심은 꼭 전해질 거야.", "cold": "그럼 절교해.", "feedback": "고마워, 용기 내서 사과할래!" }
      ]
    }
  ]
}
```

- [ ] **Step 3: assets.ts에 npc URL·데이터 추가**

Modify `src/scenes/planet/planet3/world/assets.ts` — bubble import 아래에 추가:
```ts
import npc1 from "/assets/planet3/world/models/npc-01.glb?url";
import npc2 from "/assets/planet3/world/models/npc-02.glb?url";
import npc3 from "/assets/planet3/world/models/npc-03.glb?url";
import stage2 from "./stage2-npcs.json";
```
`ModelKey` union에 `| "npc1" | "npc2" | "npc3"` 추가. `MODEL_URLS` 객체에 `npc1, npc2, npc3,` 추가. 파일 끝에 추가:
```ts
export const STAGE2_DATA = stage2 as { npcs: unknown[] };
```

- [ ] **Step 4: 타입체크로 import 해석 확인**

Run: `npx tsc -b`
Expected: 에러 없음(신규 import·json 해석 성공).

- [ ] **Step 5: Commit**

```bash
git add public/assets/planet3/world/models/npc-0*.glb src/scenes/planet/planet3/world/stage2-npcs.json src/scenes/planet/planet3/world/assets.ts
git commit -m "feat(planet3): stage2 NPC 에셋 3종 반입 + 대사 데이터·assets 배선"
```

---

## Task 2: npcgame.ts — 순수 상태머신 + 검증 (TDD)

**Files:**
- Create: `src/scenes/planet/planet3/world/npcgame.ts`
- Test: `src/scenes/planet/planet3/world/npcgame.test.ts`

**Interfaces:**
- Consumes: `STAGE2_DATA` (Task 1, raw) — 런타임에 `parseStage2Data`로 검증.
- Produces:
  - `type NpcRound = { prompt: string; warm: string; cold: string; feedback: string }`
  - `type NpcDef = { id: number; q: number; r: number; name: string; emoji: string; rounds: NpcRound[] }`
  - `parseStage2Data(data, isWalkableKey): { npcs: NpcDef[]; warnings: string[] }`
  - `createNpcGame(npcs): { currentRound(id), choose(id, warm), levelOf(id), isDone(id), allDone() }`
    - `choose` 반환: `{ accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string }`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/scenes/planet/planet3/world/npcgame.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseStage2Data, createNpcGame } from "./npcgame";
import type { NpcDef } from "./npcgame";

const allWalkable = (): boolean => true;

const sampleRaw = {
  npcs: [
    { id: 9, q: 1, r: 2, name: "A", emoji: "🐰", rounds: [
      { prompt: "p1", warm: "w1", cold: "c1", feedback: "f1" },
      { prompt: "p2", warm: "w2", cold: "c2", feedback: "f2" },
      { prompt: "p3", warm: "w3", cold: "c3", feedback: "f3" },
    ] },
  ],
};

describe("parseStage2Data", () => {
  it("normalizes npcs and reassigns ids by index", () => {
    const { npcs, warnings } = parseStage2Data(sampleRaw, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]!.id).toBe(0); // json의 id:9 무시, 인덱스로 재부여
    expect(npcs[0]!.rounds).toHaveLength(3);
    expect(warnings).toHaveLength(0);
  });

  it("drops npc on non-walkable hex with a warning", () => {
    const isWalkable = (q: number, r: number): boolean => !(q === 1 && r === 2);
    const { npcs, warnings } = parseStage2Data(sampleRaw, isWalkable);
    expect(npcs).toHaveLength(0);
    expect(warnings.some((w) => w.includes("1,2"))).toBe(true);
  });

  it("warns when round count is not 3 but keeps the npc", () => {
    const data = { npcs: [{ q: 0, r: 0, rounds: [{ prompt: "p", warm: "w", cold: "c", feedback: "f" }] }] };
    const { npcs, warnings } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(warnings.some((w) => w.includes("라운드"))).toBe(true);
  });

  it("drops malformed npc", () => {
    const data = { npcs: [{ q: 0, rounds: [] }, sampleRaw.npcs[0]] };
    const { npcs } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
  });
});

describe("createNpcGame", () => {
  const npcs = (): NpcDef[] => parseStage2Data(sampleRaw, allWalkable).npcs;

  it("warm answer raises level and advances round", () => {
    const g = createNpcGame(npcs());
    expect(g.currentRound(0)!.prompt).toBe("p1");
    const r = g.choose(0, true);
    expect(r.accepted).toBe(true);
    expect(r.level).toBe(1);
    expect(r.npcDone).toBe(false);
    expect(r.feedback).toBe("f1");
    expect(g.currentRound(0)!.prompt).toBe("p2");
  });

  it("cold answer keeps level and round (retry)", () => {
    const g = createNpcGame(npcs());
    const r = g.choose(0, false);
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(0);
    expect(g.levelOf(0)).toBe(0);
    expect(g.currentRound(0)!.prompt).toBe("p1"); // 같은 라운드 유지
  });

  it("three warm answers complete the npc at level 3", () => {
    const g = createNpcGame(npcs());
    g.choose(0, true);
    g.choose(0, true);
    const r = g.choose(0, true);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
    expect(r.allDone).toBe(true);
    expect(g.isDone(0)).toBe(true);
    expect(g.currentRound(0)).toBeNull();
  });

  it("choosing on a finished npc is a no-op", () => {
    const g = createNpcGame(npcs());
    g.choose(0, true); g.choose(0, true); g.choose(0, true);
    const r = g.choose(0, true);
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/npcgame.test.ts`
Expected: FAIL — `Failed to resolve import "./npcgame"` (모듈 없음).

- [ ] **Step 3: npcgame.ts 구현**

Create `src/scenes/planet/planet3/world/npcgame.ts`:
```ts
// stage2 NPC 감정 녹이기(미션3) 순수 게임 상태 + 데이터 검증 (THREE 비의존, 단위 테스트용).

export type NpcRound = { prompt: string; warm: string; cold: string; feedback: string };
export type NpcDef = { id: number; q: number; r: number; name: string; emoji: string; rounds: NpcRound[] };

const COLD_FEEDBACK = "음… 그 말은 조금 차가운 것 같아.";

// stage2 JSON을 검증·정규화한다. isWalkableKey(q,r)로 배치 가능 여부를 확인하고,
// id는 배열 인덱스로 재부여한다(3D·미니맵과 공유하는 안정적 키).
export function parseStage2Data(
  data: unknown,
  isWalkableKey: (q: number, r: number) => boolean,
): { npcs: NpcDef[]; warnings: string[] } {
  const warnings: string[] = [];
  const raw = data && Array.isArray((data as any).npcs) ? (data as any).npcs : [];
  const npcs: NpcDef[] = [];
  raw.forEach((n: any, i: number) => {
    if (!n || typeof n.q !== "number" || typeof n.r !== "number" || !Array.isArray(n.rounds) || n.rounds.length === 0) {
      warnings.push(`npc[${i}] 형식 오류 — 건너뜀`);
      return;
    }
    if (!isWalkableKey(n.q, n.r)) {
      warnings.push(`npc[${i}] (${n.q},${n.r})는 걸을 수 없는 칸 — 건너뜀`);
      return;
    }
    const rounds: NpcRound[] = [];
    n.rounds.forEach((rd: any, j: number) => {
      if (!rd || typeof rd.prompt !== "string" || typeof rd.warm !== "string" || typeof rd.cold !== "string") {
        warnings.push(`npc[${i}].round[${j}] 형식 오류 — 건너뜀`);
        return;
      }
      rounds.push({
        prompt: rd.prompt,
        warm: rd.warm,
        cold: rd.cold,
        feedback: typeof rd.feedback === "string" ? rd.feedback : "",
      });
    });
    if (rounds.length === 0) {
      warnings.push(`npc[${i}] 유효한 라운드 없음 — 건너뜀`);
      return;
    }
    if (rounds.length !== 3) {
      warnings.push(`npc[${i}] 라운드가 ${rounds.length}개 — 감정 lv0~lv3에 맞추려면 3개 권장`);
    }
    npcs.push({
      id: npcs.length,
      q: n.q,
      r: n.r,
      name: typeof n.name === "string" ? n.name : `친구 ${npcs.length + 1}`,
      emoji: typeof n.emoji === "string" ? n.emoji : "🐰",
      rounds,
    });
  });
  return { npcs, warnings };
}

// 감정 상태 머신. warm(따듯한 말)이면 감정 +1단계·다음 라운드, cold(차가운 말)이면 제자리.
// level = 진행한 라운드 수(0..3). round가 rounds.length에 도달하면 그 NPC는 완료(lv3).
export function createNpcGame(npcs: NpcDef[]): {
  currentRound(id: number): NpcRound | null;
  choose(id: number, warm: boolean): { accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string };
  levelOf(id: number): number;
  isDone(id: number): boolean;
  allDone(): boolean;
} {
  const byId = new Map<number, NpcDef>(npcs.map((n) => [n.id, n]));
  const round = new Map<number, number>(npcs.map((n) => [n.id, 0])); // id -> 진행 라운드 수

  const cap3 = (v: number): number => Math.max(0, Math.min(3, v));
  function isDone(id: number): boolean {
    const n = byId.get(id);
    return !!n && (round.get(id) ?? 0) >= n.rounds.length;
  }
  function allDone(): boolean {
    return npcs.every((n) => isDone(n.id));
  }
  function currentRound(id: number): NpcRound | null {
    const n = byId.get(id);
    if (!n) return null;
    const r = round.get(id) ?? 0;
    return r < n.rounds.length ? n.rounds[r]! : null;
  }
  function levelOf(id: number): number {
    return cap3(round.get(id) ?? 0);
  }
  function choose(id: number, warm: boolean): { accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string } {
    const n = byId.get(id);
    if (!n || isDone(id)) {
      return { accepted: false, level: cap3(round.get(id) ?? 0), npcDone: isDone(id), allDone: allDone(), feedback: "" };
    }
    const cur = round.get(id) ?? 0;
    if (!warm) {
      return { accepted: false, level: cap3(cur), npcDone: false, allDone: allDone(), feedback: COLD_FEEDBACK };
    }
    const passed = n.rounds[cur]!;
    round.set(id, cur + 1);
    return { accepted: true, level: cap3(cur + 1), npcDone: isDone(id), allDone: allDone(), feedback: passed.feedback };
  }

  return { currentRound, choose, levelOf, isDone, allDone };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/npcgame.test.ts`
Expected: PASS (모든 테스트 통과).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet3/world/npcgame.ts src/scenes/planet/planet3/world/npcgame.test.ts
git commit -m "feat(planet3): stage2 NPC 감정 상태머신·데이터 검증(npcgame) + 테스트"
```

---

## Task 3: popup.ts — showDialogue 추가 + showFeedback 텍스트 인자 + CSS

**Files:**
- Modify: `src/scenes/planet/planet3/world/popup.ts`
- Modify: `src/scenes/planet/planet3/EmpathyFuelGame.css`

**Interfaces:**
- Produces:
  - `showDialogue(parent, prompt, buttons: { label: string; warm: boolean }[], onChoose: (warm: boolean) => void, badgeEmoji?): HTMLElement`
  - `showFeedback(parent, positive, text?)` — 세 번째 인자로 커스텀 문구(기존 stage1 호출은 그대로 동작).

- [ ] **Step 1: showFeedback에 선택적 텍스트 인자 추가**

Modify `src/scenes/planet/planet3/world/popup.ts` — `showFeedback` 시그니처·본문을 교체:
```ts
export function showFeedback(parent: HTMLElement, positive: boolean, text?: string): HTMLElement {
  parent.querySelectorAll('.feedback').forEach((e) => e.remove()); // 중첩 방지
  const el = document.createElement('div');
  el.className = `feedback ${positive ? 'pos' : 'neg'}`;
  el.textContent = text ?? (positive ? '⚡ 따듯한 말로 충전!' : '🥶 앗, 차가운 말이야…');
  parent.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1600); // 애니메이션 미지원 대비 보험
  return el;
}
```

- [ ] **Step 2: showDialogue 추가**

Modify `src/scenes/planet/planet3/world/popup.ts` — 파일 끝(showInfo 아래)에 추가:
```ts
// NPC 대화 팝업: 고민 문장 + 선택지 버튼 N개(중립 스타일). buttons 순서는 호출부에서
// 섞어 넘겨 정답 위치가 노출되지 않게 한다. onChoose(warm)은 정확히 한 번 호출된다.
export function showDialogue(
  parent: HTMLElement,
  prompt: string,
  buttons: { label: string; warm: boolean }[],
  onChoose: (warm: boolean) => void,
  badgeEmoji: string = '🐰',
): HTMLElement {
  const { ov, card } = makeOverlay(badgeEmoji);
  const msg = document.createElement('p');
  msg.className = 'popup-text';
  msg.textContent = prompt;
  const row = document.createElement('div');
  row.className = 'popup-buttons dialogue';

  let done = false;
  const finish = (warm: boolean): void => {
    if (done) return;
    done = true;
    ov.remove();
    onChoose(warm);
  };
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.className = 'popup-btn dialogue';
    btn.textContent = b.label;
    btn.addEventListener('click', () => finish(b.warm));
    row.appendChild(btn);
  }
  card.append(msg, row);
  parent.appendChild(ov);
  return ov;
}
```

- [ ] **Step 3: 중립 다이얼로그 버튼 CSS 추가**

Modify `src/scenes/planet/planet3/EmpathyFuelGame.css` — `.popup-btn.ok` 규칙(169행 부근) 아래에 추가:
```css
/* NPC 대화 선택지 — 정답을 색으로 암시하지 않게 둘 다 같은 중립 색, 문장이 길어 세로 배치 */
.efg-overlay .popup-buttons.dialogue { flex-direction: column; }
.efg-overlay .popup-btn.dialogue {
  width: 100%;
  font-size: 19px;
  line-height: 1.4;
  background: linear-gradient(180deg, #b6a8ff, #8b79f0);
}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/planet/planet3/world/popup.ts src/scenes/planet/planet3/EmpathyFuelGame.css
git commit -m "feat(planet3): NPC 대화 팝업(showDialogue) + showFeedback 커스텀 문구"
```

---

## Task 4: npcs.ts — GLB 로드·배치·감정 crossfade (3D)

**Files:**
- Create: `src/scenes/planet/planet3/world/npcs.ts`

**Interfaces:**
- Consumes: `NpcDef` (Task 2), `MODEL_URLS.npc1/2/3` (Task 1), `axialToWorld` (hexgrid).
- Produces: `createNpcs(scene, defs, { size, hexTopY? }): Promise<{ update(dt, camera), nearest(px, pz, radius, accept?), setLevel(id, level), points(): { x, z, done }[], clear() }>`
  - `nearest`의 `accept?: (def: NpcDef) => boolean` — 완료된 NPC 제외 등 필터.

- [ ] **Step 1: npcs.ts 구현**

Create `src/scenes/planet/planet3/world/npcs.ts`:
```ts
// stage2 NPC 3D 표현: 감정 클립(lv0~lv3)을 crossfade로 전환 + Y축 빌보드 + 근접 감지.
// 레퍼런스(threejs_test/index.html) 기법 이식: 4개 클립을 전부 play()·weight 0으로 두고,
// 현재 단계만 weight 1로. 단계 전환은 crossFadeTo(1.2)로 부드럽게.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { axialToWorld } from './hexgrid';
import { MODEL_URLS } from './assets';
import type { NpcDef } from './npcgame';

const CLIPS = ['lv0', 'lv1', 'lv2', 'lv3'];
const FADE = 1.2;             // 감정 전환 crossfade(초) — 레퍼런스와 동일
const TARGET_HEIGHT = 2.4;    // NPC 키(월드 단위) — bbox 높이 기준 정규화
const FACE_OFFSET = Math.PI;  // 정면이 카메라를 향하게 하는 Y축 보정(브라우저로 튜닝)

const NPC_URLS = [MODEL_URLS.npc1, MODEL_URLS.npc2, MODEL_URLS.npc3];

type NpcItem = {
  pivot: THREE.Group;         // 위치·빌보드 회전 담당
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  current: string;
  x: number;
  z: number;
  def: NpcDef;
};

export async function createNpcs(
  scene: THREE.Scene,
  defs: NpcDef[],
  { size, hexTopY = 0 }: { size: number; hexTopY?: number },
): Promise<{
  update(dt: number, camera: THREE.Camera): void;
  nearest(px: number, pz: number, radius: number, accept?: (def: NpcDef) => boolean): NpcDef | null;
  setLevel(id: number, level: number): void;
  points(): { x: number; z: number; done: boolean }[];
  clear(): void;
}> {
  const loader = new GLTFLoader();
  const items = new Map<number, NpcItem>();
  const geoms = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const group = new THREE.Group();

  for (const def of defs) {
    // NPC마다 별도 GLB를 로드한다(애니메이션이 독립이라 clone 대신 개별 로드가 단순).
    const url = NPC_URLS[def.id % NPC_URLS.length]!;
    const gltf = await loader.loadAsync(url);
    const inner = gltf.scene;

    // 키를 TARGET_HEIGHT로 정규화한 뒤, bbox로 수평 중심을 원점에·발(min.y)을 바닥에 맞춘다.
    inner.updateWorldMatrix(true, true);
    const box0 = new THREE.Box3().setFromObject(inner);
    const dim = box0.getSize(new THREE.Vector3());
    inner.scale.setScalar(TARGET_HEIGHT / (dim.y || 1));
    inner.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner);
    const c = box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -box.min.y, -c.z);

    const { x, z } = axialToWorld(def.q, def.r, size);
    const pivot = new THREE.Group();
    pivot.position.set(x, hexTopY, z);
    pivot.add(inner);
    group.add(pivot);

    inner.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geoms.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mats.add(mm));
    });

    const mixer = new THREE.AnimationMixer(inner);
    const actions: Record<string, THREE.AnimationAction> = {};
    CLIPS.forEach((name) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) return;
      const a = mixer.clipAction(clip);
      a.enabled = true;
      a.setEffectiveWeight(0);
      a.play();
      actions[name] = a;
    });
    if (actions.lv0) actions.lv0.setEffectiveWeight(1);

    items.set(def.id, { pivot, mixer, actions, current: 'lv0', x, z, def });
  }
  scene.add(group);

  // 현재 액션 → 목표 액션으로 crossfade. 목표 클립이 없으면 current만 갱신.
  function setLevel(id: number, level: number): void {
    const it = items.get(id);
    if (!it) return;
    const toName = CLIPS[Math.max(0, Math.min(3, level))]!;
    const to = it.actions[toName];
    const from = it.actions[it.current];
    if (!to || to === from) { it.current = toName; return; }
    to.enabled = true;
    to.setEffectiveTimeScale(1);
    to.setEffectiveWeight(1);
    to.time = 0;
    if (from) from.crossFadeTo(to, FADE, false);
    it.current = toName;
  }

  function update(dt: number, camera: THREE.Camera): void {
    for (const it of items.values()) {
      it.mixer.update(dt);
      if (camera) {
        it.pivot.rotation.y = Math.atan2(camera.position.x - it.x, camera.position.z - it.z) + FACE_OFFSET;
      }
    }
  }

  function nearest(px: number, pz: number, radius: number, accept?: (def: NpcDef) => boolean): NpcDef | null {
    let best: NpcDef | null = null;
    let bestD2 = radius * radius;
    for (const it of items.values()) {
      if (accept && !accept(it.def)) continue;
      const dx = it.x - px;
      const dz = it.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = it.def; }
    }
    return best;
  }

  function points(): { x: number; z: number; done: boolean }[] {
    return [...items.values()].map((it) => ({ x: it.x, z: it.z, done: it.current === 'lv3' }));
  }

  function clear(): void {
    scene.remove(group);
    geoms.forEach((g) => g.dispose());
    mats.forEach((m) => {
      Object.values(m).forEach((v) => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); });
      m.dispose();
    });
    items.clear();
  }

  return { update, nearest, setLevel, points, clear };
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/planet/planet3/world/npcs.ts
git commit -m "feat(planet3): stage2 NPC 3D 로드·배치·감정 crossfade(npcs)"
```

---

## Task 5: minimap.ts — NPC 마커 렌더

**Files:**
- Modify: `src/scenes/planet/planet3/world/minimap.ts`

**Interfaces:**
- Produces: `update(px, pz, yaw, bubbles?, npcs?)` — 5번째 인자 `npcs: { x, z, done }[]` (기본 `[]`).

- [ ] **Step 1: update 시그니처에 npcs 인자 추가 + 마커 렌더**

Modify `src/scenes/planet/planet3/world/minimap.ts`:

1) 반환 타입의 `update` 시그니처를 교체(15행 부근):
```ts
  update(px: number, pz: number, yaw: number, points: { x: number; z: number }[], npcs?: { x: number; z: number; done: boolean }[]): void;
```

2) 함수 선언부 시그니처를 교체(31행):
```ts
  function update(
    px: number,
    pz: number,
    yaw: number,
    bubbles: { x: number; z: number }[] = [],
    npcs: { x: number; z: number; done: boolean }[] = [],
  ): void {
```

3) 말풍선 점을 그리는 블록(`for (const b of bubbles) { ... }`) 바로 아래에 NPC 마커 렌더를 추가:
```ts
    // NPC 마커 — 미완료(파랑)/완료(초록). 말풍선 점(3*k)보다 크게(4.5*k) 그려 눈에 띄게.
    for (const n of npcs) {
      ctx.beginPath();
      ctx.arc(center + n.x * scale, center + n.z * scale, 4.5 * k, 0, Math.PI * 2);
      ctx.fillStyle = n.done ? '#28c76f' : '#4a9df0';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b`
Expected: 에러 없음(기존 `minimap.update(...4 args)` 호출은 npcs 기본값으로 그대로 동작).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/planet/planet3/world/minimap.ts
git commit -m "feat(planet3): 미니맵에 NPC 마커(미완료·완료) 렌더"
```

---

## Task 6: stages.ts — startStage2 교체 + npcPoints + mountWorld 배선

**Files:**
- Modify: `src/scenes/planet/planet3/world/stages.ts`
- Modify: `src/scenes/planet/planet3/world/mountWorld.ts`

**Interfaces:**
- Consumes: `createNpcs` (Task 4), `parseStage2Data`/`createNpcGame` (Task 2), `showDialogue`/`showFeedback`/`showInfo` (Task 3/기존), `STAGE2_DATA` (Task 1), `hexKey` (기존).
- Produces: 스테이지 매니저 반환 객체에 `npcPoints(): { x, z, done }[]` 추가. ctx에 `hexTopY: number` 추가.

- [ ] **Step 1: stages.ts import·타입·상태 추가**

Modify `src/scenes/planet/planet3/world/stages.ts`:

1) import 블록(9행 부근)에 추가:
```ts
import { STAGE2_DATA } from './assets';
import { parseStage2Data, createNpcGame } from './npcgame';
import { createNpcs } from './npcs';
import { showDialogue } from './popup';
```
(`showChoice, showInfo, showFeedback`는 기존 import 유지. `showDialogue`만 추가.)

2) ctx 타입(`createStageManager`의 인자 타입)에 `hexTopY` 추가 — `size: number;` 아래에:
```ts
  hexTopY: number;
```

3) 반환 타입에 `npcPoints` 추가 — `bubblePoints(): { x: number; z: number }[];` 아래에:
```ts
  npcPoints(): { x: number; z: number; done: boolean }[];
```

4) 지역 상태 선언부(`let popupOpen = false;` 아래)에 추가:
```ts
  let npcs: Awaited<ReturnType<typeof createNpcs>> | null = null;
  let npcGame: ReturnType<typeof createNpcGame> | null = null;
  let npcCooldown = 0; // 이 시각(elapsed) 이전엔 대화를 다시 열지 않음(피드백 노출용)
```

- [ ] **Step 2: startStage2 교체 + NPC 상호작용 함수 추가**

Modify `src/scenes/planet/planet3/world/stages.ts` — 기존 `startStage2` 함수(임시 버튼) 전체를 아래로 교체:
```ts
  // Stage 2 — 얼어붙은 마음(NPC 3명)을 녹인다. stage2 진입을 바깥(스테퍼→미션3)에 알리고,
  // NPC를 로드·배치한다. 3명 모두 lv3에 도달하면 onComplete가 호출된다.
  async function startStage2(): Promise<void> {
    ctx.onStage2Enter();
    const isWalkableKey = (q: number, r: number): boolean => ctx.walkable.has(hexKey(q, r));
    const parsed = parseStage2Data(STAGE2_DATA, isWalkableKey);
    parsed.warnings.forEach((w) => console.warn('[stage2]', w));
    npcGame = createNpcGame(parsed.npcs);
    npcs = await createNpcs(ctx.scene, parsed.npcs, { size: ctx.size, hexTopY: ctx.hexTopY });
  }

  // NPC 근접 시 현재 라운드 대화를 연다. 정답 위치 노출 방지를 위해 버튼 순서를 섞는다.
  function openNpcDialogue(def: import('./npcgame').NpcDef): void {
    const round = npcGame!.currentRound(def.id);
    if (!round) return;
    popupOpen = true;
    ctx.setInputLocked(true);
    const warmBtn = { label: round.warm, warm: true };
    const coldBtn = { label: round.cold, warm: false };
    const buttons = Math.random() < 0.5 ? [warmBtn, coldBtn] : [coldBtn, warmBtn];
    showDialogue(ctx.uiRoot, round.prompt, buttons, (warm) => {
      const r = npcGame!.choose(def.id, warm);
      popupOpen = false;
      ctx.setInputLocked(false);
      npcCooldown = elapsed + 1.2; // 피드백이 보이도록 잠시 재오픈 지연
      if (r.accepted) {
        npcs!.setLevel(def.id, r.level);
        showFeedback(ctx.uiRoot, true, r.feedback);
        if (r.allDone) onAllNpcsDone();
      } else {
        showFeedback(ctx.uiRoot, false, r.feedback);
      }
    }, def.emoji);
  }

  // 세 NPC 모두 lv3 → 축하 후 미션3(=행성3 최종) 완료.
  function onAllNpcsDone(): void {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '모두의 얼어붙은 마음이 녹았어요! 🎉\n행성3의 친구들이 다시 웃어요!',
      '미션 완료',
      () => {
        npcs!.clear();
        npcs = null;
        popupOpen = false;
        ctx.setInputLocked(false);
        ctx.onComplete();
      },
      '🎉',
    );
  }
```

- [ ] **Step 3: update()에 stage2 근접 로직 추가**

Modify `src/scenes/planet/planet3/world/stages.ts` — `update` 함수를 아래로 교체:
```ts
  function update(dt: number): void {
    elapsed += dt;
    // Stage 2: NPC가 로드돼 있으면 감정 애니메이션을 매 프레임 갱신하고 근접 시 대화를 연다.
    if (npcs && npcGame) {
      npcs.update(dt, ctx.camera);
      if (popupOpen || elapsed < npcCooldown) return;
      const p = ctx.camera.position;
      const near = npcs.nearest(p.x, p.z, PROXIMITY, (d) => !npcGame!.isDone(d.id));
      if (near) openNpcDialogue(near);
      return;
    }
    // Stage 1: 말풍선 근접.
    if (!bubbles) return;
    bubbles.update(dt, elapsed, ctx.camera);
    if (popupOpen) return;
    const p = ctx.camera.position;
    const near = bubbles.nearest(p.x, p.z, PROXIMITY);
    if (near) openPopup(near);
  }
```

- [ ] **Step 4: onPass에서 startStage2 호출부 수정 + npcPoints 반환 추가**

Modify `src/scenes/planet/planet3/world/stages.ts`:

1) `onPass` 안의 `startStage2();` 호출을 비동기 호출로 교체(콜백 안이라 await 불가):
```ts
        void startStage2();
```

2) `start` 안의 DEV 분기 `startStage2();` 호출을 await로 교체:
```ts
    if (opts?.startStage === 2) {
      await startStage2();
      return;
    }
```

3) `bubblePoints` 함수 아래에 `npcPoints` 추가:
```ts
  // stage2 NPC들의 월드 좌표 + 완료 여부 — 미니맵이 매 프레임 읽는다(없으면 빈 배열).
  function npcPoints(): { x: number; z: number; done: boolean }[] {
    return npcs ? npcs.points() : [];
  }
```

4) 반환문(`return { start, update, bubblePoints };`)에 `npcPoints` 추가:
```ts
  return { start, update, bubblePoints, npcPoints };
```

- [ ] **Step 5: mountWorld.ts — ctx.hexTopY 전달 + 미니맵에 npcPoints 전달**

Modify `src/scenes/planet/planet3/world/mountWorld.ts`:

1) `createStageManager({ ... })` 호출(238행 부근)의 `size: SIZE,` 아래에 추가:
```ts
        hexTopY: world.hexTopY,
```

2) 애니메이션 루프의 minimap.update 호출(266행 부근)을 교체:
```ts
        minimap.update(camera.position.x, camera.position.z, camera.rotation.y, stages.bubblePoints(), stages.npcPoints());
```

- [ ] **Step 6: 타입체크 + 단위 테스트 전체**

Run: `npx tsc -b && npx vitest run src/scenes/planet/planet3/world/`
Expected: 타입 에러 없음, 모든 테스트 PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/planet/planet3/world/stages.ts src/scenes/planet/planet3/world/mountWorld.ts
git commit -m "feat(planet3): stage2 NPC 대화·감정 상승 배선 + 미니맵 마커 연동"
```

---

## Task 7: 통합 검증 (Playwright 실제 구동)

**Files:** 없음(검증 전용). 발견된 버그는 해당 Task 파일을 수정.

**Interfaces:** 없음.

- [ ] **Step 1: 전체 타입체크·테스트·프로덕션 빌드**

Run: `npx tsc -b && npx vitest run && npx vite build`
Expected: 모두 성공(빌드가 GLB·json import를 실제 번들링해 경로 오류를 잡는다).

- [ ] **Step 2: 개발 서버 기동**

Run: `npm run dev` (백그라운드)
Expected: 로컬 URL 출력(예: `http://localhost:5173`).

- [ ] **Step 3: Playwright로 stage2 직접 진입**

Playwright MCP로 `http://localhost:5173/planet3?m=2&stage2=1` 접속(DEV 바로가기 — index.tsx `devStartStage`).
- `browser_resize` 1280×800.
- `browser_wait_for` 로 로딩("겨울 숲…") 사라짐 대기.
- 스크린샷: 3D 월드 + 미니맵에 NPC 마커(파란 점 3개) 확인, 상단 스테퍼가 미션3인지 확인.

- [ ] **Step 4: NPC 1명 대화 → 감정 상승 확인**

- 조이스틱/키보드(WASD)로 NPC(미니맵 파란 점)에게 접근 → 대화 팝업 등장 확인.
- 따듯한 말 선택 → 피드백 토스트 + NPC 애니메이션이 밝아지는지(감정 상승) 스크린샷으로 확인.
- 차가운 말 선택 시 감정 변화 없이 같은 라운드 재시도되는지 확인.
- 3라운드 완료 시 해당 미니맵 마커가 초록으로 바뀌는지 확인.

- [ ] **Step 5: 3명 완료 → onComplete 흐름 확인**

- 3명 모두 lv3까지 완료 → "모두의 얼어붙은 마음이 녹았어요!" 축하 팝업 → "미션 완료" 클릭.
- 미션2 마지막 노드(p3_m2_end)로 이어지고 최종 "우주선으로 이동"까지 도달하는지 확인(index.tsx onExit→home).

- [ ] **Step 6: 콘솔 경고 점검**

`browser_console_messages` 로 `[stage2]` 경고(좌표·라운드) 및 THREE 에러가 없는지 확인. 경고가 있으면 stage2-npcs.json 좌표/라운드를 수정.

- [ ] **Step 7: 결과 기록 (커밋 불필요)**

검증 스크린샷·관찰을 요약 보고. 버그 발견 시 해당 Task로 돌아가 수정·재검증. 튜닝 상수(`TARGET_HEIGHT`, `FACE_OFFSET`, `PROXIMITY`, NPC 좌표)는 육안 확인 후 필요 시 조정하고 별도 커밋.

---

## 검증 요약

- **단위 테스트**: `npcgame.test.ts` — 정답/오답 전이, 완료 조건, allDone, 데이터 검증.
- **타입/빌드**: `npx tsc -b`, `npx vite build`.
- **실제 구동**: Playwright로 `?m=2&stage2=1` 진입 → 3명 대화·감정 상승·완료·onComplete 육안 확인(메모리 규칙: UI 변경은 실제 앱 구동으로 검증).
