# 행성3 미션2 3D 월드(공감 송신기 연료 채우기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외부 앱 `ThreeDimenstionWorld/src/world` 의 stage1(연료 채우기) 3D 미니게임을 HeartGuardiansApp 행성3 미션2 미니게임으로 이식한다(Phase 1).

**Architecture:** 명령형 three.js 코드를 TypeScript 로 포팅해 `planet3/world/` 에 격리하고, `mountWorld(container, { onComplete })` 조립 함수를 React 래퍼 `EmpathyFuelGame.tsx` 의 `useEffect` 에서 실행한다. 게임은 MissionPlayer 의 `#stage`(1920×1200) 안 `z-index:1` 오버레이로 렌더되어 배경 위·스테퍼 아래에 놓인다. stage1 통과 시 `onComplete`→`onDone` 으로 미션 흐름에 복귀한다.

**Tech Stack:** React 19, TypeScript(strict, `tsc -b`), Vite, three@0.185 (`three/addons/loaders/GLTFLoader.js`), vitest.

## Global Constraints

- three 는 이미 설치됨(`three@^0.185`, `@types/three@^0.185`). 새 런타임 의존성 추가 금지.
- 이식 방식 B: 원본 명령형 코드를 재작성하지 말고 TS 로 포팅해 감싼다. 로직 변경 최소화.
- 미니게임은 `player/` 무대(#stage, 1920×1200) 안에서 렌더된다. 좌표계는 **무대(1920×1200) 기준 절대 px**. `100vw/100dvh/vh/vw` 금지(CLAUDE.md). `position:fixed` 대신 오버레이 내 `position:absolute`.
- GLB/에셋 파일명은 **영문·무공백**(CLAUDE.md). 개명해 `public/assets/planet3/world/models/` 로 이동.
- 캔버스 크기는 `window.innerWidth/Height` 가 아니라 **오버레이 엘리먼트 크기(ResizeObserver)** 기준. `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`.
- 레이어: 오버레이 `z-index:1`(배경 `#bg`=0 위, 스테퍼 `#progress`=5 아래).
- 완료: stage1 `passScore:5` 도달 → `onComplete()` 호출(원본 `startStage2` stub 는 제거).
- 테스트 러너: `npm test`(= `vitest run`). 타입체크/빌드: `npm run build`(= `tsc -b && vite build`).
- 소스 원본 루트: `D:/Work-HeartGuardians/ThreeDimenstionWorld/src/world/` (이하 `SRC/`), 모델 원본: `D:/Work-HeartGuardians/ThreeDimenstionWorld/models/` (이하 `MODELS/`).

---

### Task 1: 에셋·데이터 반입 + assets.ts

**Files:**
- Create: `public/assets/planet3/world/models/*.glb` (12개, 개명)
- Create: `src/scenes/planet/planet3/world/stage1-sentences.json`
- Create: `src/scenes/planet/planet3/world/assets.ts`

**Interfaces:**
- Produces: `assets.ts` 가 export 하는 GLB URL 상수 맵과 문장 데이터.
  - `export const MODEL_URLS: Record<ModelKey, string>` — Vite `?url` import 결과.
  - `export const STAGE1_DATA: { passScore: number; bubbles: {q:number;r:number;text:string;good:boolean}[] }`
  - `type ModelKey = 'hexA'|'hexB'|'tree01'|'tree02a'|'tree02b'|'tree02c'|'rock01'|'snowRock01'|'snowRock02'|'edgeRock'|'monument'|'bubble'`

- [ ] **Step 1: 모델 12개를 개명·복사**

Bash(POSIX):
```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp"
mkdir -p public/assets/planet3/world/models
M="d:/Work-HeartGuardians/ThreeDimenstionWorld/models"
D="public/assets/planet3/world/models"
cp "$M/Grounds Platforms/Hex 01A.glb"          "$D/hex-01a.glb"
cp "$M/Grounds Platforms/Hex 01B.glb"          "$D/hex-01b.glb"
cp "$M/Nature/Tree 01.glb"                     "$D/tree-01.glb"
cp "$M/Nature/Tree 02A.glb"                    "$D/tree-02a.glb"
cp "$M/Nature/Tree 02B.glb"                    "$D/tree-02b.glb"
cp "$M/Nature/Tree 02C.glb"                    "$D/tree-02c.glb"
cp "$M/Rocks/Rock 01.glb"                      "$D/rock-01.glb"
cp "$M/Rocks/Snow Rock 01.glb"                 "$D/snow-rock-01.glb"
cp "$M/Rocks/Snow Rock 02.glb"                 "$D/snow-rock-02.glb"
cp "$M/Rocks/Snow Rock Cluster 03.glb"         "$D/snow-rock-cluster-03.glb"
cp "$M/Buildings/Stone Monument 01 Lit.glb"    "$D/stone-monument-01-lit.glb"
cp "$M/Custom/Speech_bubble.glb"               "$D/speech-bubble.glb"
ls -la "$D"
```
Expected: 12개 .glb 존재.

- [ ] **Step 2: 문장 데이터 복사**

`d:/Work-HeartGuardians/ThreeDimenstionWorld/public/world/stage1-sentences.json` 내용을 그대로 `src/scenes/planet/planet3/world/stage1-sentences.json` 로 복사(내용 변경 없음).

- [ ] **Step 3: assets.ts 작성**

```ts
// GLB 모델 URL 맵 + stage1 문장 데이터. 원본 import.meta.glob 대신 명시적 맵.
import hexA from "/assets/planet3/world/models/hex-01a.glb?url";
import hexB from "/assets/planet3/world/models/hex-01b.glb?url";
import tree01 from "/assets/planet3/world/models/tree-01.glb?url";
import tree02a from "/assets/planet3/world/models/tree-02a.glb?url";
import tree02b from "/assets/planet3/world/models/tree-02b.glb?url";
import tree02c from "/assets/planet3/world/models/tree-02c.glb?url";
import rock01 from "/assets/planet3/world/models/rock-01.glb?url";
import snowRock01 from "/assets/planet3/world/models/snow-rock-01.glb?url";
import snowRock02 from "/assets/planet3/world/models/snow-rock-02.glb?url";
import edgeRock from "/assets/planet3/world/models/snow-rock-cluster-03.glb?url";
import monument from "/assets/planet3/world/models/stone-monument-01-lit.glb?url";
import bubble from "/assets/planet3/world/models/speech-bubble.glb?url";
import stage1 from "./stage1-sentences.json";

export type ModelKey =
  | "hexA" | "hexB"
  | "tree01" | "tree02a" | "tree02b" | "tree02c"
  | "rock01" | "snowRock01" | "snowRock02"
  | "edgeRock" | "monument" | "bubble";

export const MODEL_URLS: Record<ModelKey, string> = {
  hexA, hexB, tree01, tree02a, tree02b, tree02c,
  rock01, snowRock01, snowRock02, edgeRock, monument, bubble,
};

export type Bubble = { q: number; r: number; text: string; good: boolean };
export const STAGE1_DATA = stage1 as { passScore: number; bubbles: Bubble[] };
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc -b`
Expected: 에러 없음(`.glb?url` 모듈 선언이 없으면 실패 — 다음 스텝에서 처리).

- [ ] **Step 5: glb ?url 모듈 타입 선언(없을 때만)**

`src/vite-env.d.ts` 또는 신규 `src/glb.d.ts` 에 아래가 없으면 추가:
```ts
declare module "*.glb?url" {
  const src: string;
  export default src;
}
```
Run: `npx tsc -b` → Expected: PASS.

- [ ] **Step 6: 커밋**
```bash
git add public/assets/planet3/world src/scenes/planet/planet3/world/stage1-sentences.json src/scenes/planet/planet3/world/assets.ts src/*.d.ts
git commit -m "feat(planet3): 미션2 3D 월드 에셋·문장 데이터 반입 + assets.ts"
```

---

### Task 2: hexgrid.ts + collision.ts (순수 로직 + 테스트)

**Files:**
- Create: `src/scenes/planet/planet3/world/hexgrid.ts` (원본 `SRC/hexgrid.js`)
- Create: `src/scenes/planet/planet3/world/collision.ts` (원본 `SRC/collision.js`)
- Test: `src/scenes/planet/planet3/world/hexgrid.test.ts`, `collision.test.ts`

**Interfaces:**
- Produces (hexgrid): `hexKey(q:number,r:number):string`, `axialToWorld(q,r,size):{x:number;z:number}`, `worldToAxial(x,z,size):{q:number;r:number}`, `hexRound(qf,rf):{q,r}`, `neighbors(q,r):{q,r}[]`, `hexDistance(a,b):number`, `fieldCoords(radius):{q,r}[]`, `findPath(start,goal,isWalkable):{q,r}[]|null`.
- Produces (collision): `coveredHexes(x:number,z:number,R:number,size:number):{q,r}[]`, `reachableFrom(startKey:string, walkable:Set<string>):Set<string>`.

- [ ] **Step 1: 테스트 이식(실패 확인용)**

`SRC/hexgrid.test.js` → `world/hexgrid.test.ts`, `SRC/collision.test.js` → `world/collision.test.ts` 로 내용 복사. import 경로 `./hexgrid.js`→`./hexgrid`, `./collision.js`→`./collision` (확장자 제거).

- [ ] **Step 2: 테스트 실행(실패 확인)**

Run: `npx vitest run src/scenes/planet/planet3/world/hexgrid.test.ts src/scenes/planet/planet3/world/collision.test.ts`
Expected: FAIL — `Cannot find module './hexgrid'`.

- [ ] **Step 3: hexgrid.ts 이식**

`SRC/hexgrid.js` 내용을 복사하고 아래만 변경:
- 모든 export 함수 파라미터·반환에 타입 주석 추가(위 Interfaces 시그니처대로).
- `findPath` 내부 지역변수는 추론에 맡기되, `cameFrom: Map<string,string>`, `gScore/openF: Map<string,number>` 로 명시.
- 로직은 한 줄도 바꾸지 않는다.

- [ ] **Step 4: collision.ts 이식**

`SRC/collision.js` 내용 복사, import `./hexgrid.js`→`./hexgrid`, export 시그니처에 타입 주석 추가(Interfaces 대로). 로직 불변.

- [ ] **Step 5: 테스트·타입체크 통과 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/hexgrid.test.ts src/scenes/planet/planet3/world/collision.test.ts`
Expected: PASS.
Run: `npx tsc -b` → Expected: PASS.

- [ ] **Step 6: 커밋**
```bash
git add src/scenes/planet/planet3/world/hexgrid.ts src/scenes/planet/planet3/world/collision.ts src/scenes/planet/planet3/world/hexgrid.test.ts src/scenes/planet/planet3/world/collision.test.ts
git commit -m "feat(planet3): world 순수 로직 hexgrid·collision 이식(+테스트)"
```

---

### Task 3: playermove.ts + collectgame.ts (순수 로직 + 테스트)

**Files:**
- Create: `src/scenes/planet/planet3/world/playermove.ts` (원본 `SRC/playermove.js`)
- Create: `src/scenes/planet/planet3/world/collectgame.ts` (원본 `SRC/collectgame.js`)
- Test: `world/playermove.test.ts`, `world/collectgame.test.ts`

**Interfaces:**
- Produces (playermove): `stepForward(x:number,z:number,yaw:number,dist:number):{x:number;z:number}`, `resolveSlide(x:number,z:number,cx:number,cz:number,isWalkable:(x:number,z:number)=>boolean):{x:number;z:number}`.
- Produces (collectgame): `parseStage1Data(data:unknown, isWalkableKey:(q:number,r:number)=>boolean):{bubbles:CGBubble[];passScore:number;warnings:string[]}`, `createCollectGame(opts?:{passScore?:number}):{ choose(bubble:CGBubble, take:boolean):{scored:boolean;score:number;passed:boolean;alreadyConsumed:boolean}; isConsumed(id:number):boolean; passScore:number; readonly score:number; readonly passed:boolean }`.
  - `type CGBubble = { id:number; q:number; r:number; text:string; good:boolean }`

- [ ] **Step 1: 테스트 이식**

`SRC/playermove.test.js`→`world/playermove.test.ts`, `SRC/collectgame.test.js`→`world/collectgame.test.ts`. import 확장자 제거.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/playermove.test.ts src/scenes/planet/planet3/world/collectgame.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: playermove.ts 이식**

`SRC/playermove.js` 복사. import `./hexgrid.js`가 있으면 `./hexgrid` 로. export 시그니처 타입 주석 추가. 로직 불변.

- [ ] **Step 4: collectgame.ts 이식**

`SRC/collectgame.js` 복사. `export type CGBubble = { id:number; q:number; r:number; text:string; good:boolean }` 정의 추가(Task 6 이 import), `parseStage1Data`/`createCollectGame` 시그니처 타입 주석(Interfaces 대로). 내부 `consumed: Set<number>`. 로직 불변.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/playermove.test.ts src/scenes/planet/planet3/world/collectgame.test.ts` → PASS.
Run: `npx tsc -b` → PASS.

- [ ] **Step 6: 커밋**
```bash
git add src/scenes/planet/planet3/world/playermove.ts src/scenes/planet/planet3/world/collectgame.ts src/scenes/planet/planet3/world/playermove.test.ts src/scenes/planet/planet3/world/collectgame.test.ts
git commit -m "feat(planet3): world 순수 로직 playermove·collectgame 이식(+테스트)"
```

---

### Task 4: joystick.ts (벡터 순수함수 + 위젯 + 테스트)

**Files:**
- Create: `src/scenes/planet/planet3/world/joystick.ts` (원본 `SRC/joystick.js`)
- Test: `world/joystick.test.ts`

**Interfaces:**
- Produces: `joystickVector(dx:number,dy:number,radius:number,deadzone?:number):{throttle:number;turn:number}`, `createJoystick(opts?:{radius?:number}):{ element:HTMLDivElement; value:{throttle:number;turn:number} }`.

- [ ] **Step 1: 테스트 이식**

`SRC/joystick.test.js`→`world/joystick.test.ts`, import 확장자 제거.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/joystick.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: joystick.ts 이식**

`SRC/joystick.js` 복사. `value`/`element` 타입, 이벤트 핸들러 파라미터 `(e: PointerEvent)` 타입 추가. `setPointerCapture` 등 로직 불변.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/scenes/planet/planet3/world/joystick.test.ts` → PASS.
Run: `npx tsc -b` → PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/scenes/planet/planet3/world/joystick.ts src/scenes/planet/planet3/world/joystick.test.ts
git commit -m "feat(planet3): world 가상 조이스틱 이식(+테스트)"
```

---

### Task 5: worldbuild.ts (지형·장애물·눈, three)

**Files:**
- Create: `src/scenes/planet/planet3/world/worldbuild.ts` (원본 `SRC/worldbuild.js`)

**Interfaces:**
- Consumes: `hexgrid`(fieldCoords/axialToWorld/hexKey), `collision`(coveredHexes/reachableFrom), `assets`(MODEL_URLS).
- Produces: `buildTerrain(scene:THREE.Scene, loader:GLTFLoader, opts:{radius:number;size:number}):Promise<{walkable:Set<string>;size:number;radius:number;hexTopY:number}>`, `createSnow(count:number, area:number, height:number):THREE.Points`.

- [ ] **Step 1: worldbuild.ts 이식**

`SRC/worldbuild.js` 복사 후 아래 변경:
- import: `import * as THREE from 'three'`, `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'`(타입용). `./hexgrid.js`→`./hexgrid`, `./collision.js`→`./collision`.
- **모델 로딩 교체:** `import.meta.glob(...)` 와 `MODELS_DIR`/`urlFor` 제거. 대신 `import { MODEL_URLS } from './assets'` 후, 상수 경로를 `MODEL_URLS` 키로 치환:
  - `TILE_A/B` → `MODEL_URLS.hexA` / `MODEL_URLS.hexB`
  - `TREES` 배열 → `[MODEL_URLS.tree01, MODEL_URLS.tree02a, MODEL_URLS.tree02b, MODEL_URLS.tree02c]`
  - `ROCKS` → `[MODEL_URLS.rock01, MODEL_URLS.snowRock01, MODEL_URLS.snowRock02]`
  - `EDGE_ROCK` → `MODEL_URLS.edgeRock`, `MONUMENT` → `MODEL_URLS.monument`
  - `loader.loadAsync(urlFor(x))` → `loader.loadAsync(x)` (이미 URL).
- 타입 주석: 함수 시그니처(Interfaces 대로), `collectMeshes`/`addInstances`/`footprint` 내부는 `THREE.*` 타입 사용. `placements: {x:number;z:number;y?:number;rotY?:number;scale?:number}[]`.
- 배치·seed·수치 로직은 불변.

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b`
Expected: PASS (미사용 import·any 경고 없이). 실패 시 three 타입 주석 보완.

- [ ] **Step 3: 커밋**
```bash
git add src/scenes/planet/planet3/world/worldbuild.ts
git commit -m "feat(planet3): world 지형 빌더(worldbuild) 이식 — 명시적 에셋 URL"
```

---

### Task 6: bubbles.ts + player.ts (three)

**Files:**
- Create: `src/scenes/planet/planet3/world/bubbles.ts` (원본 `SRC/bubbles.js`)
- Create: `src/scenes/planet/planet3/world/player.ts` (원본 `SRC/player.js`)

**Interfaces:**
- Consumes: `hexgrid`(axialToWorld/worldToAxial/hexKey), `playermove`(stepForward/resolveSlide), `assets`(MODEL_URLS.bubble).
- Produces (bubbles): `createBubbles(scene:THREE.Scene, bubbles:CGBubble[], opts:{size:number;hexTopY?:number;floatHeight?:number}):Promise<{ update(dt:number,elapsed:number,camera:THREE.Camera):void; nearest(px:number,pz:number,radius:number):CGBubble|null; remove(id:number):void; clear():void; points():{x:number;z:number}[] }>`.
- Produces (player): `createPlayer(camera:THREE.Camera, opts:{size:number;hexTopY:number;eyeHeight:number;walkable:Set<string>;startHex:{q:number;r:number}}):{ update(dt:number, input:{throttle:number;turn:number}):void }`.

- [ ] **Step 1: bubbles.ts 이식**

`SRC/bubbles.js` 복사 후:
- import: `import * as THREE from 'three'`, `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'`, `./hexgrid.js`→`./hexgrid`.
- **모델 URL 교체:** `import.meta.glob(...)` 와 `modelUrls['/models/Custom/Speech_bubble.glb']` 제거. `import { MODEL_URLS } from './assets'` 후 `const BUBBLE_URL = MODEL_URLS.bubble;`.
- `CGBubble` 타입은 collectgame 에서 import: `import type { CGBubble } from './collectgame'`(id 포함 타입). 이 때문에 Task 3 의 collectgame.ts 는 `export type CGBubble` 로 내보내야 한다. 시그니처 타입 주석. `items: Map<number, {...}>`.
- 흔들림/빌보드/near 로직 불변.

- [ ] **Step 2: player.ts 이식**

`SRC/player.js` 복사. import `./hexgrid.js`→`./hexgrid`, `./playermove.js`→`./playermove`. 시그니처 타입 주석. 로직 불변.

- [ ] **Step 3: 타입체크**

Run: `npx tsc -b` → PASS.

- [ ] **Step 4: 커밋**
```bash
git add src/scenes/planet/planet3/world/bubbles.ts src/scenes/planet/planet3/world/player.ts
git commit -m "feat(planet3): world 말풍선·플레이어 컨트롤러 이식"
```

---

### Task 7: minimap.ts + scorehud.ts + popup.ts (UI 위젯)

**Files:**
- Create: `src/scenes/planet/planet3/world/minimap.ts` (원본 `SRC/minimap.js`)
- Create: `src/scenes/planet/planet3/world/scorehud.ts` (원본 `SRC/scorehud.js`)
- Create: `src/scenes/planet/planet3/world/popup.ts` (원본 `SRC/popup.js`)

**Interfaces:**
- Produces (minimap): `createMinimap(opts:{worldExtent:number}):{ element:HTMLElement; update(px:number,pz:number,yaw:number,points:{x:number;z:number}[]):void }` (원본 export 시그니처 유지 — Task 8 에서 사용).
- Produces (scorehud): `createScoreHud(passScore:number):{ element:HTMLElement; set(score:number):void; remove():void }`.
- Produces (popup): `showChoice(parent:HTMLElement,text:string,onChoose:(take:boolean)=>void):HTMLElement`, `showInfo(parent:HTMLElement,text:string,buttonLabel:string,onOk:(()=>void)|null,badgeEmoji?:string,highlights?:{words:string[];className:string}[]|null):HTMLElement`, `showFeedback(parent:HTMLElement,positive:boolean):HTMLElement`.

- [ ] **Step 1: 세 파일 이식**

각 원본(`SRC/minimap.js`, `SRC/scorehud.js`, `SRC/popup.js`)을 복사. 변경:
- `minimap.js`: three 사용 시 `import * as THREE from 'three'`. canvas 2D 컨텍스트/DOM 타입 주석. 시그니처는 원본 export 유지.
- `scorehud.js`/`popup.js`: 순수 DOM. 함수 시그니처 타입 주석(Interfaces 대로), 이벤트 핸들러 `(e: Event)` 타입. 로직 불변.

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b` → PASS.

- [ ] **Step 3: 커밋**
```bash
git add src/scenes/planet/planet3/world/minimap.ts src/scenes/planet/planet3/world/scorehud.ts src/scenes/planet/planet3/world/popup.ts
git commit -m "feat(planet3): world 미니맵·연료 게이지·팝업 위젯 이식"
```

---

### Task 8: stages.ts (단계 매니저 — stage1 + onComplete 배선)

**Files:**
- Create: `src/scenes/planet/planet3/world/stages.ts` (원본 `SRC/stages.js`)

**Interfaces:**
- Consumes: `hexgrid.hexKey`, `collectgame`(parseStage1Data/createCollectGame), `bubbles.createBubbles`, `scorehud.createScoreHud`, `popup`(showChoice/showInfo/showFeedback), `assets.STAGE1_DATA`.
- Produces: `createStageManager(ctx:{ scene:THREE.Scene; camera:THREE.Camera; walkable:Set<string>; size:number; uiRoot:HTMLElement; setInputLocked:(locked:boolean)=>void; onComplete:()=>void }):{ start():Promise<void>; update(dt:number):void; bubblePoints():{x:number;z:number}[] }`.

- [ ] **Step 1: stages.ts 이식 + 데이터 로딩 교체 + 완료 배선**

`SRC/stages.js` 복사 후 변경:
- import 확장자 제거, `import { STAGE1_DATA } from './assets'` 추가, three 타입 import.
- **데이터 로딩 교체:** `start()` 안의 `fetch('/world/stage1-sentences.json')` … `try/catch` 블록 제거. 대신 `const data = STAGE1_DATA;` 로 바로 사용.
- **ctx 타입 확장:** `ctx` 에 `onComplete: () => void` 추가.
- **완료 배선:** `onPass()` 의 `showInfo(... '다음으로', () => { ... startStage2(); })` 콜백에서 `startStage2()` 호출을 `ctx.onComplete()` 로 교체. bubbles/hud 정리(`bubbles.clear()` 등)는 그대로 두되 `ctx.onComplete()` 를 마지막에 호출.
- **stage2 stub 제거:** `startStage2()` 함수 정의를 삭제(더 이상 참조 없음).
- 나머지(showMissionIntro/openPopup/update/PROXIMITY) 로직 불변.

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b` → PASS.

- [ ] **Step 3: 커밋**
```bash
git add src/scenes/planet/planet3/world/stages.ts
git commit -m "feat(planet3): world 단계 매니저 이식 — stage1 통과 시 onComplete 호출"
```

---

### Task 9: mountWorld.ts (조립 + 라이프사이클)

**Files:**
- Create: `src/scenes/planet/planet3/world/mountWorld.ts` (원본 `SRC/main.js` 이식)

**Interfaces:**
- Consumes: worldbuild(buildTerrain/createSnow), player(createPlayer), minimap(createMinimap), joystick(createJoystick), stages(createStageManager).
- Produces: `mountWorld(container:HTMLElement, opts:{ onComplete:()=>void }):() => void` — 반환값은 dispose 함수.

- [ ] **Step 1: mountWorld.ts 이식(핵심 변경 다수)**

`SRC/main.js` 를 함수 `export function mountWorld(container, { onComplete }) { ... }` 본문으로 이식. 변경 사항:
- 최상위 `await` 제거 → 내부에서 async IIFE 또는 `.then` 로 초기화하고, dispose 는 즉시 반환(초기화 완료 여부와 무관하게 안전하게 정리).
- **캔버스 생성:** `document.getElementById('view')` 대신 `const canvas = document.createElement('canvas'); container.appendChild(canvas);`.
- **UI 부착 대상:** `document.getElementById('app')` → `container` (minimap/joystick/hud/popup 모두 container 에 append).
- **크기 산정 교체:** `resize()` 의 `window.innerWidth/innerHeight` → `container.clientWidth/clientHeight`. `window.addEventListener('resize', resize)` 제거하고 `const ro = new ResizeObserver(resize); ro.observe(container);` 로 대체.
- **로딩/에러 오버레이(makeOverlay):** `document.body.appendChild` → `container.appendChild` 로 변경(무대 안에 표시). `location.reload()` 버튼은 유지하되, 미션 문맥에선 위험하므로 '다시 시도' 버튼을 오버레이 제거 후 재초기화 호출로 바꾸거나 단순 제거. Phase 1 은 **에러 오버레이에서 reload 버튼 제거**(문구만 표시).
- **stages 생성:** `createStageManager({ ..., onComplete })` 로 `onComplete` 전달.
- **입력/키보드:** `keydown/keyup/blur` window 리스너 유지하되 핸들러 참조를 변수로 보관(정리용). `contextmenu` preventDefault 도 핸들러 변수 보관.
- **애니메이션 루프:** `renderer.setAnimationLoop(...)` 유지.
- **dispose 반환:** 아래를 모두 수행하는 함수 반환:
```ts
return () => {
  disposed = true;
  renderer.setAnimationLoop(null);
  ro.disconnect();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('contextmenu', onContextMenu);
  // 씬 리소스 정리
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if ((mesh as any).geometry) (mesh as any).geometry.dispose?.();
    const mat = (mesh as any).material;
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m: any) => m?.dispose?.());
  });
  renderer.dispose();
  container.replaceChildren(); // canvas·UI DOM 제거
};
```
- 초기화가 dispose 이후 완료되는 경쟁 조건 방지: `let disposed = false;` 를 두고, async 초기화 완료 콜백 진입 시 `if (disposed) return;` 체크.

- [ ] **Step 2: 타입체크**

Run: `npx tsc -b` → PASS.

- [ ] **Step 3: 커밋**
```bash
git add src/scenes/planet/planet3/world/mountWorld.ts
git commit -m "feat(planet3): world 조립·라이프사이클 mountWorld 이식(dispose 정리 포함)"
```

---

### Task 10: EmpathyFuelGame.tsx + .css (React 래퍼)

**Files:**
- Create: `src/scenes/planet/planet3/EmpathyFuelGame.tsx`
- Create: `src/scenes/planet/planet3/EmpathyFuelGame.css` (원본 `SRC/style.css` 이식)

**Interfaces:**
- Consumes: `mountWorld`.
- Produces: `export default function EmpathyFuelGame({ onDone }: { onDone: () => void })`.

- [ ] **Step 1: EmpathyFuelGame.tsx 작성**

```tsx
import { useEffect, useRef } from "react";
import { mountWorld } from "./world/mountWorld";
import "./EmpathyFuelGame.css";

// 행성3 미션2 미니게임 — 3D 겨울 숲에서 '따듯한 말'로 공감 송신기 연료 채우기.
// ThreeDimenstionWorld/src/world 의 stage1 을 이식(mountWorld). 통과 시 onDone().
export default function EmpathyFuelGame({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!ref.current) return;
    const dispose = mountWorld(ref.current, { onComplete: () => doneRef.current() });
    return dispose;
  }, []);

  return <div className="efg-overlay" ref={ref} onClick={(e) => e.stopPropagation()} />;
}
```

- [ ] **Step 2: EmpathyFuelGame.css 작성(원본 style.css 이식)**

`SRC/style.css` 내용을 복사하되:
- 최상위 셀렉터를 `.efg-overlay` 스코프로 감싼다(전역 `html,body`/`#app`/`#view` 규칙 제거 또는 `.efg-overlay`/`.efg-overlay canvas` 로 교체).
- 오버레이 루트 규칙 추가:
```css
.efg-overlay { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
.efg-overlay canvas { display: block; width: 100%; height: 100%; touch-action: none; }
```
- **좌상단 힌트 패널 규칙 제거**(`.panel`, `.hint`, `.home-link` 등 — DOM 도 mountWorld 에서 생성 안 함).
- `.minimap`/`.joystick`/`.score-hud`/`.popup-*`/`.feedback` 규칙은 유지(위치는 `position:absolute` 로 오버레이 기준).

- [ ] **Step 3: 타입체크·빌드**

Run: `npx tsc -b` → PASS.

- [ ] **Step 4: 커밋**
```bash
git add src/scenes/planet/planet3/EmpathyFuelGame.tsx src/scenes/planet/planet3/EmpathyFuelGame.css
git commit -m "feat(planet3): 미션2 미니게임 React 래퍼 EmpathyFuelGame"
```

---

### Task 11: 미션 배선 (mission02.json · index.tsx · theme.ts + 하티 대사)

**Files:**
- Modify: `src/scenes/planet/planet3/mission02.json`
- Modify: `src/scenes/planet/planet3/index.tsx:79-93`
- Modify: `src/scenes/planet/planet3/theme.ts:72-90`

**Interfaces:**
- Consumes: `EmpathyFuelGame`.

- [ ] **Step 1: mission02.json — game 키 + 하티 실제 대사**

`p3_m2_play` 의 `"game": "placeholder"` → `"game": "empathyFuel"`.
`p3_m2_intro.text` → 실제: `"공감 송신기를 켜려면 에너지가 필요해. 얼음 숲을 돌아다니며 '따듯한 말'을 모아 연료를 채워보자!"`.
`p3_m2_end.text` → 실제: `"충전 완료! 공감 송신기가 다시 따뜻하게 빛나기 시작했어. 정말 잘했어!"` (`completeBanner`/`onEnter` 는 유지).

- [ ] **Step 2: index.tsx — games 맵 교체**

`import PlaceholderGameStage from "./PlaceholderGameStage";` 는 미션3 이 계속 쓰므로 유지.
`import EmpathyFuelGame from "./EmpathyFuelGame";` 추가.
mission2 블록의 `games={{ placeholder: ... }}` 를 아래로 교체:
```tsx
games={{
  // 미션2 미니게임 — 3D 얼음 숲에서 따듯한 말로 공감 송신기 연료 채우기.
  empathyFuel: ({ onDone }) => <EmpathyFuelGame onDone={onDone} />,
}}
```

- [ ] **Step 3: theme.ts — MISSION02_THEME 배너 문구**

`MISSION02_THEME.banner` 를 실제 문구로:
```ts
banner: { pill: "미션 2", title: "공감 송신기 연료 채우기", ribbon: "따듯한 말을 모아 송신기를 충전하라!" },
```
(`bannerNode`, `bg`, 나머지는 유지.)

- [ ] **Step 4: missions.test.ts 회귀 확인**

Run: `npx vitest run src/scenes/planet/planet3/missions.test.ts`
Expected: PASS (mission02 노드 그래프 intro→play→end 유효).

- [ ] **Step 5: 빌드**

Run: `npm run build`
Expected: `tsc -b` + `vite build` 성공.

- [ ] **Step 6: 커밋**
```bash
git add src/scenes/planet/planet3/mission02.json src/scenes/planet/planet3/index.tsx src/scenes/planet/planet3/theme.ts
git commit -m "feat(planet3): 미션2에 EmpathyFuelGame 배선 + 하티 대사·배너 실문구"
```

---

### Task 12: 실기 검증 (dev 브라우저)

**Files:** 없음(검증 전용).

- [ ] **Step 1: 전체 테스트·빌드**

Run: `npm test` → 전체 vitest PASS.
Run: `npm run build` → PASS.

- [ ] **Step 2: dev 서버로 미션2 직접 진입**

Run: `npm run dev` (백그라운드).
브라우저에서 planet3 라우트에 `?stage=mission2`(또는 `?m=2`)로 진입.
확인:
- 하티 인트로 대사 표시 → 미니게임 진입.
- world 자체 인트로 팝업(🔋 규칙) 표시, 닫으면 이동 가능.
- 조이스틱/키보드로 1인칭 이동, 말풍선 근접 시 선택 팝업, 충전/방전 게이지 반영.
- **레이어:** 3D 가 미션 배경 위·상단 스테퍼 아래로 보이는지. 미니맵과 스테퍼 겹침 여부(겹치면 `.minimap` top/right 조정).
- 착한 말 5개 → "충전 완료 🎉" → "다음으로" → 미션2 완료 → 미션3 placeholder 진입.

- [ ] **Step 3: 정리(누수) 확인**

미션2 진입/이탈 반복 시 콘솔 오류·WebGL 컨텍스트 경고("Too many active WebGL contexts") 없는지 확인. StrictMode 이중 마운트에도 정상.

- [ ] **Step 4: 결과 기록**

검증 결과를 사용자에게 보고. 문제 발견 시 해당 Task 로 돌아가 수정.

---

## 범위 밖 (Phase 2)

- stage2(NPC 3개) 구현, stage1=미션2/stage2=미션3 연속 월드 구조 재편, 행성3 단일 엔딩.
- 태블릿 APK immersive 실기 성능 튜닝(별도 검증 사이클).
