# 공감 거울 긁어서 드러내기(reveal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `m3_mirror3`에서 공감 거울을 잡고 *공감받지 못하는* 이미지 2장 위를 문지르면 아래의 *공감받는* 이미지가 드러나고, 둘 다 드러나면 다음 노드로 진행하는 인터랙션을 만든다.

**Architecture:** 기존 특수 인터랙션 패턴(`mirrors`/`gauge` = 노드 타입 + `RunnerView` 메서드 + 전용 컴포넌트)을 따른다. 새 노드 타입 `reveal` + `RunnerView.showReveal` + 전용 컴포넌트 `RubReveal.tsx`. 각 이미지 슬롯은 아래 `<img>`(공감받는) 위에 `<canvas>`(공감받지 못하는)를 겹치고, 거울 렌즈 반경만큼 캔버스를 `destination-out`으로 지운다. 커버리지 그리드로 진행률을 재고 85%에서 자동완성한다.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest(러너 단위테스트), Canvas 2D, 기존 mission 엔진.

## Global Constraints

- 무대 내부 좌표계는 **1920×1200** 고정, CSS scale로 축소 표시. 포인터→무대 좌표 변환은 `scale = stageRect.width / 1920`.
- 이미지 4장 모두 **16:9**(공감받는 1672×941 / 공감받지 못하는 906×510·819×461). 슬롯 aspect-ratio는 `1672 / 941`.
- 완료 임계값 **threshold = 0.85**(이미지별), 렌즈 반경 = 거울 폭 × **0.30**.
- TypeScript strict — 작업 종료 시 `npx tsc --noEmit` 통과.
- `RunnerView`에 `showReveal`를 추가하면 **모든 구현체**(runner.test.ts의 인라인 view 2곳 + MissionPlayer)가 이를 가져야 컴파일된다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 브랜치: `feat/planet1-mission3` (이미 위치).

---

## File Structure

- `src/scenes/planet/engine/types.ts` — `reveal` 타입/필드(`pairs`,`threshold`), `RunnerView.showReveal`.
- `src/scenes/planet/engine/runner.ts` — `typeOf`에 reveal, `go()`에 reveal 분기.
- `src/scenes/planet/engine/runner.test.ts` — reveal 단위 테스트 + 기존 view에 `showReveal` 추가.
- `src/scenes/planet/player/RubReveal.tsx` — 신규. 캔버스 긁기 + 거울 드래그 + 진행률/완료/등장 연출.
- `src/scenes/planet/player/MissionPlayer.tsx` — `stage:"reveal"` 상태 + `showReveal` 구현 + `<RubReveal>` 마운트.
- `src/scenes/planet/player/mission.css` — reveal 슬롯/캔버스/거울/가이드/연출 스타일.
- `src/scenes/planet/planet1/mission03.json` — `m3_mirror3`를 reveal로 전환.
- `scenario-tools/visualize.py` — `reveal` 타입 그래프 표시.

---

## Task 1: 엔진 — `reveal` 노드 타입 + 러너 분기 + 단위 테스트

**Files:**
- Modify: `src/scenes/planet/engine/types.ts`
- Modify: `src/scenes/planet/engine/runner.ts`
- Test: `src/scenes/planet/engine/runner.test.ts`

**Interfaces:**
- Produces:
  - `MissionNode.type` 유니온에 `"reveal"` 추가.
  - `MissionNode.pairs?: { before: string; after: string }[]`, `MissionNode.threshold?: number` (기존 `mirrorImage?: string` 재사용).
  - `RunnerView.showReveal(node: MissionNode, done: () => void): void`.
  - 러너: reveal 노드 진입 시 `view.showReveal(node, () => advance(node))` 호출.

- [ ] **Step 1: 실패하는 테스트 추가** — `runner.test.ts`의 `describe` 블록 안에 아래 테스트를 추가한다.

```ts
  it("reveal 노드는 showReveal 를 호출하고 done 시 next 로 진행한다", async () => {
    const seq: string[] = [];
    const md: MissionData = {
      id: "t3",
      title: "t3",
      start: "rev",
      nodes: [
        {
          id: "rev",
          type: "reveal",
          pairs: [{ before: "b1.png", after: "a1.png" }],
          next: "fin",
        },
        { id: "fin", type: "line", speaker: "hati", text: "끝", next: null },
      ],
    };
    await new Promise<void>((resolve) => {
      const view: RunnerView = {
        reset() {},
        execCommands() {},
        showLine(node: MissionNode, onTyped: () => void) {
          seq.push("line:" + node.id);
          onTyped();
          return Promise.resolve();
        },
        showChoices() {},
        showMirrors(_n, done) {
          done();
        },
        showGauge(_n, done) {
          done();
        },
        showReveal(node: MissionNode, done: () => void) {
          seq.push("reveal:" + node.id);
          Promise.resolve().then(done);
        },
        end() {
          expect(seq).toEqual(["reveal:rev", "line:fin"]);
          resolve();
        },
      };
      new DialogueRunner(md, view).start();
    });
  });
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run src/scenes/planet/engine/runner.test.ts`
Expected: FAIL — 타입 에러(`showReveal` 없음 / `type:"reveal"` 불가) 또는 런타임에서 reveal 노드가 line 처리되어 `seq`가 `["line:rev","line:fin"]`로 어긋남.

- [ ] **Step 3: types.ts 수정** — `MissionNode.type` 유니온과 필드, `RunnerView`를 확장한다.

`type?: "line" | "choice" | "branch" | "mirrors" | "gauge";` → 를 아래로:

```ts
  type?: "line" | "choice" | "branch" | "mirrors" | "gauge" | "reveal";
```

`mirrorImage?: string;` 아래(같은 필드 그룹)에 추가:

```ts
  // type: "reveal" 전용 — 긁어서 드러내기 이미지 쌍(before=위 캔버스, after=아래 img)과 완료 임계값
  pairs?: { before: string; after: string }[];
  threshold?: number;
```

`RunnerView` 인터페이스에 `showGauge` 아래로 추가:

```ts
  showReveal(node: MissionNode, done: () => void): void;
```

- [ ] **Step 4: runner.ts 수정** — `typeOf` 반환 타입과 `go()` 분기를 확장한다.

`typeOf` 시그니처를:

```ts
  private typeOf(n: MissionNode): "line" | "choice" | "branch" | "mirrors" | "gauge" | "reveal" {
    return n.type || (n.choices ? "choice" : "line");
  }
```

`go()`의 `if (t === "gauge") {...}` 블록 **바로 아래**에 추가:

```ts
    if (t === "reveal") {
      this.view.showReveal(node, () => this.advance(node));
      return;
    }
```

- [ ] **Step 5: 기존 테스트 view 2곳에 `showReveal` 추가** — `runner.test.ts`의 `makeFakeView` 안 `view` 객체와, 두 번째 테스트의 인라인 `view` 객체 각각에 `showGauge` 옆으로 no-op을 추가한다(둘 다 `RunnerView` 타입이라 없으면 컴파일 실패).

`makeFakeView` 내부:

```ts
    showGauge(_node, done) {
      done();
    },
    showReveal(_node, done) {
      done();
    },
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/scenes/planet/engine/runner.test.ts`
Expected: PASS (3 tests). 이어서 `npx tsc --noEmit` → exit 0.

- [ ] **Step 7: 커밋**

```bash
git add src/scenes/planet/engine/types.ts src/scenes/planet/engine/runner.ts src/scenes/planet/engine/runner.test.ts
git commit -m "feat(planet1): reveal 노드 타입 + 러너 분기 + 단위테스트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `RubReveal` 컴포넌트 + MissionPlayer 연결 + CSS

캔버스 긁기 인터랙션 본체. 러너가 `showReveal`를 호출하면 MissionPlayer가 `stage:"reveal"`로 전환하고 `<RubReveal>`을 마운트한다.

**Files:**
- Create: `src/scenes/planet/player/RubReveal.tsx`
- Modify: `src/scenes/planet/player/MissionPlayer.tsx`
- Modify: `src/scenes/planet/player/mission.css`

**Interfaces:**
- Consumes: Task 1의 `RunnerView.showReveal`, `MissionNode.pairs/threshold/mirrorImage/text`.
- Produces: `RubReveal` 컴포넌트(props 아래), MissionPlayer `stage:"reveal"` 처리.

`RubReveal` props:
```ts
{
  pairs: { before: string; after: string }[];
  mirrorImage: string;
  text: string;
  threshold: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
}
```

- [ ] **Step 1: `RubReveal.tsx` 생성** — 아래 전체 내용으로 파일을 만든다.

```tsx
import { useEffect, useRef } from "react";

type Pair = { before: string; after: string };
const COLS = 36;
const ROWS = 20;
const LENS = 0.3; // 거울 폭 대비 렌즈 반경 비율

export default function RubReveal(props: {
  pairs: Pair[];
  mirrorImage: string;
  text: string;
  threshold: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
}) {
  const { pairs, mirrorImage, text, threshold, stageRef, onDone } = props;
  const mirrorRef = useRef<HTMLImageElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const grids = useRef<{ marks: Uint8Array; done: boolean }[]>([]);
  const doneRef = useRef(false);

  // before 이미지를 각 캔버스에 그린다(슬롯은 CSS aspect-ratio 로 크기 확정되어 로드 전에도 offset 유효).
  useEffect(() => {
    pairs.forEach((p, i) => {
      const cv = canvasRefs.current[i];
      if (!cv) return;
      const w = cv.offsetWidth;
      const h = cv.offsetHeight;
      cv.width = w;
      cv.height = h;
      grids.current[i] = { marks: new Uint8Array(COLS * ROWS), done: false };
      const img = new Image();
      img.onload = () => {
        const ctx = cv.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = p.before;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageScale = () => {
    const r = stageRef.current?.getBoundingClientRect();
    return r ? r.width / 1920 : 1;
  };
  const lensRadius = () => (mirrorRef.current?.offsetWidth || 200) * LENS;

  const maybeFinish = () => {
    if (doneRef.current) return;
    const all =
      grids.current.length === pairs.length && grids.current.every((g) => g && g.done);
    if (!all) return;
    doneRef.current = true;
    mirrorRef.current?.classList.add("rr-mirror-done");
    window.setTimeout(() => onDone(), 700);
  };

  // 한 점에서 각 캔버스를 지우고 커버리지 그리드 갱신
  const stampAt = (clientX: number, clientY: number) => {
    const scale = stageScale();
    const R = lensRadius();
    canvasRefs.current.forEach((cv, i) => {
      const g = grids.current[i];
      if (!cv || !g || g.done) return;
      const rect = cv.getBoundingClientRect();
      const x = (clientX - rect.left) / scale;
      const y = (clientY - rect.top) / scale;
      if (x < -R || y < -R || x > cv.width + R || y > cv.height + R) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const grad = ctx.createRadialGradient(x, y, R * 0.55, x, y, R);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const cw = cv.width / COLS;
      const ch = cv.height / ROWS;
      const c0 = Math.max(0, Math.floor((x - R) / cw));
      const c1 = Math.min(COLS - 1, Math.floor((x + R) / cw));
      const r0 = Math.max(0, Math.floor((y - R) / ch));
      const r1 = Math.min(ROWS - 1, Math.floor((y + R) / ch));
      for (let cc = c0; cc <= c1; cc++) {
        for (let rr = r0; rr <= r1; rr++) {
          const ccx = (cc + 0.5) * cw;
          const ccy = (rr + 0.5) * ch;
          if ((ccx - x) ** 2 + (ccy - y) ** 2 <= R * R) g.marks[rr * COLS + cc] = 1;
        }
      }
      let covered = 0;
      for (let k = 0; k < g.marks.length; k++) covered += g.marks[k];
      if (covered / g.marks.length >= threshold) {
        g.done = true;
        ctx.clearRect(0, 0, cv.width, cv.height);
        maybeFinish();
      }
    });
  };

  const onMirrorDown = (e: React.PointerEvent) => {
    if (doneRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const mirror = mirrorRef.current;
    const scale = stageScale();
    const stageRect = stageRef.current!.getBoundingClientRect();
    let lastX = e.clientX;
    let lastY = e.clientY;
    const moveMirror = (cx: number, cy: number) => {
      if (!mirror) return;
      mirror.style.left = (cx - stageRect.left) / scale - mirror.offsetWidth / 2 + "px";
      mirror.style.top = (cy - stageRect.top) / scale - mirror.offsetHeight / 2 + "px";
      mirror.style.right = "auto";
      mirror.style.bottom = "auto";
    };
    moveMirror(e.clientX, e.clientY);
    stampAt(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - lastX, ev.clientY - lastY);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let s = 1; s <= steps; s++) {
        stampAt(
          lastX + ((ev.clientX - lastX) * s) / steps,
          lastY + ((ev.clientY - lastY) * s) / steps,
        );
      }
      lastX = ev.clientX;
      lastY = ev.clientY;
      moveMirror(ev.clientX, ev.clientY);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div id="rubStage" className="rr-enter">
      <div id="rubImages">
        {pairs.map((p, i) => (
          <div className="rr-slot" key={i}>
            <img className="rr-after" src={p.after} alt="" />
            <canvas
              className="rr-canvas"
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
            />
          </div>
        ))}
      </div>

      <img
        className="rr-mirror"
        ref={mirrorRef}
        src={mirrorImage}
        alt="공감 거울"
        onPointerDown={onMirrorDown}
      />

      <div className="rr-guide">
        <img className="rr-guide-avatar" src="/assets/char/Hati/hati_thinking.png" alt="하티" />
        <div>
          <div className="rr-guide-name">하티</div>
          <div className="rr-guide-text">{text}</div>
        </div>
      </div>

      <div className="rr-sparks" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`rr-spark s${i}`}>✦</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: MissionPlayer — VM 타입/초기값/reset 에 reveal 상태 추가**

`VM` 인터페이스의 `stage: "none" | "mirrors" | "gauge";` 를:

```ts
  stage: "none" | "mirrors" | "gauge" | "reveal";
```

그 근처(예: `sOptions` 다음 줄)에 reveal 필드 추가:

```ts
  rPairs: { before: string; after: string }[];
  rMirror: string;
  rText: string;
  rThreshold: number;
```

`vm = useRef<VM>({...})` 초기값과 `reset()`의 `Object.assign(vm, {...})` **양쪽 모두**에 아래를 추가(기존 `sOptions: []`, 각각 다음 줄):

```ts
    rPairs: [],
    rMirror: "",
    rText: "",
    rThreshold: 0.85,
```

- [ ] **Step 3: MissionPlayer — `showReveal` 구현 + import + 마운트 + finishReveal**

파일 상단 import에 추가(MirrorStage import 옆):

```ts
import RubReveal from "./RubReveal";
```

`view` 객체의 `showGauge(...) {...}` 블록 **바로 아래**에 추가:

```ts
      showReveal(node, done) {
        updateScene(node);
        vm.stage = "reveal";
        vm.mode = "idle";
        vm.bubbleKind = "none";
        vm.choices = [];
        vm.rPairs = node.pairs || [];
        vm.rMirror = node.mirrorImage || "";
        vm.rText = node.text || "";
        vm.rThreshold = node.threshold ?? 0.85;
        ms.done = done;
        render();
        audio.play("pop");
      },
```

컴포넌트 본문(핸들러들 근처, 예: `finishMirrors` 아래)에 완료 핸들러 추가:

```ts
  const finishReveal = () => {
    const done = ms.done;
    ms.done = undefined;
    vm.stage = "none";
    force();
    done?.();
  };
```

JSX에서 `MirrorStage` 렌더 블록(`{vm.stage !== "none" && (<MirrorStage .../>)}`) **바로 아래**에 추가:

```tsx
        {vm.stage === "reveal" && (
          <RubReveal
            pairs={vm.rPairs}
            mirrorImage={vm.rMirror}
            text={vm.rText}
            threshold={vm.rThreshold}
            stageRef={stageRef}
            onDone={finishReveal}
          />
        )}
```

주의: 기존 `MirrorStage`는 `vm.stage !== "none"` 조건이라 reveal에서도 렌더될 수 있으니, 그 조건을 `(vm.stage === "mirrors" || vm.stage === "gauge")` 로 좁힌다:

```tsx
        {(vm.stage === "mirrors" || vm.stage === "gauge") && (
          <MirrorStage
```

- [ ] **Step 4: mission.css — reveal 스타일 추가** — `#mirrorTool { ... }` 블록 **아래**에 붙인다.

```css
/* ---------- reveal (공감 거울 긁어서 드러내기) ---------- */
#rubStage {
  position: absolute;
  inset: 0;
  z-index: 5;
}
#rubImages {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 36px;
  padding: 96px 40px 40px;
}
.rr-slot {
  position: relative;
  width: 46%;
  aspect-ratio: 1672 / 941;
  -webkit-mask-image:
    linear-gradient(to right, transparent 0, #000 9%, #000 91%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 9%, #000 91%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0, #000 9%, #000 91%, transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 9%, #000 91%, transparent 100%);
  mask-composite: intersect;
}
.rr-after,
.rr-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: fill;
}
.rr-canvas {
  touch-action: none;
}
.rr-mirror {
  position: absolute;
  right: 48px;
  bottom: 40px;
  height: 29%;
  width: auto;
  object-fit: contain;
  z-index: 6;
  cursor: grab;
  touch-action: none;
  filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5));
}
.rr-mirror:active {
  cursor: grabbing;
}
.rr-guide {
  position: absolute;
  left: 40px;
  bottom: 40px;
  z-index: 7;
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 58%;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 30px;
  padding: 20px 34px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}
.rr-guide-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
}
.rr-guide-name {
  color: #6a5cff;
  font-weight: 800;
  font-size: 24px;
}
.rr-guide-text {
  font-size: 32px;
  font-weight: 800;
  color: #2a2350;
}

/* 등장 연출: 팝인 + 글로우 펄스 */
#rubStage.rr-enter .rr-mirror {
  animation:
    rrMirrorIn 0.5s ease-out,
    rrGlow 1.2s ease-in-out 0.2s;
}
@keyframes rrMirrorIn {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  70% {
    opacity: 1;
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes rrGlow {
  0%,
  100% {
    filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 26px rgba(190, 160, 255, 0.95))
      drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5));
  }
}
/* 완료 시 강한 반짝 */
.rr-mirror.rr-mirror-done {
  animation: rrDoneGlow 0.7s ease-in-out;
}
@keyframes rrDoneGlow {
  0%,
  100% {
    filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(255, 240, 180, 1))
      drop-shadow(0 0 70px rgba(255, 220, 130, 0.8));
  }
}
/* 등장 반짝이 파티클(거울 초기 위치 근처) */
.rr-sparks {
  position: absolute;
  right: 40px;
  bottom: 40px;
  width: 380px;
  height: 380px;
  z-index: 6;
  pointer-events: none;
}
.rr-spark {
  position: absolute;
  font-size: 34px;
  color: #ffe9a8;
  opacity: 0;
  animation: rrSpark 1s ease-out forwards;
}
.rr-spark.s0 { left: 12%; top: 18%; animation-delay: 0.05s; }
.rr-spark.s1 { left: 62%; top: 8%; animation-delay: 0.18s; }
.rr-spark.s2 { left: 82%; top: 46%; animation-delay: 0.30s; }
.rr-spark.s3 { left: 24%; top: 64%; animation-delay: 0.12s; }
.rr-spark.s4 { left: 54%; top: 74%; animation-delay: 0.24s; }
.rr-spark.s5 { left: 38%; top: 34%; animation-delay: 0.40s; }
@keyframes rrSpark {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-32px) scale(1.1);
  }
}
```

- [ ] **Step 5: 타입체크 + 런타임 검증(Playwright)** — 아직 mission03.json은 안 바꾼 상태이므로, 임시로 러너를 직접 구동해 확인한다.

Run: `npx tsc --noEmit` → exit 0.

dev 서버 실행 후(`npm run dev`) Playwright로:
1. `?fresh=1#/planet/1?m=3` 진입.
2. `browser_evaluate`로 임시 reveal 노드를 주입해 검증한다(mission03 전환 전이므로 런타임 데이터로 확인):
```js
// window.__runner 를 재생성하지 말고, 현재 view 를 통해 showReveal 를 직접 호출
window.__runner && window.__runner; // 존재 확인
```
   더 간단히: **Task 3에서 mission03.json을 reveal로 바꾼 뒤** 통합 검증한다. 이 Step에서는 타입체크 통과 + 컴포넌트가 import 되어 빌드 깨지지 않음만 확인(`npm run dev` 로그에 에러 없음).

Expected: tsc 0, dev 서버 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/planet/player/RubReveal.tsx src/scenes/planet/player/MissionPlayer.tsx src/scenes/planet/player/mission.css
git commit -m "feat(planet1): RubReveal 컴포넌트 + MissionPlayer reveal 연결

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `m3_mirror3`를 reveal 로 전환 + 통합 검증 + visualize.py

**Files:**
- Modify: `src/scenes/planet/planet1/mission03.json`
- Modify: `scenario-tools/visualize.py`

**Interfaces:**
- Consumes: Task 1/2 전부.

- [ ] **Step 1: mission03.json — `m3_mirror3`를 reveal 로 교체** — 현재 `m3_mirror3` 노드 객체를 아래로 교체한다.

```json
    {
      "id": "m3_mirror3",
      "type": "reveal",
      "text": "공감 거울을 터치해서 이 차가운 화면 위로 슥슥 문질러봐!",
      "mirrorImage": "/assets/ui/empathy-mirror2.png",
      "pairs": [
        { "before": "/assets/char/Luna/luna_unheard1.png", "after": "/assets/char/Luna/luna_heard1.png" },
        { "before": "/assets/char/Luna/luna_unheard2.png", "after": "/assets/char/Luna/luna_heard2.png" }
      ],
      "threshold": 0.85,
      "next": "m3_end"
    },
```

(기존 `images`/`mirrorImage`/`noAuto`/`hideFriend` 필드는 이 교체로 제거된다.)

- [ ] **Step 2: 통합 검증(Playwright)** — dev 서버에서 `?fresh=2#/planet/1?m=3` 진입 후:

1. `window.__runner.go('m3_mirror3')` 로 reveal 진입. `document.querySelectorAll('.rr-slot').length === 2`, `.rr-mirror`, `.rr-canvas` 2개 확인.
2. 각 캔버스 위를 거울로 문지르는 시뮬레이션 — `.rr-mirror`에 `pointerdown` 디스패치 후, 각 슬롯 rect 위를 지그재그로 `pointermove`를 다수 디스패치(브라우저 좌표). 예:
```js
const fire = (el, type, x, y) =>
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
const mirror = document.querySelector('.rr-mirror');
const slots = [...document.querySelectorAll('.rr-slot')];
for (const s of slots) {
  const r = s.getBoundingClientRect();
  fire(mirror, 'pointerdown', r.left + 10, r.top + 10);
  for (let yy = r.top + 8; yy < r.bottom - 4; yy += 10)
    for (let xx = r.left + 8; xx < r.right - 4; xx += 12)
      fire(window, 'pointermove', xx, yy);
  fire(window, 'pointerup', r.right - 6, r.bottom - 6);
}
```
3. 슬러 문지른 뒤 진행 확인: `#debug` 텍스트가 `m3_end` 로 바뀌었는지(자동완성→onDone→advance). 약 800ms 대기 후 확인.
4. 스크린샷으로 문지른 부분에 공감받는 이미지가 드러나는지(중간 상태) 시각 확인.

Expected: 두 슬롯 문지르면 `m3_end`로 진행. 문지르는 중 아래(heard) 이미지가 드러남.

- [ ] **Step 3: visualize.py — reveal 타입 표시** — `node_mermaid`의 `elif ntype == "video":` 블록 **위**(gauge 다음)에 추가:

```python
    elif ntype == "reveal":                          # 긁어서 드러내기(공감 거울)
        rows.append(f"<b class='hd-mirror'>🪞 긁어서 드러내기 · {len(n.get('pairs') or [])}쌍</b>")
```
그리고 `meta` 구성부에 pairs 요약 추가(기존 `if n.get("mirrorImage"):` 근처):
```python
    if n.get("pairs"):
        meta.append("🖼 " + ", ".join(
            f"{os.path.basename(p.get('before',''))}→{os.path.basename(p.get('after',''))}"
            for p in n["pairs"]))
```
노드 모양 분기(`if ntype in ("mirrors", "gauge"):` 스타디움)에 reveal 포함:
```python
    if ntype in ("mirrors", "gauge", "reveal"):
        return f'  {nid}(["{label}"])'       # 스타디움 = 특수 상호작용
```
classDef 지정부(`elif ntype == "video":` 위)에:
```python
        elif ntype == "reveal":
            cls = "mirrorNode"
```

- [ ] **Step 4: 그래프 재생성 + 타입체크**

Run: `cd scenario-tools && python visualize.py ../src/scenes/planet/planet1/mission03.json` → `build/mission03.html` 생성(에러 없음).
Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/planet/planet1/mission03.json scenario-tools/visualize.py
git commit -m "feat(planet1): m3_mirror3 를 reveal(긁어서 드러내기)로 전환 + 그래프 지원

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review 결과

- **Spec coverage:** reveal 타입/필드/showReveal(Task1), 2겹 슬롯·거울 드래그·렌즈 지우기·커버리지 그리드·85% 자동완성·둘 다 완료 진행·등장/완료 연출(Task2), m3_mirror3 전환·통합검증·visualize(Task3) — 스펙 항목 모두 커버.
- **Placeholder scan:** 코드/명령 모두 구체값. Task2 Step5는 통합검증을 Task3로 위임(빌드 무결성만 확인)함을 명시.
- **Type consistency:** `showReveal(node, done)` 시그니처가 types/runner/test/MissionPlayer에서 일치. VM 필드 `rPairs/rMirror/rText/rThreshold`가 showReveal와 JSX props에서 일치. `pairs:{before,after}[]`, `threshold`가 types·json·컴포넌트에서 일치.
- **주의:** 캔버스 긁기는 jsdom 단위테스트가 어려워 Playwright 포인터 시뮬레이션으로 검증(Task3 Step2). 러너 로직만 vitest로 단위테스트(Task1).
