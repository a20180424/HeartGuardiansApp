# 공용 Prologue 추출 + planet3/4 Walkable Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** planet1/2의 복제된 Prologue를 공용 컴포넌트로 추출하고, 그걸 써서 planet3(얼음 행성)·planet4(그림자 행성)를 planet2와 동일한 walkable skeleton으로 세운다.

**Architecture:** 1단계로 데이터 주도형 `PrologueTemplate`을 뽑아 planet1/2를 얇은 wrapper로 바꾼다(시각 변화 0). 2단계로 planet3/4에 wrapper + theme + mission JSON×3 + 상태머신 + 테스트를 추가한다(planet2를 복사·치환). planet3의 three.js는 `Planet3Sample.tsx`로 보존.

**Tech Stack:** React 19, react-router-dom 7, TypeScript, Vite 8, Vitest 4, oxlint.

## Global Constraints

- 공용 컴포넌트 추출은 **시각 변화 0** — planet1/2 프롤로그가 리팩터 전후 픽셀 동일해야 한다(스크린샷 비교 검증).
- 각 planet의 `Prologue.tsx` default export 이름은 `Prologue` 유지. **planet1/2의 index.tsx는 절대 수정하지 않는다.**
- 노드 ID 접두어: planet3=`p3m1_`/`p3m2_`/`p3m3_`, planet4=`p4m1_`/`p4m2_`/`p4m3_`.
- 각 미션 끝 노드는 `onEnter: [{ "cmd": "fx", "value": "fx_light_return" }]` 필수(다음 버튼 조건). `theme.fx`에 `fx_light_return: "lightReturn"` 매핑.
- planet1 에셋을 placeholder로 재사용. 새 아트 없음. planet3/4 프롤로그 배경은 공용 기본값(빛의 행성) 상속.
- `src/scenes/planet/player/mission.css` 수정 금지(전 행성 공유).
- 미션 골격의 모든 노드는 `hideFriend: true`.
- 단일 PR.

**설계 스펙:** [docs/superpowers/specs/2026-07-04-planet3-4-skeleton-and-shared-prologue-design.md](../specs/2026-07-04-planet3-4-skeleton-and-shared-prologue-design.md)

---

## File Structure

**신규 공유:**
- `src/scenes/planet/prologue/PrologueTemplate.tsx` — 공용 프롤로그 레이아웃(props 주입).
- `src/scenes/planet/prologue/Prologue.css` — 공용 레이아웃 CSS(planet1/Prologue.css에서 이동).

**수정(리팩터):**
- `src/scenes/planet/planet1/Prologue.tsx` — 얇은 wrapper로.
- `src/scenes/planet/planet1/Prologue.css` — 삭제(공용으로 이동).
- `src/scenes/planet/planet2/Prologue.tsx` — 얇은 wrapper로.
- `src/scenes/planet/planet2/Prologue.css` — 유지(override), import 위치는 wrapper가 관리.

**신규 planet3:** `Prologue.tsx`, `Prologue.css`, `theme.ts`, `mission01~03.json`, `index.tsx`, `missions.test.ts`, `theme.test.ts`, `Planet3Sample.tsx`(기존 index.tsx 이름 변경).
**신규 planet4:** `Prologue.tsx`, `Prologue.css`, `theme.ts`, `mission01~03.json`, `index.tsx`, `missions.test.ts`, `theme.test.ts`.

**재사용(무수정):** `player/*`, `engine/*`, `planet1/Planet1.css`, `planet3/World.tsx`, `planet3/Npc.tsx`, `/assets/**`.

---

## Task 1: 공용 PrologueTemplate 추출 (planet1/2 리팩터)

**Files:**
- Create: `src/scenes/planet/prologue/PrologueTemplate.tsx`
- Create: `src/scenes/planet/prologue/Prologue.css` (planet1/Prologue.css 내용 이동)
- Modify: `src/scenes/planet/planet1/Prologue.tsx` (얇은 wrapper)
- Delete: `src/scenes/planet/planet1/Prologue.css`
- Modify: `src/scenes/planet/planet2/Prologue.tsx` (얇은 wrapper)

**Interfaces:**
- Produces: `PrologueTemplate` (default export) + `PrologueContent` interface. planet1~4의 `Prologue.tsx`가 소비한다.

```ts
interface PrologueContent {
  modifier?: string;
  planetName: string;
  hatiLines: string[];
  objectives: string[];
  rewards: { icon: string; name: string; desc: string }[];
  questTitle: string;
  questSub: string;
  questMascot: string;
  questMascotAlt: string;
  steps: string[];
}
// PrologueTemplate props = PrologueContent & { onStart: () => void; onHome: () => void }
```

- [ ] **Step 1: 리팩터 전 baseline 스크린샷 확보**

Run: `npm run dev` (백그라운드), 브라우저로 `http://localhost:<port>/#/planet/1` 과 `#/planet/2` 를 1280×800으로 캡처해 `baseline-p1.png`, `baseline-p2.png`로 저장(스크래치 폴더). 이후 비교 기준.

- [ ] **Step 2: 공용 CSS 이동**

`src/scenes/planet/prologue/Prologue.css`를 생성하고 **현재 `src/scenes/planet/planet1/Prologue.css`의 내용을 한 글자도 바꾸지 말고 그대로 복사**한다. (기본 `.prologue` 색 변수 + `light-planet-stage1.png` 배경 포함 — 이게 planet1 기본값이자 공용 기본값이 된다.)

- [ ] **Step 3: PrologueTemplate.tsx 생성**

`src/scenes/planet/prologue/PrologueTemplate.tsx`:

```tsx
import { Fragment } from "react";
import FixedStage from "../../../lib/FixedStage";
import "./Prologue.css";

// 행성 도착 도입부 프롤로그의 공용 레이아웃(9개 요소). 행성별로 다른 값은 props로 받고,
// 색/배경은 modifier 클래스(.prologue--planetN)로 CSS 변수를 오버라이드한다.
// 레이아웃 CSS 단일 소스: ./Prologue.css.

export interface PrologueContent {
  modifier?: string; // 루트 추가 클래스, 예: "prologue--planet3" (planet1: 없음=기본 색)
  planetName: string;
  hatiLines: string[]; // 말풍선 줄들(사이에 <br/> 삽입)
  objectives: string[];
  rewards: { icon: string; name: string; desc: string }[];
  questTitle: string;
  questSub: string;
  questMascot: string; // 마스코트 이미지 경로
  questMascotAlt: string;
  steps: string[];
}

export default function PrologueTemplate({
  modifier,
  planetName,
  hatiLines,
  objectives,
  rewards,
  questTitle,
  questSub,
  questMascot,
  questMascotAlt,
  steps,
  onStart,
  onHome,
}: PrologueContent & { onStart: () => void; onHome: () => void }) {
  return (
    <FixedStage>
      <div className={modifier ? `prologue ${modifier}` : "prologue"}>
        {/* ① 타이틀 배너 */}
        <div className="prologue__title">
          <img className="prologue__title-star" src="/assets/icon/star.png" alt="" />
          <span className="prologue__title-text">{planetName}</span>
        </div>

        {/* ③ 하티 + 말풍선 */}
        <div className="prologue__hati">
          <img
            className="prologue__hati-img"
            src="/assets/char/Hati/hati_robot_worried.png"
            alt="하티"
          />
          <div className="prologue__bubble">
            <span className="prologue__nametag">하티</span>
            <p className="prologue__bubble-text">
              {hatiLines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
          </div>
        </div>

        {/* ② 학습 목표 */}
        <section className="info-panel prologue__goals">
          <header className="info-panel__head">🎯 학습 목표</header>
          <ul className="prologue__goal-list">
            {objectives.map((text) => (
              <li key={text}>
                <span className="prologue__goal-star">⭐</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ⑤ 획득 가능한 보상 */}
        <section className="info-panel prologue__rewards">
          <header className="info-panel__head">✨ 획득 가능한 보상</header>
          <ul className="prologue__reward-list">
            {rewards.map((reward) => (
              <li key={reward.name}>
                <span className="prologue__reward-icon">{reward.icon}</span>
                <div className="prologue__reward-text">
                  <strong>{reward.name}</strong>
                  <span>{reward.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ⑥ 오늘의 탐험 패널 (+ ⑦ 시작 버튼) */}
        <section className="prologue__quest">
          <span className="prologue__quest-tab">오늘의 탐험</span>
          <img className="prologue__quest-mascot" src={questMascot} alt={questMascotAlt} />
          <div className="prologue__quest-body">
            <h2 className="prologue__quest-title">{questTitle}</h2>
            <p className="prologue__quest-sub">{questSub}</p>
            <button type="button" className="btn prologue__start" onClick={onStart}>
              탐험 시작!
            </button>
          </div>
        </section>

        {/* ⑨ 우주선으로 이동 (홈 복귀) */}
        <button type="button" className="prologue__home" onClick={onHome}>
          <img className="prologue__home-icon" src="/assets/char/SpaceshipIcon.png" alt="" />
          <span>우주선으로 이동</span>
        </button>

        {/* ⑧ 미션 흐름(스텝) 인디케이터 */}
        <ol className="prologue__steps">
          {steps.map((label, i) => (
            <li key={label} className="prologue__step">
              <span className="prologue__step-num">{i + 1}</span>
              <span className="prologue__step-label">{label}</span>
              {i < steps.length - 1 && (
                <span className="prologue__step-arrow" aria-hidden="true">
                  ➔
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </FixedStage>
  );
}
```

- [ ] **Step 4: planet1/Prologue.tsx를 얇은 wrapper로 교체**

`src/scenes/planet/planet1/Prologue.tsx` 전체 교체:

```tsx
import PrologueTemplate from "../prologue/PrologueTemplate";
// planet1은 기본 색이라 전용 override CSS가 없다(공용 Prologue.css의 기본값 사용).

const OBJECTIVES = [
  "공감이 왜 필요한지 이해한다.",
  "다른 사람의 마음을 이해하려고 노력하는 방법을 배운다.",
  "공감이 사람들을 연결하고 행복하게 만든다는 것을 깨닫는다.",
];

const REWARDS = [
  { icon: "💎", name: "이해의 원석", desc: "빛의 행성에서 얻는 첫 번째 원석이에요." },
  { icon: "🪞", name: "공감 거울", desc: "친구의 마음을 비추어 공감의 말을 만들어줘요." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["마음 신호 탐색하기", "얼어붙은 공감 거울 깨우기", "공감없는 세상으로"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      planetName="빛의 행성"
      hatiLines={["이해의 빛이 사라졌어…", "친구들의 마음을 이해하면", "빛을 되찾을 수 있어!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="사라진 이해의 빛을 찾아라!"
      questSub="친구들의 마음을 이해하고 빛을 되찾아보자!"
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="루미"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
```

- [ ] **Step 5: planet1/Prologue.css 삭제**

Run: `git rm src/scenes/planet/planet1/Prologue.css`
(내용은 Step 2에서 공용으로 이동됨.)

- [ ] **Step 6: planet2/Prologue.tsx를 얇은 wrapper로 교체**

`src/scenes/planet/planet2/Prologue.tsx` 전체 교체:

```tsx
import PrologueTemplate from "../prologue/PrologueTemplate";
import "./Prologue.css"; // planet2 전용: 포인트 색 + 배경 오버라이드(prologue--planet2)

const OBJECTIVES = [
  "다른 사람의 감정을 관찰하고 알아차리는 방법을 배운다.",
  "상황과 표정을 통해 마음을 이해하려고 노력한다.",
  "관찰과 관심이 공감의 시작임을 이해한다.",
];

const REWARDS = [
  { icon: "💎", name: "관찰의 원석", desc: "안개 행성에서 얻는 첫 번째 원석이에요." },
  { icon: "📡", name: "마음 신호 탐색기", desc: "보이지 않는 마음 신호를 찾아내는 도구예요." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["마음 신호 발견하기", "안개 수정 나무 깨우기", "흐려진 마음의 마을로"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      modifier="prologue--planet2"
      planetName="안개 행성"
      hatiLines={[
        "안개 때문에 마을이",
        "잘 보이지 않아. 친구들의",
        "마음 신호를 찾아주면",
        "길이 열릴거야!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="숨겨진 마음 신호를 찾아라!"
      questSub="친구들의 마음 신호를 관찰하고 안개를 걷어내자!"
      questMascot="/assets/char/planet2_arji.png"
      questMascotAlt="아르지"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
```

- [ ] **Step 7: 타입체크 + 린트 + 전체 테스트**

Run: `npx tsc -b && npm run lint && npm test`
Expected: 모두 통과(회귀 없음). tsc 에러 0, 테스트 기존과 동일 개수 통과.

- [ ] **Step 8: 시각 회귀 검증(핵심)**

dev 서버에서 `#/planet/1`, `#/planet/2`를 1280×800으로 다시 캡처해 Step 1 baseline과 비교.
Expected: 타이틀/하티 말풍선/학습목표/보상/오늘의탐험/스텝/색/배경이 **완전히 동일**. 차이가 보이면 wrapper 데이터·template 마크업을 원본과 대조해 수정.

- [ ] **Step 9: 커밋**

```bash
git add src/scenes/planet/prologue/ src/scenes/planet/planet1/Prologue.tsx src/scenes/planet/planet2/Prologue.tsx
git rm src/scenes/planet/planet1/Prologue.css
git commit -m "$(printf 'refactor(planet): 공용 PrologueTemplate 추출, planet1/2 얇은 wrapper화\n\n복제됐던 Prologue.tsx를 데이터 주도형 공용 컴포넌트로. 시각 변화 없음.\nplanet1/Prologue.css는 prologue/Prologue.css로 이동.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: planet3 데이터 레이어 (mission JSON×3 + theme + 테스트)

**Files:**
- Create: `src/scenes/planet/planet3/mission01.json`, `mission02.json`, `mission03.json`
- Create: `src/scenes/planet/planet3/theme.ts`
- Create: `src/scenes/planet/planet3/missions.test.ts`, `theme.test.ts`

**Interfaces:**
- Produces: `MISSION01_DATA`/`MISSION01_THEME` … `MISSION03_*` (planet3/theme.ts). Task 3의 index.tsx가 소비.

> 이 파일들은 이미 브랜치에 있는 `planet2/` 대응 파일과 **노드 접두어만 다르다**. 아래 Step은 planet2 파일을 복사한 뒤 정확한 치환을 지정한다.

- [ ] **Step 1: 실패 테스트 2개 생성 (planet2에서 복사 + 치환)**

`planet2/missions.test.ts`를 `planet3/missions.test.ts`로 복사한 뒤, 파일 내 `p2m` → `p3m` 전체 치환(현재 그 파일의 유일한 `p2m` 사용처는 `n.id.startsWith("p2m")` 단언). import 경로(`../engine/*`, `./mission0N.json`)는 그대로 유효.

`planet2/theme.test.ts`를 `planet3/theme.test.ts`로 그대로 복사(내용에 `p2` 리터럴 없음 — `./theme`·export 이름만 참조하므로 수정 불필요).

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- planet3/`
Expected: FAIL — `./mission01.json`, `./theme` 모듈 없음.

- [ ] **Step 3: mission01~03.json 생성 (planet2에서 복사 + 치환)**

`planet2/mission01.json`→`planet3/mission01.json`, `02`,`03` 각각 복사한 뒤 파일 내 `p2m` → `p3m` 전체 치환. (그 외 필드 동일: `completeBanner`, `fx_light_return`, mission03의 보상 카드 유지.)

검증용 — planet3/mission01.json 최종 형태:

```json
{
  "id": "mission01",
  "title": "(임시) 미션 1",
  "start": "p3m1_intro",
  "nodes": [
    {
      "id": "p3m1_intro",
      "type": "line",
      "speaker": "hati",
      "hideFriend": true,
      "text": "(임시) 미션1 시작 대사입니다. 여기에 인트로 흐름이 들어갈 예정이에요.",
      "next": "p3m1_end"
    },
    {
      "id": "p3m1_end",
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

mission02.json은 `p3m2_`, mission03.json은 `p3m3_` + 끝 노드에 `"cards": [{ "image": "/assets/ui/planet1-reward-card.png" }]` 포함.

- [ ] **Step 4: theme.ts 생성 (planet2에서 복사 + 치환)**

`planet2/theme.ts`를 `planet3/theme.ts`로 복사한 뒤 파일 내 `p2m` → `p3m` 전체 치환(치환 대상은 `bannerNode`와 `bg.byNode` 키의 `p2m1_intro`/`p2m2_intro`/`p2m3_intro` 3곳). banner의 `title`/`pill`은 "(임시) 미션 N"으로 그대로 둔다(프롤로그가 아닌 미션 배너라 placeholder 유지).

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- planet3/`
Expected: PASS (missions 6 + theme 9 = 15 케이스).

- [ ] **Step 6: 포맷 확인**

Run: `npx prettier --check "src/scenes/planet/planet3/**/*.{json,ts}"`
Expected: 경고 없음(있으면 `npx prettier --write` 후 재확인).

- [ ] **Step 7: 커밋**

```bash
git add src/scenes/planet/planet3/mission01.json src/scenes/planet/planet3/mission02.json src/scenes/planet/planet3/mission03.json src/scenes/planet/planet3/theme.ts src/scenes/planet/planet3/missions.test.ts src/scenes/planet/planet3/theme.test.ts
git commit -m "$(printf 'feat(planet3): 미션1~3 골격 JSON + theme + 테스트\n\nplanet2 골격 복제(p3m 접두어). placeholder, planet1 에셋 재사용.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: planet3 UI 배선 (Prologue wrapper + three.js 보존 + index)

**Files:**
- Create: `src/scenes/planet/planet3/Prologue.tsx`, `Prologue.css`
- Rename: `src/scenes/planet/planet3/index.tsx` → `Planet3Sample.tsx` (three.js 보존)
- Create: `src/scenes/planet/planet3/index.tsx` (새 상태 머신)

**Interfaces:**
- Consumes: `PrologueTemplate`(Task 1), theme export(Task 2), `MissionPlayer`, `.planet-fade`(planet1/Planet1.css).
- Produces: `Planet3`(default export) — 라우트 `/planet/3`. App.tsx 무수정.

- [ ] **Step 1: 기존 three.js index.tsx를 Planet3Sample.tsx로 보존**

Run: `git mv src/scenes/planet/planet3/index.tsx src/scenes/planet/planet3/Planet3Sample.tsx`

그 다음 `Planet3Sample.tsx`에서 컴포넌트 이름과 보존 주석만 수정:
- 함수명 `export default function Planet3()` → `export default function Planet3Sample()`
- 파일 상단에 주석 추가:
```tsx
// 보존: 행성3의 three.js 3D 샘플(World/Npc). 골격에선 쓰지 않는다.
// 행성3 실제 작업 시 index.tsx에서 이 컴포넌트를 꺼내 미션 흐름과 연결한다.
```
(내부 `World`/`Npc` import, JSX는 그대로 둔다.)

- [ ] **Step 2: planet3/Prologue.css 생성 (placeholder 포인트색)**

`src/scenes/planet/planet3/Prologue.css`:

```css
/* Planet3(얼음 행성) 프롤로그 placeholder 오버라이드.
   레이아웃은 공용 prologue/Prologue.css 를 쓰고, 여기선 포인트 색만 얼음톤으로 바꾼다.
   배경은 공용 기본값을 상속(전용 아트 준비 시 background 추가). */
.prologue.prologue--planet3 {
  --planet-accent: #38bdf8;
  --planet-accent-deep: #0369a1;
  --planet-panel-bg: #eef7ff;
  --planet-tab: #0ea5e9;
}
```

- [ ] **Step 3: planet3/Prologue.tsx 생성 (얇은 wrapper, placeholder)**

`src/scenes/planet/planet3/Prologue.tsx`:

```tsx
import PrologueTemplate from "../prologue/PrologueTemplate";
import "./Prologue.css"; // planet3 전용: 얼음톤 포인트 색

const OBJECTIVES = [
  "(임시) 얼음 행성 학습 목표 1.",
  "(임시) 얼음 행성 학습 목표 2.",
  "(임시) 얼음 행성 학습 목표 3.",
];

const REWARDS = [
  { icon: "💎", name: "(임시) 얼음 원석", desc: "(임시) 보상 설명이 들어갈 예정." },
  { icon: "🧭", name: "(임시) 탐험 도구", desc: "(임시) 보상 설명이 들어갈 예정." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["(임시) 미션 1", "(임시) 미션 2", "(임시) 미션 3"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      modifier="prologue--planet3"
      planetName="얼음 행성"
      hatiLines={["(임시) 얼음 행성 도입 대사.", "여기에 하티 소개가", "들어갈 예정이야!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="(임시) 얼음 행성 탐험!"
      questSub="(임시) 오늘의 탐험 부제가 들어갈 예정."
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="마스코트"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
```

- [ ] **Step 4: 새 planet3/index.tsx 생성 (상태 머신)**

`src/scenes/planet/planet3/index.tsx`:

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

// Planet3(얼음 행성) 컨테이너. prologue → mission1 → mission2 → mission3 → home 상태 머신.
// 각 미션은 현재 시작·끝 골격. 3D 샘플은 Planet3Sample.tsx에 보존(실제 작업 때 연결).
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet3() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const m = params.get("m");
  const wanted =
    params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null);
  const initialStage: Stage =
    import.meta.env.DEV && wanted && (STAGES as string[]).includes(wanted)
      ? (wanted as Stage)
      : "prologue";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME, MISSION03_THEME].forEach((t) =>
      Object.values(t.bg.states).forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.src = src;
      }),
    );
  }, []);

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

- [ ] **Step 5: 타입체크 + 린트 + 테스트**

Run: `npx tsc -b && npm run lint && npm test`
Expected: 모두 통과. (`Planet3Sample.tsx`가 World/Npc를 여전히 import하므로 미사용 경고 없음.)

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/planet/planet3/Prologue.tsx src/scenes/planet/planet3/Prologue.css src/scenes/planet/planet3/index.tsx src/scenes/planet/planet3/Planet3Sample.tsx
git commit -m "$(printf 'feat(planet3): 얼음 행성 골격 상태머신 + 프롤로그 wrapper\n\n공용 PrologueTemplate 사용(placeholder). three.js 샘플은 Planet3Sample.tsx로 보존.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: planet4 데이터 레이어 (mission JSON×3 + theme + 테스트)

**Files:**
- Create: `src/scenes/planet/planet4/mission01.json`, `mission02.json`, `mission03.json`
- Create: `src/scenes/planet/planet4/theme.ts`
- Create: `src/scenes/planet/planet4/missions.test.ts`, `theme.test.ts`

**Interfaces:**
- Produces: `MISSION01_DATA`/`MISSION01_THEME` … (planet4/theme.ts). Task 5의 index.tsx가 소비.

> planet3 데이터 파일(Task 2 완료본)을 복사한 뒤 `p3m` → `p4m` 치환한다.

- [ ] **Step 1: 실패 테스트 2개 생성**

`planet3/missions.test.ts`를 `planet4/missions.test.ts`로 복사 후 `p3m` → `p4m` 치환.
`planet3/theme.test.ts`를 `planet4/theme.test.ts`로 그대로 복사(수정 불필요).

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- planet4/`
Expected: FAIL — `./mission01.json`, `./theme` 모듈 없음.

- [ ] **Step 3: mission01~03.json 생성**

`planet3/mission01~03.json`을 `planet4/`로 복사 후 각 파일 `p3m` → `p4m` 치환. (mission03의 보상 카드 유지.)

- [ ] **Step 4: theme.ts 생성**

`planet3/theme.ts`를 `planet4/theme.ts`로 복사 후 `p3m` → `p4m` 치환(`bannerNode`·`bg.byNode` 키 3곳).

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- planet4/`
Expected: PASS (15 케이스).

- [ ] **Step 6: 포맷 확인**

Run: `npx prettier --check "src/scenes/planet/planet4/**/*.{json,ts}"`
Expected: 경고 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/scenes/planet/planet4/mission01.json src/scenes/planet/planet4/mission02.json src/scenes/planet/planet4/mission03.json src/scenes/planet/planet4/theme.ts src/scenes/planet/planet4/missions.test.ts src/scenes/planet/planet4/theme.test.ts
git commit -m "$(printf 'feat(planet4): 미션1~3 골격 JSON + theme + 테스트\n\nplanet3 골격 복제(p4m 접두어). placeholder, planet1 에셋 재사용.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 5: planet4 UI 배선 (Prologue wrapper + index 교체)

**Files:**
- Create: `src/scenes/planet/planet4/Prologue.tsx`, `Prologue.css`
- Modify: `src/scenes/planet/planet4/index.tsx` (planet1 테마 차용 → 자체 상태 머신)

**Interfaces:**
- Consumes: `PrologueTemplate`(Task 1), planet4 theme(Task 4), `MissionPlayer`, `.planet-fade`.
- Produces: `Planet4`(default export) — 라우트 `/planet/4`.

- [ ] **Step 1: planet4/Prologue.css 생성 (placeholder 그림자톤)**

`src/scenes/planet/planet4/Prologue.css`:

```css
/* Planet4(그림자 행성) 프롤로그 placeholder 오버라이드.
   레이아웃은 공용 prologue/Prologue.css 를 쓰고, 여기선 포인트 색만 그림자톤으로 바꾼다.
   배경은 공용 기본값을 상속(전용 아트 준비 시 background 추가). */
.prologue.prologue--planet4 {
  --planet-accent: #8b8fb0;
  --planet-accent-deep: #3b3f5c;
  --planet-panel-bg: #f1f1f6;
  --planet-tab: #7c3aed;
}
```

- [ ] **Step 2: planet4/Prologue.tsx 생성 (얇은 wrapper, placeholder)**

`src/scenes/planet/planet4/Prologue.tsx`:

```tsx
import PrologueTemplate from "../prologue/PrologueTemplate";
import "./Prologue.css"; // planet4 전용: 그림자톤 포인트 색

const OBJECTIVES = [
  "(임시) 그림자 행성 학습 목표 1.",
  "(임시) 그림자 행성 학습 목표 2.",
  "(임시) 그림자 행성 학습 목표 3.",
];

const REWARDS = [
  { icon: "💎", name: "(임시) 그림자 원석", desc: "(임시) 보상 설명이 들어갈 예정." },
  { icon: "🔦", name: "(임시) 탐험 도구", desc: "(임시) 보상 설명이 들어갈 예정." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["(임시) 미션 1", "(임시) 미션 2", "(임시) 미션 3"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      modifier="prologue--planet4"
      planetName="그림자 행성"
      hatiLines={["(임시) 그림자 행성 도입 대사.", "여기에 하티 소개가", "들어갈 예정이야!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="(임시) 그림자 행성 탐험!"
      questSub="(임시) 오늘의 탐험 부제가 들어갈 예정."
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="마스코트"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
```

- [ ] **Step 3: planet4/index.tsx 교체 (자체 상태 머신)**

`src/scenes/planet/planet4/index.tsx` 전체 교체. **planet3/index.tsx(Task 3)를 복사한 뒤 `Planet3` → `Planet4`, 주석의 "얼음 행성" → "그림자 행성"으로 치환하고, 3D 샘플 관련 주석 문장은 제거**한다(planet4엔 3D 샘플 없음). 최종 형태:

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

// Planet4(그림자 행성) 컨테이너. prologue → mission1 → mission2 → mission3 → home 상태 머신.
// 각 미션은 현재 시작·끝 골격.
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet4() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const m = params.get("m");
  const wanted =
    params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null);
  const initialStage: Stage =
    import.meta.env.DEV && wanted && (STAGES as string[]).includes(wanted)
      ? (wanted as Stage)
      : "prologue";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME, MISSION03_THEME].forEach((t) =>
      Object.values(t.bg.states).forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.src = src;
      }),
    );
  }, []);

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

- [ ] **Step 4: 타입체크 + 린트 + 테스트**

Run: `npx tsc -b && npm run lint && npm test`
Expected: 모두 통과. (기존 planet4의 planet1 테마 차용 import가 사라져 경고 없음.)

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/planet/planet4/Prologue.tsx src/scenes/planet/planet4/Prologue.css src/scenes/planet/planet4/index.tsx
git commit -m "$(printf 'feat(planet4): 그림자 행성 골격 상태머신 + 프롤로그 wrapper\n\n공용 PrologueTemplate 사용(placeholder). planet1 테마 차용하던 index 교체.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 6: 엔드투엔드 걸음 검증 (planet3 · planet4)

**Files:** 없음(검증 전용).

- [ ] **Step 1: dev 서버 기동**

Run: `npm run dev` (백그라운드). 로컬 URL 확인.

- [ ] **Step 2: planet3 전 구간 걸음**

브라우저(1280×800)로 `http://localhost:<port>/#/planet/3`:
1. 프롤로그 표시(타이틀 "얼음 행성", 얼음톤 포인트색) → "탐험 시작!" 클릭 → 미션1.
2. 인트로 진행 → 끝 노드 "미션 완료!" + "다음 미션으로" 버튼.
3. 미션2 → 미션3 동일 진행.
4. 미션3 끝: "우주선으로 이동"(ship) 버튼 + 보상 카드.
5. 클릭 → 홈(세션 없으면 auth 가드로 리다이렉트).

Expected: 막힘 없이 홈까지. DOM 확인은 `window.__runner.current`로 노드 진행 확인 가능.

- [ ] **Step 3: planet4 전 구간 걸음**

`http://localhost:<port>/#/planet/4` 로 Step 2와 동일 확인(타이틀 "그림자 행성", 그림자톤 포인트색).

- [ ] **Step 4: planet1/planet2 회귀 재확인**

`#/planet/1`, `#/planet/2` 프롤로그가 여전히 정상(리팩터 후 시각 동일)인지 최종 확인.

- [ ] **Step 5: 정리 + 최종 커밋 없음(코드 변경 없음)**

검증용 스크린샷/아티팩트 삭제(`.playwright-mcp`, baseline 이미지). dev 서버 종료.

---

## Self-Review 메모

- **Spec 커버리지:** 1단계 공용 추출→Task 1. planet3 골격(prologue/theme/missions/index/three.js 보존)→Task 2·3. planet4 골격→Task 4·5. 검증(시각 회귀+E2E)→Task 1 Step 8, Task 6. 단일 PR·placeholder·fx_light_return·index 무수정(planet1/2)→Global Constraints. 스펙과 일치.
- **Placeholder 스캔:** "(임시)"는 골격의 의도된 콘텐츠. 계획 단계 TBD/TODO 없음. planet2 복사+치환 Step은 실제 존재 파일(브랜치에 rebase됨)을 정확한 find→replace로 지정 — 모호하지 않음.
- **타입 일치:** `PrologueContent` props(modifier/planetName/hatiLines/objectives/rewards/questTitle/questSub/questMascot/questMascotAlt/steps)가 Task 1 정의와 Task 3·5 wrapper 사용에서 동일. theme export 이름(`MISSION0N_DATA`/`_THEME`)이 Task 2·4 정의와 Task 3·5 import에서 동일. 노드 id 접두어(p3m/p4m)가 JSON·theme·test에서 일관.
