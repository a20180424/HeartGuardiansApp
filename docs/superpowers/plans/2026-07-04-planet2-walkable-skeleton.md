# Planet2 Walkable Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planet2를 Prologue→미션1→미션2→미션3→Home 으로 끝까지 걸을 수 있는 골격으로 세운다(각 미션은 시작·끝 2노드).

**Architecture:** planet1이 정립한 "엔진·틀 공유 / 시나리오·테마·데이터는 planet 전용" 구조를 그대로 따른다. planet2는 공유 `MissionPlayer`(+`mission.css`)와 `engine`을 재사용하고, 신규 `theme.ts` + `mission01~03.json`(각 2노드) + 상태 머신 `index.tsx`만 추가/수정한다. 비주얼은 planet1 에셋을 placeholder로 재사용한다.

**Tech Stack:** React 19, react-router-dom 7, TypeScript, Vite 8, Vitest 4, oxlint.

## Global Constraints

- 노드 ID는 `p2m1_`/`p2m2_`/`p2m3_` 접두어를 쓴다(planet1의 `m1_`과 grep 시 분리).
- **각 미션 끝 노드는 `onEnter: [{ "cmd": "fx", "value": "fx_light_return" }]`를 반드시 포함**한다. "다음 미션/우주선" 버튼(`vm.showNext`)은 `MissionPlayer`에서 오직 `lightReturn` fx 실행 시에만 켜진다([MissionPlayer.tsx:338-342](../../../src/scenes/planet/player/MissionPlayer.tsx#L338-L342)). 그리고 각 `theme.fx`에 `fx_light_return: "lightReturn"`을 매핑한다.
- 배경·캐릭터·레이더·보상 에셋은 **planet1 것을 placeholder로 재사용**한다(신규 아트 없음).
- **`src/scenes/planet/player/mission.css`를 수정하지 않는다** — 두 행성 공유 파일이라 planet1까지 바뀐다.
- `player/`(미션 엔진)는 자체 `#stage`(1920×1200)를 쓴다. `index.tsx`는 `MissionPlayer`를 `FixedStage`로 감싸지 않는다(planet1과 동일). Prologue는 내부에서 이미 `FixedStage`를 쓴다.
- 미션 골격의 모든 노드는 `hideFriend: true`(아직 친구 아트 없음).

**설계 스펙:** [docs/superpowers/specs/2026-07-04-planet2-walkable-skeleton-design.md](../specs/2026-07-04-planet2-walkable-skeleton-design.md)

---

## File Structure

- `src/scenes/planet/planet2/mission01.json` (신규) — 미션1 골격(2노드).
- `src/scenes/planet/planet2/mission02.json` (신규) — 미션2 골격(2노드).
- `src/scenes/planet/planet2/mission03.json` (신규) — 미션3 골격(2노드 + 보상 카드).
- `src/scenes/planet/planet2/theme.ts` (신규) — `MISSION0N_DATA`/`MISSION0N_THEME` 3쌍.
- `src/scenes/planet/planet2/index.tsx` (수정) — prologue|mission1|mission2|mission3 상태 머신.
- `src/scenes/planet/planet2/missions.test.ts` (신규) — JSON 골격 흐름 테스트.
- `src/scenes/planet/planet2/theme.test.ts` (신규) — theme 정합성 테스트.

재사용(수정/복제 없음): `player/*`, `engine/*`, `planet1/Prologue.css`, `planet1/Planet1.css`, `/assets/**`.

---

## Task 1: 미션 JSON 골격 3개 + 흐름 테스트

**Files:**
- Test: `src/scenes/planet/planet2/missions.test.ts`
- Create: `src/scenes/planet/planet2/mission01.json`
- Create: `src/scenes/planet/planet2/mission02.json`
- Create: `src/scenes/planet/planet2/mission03.json`

**Interfaces:**
- Consumes: `DialogueRunner`(`../engine/runner`), 타입(`../engine/types`).
- Produces: 세 개의 유효한 `MissionData` JSON. 각 `start`는 `p2mN_intro`, 끝 노드는 `p2mN_end`(next:null, `fx_light_return` 발화). theme.ts(Task 2)와 index.tsx(Task 3)가 이 파일들을 import한다.

- [ ] **Step 1: 실패하는 흐름 테스트 작성**

`src/scenes/planet/planet2/missions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DialogueRunner } from "../engine/runner";
import type { MissionData, MissionNode, RunnerView, Command } from "../engine/types";
import mission01 from "./mission01.json";
import mission02 from "./mission02.json";
import mission03 from "./mission03.json";

const MISSIONS: Record<string, MissionData> = {
  mission01: mission01 as unknown as MissionData,
  mission02: mission02 as unknown as MissionData,
  mission03: mission03 as unknown as MissionData,
};

// 미션을 FakeView로 끝까지 자동 진행하며 통과한 라인 텍스트와 fx 커맨드 값을 수집한다.
function runToEnd(data: MissionData): Promise<{ lines: string[]; fx: string[] }> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const fx: string[] = [];
    const view: RunnerView = {
      reset() {},
      execCommands(cmds: Command[] | undefined) {
        (cmds || []).forEach((c) => {
          if (c.cmd === "fx" && c.value) fx.push(c.value);
        });
      },
      showLine(node: MissionNode, onTyped: () => void) {
        lines.push(node.text || "");
        onTyped();
        return Promise.resolve();
      },
      showChoices() {},
      showMirrors(_n, done) { done(); },
      showGauge(_n, done) { done(); },
      showReveal(_n, done) { done(); },
      showVideo(_n, done) { done(); },
      end() { resolve({ lines, fx }); },
    };
    new DialogueRunner(data, view).start();
  });
}

describe("planet2 mission skeletons", () => {
  it.each(["mission01", "mission02", "mission03"])(
    "%s: 시작→끝을 걸어 end 에 도달하고 마지막에 fx_light_return 을 쏜다",
    async (id) => {
      const { lines, fx } = await runToEnd(MISSIONS[id]);
      expect(lines.length).toBeGreaterThanOrEqual(2); // intro + end
      expect(fx).toContain("fx_light_return"); // 다음 버튼 조건
    },
  );

  it.each(["mission01", "mission02", "mission03"])(
    "%s: 노드 id 가 p2m 접두어를 쓰고 start 노드가 존재한다",
    (id) => {
      const data = MISSIONS[id];
      expect(data.nodes.some((n) => n.id === data.start)).toBe(true);
      expect(data.nodes.every((n) => n.id.startsWith("p2m"))).toBe(true);
    },
  );
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- planet2/missions`
Expected: FAIL — `./mission01.json` 등을 resolve 하지 못함(파일 없음).

- [ ] **Step 3: mission01.json 생성**

`src/scenes/planet/planet2/mission01.json`:

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
      "text": "(임시) 미션1 시작 대사입니다. 여기에 인트로 흐름이 들어갈 예정이에요.",
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

- [ ] **Step 4: mission02.json 생성**

`src/scenes/planet/planet2/mission02.json`:

```json
{
  "id": "mission02",
  "title": "(임시) 미션 2",
  "start": "p2m2_intro",
  "nodes": [
    {
      "id": "p2m2_intro",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "text": "(임시) 미션2 시작 대사입니다. 여기에 인트로 흐름이 들어갈 예정이에요.",
      "next": "p2m2_end"
    },
    {
      "id": "p2m2_end",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "text": "(임시) 미션2 완료!",
      "completeBanner": "미션 완료!",
      "onEnter": [{ "cmd": "fx", "value": "fx_light_return" }],
      "next": null
    }
  ]
}
```

- [ ] **Step 5: mission03.json 생성**

`src/scenes/planet/planet2/mission03.json`:

```json
{
  "id": "mission03",
  "title": "(임시) 미션 3",
  "start": "p2m3_intro",
  "nodes": [
    {
      "id": "p2m3_intro",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "text": "(임시) 미션3 시작 대사입니다. 여기에 인트로 흐름이 들어갈 예정이에요.",
      "next": "p2m3_end"
    },
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
  ]
}
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npm test -- planet2/missions`
Expected: PASS (6 케이스 — 흐름 3 + id 규칙 3).

- [ ] **Step 7: 포맷 확인**

Run: `npm run format:check`
Expected: 새 파일에 대한 포맷 경고 없음(있으면 `npm run format` 후 재확인).

- [ ] **Step 8: 커밋**

```bash
git add src/scenes/planet/planet2/mission01.json src/scenes/planet/planet2/mission02.json src/scenes/planet/planet2/mission03.json src/scenes/planet/planet2/missions.test.ts
git commit -m "$(printf 'feat(planet2): 미션1~3 골격 JSON + 흐름 테스트\n\n각 미션 시작·끝 2노드. 끝 노드는 fx_light_return 발화(다음 버튼 조건).\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: theme.ts + 정합성 테스트

**Files:**
- Test: `src/scenes/planet/planet2/theme.test.ts`
- Create: `src/scenes/planet/planet2/theme.ts`

**Interfaces:**
- Consumes: `mission01~03.json`(Task 1), 타입 `MissionData`/`MissionTheme`/`SpriteSet`(`../engine/types`).
- Produces: named export `MISSION01_DATA`, `MISSION01_THEME`, `MISSION02_DATA`, `MISSION02_THEME`, `MISSION03_DATA`, `MISSION03_THEME` (각 `MissionData`/`MissionTheme` 타입). index.tsx(Task 3)가 import한다.

- [ ] **Step 1: 실패하는 정합성 테스트 작성**

`src/scenes/planet/planet2/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { MissionData, MissionTheme } from "../engine/types";
import {
  MISSION01_DATA, MISSION01_THEME,
  MISSION02_DATA, MISSION02_THEME,
  MISSION03_DATA, MISSION03_THEME,
} from "./theme";

const PAIRS: [string, MissionData, MissionTheme][] = [
  ["mission01", MISSION01_DATA, MISSION01_THEME],
  ["mission02", MISSION02_DATA, MISSION02_THEME],
  ["mission03", MISSION03_DATA, MISSION03_THEME],
];

describe("planet2 theme integrity", () => {
  it.each(PAIRS)("%s: bannerNode 가 DATA 의 실제 노드 id 다", (_id, data, theme) => {
    expect(data.nodes.some((n) => n.id === theme.bannerNode)).toBe(true);
  });

  it.each(PAIRS)("%s: initialFriend 가 friends 에 존재한다", (_id, _data, theme) => {
    expect(Object.keys(theme.friends)).toContain(theme.initialFriend);
  });

  it.each(PAIRS)("%s: fx 에 fx_light_return→lightReturn 매핑이 있다", (_id, _data, theme) => {
    expect(theme.fx.fx_light_return).toBe("lightReturn");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- planet2/theme`
Expected: FAIL — `./theme` 모듈을 resolve 하지 못함(파일 없음).

- [ ] **Step 3: theme.ts 생성**

`src/scenes/planet/planet2/theme.ts`:

```ts
import type { MissionData, MissionTheme, SpriteSet } from "../engine/types";
import mission01 from "./mission01.json";
import mission02 from "./mission02.json";
import mission03 from "./mission03.json";

// JSON 추론 타입은 union(type/next 등)과 안 맞아 단언한다(planet1 관례).
export const MISSION01_DATA = mission01 as unknown as MissionData;
export const MISSION02_DATA = mission02 as unknown as MissionData;
export const MISSION03_DATA = mission03 as unknown as MissionData;

const A = "/assets";

// 하티 스프라이트 — planet1과 동일(미션 공통). 골격에선 하티만 말한다.
const HATI_CHAR: Record<string, string> = {
  thinking: `${A}/char/Hati/hati_thinking.png`,
  explaining: `${A}/char/Hati/hati_explaining.png`,
  suggesting: `${A}/char/Hati/hati_suggesting.png`,
  worried: `${A}/char/Hati/hati_worried.png`,
  praising: `${A}/char/Hati/hati_praising.png`,
  cheering: `${A}/char/Hati/hati_cheering.png`,
  proud: `${A}/char/Hati/hati_proud.png`,
  celebrating: `${A}/char/Hati/hati_celebrating.png`,
};

// placeholder 친구 — 타입상 friends/initialFriend 가 필수라 Lumi 스프라이트를 임시 사용.
// 골격의 모든 노드가 hideFriend:true 라 화면엔 안 보인다. 안개 행성 아트 준비 시 교체.
const PLACEHOLDER_FRIEND: SpriteSet = {
  char: { sad: `${A}/char/Lumi/lumi_sad.png` },
  initial: "sad",
  byNode: {},
};

// 레이더 — planet1 에셋 재사용. showRadar:false 라 화면엔 안 뜨지만 타입상 필수.
const RADAR = {
  states: {
    p25: `${A}/device/radar_25.png`,
    p50: `${A}/device/radar_50.png`,
    p75: `${A}/device/radar_75.png`,
    p100: `${A}/device/radar_100.png`,
    active: `${A}/device/radar_active.png`,
  },
  initial: "p100",
  byNode: {},
};

const BADGE_COLORS = ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"];

export const MISSION01_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 1", title: "(임시) 미션 1", ribbon: "안개 행성 미션 1 골격" },
  bannerNode: "p2m1_intro",
  bg: {
    states: { main: `${A}/bg/light-planet-stage1-bg.png` },
    initial: "main",
    byNode: { p2m1_intro: "main" },
  },
  hatiSprites: { char: HATI_CHAR, initial: "thinking", byNode: {} },
  friends: { placeholder: PLACEHOLDER_FRIEND },
  initialFriend: "placeholder",
  radar: RADAR,
  showRadar: false,
  badgeColors: BADGE_COLORS,
  choiceIcons: {},
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};

export const MISSION02_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 2", title: "(임시) 미션 2", ribbon: "안개 행성 미션 2 골격" },
  bannerNode: "p2m2_intro",
  bg: {
    states: { main: `${A}/bg/light-planet-stage2-bg.png` },
    initial: "main",
    byNode: { p2m2_intro: "main" },
  },
  hatiSprites: { char: HATI_CHAR, initial: "thinking", byNode: {} },
  friends: { placeholder: PLACEHOLDER_FRIEND },
  initialFriend: "placeholder",
  radar: RADAR,
  showRadar: false,
  badgeColors: BADGE_COLORS,
  choiceIcons: {},
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};

export const MISSION03_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 3", title: "(임시) 미션 3", ribbon: "안개 행성 미션 3 골격" },
  bannerNode: "p2m3_intro",
  bg: {
    states: { main: `${A}/bg/light-planet-stage2-bg.png` },
    initial: "main",
    byNode: { p2m3_intro: "main" },
  },
  hatiSprites: { char: HATI_CHAR, initial: "thinking", byNode: {} },
  friends: { placeholder: PLACEHOLDER_FRIEND },
  initialFriend: "placeholder",
  radar: RADAR,
  showRadar: false,
  badgeColors: BADGE_COLORS,
  choiceIcons: {},
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- planet2/theme`
Expected: PASS (9 케이스).

- [ ] **Step 5: 타입체크 통과 확인**

Run: `npx tsc -b`
Expected: 에러 없음(theme.ts 가 `MissionTheme` 타입을 완전히 만족).

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/planet/planet2/theme.ts src/scenes/planet/planet2/theme.test.ts
git commit -m "$(printf 'feat(planet2): 미션1~3 theme(placeholder) + 정합성 테스트\n\nplanet1 에셋 재사용, 하티만 노출(hideFriend), showRadar:false.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: index.tsx 상태 머신

**Files:**
- Modify: `src/scenes/planet/planet2/index.tsx` (전체 교체)

**Interfaces:**
- Consumes: `Prologue`(`./Prologue`), `MissionPlayer`(`../player/MissionPlayer`), theme export 6개(`./theme`), `.planet-fade` CSS(`../planet1/Planet1.css`).
- Produces: 기본 export `Planet2` 컴포넌트(라우트 `/planet/2`). 외부 인터페이스 변화 없음(App.tsx 수정 불필요).

- [ ] **Step 1: index.tsx 전체 교체**

`src/scenes/planet/planet2/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import {
  MISSION01_THEME,
  MISSION01_DATA,
  MISSION02_THEME,
  MISSION02_DATA,
  MISSION03_THEME,
  MISSION03_DATA,
} from "./theme";
import "../planet1/Planet1.css"; // 공용 subscene 페이드 오버레이(.planet-fade) 재사용

// Planet2 컨테이너. subscene들을 순서대로 진행한다(내부 상태 머신).
// prologue → mission1 → mission2 → mission3 → home. 각 미션은 현재 시작·끝 골격.
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet2() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // 개발용 단축키(프로덕션 빌드에선 무시): #/planet/2?stage=mission3 또는 ?m=3 (m=0 → prologue)
  const m = params.get("m");
  const wanted =
    params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null);
  const initialStage: Stage =
    import.meta.env.DEV && wanted && (STAGES as string[]).includes(wanted)
      ? (wanted as Stage)
      : "prologue";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  // 전환 시 배경 깜빡임 방지: 미션 배경들을 미리 캐시에 올려둔다.
  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME, MISSION03_THEME].forEach((t) =>
      Object.values(t.bg.states).forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.src = src;
      }),
    );
  }, []);

  // subscene 전환: 검은 오버레이로 페이드아웃 → 교체 → 페이드인.
  const goTo = (next: Stage) => {
    setFading(true);
    window.setTimeout(() => {
      setStage(next);
      window.setTimeout(() => setFading(false), 60);
    }, FADE_MS);
  };

  return (
    <>
      {stage === "prologue" && (
        <Prologue onStart={() => goTo("mission1")} onHome={() => nav("/home")} />
      )}
      {stage === "mission1" && (
        <MissionPlayer
          scenario={MISSION01_DATA}
          theme={MISSION01_THEME}
          currentStep={1}
          onExit={() => goTo("mission2")}
        />
      )}
      {stage === "mission2" && (
        <MissionPlayer
          scenario={MISSION02_DATA}
          theme={MISSION02_THEME}
          currentStep={2}
          onExit={() => goTo("mission3")}
        />
      )}
      {stage === "mission3" && (
        <MissionPlayer
          scenario={MISSION03_DATA}
          theme={MISSION03_THEME}
          currentStep={3}
          finish={{ label: "우주선으로 이동", icon: "/assets/char/SpaceshipIcon.png" }}
          onExit={() => nav("/home")}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
```

- [ ] **Step 2: 타입체크 통과 확인**

Run: `npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 3: 린트 통과 확인**

Run: `npm run lint`
Expected: 새 코드에 대한 에러 없음.

- [ ] **Step 4: 전체 테스트 통과 확인(회귀 없음)**

Run: `npm test`
Expected: PASS (기존 runner 테스트 + planet2 missions/theme 테스트 모두 통과).

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/planet/planet2/index.tsx
git commit -m "$(printf 'feat(planet2): prologue→미션1~3→home 상태 머신\n\nplanet1 index 구조 복제, theme 는 ./theme, 미션3 완료 시 우주선→홈.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: 엔드투엔드 걸음 검증(브라우저)

**Files:** 없음(검증 전용 — 코드 변경 시 앞 태스크로 회귀).

**Interfaces:**
- Consumes: 실행 중인 dev 서버.
- Produces: 없음. 골격이 클릭만으로 끝까지 걸어짐을 확인.

- [ ] **Step 1: dev 서버 기동**

Run: `npm run dev`
Expected: Vite 로컬 URL 출력(예: `http://localhost:5173`).

- [ ] **Step 2: Planet2 진입 후 전 구간 클릭 진행**

브라우저(또는 Playwright MCP)로 `http://localhost:5173/#/planet/2` 접속 후 순서대로 확인:
1. Prologue 표시 → "탐험 시작!" 클릭 → **미션1 인트로** 화면 전환(하티 대사).
2. 화면 탭으로 인트로 대사 진행 → 끝 노드에서 "미션 완료!" 배너 + **"다음 미션으로" 버튼** 노출.
3. "다음 미션으로" 클릭 → **미션2** 동일 흐름.
4. 미션2 완료 → **미션3** 동일 흐름.
5. 미션3 끝 노드에서 버튼이 **"우주선으로 이동"(ship 스타일)**으로 표시.
6. 클릭 → `/home` 도착.

Expected: 6단계가 막힘 없이 진행되고, 각 미션 끝에서 다음 버튼이 확실히 나타남(fx_light_return 정상 동작).

- [ ] **Step 3: DEV 단축키 스팟 체크**

`http://localhost:5173/#/planet/2?m=3` 접속 → 곧바로 **미션3**부터 시작되는지 확인.
Expected: prologue 를 건너뛰고 미션3 인트로로 진입.

- [ ] **Step 4: (문제 없으면) 브랜치 푸시 및 PR**

```bash
git push -u origin feat/planet2
gh pr create --fill
```

---

## Self-Review 메모

- **Spec 커버리지:** 파일 구분(공유/전용) → Task 1~3 + File Structure. 골격 노드(시작·끝, fx_light_return) → Task 1. theme placeholder(planet1 에셋, hideFriend, showRadar:false) → Task 2. 상태 머신(페이드/DEV 단축키/미션3 우주선) → Task 3. 검증(클릭 걸음) → Task 4. 범위 밖(중간 콘텐츠, 안개 아트, mission.css 분리)은 계획에서 제외 — 스펙과 일치.
- **Placeholder 스캔:** 미션 텍스트의 "(임시)"는 골격의 의도된 자리표시 콘텐츠이며 계획 자체의 미완성 표시가 아님. 계획 단계에 TBD/TODO 없음.
- **타입 일치:** theme export 이름(`MISSION0N_DATA`/`MISSION0N_THEME`)이 Task 2 정의와 Task 3 import에서 동일. JSON 노드 id(`p2mN_intro`/`p2mN_end`)가 theme `bannerNode`(`p2mN_intro`)와 일치.
