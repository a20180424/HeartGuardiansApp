# Home Scene 설계 (Scene 3 / `/home`)

> 상태: 설계 확정(승인 대기). 작성일 2026-06-28.
> 작업 노트 원본: `docs/home-scene-notes.md` (대화로 수집한 요구사항). 본 문서가 정식 스펙.
> 컴포넌트: `src/scenes/Home.tsx`. 흐름: Intro → Auth → **Home** → Planet 1~4 → Outro.

## 1. 목표 / 범위

로그인 후 진입하는 **대시보드형 허브 화면**. 플레이어 정보, 진행도(progress 0~4),
4개 행성 선택, 보조 메뉴, 가이드 캐릭터(하티)를 한 화면에 보여준다.
시각 목표: `mytemp/home/HomeScreenshot.png`.

**이번 범위 제외**: 각 팝업의 실제 내용(학습목표/미션/원석도감/가방/일지), 사운드,
여자 캐릭터 에셋, progress=4 전용 CTA. (구조만 준비, 내용은 추후)

## 2. 레이아웃 / 공통 규칙

- **1280×800 CSS px, 가로 고정, immersive 전체화면** 기준 (CLAUDE.md).
- 씬 루트는 Auth 패턴 계승: `position:fixed; inset:0; width:100vw; height:100dvh;
  min-height:100svh; overflow:hidden`. 요소는 절대배치 오버레이.
- 배경: `SpaceshipBackground.png` 풀스크린 `cover` (우주선 함교 + 창밖 지구·우주 + 콘솔).
  나머지 모든 요소는 그 위에 오버레이.
- 패널/plate 배경은 CSS **`border-image` 9-slice** 사용 (Auth.css의 PanelBackground01 방식과 동일).
- `useFitStage`(1920×1200 letterbox)는 **미사용 레거시** — 쓰지 않는다.
- 애니메이션은 `transform`/`opacity` 위주(GPU 친화), 과한 회전/흔들림 지양.

## 3. 데이터 / 진입

- 단일 출처: `getSession()` → `{ profile, progress }` (`src/lib/session.ts`).
  - `Profile`: `id, name, grade, class, number, school` (`src/lib/auth.ts`). **gender 필드 없음.**
  - `progress`: 0~4, 순차적으로 클리어한 행성 수 (건너뛰기 불가).
- **세션 가드**: mount 시 `getSession()`이 `null`이면 **`/auth`로 리다이렉트**.
- progress는 mount 시 읽음. Planet 클리어가 session을 갱신하면 Home 복귀(remount) 시 자동 반영.
  (구현 시 Planet→session 갱신 흐름 확인.)

## 4. 컴포넌트 구조

```
src/scenes/Home.tsx          # 씬 루트: 세션 가드, 데이터 로드, 레이아웃, 열린 팝업 상태
src/scenes/home/
  home.logic.ts              # 순수 함수 (테스트 대상)
  home.logic.test.ts
  home.data.ts               # 별명표 / 멘트표 / 행성 메타(이름·에셋) 상수
  ProfileCard.tsx
  EnergyGauge.tsx
  Mothership.tsx
  PlanetButton.tsx           # 행성 1개; 4개 배치는 Home 또는 PlanetRow
  MenuBar.tsx
  HatiHelper.tsx
  Modal.tsx                  # 공용 팝업 (딤+X, plate 배경 교체)
Home.css
```

`home.logic.ts` 순수 함수 (단위 테스트):

- `planetState(planetId: 1..4, progress): "completed" | "unlocked" | "locked"`
  - `id <= progress` → completed
  - `id === progress + 1` → unlocked
  - `id > progress + 1` → locked
- `nicknameFor(progress): string` — 별명표 조회
- `commentFor(progress): string` — 하티 멘트표 조회

## 5. 요소별 명세

### 5.1 프로필 카드 (좌상단)
- plate = `PlayerButton.png`, 얼굴 = `AvatarFace.png` (남자 고정).
- 얼굴은 **성별 분기 가능한 구조**로 작성하되 현재는 항상 남자. (Profile에 gender 추가는 추후.)
- 레벨 `Lv{progress}` (0~4 그대로).
- 별명 = `nicknameFor(progress)`:

  | progress | 별명 |
  | --- | --- |
  | 0 | 견습 가디언 |
  | 1 | 새내기 가디언 |
  | 2 | 정식 가디언 |
  | 3 | 베테랑 가디언 |
  | 4 | 마스터 가디언 |

- 이름 = `profile.name`.
- `PlayerScore.png`는 사용 안 함.

### 5.2 중앙 타이틀 (상단)
- `src/assets/auth/TitleBanner.png` 재사용 (크기/위치만 조정). `<img>`.

### 5.3 학습 목표 카드 = 버튼 (우상단)
- plate = `BannerPlate03.png`(저퀄이나 일단 사용), 별 아이콘 = `PurposeStart.png`.
- 텍스트: `학습 목표` / `클릭해서 목표를 완성하세요`.
- 클릭 → 가운데 팝업(`Modal`). **본문은 지금 빈 placeholder.**

### 5.4 공감 에너지 게이지 (우상단, 표시 전용)
- plate = `HeartScorePlate.png`. 클릭 동작 없음.
- 하트 4개: `progress`개 = `HeartFull.png`, 나머지 = `HeartEmpty.png`.
- `%` = `progress × 25` (0/25/50/75/100).
- plate 하단의 빈 둥근 pill = **progress 비율(%)만큼 채워지는 가로 게이지 바**로 사용.

### 5.5 모선 일러스트 (중앙 상단)
- `HeartConnect.png`. 정적 2D.
- 애니메이션: **상하 부유(bob)** `translateY` 5~10px, 3~4초 ease-in-out 무한 + **코어 발광 펄스**.

### 5.6 4개 행성 (떠 있는 섬 + 캐릭터)
- 에셋 `Alien0{1..4}_{Happy,Sad}.png` (행성당 1쌍). **섬+캐릭터+행성이름 라벨이 이미지에 박혀 있음**
  → 이름 텍스트 별도 렌더 불필요. 행성명: 1 빛, 2 안개, 3 얼음, 4 그림자.
- 상태별 (`planetState`):

  | 상태 | 이미지 | 강조 | 클릭 |
  | --- | --- | --- | --- |
  | Locked | Sad | grayscale+brightness↓, opacity↓, 머리 옆 `Lock.png`, 무애니 | ✗ |
  | Completed | Happy | 풀컬러, 머리 위 **금색 별** 완료 뱃지, 정적(미세 sparkle) | ✗ |
  | Unlocked | Sad | 풀컬러+밝음, 머리 위 "탐험 시작!" 뱃지(`RocketButton.png`+텍스트), 섬 둘레 펄스 헤일로, 캐릭터 bob | ✓ → `nav('/planet/{id}')` |

- 원리: **움직임은 Unlocked에만** → 화면에서 유일하게 움직이는 곳이 "지금 누를 곳".
- "탐험 시작!" pill = `RocketButton.png`(로켓 아이콘 박힘) + 우측 빈 공간에 텍스트 오버레이.
- **progress=4**: Unlocked 없음 → 4개 모두 Happy. 별도 CTA 없음(추후 재검토).

### 5.7 하단 메뉴 4버튼
- 버튼 에셋(라벨 박힘): `MissionButton`/`GemBookButton`/`InventoryButton`/`HistoryButton`.png.
- 클릭 → 팝업(`Modal`). **본문 미정(빈 placeholder).**
- 버튼 색 = 팝업 배경 색 매칭, `PlateSet.png` 분할 사용:

  | 버튼 | 색 | PlateSet 위치 |
  | --- | --- | --- |
  | 미션 | 초록 | 1 |
  | 원석 도감 | 파랑 | 2 |
  | 가디언즈 가방 | 보라 | 3 |
  | 탐험 일지 | 갈색/금 | 4 |

### 5.8 하티(로봇 도우미) + 말풍선 (우하단)
- 로봇 = `public/assets/char/Hati/hati_default.png` (원형 프레임 포함). 말풍선 = `src/assets/auth/PanelBackground01.png`(border-image).
- `HatiBlink0.png`(블링크 스프라이트) 미사용. 대신 하티에 **bob/호흡 모션**.
- 멘트 = `commentFor(progress)`:

  | progress | 멘트 |
  | --- | --- |
  | 0 | 안녕, 난 하티야! 오늘의 미션이 준비됐어. 빛의 행성으로 첫 탐험을 떠나볼까? |
  | 1 | 빛의 행성을 멋지게 해냈구나! 이번엔 안개 행성이 너를 기다리고 있어. |
  | 2 | 안개 행성도 통과! 다음은 차가운 얼음 행성이야. 준비됐지? |
  | 3 | 얼음 행성까지 클리어하다니 대단해! 마지막은 그림자 행성이야. 끝까지 가보자! |
  | 4 | 우와, 네 개의 행성을 모두 구했어! 진짜 멋진 가디언이야. 정말 고마워! |

- 말풍선 텍스트 = **타이핑(typewriter) 등장**, 완료 후 그대로 유지. 클릭 동작 없음.

### 5.9 공용 팝업 `Modal`
- 학습목표 + 메뉴 4개 공용. 딤 배경 클릭 + X 버튼으로 닫힘. 콘텐츠 영역 클릭은 닫히지 않음.
- 배경 plate를 prop으로 받아 색만 교체 (border-image).
- 현재 본문은 전부 빈 placeholder.

## 6. 에셋 파이프라인

`mytemp/home/` 원본 → **Python(Pillow) 스크립트**로 가공 → `src/assets/home/`:

1. 투명여백 자동 트림(alpha bbox 크롭): 캐릭터/버튼/plate 전부.
2. `PlateSet.png` → 4분할(초록/파랑/보라/갈색) 후 각각 트림.
3. 가공 결과만 `src/assets/home/`에 커밋. 원본 `mytemp/`는 유지.
4. `Hati`(public), `TitleBanner`, `PanelBackground01`은 현 위치 재사용(이동 X).
5. 스크립트는 재현용으로 `scripts/`에 보존(삭제 여부는 추후 결정).

## 7. 테스트

- `home.logic.test.ts`: `planetState`(경계값 progress 0/1/4), `nicknameFor`, `commentFor` 전 범위.
- 기존 패턴(`auth.logic.test.ts`, `intro.logic.test.ts`)과 동일하게 Vitest.

## 8. 미해결/추후

- 각 팝업 실제 콘텐츠, 사운드(BGM/SFX), 여자 캐릭터(+Profile.gender DB), progress=4 전용 CTA/아웃트로 진입 동선.
