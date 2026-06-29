# Home Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Home scene (`/home`) — a dashboard hub showing profile, empathy gauge, 4 selectable planets, bottom menu, and the Hati helper — matching `mytemp/home/HomeScreenshot.png`.

**Architecture:** Follow the existing scene pattern (full-viewport fixed container designed at 1280×800 CSS px, CSS background `cover`, absolutely-positioned overlays). Pure state/mapping logic lives in `home.logic.ts` (unit-tested with Vitest); each UI element is its own small component under `src/scenes/home/`. A single generic `Modal` is reused for all popups. Source PNGs in `mytemp/home/` are pre-processed (alpha-trim + PlateSet split) into `src/assets/home/` by a one-time Python/Pillow script.

**Tech Stack:** React 19, react-router-dom 7, TypeScript ~6.0, Vite 8, Vitest 4, Python 3.13 + Pillow 12 (asset prep only).

## Global Constraints

- Design baseline: **1280×800 CSS px, landscape, immersive fullscreen**. Use `100dvh` / `min-height:100svh`, never `100vh`. (CLAUDE.md)
- Scene root pattern (from `src/scenes/Auth.css`): `position:fixed; inset:0; width:100vw; height:100dvh; min-height:100svh; overflow:hidden`.
- Panels/plates that scale must use CSS `border-image` 9-slice (same technique as `Auth.css` line 39).
- Animations use `transform`/`opacity` only.
- Data single source: `getSession()` from `src/lib/session.ts` → `{ profile, progress }`. `progress` is 0–4 (sequential planets cleared). `Profile` has **no** `gender` field.
- No component DOM tests (project has no RTL/jsdom). Only `home.logic.ts` is unit-tested. Component tasks are gated by `npx tsc -b` + `npm run lint`.
- Test runner: `npm test` (= `vitest run`). Lint: `npm run lint` (oxlint). Typecheck/build: `npm run build` (= `tsc -b && vite build`).
- Korean copy for all user-facing strings and Korean test descriptions (match existing tests).
- Do **not** use `useFitStage` (legacy 1920×1200 letterbox, unused).
- Commit after each task.

---

## File Structure

```
scripts/process_home_assets.py        # Task 1 — one-time asset prep
src/assets/home/                       # Task 1 — generated PNGs (trimmed + plate splits)
src/scenes/home/
  home.data.ts                         # Task 2 — NICKNAMES, COMMENTS, PLANET_NAMES tables
  home.logic.ts                        # Task 2 — planetState, nicknameFor, commentFor
  home.logic.test.ts                   # Task 2 — Vitest
  Modal.tsx                            # Task 3 — generic popup (dim + X, plate via border-image)
  ProfileCard.tsx                      # Task 4
  EnergyGauge.tsx                      # Task 5
  Mothership.tsx                       # Task 6
  PlanetButton.tsx                     # Task 7
  MenuBar.tsx                          # Task 8
  HatiHelper.tsx                       # Task 9
src/scenes/Home.tsx                    # Task 10 — assembles everything (rewrite of current stub)
src/scenes/Home.css                    # Tasks 3–10 — scene + component styles
```

---

## Task 1: Asset processing (alpha-trim + PlateSet split)

**Files:**
- Create: `scripts/process_home_assets.py`
- Create (generated): `src/assets/home/*.png`

**Interfaces:**
- Produces (filenames later tasks import from `src/assets/home/`):
  `PlayerButton.png`, `AvatarFace.png`, `BannerPlate03.png`, `PurposeStart.png`,
  `HeartScorePlate.png`, `HeartFull.png`, `HeartEmpty.png`, `HeartConnect.png`,
  `Alien01_Happy.png`, `Alien01_Sad.png`, `Alien02_Happy.png`, `Alien02_Sad.png`,
  `Alien03_Happy.png`, `Alien03_Sad.png`, `Alien04_Happy.png`, `Alien04_Sad.png`,
  `Lock.png`, `RocketButton.png`, `MissionButton.png`, `GemBookButton.png`,
  `InventoryButton.png`, `HistoryButton.png`, `SpaceshipBackground.png`,
  `plateMission.png`, `plateGem.png`, `plateInventory.png`, `plateHistory.png`
  (the 4 plates are PlateSet columns left→right: green, blue, purple, brown).

- [ ] **Step 1: Write the script**

Create `scripts/process_home_assets.py`:

```python
"""One-time: trim transparent margins from mytemp/home PNGs and split PlateSet
into 4 plates, writing results to src/assets/home/. Re-runnable (idempotent)."""
from pathlib import Path
from PIL import Image

SRC = Path("mytemp/home")
DST = Path("src/assets/home")
DST.mkdir(parents=True, exist_ok=True)

# Files copied with an alpha-bbox trim (transparent margins removed).
TRIM = [
    "PlayerButton.png", "AvatarFace.png", "BannerPlate03.png", "PurposeStart.png",
    "HeartScorePlate.png", "HeartFull.png", "HeartEmpty.png", "HeartConnect.png",
    "Alien01_Happy.png", "Alien01_Sad.png", "Alien02_Happy.png", "Alien02_Sad.png",
    "Alien03_Happy.png", "Alien03_Sad.png", "Alien04_Happy.png", "Alien04_Sad.png",
    "Lock.png", "RocketButton.png", "MissionButton.png", "GemBookButton.png",
    "InventoryButton.png", "HistoryButton.png", "SpaceshipBackground.png",
]

def trim(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.split()[3].getbbox()  # bbox of non-transparent pixels
    return im.crop(bbox) if bbox else im

for name in TRIM:
    out = trim(Image.open(SRC / name))
    out.save(DST / name)
    print(f"{name}: {out.size}")

# PlateSet.png = 4 plates left→right (green, blue, purple, brown). Split into
# equal quarters, then alpha-trim each quarter to its plate.
plate = Image.open(SRC / "PlateSet.png").convert("RGBA")
w, h = plate.size
out_names = ["plateMission.png", "plateGem.png", "plateInventory.png", "plateHistory.png"]
for i, n in enumerate(out_names):
    col = plate.crop((i * w // 4, 0, (i + 1) * w // 4, h))
    bbox = col.split()[3].getbbox()
    col = col.crop(bbox) if bbox else col
    col.save(DST / n)
    print(f"{n}: {col.size}")
```

- [ ] **Step 2: Run the script**

Run: `python scripts/process_home_assets.py`
Expected: prints each filename with a size; trimmed images are smaller than originals (e.g. `MissionButton.png` shrinks from 1920×1080 to roughly its glossy-square bounds), 4 `plate*.png` printed.

- [ ] **Step 3: Verify outputs exist**

Run: `ls src/assets/home | wc -l`
Expected: `27` files (23 trimmed + 4 plates).

- [ ] **Step 4: Commit**

```bash
git add scripts/process_home_assets.py src/assets/home
git commit -m "build(home): add asset processing script and processed Home assets"
```

---

## Task 2: Logic + data tables (`home.logic.ts`, `home.data.ts`)

**Files:**
- Create: `src/scenes/home/home.data.ts`
- Create: `src/scenes/home/home.logic.ts`
- Test: `src/scenes/home/home.logic.test.ts`

**Interfaces:**
- Produces:
  - `home.data.ts`: `NICKNAMES: readonly string[]` (index 0–4), `COMMENTS: readonly string[]` (index 0–4), `PLANET_NAMES: readonly string[]` (index 0–3 for planets 1–4).
  - `home.logic.ts`: `type PlanetStatus = "completed" | "unlocked" | "locked"`; `planetState(id: number, progress: number): PlanetStatus`; `nicknameFor(progress: number): string`; `commentFor(progress: number): string`.

- [ ] **Step 1: Write the data tables**

Create `src/scenes/home/home.data.ts`:

```ts
// 표시용 상수표. progress(0~4) 또는 행성 번호(1~4)로 조회한다.

/** progress 0~4에 대응하는 별명. */
export const NICKNAMES = [
  "견습 가디언",
  "새내기 가디언",
  "정식 가디언",
  "베테랑 가디언",
  "마스터 가디언",
] as const;

/** progress 0~4에 대응하는 하티 멘트. */
export const COMMENTS = [
  "안녕, 난 하티야! 오늘의 미션이 준비됐어. 빛의 행성으로 첫 탐험을 떠나볼까?",
  "빛의 행성을 멋지게 해냈구나! 이번엔 안개 행성이 너를 기다리고 있어.",
  "안개 행성도 통과! 다음은 차가운 얼음 행성이야. 준비됐지?",
  "얼음 행성까지 클리어하다니 대단해! 마지막은 그림자 행성이야. 끝까지 가보자!",
  "우와, 네 개의 행성을 모두 구했어! 진짜 멋진 가디언이야. 정말 고마워!",
] as const;

/** 행성 1~4 이름 (이미지에도 박혀 있으나 alt/접근성용). */
export const PLANET_NAMES = ["빛의 행성", "안개 행성", "얼음 행성", "그림자 행성"] as const;
```

- [ ] **Step 2: Write the failing tests**

Create `src/scenes/home/home.logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { planetState, nicknameFor, commentFor } from "./home.logic";

describe("planetState", () => {
  it("progress보다 작거나 같은 행성은 completed", () => {
    expect(planetState(1, 2)).toBe("completed");
    expect(planetState(2, 2)).toBe("completed");
  });
  it("progress 바로 다음 행성은 unlocked", () => {
    expect(planetState(1, 0)).toBe("unlocked");
    expect(planetState(3, 2)).toBe("unlocked");
  });
  it("그 이후 행성은 locked", () => {
    expect(planetState(2, 0)).toBe("locked");
    expect(planetState(4, 1)).toBe("locked");
  });
  it("progress=4면 4개 모두 completed (unlocked 없음)", () => {
    expect([1, 2, 3, 4].map((id) => planetState(id, 4))).toEqual([
      "completed", "completed", "completed", "completed",
    ]);
  });
});

describe("nicknameFor", () => {
  it("progress별 별명을 반환한다", () => {
    expect(nicknameFor(0)).toBe("견습 가디언");
    expect(nicknameFor(4)).toBe("마스터 가디언");
  });
  it("범위를 벗어나면 양 끝으로 clamp", () => {
    expect(nicknameFor(-1)).toBe("견습 가디언");
    expect(nicknameFor(9)).toBe("마스터 가디언");
  });
});

describe("commentFor", () => {
  it("progress별 멘트를 반환한다", () => {
    expect(commentFor(0)).toContain("빛의 행성");
    expect(commentFor(4)).toContain("모두 구했어");
  });
  it("범위를 벗어나면 clamp", () => {
    expect(commentFor(99)).toBe(commentFor(4));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- home.logic`
Expected: FAIL (`home.logic.ts` has no such exports / module not found).

- [ ] **Step 4: Write the implementation**

Create `src/scenes/home/home.logic.ts`:

```ts
import { NICKNAMES, COMMENTS } from "./home.data";

export type PlanetStatus = "completed" | "unlocked" | "locked";

/** 행성 id(1~4)와 progress(0~4)로 상태를 판정한다. 진행은 순차적이다. */
export function planetState(id: number, progress: number): PlanetStatus {
  if (id <= progress) return "completed";
  if (id === progress + 1) return "unlocked";
  return "locked";
}

function clampIndex(n: number, len: number): number {
  return Math.max(0, Math.min(len - 1, n));
}

/** progress(0~4)에 대응하는 별명. 범위를 벗어나면 양 끝으로 clamp. */
export function nicknameFor(progress: number): string {
  return NICKNAMES[clampIndex(progress, NICKNAMES.length)];
}

/** progress(0~4)에 대응하는 하티 멘트. 범위를 벗어나면 양 끝으로 clamp. */
export function commentFor(progress: number): string {
  return COMMENTS[clampIndex(progress, COMMENTS.length)];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- home.logic`
Expected: PASS (all describe blocks green).

- [ ] **Step 6: Commit**

```bash
git add src/scenes/home/home.data.ts src/scenes/home/home.logic.ts src/scenes/home/home.logic.test.ts
git commit -m "feat(home): add progress logic and copy tables"
```

---

## Task 3: Generic `Modal` + scene base CSS

**Files:**
- Create: `src/scenes/home/Modal.tsx`
- Create: `src/scenes/Home.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `Modal` React component with props
  `{ open: boolean; onClose: () => void; plateUrl: string; slice?: number; children?: React.ReactNode }`.
  Renders nothing when `open` is false. Backdrop click and the ✕ button both call `onClose`; clicks inside the content panel do not close.

- [ ] **Step 1: Write the component**

Create `src/scenes/home/Modal.tsx`:

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  plateUrl: string;
  slice?: number;
  children?: React.ReactNode;
}

/** 공용 팝업: 딤 배경 클릭 또는 ✕로 닫힘. 내용 영역 클릭은 닫히지 않음.
 *  배경 plate는 border-image(9-slice)로 그린다. */
export default function Modal({ open, onClose, plateUrl, slice = 44, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="home-modal" onClick={onClose}>
      <div
        className="home-modal__panel"
        style={{ borderImage: `url(${plateUrl}) ${slice} fill / 28px / 0 stretch` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="home-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <div className="home-modal__body">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the scene base + modal CSS**

Create `src/scenes/Home.css`:

```css
/* 1280×800 CSS px 기준. 씬은 전체화면 고정 + 배경 cover. 요소는 위에 절대배치. */
.home {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  min-height: 100svh;
  overflow: hidden;
  background:
    url("../assets/home/SpaceshipBackground.png") center / cover no-repeat,
    #050a18;
  color: #fff;
  user-select: none;
}

/* 공용 팝업 */
.home-modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  z-index: 50;
}
.home-modal__panel {
  position: relative;
  width: 640px;
  height: 440px;
  border: 28px solid transparent;
  display: flex;
}
.home-modal__close {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}
.home-modal__body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors. (`Modal` is unused for now — that's fine; it is exported and imported in Task 10. If lint flags unused, leave it; Task 10 wires it.)

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/Modal.tsx src/scenes/Home.css
git commit -m "feat(home): add generic Modal and scene base styles"
```

---

## Task 4: `ProfileCard`

**Files:**
- Create: `src/scenes/home/ProfileCard.tsx`
- Modify: `src/scenes/Home.css` (append)

**Interfaces:**
- Consumes: `nicknameFor` from `./home.logic`.
- Produces: `ProfileCard` with props `{ name: string; progress: number; gender?: "male" | "female" }` (default `"male"`).

- [ ] **Step 1: Write the component**

Create `src/scenes/home/ProfileCard.tsx`:

```tsx
import { nicknameFor } from "./home.logic";
import plateUrl from "../../assets/home/PlayerButton.png";
import maleFace from "../../assets/home/AvatarFace.png";

// 성별별 얼굴. 현재는 남자만 존재 — 여자 에셋이 생기면 여기에 추가한다.
const FACES = { male: maleFace, female: maleFace } as const;

interface ProfileCardProps {
  name: string;
  progress: number;
  gender?: keyof typeof FACES;
}

export default function ProfileCard({ name, progress, gender = "male" }: ProfileCardProps) {
  return (
    <div className="home-profile" style={{ backgroundImage: `url(${plateUrl})` }}>
      <img className="home-profile__face" src={FACES[gender]} alt="" />
      <div className="home-profile__info">
        <span className="home-profile__level">
          Lv{progress} {nicknameFor(progress)}
        </span>
        <span className="home-profile__name">{name}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append CSS**

Append to `src/scenes/Home.css`:

```css
/* 프로필 카드 (좌상단) */
.home-profile {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 360px;
  height: 96px;
  background-size: 100% 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  box-sizing: border-box;
}
.home-profile__face {
  width: 68px;
  height: 68px;
  object-fit: contain;
}
.home-profile__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home-profile__level {
  font-size: 20px;
  font-weight: 700;
}
.home-profile__name {
  font-size: 18px;
  opacity: 0.9;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/ProfileCard.tsx src/scenes/Home.css
git commit -m "feat(home): add ProfileCard"
```

---

## Task 5: `EnergyGauge`

**Files:**
- Create: `src/scenes/home/EnergyGauge.tsx`
- Modify: `src/scenes/Home.css` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `EnergyGauge` with props `{ progress: number }`.

- [ ] **Step 1: Write the component**

Create `src/scenes/home/EnergyGauge.tsx`:

```tsx
import plateUrl from "../../assets/home/HeartScorePlate.png";
import heartFull from "../../assets/home/HeartFull.png";
import heartEmpty from "../../assets/home/HeartEmpty.png";

interface EnergyGaugeProps {
  progress: number;
}

export default function EnergyGauge({ progress }: EnergyGaugeProps) {
  const percent = Math.max(0, Math.min(4, progress)) * 25;
  return (
    <div className="home-energy" style={{ backgroundImage: `url(${plateUrl})` }}>
      <span className="home-energy__label">공감 에너지</span>
      <div className="home-energy__hearts">
        {[0, 1, 2, 3].map((i) => (
          <img key={i} src={i < progress ? heartFull : heartEmpty} alt="" className="home-energy__heart" />
        ))}
        <span className="home-energy__percent">{percent}%</span>
      </div>
      <div className="home-energy__bar">
        <div className="home-energy__bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append CSS**

Append to `src/scenes/Home.css`:

```css
/* 공감 에너지 게이지 (우상단) */
.home-energy {
  position: absolute;
  top: 130px;
  right: 18px;
  width: 360px;
  height: 120px;
  background-size: 100% 100%;
  padding: 14px 22px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.home-energy__label {
  font-size: 18px;
  font-weight: 700;
}
.home-energy__hearts {
  display: flex;
  align-items: center;
  gap: 8px;
}
.home-energy__heart {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.home-energy__percent {
  margin-left: auto;
  font-size: 20px;
  font-weight: 700;
}
.home-energy__bar {
  height: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}
.home-energy__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff5fa2, #ff9ec9);
  transition: width 0.4s ease;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/EnergyGauge.tsx src/scenes/Home.css
git commit -m "feat(home): add EnergyGauge"
```

---

## Task 6: `Mothership`

**Files:**
- Create: `src/scenes/home/Mothership.tsx`
- Modify: `src/scenes/Home.css` (append)

**Interfaces:**
- Produces: `Mothership` with no props.

- [ ] **Step 1: Write the component**

Create `src/scenes/home/Mothership.tsx`:

```tsx
import shipUrl from "../../assets/home/HeartConnect.png";

export default function Mothership() {
  return <img className="home-mothership" src={shipUrl} alt="" />;
}
```

- [ ] **Step 2: Append CSS (bob + glow)**

Append to `src/scenes/Home.css`:

```css
/* 모선 (중앙 상단) — 상하 부유 + 발광 펄스 */
.home-mothership {
  position: absolute;
  top: 150px;
  left: 50%;
  width: 320px;
  height: auto;
  transform: translateX(-50%);
  animation: home-bob 3.6s ease-in-out infinite;
  filter: drop-shadow(0 0 14px rgba(80, 170, 255, 0.55));
}
@keyframes home-bob {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -10px); }
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/Mothership.tsx src/scenes/Home.css
git commit -m "feat(home): add Mothership with bob/glow animation"
```

---

## Task 7: `PlanetButton`

**Files:**
- Create: `src/scenes/home/PlanetButton.tsx`
- Modify: `src/scenes/Home.css` (append)

**Interfaces:**
- Consumes: `PlanetStatus` from `./home.logic`; `PLANET_NAMES` from `./home.data`.
- Produces: `PlanetButton` with props `{ id: 1 | 2 | 3 | 4; status: PlanetStatus; onPlay: (id: number) => void }`.
  Calls `onPlay(id)` only when `status === "unlocked"`.

- [ ] **Step 1: Write the component**

Create `src/scenes/home/PlanetButton.tsx`:

```tsx
import type { PlanetStatus } from "./home.logic";
import { PLANET_NAMES } from "./home.data";
import lockUrl from "../../assets/home/Lock.png";
import rocketUrl from "../../assets/home/RocketButton.png";
import starUrl from "../../assets/home/PurposeStart.png";
import a1h from "../../assets/home/Alien01_Happy.png";
import a1s from "../../assets/home/Alien01_Sad.png";
import a2h from "../../assets/home/Alien02_Happy.png";
import a2s from "../../assets/home/Alien02_Sad.png";
import a3h from "../../assets/home/Alien03_Happy.png";
import a3s from "../../assets/home/Alien03_Sad.png";
import a4h from "../../assets/home/Alien04_Happy.png";
import a4s from "../../assets/home/Alien04_Sad.png";

const ART: Record<number, { happy: string; sad: string }> = {
  1: { happy: a1h, sad: a1s },
  2: { happy: a2h, sad: a2s },
  3: { happy: a3h, sad: a3s },
  4: { happy: a4h, sad: a4s },
};

interface PlanetButtonProps {
  id: 1 | 2 | 3 | 4;
  status: PlanetStatus;
  onPlay: (id: number) => void;
}

export default function PlanetButton({ id, status, onPlay }: PlanetButtonProps) {
  const art = ART[id];
  const img = status === "completed" ? art.happy : art.sad;
  const playable = status === "unlocked";
  return (
    <button
      type="button"
      className={`home-planet home-planet--${status}`}
      disabled={!playable}
      onClick={() => playable && onPlay(id)}
      aria-label={PLANET_NAMES[id - 1]}
    >
      {status === "unlocked" && (
        <span className="home-planet__rocket" style={{ backgroundImage: `url(${rocketUrl})` }}>
          탐험 시작!
        </span>
      )}
      {status === "completed" && <img className="home-planet__star" src={starUrl} alt="" />}
      {status === "locked" && <img className="home-planet__lock" src={lockUrl} alt="잠김" />}
      <img className="home-planet__char" src={img} alt="" />
    </button>
  );
}
```

- [ ] **Step 2: Append CSS (states + unlocked emphasis)**

Append to `src/scenes/Home.css`:

```css
/* 행성 버튼 */
.home-planet {
  position: relative;
  width: 260px;
  height: 280px;
  border: none;
  background: transparent;
  padding: 0;
}
.home-planet__char {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.home-planet--locked {
  filter: grayscale(85%) brightness(0.6);
  opacity: 0.85;
  cursor: default;
}
.home-planet--completed {
  cursor: default;
}
.home-planet--unlocked {
  cursor: pointer;
  animation: home-bob-plain 2.4s ease-in-out infinite;
}
@keyframes home-bob-plain {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
/* unlocked: 섬 둘레 펄스 헤일로 */
.home-planet--unlocked::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 28px;
  width: 200px;
  height: 60px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(120, 200, 255, 0.55), transparent 70%);
  animation: home-halo 1.8s ease-in-out infinite;
  z-index: -1;
}
@keyframes home-halo {
  0%, 100% { opacity: 0.35; transform: translateX(-50%) scale(0.9); }
  50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
}
.home-planet__lock {
  position: absolute;
  top: 40px;
  right: 30px;
  width: 56px;
  height: 56px;
  z-index: 2;
}
.home-planet__star {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  z-index: 2;
}
.home-planet__rocket {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 52px;
  background-size: 100% 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 22px;
  box-sizing: border-box;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  z-index: 2;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/PlanetButton.tsx src/scenes/Home.css
git commit -m "feat(home): add PlanetButton with 3 states"
```

---

## Task 8: `MenuBar`

**Files:**
- Create: `src/scenes/home/MenuBar.tsx`
- Modify: `src/scenes/Home.css` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `MenuBar` with props `{ onOpen: (key: MenuKey) => void }` and exported
  `type MenuKey = "mission" | "gem" | "inventory" | "history"`.

- [ ] **Step 1: Write the component**

Create `src/scenes/home/MenuBar.tsx`:

```tsx
import missionUrl from "../../assets/home/MissionButton.png";
import gemUrl from "../../assets/home/GemBookButton.png";
import inventoryUrl from "../../assets/home/InventoryButton.png";
import historyUrl from "../../assets/home/HistoryButton.png";

export type MenuKey = "mission" | "gem" | "inventory" | "history";

const ITEMS: { key: MenuKey; url: string; label: string }[] = [
  { key: "mission", url: missionUrl, label: "미션" },
  { key: "gem", url: gemUrl, label: "원석 도감" },
  { key: "inventory", url: inventoryUrl, label: "가디언즈 가방" },
  { key: "history", url: historyUrl, label: "탐험 일지" },
];

interface MenuBarProps {
  onOpen: (key: MenuKey) => void;
}

export default function MenuBar({ onOpen }: MenuBarProps) {
  return (
    <div className="home-menu">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          className="home-menu__btn"
          onClick={() => onOpen(it.key)}
          aria-label={it.label}
        >
          <img src={it.url} alt="" />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Append CSS**

Append to `src/scenes/Home.css`:

```css
/* 하단 메뉴 버튼 */
.home-menu {
  position: absolute;
  left: 24px;
  bottom: 20px;
  display: flex;
  gap: 16px;
}
.home-menu__btn {
  width: 104px;
  height: 104px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.home-menu__btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.home-menu__btn:active {
  transform: scale(0.95);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/MenuBar.tsx src/scenes/Home.css
git commit -m "feat(home): add bottom MenuBar"
```

---

## Task 9: `HatiHelper` (robot + typewriter speech bubble)

**Files:**
- Create: `src/scenes/home/HatiHelper.tsx`
- Modify: `src/scenes/Home.css` (append)

**Interfaces:**
- Consumes: `commentFor` from `./home.logic`; `PanelBackground01.png` from `src/assets/auth/`.
- Produces: `HatiHelper` with props `{ progress: number }`.

- [ ] **Step 1: Write the component**

Create `src/scenes/home/HatiHelper.tsx`:

```tsx
import { useEffect, useState } from "react";
import { commentFor } from "./home.logic";
import bubbleUrl from "../../assets/auth/PanelBackground01.png";

const HATI_SRC = "/assets/char/Hati/hati_default.png";

interface HatiHelperProps {
  progress: number;
}

export default function HatiHelper({ progress }: HatiHelperProps) {
  const full = commentFor(progress);
  const [count, setCount] = useState(0);

  // progress가 바뀌면 타이핑을 처음부터 다시 시작한다.
  useEffect(() => {
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= full.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 45);
    return () => clearInterval(id);
  }, [full]);

  return (
    <div className="home-hati">
      <div
        className="home-hati__bubble"
        style={{ borderImage: `url(${bubbleUrl}) 44 fill / 28px / 0 stretch` }}
      >
        <p className="home-hati__text">{full.slice(0, count)}</p>
      </div>
      <img className="home-hati__robot" src={HATI_SRC} alt="하티" />
    </div>
  );
}
```

- [ ] **Step 2: Append CSS (bob on robot)**

Append to `src/scenes/Home.css`:

```css
/* 하티 + 말풍선 (우하단) */
.home-hati {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.home-hati__bubble {
  width: 360px;
  height: 132px;
  border: 28px solid transparent;
  display: flex;
  align-items: center;
}
.home-hati__text {
  margin: 0;
  font-size: 19px;
  line-height: 1.4;
  font-weight: 600;
}
.home-hati__robot {
  width: 120px;
  height: 120px;
  object-fit: contain;
  animation: home-bob-plain 2.8s ease-in-out infinite;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors. (`home-bob-plain` keyframe is defined in Task 7's CSS.)

- [ ] **Step 4: Commit**

```bash
git add src/scenes/home/HatiHelper.tsx src/scenes/Home.css
git commit -m "feat(home): add HatiHelper with typewriter bubble"
```

---

## Task 10: Assemble `Home.tsx` (session guard, layout, popups, navigation)

**Files:**
- Modify (rewrite): `src/scenes/Home.tsx`
- Modify: `src/scenes/Home.css` (append title + planet-row layout)

**Interfaces:**
- Consumes: all components above; `getSession` from `../lib/session`; `planetState` from `./home/home.logic`; `MenuKey` from `./home/MenuBar`; plate assets `plateMission/Gem/Inventory/History.png`; `BannerPlate03.png`; `TitleBanner.png`; `PurposeStart.png`.
- Produces: the `/home` route screen.

- [ ] **Step 1: Rewrite Home.tsx**

Replace `src/scenes/Home.tsx` entirely:

```tsx
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { getSession } from "../lib/session";
import { planetState } from "./home/home.logic";
import ProfileCard from "./home/ProfileCard";
import EnergyGauge from "./home/EnergyGauge";
import Mothership from "./home/Mothership";
import PlanetButton from "./home/PlanetButton";
import MenuBar, { type MenuKey } from "./home/MenuBar";
import HatiHelper from "./home/HatiHelper";
import Modal from "./home/Modal";
import bannerUrl from "../assets/auth/TitleBanner.png";
import goalPlate from "../assets/home/BannerPlate03.png";
import starUrl from "../assets/home/PurposeStart.png";
import plateMission from "../assets/home/plateMission.png";
import plateGem from "../assets/home/plateGem.png";
import plateInventory from "../assets/home/plateInventory.png";
import plateHistory from "../assets/home/plateHistory.png";
import "./Home.css";

type PopupKey = "goal" | MenuKey;

const MENU_PLATE: Record<MenuKey, string> = {
  mission: plateMission,
  gem: plateGem,
  inventory: plateInventory,
  history: plateHistory,
};

export default function Home() {
  const nav = useNavigate();
  const session = getSession();
  const [popup, setPopup] = useState<PopupKey | null>(null);

  // 세션이 없으면(새로고침/직접진입) 로그인부터.
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const { profile, progress } = session;
  const popupPlate: string =
    popup && popup !== "goal" ? MENU_PLATE[popup] : goalPlate;

  return (
    <div className="home">
      <img className="home-title" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />

      <ProfileCard name={profile.name} progress={progress} />

      <button
        type="button"
        className="home-goal"
        style={{ backgroundImage: `url(${goalPlate})` }}
        onClick={() => setPopup("goal")}
      >
        <img className="home-goal__star" src={starUrl} alt="" />
        <span className="home-goal__text">
          학습 목표<br />
          <small>클릭해서 목표를 완성하세요</small>
        </span>
      </button>

      <EnergyGauge progress={progress} />
      <Mothership />

      <div className="home-planets">
        {([1, 2, 3, 4] as const).map((id) => (
          <PlanetButton
            key={id}
            id={id}
            status={planetState(id, progress)}
            onPlay={(pid) => nav(`/planet/${pid}`)}
          />
        ))}
      </div>

      <MenuBar onOpen={(key) => setPopup(key)} />
      <HatiHelper progress={progress} />

      {/* 팝업 내용은 추후 채움 (지금은 빈 모달) */}
      <Modal open={popup !== null} onClose={() => setPopup(null)} plateUrl={popupPlate} />
    </div>
  );
}
```

- [ ] **Step 2: Append title + planet-row CSS**

Append to `src/scenes/Home.css`:

```css
/* 중앙 타이틀 */
.home-title {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 460px;
  height: auto;
  z-index: 1;
}

/* 학습 목표 버튼 (우상단) */
.home-goal {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 360px;
  height: 96px;
  background-size: 100% 100%;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  cursor: pointer;
  text-align: left;
}
.home-goal__star {
  width: 54px;
  height: 54px;
}
.home-goal__text {
  font-size: 20px;
  font-weight: 700;
}
.home-goal__text small {
  font-size: 14px;
  font-weight: 400;
  opacity: 0.85;
}

/* 행성 4개 가로 배치 (중앙) */
.home-planets {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 150px;
  display: flex;
  justify-content: center;
  gap: 18px;
}
```

- [ ] **Step 3: Typecheck, lint, build, and run full test suite**

Run: `npm run build && npm run lint && npm test`
Expected: build succeeds, no lint errors, all tests pass (incl. `home.logic.test.ts`).

- [ ] **Step 4: Visual verification against the screenshot**

Start the dev server and open `/home`. Because the scene needs a session, seed one in DevTools before navigating, or temporarily verify by setting a session. Steps:

1. Run: `npm run dev` (note the localhost URL).
2. In the browser console on the app origin, seed a session and go to `/home`:
   ```js
   // dev-only: import is not available in console; instead navigate via the app
   // after logging in through /auth, OR set progress for visual states.
   ```
   Simplest reliable path: log in through `/auth` with a test account so `setSession` runs, then navigate to `/home`.
3. Compare layout to `mytemp/home/HomeScreenshot.png`: profile (top-left), title (top-center), goal button + energy gauge (top-right), mothership (center-top, bobbing), 4 planets in a row (planet 1 unlocked with rocket badge + halo at progress 0, others locked with padlock), menu (bottom-left), Hati with typewriter bubble (bottom-right).
4. Click planet 1 → should navigate to `/planet/1`. Click a menu button → popup opens with matching plate color; backdrop/✕ closes it. Click the goal button → empty popup opens and closes.

Expected: matches the screenshot layout; interactions behave per spec. Fix CSS offsets if needed (positions above are starting values; nudge to match the screenshot).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/Home.tsx src/scenes/Home.css
git commit -m "feat(home): assemble Home scene with popups, navigation, session guard"
```

---

## Notes for the implementer

- Position/size values in CSS are **starting points** tuned to the 1280×800 baseline; expect to nudge offsets in Task 10 Step 4 to match `HomeScreenshot.png`. This is layout finishing, not a redesign.
- The goal popup reuses `BannerPlate03.png` as its plate (no PlateSet color is assigned to it). Menu popups use the 4 split plates.
- The completed-planet badge reuses `PurposeStart.png` (gold star). No new asset.
- If `npm run lint` flags an unused export between tasks (e.g. `Modal` before Task 10), that resolves once Task 10 wires it; do not delete.
