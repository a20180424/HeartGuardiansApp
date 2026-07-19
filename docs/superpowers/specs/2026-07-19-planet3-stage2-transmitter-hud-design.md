# Planet3 Stage2 — 공감 송신기 HUD 설계

작성일: 2026-07-19
대상 씬: `www/planet3/mission23/` (얼음 행성 미션2·3, three.js 3D 월드)
범위: **stage2(미션3, NPC 4명과의 공감 대화)** 에만 해당. stage1(미션2 연료 채우기)은 변경 없음.

## 배경 / 컨셉

미션2(stage1)에서 "따뜻한 말"로 공감 송신기를 충전했다. 미션3(stage2)에서는
그 **충전된 공감 송신기를 사용해서** 얼어붙은 마음의 NPC 4명과 대화한다는 서사다.

이 서사를 시각적으로 살리기 위해, stage2 동안 화면에 공감 송신기 이미지를
표시하고, NPC와 대화하는 순간에는 "작동중"으로 보이는 애니메이션을 강화한다.

기존 사실(코드 확인 완료):
- NPC는 실제로 **4명**이다(`world/stage2-npcs.js`: 억울한/떨리는/수줍은/뿌듯한 토끼).
  일부 코드 주석·문구가 "3명/세 NPC"로 남아 있으나 실제 로직은 4명을 모두 처리한다(오래된 주석).
- NPC 접촉 시 주인공이 NPC를 정면으로 바라보게 회전하는 로직은 **이미 구현되어 있다**
  (`world/stages.js` `openNpcDialogue` → `ctx.facePlayerToward(...)`).
- 대화 팝업은 화면 **오른쪽에 도킹**된다(`.popup-overlay--dialogue`).
- 대화 팝업은 NPC 1명당 4라운드로, 라운드마다 열렸다 닫히며 사이에 1.2초 쿨다운이 있다.

## 목표

- stage2 동안 공감 송신기 이미지를 **화면 하단 가운데**에 상시 표시한다.
- 평소(idle)에는 잔잔하게, NPC와 **대화 중(active)** 에는 "작동중"으로 강화된
  신호파 방사 + 글로우 애니메이션을 보여준다.
- 이동/시야를 방해하지 않는다(하단에 낮게 배치).

## 비목표 (YAGNI)

- stage1(연료 채우기) HUD 변경 없음.
- NPC 대화 내용·게임 규칙 변경 없음.
- 캡션 텍스트("공감 송신기" 등)는 넣지 않는다(이미지 + 신호파만). 필요 시 후속으로.
- 사운드 없음.

## 배치 결정 — 하단 가운데

왼쪽 세로 중앙 대신 **하단 가운데**로 정한 근거:
1. 낮게 깔려 NPC 시야(화면 중앙)와 이동을 가리지 않는다.
2. stage1의 배터리 충전바가 있던 바로 그 자리(`bottom` 중앙)를 계승 — "충전한 송신기를
   이제 쓴다"는 서사가 자연스럽게 이어지고 HUD 위치 일관성도 확보된다.
3. 1인칭 카메라에서 하단 가운데 송신기 + **위쪽(NPC 방향)으로 방사되는 신호파** 는
   "내 앞의 송신기가 NPC에게 신호를 쏜다"는 느낌을 준다.

겹침 없음: 미니맵(좌하단)·리모콘 조이스틱(우하단)·대화창(우측 도킹) 모두 하단 가운데를 비운다.

## 컴포넌트

### 새 모듈: `world/transmitterHud.js`

`scorehud.js` / `minimap.js` 와 같은 독립 위젯 패턴. 다른 페이지·모듈과 격리.

```
createTransmitterHud() -> { element, setActive(on: boolean), remove() }
```

- `element`: 컨테이너 DOM. 호출부가 `ctx.uiRoot`(=`.efg-overlay`)에 append.
- `setActive(true|false)`: 컨테이너에 `.active` 클래스 토글(idle ↔ active).
- `remove()`: DOM 제거.

**DOM 구조**
```
div.transmitter-hud                 (하단 가운데 고정, .active 토글 대상)
  div.transmitter-hud__waves        (신호파 링 컨테이너)
    span.transmitter-hud__ring × 3  (동심원, 각기 다른 animation-delay)
  img.transmitter-hud__img          (empathy-transmitter-icon.webp 재사용, src=../../assets/planet3/...)
```

- 에셋은 stage1 충전바에서 쓴 **동일** `www/assets/planet3/empathy-transmitter-icon.webp` 재사용.

### CSS (`style.css`, `.efg-overlay` 스코프)

- `.transmitter-hud`: `position:absolute; bottom:16px; left:50%; transform:translateX(-50%); z-index:8;`
  (캔버스 위, 대화 팝업 z:20 아래). 이미지 높이 ~130–160px(튜닝 여지).
- `.transmitter-hud__img`: 높이 고정, `width:auto`, `display:block`.
- `.transmitter-hud__waves`: 이미지 안테나 위쪽에 위치. 링은 위로 퍼지는 동심원.
- `.transmitter-hud__ring`: 분홍 계열 원. `@keyframes` 로 scale 확대 + opacity 페이드아웃.
  3개가 `animation-delay` 로 순차 방사.
- 글로우: 기기 뒤 부드러운 radial glow(별도 레이어 또는 `filter: drop-shadow` 맥박).
- **idle**(기본): 링/글로우 느리고 낮은 opacity.
- **active**(`.transmitter-hud.active`): 링 애니메이션 속도↑ + opacity↑, 글로우 밝기↑.
  idle↔active 전환 시 opacity/밝기는 CSS `transition` 으로 완충(속도 변화는 즉시).
- 텍스트 요소는 없으므로 `pre-line`/`keep-all` 대상 아님.

## 배선 (`world/stages.js`)

상태 변수 추가: `let transmitter = null;`

- **생성/표시**: `startStage2()` 안에서 `transmitter = createTransmitterHud(); ctx.uiRoot.appendChild(transmitter.element);`
  - 정식 진행(`onPass` → `startStage2`)과 DEV 점프(`?stage2=1` → `start({startStage:2})` → `startStage2`)의
    **공통 진입점**이라 양쪽 모두 커버된다.
  - NPC 로드 실패 시에도 송신기는 떠 있어도 무방(별도 처리 불필요).
- **active 토글**:
  - `openNpcDialogue()` 진입에서 `transmitter?.setActive(true)`.
  - `showDialogue` 선택 콜백(대화 닫힘) 안에서 `transmitter?.setActive(false)`.
  - 결과적으로 팝업이 열려 있는 동안만 active. 라운드 사이 쿨다운에는 idle로 돌아가지만
    idle도 계속 움직이므로 꺼지듯 보이지 않고, opacity transition 으로 부드럽게 잦아든다.
- **제거**: `onAllNpcsDone()` 완료 콜백에서 `transmitter?.remove(); transmitter = null;`.
  - 월드 dispose는 `mountWorld` 의 `container.replaceChildren()` 가 모든 자식 DOM을 제거하므로
    별도 정리 불필요(기존 hud/minimap/joystick 과 동일).

## 곁다리 정정 (선택)

`stages.js` 의 stage2 관련 주석/문구 중 "세 NPC / NPC 3명" 표현을 "4명"으로 정정한다
(실제 데이터·로직과 불일치하는 오래된 주석). 동작 변화 없음.

## 검증

- `npm run dev` + playwright MCP 로 실행.
- DEV 점프 `?stage2=1` 로 stage2 직접 진입 → 하단 가운데 송신기 표시 확인(idle).
- NPC에 접근해 대화 팝업이 열리면 active 애니메이션 강화 확인, 선택 후 idle 복귀 확인.
- 미니맵·리모콘·대화창과 겹치지 않는지, 이동 시 시야를 가리지 않는지 스크린샷 확인.
- 콘솔 에러 0.
- **튜닝 전제**: 크기·위치·애니메이션 강도는 실행 화면을 보고 사용자와 함께 조정한다
  (상시 표시가 이동에 방해되는지 여부 포함).

## 파일 영향 요약

- 신규: `www/planet3/mission23/world/transmitterHud.js`
- 수정: `www/planet3/mission23/world/stages.js` (배선 + 주석 정정)
- 수정: `www/planet3/mission23/style.css` (`.transmitter-hud*` 규칙, `.efg-overlay` 스코프)
- 에셋: 기존 `www/assets/planet3/empathy-transmitter-icon.webp` 재사용(신규 없음)
