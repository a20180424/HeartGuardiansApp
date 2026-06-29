# Planet 엔진 폴더 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 흩어진 `engine/`·`mission/`·`missions/`·`three/`를 `scenes/planet/` 패밀리 폴더로 흡수하고 Outro를 폴더화한다. 기능 변경 0.

**Architecture:** `git mv` 로 파일을 옮기고 깨진 상대 import만 수정한다. Planet 엔진 스택(engine+player+planet1~4 콘텐츠)은 서로 강하게 결합돼 있어 한 task에서 일괄 이동하고 한 커밋이 그린이 되게 한다. Outro는 독립적이라 별도 task. `MissionTheme` 인터페이스를 콘텐츠 파일에서 engine으로 옮겨 player→planet 역결합을 제거한다.

**Tech Stack:** React 19, Vite, TypeScript, Vitest. 경로 alias 없음(순수 상대경로), barrel 파일 없음.

## Global Constraints

- **기능·동작 변경 0.** 파일 이동 + import 경로 수정만. 컴포넌트 로직·JSX·CSS 값·scenarioUrl 문자열은 그대로.
- **이동은 `git mv`** 로 히스토리 보존.
- **case-sensitive(Cloudflare/Linux) 빌드 통과** — `App.tsx` 의 scene import 를 소문자 폴더명에 정확히 맞춘다.
- 매 task 종료 시 `npm run build` + `npm test` 그린 확인 후 커밋.
- 확정 구조: `scenes/planet/{engine/, player/, planet1~4/}`, `scenes/outro/`. 진입 파일 `index.tsx`. `mission/`→`player/` 리네임.
- **scenario JSON(`public/scenarios/mission01.json`)은 이동하지 않는다** (URL fetch 유지).
- **Planet2·4 의 mission01 재사용은 그대로 보존** — 이동 후 `../planet1/theme` + `/scenarios/mission01.json` 참조. (현재 동작이며, 자체 콘텐츠가 생기면 자연 해소.)

Spec: [docs/superpowers/specs/2026-06-30-planet-folder-refactor-design.md](../specs/2026-06-30-planet-folder-refactor-design.md)

---

## Task 1: Planet 엔진 스택을 scenes/planet/ 로 흡수

engine·player·planet1~4·콘텐츠를 한 번에 이동하고 모든 상대 import를 같은 커밋에서 갱신한다. `MissionTheme` 인터페이스를 engine/types.ts로 옮긴다.

**Files:**
- Move: `src/engine/{runner.ts,types.ts,runner.test.ts}` → `src/scenes/planet/engine/`
- Move: `src/mission/{MissionPlayer.tsx,audio.ts,mission.css}` → `src/scenes/planet/player/`
- Move: `src/scenes/Planet1.tsx` → `src/scenes/planet/planet1/index.tsx`
- Move: `src/scenes/Planet2.tsx` → `src/scenes/planet/planet2/index.tsx`
- Move: `src/scenes/Planet3.tsx` → `src/scenes/planet/planet3/index.tsx`
- Move: `src/scenes/Planet4.tsx` → `src/scenes/planet/planet4/index.tsx`
- Move: `src/three/{World.tsx,Npc.tsx}` → `src/scenes/planet/planet3/`
- Move: `src/missions/mission01/theme.ts` → `src/scenes/planet/planet1/theme.ts`
- Modify: `src/scenes/planet/engine/types.ts` (MissionTheme 인터페이스 추가)
- Modify: `src/scenes/planet/planet1/theme.ts` (인터페이스 제거 + engine 타입 import)
- Modify: `src/scenes/planet/player/MissionPlayer.tsx` (import 경로)
- Modify: `src/scenes/planet/planet1/index.tsx`, `planet2/index.tsx`, `planet3/index.tsx`, `planet4/index.tsx`
- Modify: `src/App.tsx` (Planet 4줄)
- 변경 없음(확인만): `engine/runner.ts`, `engine/runner.test.ts`, `player/audio.ts`, `planet3/World.tsx`, `planet3/Npc.tsx`

**Interfaces:**
- Produces: `scenes/planet/engine/types.ts` 가 `MissionTheme` 인터페이스를 export. `scenes/planet/player/MissionPlayer.tsx` default export(props 동일). `scenes/planet/planet1/theme.ts` 가 `MISSION01_THEME: MissionTheme` export.

- [ ] **Step 1: 폴더 생성 + 파일 이동 (git mv)**

```bash
mkdir -p src/scenes/planet/engine src/scenes/planet/player \
         src/scenes/planet/planet1 src/scenes/planet/planet2 \
         src/scenes/planet/planet3 src/scenes/planet/planet4
git mv src/engine/runner.ts        src/scenes/planet/engine/runner.ts
git mv src/engine/types.ts         src/scenes/planet/engine/types.ts
git mv src/engine/runner.test.ts   src/scenes/planet/engine/runner.test.ts
git mv src/mission/MissionPlayer.tsx src/scenes/planet/player/MissionPlayer.tsx
git mv src/mission/audio.ts        src/scenes/planet/player/audio.ts
git mv src/mission/mission.css     src/scenes/planet/player/mission.css
git mv src/scenes/Planet1.tsx      src/scenes/planet/planet1/index.tsx
git mv src/scenes/Planet2.tsx      src/scenes/planet/planet2/index.tsx
git mv src/scenes/Planet3.tsx      src/scenes/planet/planet3/index.tsx
git mv src/scenes/Planet4.tsx      src/scenes/planet/planet4/index.tsx
git mv src/three/World.tsx         src/scenes/planet/planet3/World.tsx
git mv src/three/Npc.tsx           src/scenes/planet/planet3/Npc.tsx
git mv src/missions/mission01/theme.ts src/scenes/planet/planet1/theme.ts
```

- [ ] **Step 2: `MissionTheme` 인터페이스를 engine/types.ts 로 이동**

`src/scenes/planet/engine/types.ts` 끝(파일 맨 아래)에 인터페이스를 추가한다:

```ts
export interface MissionTheme {
  speakers: { hati: { name: string; avatar: string }; lumi: { name: string } };
  bannerNode: string;
  drag?: { node: string };
  bg: { states: Record<string, string>; initial: string; byNode: Record<string, string> };
  hatiSprites: { char: Record<string, string>; initial: string; byNode: Record<string, string> };
  lumiSprites: { char: Record<string, string>; initial: string; byNode: Record<string, string> };
  radar: { states: Record<string, string>; initial: string; byNode: Record<string, string> };
  badgeColors: string[];
  choiceIcons: Record<string, { emoji: string; bg: string }>;
  fx: Record<string, string>;
  sfx: { byNode: Record<string, string> };
}
```

- [ ] **Step 3: `planet1/theme.ts` 에서 인터페이스 제거 + engine 타입 import**

`src/scenes/planet/planet1/theme.ts` 의 맨 위 `export interface MissionTheme { ... }` 블록(13줄)을 통째로 삭제하고, 그 자리에 import 한 줄을 넣는다. 결과 상단:

```ts
import type { MissionTheme } from "../engine/types";

const A = "/assets";

export const MISSION01_THEME: MissionTheme = {
```

(`const A` 이하 `MISSION01_THEME` 본문은 그대로 둔다.)

- [ ] **Step 4: `player/MissionPlayer.tsx` import 수정**

`../missions/mission01/theme` 의 `MissionTheme` 타입을 engine에서 가져오도록 9번 줄에 합치고 10번 줄을 제거, `../lib` 는 한 단계 깊게. 변경 전:

```ts
import { DialogueRunner } from "../engine/runner";
import type { MissionData, MissionNode, RunnerView, Choice, Command } from "../engine/types";
import type { MissionTheme } from "../missions/mission01/theme";
import { useFitStage } from "../lib/useFitStage";
```

변경 후:

```ts
import { DialogueRunner } from "../engine/runner";
import type { MissionData, MissionNode, RunnerView, Choice, Command, MissionTheme } from "../engine/types";
import { useFitStage } from "../../../lib/useFitStage";
```

(`./audio`, `./mission.css` 는 sibling 유지 — 변경 없음.)

- [ ] **Step 5: `planet1/index.tsx` import 수정**

```ts
import MissionPlayer from "../player/MissionPlayer";
import { MISSION01_THEME } from "./theme";
```

(`useNavigate` 줄, `scenarioUrl="/scenarios/mission01.json"` 는 그대로.)

- [ ] **Step 6: `planet2/index.tsx` 와 `planet4/index.tsx` import 수정**

두 파일 모두 동일하게(현재 mission01 재사용 보존 — planet1 콘텐츠 참조):

```ts
import MissionPlayer from "../player/MissionPlayer";
import { MISSION01_THEME } from "../planet1/theme";
```

(`scenarioUrl="/scenarios/mission01.json"` 그대로.)

- [ ] **Step 7: `planet3/index.tsx` import 수정**

`../three/World` → 같은 폴더로 옮겼으므로 `./World`:

```ts
import { World } from "./World";
```

(`@react-three/fiber` 의 `Canvas`, react-router, react import 는 그대로. `World.tsx` 의 `./Npc` 도 sibling 유지 — 수정 불필요.)

- [ ] **Step 8: 변경 없는 파일 확인**

`engine/runner.ts`(`./types`), `engine/runner.test.ts`(`./runner`,`./types`), `player/audio.ts`(상대 import 없음), `planet3/World.tsx`(`./Npc` + drei), `planet3/Npc.tsx`(라이브러리만) — **모두 수정 불필요**. 눈으로만 확인.

- [ ] **Step 9: `src/App.tsx` 의 Planet import 4줄 수정**

```ts
import Planet1 from "./scenes/planet/planet1";
import Planet2 from "./scenes/planet/planet2";
import Planet3 from "./scenes/planet/planet3";
import Planet4 from "./scenes/planet/planet4";
```

(`Outro` 줄은 Task 2 에서.)

- [ ] **Step 10: 빌드 + 테스트 그린 확인**

Run: `npm run build`
Expected: 성공. unresolved import 0 (engine/player/planet/theme 경로 모두 해소).

Run: `npm test`
Expected: 전체 PASS. `engine/runner.test.ts`(미션 엔진 단위 테스트)가 새 위치에서 실행·통과.

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "refactor(planet): absorb engine/player/content into scenes/planet/"
```

---

## Task 2: Outro scene 폴더화

Planet과 무관한 독립 스텁. 부품·에셋·상대 import 없음.

**Files:**
- Move: `src/scenes/Outro.tsx` → `src/scenes/outro/index.tsx`
- Modify: `src/App.tsx` (Outro import)

**Interfaces:**
- Produces: `src/scenes/outro/index.tsx` (default export `Outro`).

- [ ] **Step 1: 파일 이동 (git mv)**

```bash
mkdir -p src/scenes/outro
git mv src/scenes/Outro.tsx src/scenes/outro/index.tsx
```

- [ ] **Step 2: `src/App.tsx` 의 Outro import 수정**

```ts
import Outro from "./scenes/outro";
```

- [ ] **Step 3: 빌드 + 테스트 그린 확인**

Run: `npm run build`
Expected: 성공. `./scenes/outro` 가 폴더의 index.tsx 로 resolve.

Run: `npm test`
Expected: 전체 PASS.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "refactor(outro): folderize Outro scene (index.tsx)"
```

---

## Task 3: 최종 검증 + 잔재 정리 + 문서

흩어졌던 top-level 폴더가 비어 사라졌는지 확인하고 문서를 갱신한다.

**Files:**
- Modify: `docs/scene-folder-refactor.md` (Planet 항목 상태)
- 확인: `src/engine`·`src/mission`·`src/missions`·`src/three` 소멸

- [ ] **Step 1: 잔재 디렉터리 확인**

Run: `ls src`
Expected: `engine`·`mission`·`missions`·`three` 없음 (git mv 로 비워짐). 만약 빈 폴더가 남았으면:

```bash
rmdir src/engine src/mission src/missions/mission01 src/missions src/three 2>/dev/null
```

Run: `grep -rn "from \"\.\./engine\|from \"\.\./mission\|from \"\.\./missions\|from \"\.\./three\|scenes/Planet[1-4]\|scenes/Outro" src/`
Expected: 출력 없음 (옛 경로 잔존 0).

- [ ] **Step 2: 전체 빌드 + 테스트 최종 확인**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 전체 PASS.

- [ ] **Step 3: 앱 구동 육안 확인**

`npm run dev` 후 `/planet/1`(MissionPlayer 대화 화면 + 배경/스프라이트), `/planet/3`(3D World + NPC), `/outro`(모험 끝 화면)가 정상 렌더되는지 확인.

- [ ] **Step 4: 문서 상태 갱신 + 커밋**

`docs/scene-folder-refactor.md` 상단 상태 줄에 Planet 엔진 정리도 완료됐음을 반영(Intro/Auth/Home + Planet/Outro 모두 폴더화).

```bash
git add -A
git commit -m "docs: mark planet engine folder refactor done"
```

---

## Self-Review 메모

- **Spec coverage:** Q2 Planet별 폴더(Task 1 planet1~4), Q3 engine+player 분리(Task 1), MissionTheme→engine(Task 1 Step 2-4), scenario public 유지(이동 안 함, Global Constraints), Outro 폴더화(Task 2), top-level 흡수 확인(Task 3) — 전부 task 존재.
- **Placeholder scan:** 모든 step에 실제 코드/명령. 없음.
- **Type consistency:** `MissionTheme` 인터페이스 정의(engine/types.ts) ↔ 사용처(MissionPlayer 타입 import, planet1/theme.ts 인스턴스 어노테이션) 일치. `MISSION01_THEME` 이름 일관.
- **path 검증:** player→engine `../engine`(sibling 유지), player→lib `../../../lib`, planet1→player `../player`, planet1→theme `./theme`, planet2·4→theme `../planet1/theme`(동작 보존), planet3→World `./World`.
