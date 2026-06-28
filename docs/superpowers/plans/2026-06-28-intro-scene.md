# Intro Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Intro_v2.mp4`를 음소거 자동재생하고, 영상이 끝나거나 `건너뛰기`를 누르면 마지막 프레임에 멈춘 화면 위에 `시작하기` 버튼을 띄워 `/auth`로 넘기는 Intro Scene을 만든다.

**Architecture:** 단일 React 컴포넌트(`Intro.tsx`)가 `playing`/`ended` 두 상태와 `muted` 상태를 관리한다. 영상은 `object-fit: cover`로 풀스크린. 비순수 로직(seek 목표 계산)만 별도 순수 모듈(`intro.logic.ts`)로 분리해 vitest로 단위 테스트하고, 컴포넌트 통합은 Playwright로 검증한다.

**Tech Stack:** React 19, react-router-dom 7(HashRouter), Vite 8, vitest 4, CSS(인라인 SVG 아이콘).

## Global Constraints

- 레이아웃 기준: 1280×800 CSS px, DPR 1.5, 가로 고정, immersive 전체화면. (`docs/runtime-environment.md`)
- 세로 높이는 `100vh` 대신 `100dvh` / `min-height: 100svh` 사용.
- 가장자리 UI는 `env(safe-area-inset-*)` 고려.
- 라우팅은 HashRouter → 개발 URL은 `http://localhost:5173/#/intro` 형태.
- 영상 표시: `object-fit: cover`(좌우 ~70px 크롭 허용).
- 아이콘은 이모지 대신 인라인 SVG.
- 버튼은 공용 `.btn` 계열(global.css) 재사용/확장. 풀 SVG·PNG 버튼 금지.
- 라우트 `/intro`는 이미 `src/App.tsx`에 연결되어 있음 — App.tsx 수정 불필요.
- 영상 파일 경로: `/video/Intro_v2.mp4` (1920×1080, ~31s).

---

### Task 1: seek 목표 계산 순수 헬퍼

`건너뛰기` 시 영상을 마지막 프레임 근처로 보낼 seek 목표(초)를 계산한다. 메타데이터 미로드 등으로 `duration`이 유효하지 않을 때(0/NaN/Infinity) 안전하게 0을 반환해 스펙의 엣지케이스를 흡수한다.

**Files:**
- Create: `src/scenes/intro.logic.ts`
- Test: `src/scenes/intro.logic.test.ts`

**Interfaces:**
- Consumes: (없음)
- Produces: `export function skipSeekTarget(duration: number): number`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/scenes/intro.logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { skipSeekTarget } from "./intro.logic";

describe("skipSeekTarget", () => {
  it("정상 duration이면 마지막 0.1초 전 지점을 반환한다", () => {
    expect(skipSeekTarget(30.9667)).toBeCloseTo(30.8667, 4);
  });

  it("duration이 0.1 이하면 0을 반환한다", () => {
    expect(skipSeekTarget(0.05)).toBe(0);
  });

  it("duration이 0이면 0을 반환한다", () => {
    expect(skipSeekTarget(0)).toBe(0);
  });

  it("duration이 NaN이면 0을 반환한다", () => {
    expect(skipSeekTarget(NaN)).toBe(0);
  });

  it("duration이 Infinity면 0을 반환한다", () => {
    expect(skipSeekTarget(Infinity)).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- intro.logic`
Expected: FAIL — `skipSeekTarget` (또는 `./intro.logic`) 을 찾을 수 없음.

- [ ] **Step 3: 최소 구현**

Create `src/scenes/intro.logic.ts`:

```ts
/**
 * 건너뛰기 시 영상을 마지막 프레임 근처(끝에서 0.1초 전)로 보낼 seek 목표(초).
 * 정확히 duration으로 seek하면 프레임이 표시되지 않을 수 있어 약간 앞으로 둔다.
 * duration이 유효하지 않으면(메타데이터 미로드: 0/NaN/Infinity) 0을 반환한다.
 */
export function skipSeekTarget(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, duration - 0.1);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- intro.logic`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/intro.logic.ts src/scenes/intro.logic.test.ts
git commit -m "feat(intro): add skipSeekTarget helper"
```

---

### Task 2: Intro Scene 컴포넌트 + 스타일

영상 풀스크린 cover 재생, `건너뛰기`/`시작하기` 버튼, 탭하여 소리 켜기, `playing`→`ended` 상태 전환을 구현한다. 만화풍 CSS 버튼 + 인라인 SVG 아이콘.

**Files:**
- Create: `src/scenes/Intro.css`
- Modify: `src/scenes/Intro.tsx` (전면 교체)
- (참고) `src/scenes/intro.logic.ts` — Task 1 산출물 사용

**Interfaces:**
- Consumes: `skipSeekTarget(duration: number): number` (Task 1)
- Produces: `export default function Intro()` — 라우트 `/intro` 컴포넌트 (이미 App.tsx에 연결됨)

- [ ] **Step 1: 스타일 파일 작성**

Create `src/scenes/Intro.css`:

```css
.intro {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  min-height: 100svh;
  background: #000;
  overflow: hidden;
}

.intro__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

/* 영상 위를 덮는 투명 탭 레이어 (탭하면 소리 켜기) */
.intro__tap-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

/* 소리 켜기 힌트 (하단 중앙) */
.intro__sound-hint {
  position: absolute;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(11, 16, 32, 0.7);
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  pointer-events: none;
  animation: intro-pulse 1.6s ease-in-out infinite;
}

@keyframes intro-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* 건너뛰기 (우상단) — .btn.ghost 확장 */
.intro__skip {
  position: absolute;
  top: calc(16px + env(safe-area-inset-top));
  right: calc(16px + env(safe-area-inset-right));
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 18px;
}

/* 시작하기 (중앙 하단, 만화풍 캔디 버튼) — .btn 확장.
   중앙 정렬은 margin auto로 처리하여 transform을 애니메이션/active에 양보한다. */
.intro__start {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: fit-content;
  bottom: calc(64px + env(safe-area-inset-bottom));
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 20px 44px;
  font-size: 30px;
  font-weight: 800;
  border-radius: 999px;
  animation:
    intro-fade-in 0.4s ease-out both,
    intro-bounce 2s ease-in-out 0.4s infinite;
}

@keyframes intro-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes intro-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
```

- [ ] **Step 2: 컴포넌트 전면 교체**

Replace entire `src/scenes/Intro.tsx`:

```tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { skipSeekTarget } from "./intro.logic";
import "./Intro.css";

type Status = "playing" | "ended";

export default function Intro() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("playing");
  const [muted, setMuted] = useState(true);

  // 영상 탭: 소리 켜기 (+ 자동재생이 막혀 멈춰 있으면 재생도 시도)
  const handleTapToSound = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    v.muted = false;
    setMuted(false);
  };

  // 건너뛰기: 마지막 프레임 근처로 보내 정지 → ended
  const handleSkip = () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = skipSeekTarget(v.duration);
      v.pause();
    }
    setStatus("ended");
  };

  return (
    <div className="intro">
      <video
        ref={videoRef}
        className="intro__video"
        src="/video/Intro_v2.mp4"
        autoPlay
        playsInline
        muted={muted}
        onEnded={() => setStatus("ended")}
      />

      {status === "playing" && (
        <>
          <button
            type="button"
            className="intro__tap-layer"
            aria-label="탭하여 소리 켜기"
            onClick={handleTapToSound}
          />

          {muted && (
            <div className="intro__sound-hint" aria-hidden="true">
              <MuteIcon />
              <span>탭하여 소리 켜기</span>
            </div>
          )}

          <button type="button" className="btn ghost intro__skip" onClick={handleSkip}>
            <SkipIcon />
            건너뛰기
          </button>
        </>
      )}

      {status === "ended" && (
        <button type="button" className="btn intro__start" onClick={() => nav("/auth")}>
          <PlayIcon />
          시작하기
        </button>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 5l9 7-9 7zM12 5l7 7-7 7zM19 5h2v14h-2z" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      <path
        d="M16 9l5 6M21 9l-5 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 3: 타입체크 통과 확인**

Run: `npx tsc -b`
Expected: 에러 없이 종료(exit 0).

- [ ] **Step 4: 포맷 확인**

Run: `npm run format`
Expected: 파일 정리됨(에러 없음).

- [ ] **Step 5: 개발 서버 + Playwright 통합 검증**

개발 서버를 백그라운드로 띄운다:

Run: `npm run dev` (백그라운드)

Playwright(MCP)로 검증:
1. `http://localhost:5173/#/intro` 로 이동.
2. `<video>`가 존재하고 `muted` 자동재생 중인지 확인(`paused === false`, `muted === true`). 개발 브라우저는 muted 기준.
3. "탭하여 소리 켜기" 힌트와 `건너뛰기` 버튼이 보이는지 확인.
4. `건너뛰기` 클릭 → `건너뛰기`/힌트 사라지고 `시작하기` 버튼이 나타나는지, 영상이 `paused === true`이고 `currentTime`이 끝 근처(>30)인지 확인.
5. `시작하기` 클릭 → URL이 `#/auth`로 바뀌는지 확인.
6. 스크린샷 저장(playing 상태 1장, ended 상태 1장)으로 시각 확인.

Expected: 위 모든 동작 정상. 영상이 cover로 화면을 꽉 채움.

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/Intro.tsx src/scenes/Intro.css
git commit -m "feat(intro): implement video-to-title intro scene"
```

---

## Self-Review

- **Spec coverage:**
  - 흐름/상태(playing/ended) → Task 2 Step 2 ✓
  - ended 진입(onEnded / 건너뛰기 seek+pause) → Task 2 Step 2 + Task 1 ✓
  - 레이아웃(풀스크린, cover, 100dvh/svh, safe-area) → Task 2 Step 1 ✓
  - 건너뛰기/시작하기/소리힌트 UI → Task 2 Step 1·2 ✓
  - 오디오(muted 시작, 탭하여 소리, play() fallback) → Task 2 Step 2 ✓
  - 버튼 방침(.btn 확장 + 인라인 SVG) → Task 2 Step 1·2 ✓
  - duration 엣지케이스 → Task 1 ✓
  - 검증(Playwright /intro→건너뛰기→시작하기) → Task 2 Step 5 ✓
- **Placeholder scan:** 없음(모든 코드/명령 구체적).
- **Type consistency:** `skipSeekTarget(duration: number): number` Task 1 정의 ↔ Task 2 호출 일치. `Status = "playing" | "ended"` 일관.
