# 행성3 미션2 — 공감 송신기 연료 채우기(3D 월드) 설계

작성일: 2026-07-11
브랜치: `feat/planet3-mission2-minigame`

## 배경

외부 Vite 앱 `D:\Work-HeartGuardians\ThreeDimenstionWorld` 의 `src/world` 는
1인칭으로 걸어다니는 3D 겨울 숲 미니게임이다. 맵에 떠 있는 말풍선(문장)에
다가가면 팝업이 뜨고 `🔋충전하기 / ⏭️건너뛰기` 를 고른다. **따듯한 말 = +1(충전),
차가운 말 = −1(방전, 최저 0)**, `passScore:5` 도달 시 "충전 완료! 공감 송신기가
켜졌어요 🎉" → 다음 단계로 넘어간다.

이 주제는 행성3 미션2 **"공감 송신기 연료 채우기"** 및 미션1 엔딩 대사("따듯한 말
연료가 필요해")와 정확히 일치한다. 이 게임을 HeartGuardiansApp(Capacitor + React 19
+ Vite, 최종 타깃 Galaxy Tab A9+ immersive APK)의 미션2 미니게임으로 이식한다.

원본은 명령형(imperative) vanilla three.js 로 작성됐고 이미 동작한다. 타깃 앱에는
`three@0.185` + `@react-three/fiber` + `@react-three/drei` 가 이미 설치돼 있다.

## 전체 흐름과 Phase 분리 (중요)

사용자가 정의한 최종 구조:

- world의 **stage1(연료 채우기) = 행성3 미션2**
- world의 **stage2(NPC 3개, 원본 미구현) = 행성3 미션3**
- 이 3D 게임이 stage1→stage2로 끊김 없이 이어지고, 다 끝나면 행성3 마지막 페이지
  노드 하나만 추가하고 종료 — 현재 "미션1·2·3 각각 별도 MissionPlayer" 구조와 다름.

이 구조 재편은 복잡하므로 **단계를 나눈다**:

- **Phase 1 (이 스펙의 범위):** world의 stage1 을 미션2에 전체화면 오버레이로
  이식. stage1 통과 → `onDone()` → 미션2 완료. 그 다음은 기존대로 미션3
  placeholder 로 진행. 동작하는 마일스톤 확보.
- **Phase 2 (다음 작업, 이 스펙 범위 밖):** stage1=미션2 / stage2=미션3 연속 흐름 +
  행성3 단일 엔딩으로 구조 재편. stage2(NPC) 구현 포함.

## 결정 사항 (확정)

| 항목 | 결정 |
|---|---|
| 이식 방식 | B — 명령형 three.js 코드를 React 컴포넌트 하나로 감싼다(재작성 아님) |
| 레이아웃 | 전체화면 오버레이. 단, `#stage` 안에서 **배경 바로 위 레이어**(z-index 1), 미션 스테퍼(z-index 5)는 그 위에 계속 보임 |
| 범위 | Phase 1 = stage1(연료 채우기)만. stage2/NPC stub 로직 제외 |
| 좌상단 힌트 패널 + 홈 링크 | 제거 |
| 미니맵·조이스틱·연료 게이지 | 유지 |
| 문장 데이터 / passScore | 원본 그대로 유지(착한 말 12 + 차가운 말 5, passScore:5) |
| UI 스타일 | world 원본(다크 글래스·크림 카드 팝업) 유지 |

## 완료 조건

착한 말 5개 수집(`passScore:5`) → "충전 완료 🎉" 팝업 **"다음으로"** 버튼 →
`onDone()` 호출 → 미션2 완료. (원본의 `startStage2` stub 는 호출하지 않고
`onDone` 으로 대체한다.)

## 파일 구조

```
src/scenes/planet/planet3/
  EmpathyFuelGame.tsx        미니게임 React 래퍼. props: { onDone: () => void }
  EmpathyFuelGame.css        world style.css 이식(좌상단 힌트 패널 규칙 제거)
  world/                     이식된 엔진 모듈(planet3 격리)
    hexgrid.ts               순수 좌표 로직 (+ hexgrid.test.ts)
    collision.ts             순수 충돌/도달성 (+ collision.test.ts)
    playermove.ts            순수 이동/슬라이드 (+ playermove.test.ts)
    collectgame.ts           순수 점수 상태머신 + 데이터 검증 (+ collectgame.test.ts)
    joystick.ts              가상 조이스틱 위젯 + joystickVector (+ joystick.test.ts)
    worldbuild.ts            지형/장애물/기념비 배치, walkable 계산, 눈
    bubbles.ts               말풍선 3D 표현(빌보드·근접감지)
    player.ts                1인칭 컨트롤러
    minimap.ts               북향 미니맵 캔버스 위젯
    scorehud.ts              연료 게이지 HUD
    stages.ts                단계 매니저(stage1) — onPass → onComplete 콜백
    popup.ts                 아이 친화 모달(선택/안내/피드백) — 명령형 DOM 유지
    mountWorld.ts            원본 main.js 이식: 렌더러/씬/조명/루프/입력 조립.
                             시그니처 mountWorld(container, { onComplete }): () => void (dispose)
    assets.ts                GLB URL 맵 + 문장 데이터 import
```

- 순수 로직 모듈(hexgrid/collision/playermove/collectgame/joystick)은 THREE 비의존이며
  원본 vitest 테스트를 함께 이식한다.
- `popup.ts` 는 명령형 DOM(`document.createElement`) 그대로 유지하되, 컴포넌트가
  넘겨주는 uiRoot(래퍼 내부 ref div)에 append 한다.

## 컴포넌트 계약 (EmpathyFuelGame.tsx)

```
props: { onDone: () => void }
```

- 루트: `<div className="efg-overlay">` — `position:absolute; inset:0; z-index:1`.
  (미션 배경 `#bg` z-index 0 바로 위, 스테퍼 `#progress` z-index 5 아래.)
- 내부에 `<canvas>` (게임 뷰) + 게임 UI 컨테이너(조이스틱·미니맵·HUD·팝업의 uiRoot).
- `useEffect(() => { const dispose = mountWorld(containerRef.current, { onComplete: onDone }); return dispose; }, [])`
- StrictMode 이중 마운트에도 안전하도록 dispose 가 모든 리소스/리스너를 해제한다.

## 레이어 & 캔버스 사이징 (핵심 통합 지점)

- 미니게임은 MissionPlayer 의 `#stage`(1920×1200, `useFitStage` 로 CSS `transform:
  scale()` 축소) 안에 렌더된다(현재 `MiniGame` 렌더 위치와 동일).
- CLAUDE.md 원칙: transform 걸린 무대의 자식은 `position:fixed` 가 뷰포트가 아닌
  무대 기준이 된다. 따라서 오버레이는 `position:absolute; inset:0` 으로 무대를 채우고,
  **모든 게임 UI 좌표계는 무대(1920×1200) 기준**으로 둔다.
- 원본은 `window.innerWidth/innerHeight` + `window resize` 로 캔버스를 잡는다. 이식 시
  **오버레이 엘리먼트 크기(ResizeObserver)** 기준으로 바꾼다. `renderer.setSize(rect.w,
  rect.h)`, `setPixelRatio(Math.min(devicePixelRatio, 1.5))` 유지.
- 카메라 aspect 도 오버레이 rect 기준으로 갱신.
- **리스크/튜닝:** 미니맵(우상단 16px)이 미션 스테퍼(상단)와 겹칠 수 있음. 빌드 중
  실제 화면에서 위치를 미세조정한다. z-index 세부값도 빌드 중 확정(게임 UI가
  스테퍼 아래이되 배경 위인지 확인).

## 에셋 이식

원본 `worldbuild.ts`/`bubbles.ts` 가 참조하는 GLB (11 + 말풍선 1 = 12개, ~700KB):

| 역할 | 원본 경로 | 타깃(개명·무공백) |
|---|---|---|
| 바닥 타일 A/B | `Grounds Platforms/Hex 01A/B.glb` | `hex-01a.glb`, `hex-01b.glb` |
| 나무 4종 | `Nature/Tree 01, 02A, 02B, 02C.glb` | `tree-01.glb`, `tree-02a/b/c.glb` |
| 바위 3종 | `Rocks/Rock 01.glb`, `Snow Rock 01/02.glb` | `rock-01.glb`, `snow-rock-01/02.glb` |
| 가장자리 바위 | `Rocks/Snow Rock Cluster 03.glb` | `snow-rock-cluster-03.glb` |
| 기념비 | `Buildings/Stone Monument 01 Lit.glb` | `stone-monument-01-lit.glb` |
| 말풍선 | `Custom/Speech_bubble.glb` | `speech-bubble.glb` |

- 배치 위치: `public/assets/planet3/world/models/`. CLAUDE.md 규칙(영문·무공백) 준수.
- 로딩: `import.meta.glob` 대신 **명시적 URL 맵**(`assets.ts`) — 파일 수가 적어 더 명확.
  각 모듈은 assets.ts 의 URL 상수를 import 한다.
- `GLTFLoader` 는 `three/addons/loaders/GLTFLoader.js` 에서 import(타깃 three@0.185 호환).

## 데이터 이식

- `public/world/stage1-sentences.json` 의 내용을 `world/stage1-sentences.json` 으로
  옮기고 **JSON import** 로 읽는다(원본의 `fetch('/world/...')` 제거 — Capacitor
  네트워크 경로 이슈 방지). `stages.ts` 의 start() 에서 import 한 데이터를 바로 사용.
- 문장/passScore 는 원본 그대로.

## 라이프사이클 / 정리 (dispose)

`mountWorld` 가 반환하는 dispose 는 다음을 모두 해제한다:

- `renderer.setAnimationLoop(null)`, `renderer.dispose()`.
- 씬 geometry/material/texture dispose(말풍선 공유 리소스 포함), InstancedMesh dispose.
- `keydown` / `keyup` / `blur` / `contextmenu` window 리스너 제거.
- ResizeObserver disconnect.
- 조이스틱/미니맵/HUD/팝업 DOM 제거.

## 미션 배선

- `mission02.json`: `p3_m2_play` 노드 `game`: `"placeholder"` → `"empathyFuel"`.
- `index.tsx`: mission2 의 `games` 를
  `{ empathyFuel: ({ onDone }) => <EmpathyFuelGame onDone={onDone} /> }` 로 교체.
  `PlaceholderGameStage` import 제거(미션3에서 아직 쓰면 유지).
- 하티 대사(현재 "(임시)"): 연료 테마로 짧은 실제 문구 작성.
  - `p3_m2_intro`: 미션2 진입 시 하티가 연료 채우기 미션을 소개(1~2문장).
  - `p3_m2_end`: 충전 성공 반응(1문장) + `completeBanner:"미션 완료!"`(기존 유지).
  - 게임 규칙 설명은 world 자체 인트로 팝업이 담당(중복 회피).
- `MISSION02_THEME`: 배너 `pill/title/ribbon` 을 연료 테마 실제 문구로 갱신
  (현재 "(임시) 미션 2"/"안개 행성 미션 2 골격"). 배경은 `ice-planet-bg.png` 유지.

## 테스트

- 순수 로직 모듈의 vitest 테스트 이식: `collectgame.test`, `collision.test`,
  `hexgrid.test`, `joystick.test`, `playermove.test`. 타깃도 `vitest run` 사용.
- three/DOM 의존 모듈(worldbuild/bubbles/player/minimap/stages/mountWorld)은
  실기(브라우저/태블릿) 검증으로 확인 — 단위 테스트 대상 아님.

## 검증

- DEV: `?stage=mission2`(또는 `?m=2`)로 미션2 직접 진입 → 인트로 → 3D 월드 →
  걸어다니며 문장 충전 → passScore 도달 → onDone → 미션3 placeholder 진입 확인.
- 레이어: 게임이 배경 위·스테퍼 아래로 보이는지, 미니맵/스테퍼 겹침 확인.
- 정리: 미션 이탈/재진입 시 리스너·WebGL 컨텍스트 누수 없는지 확인.
- 최종: 태블릿 APK immersive 에서 프레임/터치 조이스틱 동작 확인(Phase 1 완료 기준).

## 범위 밖 (Phase 2 이후)

- stage2(NPC 3개) 구현.
- stage1=미션2 / stage2=미션3 연속 월드 구조 재편, 행성3 단일 엔딩 노드.
- 에셋 추가 최적화(현재 ~700KB 로 충분히 작음).
