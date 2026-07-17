# 사운드 설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미션 안에만 갇혀 있는 효과음 엔진을 앱 전역으로 풀고, 말풍선 타자기 소리·합성 앰비언스·음소거 버튼을 추가한다.

**Architecture:** `AudioManager`를 `src/lib/audio.ts`로 옮겨 앱 수명 동안 하나만 사는 싱글턴으로 만든다. App 레벨 전역 `pointerdown` 리스너 하나가 (1) 오디오 unlock (2) 버튼 효과음을 모두 처리한다 — 미션 UI는 전부 `#stage` 안에 있으므로 `closest("#stage")`로 제외해 기존 미션 사운드와 겹치지 않는다. 버튼별 소리는 `data-sfx` 속성으로 선언한다(기본 `tap`, `pop`, `none`).

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4, Web Audio API (오실레이터 합성 — 오디오 에셋 파일 없음)

## Global Constraints

- **스펙:** `docs/superpowers/specs/2026-07-17-sound-design-design.md`. 충돌 시 스펙이 우선.
- **에셋 파일을 추가하지 않는다.** 모든 소리는 오실레이터 합성 → APK 0바이트.
- **새 SFX는 `blipHati`/`blipFriend` 둘뿐.** 나머지는 기존 13종(`tap` `pop` `select` `drop` `whoosh` `correct` `wrong` `stage` `sparkle` `recover` `reveal` `fanfare` `title`)으로 해결한다.
- **기존 미션 사운드 24군데를 조정하지 않는다.** 타자기 blip만 새로 넣고, 인스턴스 출처 교체 외에는 손대지 않는다.
- **`BGM_ENABLED`는 `false` 유지.** BGM을 켜지 않는다.
- **음소거 버튼을 좌상단에 두지 않는다.** `src/lib/useCornerLongPress.ts:14`의 히든 메뉴 진입 제스처가 좌상단 `CORNER_PX = 200` 정사각형을 쓴다.
- **테스트 환경은 node이며 jsdom이 없다**(`vite.config.ts`에 test 설정 없음). 테스트는 **순수 함수만** 대상으로 한다 — `window`/`document`/`localStorage`를 건드리는 코드는 테스트하지 않고 브라우저 청취로 검증한다. 기존 `src/lib/hiddenMenu.test.ts`가 이 패턴의 선례다.
- **레이아웃:** `player/` 바깥은 1280×800 무대(FixedStage). `100vw`/`100dvh`/`vh`/`vw` 금지, px 절대배치. `CLAUDE.md` 참조.
- **소리는 자동화 테스트로 판단할 수 없다.** 각 태스크의 브라우저 청취 확인을 건너뛰지 않는다.
- 커밋 메시지는 한국어, 기존 컨벤션(`feat(scope): …`, `fix(scope): …`)을 따른다.

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/audio.ts` (이동+확장) | `AudioManager` 클래스 + `SOUNDS` 라이브러리 + `audio` 싱글턴 + 앰비언스 패드 |
| `src/lib/typeSound.ts` (신규) | 타자기 blip 순수 로직 — 어느 글자에서 울릴지 결정 |
| `src/lib/typeSound.test.ts` (신규) | 위 로직 테스트 |
| `src/lib/uiSfx.ts` (신규) | `data-sfx` → 소리 이름 매핑 순수 로직 |
| `src/lib/uiSfx.test.ts` (신규) | 위 로직 테스트 |
| `src/lib/zone.ts` (신규) | 경로 → 존(`hub`/`planet`/`silent`) 판별. `bgm.tsx`에서 추출해 앰비언스와 공유 |
| `src/lib/zone.test.ts` (신규) | 위 로직 테스트 |
| `src/lib/Ambience.tsx` (신규) | 존에 따라 앰비언스 패드를 켜고 끄는 프로바이더 |
| `src/lib/MuteButton.tsx` (신규) | 전역 음소거 토글 버튼 |
| `src/lib/mute-button.css` (신규) | 위 버튼 스타일 |
| `src/scenes/planet/player/audio.ts` (삭제) | `src/lib/audio.ts`로 이동 |
| `src/App.tsx` (수정) | 전역 unlock + 버튼 효과음 리스너, `<Ambience>`, `<MuteButton />` |
| `src/lib/sceneTransition.tsx` (수정) | 씬 전환 `whoosh` |
| `src/lib/bgm.tsx` (수정) | `zoneForPath`를 `zone.ts`에서 import |
| `src/scenes/planet/player/MissionPlayer.tsx` (수정) | 싱글턴 import, `typeInto`에 blip 배선 |
| `src/scenes/home/components/MenuBar.tsx` (수정) | `data-sfx="pop"` |
| `src/scenes/home/components/PlanetButton.tsx` (수정) | `data-sfx="none"` |
| `src/scenes/home/index.tsx` (수정) | 학습 목표 버튼 `data-sfx="pop"` |
| `src/scenes/auth/index.tsx` (수정) | 로그인 성공 `title` / 실패 `wrong` |

---

### Task 1: AudioManager를 전역 싱글턴으로 승격

미션 사운드를 그대로 유지한 채 인스턴스 출처만 바꾼다. 이 태스크만으로는 **소리가 늘지 않는다** — 회귀가 없어야 성공이다.

**Files:**
- Create: `src/lib/audio.ts` (내용은 `src/scenes/planet/player/audio.ts`에서 이동)
- Delete: `src/scenes/planet/player/audio.ts`
- Modify: `src/scenes/planet/player/MissionPlayer.tsx:21` 근처(import), `:149`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `src/lib/audio.ts`가 `export class AudioManager`, `export const audio: AudioManager`를 export
  - `audio.play(name: string): void`, `audio.unlock(): void`, `audio.setMuted(m: boolean): void`, `audio.toggleMute(): boolean`, `audio.muted: boolean`

- [ ] **Step 1: 파일 이동 (내용 변경 없음)**

```bash
git mv src/scenes/planet/player/audio.ts src/lib/audio.ts
```

- [ ] **Step 2: 싱글턴 export 추가**

`src/lib/audio.ts` 맨 아래(`SOUNDS` 정의 뒤)에 추가한다. `SOUNDS`가 클래스보다 아래에 선언돼 있지만 `play()` 안에서만 참조하므로 모듈 최상단 싱글턴 생성은 안전하다.

```ts
/* 앱 전역 단일 인스턴스. 예전엔 MissionPlayer가 직접 new 했으나, 그러면 미션이
 * 마운트돼야 오디오가 생기고 unlock 도 미션 안 첫 탭에서만 걸려 홈·로그인이 무음이었다.
 * 이제 App 이 첫 제스처에서 unlock 하고, 모든 씬이 이 하나를 공유한다. */
export const audio = new AudioManager();
```

- [ ] **Step 3: MissionPlayer가 싱글턴을 쓰도록 교체**

이 파일은 이미 `const audio = audioRef.current`(`:150`)로 지역 변수 `audio`를 만들어
24군데에서 쓴다. **그 이름이 import 한 싱글턴을 가리키게만 바꾸면 호출부는 한 글자도
건드릴 필요가 없다.**

`:22`의 import 를 교체:

```ts
import { audio } from "../../../lib/audio";
```

`:148-150` 세 줄을 **삭제**한다:

```ts
  const audioRef = useRef<AudioManager>(null);
  if (!audioRef.current) audioRef.current = new AudioManager();
  const audio = audioRef.current;
```

`audio.play("…")` 호출 24군데는 **문자열도 순서도 건드리지 않는다.**

**주의:** `useRef` 가 이 파일에서 더 이상 안 쓰이면 import 에서 빼야 `npm run lint` 가
통과한다. 다른 데서 쓰고 있으면 그대로 둔다 — 지우기 전에 확인한다.

- [ ] **Step 4: App에서 첫 제스처에 unlock**

`src/App.tsx`의 import에 추가:

```ts
import { audio } from "./lib/audio";
```

`App()` 안, 기존 backButton `useEffect` 아래에 추가:

```tsx
  // 브라우저 자동재생 정책상 첫 사용자 제스처 전에는 소리가 안 난다.
  // 예전엔 MissionPlayer 의 첫 탭에서만 unlock 해 홈·로그인이 무음이었다.
  // 캡처 단계로 듣되 아무것도 삼키지 않는다(히든 메뉴 제스처와 같은 방식).
  useEffect(() => {
    const onDown = () => audio.unlock();
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);
```

- [ ] **Step 5: 타입체크·린트·테스트**

Run: `npm run build && npm run lint && npm test`
Expected: 전부 통과. `player/audio` 를 가리키는 import 가 남아 있으면 `tsc -b` 가 잡는다.

- [ ] **Step 6: 브라우저 회귀 확인 (필수)**

Run: `npm run dev`

미션에 진입해(히든 메뉴 `Ctrl+Alt+J` 또는 `#/planet/1?m=1`) **기존 미션 사운드가 전과 똑같이 나는지** 듣는다. 탭·선택·정답/오답·스테이지 전환이 모두 예전대로여야 한다. 이 태스크는 소리를 늘리지 않는다 — 달라진 게 들리면 배선이 틀린 것이다.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(audio): AudioManager를 lib 전역 싱글턴으로 승격

미션이 마운트돼야 오디오가 생기고 unlock도 미션 첫 탭에서만 걸려
홈·로그인이 무음이었다. App이 첫 제스처에서 unlock하고 모든 씬이 공유한다.
미션 사운드 호출 24군데는 그대로 두고 인스턴스 출처만 교체."
```

---

### Task 2: 말풍선 타자기 blip

스펙에서 체감이 가장 큰 항목이자 **튜닝이 가장 필요한 부분**이다.

**Files:**
- Create: `src/lib/typeSound.ts`
- Create: `src/lib/typeSound.test.ts`
- Modify: `src/lib/audio.ts` (`SOUNDS`에 `blipHati`/`blipFriend` 추가)
- Modify: `src/scenes/planet/player/MissionPlayer.tsx:408-428`(`typeInto`), `:541`(호출부)

**Interfaces:**
- Consumes: Task 1의 `audio` 싱글턴
- Produces: `src/lib/typeSound.ts`가 `export type Speaker = "hati" | "friend"`, `export function isSpeakingChar(ch: string): boolean`, `export function blipAt(text: string, index: number): boolean`, `export function blipSound(speaker: Speaker): "blipHati" | "blipFriend"` 를 export

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `src/lib/typeSound.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isSpeakingChar, blipAt, blipSound } from "./typeSound";

describe("isSpeakingChar", () => {
  it("공백·문장부호는 말하는 글자가 아니다", () => {
    for (const ch of [" ", "\n", ".", ",", "!", "?", "…", "~", "-", "(", ")"]) {
      expect(isSpeakingChar(ch)).toBe(false);
    }
  });

  it("한글·영문·숫자는 말하는 글자다", () => {
    for (const ch of ["가", "힣", "a", "Z", "7"]) {
      expect(isSpeakingChar(ch)).toBe(true);
    }
  });
});

describe("blipAt", () => {
  it("말하는 글자 3개마다 한 번만 울린다", () => {
    const t = "가나다라마바사";
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => blipAt(t, i))).toEqual([
      true, false, false, true, false, false, true,
    ]);
  });

  it("첫 글자에서 바로 울린다 (대사 시작이 들려야 한다)", () => {
    expect(blipAt("안녕", 0)).toBe(true);
  });

  it("공백·문장부호에서는 절대 울리지 않는다", () => {
    const t = "가 나.다";
    expect(blipAt(t, 1)).toBe(false); // " "
    expect(blipAt(t, 3)).toBe(false); // "."
  });

  it("공백·문장부호는 세지 않으므로 리듬이 유지된다", () => {
    // "가"(1) " " "나"(2) "." "다"(3) → "다"에서 다시 울린다
    expect(blipAt("가 나.다", 4)).toBe(true);
  });

  it("범위를 벗어난 인덱스는 false", () => {
    expect(blipAt("가", 5)).toBe(false);
    expect(blipAt("", 0)).toBe(false);
  });
});

describe("blipSound", () => {
  it("화자에 따라 다른 소리를 고른다", () => {
    expect(blipSound("hati")).toBe("blipHati");
    expect(blipSound("friend")).toBe("blipFriend");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/lib/typeSound.test.ts`
Expected: FAIL — `Failed to resolve import "./typeSound"`

- [ ] **Step 3: 최소 구현**

Create `src/lib/typeSound.ts`:

```ts
/* 말풍선 타자기 blip 의 "언제 울릴지" 순수 로직.
 *
 * MissionPlayer 의 typeInto 는 30ms 마다 한 글자씩 찍는다 = 초당 33회.
 * 매 글자마다 소리를 내면 서로 겹쳐 톱질 소음이 되므로 세 글자마다 한 번만 울린다.
 * 공백·문장부호를 세지 않고 건너뛰면 말의 리듬에 가까워진다. */

export type Speaker = "hati" | "friend";

const BLIP_EVERY = 3;
const SILENT_CHAR = /[\s.,!?…·'"“”‘’\-—~()[\]{}:;]/;

export function isSpeakingChar(ch: string): boolean {
  return !SILENT_CHAR.test(ch);
}

/** text[index] 를 찍는 순간 blip 을 울릴지. 말하는 글자만 세어 BLIP_EVERY 번째마다 true. */
export function blipAt(text: string, index: number): boolean {
  const ch = text[index];
  if (ch === undefined || !isSpeakingChar(ch)) return false;
  // 대사가 짧아(수십 자) 매 글자 세도 비용이 무시할 수준이다.
  let n = 0;
  for (let i = 0; i <= index; i++) if (isSpeakingChar(text[i])) n++;
  return n % BLIP_EVERY === 1; // 1,4,7… → 첫 글자부터 울린다
}

export function blipSound(speaker: Speaker): "blipHati" | "blipFriend" {
  return speaker === "hati" ? "blipHati" : "blipFriend";
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/lib/typeSound.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: blip 소리 2종 추가**

`src/lib/audio.ts`의 `SOUNDS` 객체에 추가한다. **gain 0.04는 기존 `tap`(0.11)의 약 1/3**이며, 초당 10회 울려도 거슬리지 않게 하는 값이다. 화자 구분은 주파수만 다르다.

```ts
  // 말풍선 타자기. 초당 ~10회 울리므로 기존 tap(gain 0.11)의 1/3 세기에 훨씬 짧다.
  // 하티(가이드)는 낮고 차분하게, 친구(감정을 말하는 외계인)는 조금 높게.
  blipHati: (a) => a.tone({ freq: 320, type: "sine", dur: 0.025, gain: 0.04, release: 0.02 }),
  blipFriend: (a) => a.tone({ freq: 480, type: "sine", dur: 0.025, gain: 0.04, release: 0.02 }),
```

- [ ] **Step 6: typeInto에 배선**

`src/scenes/planet/player/MissionPlayer.tsx` import에 추가:

```ts
import { blipAt, blipSound, type Speaker } from "../../../lib/typeSound";
```

`:408`의 `typeInto`를 speaker 를 받도록 바꾸고 blip 을 울린다:

```ts
    const typeInto = (txt: string, speaker: Speaker, onDone: () => void) => {
      vm.text = "";
      vm.mode = "typing";
      render();
      let i = 0;
      window.clearInterval(timers.typer);
      timers.typer = window.setInterval(() => {
        const at = i; // 이번에 새로 찍히는 글자의 인덱스(증가 전)
        vm.text = txt.slice(0, ++i);
        render();
        if (blipAt(txt, at)) audio.play(blipSound(speaker));
        if (i >= txt.length) {
          window.clearInterval(timers.typer);
          onDone();
        }
      }, 30);
      timers.finish = () => {
        window.clearInterval(timers.typer);
        vm.text = txt;
        render();
        onDone();
      };
    };
```

**`timers.finish`(탭으로 타이핑 건너뛰기)에는 blip 을 넣지 않는다** — 남은 글자가 한꺼번에 찍히므로 소리를 내면 수십 개가 동시에 터진다.

`:541`의 호출부를 고친다. 같은 `showLine` 안 `:530`에 `const isHati = node.speaker === "hati";` 가 이미 있으므로 그대로 쓴다:

```ts
          typeInto(node.text || "", isHati ? "hati" : "friend", () => {
```

- [ ] **Step 7: 타입체크·테스트**

Run: `npm run build && npm test`
Expected: 전부 통과

- [ ] **Step 8: 브라우저 청취 확인 (필수 — 이 태스크의 핵심)**

Run: `npm run dev` → 미션 진입(`#/planet/1?m=1`)

다음을 **직접 듣고** 확인한다:
- 겹침·톱질 소음이 **없다**
- 하티와 친구의 음이 **구분된다**
- 긴 대사에서 거슬리지 않는다
- 타이핑 중 화면을 탭해 건너뛰면 blip 이 무더기로 터지지 않는다

거슬리면 `BLIP_EVERY`(3→4)나 gain(0.04→0.03)을 조정한다. **튜닝이 이 태스크의 일이다** — 숫자를 그대로 두고 넘어가지 않는다.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat(audio): 말풍선 타자기 blip (하티/친구 2음색)

typeInto가 30ms마다 글자를 찍어 초당 33회 — 매 글자 소리를 내면 겹친다.
말하는 글자 3개마다 한 번, 공백·문장부호는 건너뛴다. gain은 tap의 1/3.
탭으로 건너뛸 때는 울리지 않는다(남은 글자가 한꺼번에 찍히므로)."
```

---

### Task 3: 씬 전환 whoosh

한 곳만 고쳐 홈→행성, 행성→홈, 로그인→홈을 전부 커버한다.

**Files:**
- Modify: `src/lib/sceneTransition.tsx:26-40`

**Interfaces:**
- Consumes: Task 1의 `audio` 싱글턴
- Produces: 없음 (동작 변경만)

- [ ] **Step 1: whoosh 배선**

`src/lib/sceneTransition.tsx` import에 추가:

```ts
import { audio } from "./audio";
```

`fadeNav` 안, `setFading(true)` 바로 앞에 넣는다. 페이드 시작과 동시에 울려야 화면 전환과 맞는다:

```ts
    (to) => {
      if (busy.current) return;
      busy.current = true;
      audio.play("whoosh"); // 페이드 시작과 동시에 — 전환음이 화면보다 늦으면 어긋나 들린다
      setFading(true); // 0 → 1 (fade to black)
```

`busy.current` 가드 **뒤**에 두는 것이 중요하다 — 앞에 두면 전환 중 연타에 소리만 중복된다.

- [ ] **Step 2: 타입체크**

Run: `npm run build`
Expected: 통과

- [ ] **Step 3: 브라우저 청취 확인 (필수)**

Run: `npm run dev`

로그인→홈, 홈→행성, 행성→홈을 오가며 확인한다:
- 전환음이 페이드(`FADE_MS = 160`)와 **타이밍이 맞는다**
- 행성 버튼을 연타해도 소리가 겹치지 않는다

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(audio): 씬 전환에 whoosh

useFadeNav 한 곳만 고치면 홈→행성, 행성→홈, 로그인→홈이 모두 커버된다.
busy 가드 뒤에 둬 전환 중 연타에도 소리가 겹치지 않는다."
```

---

### Task 4: 전역 버튼 효과음 (`data-sfx`)

미션 UI는 전부 `#stage`(`MissionPlayer.tsx:1080`) 안에 있으므로 `closest("#stage")`로 제외하면 기존 미션 사운드와 겹치지 않는다. 덕분에 버튼이 있는 컴포넌트 13개를 각각 고치지 않고 **리스너 하나**로 끝난다.

**Files:**
- Create: `src/lib/uiSfx.ts`
- Create: `src/lib/uiSfx.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/scenes/home/components/MenuBar.tsx:23-32`
- Modify: `src/scenes/home/components/PlanetButton.tsx:32-38`
- Modify: `src/scenes/home/index.tsx:59-70`

**Interfaces:**
- Consumes: Task 1의 `audio` 싱글턴
- Produces: `src/lib/uiSfx.ts`가 `export type UiSfx = "tap" | "pop" | null`, `export function sfxNameFor(dataSfx: string | undefined): UiSfx` 를 export

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Create `src/lib/uiSfx.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sfxNameFor } from "./uiSfx";

describe("sfxNameFor", () => {
  it("속성이 없으면 기본은 tap", () => {
    expect(sfxNameFor(undefined)).toBe("tap");
  });

  it('data-sfx="pop"이면 pop', () => {
    expect(sfxNameFor("pop")).toBe("pop");
  });

  it('data-sfx="none"이면 소리 없음', () => {
    expect(sfxNameFor("none")).toBeNull();
  });

  it("모르는 값이면 기본 tap으로 떨어진다 (오타가 무음이 되면 안 된다)", () => {
    expect(sfxNameFor("popp")).toBe("tap");
    expect(sfxNameFor("")).toBe("tap");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/lib/uiSfx.test.ts`
Expected: FAIL — `Failed to resolve import "./uiSfx"`

- [ ] **Step 3: 최소 구현**

Create `src/lib/uiSfx.ts`:

```ts
/* 버튼 효과음을 data-sfx 속성으로 선언한다.
 *
 *   <button>              → tap  (기본)
 *   <button data-sfx="pop">  → pop  (팝업 열기)
 *   <button data-sfx="none"> → 무음 (씬 전환음이 이미 울리는 버튼)
 *
 * App 의 리스너 하나가 이 속성을 읽는다. 버튼이 있는 컴포넌트를 각각 고치는 대신
 * 예외인 곳에만 속성을 붙인다. */

export type UiSfx = "tap" | "pop" | null;

export function sfxNameFor(dataSfx: string | undefined): UiSfx {
  if (dataSfx === "none") return null;
  if (dataSfx === "pop") return "pop";
  return "tap"; // 오타가 무음으로 새지 않게 기본으로 떨어뜨린다
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/lib/uiSfx.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: App의 전역 리스너에 버튼 효과음 합치기**

Task 1에서 만든 unlock `useEffect`를 확장한다. **unlock 이 먼저**여야 같은 탭에서 소리가 난다(`play()`는 `_unlocked`가 false면 그냥 리턴한다).

`src/App.tsx` import에 추가:

```ts
import { sfxNameFor } from "./lib/uiSfx";
```

Task 1의 `useEffect`를 다음으로 교체:

```tsx
  // 전역 오디오 훅 하나가 두 가지를 한다:
  //  1) 첫 제스처에서 unlock (브라우저 자동재생 정책)
  //  2) 버튼 효과음 — data-sfx 속성으로 선언(uiSfx.ts 참조)
  // 캡처 단계로 듣되 아무것도 삼키지 않는다(히든 메뉴 제스처와 같은 방식).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      audio.unlock(); // play() 보다 먼저 — 첫 탭부터 소리가 나야 한다

      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.("button");
      if (!btn) return;
      // 미션 UI(#stage)는 자체 사운드가 이미 배치돼 있다 — 겹치면 안 된다.
      if (btn.closest("#stage")) return;
      if ((btn as HTMLButtonElement).disabled) return;

      const name = sfxNameFor(btn.dataset.sfx);
      if (name) audio.play(name);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);
```

- [ ] **Step 6: 팝업 열기 버튼에 `data-sfx="pop"`**

`src/scenes/home/components/MenuBar.tsx`의 `<button>`에 속성 추가:

```tsx
        <button
          key={it.key}
          type="button"
          className="home-menu__btn"
          data-sfx="pop"
          onClick={() => onOpen(it.key)}
          aria-label={it.label}
        >
```

`src/scenes/home/index.tsx:59`의 학습 목표 버튼에도:

```tsx
      <button
        type="button"
        className="home-goal"
        data-sfx="pop"
        style={{ backgroundImage: `url(${goalPlate})` }}
        onClick={() => setPopup("goal")}
      >
```

- [ ] **Step 7: 행성 버튼에 `data-sfx="none"`**

행성 버튼은 `useFadeNav`로 이동해 Task 3의 `whoosh`가 이미 울린다. `tap`까지 나면 두 소리가 겹친다.

`src/scenes/home/components/PlanetButton.tsx`:

```tsx
    <button
      type="button"
      className={`home-planet home-planet--${status}`}
      data-sfx="none" /* 전환음(whoosh)이 이미 울린다 — 겹치면 안 된다 */
      disabled={!playable}
      onClick={() => playable && onPlay(id)}
      aria-label={PLANET_NAMES[id - 1]}
    >
```

잠긴 행성은 `disabled`라 애초에 이벤트가 오지 않는다(스펙: 의도적으로 무음).

- [ ] **Step 8: 타입체크·린트·테스트**

Run: `npm run build && npm run lint && npm test`
Expected: 전부 통과

- [ ] **Step 9: 브라우저 청취 확인 (필수)**

Run: `npm run dev`

- 로그인 화면: 버튼·학교 선택에서 `tap` 이 난다
- 홈: 메뉴바 4개 버튼과 학습 목표에서 `pop` 이 난다
- 홈: 팝업의 ✕(공용 `Modal`)에서 `tap` 이 난다
- 홈: **잠긴 행성은 무음**, 열린 행성은 `whoosh` 하나만 (tap 이 겹치지 않는다)
- **미션 안: 소리가 예전과 똑같다** — 카드 선택에 `select` 만 나고 `tap` 이 덧나지 않는다 (`#stage` 제외가 동작하는지 확인하는 항목이다)

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat(audio): 전역 버튼 효과음 (data-sfx 선언 방식)

미션 UI는 전부 #stage 안에 있어 closest('#stage')로 제외하면 기존 미션
사운드와 겹치지 않는다. 덕분에 버튼 컴포넌트 13개를 각각 고치지 않고
리스너 하나로 끝난다. 예외만 data-sfx로 선언(pop=팝업 열기, none=전환음 중복)."
```

---

### Task 5: 로그인 성공 / 실패

**Files:**
- Modify: `src/scenes/auth/index.tsx:118-134`(`handleLogin`), `:96-114`(`handleSignup`)

**Interfaces:**
- Consumes: Task 1의 `audio` 싱글턴
- Produces: 없음

- [ ] **Step 1: 배선**

`src/scenes/auth/index.tsx` import에 추가:

```ts
import { audio } from "../../lib/audio";
```

`handleLogin`에서 성공은 `title`, 실패는 `wrong`:

```ts
  async function handleLogin(creds: Credentials) {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const profile = await verify(creds); // 성공 시 자격증명 저장(api 레이어)
      audio.play("title");
      setWelcomeName(profile.name);
      setSubmitting(false);
      setScreen("welcome");
    } catch (err) {
      audio.play("wrong");
      setErrorMsg(
        classifyVerifyError(err) === "auth"
          ? "번호나 비밀번호가 맞지 않아요. 선생님께 물어보세요."
          : "인터넷 연결을 확인해 주세요.",
      );
      setSubmitting(false);
    }
  }
```

`handleSignup`도 같은 결로 — `setScreen("welcome")` 앞에 `audio.play("title")`, `catch` 첫 줄에 `audio.play("wrong")`:

```ts
    try {
      await signup({ ...creds, name, gender }); // 가입
      const profile = await verify(creds); // 같은 값으로 자동 로그인(자격증명 저장) + 이름 확인
      audio.play("title");
      setWelcomeName(profile.name);
      setSubmitting(false);
      setScreen("welcome"); // 로그인과 동일하게 welcome을 거쳐 '계속하기'로 Home
    } catch (err) {
      audio.play("wrong");
      setErrorMsg(
```

`handleContinue`(자동로그인 이어하기)에는 넣지 않는다 — 성공하면 곧바로 `nav("/home")`이라 Task 3의 `whoosh`와 겹친다.

- [ ] **Step 2: 타입체크**

Run: `npm run build`
Expected: 통과

- [ ] **Step 3: 브라우저 청취 확인 (필수)**

Run: `npm run dev`

`.env.local`의 `HG_TEST_*` 계정으로 로그인한다.
- 맞는 비밀번호 → `title`(상승 4음)이 난다
- 틀린 비밀번호 → `wrong`(하강음)이 나고 에러 문구와 타이밍이 맞는다

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat(audio): 로그인 성공/실패 효과음

성공·실패를 지금은 텍스트로만 알린다. 소리가 붙으면 아이가 더 빨리 알아챈다.
handleContinue는 곧바로 nav('/home')이라 전환음과 겹쳐 제외."
```

---

### Task 6: 합성 앰비언스

BGM 은 **어울리는 음원을 찾지 못해** 꺼져 있다. 멜로디 없는 저음 패드는 "어울리는가" 판단 자체가 필요 없으므로 그 막힌 지점을 우회한다.

**Files:**
- Create: `src/lib/zone.ts`
- Create: `src/lib/zone.test.ts`
- Create: `src/lib/Ambience.tsx`
- Modify: `src/lib/audio.ts` (패드 메서드 추가)
- Modify: `src/lib/bgm.tsx:30-36` (`zoneForPath`를 `zone.ts`에서 import)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `audio` 싱글턴
- Produces:
  - `src/lib/zone.ts`: `export type Zone = "hub" | "planet" | "silent"`, `export function zoneForPath(pathname: string): Zone`
  - `src/lib/audio.ts`: `audio.startPad(freqs: number[]): void`, `audio.stopPad(): void`
  - `src/lib/Ambience.tsx`: `export default function Ambience(): null`

- [ ] **Step 1: zone 로직의 실패하는 테스트를 쓴다**

Create `src/lib/zone.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { zoneForPath } from "./zone";

describe("zoneForPath", () => {
  it("로그인·홈은 hub", () => {
    expect(zoneForPath("/auth")).toBe("hub");
    expect(zoneForPath("/home")).toBe("hub");
  });

  it("행성은 planet", () => {
    expect(zoneForPath("/planet/1")).toBe("planet");
    expect(zoneForPath("/planet/4")).toBe("planet");
  });

  it("인트로·아웃트로는 silent (동영상 자체 사운드가 있다)", () => {
    expect(zoneForPath("/intro")).toBe("silent");
    expect(zoneForPath("/outro")).toBe("silent");
  });

  it("모르는 경로는 silent", () => {
    expect(zoneForPath("/")).toBe("silent");
    expect(zoneForPath("/nope")).toBe("silent");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/lib/zone.test.ts`
Expected: FAIL — `Failed to resolve import "./zone"`

- [ ] **Step 3: zone.ts 구현 (bgm.tsx에서 추출)**

Create `src/lib/zone.ts` — `bgm.tsx:30-36`의 로직을 그대로 옮긴다:

```ts
/* 경로 → 사운드 "존". bgm 과 앰비언스가 공유한다.
 *
 *  hub    (/auth, /home)      : 허브
 *  planet (/planet/*)         : 행성·미션
 *  silent (/intro, /outro, 그 외) : 무음 — 동영상은 자체 사운드가 있다 */

export type Zone = "hub" | "planet" | "silent";

export function zoneForPath(pathname: string): Zone {
  if (pathname.startsWith("/planet")) return "planet";
  if (pathname === "/auth" || pathname === "/home") return "hub";
  return "silent";
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/lib/zone.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: bgm.tsx가 zone.ts를 쓰도록 교체**

`src/lib/bgm.tsx`에서 지역 `type Zone`과 `function zoneForPath`(`:30-36`)를 **삭제**하고 import 로 바꾼다:

```ts
import { zoneForPath, type Zone } from "./zone";
```

`bgm.tsx`의 나머지는 건드리지 않는다. **`BGM_ENABLED`는 `false` 그대로 둔다.**

- [ ] **Step 6: AudioManager에 패드 추가**

`src/lib/audio.ts`의 `AudioManager` 클래스 안(`play` 메서드 아래)에 추가한다:

```ts
  private padNodes: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode }[] = [];

  /* 앰비언스 패드: 멜로디 없는 저음이 아주 느리게 뜨고 진다.
   * BGM 은 어울리는 음원을 못 찾아 꺼져 있다 — 패드는 곡이 아니라 공간감이라
   * "어울리는가" 판단이 필요 없고, 오래 들어도 질리지 않는다.
   * master gain 을 거치므로 음소거(hg_muted)에 함께 따른다. */
  startPad(freqs: number[]) {
    this._ensure();
    if (!this.ctx || !this.master) return;
    this.stopPad();
    const t0 = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      // 아주 조용하게 — 효과음(gain 0.11~0.16) 밑에 깔려야 한다.
      gain.gain.value = 0.0001;
      gain.gain.linearRampToValueAtTime(0.03, t0 + 3); // 3초에 걸쳐 서서히 든다
      // 느린 LFO(0.05~0.08Hz = 12~20초 주기)로 뜨고 지게 만든다.
      lfo.frequency.value = 0.05 + i * 0.015;
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain).connect(this.master!);
      osc.start(t0);
      lfo.start(t0);
      this.padNodes.push({ osc, lfo, gain });
    });
  }

  stopPad() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.padNodes.forEach(({ osc, lfo, gain }) => {
      gain.gain.cancelScheduledValues(t0);
      gain.gain.setValueAtTime(gain.gain.value, t0);
      gain.gain.linearRampToValueAtTime(0.0001, t0 + 1.5); // 뚝 끊기지 않게
      osc.stop(t0 + 1.6);
      lfo.stop(t0 + 1.6);
    });
    this.padNodes = [];
  }
```

- [ ] **Step 7: Ambience 프로바이더**

Create `src/lib/Ambience.tsx`:

```tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { audio } from "./audio";
import { zoneForPath } from "./zone";

// 존에 따라 합성 앰비언스 패드를 켜고 끈다. BgmProvider 와 같은 결로 <Routes> 바깥에 산다.
//
// 마음에 들지 않으면 이 상수 하나만 false 로 바꾼다 — BGM_ENABLED 와 같은 방식.
const AMBIENCE_ENABLED = true;

// 존별로 기본 주파수만 다르다. 멜로디가 아니라 공간감이라 화음까지 갈 필요가 없다.
const PAD: Record<string, number[]> = {
  hub: [110, 164.81], // A2 + E3 — 허브는 차분하게
  planet: [98, 146.83], // G2 + D3 — 행성은 조금 더 낮고 넓게
};

export default function Ambience(): null {
  const { pathname } = useLocation();
  const zone = zoneForPath(pathname);

  useEffect(() => {
    if (!AMBIENCE_ENABLED) return;
    const freqs = PAD[zone];
    if (freqs) audio.startPad(freqs);
    else audio.stopPad(); // silent 존(인트로·아웃트로) — 동영상 자체 사운드를 방해하지 않는다
    return () => audio.stopPad();
  }, [zone]);

  return null;
}
```

- [ ] **Step 8: App에 붙이기**

`src/App.tsx` import에 추가:

```ts
import Ambience from "./lib/Ambience";
```

`<BgmProvider>` 안, `<HiddenMenu />` 옆에 둔다:

```tsx
        <HiddenMenu />
        {/* 합성 앰비언스. Routes 바깥 = 씬이 바뀌어도 이어진다. */}
        <Ambience />
```

- [ ] **Step 9: 타입체크·린트·테스트**

Run: `npm run build && npm run lint && npm test`
Expected: 전부 통과

- [ ] **Step 10: 브라우저 청취 확인 (필수)**

Run: `npm run dev`

- 로그인·홈에서 **아주 조용한** 패드가 깔린다 (효과음을 덮지 않는다)
- 행성으로 가면 패드가 바뀐다 (뚝 끊기지 않는다)
- 인트로·아웃트로 동영상에서는 패드가 **없다**
- 미션 대사·문제 푸는 중에 **집중을 방해하지 않는다** — 방해되면 `gain` 0.03을 낮춘다
- `AMBIENCE_ENABLED = false`로 바꾸면 **패드만 사라지고 효과음은 정상**임을 확인한 뒤 `true`로 되돌린다

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "feat(audio): 합성 앰비언스 패드 (hub/planet)

BGM은 어울리는 음원을 못 찾아 꺼져 있다. 멜로디 없는 저음 패드는
'어울리는가' 판단이 필요 없어 그 막힌 지점을 우회한다. 음원 없이 합성이라
APK도 0바이트. AMBIENCE_ENABLED 한 줄로 되돌릴 수 있다.
zoneForPath는 bgm.tsx에서 zone.ts로 추출해 공유."
```

---

### Task 7: 전역 음소거 버튼

`toggleMute()`는 원래 있었지만 **어디에서도 호출되지 않았다**. 교실에서 태블릿 여러 대가 동시에 소리 내는 상황에 필요하다.

**Files:**
- Create: `src/lib/MuteButton.tsx`
- Create: `src/lib/mute-button.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `audio` 싱글턴 (`audio.muted`, `audio.toggleMute()`)
- Produces: `src/lib/MuteButton.tsx`가 `export default function MuteButton()` 를 export

- [ ] **Step 1: 버튼 컴포넌트**

Create `src/lib/MuteButton.tsx`:

```tsx
import { useState } from "react";
import { audio } from "./audio";
import "./mute-button.css";

// 전역 음소거 토글. HiddenMenu 와 같은 자리(<Routes> 바깥)에 살아 어느 씬에서도 뜬다.
// FixedStage 안이 아니라 App 레벨이므로 미션(player/, 자체 무대)에서도 동작한다.
//
// 좌상단에 두지 않는다 — useCornerLongPress 의 히든 메뉴 진입 제스처가 좌상단
// 200×200 을 쓴다. 교사용 히든 제스처 자리에 아이가 반복해 누르는 버튼을 겹치지 않는다.
//
// data-sfx="none": 음소거를 켜는 순간 tap 이 나면 앞뒤가 안 맞는다.
export default function MuteButton() {
  const [muted, setMuted] = useState(() => audio.muted);
  return (
    <button
      type="button"
      className="mute-btn"
      data-sfx="none"
      onClick={() => setMuted(audio.toggleMute())}
      aria-label={muted ? "소리 켜기" : "소리 끄기"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
```

- [ ] **Step 2: 스타일**

Create `src/lib/mute-button.css`:

`position: fixed` + 우상단. **`vw`/`vh`를 쓰지 않는다**(CLAUDE.md — letterbox 시 깨진다). `z-index`는 히든 메뉴·전환 오버레이(10000)보다 낮게 둬 그것들을 가리지 않는다.

```css
/* 전역 음소거 버튼 — 우상단. 좌상단은 히든 메뉴 진입 제스처(200×200)가 쓴다. */
.mute-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9000; /* 전환 오버레이(10000)·히든 메뉴보다 아래 */
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.5; /* 아이의 주의를 끌지 않게 — 필요할 때만 보이면 된다 */
}

.mute-btn:hover,
.mute-btn:focus-visible {
  opacity: 1;
}
```

- [ ] **Step 3: App에 붙이기**

`src/App.tsx` import에 추가:

```ts
import MuteButton from "./lib/MuteButton";
```

`<Ambience />` 옆에 둔다:

```tsx
        <Ambience />
        {/* 전역 음소거. Routes 바깥 = 어느 씬에서도 누를 수 있다(미션 포함). */}
        <MuteButton />
```

- [ ] **Step 4: 타입체크·린트·테스트**

Run: `npm run build && npm run lint && npm test`
Expected: 전부 통과

- [ ] **Step 5: 브라우저 확인 (필수)**

Run: `npm run dev`

- 로그인·홈·**미션**에서 버튼이 보인다
- 각 씬의 기존 UI를 가리지 않는다 (홈 타이틀 배너, 미션 UI와 겹치는지 확인)
- 누르면 **효과음·앰비언스·타자기가 모두** 무음이 된다
- 새로고침해도 음소거가 유지된다 (`hg_muted`)
- **좌상단 히든 메뉴 제스처가 여전히 동작한다** (`Ctrl+Alt+J` 말고 실제 두 손가락 롱프레스로 확인)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(audio): 전역 음소거 버튼

toggleMute()는 있었지만 호출하는 UI가 없었다. 교실에서 태블릿 여러 대가
동시에 소리 내는 상황에 필요하다. HiddenMenu와 같은 자리(Routes 바깥)라
미션에서도 눌린다. 좌상단은 히든 메뉴 제스처(200×200)가 써서 우상단."
```

---

### Task 8: 최종 통합 검증

**Files:** 없음 (검증만)

**Interfaces:**
- Consumes: Task 1~7 전부
- Produces: 없음

- [ ] **Step 1: 전체 자동 검증**

Run: `npm run build && npm run lint && npm test`
Expected: 전부 통과. `tsc -b`가 `player/audio` 잔재 import를 잡는다.

- [ ] **Step 2: 스펙 검증 항목 전부 청취 (필수)**

Run: `npm run dev`

스펙 `## 검증` 절을 한 항목씩 짚는다. 인트로 → 로그인 → 홈 → 행성 → 미션 → 홈 전체를 한 번에 훑으며:

- [ ] 미션 사운드 24군데가 전과 동일 (회귀 없음)
- [ ] 로그인 화면 첫 탭에서 unlock (첫 소리가 들린다)
- [ ] 씬 전환음이 페이드(160ms)와 맞는다
- [ ] 타자기: 겹침 없고, 하티/친구가 구분되고, 긴 대사에 거슬리지 않는다
- [ ] 음소거: 모든 씬에서 보이고 UI를 안 가리며, SFX·앰비언스·타자기가 다 꺼지고, 재시작 후 유지
- [ ] 음소거 버튼이 좌상단 히든 메뉴 제스처를 방해하지 않는다
- [ ] `AMBIENCE_ENABLED = false` → 앰비언스만 사라지고 SFX는 정상 (확인 후 `true` 복구)

- [ ] **Step 3: 사운드가 없어야 할 곳 확인**

- [ ] 인트로·아웃트로 동영상: 앰비언스·효과음 없음 (동영상 자체 사운드만)
- [ ] 잠긴 행성 탭: 무음
- [ ] 열린 행성 탭: `whoosh` 하나만 (`tap` 이 겹치지 않는다)

- [ ] **Step 4: PR**

```bash
git push -u origin feat/sound-design
gh pr create --title "feat(audio): 전역 사운드 — 버튼 효과음·타자기 blip·합성 앰비언스·음소거" --body "$(cat <<'EOF'
## 요약

효과음 엔진이 미션 안에만 갇혀 있어 로그인·홈·행성·씬 전환이 전부 무음이었다.
`AudioManager`를 `src/lib/`로 올려 전역 싱글턴으로 만들고, 소리가 없던 구간을 채웠다.

스펙: `docs/superpowers/specs/2026-07-17-sound-design-design.md`
계획: `docs/superpowers/plans/2026-07-17-sound-design.md`

## 변경

- **전역 싱글턴** — App 첫 제스처에서 unlock. 미션 사운드 24군데는 출처만 교체(회귀 없음)
- **버튼 효과음** — 미션 UI가 전부 `#stage` 안이라 `closest("#stage")`로 제외하면 리스너 하나로 앱 전체가 커버된다. 예외만 `data-sfx`로 선언(`pop`=팝업, `none`=전환음 중복)
- **씬 전환 whoosh** — `useFadeNav` 한 곳
- **말풍선 타자기 blip** — 하티/친구 2음색. 30ms×33회/초라 3글자마다 한 번, 공백·문장부호 건너뜀, gain은 tap의 1/3
- **합성 앰비언스** — BGM은 어울리는 음원을 못 찾아 꺼둔 상태다. 멜로디 없는 패드는 "어울리는가" 판단이 필요 없어 그 지점을 우회한다. `AMBIENCE_ENABLED` 한 줄로 되돌릴 수 있다
- **전역 음소거 버튼** — `toggleMute()`는 있었지만 호출하는 UI가 없었다

## 유지한 것

- `BGM_ENABLED = false` 그대로
- 오디오 에셋 파일 0개 — 전부 오실레이터 합성이라 **APK 크기 변화 없음**
- 기존 미션 사운드 24군데 무변경

## 검증

`npm run build && npm run lint && npm test` 통과 + 브라우저 전체 흐름 청취 확인
(소리는 자동화 테스트로 판단할 수 없어 인트로→로그인→홈→행성→미션을 직접 들었다).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**

| 스펙 요구 | 태스크 |
|---|---|
| AudioManager 싱글턴 승격 + 전역 unlock | 1 |
| 미션 24군데 무변경 | 1 (Step 3, Step 6 회귀 확인) |
| 씬 전환 `whoosh` | 3 |
| 로그인 `tap`/`title`/`wrong` | 4(tap), 5(title·wrong) |
| 홈 팝업 열기 `pop` / 닫기 `tap` | 4 (`data-sfx="pop"`, Modal ✕는 기본 tap) |
| 잠긴 행성 무음 | 4 (`disabled`라 이벤트 없음) |
| 프롤로그 무음 | 해당 태스크 없음 — 스펙이 "소리 없음"이므로 정상 |
| 타자기 blip (throttle·건너뛰기·gain 0.04) | 2 |
| 하티/친구 2음색 | 2 |
| `typeInto`에만 적용 | 2 (다른 두 타자기 미변경) |
| 합성 앰비언스 + `AMBIENCE_ENABLED` | 6 |
| 음소거 버튼 (좌상단 금지) | 7 |
| `BGM_ENABLED = false` 유지 | 6 (Step 5에 명시) |
| 에셋 0개 | 전 태스크 (Global Constraints) |

**Type consistency:** `blipAt`/`blipSound`/`Speaker`(Task 2), `sfxNameFor`/`UiSfx`(Task 4), `zoneForPath`/`Zone`(Task 6), `startPad`/`stopPad`(Task 6)가 정의부와 사용부에서 이름·시그니처가 일치한다. `blipSound`의 반환값 `"blipHati"`/`"blipFriend"`가 Task 2 Step 5의 `SOUNDS` 키와 일치한다.

**Placeholder scan:** 없음. 모든 코드 스텝에 실제 코드가 들어 있다.
