# 공감 거울 긁어서 드러내기 (empathy mirror rub-to-reveal) — 설계

- 날짜: 2026-07-03
- 대상: Planet1 / mission3 의 `m3_mirror3` 노드
- 상태: 승인됨(설계) → 구현 계획 대기

## 1. 목표

`m3_mirror3`에서 플레이어가 **공감 거울**을 잡고 화면 가운데의 *공감받지 못하는 루나* 이미지 2장 위로 문지르면, 문지른(거울 렌즈가 지나간) 부분이 아래에 깔린 *공감받는 루나* 이미지로 드러난다. 두 이미지가 모두 충분히 드러나면 다음 노드(`m3_end`)로 진행한다.

"차가운 세상 → 공감으로 따뜻해짐"을 손으로 문질러 체험하게 하는 인터랙션.

## 2. 확정된 결정 (브레인스토밍)

- **완료 판정**: 이미지별 지워진 비율 **≥ 85%** 이면 나머지를 자동으로 채워(전체 클리어) 완료. **두 이미지 모두 완료 시** 진행.
- **브러시**: 거울의 **원형 렌즈 크기**만큼 드러남(가장자리는 약간 부드럽게).
- **조작**: 거울을 **직접 잡고(pointerdown on mirror) 드래그**. 히트영역은 조작성 위해 약간 여유 있게.
- **진행**: 완료 시 짧은 연출(거울 반짝, ~0.7s) 후 `next`로 자동 진행.

## 3. 아키텍처

기존 특수 인터랙션 패턴(`mirrors`/`gauge` = 노드 타입 + `RunnerView` 메서드 + 전용 컴포넌트 `MirrorStage.tsx`)을 그대로 따른다.

### 3.1 새 노드 타입 `reveal`

`engine/types.ts`:

- `MissionNode.type`에 `"reveal"` 추가.
- 노드 필드:
  - `pairs: { before: string; after: string }[]` — `before`(공감받지 못하는, 위 캔버스) / `after`(공감받는, 아래 img). 순서대로 좌→우 슬롯.
  - `mirrorImage: string` — 거울 이미지(기존 필드 재사용).
  - `threshold?: number` — 완료 비율(기본 0.85).
  - `text?: string` — 가이드 하티 대사.
  - `next: string | null`.
- `RunnerView`에 `showReveal(node, done): void` 추가.

`engine/runner.ts`:

- `typeOf`가 `"reveal"` 반환하도록 확장.
- `go()`에서 `reveal`이면 `view.showReveal(node, () => this.advance(node))` 호출(mirrors/gauge와 동일 구조).

### 3.2 데이터 (`mission03.json`)

`m3_mirror3`를 line → reveal 로 전환:

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
}
```

기존 `images`/`noAuto`/`hideFriend`는 제거(타입 전환). `m3_mirror1`/`m3_mirror2`는 라인 노드 그대로.

### 3.3 렌더러 `player/RubReveal.tsx` (신규)

`MissionPlayer`가 `vm.stage === "reveal"`일 때 `MirrorStage`처럼 마운트. props: `pairs`, `mirrorImage`, `text`, `threshold`, `onDone`.

구조(가로 나란히, 기존 `#imageStack`과 동일 레이아웃 재사용):

- 슬롯 컨테이너(각 pair):
  - 아래: `<img>` = `after`(공감받는). 슬롯 크기를 이 이미지가 결정.
  - 위: `<canvas>` = `before`(공감받지 못하는)를 슬롯 크기에 맞춰 그림. `destination-out`으로 지움.
- 거울: `<img id="mirrorTool">` `position:absolute`, 포인터 따라 이동.
- 하티 가이드 바(대사).

동일 16:9 비율이므로 위/아래가 정확히 겹친다. 캔버스 해상도는 슬롯 표시 크기의 DPR 고려(예: 표시 px × 1). 무대는 CSS scale 되므로 좌표 변환에 `stageScale` 사용(기존 로직 재사용).

## 4. 인터랙션 상세

### 4.1 거울 잡고 드래그

- `pointerdown`이 거울(또는 여유 히트영역) 위에서 시작 → 드래그 시작.
- `pointermove`: 거울을 포인터 위치로 이동(무대 좌표, `stageScale` 나눠 보정). 이전 포인터→현재 포인터 사이를 보간해 **선분을 따라** 지운다(빠른 드래그에서 점 끊김 방지).
- 각 이동 스텝에서 거울 **렌즈 중심**의 무대 좌표를 각 캔버스 로컬 좌표로 변환. 렌즈 원(반경 R)이 그 캔버스와 겹치면 해당 캔버스에 `arc` fill(`destination-out`, 부드러운 가장자리)로 지움.
- `pointerup`/`cancel`: 드래그 종료. 거울은 마지막 위치에 머문다(추가 스트로크 가능).

렌즈 반경 R = 거울 렌더 크기 기준 비율(예: 안쪽 반경 ≈ 거울 폭 × 0.30). 상수로 두고 조정 가능.

### 4.2 진행률 추적

- 각 캔버스별로 **지워진 비율**을 계산. 성능을 위해 매 프레임 `getImageData` 전면 스캔 대신:
  - 저해상도 커버리지 그리드(예: 캔버스를 32×18 셀로 나눠, 브러시가 덮은 셀을 마킹) 또는
  - throttle된(예: 120ms) 다운스케일 알파 샘플링.
  - 구현 시 둘 중 가벼우면서 85% 판정에 충분한 쪽 선택(그리드 커버리지 우선).
- 비율 ≥ threshold(0.85) 도달 시 그 캔버스를 **전체 클리어**(짧은 페이드) → 그 슬롯 "완료".

### 4.3 완료 연출 & 진행

- 모든 슬롯 완료 시:
  - 거울 반짝 효과(기존 `sparkleBurst`/glow 재사용 가능) ~0.7s.
  - 이후 `onDone()` → 러너가 `node.next`로 진행.
- 이미 완료된 뒤 추가 입력은 무시.

### 4.4 거울 등장 연출

reveal 노드 진입 시 거울이 등장할 때 반짝이는 효과를 준다:

- **팝 인**: `opacity 0→1` + `scale 0.7→1`(약 0.4s, ease-out).
- **샤인 스윕**: 거울 위를 대각선으로 지나가는 밝은 하이라이트(가상요소 `::after` + 이동하는 linear-gradient, 약 0.7s, 등장 직후 1회).
- **반짝이 파티클**: 거울 주변에 ✨ 몇 개(기존 `MissionPlayer.sparkleBurst` 재사용, 스폰 좌표를 거울 근처로).
- **글로우 펄스**: `drop-shadow` 기반 은은한 빛 1회.

등장 연출은 진행률/조작을 막지 않는다(연출 중에도 잡고 문지를 수 있음). 사운드는 여유 시 기존 오디오 훅(`sparkle`/`reveal`)으로 추가 가능(필수 아님).

## 5. 좌표/스케일 처리

- 무대(`#stage`)는 1920×1200 내부 좌표를 CSS scale로 축소 표시. 포인터 clientX/Y → 무대 좌표: 기존 `stageScale()` 로 나눠 변환(기존 드래그 로직과 동일).
- 각 캔버스는 자기 `getBoundingClientRect()`로 로컬 좌표 계산(스케일 포함). 캔버스 내부 픽셀 좌표 = (client - rect.left) / rectScale.
- 캔버스 backing 해상도는 slot 표시 크기와 1:1(또는 ×1.5) — 지우기/샘플링 일관성 유지.

## 6. 검증

- **러너 로직**: `reveal` 타입이 `showReveal` 호출하고 `done`이 `advance`로 이어지는지(기존 `runner.test.ts` 스타일 단위 테스트 또는 수동).
- **인터랙션(Playwright)**: `?m=3`에서 `m3_mirror3`(reveal)로 진입 → 거울을 잡고 두 이미지 위를 프로그램적 포인터 드래그로 쓸어 진행률이 오르고, 85% 도달 시 자동완성, 두 장 완료 시 `m3_end`로 넘어가는지 확인.
- **시각**: 문지르는 중 아래 공감받는 이미지가 드러나는 스크린샷 확인.
- 타입체크(`tsc --noEmit`) 통과.

## 7. 범위 밖 (YAGNI)

- 되돌리기(다시 덮기), 부분 힌트, 사운드 세부(문지름 소리는 여유 시 기존 오디오 훅으로 추가 가능하나 필수 아님).
- 3장 이상 일반화는 자연히 지원되나 별도 튜닝은 하지 않음.
- 거울 위치를 "아무 데나 드래그" 모드(브레인스토밍에서 '직접 잡기'로 결정됨).

## 8. 영향 파일

- `src/scenes/planet/engine/types.ts` — `reveal` 타입/필드, `showReveal`.
- `src/scenes/planet/engine/runner.ts` — reveal 분기.
- `src/scenes/planet/player/MissionPlayer.tsx` — `stage: "reveal"` 상태 + `showReveal` 구현 + `<RubReveal>` 마운트.
- `src/scenes/planet/player/RubReveal.tsx` — 신규 컴포넌트(캔버스 긁기 + 거울 드래그).
- `src/scenes/planet/player/mission.css` — reveal 슬롯/캔버스/거울 스타일(기존 `#imageStack`/`#mirrorTool` 재사용·확장).
- `src/scenes/planet/planet1/mission03.json` — `m3_mirror3`를 reveal로 전환.
- `scenario-tools/visualize.py` — `reveal` 타입 그래프 표시(선택).
