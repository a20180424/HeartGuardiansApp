# 행성4 미션3 "하트 커넥트 : 마지막 연결" 이식 설계

- 작성일: 2026-07-18
- 브랜치: `feat/planet4-mission3`
- 원본: `mytemp/그림자 행성 미션3 게임/index.html` (루트, 40KB — 최종 완성본)
- 관련 메모리: `planet4-mission2-courage-compass`, `apk-size-assets`, `progress-save-wiring`, `verify-in-browser`

## 개요

행성4(그림자 행성)의 마지막 미션이자 **게임 전체의 대미**. 모든 행성의 공감 원석 5개를
하나로 이어 공감 다이아몬드를 완성하고, 엔딩 영상 → 후일담 → 성공 화면으로 마무리한다.

원본은 자체완결 단일 HTML(1280×800, `--scale` letterbox)이며, 5원석 퀴즈 뒤에
**엔딩 영상 → 지구/학교/교실 크로스페이드 타이핑 후일담 → 성공 배너**라는 긴 시네마틱
피날레가 붙는다. mission2(CourageCompass) 이식 관례를 따르되, 피날레는 원본 그대로 보존한다.

### 확정된 결정(브레인스토밍)

1. **피날레 범위**: 엔딩 영상(19MB) + 후일담 + 성공 화면을 **원본 그대로 전부** 보존. APK 크기 증가 감수.
2. **인트로 처리**: 원본 타이틀 스테퍼는 버리고 엔진 상단 스테퍼 배너를 쓴다. 단, 원본 스토리 화면(하티 대사 3줄)은
   **원본 룩 그대로** 미니게임 `story` phase로 이식한다(엔진 line 노드로 그리지 않는다 — 엔진 말풍선 DOM은
   "1/3" 진행표시·중앙 대형 박스·중앙 상단 하티 등 원본 요소를 못 만듦). 엔진 배너 노드 하나(원본 타이틀 화면의
   하티 설명 대사 담당) → 미니게임 story phase(원본 스토리 화면)로 매핑.
3. **컴포넌트 경계**: A안(얇은 엔진 래퍼). 미니게임이 **스토리~피날레 전체**를 자체 배경으로 소유.
4. **스테퍼 표시**: 퀴즈 phase까지 엔진 스테퍼 유지, 피날레(영상 이후)에서 페이드아웃(불투명 전체화면이 자연히 가림).
5. **에셋 최적화**: 이번 작업에서는 하지 않음. 미션3 완료 후 전체 게임 대상 별도 패스에서 진행.

## 아키텍처

### 컴포넌트 경계

| 담당 | 범위 |
|---|---|
| 엔진 노드(`mission03.json`) | 상단 미션 스테퍼 배너 + 타이틀 화면 하티 설명 대사(배너 노드 1개) |
| `HeartConnectStage` | 스토리 인트로(원본 룩) → 5원석 퀴즈 → 엔딩 영상 → 후일담 크로스페이드 → 성공 배너 화면(자체 배경 소유) |
| `index.tsx onExit` | `completePlanet(4)` + 홈 이동 |

mission2와 다른 점: 미니게임이 **여러 전체화면 phase와 자체 배경**을 가진다(mission2는 투명 단일화면).
원본이 화면마다 고유 배경(영상=검정, 후일담=지구/교실, 성공=Background01)을 쓰기 때문이다.
단, **퀴즈 phase 배경만은** 원본처럼 미니게임이 칠하지 않고 엔진 `#bg`(heart-connect-interior-bg)로
깔아 투명 미니게임 + 스테퍼가 그 위에 오게 한다(mission2와 동일 레이어링).

### 파일

**신규 (`src/scenes/planet/planet4/`)**
- `HeartConnectStage.tsx` — 미니게임 컴포넌트(phase 머신)
- `HeartConnectStage.css` — 원본 인라인 CSS 이식(1280×800 px 절대배치)
- `heartConnect.data.ts` — 5원석 미션 데이터, 스토리/후일담/최종 타이핑 대사, 에셋 경로 상수

**수정**
- `mission03.json` — 임시 골격(2노드) → 배너 노드 1개(`p4_m3_intro`) + minigame 노드(`p4_m3_play`)
- `theme.ts` — `MISSION03_THEME` 배경/배너 리본 실제 값, `heartConnect` 배선
- `index.tsx` — mission3에 `games`·`steps`·`scopeClass` 추가, `onExit`에 `completePlanet(4)`
- `public/assets/planet4/` — 원본 에셋 19개 영문명 반입

## 엔진 노드 흐름 (`mission03.json`)

```
p4_m3_intro   (line, bannerNode) — 원본 타이틀 화면 설명 대사(하티)
                 "다섯 공감 원석을 깨워 공감 다이아몬드를 완성하자!
                  마음과 마음이 연결될 때 하트 커넥트는 빛날 수 있어."
     ↓
p4_m3_play    (minigame: heartConnect, next: null)
```

- 모든 노드 `hideFriend: true`, `noAuto: true`(mission2 관례 — 하티만 말하고 클릭으로 진행).
- `p4_m3_intro`가 `bannerNode` → 상단 스테퍼 배너 + 타이틀 배너 강조. 엔진 하티 스프라이트 + 말풍선(우리 스타일)로
  타이틀 화면 설명 대사를 말한다(원본 타이틀 화면의 `.speech`에 대응).
- 원본 **스토리 화면(하티 대사 3줄)은 엔진 노드가 아니라 미니게임 `story` phase**가 원본 룩 그대로 그린다(아래 phase 머신 참고).
- `p4_m3_play`가 종착점(`next: null`). 미니게임이 성공 화면·"우주선으로 이동" 버튼까지 소유하므로
  mission2에 있던 `completeBanner`/보상카드 엔진 end 노드는 두지 않는다 — 원본 성공 배너가 그 역할.
- **엔진 완료 버튼 우회(중요)**: 엔진의 `showNext`(완료 버튼)는 `fx_light_return` 커맨드에서만 켜진다
  (`MissionPlayer.tsx` `lightReturn` case). 미니게임이 종착 노드면 `onDone`→`finishMinigame`→`end()`는
  `showNext`를 켜지 않아 엔진 완료 버튼이 뜨지 않고 `onExit`도 발화하지 못한다. 따라서 원본 성공 화면의
  "우주선으로 이동" 버튼은 엔진 완료 버튼을 거치지 않고 **직접 홈으로** 보낸다 — `index.tsx`에서 미니게임에
  홈 이동 콜백(`completePlanet(4)` + `nav("/home")`)을 `onDone`으로 직접 넘긴다(엔진 `finishMinigame`은
  쓰지 않음. 미션이 미니게임에서 끝나 이후 엔진 화면이 없으므로 안전). `p4_m3_play`에는 `fx_light_return`을 넣지 않는다.
- `index.tsx`의 기존 `finish={{ label: "우주선으로 이동" }}`는 미니게임 성공 화면과 중복이므로 제거.

## `HeartConnectStage` phase 머신

```
phase: "story" → "quiz" → "video" → "epilogue" → "success"
```

인터페이스: `HeartConnectStage({ onDone }: { onDone: () => void })`

### 0. `story` (스테퍼 보임) — 원본 `storyScreen`
- 원본 `storyScreen` DOM/CSS를 픽셀 단위로 이식: 중앙 상단 하티(`story-hati`, 등장/교체 애니메이션) +
  하단 중앙 대형 대사 박스(`hati-dialogue-box`, 청록 글로우, 스피커 알약, "1/3" 진행표시, 중앙정렬 타이핑, "▶").
- 하티 대사 3줄(`heartConnect.data.ts`), 줄마다 하티 교체(고민→제안→기본, 원본 `storyLine()`).
- 클릭/Enter로 진행, 타이핑 중이면 즉시 완성(원본 `advance()`). 3줄 끝 → `quiz` phase.
- 배경은 엔진 `#bg`(투명 위) → 상단 스테퍼 유지.

### 1. `quiz` (스테퍼 보임) — 원본 `gameScreen`
- 중앙 공감 다이아몬드 코어 + 5개 원석 노드 + SVG 연결선.
- 오른쪽 미션 패널: 원석별 3지선다 질문 5개(`heartConnect.data.ts`).
- 정답 → 해당 원석 노드·연결선 점등, 진행바 갱신, 하티 피드백.
- 오답 → 흔들고 재시도(패널티 없음, 원본 로직).
- 5개 완료 → 코어 점등 → `flash` 연출 → `video` phase.
- 미션 패널·상단 크롬은 엔진 스테퍼(좌상단)와 겹치지 않게 **오른쪽 배치**(mission2 관례).

### 2. `video` — 원본 `videoScreen`
- 전체화면 `heart-connect-ending.mp4` 재생(불투명 검정 → 스테퍼 자연 가려짐 = 페이드아웃 효과).
- 재생 끝 → "복원 완료 확인" 버튼 → `epilogue`.
- 자동재생 실패 시 muted 폴백(원본 로직 유지).

### 3. `epilogue` — 원본 `postRecoveryScreen`
- 배경 크로스페이드: earth-1→2→3 → school → classroom.
- 하티 후일담 타이핑 6줄, 클릭/Enter로 진행. 배경 전환 타이밍은 원본 타이머 유지.

### 4. `success` — 원본 `endingScreen`
- success-bg 위 타이틀 로고 + "탐험대 성공" 배너 + 반짝임.
- 최종 타이핑 2줄("공감 탐험은 끝난 것이 아니야" …).
- **"우주선으로 이동" 버튼 → `onDone()`** → 엔진 시나리오 종료 → `onExit`.

### 타이머·입력 처리
- 원본은 다수 `setTimeout`/`setInterval` 사용. mission2 관례대로 `timers.current[]` + cleanup effect로
  언마운트 시 전부 해제(누수 방지).
- 원본은 `document.keydown`(Enter/Space)으로 진행. 엔진과 충돌 없게 미니게임 phase 동안만
  리스너를 붙이고 cleanup에서 제거한다.

## 에셋 반입 (`public/assets/planet4/`)

미니게임/엔진이 실제 쓰는 것만 반입하고 영문명으로 변경. 인트로용 원본 이미지는 엔진 하티 스프라이트로 대체.

| 용도 | 원본 | → 영문명 |
|---|---|---|
| 엔진 #bg(인트로·퀴즈) | 하트 커넥트 내부 배경.png | `heart-connect-interior-bg.png` |
| 스토리 하티(1줄) | 고민하는 하티.png | `hati-pondering.png` |
| 스토리 하티(2줄) | 제안하는 하티.png | `hati-proposing.png` |
| 퀴즈 코어 | 공감 다이아몬드.png | `empathy-diamond.png` |
| 원석1 | 행성1-이해의 사파이어.png | `gem-sapphire-understanding.png` |
| 원석2 | 행성2-관찰의 호박석.png | `gem-amber-observation.png` |
| 원석3 | 행성2- 경청의 토파즈.png | `gem-topaz-listening.png` |
| 원석4 | 행성2- 표현의 루비.png | `gem-ruby-expression.png` |
| 원석5 | 행성4-용기의 에메랄드.png | `gem-emerald-courage.png` |
| 스토리(3줄)·퀴즈 피드백·후일담 하티 | 기본 하티.png | `hati-default.png` |
| 엔딩 영상 | 엔딩 동영상.mp4 (19MB) | `heart-connect-ending.mp4` |
| 후일담 배경 | 지구1/2/3.png | `earth-1/2/3.png` |
| 후일담 배경 | 학교.png | `school.png` |
| 후일담 배경 | 교실.png | `classroom.png` |
| 성공 배경 | Background01.png | `success-bg.png` |
| 성공 타이틀 로고 | TitleBanner.png | `title-banner.png` |
| 성공 배너 | 탐험 대 성공 배너.png | `mission-success-banner.png` |

반입 합계 19개(하티 스프라이트 3종 포함).

**제외(미사용 또는 엔진 대체):** 공감에너지 아이콘.png(미사용), 엔딩 교실.png(최종 흐름 미사용),
하트 커넥트 우주.png·설명하는 하티 로봇2.png(원본 타이틀 화면 전용 — 엔진 배너 노드가 엔진 하티
스프라이트로 대체). 구현 중 실제 참조를 재확인해 확정한다.

**최적화:** 이번 작업 범위 밖. 미션3 완료 후 전체 게임 대상 별도 패스에서 PNG/영상 최적화 진행.

## 진도 저장 (`index.tsx`)

mission3 = 최종 행성 마지막 미션 = 게임 전체 완료 지점. planet1~3 관례:

```tsx
onExit={() => {
  completePlanet(4); // 낙관적 로컬 갱신 + 백그라운드 저장(논블로킹)
  nav("/home");
}}
```

현재 planet4 index.tsx는 `completePlanet(4)` 없이 `nav("/home")`만 있어 **누락 상태** — 이번에 배선한다.

## 테스트 & 검증

- `missions.test.ts` — mission03 노드 그래프 유효성 갱신(기존 planet4 테스트 관례).
- `heartConnect.data.ts`의 5문항 `correct` 인덱스 정합성 단위 테스트.
- 브라우저 실검증: `tsc -b` 후 `#/planet/4?m=3`로 인트로(배너)→스토리→퀴즈→영상→후일담→성공→홈 전 구간을
  playwright로 실제 구동. 스토리·퀴즈까지 스테퍼가 보이고 피날레에서 가려지는지, 스토리 박스가 원본 룩("1/3"·타이핑·"▶")대로
  나오는지, 영상 재생·타이머 정리(누수 없음)까지 확인. DEV 점프 파라미터로 반복 검증.

## 스코프 밖

- 에셋 최적화(후속 전체 게임 패스)
- BGM/사운드(`sound-design-paused` 중단 상태 유지)
- 원본 타이틀 화면 이식(엔진 배너 노드가 대체). 단 원본 **스토리 화면**은 미니게임 `story` phase로 이식함(스코프 안).
