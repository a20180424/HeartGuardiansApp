# Scene 폴더 구조 리팩터링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intro/Auth/Home 3개 scene을 self-contained 폴더(`index.tsx` + `components/` + co-located `assets/`)로 재배치하고, scene 간 공유 자산(Modal, 공유 에셋 2개)을 `shared/` 로 추출한다. 기능 변경 0.

**Architecture:** `git mv` 로 파일을 옮기고 깨진 상대 import / CSS `url()` 경로만 수정한다. 코드 동작은 한 줄도 바꾸지 않는다. 각 task는 `npm run build`(tsc + vite build)와 `npm test`(vitest)가 그린이면 완료. 공유 추출(shared/)을 먼저 하고, 그다음 scene을 하나씩 폴더화한다 — 각 커밋마다 빌드가 그린이도록 참조를 같은 커밋에서 갱신한다.

**Tech Stack:** React 19, Vite, TypeScript, Vitest. 경로 alias 없음(순수 상대경로), barrel 파일 없음.

## Global Constraints

- **기능·동작 변경 0.** 파일 이동 + import/`url()` 경로 수정만. 컴포넌트 내부 로직·JSX·스타일 값은 그대로.
- **이동은 `git mv`** 로 히스토리 보존.
- **빌드는 case-sensitive(Cloudflare Pages/Linux)에서도 통과해야 한다** — `App.tsx` 의 scene import 경로를 폴더명(소문자 `intro`/`auth`/`home`)에 정확히 맞춘다.
- 매 task 종료 시 `npm run build` + `npm test` 그린 확인 후 커밋.
- 확정 구조: 부품 → `components/`; 공용 유틸 → `lib/` 유지; 공용 UI → `shared/components/`; 공유 에셋 → `shared/assets/`; scene 에셋 → `scenes/<scene>/assets/`; 진입 파일 → `index.tsx`.
- Planet/Outro, `mission/`·`missions/`·`engine/`·`three/`, `lib/` 내부 구조는 **건드리지 않는다**.

Spec: [docs/superpowers/specs/2026-06-29-scene-folder-refactor-design.md](../specs/2026-06-29-scene-folder-refactor-design.md)

---

## Task 1: 공유 자산 추출 (shared/)

scene 경계를 넘는 자산을 먼저 `shared/` 로 뺀다. scene 파일들은 아직 평면(`scenes/Auth.tsx` 등) 그대로 둔 채 참조만 갱신 → 가장 작은 안전한 첫 커밋.

**Files:**
- Move: `src/scenes/home/Modal.tsx` → `src/shared/components/Modal.tsx`
- Move: `src/assets/auth/TitleBanner.png` → `src/shared/assets/TitleBanner.png`
- Move: `src/assets/auth/PanelBackground01.png` → `src/shared/assets/PanelBackground01.png`
- Modify: `src/scenes/Home.tsx` (Modal + TitleBanner import)
- Modify: `src/scenes/Auth.tsx` (TitleBanner import)
- Modify: `src/scenes/Auth.css` (PanelBackground01 url)
- Modify: `src/scenes/home/HatiHelper.tsx` (PanelBackground01 import)

**Interfaces:**
- Produces: `src/shared/components/Modal.tsx` (default export `Modal`, props 그대로), `src/shared/assets/TitleBanner.png`, `src/shared/assets/PanelBackground01.png`.

- [ ] **Step 1: 파일 이동 (git mv)**

```bash
mkdir -p src/shared/components src/shared/assets
git mv src/scenes/home/Modal.tsx src/shared/components/Modal.tsx
git mv src/assets/auth/TitleBanner.png src/shared/assets/TitleBanner.png
git mv src/assets/auth/PanelBackground01.png src/shared/assets/PanelBackground01.png
```

- [ ] **Step 2: `src/scenes/Home.tsx` import 수정**

`./home/Modal` → `../shared/components/Modal`, `../assets/auth/TitleBanner.png` → `../shared/assets/TitleBanner.png`:

```
import Modal from "../shared/components/Modal";
import bannerUrl from "../shared/assets/TitleBanner.png";
```

(나머지 `../assets/home/*` import 은 이 task 에서 건드리지 않는다.)

- [ ] **Step 3: `src/scenes/Auth.tsx` import 수정**

```
import bannerUrl from "../shared/assets/TitleBanner.png";
```

- [ ] **Step 4: `src/scenes/Auth.css` url 수정**

`border-image: url("../assets/auth/PanelBackground01.png") ...` 의 경로만:

```
  border-image: url("../shared/assets/PanelBackground01.png") 44 fill / 34px / 0 stretch;
```

- [ ] **Step 5: `src/scenes/home/HatiHelper.tsx` import 수정**

`../../assets/auth/PanelBackground01.png` → `../../shared/assets/PanelBackground01.png`:

```
import bubbleUrl from "../../shared/assets/PanelBackground01.png";
```

- [ ] **Step 6: 빌드 + 테스트 그린 확인**

Run: `npm run build`
Expected: tsc 에러 0, vite build 성공 (TitleBanner/PanelBackground01/Modal 관련 unresolved import 없음).

Run: `npm test`
Expected: 전체 PASS (intro/auth/home logic, session 테스트).

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor: extract shared Modal and cross-scene assets to shared/"
```

---

## Task 2: Intro scene 폴더화

가장 단순(부품·에셋 없음). 패턴 검증용. 내부 import 는 모두 sibling 이라 변경 없음 — 이동 + `App.tsx` 경로만.

**Files:**
- Move: `src/scenes/Intro.tsx` → `src/scenes/intro/index.tsx`
- Move: `src/scenes/Intro.css` → `src/scenes/intro/Intro.css`
- Move: `src/scenes/intro.logic.ts` → `src/scenes/intro/intro.logic.ts`
- Move: `src/scenes/intro.logic.test.ts` → `src/scenes/intro/intro.logic.test.ts`
- Modify: `src/App.tsx` (Intro import 경로)

**Interfaces:**
- Consumes: 없음.
- Produces: `src/scenes/intro/index.tsx` (default export `Intro`).

- [ ] **Step 1: 파일 이동 (git mv)**

```bash
mkdir -p src/scenes/intro
git mv src/scenes/Intro.tsx src/scenes/intro/index.tsx
git mv src/scenes/Intro.css src/scenes/intro/Intro.css
git mv src/scenes/intro.logic.ts src/scenes/intro/intro.logic.ts
git mv src/scenes/intro.logic.test.ts src/scenes/intro/intro.logic.test.ts
```

- [ ] **Step 2: `src/scenes/intro/index.tsx` import 확인 (변경 없음)**

`./intro.logic` 와 `./Intro.css` 는 같은 폴더 sibling 이 되었으므로 **그대로 둔다**. 수정 불필요. (확인만: 두 import 가 `./intro.logic`, `./Intro.css` 인지.)

- [ ] **Step 3: `src/App.tsx` 의 Intro import 경로 수정**

`import Intro from "./scenes/Intro";` → 폴더명(소문자)으로:

```
import Intro from "./scenes/intro";
```

- [ ] **Step 4: 빌드 + 테스트 그린 확인**

Run: `npm run build`
Expected: 성공. case-sensitive 에서도 `./scenes/intro` 가 폴더의 `index.tsx` 로 resolve.

Run: `npm test`
Expected: `intro.logic.test.ts` 포함 전체 PASS.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "refactor(intro): folderize Intro scene (index.tsx + co-located files)"
```

---

## Task 3: Auth scene 폴더화

진입 파일을 `auth/index.tsx` 로, 부품 4개를 `auth/components/` 로, auth 전용 에셋(Background01)을 `auth/assets/` 로. `auth.logic.*` 는 `scenes/auth/` 에 그대로 둔다.

**Files:**
- Move: `src/scenes/Auth.tsx` → `src/scenes/auth/index.tsx`
- Move: `src/scenes/Auth.css` → `src/scenes/auth/Auth.css`
- Move: `src/scenes/auth/Chooser.tsx` → `src/scenes/auth/components/Chooser.tsx`
- Move: `src/scenes/auth/CredentialForm.tsx` → `src/scenes/auth/components/CredentialForm.tsx`
- Move: `src/scenes/auth/SchoolPicker.tsx` → `src/scenes/auth/components/SchoolPicker.tsx`
- Move: `src/scenes/auth/WelcomePanel.tsx` → `src/scenes/auth/components/WelcomePanel.tsx`
- Move: `src/assets/auth/Background01.png` → `src/scenes/auth/assets/Background01.png`
- Modify: `src/scenes/auth/index.tsx`, `src/scenes/auth/Auth.css`, `src/scenes/auth/components/CredentialForm.tsx`, `src/scenes/auth/components/SchoolPicker.tsx`, `src/App.tsx`
- 변경 없음(확인만): `auth.logic.ts`, `auth.logic.test.ts`, `components/Chooser.tsx`, `components/WelcomePanel.tsx`

**Interfaces:**
- Consumes: `../../shared/assets/TitleBanner.png` (Task 1), `lib/*`.
- Produces: `src/scenes/auth/index.tsx` (default export `Auth`).

- [ ] **Step 1: 파일 이동 (git mv)**

```bash
mkdir -p src/scenes/auth/components src/scenes/auth/assets
git mv src/scenes/Auth.tsx src/scenes/auth/index.tsx
git mv src/scenes/Auth.css src/scenes/auth/Auth.css
git mv src/scenes/auth/Chooser.tsx src/scenes/auth/components/Chooser.tsx
git mv src/scenes/auth/CredentialForm.tsx src/scenes/auth/components/CredentialForm.tsx
git mv src/scenes/auth/SchoolPicker.tsx src/scenes/auth/components/SchoolPicker.tsx
git mv src/scenes/auth/WelcomePanel.tsx src/scenes/auth/components/WelcomePanel.tsx
git mv src/assets/auth/Background01.png src/scenes/auth/assets/Background01.png
```

- [ ] **Step 2: `src/scenes/auth/index.tsx` import 수정**

depth +1 (scenes/ → scenes/auth/). 다음 줄들을 교체:

```
import Chooser from "./components/Chooser";
import CredentialForm from "./components/CredentialForm";
import WelcomePanel from "./components/WelcomePanel";
import { classifyVerifyError } from "./auth.logic";
import { getSchools, verify, logout, signup, type School } from "../../lib/auth";
import { getProgress } from "../../lib/progress";
import { setSession, clearSession } from "../../lib/session";
import { credentialStore } from "../../lib/api";
import type { Credentials } from "../../lib/api";
import "./Auth.css";
import bannerUrl from "../../shared/assets/TitleBanner.png";
```

(`./Auth.css` 는 sibling 로 이동했으니 그대로. TitleBanner 는 Task 1 에서 shared 로 갔으므로 `../../shared/assets/`.)

- [ ] **Step 3: `src/scenes/auth/Auth.css` url 수정**

depth +1. Background01 은 `auth/assets/` 로 옮겼고, PanelBackground01 은 Task 1 에서 이미 shared 경로로 바뀌었으나 depth 가 한 단계 깊어졌으므로 재계산:

```
    url("./assets/Background01.png") center / cover no-repeat,
```

그리고 border-image 줄:

```
  border-image: url("../../shared/assets/PanelBackground01.png") 44 fill / 34px / 0 stretch;
```

- [ ] **Step 4: `src/scenes/auth/components/CredentialForm.tsx` import 수정**

depth +1 (scenes/auth/ → scenes/auth/components/). `auth.logic` 은 한 단계 위로, lib 는 한 단계 더 깊게, SchoolPicker 는 sibling 유지:

```
import type { School } from "../../../lib/auth";
import type { Credentials } from "../../../lib/api";
```

`} from "./auth.logic";` → `} from "../auth.logic";`
`import SchoolPicker from "./SchoolPicker";` → 그대로 (둘 다 components/).

- [ ] **Step 5: `src/scenes/auth/components/SchoolPicker.tsx` import 수정**

```
import type { School } from "../../../lib/auth";
```

- [ ] **Step 6: 변경 없는 파일 확인**

`auth.logic.ts`/`auth.logic.test.ts` (scenes/auth/ 에 잔류 → `../../lib/*`, `./auth.logic` 그대로), `components/Chooser.tsx`·`components/WelcomePanel.tsx` (import 없음) — **수정 불필요**. import 가 그대로인지 눈으로만 확인.

- [ ] **Step 7: `src/App.tsx` 의 Auth import 경로 수정**

```
import Auth from "./scenes/auth";
```

- [ ] **Step 8: 빌드 + 테스트 그린 확인**

Run: `npm run build`
Expected: 성공. auth 관련 unresolved import / 잃어버린 에셋 0.

Run: `npm test`
Expected: `auth.logic.test.ts` 포함 전체 PASS.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "refactor(auth): folderize Auth scene (index.tsx + components/ + assets/)"
```

---

## Task 4: Home scene 폴더화

진입 파일 → `home/index.tsx`, 부품 6개 → `home/components/`, home 에셋 전체 → `home/assets/`. `home.logic.ts`/`home.data.ts`/`home.logic.test.ts` 는 `scenes/home/` 에 잔류. 에셋 생성 스크립트의 출력 경로도 갱신.

**Files:**
- Move: `src/scenes/Home.tsx` → `src/scenes/home/index.tsx`
- Move: `src/scenes/Home.css` → `src/scenes/home/Home.css`
- Move: `src/scenes/home/EnergyGauge.tsx` → `src/scenes/home/components/EnergyGauge.tsx`
- Move: `src/scenes/home/ProfileCard.tsx` → `src/scenes/home/components/ProfileCard.tsx`
- Move: `src/scenes/home/Mothership.tsx` → `src/scenes/home/components/Mothership.tsx`
- Move: `src/scenes/home/PlanetButton.tsx` → `src/scenes/home/components/PlanetButton.tsx`
- Move: `src/scenes/home/MenuBar.tsx` → `src/scenes/home/components/MenuBar.tsx`
- Move: `src/scenes/home/HatiHelper.tsx` → `src/scenes/home/components/HatiHelper.tsx`
- Move: `src/assets/home/*` (27개 png) → `src/scenes/home/assets/`
- Modify: `index.tsx`, `Home.css`, 6개 component, `App.tsx`, `scripts/process_home_assets.py`
- 변경 없음(확인만): `home.logic.ts`, `home.data.ts`, `home.logic.test.ts`

**Interfaces:**
- Consumes: `../../shared/components/Modal` (Task 1), `../../shared/assets/TitleBanner.png` (Task 1), `../../lib/session`.
- Produces: `src/scenes/home/index.tsx` (default export `Home`).

- [ ] **Step 1: 파일 이동 (git mv)**

```bash
mkdir -p src/scenes/home/components src/scenes/home/assets
git mv src/scenes/Home.tsx src/scenes/home/index.tsx
git mv src/scenes/Home.css src/scenes/home/Home.css
git mv src/scenes/home/EnergyGauge.tsx src/scenes/home/components/EnergyGauge.tsx
git mv src/scenes/home/ProfileCard.tsx src/scenes/home/components/ProfileCard.tsx
git mv src/scenes/home/Mothership.tsx src/scenes/home/components/Mothership.tsx
git mv src/scenes/home/PlanetButton.tsx src/scenes/home/components/PlanetButton.tsx
git mv src/scenes/home/MenuBar.tsx src/scenes/home/components/MenuBar.tsx
git mv src/scenes/home/HatiHelper.tsx src/scenes/home/components/HatiHelper.tsx
git mv src/assets/home/* src/scenes/home/assets/
```

- [ ] **Step 2: `src/scenes/home/index.tsx` import 수정**

depth +1. 부품은 `./components/`, home.logic 은 sibling, Modal/TitleBanner 는 shared, lib 는 한 단계 더 깊게, home 에셋은 `./assets/`:

```
import { getSession } from "../../lib/session";
import { planetState } from "./home.logic";
import ProfileCard from "./components/ProfileCard";
import EnergyGauge from "./components/EnergyGauge";
import Mothership from "./components/Mothership";
import PlanetButton from "./components/PlanetButton";
import MenuBar, { type MenuKey } from "./components/MenuBar";
import HatiHelper from "./components/HatiHelper";
import Modal from "../../shared/components/Modal";
import bannerUrl from "../../shared/assets/TitleBanner.png";
import goalPlate from "./assets/BannerPlate03.png";
import starUrl from "./assets/PurposeStart.png";
import plateMission from "./assets/plateMission.png";
import plateGem from "./assets/plateGem.png";
import plateInventory from "./assets/plateInventory.png";
import plateHistory from "./assets/plateHistory.png";
import "./Home.css";
```

- [ ] **Step 3: `src/scenes/home/Home.css` url 수정**

SpaceshipBackground 는 `home/assets/` 로 이동:

```
    url("./assets/SpaceshipBackground.png") center / cover no-repeat,
```

- [ ] **Step 4: `src/scenes/home/components/EnergyGauge.tsx` import 수정**

depth +1 (home/ → home/components/). home.logic 한 단계 위, home 에셋은 sibling `../assets/`:

```
import { energyNoteFor } from "../home.logic";
import plateUrl from "../assets/HeartScorePlate.png";
import heartFull from "../assets/HeartFull.png";
import heartEmpty from "../assets/HeartEmpty.png";
```

- [ ] **Step 5: `src/scenes/home/components/ProfileCard.tsx` import 수정**

```
import { nicknameFor } from "../home.logic";
import plateUrl from "../assets/PlayerButton.png";
import maleFace from "../assets/AvatarFace.png";
```

- [ ] **Step 6: `src/scenes/home/components/Mothership.tsx` import 수정**

```
import shipUrl from "../assets/HeartConnect.png";
```

- [ ] **Step 7: `src/scenes/home/components/PlanetButton.tsx` import 수정**

```
import type { PlanetStatus } from "../home.logic";
import { PLANET_NAMES } from "../home.data";
import lockUrl from "../assets/Lock.png";
import rocketUrl from "../assets/RocketButton.png";
import a1h from "../assets/Alien01_Happy.png";
import a1s from "../assets/Alien01_Sad.png";
import a2h from "../assets/Alien02_Happy.png";
import a2s from "../assets/Alien02_Sad.png";
import a3h from "../assets/Alien03_Happy.png";
import a3s from "../assets/Alien03_Sad.png";
import a4h from "../assets/Alien04_Happy.png";
import a4s from "../assets/Alien04_Sad.png";
```

- [ ] **Step 8: `src/scenes/home/components/MenuBar.tsx` import 수정**

```
import missionUrl from "../assets/MissionButton.png";
import gemUrl from "../assets/GemBookButton.png";
import inventoryUrl from "../assets/InventoryButton.png";
import historyUrl from "../assets/HistoryButton.png";
```

- [ ] **Step 9: `src/scenes/home/components/HatiHelper.tsx` import 수정**

home.logic 은 한 단계 위, PanelBackground01 은 shared (home/components/ 에서 3단계 위):

```
import { commentFor } from "../home.logic";
import bubbleUrl from "../../../shared/assets/PanelBackground01.png";
```

(`useEffect, useState` from "react" 줄은 그대로.)

- [ ] **Step 10: 변경 없는 파일 확인**

`home.logic.ts` (`./home.data`), `home.data.ts` (import 없음), `home.logic.test.ts` (`./home.logic`) — scenes/home/ 잔류라 **수정 불필요**. 확인만.

- [ ] **Step 11: `src/App.tsx` 의 Home import 경로 수정**

```
import Home from "./scenes/home";
```

- [ ] **Step 12: `scripts/process_home_assets.py` 출력 경로 수정**

`DST = Path("src/assets/home")` →

```python
DST = Path("src/scenes/home/assets")
```

- [ ] **Step 13: 빌드 + 테스트 그린 확인**

Run: `npm run build`
Expected: 성공. home 관련 unresolved import / 잃어버린 에셋 0.

Run: `npm test`
Expected: `home.logic.test.ts` 포함 전체 PASS.

- [ ] **Step 14: 커밋**

```bash
git add -A
git commit -m "refactor(home): folderize Home scene (index.tsx + components/ + assets/)"
```

---

## Task 5: 최종 검증 + 잔재 정리

전체가 그린인지 확인하고, 빈 디렉터리/문서 상태를 정리한다.

**Files:**
- Modify: `docs/scene-folder-refactor.md` (상태를 "완료"로)
- 확인: `src/assets/auth`·`src/assets/home` 디렉터리가 비어 사라졌는지

- [ ] **Step 1: 잔재 디렉터리 확인**

Run: `ls src/assets`
Expected: `auth/`·`home/` 없음 (git mv 로 모두 이동됨). `hero.png`, `react.svg`, `vite.svg` 만 잔류. 만약 빈 `auth`/`home` 폴더가 남았으면 `rmdir src/assets/auth src/assets/home`.

Run: `grep -rn "assets/auth\|assets/home\|scenes/home/Modal\|./scenes/Intro\b\|./scenes/Auth\b\|./scenes/Home\b" src/`
Expected: 출력 없음 (옛 경로 잔존 0).

- [ ] **Step 2: 전체 빌드 + 테스트 최종 확인**

Run: `npm run build`
Expected: 성공.

Run: `npm test`
Expected: 전체 PASS.

- [ ] **Step 3: 앱 실제 구동으로 육안 확인**

Run: `npm run dev` 후 Intro → Auth → Home 진입, 각 scene 배경/배너/플레이트/에이리언/말풍선 이미지가 정상 표시되는지 확인 (에셋 경로 깨짐 = 깨진 이미지로 즉시 드러남).

- [ ] **Step 4: 문서 상태 갱신 + 커밋**

`docs/scene-folder-refactor.md` 상단 상태 줄을 "완료 (refactor/scene-folders, Intro/Auth/Home 적용; Planet 엔진군은 후속)" 로 수정.

```bash
git add -A
git commit -m "docs: mark scene folder refactor done for Intro/Auth/Home"
```

---

## Self-Review 메모

- **Spec coverage:** Q1 components/(Task 3·4), Q2 lib 유지+shared/components(Task 1), Q3 assets co-locate(Task 3·4), Q4 index.tsx(Task 2·3·4), Q5 Planet 제외(전 task 비범위), 공유 에셋 shared/assets(Task 1) — 전부 task 존재.
- **공유 에셋 32개 참조** 전부 매핑됨(Home 7, EnergyGauge 3, ProfileCard 2, Mothership 1, PlanetButton 10, MenuBar 4, HatiHelper 1, Auth.tsx 1, Auth.css 2, Home.css 1 = 32).
- **case-sensitivity:** App.tsx 의 3개 scene import 를 폴더명 소문자로 갱신(Task 2·3·4) — Cloudflare 빌드 대비.
- **잔류 파일**(`*.logic.ts`/`*.data.ts`/test) 은 이동 안 하므로 import 불변 — 각 task 에서 "확인만" 명시.
