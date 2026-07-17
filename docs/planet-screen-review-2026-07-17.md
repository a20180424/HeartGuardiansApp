# 행성 1~4 화면 점검 — 수정 작업 목록

2026-07-17 점검 결과에서 뽑은 할 일. 스크린샷 리포트는 `mytemp/planet-screenshots-2026-07-17/index.html`
(브라우저로 직접 열 것 — 이미지가 상대경로다). `mytemp/`는 gitignore 대상이라 임시다.

**점검 방법 요약**

- 화면: 1280×800 / DPR 1.5로 Playwright 자동 플레이 + 도달 못 한 노드는 `?node=` 점프 보강. 205장, 127개 노드 중 121개 커버(95%).
- 표정: 표정은 대사 JSON이 아니라 `theme.ts`의 `byNode` **sparse** 맵이 정하고, 지정 없는 노드는 앞 표정을 물려받는다.
  그래서 시나리오 그래프를 `start`부터 순회하며 표정 상태를 전파해 노드마다 "실제로 보일 수 있는 표정"을 구해 대조했다(127개 전부 커버).

**주의 — 점프 샷의 표정은 무효**: `?node=`로 진입하면 스프라이트가 `initial`로 리셋된다.
`byNode`에 **명시된** 노드는 점프해도 맞지만, 앞에서 **물려받는** 표정은 점프 샷에서 틀리게 나온다.
표정 판단은 리포트의 "표정 감사" 표를 기준으로 할 것.

## 진행 상황 (2026-07-18, PR #58 브랜치 `fix/prologue-rewards-sync`)

- ✅ **A1** 어절 줄바꿈 — 처리
- ✅ **B1·B2** 프롤로그 보상 동기화 + 아이콘 PNG화 + p3_m2_end 대사 — 처리
- ✅ **B4** 행성3 mission03.json 삭제 — 처리 / ⏸ **B3** 행성4 미션3은 미구현이라 보류
- ✅ **C1** 행성2·3·4 하티 표정 — 처리 / ✅ **C2** 미션2 praising 물림 + hati_surprised 신규 — 처리
- ✅ **C3** 라라 smiling→thinking — 처리 / ✅ **C4** 경로 분기 14노드 — 리뷰 결과 모두 정상(수정 불요)
- ✅ **D1** 타이틀 배너가 스테퍼 덮음 — 처리 / ✅ **D3** p2_m3_end lightOverlay — 처리
  ⏹ **D2**·D3(보상 뒤 캐릭터)는 팝업 상 자연스러워 제외로 확정
- ⬜ 남음: 미사용 하티 에셋 15개 정리(후속), 미니게임 스테이지 육안 점검, 행성3 미션2·3 three.js

---

## A. 한 줄이면 끝나는 것

### A1. 한글이 어절 무시하고 아무 데서나 줄바꿈됨 `전역` `높음`

전 행성·전 미션의 모든 대사에서 "하지/만", "마/음을", "완전/히"처럼 단어 중간이 끊긴다.
아이들이 읽는 화면이라 체감이 크다. `.card-top`(공감 카드)에만 `keep-all`이 걸려 있다.

- [ ] `src/scenes/planet/player/mission.css:1070` `.bubble` 에 `word-break: keep-all;` 추가
- [ ] `src/scenes/planet/player/mission.css:1247` `#hatiText` 에 `word-break: keep-all;` 추가

확인: 행성1 미션1 인트로("친구의 마음은 보이지 않아. 하지만…")에서 "하지만"이 안 쪼개지면 됨.

---

## B. 보상 동기화 — 프롤로그·마지막 노드를 보상 PNG에 맞추기

**정답(single source of truth)은 `mytemp/보상/`의 4개 보상 PNG다.** 각 PNG의 4칸 중 마지막 칸(가디언 칭호)을
뺀 앞 3칸(원석·도구·에너지)이 프롤로그의 "획득 가능한 보상"과 동기화돼야 하고, PNG 자체가 각 행성 마지막 노드에서 쓰여야 한다.

**보상 PNG가 말하는 정답(원석·도구):**

| 행성 | 원석 | 도구 | 칭호(참고, 프롤로그엔 안 씀) |
|---|---|---|---|
| 1 빛 | 이해의 **사파이어** | 공감 **거울** | Lv2 이해의 가디언 |
| 2 안개 | 관찰의 **호박석** | 공감 **레이더** | Lv3 관찰의 가디언 |
| 3 얼음 | **경청의 토파즈 / 표현의 루비** | 공감 **송신기** | Lv4 연결의 가디언 |
| 4 그림자 | 용기의 **에메랄드** | 공감 **나침반** | Lv5 하트 가디언 |

에너지 칸은 4행성 공통: "공감 에너지 +25% — 공감 에너지를 모아 하트 커넥트를 복구할 수 있어요."

### B1. 프롤로그 4개 — 원석·도구 이름이 보상 PNG와 어긋남 `높음`

현재 프롤로그 REWARDS(첫 두 칸)와 정답 대조. **원석은 4곳 다 "○○의 원석"이라 서수만이 아니라 이름 자체가 틀리고,
도구는 행성2·3이 아예 다른 도구를 예고한다.**

| 행성 | 현재 원석 | → 정답 | 현재 도구 | → 정답 |
|---|---|---|---|---|
| 1 `Prologue.tsx:11-12` | 이해의 원석 | 이해의 **사파이어** | 공감 거울 | (맞음) |
| 2 `Prologue.tsx:12-13` | 관찰의 원석 | 관찰의 **호박석** | **마음 신호 탐색기** ✗ | 공감 **레이더** |
| 3 `Prologue.tsx:12-13` | 따듯함의 원석 ✗ | **경청의 토파즈 / 표현의 루비** | **공감 온도계** ✗ | 공감 **송신기** |
| 4 `Prologue.tsx:12` | 용기의 원석 | 용기의 **에메랄드** | 공감 나침반 | (맞음) |

- 행성2 "마음 신호 탐색기"는 **행성1의 도구**다(안개 행성 보상이 아님).
- 행성3 "공감 온도계"는 **게임 어디에도 없는 도구**다 — 미션1이 통째로 "공감 송신기 사용법"인데 프롤로그는 온도계를 예고.
- 서수/맞춤법: 현재 4곳 다 원석 desc가 "첫 번째 … 원석이에요"(행성3만 "원석이**예**요" 오타). 행성별 서수(첫/두/세/네)로.

**아이콘도 이모지 → PNG로 교체하기로 함.** 지금은 `icon: "💎"` 이모지를 `<span>`에 렌더한다
(`PrologueTemplate.tsx:84`). `mytemp/보상/{원석,공감도구}/`와 `공감에너지 아이콘.png`를 반입해 `<img>`로 바꾼다.

- [ ] `mytemp/보상/`의 원석 4개·공감도구 4개·공감에너지 아이콘 PNG를 영문명으로 `public/assets/`에 반입 (CLAUDE.md 규칙)
- [ ] `PrologueTemplate.tsx` 의 reward 아이콘을 이모지 `<span>` → `<img>` 로 (icon 값이 `/assets/…` 경로면 이미지, 아니면 이모지 폴백도 고려)
- [ ] 행성1 REWARDS 원석명 → "이해의 사파이어", 아이콘 경로, desc 서수 확인
- [ ] 행성2 원석명 → "관찰의 호박석", 도구 → "공감 레이더", 아이콘, desc "두 번째"
- [ ] 행성3 원석명 → 확정명(아래), 도구 → "공감 송신기", 아이콘, desc "세 번째" + `이예요`→`이에요`
- [ ] 행성4 원석명 → "용기의 에메랄드", 아이콘, desc "네 번째"

**행성3 원석 이름은 두 개짜리라 확정 필요:** 보상 PNG는 "경청의 토파즈 / 표현의 루비" 두 개를 나란히 준다.
프롤로그 한 칸에 둘 다 넣을지("경청의 토파즈·표현의 루비"), 카드 문구를 따를지 결정.

### B2. 마지막 노드 — `p3_m2_end` 대사만 행성1 복붙 `높음`

**마지막 노드의 보상 카드 PNG 배선은 4행성 다 이미 올바르다**(각자 `planetN-reward-card.png` 사용).
손댈 건 행성3 마지막 노드(`p3_m2_end`)의 **하티 대사 한 줄**뿐이다.

`planet3/mission02.json:30` 현재:
> 축하해! 대원은 이제 **첫 번째** 공감 원석인 **이해의 사파이어**를 얻었어! …

→ 행성1 `mission03.json`에서 복사돼 왔다. 카드엔 "경청의 토파즈/표현의 루비, 세번째"가 뜨는데 대사는 사파이어라 어긋난다.

- [ ] `p3_m2_end` 대사를 확정된 행성3 원석명 + "세 번째"로 교체 (B1의 원석명 확정과 동일 값)
- [ ] (참고) `public/assets/ui/planet3-reward-card.png`는 `mytemp/보상`보다 고해상도 판본이라 내용은 동일 — 교체 불필요

### B3. 행성4 미션3 — 미구현이라 이번 범위 아님 `보류`

`p4_m3_end`가 행성1 보상 카드를 쓰고 `(임시)` 대사가 노출되지만, **미션3은 곧 구현 예정**이라 지금은 건드리지 않는다.
구현 시 보상 카드(`planet4-reward-card.png`)·대사·배경(`MISSION03_THEME.bg`가 빛의 행성)·완료 배너 위치를 같이 잡으면 된다.

### B4. 행성3 미션3 — 별도 미션이 아님(오해 정정), `mission03.json` 삭제 `보통`

**앞선 분석에서 "미배선 버그"로 본 건 오해였다.** `planet3/index.tsx:20`의 설계 주석대로,
행성3 미션3은 별도 스테이지가 아니라 **미션2 미니게임(3D 월드)의 stage2**다:
stage1(미션2·연료 채우기) 통과 후 끊김 없이 stage2(미션3)로 이어지고 그때 스테퍼만 3단계로 올린다.
따라서 스테퍼 라벨 3개와 완료 체크는 **정상**이다. `{ mission3: "mission2" }` 별칭도 이 설계의 일부다.

`mission03.json`은 이 구조에서 안 쓰이는 잔재 파일이라 삭제한다. 딸린 참조:

- [ ] `planet3/mission03.json` 삭제
- [ ] `planet3/theme.ts` — `import mission03`, `MISSION03_DATA`, `MISSION03_THEME` 제거 (theme.ts:4, 9, 92~110)
- [ ] `planet3/theme.test.ts` — `MISSION03_DATA/THEME` import·PAIRS 항목 제거
- [ ] `planet3/missions.test.ts` — `mission03` import·MISSIONS 항목·`it.each` 목록에서 제거
- [ ] 삭제 후 `npm test` 로 planet3 스위트 통과 확인

---

## C. 표정 ↔ 대사

### C1. 행성 2·3·4 — 하티 표정이 전 노드 `thinking` 고정 `높음`

`planet{2,3,4}/theme.ts` 의 `hatiSprites.byNode`가 **통째로 비어 있다**.
하단 하티 박스 아바타는 `MissionPlayer.tsx:1468`에서 `hatiSprites.char[vm.hati]`를 쓰므로 화면에 그대로 보인다.
→ "축하해!", "너 정말 멋지다!" 같은 대사에도 갸웃하는 `thinking` 표정이 나온다.

**에셋 작업은 필요 없다** — 네 행성 모두 `HATI_CHAR`에 같은 8개 키가 이미 정의돼 있다:
`thinking · explaining · suggesting · worried · praising · cheering · proud · celebrating`.
행성1처럼 `byNode`만 채우면 된다.

제안(그대로 쓰든 조정하든):

| 노드 | 대사 요지 | 제안 |
|---|---|---|
| `p2_m1_intro` | 미션 설명 | `explaining` |
| `p2_m1_preplay` | "완성해보자" 권유 | `suggesting` |
| `p2_m1_result` | "완성되었어. 확인해보자!" | `cheering` |
| `p2_m1_cards` | 교훈 설명 | `explaining` |
| `p2_m1_end` | "다음 미션도 계속해보자" | `proud` |
| `p2_m2_intro` / `brief1` / `brief2` | 상황·목표 설명 | `explaining` |
| `p2_m2_preplay1` / `preplay2` | 조작 안내 | `suggesting` |
| `p2_m2_complete` | "완성됐어! 너 정말 멋지다!" | `praising` |
| `p2_m2_outro` | "공감을 전하러 가보자!" | `cheering` |
| `p2_m2_cards` | 교훈 설명 | `explaining` |
| `p2_m2_end` | "새로운 친구를 만나러 가보자!" | `suggesting` |
| `p2_m3_intro` | 미션 설명 | `explaining` |
| `p2_m3_cards` | 교훈 설명 | `explaining` |
| `p2_m3_result` | "잘 했어!" | `praising` |
| `p2_m3_result2` | "축하해! 모든 미션 완료!" | `celebrating` |
| `p2_m3_end` | 보상 수여 | `proud` |
| `p3_m1_intro` | 미션 설명 | `explaining` |
| `p3_m1_postplay` | "완성 되었어!!!" | `cheering` |
| `p3_m1_end` | "준비가 되었어. 하지만 연료가 필요해!" | `explaining` |
| `p3_m2_postplay` | "수고했어. 친구들을 웃게 만들었어." | `praising` |
| `p3_m2_end` | 보상 수여 | `celebrating` |
| `p4_m1_intro` | "축하해! …하지만 최종 점검에 통과한 가디언에게만" | `explaining` |
| `p4_m1_postplay` | 나침반 설명 + 당부 | `explaining` |
| `p4_m1_end` | "첫 걸음을 내디뎌 보자!" | `suggesting` |
| `p4_m2_intro` | 미션 설명 | `explaining` |
| `p4_m2_cards` | 교훈 설명 | `explaining` |
| `p4_m2_postplay` | "공감은 작은 용기야" 교훈 | `proud` |
| `p4_m2_end` | 보상 수여 | `celebrating` |

- [ ] 행성2 `byNode` 채우기
- [ ] 행성3 `byNode` 채우기
- [ ] 행성4 `byNode` 채우기

### C2. 행성1 미션2 후반 8개 노드가 `praising`(엄지척)을 물려받음 `높음`

`m2_secret_intro1` ~ `m2_secret_lesson` 구간에 `byNode` 지정이 없어 `m2_q4_correct_hati`의 `praising`이 계속 유지된다.

가장 눈에 띄는 곳 — `m2_secret_intro2`:

> **앗**, 공감 거울이 깨어나려고 해! **하지만 아직 완전히 깨어나지는 않았어.**

놀람 + 우려 대사에 엄지척 칭찬 표정이 붙는다. **에셋에 `hati_surprised.png`가 있는데 쓰이지 않는다**
(`hati_surprised2`, `hati_touched`, `hati_upset` 등도 미사용).

- [ ] `planet1/theme.ts` `MISSION02_THEME.hatiSprites.byNode`에 이 구간 지정 추가
  - `m2_secret_intro1`(교훈 정리) → `explaining`
  - `m2_secret_intro2`("앗, …아직 완전히 깨어나지 않았어") → **`surprised` 신규 추가 검토** 또는 `worried`
  - `m2_secret_intro3`("마지막 비밀을 알아내야 해!") → `suggesting`
  - `m2_secret_wake`("공감 거울이 깨어났어!") → `cheering`
  - `m2_secret_lesson`(교훈) → `explaining`
- [ ] `surprised`를 쓸 거면 `HATI_CHAR`에 키 추가 (`hati_surprised.png`)

### C3. 라라가 걱정을 말하는데 웃는 표정 `보통`

`m2_q2_correct_lala` — 대사는 "응. **계속 그 생각이 나.**"(싸운 걱정이 계속 맴돈다)인데 표정은 `lala_smiling`.
공감받은 직후라 옅은 미소로 의도했을 수 있어 **판단 필요**.

- [ ] 의도한 연출인지 확인 → 아니면 `planet1/theme.ts` `LALA_SPRITES.byNode.m2_q2_correct_lala` 를 `thinking`으로

### C4. 경로에 따라 표정이 달라지는 노드 14개 `낮음`

`byNode`가 sparse라 "오답→재시도"를 거쳐 왔는지에 따라 같은 노드에서 다른 표정이 나온다.

- `m1_q4_retry` — 루미가 `confused` 또는 `sick`
- `m2_q4_retry` — 솔라가 `sad2` 또는 `sad`
- `m1_q4_correct_lumi`, `m2_q2_correct_lala` 등 — 하티가 `thinking` 또는 `suggesting`

대부분 자연스러운 범위지만 의도한 건지 한 번 볼 것. 전체 목록은 리포트 "표정 감사" 탭 → "경로 분기만 보기".

- [ ] 리포트에서 14개 훑고 어색한 것만 `byNode`에 명시

---

## D. 레이아웃 (전부 DOM 측정으로 확인)

### D1. 미션 타이틀 배너가 진행도 스테퍼를 덮음 `높음`

`#titleBanner`(z-index **6**, x475–941 · y60–219)가 `.stepper`(x211–628 · y23–115)를 **8,415px²** 가린다.
3단계 라벨이 배너 뒤로 들어간다. 행성1 미션1·2 인트로에서 보인다.

- [ ] 배너를 아래로 내리거나, 스테퍼를 좁히거나, 인트로 배너 동안 스테퍼를 숨긴다

### D2. 미니게임 스크림이 스테퍼 위를 덮어 반쯤 잘려 보임 `높음`

`.er-overlay` 등 스테이지 스크림이 z-index **100** / `rgba(0,0,0,.55)`인데 `.stepper`는 z-index **auto**다.
스테퍼가 스크림 아래 깔려 어둡게 비치고, 패널(`.er-panel`, y=60부터)이 아래를 덮어 원 아이콘이 잘린 것처럼 보인다.
행성2 전 미션, 행성4 나침반에서 동일.

- [ ] 미니게임 스테이지에선 스테퍼를 숨기거나 (권장) 스크림 위로 올린다

### D3. 하티 대사 박스가 캐릭터 이름표를 가림 `보통`

`#hatiBox`(z-index **5**, y612–773)가 `.cast-name` "**미라**"(2,368px²)와 "**아르지**"(2,976px²)를 완전히 덮는다
(`.cast-member`가 z-index 2). 세 명 중 "누비"만 보인다. 행성2 미션3 결과/엔딩.

- [ ] 캐스트를 위로 올리거나, 이름표 위치를 올리거나, 하티 박스를 좁힌다

---

## 남은 확인거리

- [ ] **미니게임 스테이지는 사람이 직접 봐야 한다.** 자동 플레이가 안 돼 진입 화면까지만 찍혔다:
      행성1 거울 드래그(`m2_mirror_ab`) · 행성1 미션3 동영상(`m3_video`) · 행성2 전 미션 · 행성3 미션1·2 · 행성4 미션1·2
- [ ] **행성3 미션2·3(three.js 월드)** — 요청대로 안 팠음
- [ ] 프롤로그 "학습 목표" 카드에서도 어절이 깨진다(A1과 같은 원인인지 별도 CSS인지 확인)
- [ ] **하티 에셋 27개 중 15개가 소스 어디에서도 참조되지 않는다** — 활용하거나 지우거나.
      APK 크기는 `public/` 에셋이 지배하고 PNG는 무압축 Stored로 들어가니 그대로 용량이다.

  ```
  HatiBlink0  hati_confident  hati_confident2  hati_happy  hati_joyful
  hati_shy  hati_surprised  hati_surprised2  hati_touched  hati_upset
  hati_robot_cheering  hati_robot_flying  hati_robot_glasses  hati_robot_happy  hati_robot_hurray
  ```

  이 중 `hati_surprised`는 C2에서 바로 쓸 자리가 있다.
