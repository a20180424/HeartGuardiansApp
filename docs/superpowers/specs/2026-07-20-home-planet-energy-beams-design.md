# Home 완료 행성 에너지 빔 연결 — 설계

날짜: 2026-07-20 · 씬: `www/home/`

## 목적

Home 화면에서 **완료된 행성**과 화면 상단 중앙의 **하트커넥트(모선)** 오브젝트를
글로우 에너지 빔으로 잇는다. "공감 에너지가 모선으로 모인다"는 테마를 시각화하고,
진도(progress)를 한눈에 보이게 한다.

## 현재 레이아웃 (사실)

- 스테이지 `#stage`: 1280×800 CSS px. 인라인 `fitStage()`가 transform으로 축소·확대.
- 모선 `.home-mothership`: `#home` 안 절대배치. `top:150px`, `left:50%`(가로 중앙),
  `width:230px`, `height:auto`. 기존 `drop-shadow(0 0 14px rgba(80,170,255,.55))` 글로우.
- 행성 `.home-planets`: `position:absolute; bottom:210px`, flex 가로 중앙 정렬,
  각 `.home-planet` 312×336, gap 10px. `planetState(id, progress)` →
  `completed`(id ≤ progress) / `unlocked`(id === progress+1) / `locked`.
- 완료 행성 수 = progress (0~4). progress 0 → 빔 0개, 4 → 빔 4개.

## 설계

### SVG 오버레이
- `#home`에 SVG 한 장 추가. `viewBox="0 0 1280 800"`, `preserveAspectRatio="none"` 없이
  1:1, `position:absolute; inset:0; pointer-events:none`, z-index는 배경 위·버튼 뒤.
- 완료 행성마다 `<line>` 2겹을 넣는다(아래 비주얼).

### 좌표 계산 (스케일 안전)
fitStage가 `#stage`를 transform scale로 줄이므로, `getBoundingClientRect`가 주는 화면 px를
1280 좌표계로 되돌려 그린다.
```
const homeRect = home.getBoundingClientRect();
const scale = homeRect.width / 1280;            // 현재 스케일
const toVB = (r) => ({
  x: (r.left + r.width / 2 - homeRect.left) / scale,
  y: (r.top  + r.height / 2 - homeRect.top ) / scale,
});
```
- **앵커:** 모선 중심 한 점(모선 rect의 center-x, center-y) → 각 완료 행성 버튼 center.
  실측이라 모선 `height:auto`·flex 정렬에 영향받지 않는다.

### 비주얼 — 글로우 에너지 빔
빔 하나 = 같은 두 점을 잇는 `<line>` 2겹:
1. **베이스 글로우:** stroke-width ~6, 반투명 청록, `feGaussianBlur` 필터로 발광.
   연속감(끊겨 보이지 않기) 담당.
2. **흐르는 펄스:** stroke-width ~3, 밝은 청록, `stroke-dasharray` + `stroke-dashoffset`
   애니메이션으로 대시가 **행성→모선 방향**으로 흘러간다(에너지가 모선으로 빨려드는 느낌).

색은 모선 글로우(`rgba(80,170,255)`)·unlocked 헤일로(`rgba(120,200,255)`)와 같은 청록 계열.

### 갱신 타이밍
`drawBeams()`를 다음에 호출해 재계산:
1. 최초 렌더 직후(`requestAnimationFrame`)
2. 모선 이미지 `onload`(height 확정 후 앵커 정확)
3. `window` `resize`(fitStage 재적용과 함께)

## 범위 밖 (YAGNI)
- 행성끼리 잇는 체인, 빔 클릭 인터랙션, 사운드. "모선↔완료행성 선 + 은은한 흐름"만.

## 변경 파일
- `www/home/script.js` — SVG 생성 + `drawBeams()` 배선.
- `www/home/style.css` — 빔/펄스 keyframes, 필터.
- 페이지 독립 원칙: home에만 국한(공통 블록 아님).

## 검증
- playwright로 `home/?prog=0..4` 각각 스크린샷: 완료 개수만큼 빔, 정렬 정확, 콘솔 에러 0.
- 애니메이션 세기(대시 속도·발광)는 스크린샷 보며 튜닝.
