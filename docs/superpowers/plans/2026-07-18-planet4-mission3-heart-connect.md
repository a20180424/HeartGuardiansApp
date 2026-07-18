# 행성4 미션3 "하트 커넥트 : 마지막 연결" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mytemp/그림자 행성 미션3 게임/index.html`(루트, 최종본)을 React로 이식해, 행성4의 임시 골격 미션3을 실제 "하트 커넥트 : 마지막 연결" 미니게임(스토리→퀴즈→엔딩영상→후일담→성공화면)으로 대체한다.

**Architecture:** mission2(CourageCompass) 이식 관례를 따른다 — 엔진은 인트로 배너 노드 1개만 맡고, 미니게임 컴포넌트 `HeartConnectStage`가 스토리~피날레 전체를 phase 머신으로 소유한다. 콘텐츠·타입은 `heartConnect.data.ts`로 분리(vitest), 뷰·연출·타이머는 `HeartConnectStage.tsx`. 게임은 엔진 `#stage`(1920×1200)를 덮는 오버레이 안에서 원본 1280×800 좌표계를 `transform: scale(1.5)`로 확대 렌더한다.

**Tech Stack:** React 19, TypeScript, Vite, vitest, playwright(MCP, 브라우저 검증). 상태는 `useState` + 로컬 타이머. 스타일은 컴포넌트 로컬 CSS.

## Global Constraints

- 레이아웃은 무대(1920×1200) 좌표계 px 절대배치. **`vh`/`vw`/`dvh`/`svh` 금지**(CLAUDE.md).
- 미니게임 컴포넌트 계약: `export default function HeartConnectStage({ onDone }: { onDone: () => void })`. 성공 화면 "우주선으로 이동" 버튼에서 `onDone()`을 1회 호출.
- 에셋은 `public/assets/planet4/`에 두고 `/assets/planet4/<name>`으로 참조. 한글·공백 파일명 금지.
- 게임 콘텐츠 텍스트(스토리·질문·선택지·피드백·후일담·최종 대사)는 원본 원문을 **글자 그대로** 옮긴다.
- 원본 5원석 순서·정답: ①이해의 사파이어=긴장(idx1), ②관찰의 호박석=어두워보여(idx0), ③경청의 토파즈=듣고있어(idx2), ④표현의 루비=속상했겠다(idx0), ⑤용기의 에메랄드=인사해보자(idx1).
- **엔진 완료 버튼 우회**: `p4_m3_play`(minigame, `next:null`)에 `fx_light_return`을 넣지 않는다. 성공 버튼은 엔진 `finishMinigame`이 아니라 planet 컨테이너가 넘긴 홈 이동 콜백(`completePlanet(4)`+`nav`)을 직접 호출한다.
- 참조 원본(리포 내 정본): `mytemp/그림자 행성 미션3 게임/index.html`. 이 계획은 그 파일을 React로 옮기는 지침이며, 마크업/스타일/연출 타이밍의 세부는 원본을 정본으로 본다.

---

## File Structure

- **Create** `public/assets/planet4/*` — 미니게임 에셋 19개(mytemp에서 복사·rename).
- **Create** `src/scenes/planet/planet4/heartConnect.data.ts` — 5원석 미션 + 스토리/후일담/최종 대사 + 에셋 경로 상수 + 타입.
- **Create** `src/scenes/planet/planet4/heartConnect.data.test.ts` — 데이터 무결성 테스트.
- **Create** `src/scenes/planet/planet4/HeartConnectStage.tsx` — 미니게임 뷰(phase 머신).
- **Create** `src/scenes/planet/planet4/HeartConnectStage.css` — 원본 스타일 이식(1280×800 → scale 1.5 래퍼).
- **Rewrite** `src/scenes/planet/planet4/mission03.json` — 임시 골격(2노드) → `p4_m3_intro`(배너) + `p4_m3_play`(minigame).
- **Modify** `src/scenes/planet/planet4/theme.ts` — `MISSION03_THEME` 배경/리본 실값 + `heartConnect` 배선.
- **Modify** `src/scenes/planet/planet4/index.tsx` — mission3에 `games`·`steps`·`scopeClass` 추가, `finish` 제거, `onExit`/`onDone`에 `completePlanet(4)`+홈.
- **Modify** `src/scenes/planet/planet4/missions.test.ts` — mission03 새 형태(1 line + minigame, fx 없음)에 맞게 갱신.

---

### Task 1: 에셋 반입 (mytemp → planet4 폴더)

**Files:**
- Create: `public/assets/planet4/` (아래 19개)
- Source: `mytemp/그림자 행성 미션3 게임/`

**Interfaces:**
- Produces: 아래 경로의 에셋들. `heartConnect.data.ts` / CSS가 이 경로를 참조.

원본→대상 매핑(원본은 루트 폴더 기준):
| 원본 | 대상 |
|------|------|
| `하트 커넥트 내부 배경.png` | `heart-connect-interior-bg.png` |
| `고민하는 하티.png` | `hati-pondering.png` |
| `제안하는 하티.png` | `hati-proposing.png` |
| `기본 하티.png` | `hati-default.png` |
| `공감 다이아몬드.png` | `empathy-diamond.png` |
| `행성1-이해의 사파이어.png` | `gem-sapphire-understanding.png` |
| `행성2-관찰의 호박석.png` | `gem-amber-observation.png` |
| `행성2- 경청의 토파즈.png` | `gem-topaz-listening.png` |
| `행성2- 표현의 루비.png` | `gem-ruby-expression.png` |
| `행성4-용기의 에메랄드.png` | `gem-emerald-courage.png` |
| `엔딩 동영상.mp4` | `heart-connect-ending.mp4` |
| `지구1.png` | `earth-1.png` |
| `지구2.png` | `earth-2.png` |
| `지구3.png` | `earth-3.png` |
| `학교.png` | `school.png` |
| `교실.png` | `classroom.png` |
| `Background01.png` | `success-bg.png` |
| `TitleBanner.png` | `title-banner.png` |
| `탐험 대 성공 배너.png` | `mission-success-banner.png` |

- [ ] **Step 1: 대상 폴더 확인 + 복사·rename**

Bash 도구로 실행(원본 파일명에 공백·한글이 있으므로 각 줄을 따옴표로 감싼다):
```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp"
SRC="mytemp/그림자 행성 미션3 게임"
DST="public/assets/planet4"
mkdir -p "$DST"
cp "$SRC/하트 커넥트 내부 배경.png"    "$DST/heart-connect-interior-bg.png"
cp "$SRC/고민하는 하티.png"           "$DST/hati-pondering.png"
cp "$SRC/제안하는 하티.png"           "$DST/hati-proposing.png"
cp "$SRC/기본 하티.png"              "$DST/hati-default.png"
cp "$SRC/공감 다이아몬드.png"         "$DST/empathy-diamond.png"
cp "$SRC/행성1-이해의 사파이어.png"    "$DST/gem-sapphire-understanding.png"
cp "$SRC/행성2-관찰의 호박석.png"      "$DST/gem-amber-observation.png"
cp "$SRC/행성2- 경청의 토파즈.png"     "$DST/gem-topaz-listening.png"
cp "$SRC/행성2- 표현의 루비.png"       "$DST/gem-ruby-expression.png"
cp "$SRC/행성4-용기의 에메랄드.png"    "$DST/gem-emerald-courage.png"
cp "$SRC/엔딩 동영상.mp4"            "$DST/heart-connect-ending.mp4"
cp "$SRC/지구1.png"                 "$DST/earth-1.png"
cp "$SRC/지구2.png"                 "$DST/earth-2.png"
cp "$SRC/지구3.png"                 "$DST/earth-3.png"
cp "$SRC/학교.png"                  "$DST/school.png"
cp "$SRC/교실.png"                  "$DST/classroom.png"
cp "$SRC/Background01.png"          "$DST/success-bg.png"
cp "$SRC/TitleBanner.png"           "$DST/title-banner.png"
cp "$SRC/탐험 대 성공 배너.png"        "$DST/mission-success-banner.png"
```

- [ ] **Step 2: 19개 반입 확인**

Run:
```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && ls -1 public/assets/planet4/ | grep -E "heart-connect-interior-bg|hati-pondering|hati-proposing|hati-default|empathy-diamond|gem-sapphire-understanding|gem-amber-observation|gem-topaz-listening|gem-ruby-expression|gem-emerald-courage|heart-connect-ending.mp4|earth-1|earth-2|earth-3|school|classroom|success-bg|title-banner|mission-success-banner" | wc -l
```
Expected: `19`

- [ ] **Step 3: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add public/assets/planet4/ && git commit -m "assets(planet4): 미션3 하트 커넥트 에셋 19개 반입"
```

---

### Task 2: heartConnect.data.ts + 데이터 테스트 (TDD)

**Files:**
- Create: `src/scenes/planet/planet4/heartConnect.data.ts`
- Test: `src/scenes/planet/planet4/heartConnect.data.test.ts`

**Interfaces:**
- Produces (later tasks consume):
  - `const A4 = "/assets/planet4"` 기반 경로 상수: `BG_INTERIOR`, `IMG_DIAMOND`, `IMG_VIDEO`, `IMG_SUCCESS_BG`, `IMG_TITLE_BANNER`, `IMG_SUCCESS_BANNER`, `HATI_DEFAULT`.
  - `STORY_LINES: { hati: string; text: string }[]` (길이 3).
  - `MISSIONS: { gem: string; image: string; text: string; options: string[]; correct: number }[]` (길이 5).
  - `POST_LINES: string[]` (길이 6).
  - `FINAL_LINES: string[]` (길이 2).
  - `EPILOGUE_BG: { earth1,earth2,earth3,school,classroom: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/scenes/planet/planet4/heartConnect.data.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  STORY_LINES,
  MISSIONS,
  POST_LINES,
  FINAL_LINES,
  EPILOGUE_BG,
  BG_INTERIOR,
  IMG_DIAMOND,
  IMG_VIDEO,
} from "./heartConnect.data";

describe("heartConnect.data", () => {
  it("스토리 3줄, 각 줄에 하티 스프라이트와 텍스트가 있다", () => {
    expect(STORY_LINES).toHaveLength(3);
    STORY_LINES.forEach((l) => {
      expect(l.hati).toMatch(/^\/assets\/planet4\//);
      expect(l.text.length).toBeGreaterThan(0);
    });
  });

  it("원석 미션 5개, 선택지 3개, 정답 인덱스가 0..2 범위다", () => {
    expect(MISSIONS).toHaveLength(5);
    MISSIONS.forEach((m) => {
      expect(m.options).toHaveLength(3);
      expect(m.correct).toBeGreaterThanOrEqual(0);
      expect(m.correct).toBeLessThanOrEqual(2);
      expect(m.image).toMatch(/^\/assets\/planet4\/gem-/);
      expect(m.gem.length).toBeGreaterThan(0);
    });
  });

  it("확정된 정답 매핑을 지킨다(원본 원문)", () => {
    expect(MISSIONS.map((m) => m.correct)).toEqual([1, 0, 2, 0, 1]);
    expect(MISSIONS[1].options[MISSIONS[1].correct]).toBe(
      "표정이 조금 어두워 보여. 무슨 일 있어?",
    );
  });

  it("후일담 6줄, 최종 2줄", () => {
    expect(POST_LINES).toHaveLength(6);
    expect(FINAL_LINES).toHaveLength(2);
  });

  it("에셋 경로 상수가 planet4 경로를 가리킨다", () => {
    [BG_INTERIOR, IMG_DIAMOND, IMG_VIDEO, ...Object.values(EPILOGUE_BG)].forEach((p) =>
      expect(p).toMatch(/^\/assets\/planet4\//),
    );
    expect(IMG_VIDEO).toMatch(/\.mp4$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx vitest run src/scenes/planet/planet4/heartConnect.data.test.ts`
Expected: FAIL — `Cannot find module './heartConnect.data'`.

- [ ] **Step 3: Write heartConnect.data.ts**

Create `src/scenes/planet/planet4/heartConnect.data.ts`(텍스트는 원본 `index.html` 원문 그대로):
```ts
// 행성4 미션3 "하트 커넥트 : 마지막 연결" 콘텐츠·타입·에셋 경로.
// 원본: mytemp/그림자 행성 미션3 게임/index.html (story[], missions[], postLines[], startFinalTyping).

const A4 = "/assets/planet4";

// 배경·이미지
export const BG_INTERIOR = `${A4}/heart-connect-interior-bg.png`;
export const IMG_DIAMOND = `${A4}/empathy-diamond.png`;
export const IMG_VIDEO = `${A4}/heart-connect-ending.mp4`;
export const IMG_SUCCESS_BG = `${A4}/success-bg.png`;
export const IMG_TITLE_BANNER = `${A4}/title-banner.png`;
export const IMG_SUCCESS_BANNER = `${A4}/mission-success-banner.png`;

// 하티 스프라이트
export const HATI_PONDERING = `${A4}/hati-pondering.png`;
export const HATI_PROPOSING = `${A4}/hati-proposing.png`;
export const HATI_DEFAULT = `${A4}/hati-default.png`;

// 후일담 배경(크로스페이드 순서: earth1→2→3 → school → classroom)
export const EPILOGUE_BG = {
  earth1: `${A4}/earth-1.png`,
  earth2: `${A4}/earth-2.png`,
  earth3: `${A4}/earth-3.png`,
  school: `${A4}/school.png`,
  classroom: `${A4}/classroom.png`,
};

// 스토리 인트로 3줄(원본 story[] + storyLine()의 하티 교체 순서).
export const STORY_LINES: { hati: string; text: string }[] = [
  { hati: HATI_PONDERING, text: "왜일까? 공감 원석도, 공감 에너지도 모두 완성되었는데…" },
  {
    hati: HATI_PROPOSING,
    text: "하트 커넥트를 복원하기 위해서는 다섯 공감 원석이 하나로 연결된 공감 다이아몬드가 필요해.",
  },
  {
    hati: HATI_DEFAULT,
    text: "누군가의 마음과 또 다른 마음이 연결될 때 비로소 다섯 원석이 깨어난단다.\n다섯 공감 원석을 모두 연결해 공감 다이아몬드를 완성하자.",
  },
];

// 5원석 퀴즈(원본 missions[]).
export const MISSIONS: {
  gem: string;
  image: string;
  text: string;
  options: string[];
  correct: number;
}[] = [
  {
    gem: "이해의 사파이어",
    image: `${A4}/gem-sapphire-understanding.png`,
    text: "친구가 발표를 앞두고 손을 떨고 있어. 어떤 마음인지 이해해 볼까?",
    options: ["발표가 싫은가 봐.", "많이 긴장되고 떨리겠구나.", "연습을 안 했나 봐."],
    correct: 1,
  },
  {
    gem: "관찰의 호박석",
    image: `${A4}/gem-amber-observation.png`,
    text: "쉬는 시간, 한 친구가 혼자 창밖만 보고 있어. 어떻게 말하는 것이 좋을까?",
    options: ["표정이 조금 어두워 보여. 무슨 일 있어?", "왜 혼자 있어?", "같이 놀기 싫은가 봐."],
    correct: 0,
  },
  {
    gem: "경청의 토파즈",
    image: `${A4}/gem-topaz-listening.png`,
    text: "친구가 속상한 일을 이야기하기 시작했어.",
    options: ["내 이야기도 들어 봐.", "그건 별일 아니야.", "응, 천천히 말해 줘. 내가 듣고 있어."],
    correct: 2,
  },
  {
    gem: "표현의 루비",
    image: `${A4}/gem-ruby-expression.png`,
    text: "열심히 준비했지만 결과가 좋지 않아 속상하다는 친구에게 어떻게 말할까?",
    options: ["많이 노력했는데 속상했겠다.", "다음엔 잘하면 되지.", "울지 마."],
    correct: 0,
  },
  {
    gem: "용기의 에메랄드",
    image: `${A4}/gem-emerald-courage.png`,
    text: "전학 온 친구에게 먼저 다가가고 싶지만 망설여져.",
    options: ["괜히 어색해질 거야.", "용기 내서 함께 인사해 보자.", "그냥 기다리면 돼."],
    correct: 1,
  },
];

// 후일담 6줄(원본 postLines[]). 마지막 줄은 '\n' 뒤가 강조 span.
export const POST_LINES: string[] = [
  "지금 연결된 원석들의 마음은.",
  "사실 우주에 있는 친구들만이 아니야.",
  "교실에서도…",
  "친구를 이해하려고 하는 작은 말 한마디가…",
  "또 하나의 공감 에너지를 만든단다.",
  "게임은 끝났지만, 하트 커넥트는 계속 연결되고 있어.\n교실에서 그 연결을 이어 가는 건 바로 너야.",
];

// 성공 화면 최종 타이핑 2줄(원본 startFinalTyping()).
export const FINAL_LINES: string[] = [
  "“공감 탐험은 끝난 것이 아니야.”",
  "“이제 지구, 그리고 우리 교실에서 계속 이어질 거야.”",
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx vitest run src/scenes/planet/planet4/heartConnect.data.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add src/scenes/planet/planet4/heartConnect.data.ts src/scenes/planet/planet4/heartConnect.data.test.ts && git commit -m "feat(planet4): 미션3 하트 커넥트 콘텐츠 데이터 + 테스트"
```

---

### Task 3: 미니게임 스텁 + 엔진 배선 + missions.test 갱신 (TDD)

엔진이 `HeartConnectStage`를 참조하려면 컴포넌트가 있어야 컴파일된다. 먼저 **최소 스텁**(성공 버튼만)으로 배선을 끝내고 `tsc -b`·`missions.test`·브라우저 스모크를 통과시킨다. phase 본문은 Task 4~8에서 채운다.

**Files:**
- Create: `src/scenes/planet/planet4/HeartConnectStage.tsx` (스텁)
- Create: `src/scenes/planet/planet4/HeartConnectStage.css` (빈 파일 + 루트만)
- Rewrite: `src/scenes/planet/planet4/mission03.json`
- Modify: `src/scenes/planet/planet4/theme.ts:98-116` (`MISSION03_THEME`)
- Modify: `src/scenes/planet/planet4/index.tsx:92-101` (mission3 블록) + import
- Modify: `src/scenes/planet/planet4/missions.test.ts`

**Interfaces:**
- Consumes: Task 2의 `heartConnect.data.ts`(스텁 단계에선 미사용 가능).
- Produces: `export default function HeartConnectStage({ onDone }: { onDone: () => void })`. mission03 노드 `p4_m3_intro`(line, bannerNode)·`p4_m3_play`(minigame `game:"heartConnect"`, `next:null`).

- [ ] **Step 1: missions.test.ts를 새 mission03 형태로 갱신(실패 유도)**

`src/scenes/planet/planet4/missions.test.ts`에서 fx_light_return을 기대하는 `it.each`를 mission01·02로 좁히고, mission03 전용 테스트를 추가한다. 아래로 파일 하단 `describe` 블록을 교체:
```ts
describe("planet4 mission skeletons", () => {
  // mission01·02는 엔진 end 노드에서 fx_light_return 을 쏜다. mission03은 미니게임이 종착이라 제외.
  it.each(["mission01", "mission02"])(
    "%s: 시작→끝을 걸어 end 에 도달하고 마지막에 fx_light_return 을 쏜다",
    async (id) => {
      const { lines, fx } = await runToEnd(MISSIONS[id]);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(fx).toContain("fx_light_return");
    },
  );

  it.each(["mission01", "mission02", "mission03"])(
    "%s: 노드 id 가 p4_m 접두어를 쓰고 start 노드가 존재한다",
    (id) => {
      const data = MISSIONS[id];
      expect(data.nodes.some((n) => n.id === data.start)).toBe(true);
      expect(data.nodes.every((n) => n.id.startsWith("p4_m"))).toBe(true);
    },
  );

  it("mission03: 인트로 배너 line + heartConnect 미니게임(종착)으로 끝난다", async () => {
    const data = MISSIONS["mission03"];
    expect(data.start).toBe("p4_m3_intro");
    const intro = data.nodes.find((n) => n.id === "p4_m3_intro");
    const play = data.nodes.find((n) => n.id === "p4_m3_play");
    expect(intro?.type).toBe("line");
    expect(play?.type).toBe("minigame");
    expect(play?.game).toBe("heartConnect");
    expect(play?.next ?? null).toBeNull();
    // FakeView 로 끝까지 걸으면 end 에 도달(showMinigame 이 done 호출).
    const { lines } = await runToEnd(data);
    expect(lines).toContain(intro?.text || "");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx vitest run src/scenes/planet/planet4/missions.test.ts`
Expected: FAIL — 현재 mission03(임시 골격)엔 `p4_m3_play`가 없어 새 테스트가 실패.

- [ ] **Step 3: mission03.json 재작성**

`src/scenes/planet/planet4/mission03.json` 전체를 교체:
```json
{
  "id": "mission03",
  "title": "마지막 공감 연결하기",
  "start": "p4_m3_intro",
  "nodes": [
    {
      "id": "p4_m3_intro",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "noAuto": true,
      "text": "다섯 공감 원석을 깨워서 공감 다이아몬드를 완성하자!\n누군가의 마음과 또 다른 마음이 연결될 때 비로소 하트 커넥트는 빛날 수 있어!",
      "next": "p4_m3_play"
    },
    {
      "id": "p4_m3_play",
      "type": "minigame",
      "hideFriend": true,
      "noAuto": true,
      "game": "heartConnect",
      "next": null
    }
  ]
}
```

- [ ] **Step 4: theme.ts의 MISSION03_THEME 갱신**

`src/scenes/planet/planet4/theme.ts`에서 `MISSION03_THEME` 블록을 교체(배경=하트커넥트 내부, 리본 실문구, 퀴즈에서도 배경 유지):
```ts
export const MISSION03_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 3", title: MISSION_STEPS[2], ribbon: "다섯 공감 원석을 이어 하트 커넥트를 복원하라!" },
  bannerNode: "p4_m3_intro",
  bg: {
    states: { main: `${A}/planet4/heart-connect-interior-bg.png` },
    initial: "main",
    byNode: { p4_m3_intro: "main", p4_m3_play: "main" },
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

- [ ] **Step 5: HeartConnectStage 스텁 + CSS 생성**

Create `src/scenes/planet/planet4/HeartConnectStage.css`:
```css
/* 행성4 미션3 "하트 커넥트" 미니게임.
   엔진 #stage(1920×1200) 위 1280×800 프레임을 scale(1.5)로 채운다(원본 px 좌표 재사용).
   퀴즈 배경은 깔지 않는다 — 엔진 #bg(heart-connect-interior-bg.png)가 비쳐야 한다. */
.hc-root {
  position: absolute;
  inset: 0;
  z-index: 100;
  color: #fff;
  font-family: inherit;
}
.hc-frame {
  position: absolute;
  left: 0;
  top: 0;
  width: 1280px;
  height: 800px;
  transform: scale(1.5);
  transform-origin: 0 0;
  overflow: hidden;
}
```

Create `src/scenes/planet/planet4/HeartConnectStage.tsx` (스텁 — Task 4~8에서 확장):
```tsx
import "./HeartConnectStage.css";

// 미션3 "하트 커넥트 : 마지막 연결" 미니게임.
// 원본: mytemp/그림자 행성 미션3 게임/index.html 을 React로 이식.
// phase: story → quiz → video → epilogue → success (Task 4~8에서 구현).
export default function HeartConnectStage({ onDone }: { onDone: () => void }) {
  return (
    <div className="hc-root">
      <div className="hc-frame">
        {/* STUB: 배선 검증용. Task 4~8에서 phase 머신으로 교체. */}
        <button
          style={{ position: "absolute", left: 540, top: 380, padding: "16px 30px" }}
          onClick={onDone}
        >
          (임시) 우주선으로 이동
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: index.tsx 배선(mission3 블록 교체 + import)**

`src/scenes/planet/planet4/index.tsx` 상단 import에 추가:
```tsx
import HeartConnectStage from "./HeartConnectStage"; // 미션3 "마지막 공감 연결" 미니게임
import { completePlanet } from "../../../lib/session";
```

`export default function Planet4()` 본문에서 `goTo` 정의 아래에 홈 이동 헬퍼 추가:
```tsx
  // 미션3 = 최종 행성 마지막 미션 = 게임 전체 완료 지점. 낙관적 로컬 갱신 + 백그라운드 저장.
  const exitToHome = () => {
    completePlanet(4);
    nav("/home");
  };
```

mission3 블록(현재 `finish` prop 버전)을 교체:
```tsx
      {stage === "mission3" && (
        <MissionPlayer
          scenario={startFrom(MISSION03_DATA)}
          theme={MISSION03_THEME}
          currentStep={3}
          steps={MISSION_STEPS}
          scopeClass="p4_m3"
          games={{
            // 미션3 "마지막 공감 연결" — story→quiz→video→epilogue→success 전체를 미니게임이 소유.
            // 미션이 미니게임에서 끝나 이후 엔진 화면이 없다. 엔진 finishMinigame(showNext 미점등)이 아니라
            // 성공 화면 "우주선으로 이동" 버튼이 exitToHome 을 직접 호출한다.
            heartConnect: () => <HeartConnectStage onDone={exitToHome} />,
          }}
          onExit={exitToHome}
        />
      )}
```

- [ ] **Step 7: 타입체크 + 테스트 통과 확인**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx tsc -b && npx vitest run src/scenes/planet/planet4/`
Expected: tsc 에러 없음. vitest PASS(heartConnect.data + missions 전부).

- [ ] **Step 8: 브라우저 스모크 검증(배선)**

`npm run dev` 실행 후 playwright MCP로 `http://localhost:5173/#/planet/4?m=3` 열기. 확인:
- 인트로 화면에 상단 스테퍼(미션3 active)와 타이틀 배너("미션 3 · 마지막 공감 연결")가 뜬다.
- 배경이 하트 커넥트 내부 배경이다.
- 클릭으로 인트로 대사를 넘기면 미니게임 스텁("(임시) 우주선으로 이동" 버튼)이 뜬다. 이때 상단 스테퍼가 여전히 보인다(투명 미니게임).
- 버튼 클릭 → 홈으로 이동한다. (개발자도구 Network 로 `completePlanet` PUT 시도가 나가는지 확인 — 실패해도 무방, 논블로킹.)

스크린샷을 남긴다.

- [ ] **Step 9: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add -A && git commit -m "feat(planet4): 미션3 엔진 배선 + 하트 커넥트 미니게임 스텁"
```

---

### Task 4: story phase (원본 storyScreen 이식)

**Files:**
- Modify: `src/scenes/planet/planet4/HeartConnectStage.tsx`
- Modify: `src/scenes/planet/planet4/HeartConnectStage.css`
- 참조 원본: `index.html`의 `#storyScreen` 마크업 + `.story-hati`/`.hati-dialogue-box`/`.speaker`/`.story-progress`/`.dialogue`/`.dialogue-next` CSS + `storyLine()`/`completeTyping()`/`advance()` JS.

**Interfaces:**
- Consumes: `STORY_LINES` (Task 2).
- Produces: `phase` 상태 유니온 `"story" | "quiz" | "video" | "epilogue" | "success"`, 초기값 `"story"`. story 종료 시 `setPhase("quiz")`.

- [ ] **Step 1: phase 상태 + story 뷰 구현**

`HeartConnectStage.tsx`를 다음 구조로 확장(원본 로직 이식). 스텁 버튼은 제거하고 phase 스위치를 둔다:
```tsx
import { useEffect, useState } from "react";
import { STORY_LINES } from "./heartConnect.data";
import "./HeartConnectStage.css";

type Phase = "story" | "quiz" | "video" | "epilogue" | "success";
const STORY_TYPE_MS = 42; // 원본 storyLine() 타자 속도

export default function HeartConnectStage({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("story");
  // 타이머 정리는 각 phase 하위 컴포넌트가 자신의 useEffect cleanup 에서 담당한다.

  return (
    <div className="hc-root">
      <div className="hc-frame">
        {phase === "story" && <StoryPhase onDone={() => setPhase("quiz")} />}
        {/* Task 5~7 에서 quiz / video / epilogue 브랜치 추가 */}
        {/* 임시 success 배선(Task 8에서 <SuccessPhase onDone={onDone} /> 로 교체).
            지금은 onDone 을 소비해 noUnusedParameters 오류를 막고, phase 가 success 로 갈 때 홈 이동을 검증한다. */}
        {phase === "success" && (
          <button
            style={{ position: "absolute", left: 540, top: 380, padding: "16px 30px" }}
            onClick={onDone}
          >
            (임시) 우주선으로 이동
          </button>
        )}
      </div>
    </div>
  );
}
```

story 하위 컴포넌트를 같은 파일에 추가(원본 `storyLine`/`completeTyping`/`advance` 이식 — 타이핑, "1/3", 하티 교체, 클릭/Enter로 진행, 타이핑 중 클릭 시 즉시 완성, 마지막 줄 `\n` 뒤를 `.hc-story-emphasis`로):
```tsx
function StoryPhase({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(true);
  const line = STORY_LINES[index];

  // 현재 줄 타자기
  useEffect(() => {
    setTyped("");
    setTyping(true);
    const chars = Array.from(line.text);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(chars.slice(0, i).join(""));
      if (i >= chars.length) {
        window.clearInterval(id);
        setTyping(false);
      }
    }, STORY_TYPE_MS);
    return () => window.clearInterval(id);
  }, [index, line.text]);

  const advance = () => {
    if (typing) {
      setTyped(line.text);
      setTyping(false);
      return;
    }
    if (index + 1 >= STORY_LINES.length) onDone();
    else setIndex(index + 1);
  };

  // 클릭/Enter/Space 로 진행
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") advance();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // 마지막 줄은 완성 시 '\n' 뒤를 강조 span 으로
  const renderText = () => {
    if (!typing && index === STORY_LINES.length - 1 && line.text.includes("\n")) {
      const [first, last] = line.text.split("\n");
      return (
        <>
          {first}
          <br />
          <span className="hc-story-emphasis">{last}</span>
        </>
      );
    }
    return typed;
  };

  return (
    <div className="hc-story" onClick={advance}>
      <img className="hc-story-hati" key={index} src={line.hati} alt="하티" />
      <div className="hc-story-box">
        <span className="hc-speaker">하티</span>
        <span className="hc-story-progress">{index + 1} / {STORY_LINES.length}</span>
        <p className={`hc-dialogue${typing ? " typing" : ""}`}>{renderText()}</p>
        <span className="hc-story-next">▶</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: story CSS 이식**

`HeartConnectStage.css`에 원본 `#storyScreen` 스타일을 `.hc-` 접두어로 이식한다. 원본 클래스 대응: `.story-hati`→`.hc-story-hati`, `.hati-dialogue-box`→`.hc-story-box`, `.speaker`→`.hc-speaker`, `.story-progress`→`.hc-story-progress`, `.dialogue`→`.hc-dialogue`, `.dialogue.typing:after`(커서)→`.hc-dialogue.typing:after`, `.dialogue-next`→`.hc-story-next`, `.mission-emphasis`→`.hc-story-emphasis`, 하티 등장 애니메이션 `@keyframes hatiEnter`. 원본 좌표/크기/색을 그대로 복사(1280×800 좌표계 기준). `.hc-story`는 `position:absolute; inset:0`.

(원본 CSS 정본: `index.html` line 19의 `#storyScreen ~ .dialogue-next` 규칙, line 16의 `.mission-emphasis`는 line 30에도 있음 — story용은 `#storyScreen`의 `.dialogue`+`.mission-emphasis` 관례를 따른다.)

- [ ] **Step 3: 타입체크**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: 브라우저 검증(story)**

`npm run dev` → playwright MCP로 `http://localhost:5173/#/planet/4?m=3` 열고 인트로 대사를 넘겨 story phase 진입. 확인:
- 하티가 중앙 상단, 하단 중앙 대형 박스, 스피커 알약 "하티", "1 / 3" 진행표시, 타이핑 커서, "▶"가 원본처럼 보인다.
- 클릭/Enter로 3줄 진행. 타이핑 중 클릭하면 즉시 완성된다.
- 3번째 줄은 둘째 문장이 강조색으로 보인다.
- 상단 엔진 스테퍼가 story 동안 계속 보인다.
- 3줄을 다 넘기면 (아직 quiz 미구현이라) 프레임이 빈 상태가 된다 — 정상.
스크린샷을 남긴다.

- [ ] **Step 5: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add -A && git commit -m "feat(planet4): 미션3 story phase 이식(원본 스토리 화면 룩)"
```

---

### Task 5: quiz phase (원본 gameScreen 이식)

**Files:**
- Modify: `src/scenes/planet/planet4/HeartConnectStage.tsx`
- Modify: `src/scenes/planet/planet4/HeartConnectStage.css`
- 참조 원본: `index.html` `#gameScreen` 마크업(`.space`/`.core`/`.node.gem`/`svg.links` + `.mission` 패널) + `.g1`~`.g5`/`.core`/`.link` CSS(line 20~24) + `render()`/`choose()` JS.

**Interfaces:**
- Consumes: `MISSIONS`, `IMG_DIAMOND` (Task 2).
- Produces: quiz 완료 시 `setPhase("video")`.

- [ ] **Step 1: QuizPhase 컴포넌트 구현**

같은 파일에 `QuizPhase` 추가(원본 `render`/`choose` 이식). 규칙:
- 상태: `missionIndex`(0~4), `connected: boolean[5]`, `locked`(정답 처리 중 잠금), `feedback` 문구, 오답 흔들림 대상 인덱스.
- 왼쪽 `.hc-space`: 중앙 코어(`IMG_DIAMOND`), 5개 원석 노드(`.hc-gem.g1`~`.g5`, `MISSIONS[i].image`), SVG 연결선 5개(원본 `viewBox="0 0 650 540"`의 line 좌표 그대로). `connected[i]`면 노드·연결선에 `on`/`connected` 클래스.
- 오른쪽 `.hc-mission` 패널: 진행도 `${done} / 5` + 진행바, `공감 원석 · ${gem}`, 원석 아이콘, `"${text}"`, 선택지 3버튼, 하티 피드백(기본 하티 아바타 + 문구).
- `choose(i)`: `locked`면 무시. 오답(`i !== correct`)→해당 버튼 `wrong` 클래스 + 피드백 "친구의 마음을 한 번 더 바라볼까?", 650ms 후 흔들림 해제. 정답→`locked=true`, 버튼 `correct`, 모든 버튼 disable, `connected[missionIndex]=true`, 진행바/카운트 갱신, 피드백 "원석의 빛이 공감 다이아몬드로 연결됐어!", 1150ms 후 `missionIndex++`; 5개 미만이면 다음 문제 render, 5개면 코어 점등 후 `onDone()`(→ video).
- 미션 패널·상단 크롬은 엔진 스테퍼(좌상단)와 겹치지 않게 오른쪽 배치(원본 game-layout 유지하면 자연히 우측 패널).

`HeartConnectStage`의 phase 스위치에 추가: `{phase === "quiz" && <QuizPhase onDone={() => setPhase("video")} />}`.

- [ ] **Step 2: quiz CSS 이식**

`HeartConnectStage.css`에 원본 `#gameScreen` 관련 스타일(`.game-layout`/`.space`/`.core`/`.link`/`.node`/`.node.gem`/`.g1`~`.g5`/`.mission`/`.progress`/`.stage-title`/`.icon`/`.prompt`/`.choices`/`.choice`/`.hati-feedback`/`.feedback`)을 `.hc-` 접두어로 이식(원본 line 20~25 정본). 좌표·색·애니메이션(코어 `pulse`, 노드 glow) 그대로.

- [ ] **Step 3: 타입체크**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: 브라우저 검증(quiz)**

playwright MCP로 story를 넘겨 quiz 진입. 확인:
- 중앙 다이아몬드 코어 + 5원석 + 연결선, 오른쪽 미션 패널이 원본처럼 보이고 상단 스테퍼가 여전히 보인다.
- 오답 클릭 → 흔들림 + "친구의 마음을 한 번 더…" 피드백, 재시도 가능.
- 정답 클릭 → 원석·연결선 점등, 진행바 증가.
- 5원석을 정답으로 모두 연결하면 코어가 켜지고 (아직 video 미구현이라) 프레임이 비거나 검게 전환 시도 — 다음 태스크 확인용. 실제 정답 시퀀스: [1,0,2,0,1].
스크린샷을 남긴다.

- [ ] **Step 5: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add -A && git commit -m "feat(planet4): 미션3 quiz phase 이식(5원석 연결)"
```

---

### Task 6: video phase (원본 videoScreen 이식)

**Files:**
- Modify: `src/scenes/planet/planet4/HeartConnectStage.tsx`
- Modify: `src/scenes/planet/planet4/HeartConnectStage.css`
- 참조 원본: `index.html` `#videoScreen` + `finish()`/`ended` 리스너 JS.

**Interfaces:**
- Consumes: `IMG_VIDEO` (Task 2).
- Produces: video 종료 확인 시 `setPhase("epilogue")`.

- [ ] **Step 1: VideoPhase 구현**

`VideoPhase` 추가:
- 전체화면 `<video>`(`IMG_VIDEO`, `preload="auto" playsInline`), 마운트 시 재생 시도(`play().catch`→muted 재시도, 원본 `finish()`).
- `onEnded`: 마지막 프레임 정지 + `video-shade` ready + "복원 완료 확인" 버튼 표시.
- 버튼 클릭 → `onDone()`(→ epilogue).
- `.hc-video-root`는 `position:absolute; inset:0; background:#000; z-index:110`으로 스테퍼 위를 덮는다(피날레 = 스테퍼 페이드아웃 효과).

phase 스위치에 추가: `{phase === "video" && <VideoPhase onDone={() => setPhase("epilogue")} />}`.

- [ ] **Step 2: video CSS 이식**

원본 `#videoScreen`/`.ending-video`/`.video-shade`/`.video-complete` 스타일을 `.hc-` 접두어로 이식. 단 루트는 위 z-index 규칙 적용.

- [ ] **Step 3: 타입체크**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: 브라우저 검증(video)**

quiz를 5원석 정답으로 통과 → 영상 재생 확인. 확인:
- 영상이 전체화면으로 재생되고 상단 스테퍼가 가려진다(불투명 검정).
- 영상이 끝나면 "복원 완료 확인" 버튼이 뜬다. (검증 편의를 위해 필요시 playwright 로 video.currentTime 을 끝으로 이동시켜 ended 유발.)
- 버튼 클릭 → (아직 epilogue 미구현이면 빈 화면) 전환 시도.
스크린샷을 남긴다.

- [ ] **Step 5: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add -A && git commit -m "feat(planet4): 미션3 video phase 이식(엔딩 영상)"
```

---

### Task 7: epilogue phase (원본 postRecoveryScreen 이식)

**Files:**
- Modify: `src/scenes/planet/planet4/HeartConnectStage.tsx`
- Modify: `src/scenes/planet/planet4/HeartConnectStage.css`
- 참조 원본: `index.html` `#postRecoveryScreen` + `startPostRecovery()`/`typePostLine()`/`completePostTyping()`/`advancePost()` JS + `.post-bg`/`.post-dialogue`/`.post-hati`/`.post-text`/`.post-blackout` CSS(line 27, 30).

**Interfaces:**
- Consumes: `POST_LINES`, `EPILOGUE_BG`, `HATI_DEFAULT` (Task 2).
- Produces: 후일담 종료 시 `setPhase("success")`.

- [ ] **Step 1: EpiloguePhase 구현**

`EpiloguePhase` 추가(원본 배경 타임라인·타이핑 이식). 규칙:
- 5개 `.post-bg`(earth1/2/3/school/classroom, `EPILOGUE_BG`), `active` 클래스로 크로스페이드.
- 진입 시 blackout 리빌 + earth1, 900ms 후 첫 줄 타이핑.
- `postIndex===0`: earth1 → 2800ms earth2 → 5600ms earth3. `postIndex===1`: school → 4800ms classroom. 그 외: classroom.
- 타이핑 55ms/char, 마지막 줄은 `\n` 뒤를 `.hc-post-emphasis`.
- `advancePost()`(클릭/Enter): 타이핑 중이면 즉시 완성. 가드 — index0은 earth3 활성 후에만, index1은 classroom 활성 후에만 진행. 마지막 줄이면 `onDone()`(→ success).
- 모든 `setTimeout`은 컴포넌트 언마운트/줄 전환 시 정리.
- 루트 `.hc-epilogue-root`는 `position:absolute; inset:0; z-index:110`(스테퍼 위).

phase 스위치에 추가: `{phase === "epilogue" && <EpiloguePhase onDone={() => setPhase("success")} />}`.

- [ ] **Step 2: epilogue CSS 이식**

원본 `#postRecoveryScreen`/`.post-bg`(+`.earth-one`류 대신 인라인 backgroundImage 사용 가능)/`.post-dialogue`/`.post-hati`/`.post-speaker`/`.post-text`/`.post-next`/`.post-blackout`/`.post-emphasis` 스타일을 `.hc-` 접두어로 이식.

- [ ] **Step 3: 타입체크**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx tsc -b`
Expected: 에러 없음.

- [ ] **Step 4: 브라우저 검증(epilogue)**

video "복원 완료 확인" → 후일담 진입. 확인:
- 지구1→2→3 크로스페이드 후 클릭 진행, 학교→교실 전환, 하티 후일담 6줄 타이핑.
- 배경 전환 전에는 다음으로 못 넘어가는 가드가 동작한다.
- 마지막 줄 둘째 문장이 강조색.
- 6줄 끝나면 (아직 success 미구현이면 빈 화면) 전환 시도.
스크린샷을 남긴다.

- [ ] **Step 5: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add -A && git commit -m "feat(planet4): 미션3 epilogue phase 이식(지구·교실 후일담)"
```

---

### Task 8: success phase + 전체 흐름 검증 (원본 endingScreen 이식)

**Files:**
- Modify: `src/scenes/planet/planet4/HeartConnectStage.tsx`
- Modify: `src/scenes/planet/planet4/HeartConnectStage.css`
- 참조 원본: `index.html` `#endingScreen` + `startFinalTyping()`/`typeFinalLine()` JS + `.success-ending`/`.final-logo-video`/`.success-burst`/`.success-banner-img`/`.success-sparkles`/`.success-message` CSS(line 29, 31).

**Interfaces:**
- Consumes: `IMG_TITLE_BANNER`, `IMG_SUCCESS_BANNER`, `IMG_SUCCESS_BG`, `FINAL_LINES` (Task 2), `onDone`(planet exit).
- Produces: 없음(종착). "우주선으로 이동" → `onDone()`.

- [ ] **Step 1: SuccessPhase 구현**

`SuccessPhase` 추가:
- 배경 `IMG_SUCCESS_BG`, 상단 타이틀 로고(`IMG_TITLE_BANNER`), 중앙 성공 배너(`IMG_SUCCESS_BANNER`) + 반짝임.
- 진입 시 `startFinalTyping()` 이식: 650ms 후 1번째 줄 타이핑(58ms/char) → 380ms 후 2번째 줄.
- "우주선으로 이동" 버튼 → `onDone()`(= planet `exitToHome`).
- 루트 `.hc-success-root`는 `position:absolute; inset:0; z-index:110`.

`HeartConnectStage`의 **임시 success 브랜치(Task 4의 "(임시) 우주선으로 이동" 버튼)를 교체**한다: `{phase === "success" && <SuccessPhase onDone={onDone} />}`.

- [ ] **Step 2: success CSS 이식**

원본 `#endingScreen`/`.success-ending`/`.final-logo-video`/`.success-burst`/`.success-banner-img`/`.success-sparkles`/`.success-message`/`.final-typed-line`/`.final-line-two`/`.restart` + 관련 `@keyframes`(line 29, 31 정본)를 `.hc-` 접두어로 이식.

- [ ] **Step 3: 타입체크 + 전체 테스트**

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && npx tsc -b && npx vitest run`
Expected: tsc 에러 없음. 전체 vitest PASS.

- [ ] **Step 4: 브라우저 검증(전체 흐름)**

`npm run dev` → playwright MCP로 `http://localhost:5173/#/planet/4?m=3`부터 **끝까지** 실제 구동:
1. 인트로 배너 대사 → 클릭
2. story 3줄 → 클릭 진행
3. quiz 5원석 정답 연결([1,0,2,0,1]) → 코어 점등
4. 엔딩 영상 재생 → "복원 완료 확인"
5. 후일담 6줄(지구→학교→교실) → 클릭 진행
6. 성공 화면 배너 + 최종 타이핑 2줄 → "우주선으로 이동"
7. 홈으로 이동
확인 포인트: story·quiz까지 상단 스테퍼가 보이고 video 진입 후 가려진다. 타이머 누수/콘솔 에러 없음(playwright console 확인). completePlanet(4) PUT 시도가 나간다.
스크린샷(성공 화면 + 홈 복귀)을 남긴다.

- [ ] **Step 5: 임시 파일 확인(스텁 잔재 없음)**

`HeartConnectStage.tsx`에 Task 3 스텁 버튼("(임시) 우주선으로 이동")이 남아 있지 않은지 확인. `mytemp/`는 그대로 둔다(반입 원본 보존).

Run: `cd "d:/Work-HeartGuardians/HeartGuardiansApp" && grep -n "임시" src/scenes/planet/planet4/HeartConnectStage.tsx || echo "clean"`
Expected: `clean` (또는 정당한 주석만).

- [ ] **Step 6: Commit**

```bash
cd "d:/Work-HeartGuardians/HeartGuardiansApp" && git add -A && git commit -m "feat(planet4): 미션3 success phase 이식 + 전체 흐름 완성"
```

---

## Self-Review (작성자 체크 결과)

- **스펙 커버리지**: 엔진 노드 흐름(Task 3) / story·quiz·video·epilogue·success phase(Task 4~8) / 에셋 19개(Task 1) / 진도 저장 completePlanet(4)(Task 3) / 스테퍼 페이드(Task 4·6 검증) / 테스트·브라우저 검증(각 태스크) — 스펙 각 절에 대응 태스크 있음.
- **엔진 완료 버튼 우회**: `fx_light_return` 미사용 + onDone=exitToHome 직접 배선(Task 3 Step 6) — 스펙 결정 반영.
- **타입 일관성**: `HeartConnectStage({ onDone })`, `Phase` 유니온, `MISSIONS`/`STORY_LINES`/`POST_LINES`/`FINAL_LINES`/`EPILOGUE_BG` 명칭이 Task 2 정의와 Task 4~8 소비에서 일치.
- **비고**: view phase(Task 4~8)는 원본 HTML을 정본으로 하는 이식이라, 단위 테스트 대신 브라우저 검증을 채택(레포 관례 verify-in-browser). CSS 전량은 계획에 인라인하지 않고 원본 클래스 대응표로 지시(hidden-emotion 계획 관례).
