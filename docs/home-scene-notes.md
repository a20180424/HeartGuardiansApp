# Home Scene 작업 노트 (임시)

> 이 문서는 Home Scene(`/home`, `src/scenes/Home.tsx`) 구현을 위한 작업용 메모다.
> 사용자가 구두로 설명하는 요구사항을 여기에 정리한다. 정리가 끝나고 구현이 안정되면
> 필요한 내용은 정식 문서(`docs/scenes.md` 등)로 옮기고 이 파일은 정리/삭제할 수 있다.

## 기본 정보

- **URL**: `/home`
- **컴포넌트**: `src/scenes/Home.tsx`
- **흐름상 위치**: Intro → Auth → **Home** → Planet 1~4
- **레이아웃 기준**: 1280 × 800 CSS px, DPR 1.5, 가로(landscape) 고정, immersive 전체화면
  (자세한 내용은 `CLAUDE.md` 참고)

## 화면 전체 구성 (HomeScreenshot.png 기준)

1280×800 가로 전체화면을 꽉 채우는 대시보드형 허브.

- **상단**: 좌측 프로필 카드 / 중앙 타이틀 / 우측 학습목표 + 공감 에너지 게이지
- **중앙**: 모선(우주선) 일러스트, `탐험 시작!` 버튼, 4개 행성(섬)+캐릭터(잠금 상태 포함), 배경 지구/우주
- **하단**: 메뉴 버튼 5개(미션 / 원석 도감 / 가디언즈 가방 / 탐험 일지 / 도우미 로봇) + 우측 도우미 말풍선 카드

## 사용 가능한 이미지 (mytemp/home/)

| 파일 | 용도(추정) |
| --- | --- |
| `AvatarFaceMale.png` / `AvatarFaceFemale.png` | 프로필 카드 플레이어 얼굴(성별별) |
| `PlayerButton.png` | 프로필 카드 배경 plate (파란 라운드 사각형) |
| `PlayerScore.png` | 얇은 다크 pill — 용도 미정(프로필 내부 요소?) |
| `BannerPlate03.png` | (미확인) |
| `PlateSet.png` | (미확인) |
| `PurposeStart.png` | (미확인) 학습목표/탐험시작 관련? |
| `HeartConnect.png` / `HeartScorePlate.png` / `HeartFull.png` / `HeartEmpty.png` | 공감 에너지 게이지 |
| `Alien0{1..4}_Happy/Sad.png` | 4개 행성 캐릭터 (happy/sad 2종씩) |
| `Lock.png` | 행성 잠금 아이콘 |
| `MissionButton.png` / `GemBookButton.png` / `InventoryButton.png` / `HistoryButton.png` | 하단 메뉴 버튼 (미션/원석도감/가방/일지) |
| `SpaceshipBackground.png` | 배경 |

> 주의: 다수 PNG가 실제 그림 영역 대비 투명 여백이 매우 넓음. Unity는 자동 트림하지만
> 웹에서는 직접 크롭/오프셋 처리가 필요할 수 있음.

## 데이터 출처 (기존 코드)

- `getSession()` → `{ profile, progress }` (`src/lib/session.ts`), 메모리 단일 출처.
- `Profile`: `id, name, grade, class, number, school` (`src/lib/auth.ts`). **gender 없음.**
- `progress`: 0~4, 클리어한 행성 수(순차적).

---

## 요구사항 (대화로 수집 중)

### 1. 프로필 카드 (좌측 상단) — 확정

플레이어가 누군지 나타내는 카드. 배경 plate + 얼굴은 이미지 에셋 사용
(`PlayerButton.png` = plate, `AvatarFaceMale.png`/`AvatarFaceFemale.png` = 성별별 얼굴).

- **레벨 `Lv{n}`**: `n` = 서버가 주는 `progress`(0~4) 값 **그대로**. 별도 레벨 개념 없음.
  - `progress` 0 = 행성 0개 클리어, 1 = 1번 행성 클리어 … 클리어 순서는 무조건 순차적.
- **별명**: `progress` 값에 따라 아래 표로 매핑 (확정).

  | progress | 별명 |
  | --- | --- |
  | 0 | 견습 가디언 |
  | 1 | 새내기 가디언 |
  | 2 | 정식 가디언 |
  | 3 | 베테랑 가디언 |
  | 4 | 마스터 가디언 |

- **이름**: `profile.name` (예: 이시형).
- **얼굴 / 성별 처리**:
  - 코드는 **남/녀 구분 가능한 구조로 작성**해 둔다 (얼굴 이미지를 성별로 분기).
  - 단, **현재는 항상 남자로 개발**. 여자 캐릭터는 추후 준비되면(DB 필드 + 여자 이미지 에셋) 그때 테스트.
  - ⚠️ 현재 `Profile`에는 gender 필드가 없음 → 추후 DB/스키마에 추가 필요.

- **`PlayerScore.png` → 무시.** (원래 Score 표시용이었으나 Progress만 남기고 제거됨.)

### 2. 중앙 상단: 타이틀 — 확정

- `하트 가디언즈: 우주 공감 탐험대` (날개 + 별 장식).
- **Auth Scene에서 쓴 `src/assets/auth/TitleBanner.png` 재사용** (크기/위치만 조정).
  - 참고: Auth에서는 `<img className="auth__banner" src={bannerUrl} alt="...">` (`src/scenes/Auth.tsx:129`).
- 질문 없음.

### 3. 우측 상단: 학습 목표 카드 (버튼)

- 텍스트: `학습 목표` / `클릭해서 목표를 완성하세요`.
- **동작**: 버튼. 누르면 **화면 가운데 팝업(모달)** 이 떠서 학습 목표를 보여줄 예정.
  - **단, 팝업에 보여줄 내용은 아직 미준비** → 팝업은 뜨되 **본문은 비워둠**(빈 모달).
  - **닫기 동작 (확정)**:
    - 팝업 안(콘텐츠 영역) 클릭 = 닫히지 않음 (추후 "클릭해서 목표 완성" 인터랙션 공간).
    - 팝업 바깥 딤(dim) 배경 클릭 = 닫힘.
    - X 버튼 = 닫힘.
- **이미지**:
  - 배경 plate = `BannerPlate03.png` (퀄리티 낮지만 대체 이미지 없어 일단 사용).
  - 별 아이콘 = `PurposeStart.png` (원 안 금색 별).

### 4. 우측 상단: 공감 에너지 게이지

- **버튼 아님** — 표시 전용, 클릭 동작 없음.
- 배경 plate = `HeartScorePlate.png`.
- **하트 4개** (행성 4개 대응): `progress`개만큼 가득 찬 하트, 나머지는 빈 하트.
  - 가득 = `HeartFull.png`, 빈 = `HeartEmpty.png`. (둘 다 투명 여백 많음 → 크롭/오프셋 주의)
- **% 표시** = `progress × 25` (0 / 25 / 50 / 75 / 100).
- **하단 빈 pill 영역 처리 (확정)**:
  - HeartScorePlate.png 하단에 글씨 들어갈 듯한 빈 둥근 pill이 있음.
  - **이 pill을 `progress` 비율(%)만큼 채워지는 가로 게이지 바로 사용.** (새 에셋 불필요)

### 5. 가운데 위쪽: 모선(우주정거장) 일러스트

- 이미지 = `HeartConnect.png` (파란 크리스탈 하트 코어 + 돌 링 구조의 정거장).
- 정적 2D 이미지. 3D 회전은 불가/어색.
- **움직임 (확정 대기 → 추천)**: 초등학생 재미 요소로 가벼운 애니메이션 추가.
  - 추천: **부드러운 상하 부유(floating bob)** — `translateY` 5~10px, 3~4초, ease-in-out, 무한 반복.
  - 추가: 중앙 하트 코어 **은은한 발광 펄스**(glow/opacity).
  - 전부 CSS 키프레임, 성능 부담 없음. (과한 회전/흔들림은 지양)

### 6. 4개의 행성(떠 있는 섬) + 캐릭터

게임은 4개 행성(행성당 미션 2~3개)을 **순차** 이동. progress 0→1→2→3→4, 건너뛰기 불가.

- **이미지**: `Alien0{1..4}_{Happy,Sad}.png` (총 8장, 행성당 Happy/Sad 1쌍).
  - ⚠️ **각 이미지에 섬 + 캐릭터 + 행성 이름 라벨(번호 뱃지 + "○○ 행성")이 이미 박혀 있음** → 이름 텍스트 별도 렌더 불필요.
  - Happy = 팔 벌리고 서있음 / Sad = 웅크려 우는 모습 + 구름.
  - 투명 여백 주의.
- **상태 판정** (행성 i = 1~4, `progress` = 클리어 수):
  - `i ≤ progress` → **Completed**: Happy 이미지.
  - `i == progress + 1` → **Unlocked**(현재 플레이 가능): Sad 이미지(아직 클리어 전) + "탐험 시작" 표시, **클릭 시 해당 행성 이동**.
  - `i > progress + 1` → **Locked**: Sad 이미지 + 자물쇠(`Lock.png`), **클릭 무반응**.
  - **progress=4(전부 클리어)**: Unlocked 없음 → **4개 모두 Happy 표시**. 별도 CTA 없음(추후 재검토).
- **"탐험 시작!" pill**: Unlocked 행성에 붙는 가이드 표시. **에셋 = `RocketButton.png`**
  (파란 pill + 금테 + 좌측 로켓 아이콘 박힘, 우측 빈 공간에 "탐험 시작!" 텍스트를 HTML로 얹음).
- **3-상태 인디케이터 (추천, 확정 대기)** — 원리: *움직임은 Unlocked에만.*

  | 상태 | 이미지 | 강조 | 클릭 |
  | --- | --- | --- | --- |
  | Locked | Sad | grayscale+brightness↓로 회색빛, opacity↓, 머리 옆 Lock.png, 무애니 | ✗ |
  | Completed | Happy | 풀컬러, 머리 위 완료 뱃지(금색 별/체크), 정적(미세 sparkle) | ✗ |
  | Unlocked | Sad | 풀컬러+밝음, 머리 위 "탐험 시작!" 뱃지, 섬 둘레 펄스 헤일로, 캐릭터 bob | ✓ |

### 7. 하단 좌측 메뉴 버튼 4개

(로봇 도우미 아이콘은 별도 항목 — 다음에 설명)

- 4개 버튼: **미션 / 원석 도감 / 가디언즈 가방 / 탐험 일지**.
- 각 버튼 = 이미지(`MissionButton` / `GemBookButton` / `InventoryButton` / `HistoryButton`.png).
  - 라벨이 이미지에 박혀있음 → 텍스트 별도 렌더 불필요. 투명 여백 큼(크롭 주의).
- **동작**: 누르면 팝업이 뜸. **표시 내용은 미정**(팝업이 뜬다는 것만 확정) → 본문 빈 placeholder.
- **버튼 색 = 팝업 배경 색 매칭** (`PlateSet.png` 사용):

  | 버튼 | 색 | PlateSet 위치 |
  | --- | --- | --- |
  | 미션 | 초록 | 1 (좌) |
  | 원석 도감 | 파랑 | 2 |
  | 가디언즈 가방 | 보라 | 3 |
  | 탐험 일지 | 갈색/금 | 4 (우) |

- **PlateSet 처리 (확정 방안)**:
  - `PlateSet.png`(4색 plate 한 장)를 **4개 PNG로 크롭**(투명 여백 제거) → `src/assets/home/`.
  - 각 plate는 CSS **`border-image`(웹의 9-slice = Unity 9-patch 대응)** 로 적용해 팝업 크기 가변 대응.
- **팝업 닫기 동작 (확정)**: 학습 목표 팝업과 **동일**(딤 배경 클릭 + X 버튼). → 공용 모달 컴포넌트로 만들고 배경색(plate)만 교체해서 재사용.

### 8. 우측 하단: 로봇 도우미(하티) + 말풍선

- **캐릭터**: 로봇 도우미 이름 = **하티(Hati)**. 게임 내내 등장, 주인공에게 게임을 안내하는 가이드.
- **로봇 + 말풍선이 한 세트.**
- **이미지**:
  - 로봇 = `public/assets/char/Hati/hati_default.png` (`NormalHati.png`와 동일). 파란 원형 프레임 포함.
  - 말풍선 패널 = `src/assets/auth/PanelBackground01.png` (Auth에서 쓰던 파란 발광 라운드 패널, tail 없음).
  - `HatiBlink0.png` = 눈 깜빡임 5프레임 스프라이트(퀄리티 아쉬움) → **사용 보류 추천**.
- **멘트**: `progress`(0~4)에 따라 지정된 멘트 표시 (초안 — 추후 자유 수정 가능):

  | progress | 멘트 |
  | --- | --- |
  | 0 | 안녕, 난 하티야! 오늘의 미션이 준비됐어. 빛의 행성으로 첫 탐험을 떠나볼까? |
  | 1 | 빛의 행성을 멋지게 해냈구나! 이번엔 안개 행성이 너를 기다리고 있어. |
  | 2 | 안개 행성도 통과! 다음은 차가운 얼음 행성이야. 준비됐지? |
  | 3 | 얼음 행성까지 클리어하다니 대단해! 마지막은 그림자 행성이야. 끝까지 가보자! |
  | 4 | 우와, 네 개의 행성을 모두 구했어! 진짜 멋진 가디언이야. 정말 고마워! |

- **연출 (확정)**:
  - 블링크 스프라이트 미사용. 대신 Hati에 **가벼운 bob/호흡(scale) 모션**(모선과 통일).
  - 말풍선 텍스트 = **타이핑(typewriter) 등장 효과**. 타이핑 끝나면 그대로 계속 표시.
  - **Hati/말풍선 클릭 동작 없음** (표시 전용).

---

## 스펙 보강 (브레인스토밍 리뷰)

- **세션 가드**: Home 진입 시 `getSession()`이 `null`이면 **`/auth`로 리다이렉트**. (새로고침/직접진입 대비)
- **레이아웃**: Auth 패턴 계승 — `.home { position:fixed; inset:0; 100vw×100dvh; overflow:hidden }`,
  **1280×800 CSS px 기준** 절대배치 오버레이. `useFitStage`(1920×1200)는 미사용 레거시.
- **배경**: `SpaceshipBackground.png` 풀스크린 `cover` (지구·우주·콘솔 포함). 나머지 요소는 위에 오버레이.
- **9-slice 표준**: 패널/plate는 CSS `border-image` 사용 (Auth.css의 PanelBackground01 방식과 동일).
- **사운드**: Home 화면 사운드 **없음**(지금 범위 제외, 추후 일괄).
- **progress 최신화**: Home은 mount 시 `getSession()`에서 progress를 읽음. Planet 클리어가
  session을 갱신하면 Home 복귀 시 자동 반영(remount). (구현 시 확인 필요)

## 추가 미정 / 질문 사항

- (없음 — Home Scene 전체 항목 확정 완료.)
