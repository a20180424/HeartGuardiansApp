# Planet3 미션2·3(mission23 3D 월드) 효과음 배선 — 설계

**날짜**: 2026-07-21
**브랜치**: `feat/planet3-mission23-sfx`
**대상**: `www/planet3/mission23/` (미션2=stage1, 미션3=stage2가 한 three.js 월드에 합쳐짐)

## 배경 / 문제

mission23 3D 월드에는 지금 소리가 하나도 없다. 하지만 이 페이지에는 이미 공통 `audio`
모듈(WebAudio **합성음** `SOUNDS` 사전 + `play(name)` + unlock + 🔊 음소거 버튼)이 복사돼
있다. 이 앱은 SFX용 음원 파일이 없고 전부 톤 합성으로 처리한다(다른 씬과 동일).

즉 진짜 원인은 **게임 로직/월드에서 `audio.play()`를 아무 데도 호출하지 않는 것**이다.
새 사운드 시스템을 만드는 게 아니라 이벤트 지점에 배선만 하면 된다. 추가로, 공통블록의
제네릭 `data-sfx` 클릭음이 "미션 엔진/월드가 자체 사운드를 낸다"는 이유로 억제돼 있는데,
실제로는 이 월드가 무음이라 이 억제가 오히려 무음의 원인이었다.

## 목표 (요청 4가지)

1. 버튼 클릭 사운드
2. 미션2에서 말풍선을 만났을 때 소리
3. 미션3에서 NPC를 만났을 때 소리
4. 미션2·3에서 주인공이 움직일 때 발자국 소리 (은은한 합성음)

## 아키텍처

world는 ES 모듈이라 페이지의 `audio`(`script.js` 모듈 스코프 const)에 직접 못 닿는다.
전역 오염 없이 페이지 독립성을 지키기 위해 **콜백 주입** 경로를 쓴다:

```
script.js
  audio.play(name)
      ▲
      │ onSfx: (name) => audio.play(name)
      │
mountWorld(overlay, { …, onSfx })
      │  ├─ createStageManager(ctx) 의 ctx.sfx 로 전달  → 만남 사운드
      │  └─ animate 루프에서 직접 사용             → 발자국 사운드
```

- `mountWorld` 시그니처에 `onSfx` 추가: `{ onStage2Enter, onComplete, startStage, onSfx }`.
- `createStageManager(ctx)` 의 `ctx` 에 `sfx: onSfx` 전달.
- 어느 것도 넘어오지 않아도 안전하도록 호출부는 `ctx.sfx?.(name)` / `onSfx?.(name)` 옵셔널.

## 배선 지점 (4)

| # | 이벤트 | 변경 파일 | 사운드 |
| --- | --- | --- | --- |
| 1 | 버튼 클릭 — 팝업 선택·다음·홈 등 모든 `<button>` | `script.js` 공통블록 3-① | 기존 `tap` |
| 2 | 미션2 말풍선 만남 — `openPopup()` 열릴 때 | `world/stages.js` | 기존 `pop` (상승 톤) |
| 3 | 미션3 NPC 만남 — `openNpcDialogue()` 열릴 때 | `world/stages.js` | 기존 `select` (2음, 말풍선과 구분) |
| 4 | 발자국 — 이동 중 | `script.js`(SOUNDS.step 추가) + `mountWorld.js` 루프 | 새 `step` |

### 1. 버튼 클릭

현재 공통블록 3-①(미션 페이지 변형)은 `pointerdown` 에서 `audio.unlock()` 만 하고 자동
`data-sfx` tap 재생을 억제한다. 이를 홈(`www/home/script.js`)의 원형처럼 **버튼 tap 재생을
복원**한다: `closest("button")` 이 있고 `disabled` 아니고 `data-sfx !== "none"` 이면 `tap`.
음소거 버튼은 `data-sfx="none"` 이라 계속 무음. 팝업 선택/다음/홈 버튼 전부 실제 `<button>`
이라 이 한 지점으로 모두 커버된다.

### 2. 말풍선 만남 (미션2)

`stages.js` `openPopup(bubble)` 진입 시(팝업이 실제로 열리는 시점, `popupOpen=true` 부근)
`ctx.sfx?.('pop')`. `openPopup` 은 소비/`popupOpen` 가드로 만남당 1회만 열리므로 소리도 1회.

### 3. NPC 만남 (미션3)

`stages.js` `openNpcDialogue(def)` 진입 시 `ctx.sfx?.('select')`. `npcCooldown`/`popupOpen`
가드로 재오픈이 억제되므로 만남당 1회.

### 4. 발자국 (미션2·3 공통, 은은한 합성)

**새 사운드** `SOUNDS.step` 추가. ⚠ **개정(2026-07-21)**: 최초안은 저역 사인
(145/175Hz·gain 0.05)이었으나 태블릿 스피커에서 저역이 롤오프돼 거의 안 들렸다
(400Hz 하이패스 통과 시 peak 0.0066 ≈ 무음). 그래서 **눈 밟는 노이즈 방식**으로
교체: 중역 bandpass 노이즈 버스트("뽀득", 1150/1500Hz·gain 0.11)를 좌/우 발마다
번갈아 + 약한 저역 sine 쿵(115/135Hz·gain 0.045)으로 몸통감. `noise()` 헬퍼(캐시된
화이트노이즈 버퍼→bandpass→envelope)를 audio 모듈에 추가. 작은 스피커 근사에서
RMS +6.5dB·peak 3.6× 로 명확히 가청. (그 외 `SOUNDS` 사전은 다른 씬 복사본과 동일 —
이 페이지에만 `step`·`noise` 추가.)

**케이던스**는 `mountWorld.js` animate 루프에서: `!inputLocked` 이고 입력(조이스틱+키보드)
크기가 임계값(예 0.2) 이상일 때 누적 타이머로 **0.32초마다** `onSfx?.('step')`. 입력이
멈추면 누적기를 리셋(또는 다음 스텝까지 대기 안 함)해 즉시 중단. 근사로 "실제 이동" 대신
"이동 입력"을 기준으로 한다(충돌로 막혀도 발소리 — 허용 가능한 단순화).
반복 피로가 있으면 gain/간격만 튜닝.

## 격리 원칙

- **`www/planet3/mission23/` 안에서만** 수정. 다른 씬의 공통블록 복사본은 손대지 않는다
  (이번 변경은 이 페이지 고유 — 다른 페이지 미션엔진은 자체 사운드가 있어 제네릭 tap을
  억제하는 게 맞다).
- `SOUNDS.step` 는 mission23 사본에만 추가.

## 검증

- `npm run dev` + playwright MCP로 실제 실행: 콘솔 에러 0, 버튼 클릭/말풍선 만남/NPC 만남/
  이동 발자국이 각각 들리는지(브라우저 자동재생 정책상 첫 제스처 후) 확인.
  DEV 점프: `?m=2` (stage1) / `?m=2&stage2=1` (stage2)로 각각 검증.
- 음소거 버튼으로 전체 뮤트 동작 확인(발자국 포함 `master.gain` 0).

## 비목표 (YAGNI)

- 음원(mp3/wav) 도입 — 앱 전체가 합성음이므로 하지 않음.
- BGM — 범위 밖.
- 다른 씬으로의 발자국/만남음 확산 — 이번 범위 아님.
