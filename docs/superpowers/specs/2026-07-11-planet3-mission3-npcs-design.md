# 행성3 미션3 (stage2) — 감정을 녹이는 NPC 3명

## 배경

행성3의 3D 얼음 숲 월드는 stage1(미션2·연료 채우기)과 stage2(미션3)를
한 씬에서 이어서 진행한다. stage1 통과 팝업이 이미 *"이제 얼어붙은 마음을
녹이러 가자!"* 라고 안내하며 stage2로 전환한다
([stages.ts](../../../src/scenes/planet/planet3/world/stages.ts)).

현재 stage2는 배선만 돼 있고 실제 콘텐츠 대신 임시 완료 버튼(`st2-temp-done`)만
띄운다. 이 스펙은 그 자리에 **감정을 녹이는 NPC 3명** 콘텐츠를 채운다.

외부 레퍼런스 `BunnyBlenderWork/threejs_test/`의 GLB 3개(`bunny_01~03_facebaked.glb`)와
`index.html`을 참고한다. 각 GLB에는 애니메이션 클립 `lv0`(우울) ~ `lv3`(신남)
4단계가 들어 있고, 레퍼런스는 모든 클립을 weight 0으로 재생해 두고
`crossFadeTo(to, 1.2)` 로 단계를 부드럽게 전환한다.

## 목표

플레이어가 넓은 월드에 흩어진 우울한 NPC 3명을 찾아가, 각 NPC와 3라운드 대화를
하며 공감하는 따듯한 말을 골라 감정을 lv0 → lv3까지 녹여준다. 3명 모두 lv3에
도달하면 미션3 완료(`onComplete`) → 미션2 마지막 노드(p3_m2_end) → 홈으로 흐른다.

## 게임 규칙 (확정)

- **상호작용**: NPC에 근접하면 그 NPC의 고민 대사가 팝업으로 뜬다.
- **선택지**: 2지선택(따듯한 말 / 차가운 말). stage1 문체·톤과 맞춘다.
  - 따듯한 말(정답) → 감정 +1단계, 다음 라운드로. 짧은 긍정 피드백.
  - 차가운 말(오답) → 감정 변화 없음(제자리), 짧은 피드백 후 **같은 라운드 재시도**.
    아이가 좌절 없이 계속 진행하게 한다.
- **라운드**: NPC 1명당 3라운드. 따듯한 말 3번 → lv0→lv1→lv2→lv3.
- **완료**: 3명 모두 lv3 → 축하 팝업 → `onComplete()`.
- **길찾기**: NPC 3명을 서로 떨어진 걷기 가능 지점에 분산 배치. 미니맵에 NPC 마커
  표시(감정 미완료=파란 점, lv3 완료=색/모양 변경). stage1 말풍선 마커 패턴 재사용.

## NPC 사연 (확정 컨셉)

세 NPC는 서로 다른 감정 상황을 가진다(대사 초안은 구현 시 작성, stage1 톤 유지):

1. **외로움** — 아무도 자기를 안 좋아한다고 느끼는 NPC.
2. **위축** — 실수를 해서 주눅 든 NPC.
3. **속상함** — 친구와 다툰 뒤 속상한 NPC.

## 아키텍처

stage1이 이미 쓰는 **"순수 로직 / 3D 렌더 분리"** 패턴을 그대로 따른다.
(`collectgame.ts` 순수 로직 + `bubbles.ts` 3D). stage2도 동일하게 나눠
애니메이션 mock 없이 상태머신을 단위 테스트할 수 있게 한다.

### 신규/변경 파일

| 파일 | 종류 | 역할 |
|------|------|------|
| `public/assets/planet3/world/models/npc-01~03.glb` | 에셋(신규) | 외부 GLB 3개를 영문 rename 후 반입 |
| `world/stage2-npcs.json` | 데이터(신규) | NPC 3명 × 3라운드 대사 + 배치 좌표 |
| `world/npcgame.ts` | 순수 로직(신규) | NPC 상태머신(round/level/완료) — 테스트 대상 |
| `world/npcgame.test.ts` | 테스트(신규) | 라운드 진행·완료 조건 단위 테스트 |
| `world/npcs.ts` | 3D(신규) | GLB 로드·배치·감정 crossfade·근접·미니맵 좌표 |
| `world/popup.ts` | 변경 | `showDialogue`(2버튼 커스텀 라벨) 추가 |
| `world/stages.ts` | 변경 | `startStage2()` 를 임시 버튼 → NPC 콘텐츠로 교체, `npcPoints()` 추가 |
| `world/minimap.ts` | 변경 | NPC 마커 렌더 추가 |
| `world/mountWorld.ts` | 변경 | 루프에서 `stages.npcPoints()` 를 미니맵에 전달 |
| `world/assets.ts` | 변경 | npc GLB URL 3개 + stage2 데이터 export |

### 데이터 형식 — `stage2-npcs.json`

```jsonc
{
  "npcs": [
    {
      "id": 1,
      "q": 0, "r": 0,          // 걷기 가능한 axial 좌표(분산 배치)
      "name": "외로운 토끼",
      "rounds": [
        {
          "prompt": "아무도 나랑 놀아주지 않아…",   // NPC 고민(팝업 상단)
          "warm": "내가 네 친구가 되어줄게",         // 정답 → 감정 +1
          "cold": "그럴 만도 하네",                  // 오답 → 제자리
          "feedback": "정말…? 조금 따뜻해졌어"        // 정답 시 피드백
        }
        // 3라운드
      ]
    }
    // NPC 3명
  ]
}
```

### `npcgame.ts` (순수 상태머신)

```ts
createNpcGame(data): {
  // 각 NPC의 round(0..2), level(0..3) 을 내부 상태로 추적
  choose(npcId, warm): {
    level: number;      // 갱신된 감정 단계(0..3)
    accepted: boolean;  // warm 이었는지(감정이 올랐는지)
    roundDone: boolean; // 이번 선택으로 다음 라운드로 넘어갔는지
    npcDone: boolean;   // 이 NPC가 lv3 도달했는지
    allDone: boolean;   // 세 NPC 모두 완료됐는지
    prompt: string;     // 다음(또는 재시도) 라운드 프롬프트
    feedback: string | null;
  };
  levelOf(npcId): number;
  isDone(npcId): boolean;
  // 데이터 검증 경고(좌표·라운드 수 등)
  warnings: string[];
}
```

warm=false(오답)면 level·round 불변, `accepted=false`, `feedback`은 짧은 오답 문구,
같은 `prompt` 재반환. warm=true면 level+1·round+1, round가 3이 되면 `npcDone=true`.

### `npcs.ts` (3D·감정 애니메이션)

레퍼런스 crossfade 기법을 이식한다. `bubbles.ts`의 bbox 정규화·리소스
공유·dispose 패턴을 재사용한다.

```ts
createNpcs(scene, npcDefs, { size }): Promise<{
  update(dt, camera): void;            // 모든 mixer 갱신 + Y축 빌보드(플레이어 바라보기)
  nearest(px, pz, radius): NpcDef|null;// 근접 감지
  setLevel(id, level): void;           // crossFadeTo(lvN, 1.2) 로 감정 전환
  points(): { x, z, level }[];         // 미니맵 좌표 + 현재 감정 단계
  clear(): void;                       // 씬 제거 + geometry/material dispose
}>
```

- 로드 시 각 NPC의 4클립을 전부 `play()` + `setEffectiveWeight(0)`, `lv0`만 weight 1.
- `setLevel(id, lv)` 는 현재 액션 → 목표 액션으로 `crossFadeTo(1.2)`.
- `update`의 mixer 갱신은 mountWorld의 기존 루프 `stages.update(dt)` 경로를 탄다.
- GLB는 무압축이라 stage1처럼 평범한 `GLTFLoader` 로 충분.

### `stages.ts` — `startStage2()` 교체

임시 버튼 코드를 제거하고:
1. `ctx.onStage2Enter()` 호출(스테퍼 미션3 전환) — 기존 유지.
2. `createNpcs(scene, data.npcs, { size })` 로 NPC 로드·배치.
3. `createNpcGame(data)` 로 상태머신 생성.
4. `update()`에 stage1과 같은 근접 로직 추가: 팝업 안 열려 있고 근접 NPC가
   있으면 `showDialogue` 오픈.
5. 선택 결과를 `npcGame.choose` → `npcs.setLevel` 애니메이션 + 피드백.
   `allDone` 이면 축하 `showInfo` → `onComplete()`.
6. `npcPoints()` 메서드 추가(미니맵용). 반환 객체에 노출.

update()는 stage1(bubbles)과 stage2(npcs) 중 활성 단계만 처리하도록 분기한다
(둘은 시간상 겹치지 않음 — stage1 정리 후 stage2 시작).

### `popup.ts` — `showDialogue`

```ts
showDialogue(parent, prompt, warmLabel, coldLabel, onChoose: (warm)=>void): HTMLElement
```

`showChoice`와 구조는 같지만 두 버튼 라벨을 인자로 받는다(기존 showChoice는
"충전하기/건너뛰기" 고정). 팝업 badge는 NPC 이모지(예: 🐰).

### 미니맵 — `minimap.ts` / `mountWorld.ts`

`update` 시그니처에 NPC 마커 배열을 추가한다:
`update(px, pz, yaw, bubbles, npcs?)`. npc는 `{x, z, done}` — 미완료는 파란 점,
`done`(lv3)은 색/모양 변경(예: 초록/하트색). mountWorld 루프에서
`stages.npcPoints()` 를 넘긴다. stage1 말풍선 마커와 공존(둘 다 빈 배열 가능).

## 라이프사이클 / 정리

- `dispose()`(mountWorld) 시 stage2의 NPC 리소스도 정리돼야 한다. stages 매니저가
  `clear`/`dispose` 훅을 통해 `npcs.clear()` 를 호출하거나, 씬 전체 dispose
  (`disposeSceneResources`)에 얹는다. bubbles.ts처럼 공유 geometry/material은
  한 번만 dispose.
- StrictMode 이중 마운트 가드(`disposed`)는 기존 mountWorld 로직을 그대로 활용.

## DEV 편의

기존 `?m=2&stage2=1` 경로가 stage2를 바로 시작하므로 개발·검증에 그대로 쓴다
([index.tsx](../../../src/scenes/planet/planet3/index.tsx), `devStartStage`).

## 검증

- **단위**: `npcgame.test.ts` — 정답/오답 시 level·round 전이, npcDone/allDone 조건,
  데이터 검증 경고. (`collectgame.test.ts` 와 짝)
- **타입/빌드**: `tsc -b` (repo 관례; `tsc --noEmit` 는 아무것도 안 봄).
- **실제 구동(필수)**: Playwright MCP로 `?m=2&stage2=1` 진입 → NPC 3명 대화 →
  감정 상승 애니메이션 → 3명 완료 → `onComplete` → p3_m2_end 확인. 스크린샷으로
  배치·미니맵 마커·감정 애니메이션 육안 확인.

## 범위 밖 (YAGNI)

- 감정을 내리는 오답(하락 애니메이션) — 오답은 제자리로 확정.
- NPC 이동/AI — 정적 배치.
- 음성/사운드.
- stage1 로직 변경 — 손대지 않는다.
