# Planet2 미션1 — 반 결과 대시보드(대기록관) 설계

작성일: 2026-07-05
관련 브랜치: `feat/planet2-content`
선행: [게임 기능 설계](2026-07-05-planet2-mission1-emotion-guide-game-design.md), [양장본 비주얼](2026-07-05-planet2-mission1-emotion-guide-visual-design.md)

## 목표

미션1 감정 설명서 게임(10문항) 완료 후, **우리 반 친구들의 답변 취합 결과**를 보여주는
대시보드(원본 `mytemp/행성2_미션1_게임.html`의 "우주 통신 대기록관")를 붙인다.
실제 운영에선 반 아이들이 각자 태블릿으로 입력하고 서버가 10초마다 취합한 데이터를 받아오며,
선생님이 완료하면 다음으로 넘어간다. **지금은 서버가 없어 가짜 데이터(점진적 도착 시뮬레이션)로 채운다.**

## 배치 (새 노드/JSON 변경 없음)

- 대시보드는 **`p2_m1_play` 미니게임의 마지막 단계**로 붙인다(사용자 결정).
- `EmotionGuideStage`에 `phase: "play" | "board"` 추가. 10문항 완료 → `onFinish` 대신 **board 단계 전환**(내 답 보관).
  board의 **완료** 버튼(선생님 관리자 액션) → `props.onFinish(results)` → `p2_m1_result`로 진행.
- 대시보드는 별도 컴포넌트 `ClassResultsBoard.tsx`로 분리(파일 비대화 방지). mission01.json 무변경.

## 데이터 소스 추상화 (핵심 — 서버 교체 최소화)

`src/scenes/planet/planet2/classResults.source.ts`:

```ts
export interface ClassVote {
  studentId: string;
  studentName: string;
  situationId: number;
  emotionId: string;
  actionId: number;
}
export interface ClassVotesSnapshot {
  votes: ClassVote[];        // 지금까지 응답(도착)한 표
  respondedStudents: number;
  totalStudents: number;
  complete: boolean;         // 전원 응답 완료
}
export interface ClassVotesSource {
  fetch(): Promise<ClassVotesSnapshot>;   // 실제 서버의 10초 폴링 모델과 동일 형태
}

export function createFakeClassVotesSource(opts?: {
  totalStudents?: number;   // 기본 25
  arrivalPerTick?: number;  // fetch 호출당 새로 도착시킬 학생 수
  seed?: number;            // 결정적 생성용(테스트)
}): ClassVotesSource;
// 나중: export function createServerClassVotesSource(missionId: string): ClassVotesSource;
```

- 컴포넌트는 `ClassVotesSource`에만 의존 → `source.fetch()`를 인터벌로 폴링. 어떤 어댑터인지 모른다.
- 집계 로직은 `ClassVote[]`만 받는 순수 함수 → 소스와 무관.
- **가짜 어댑터**: 마운트 시 25명 × 10상황 가짜 투표를 원본 `populateMockData`식 감정 가중치로 1회 생성.
  `fetch()` 호출마다 응답 학생 수를 `arrivalPerTick`씩 늘려 스냅샷 반환(도착 시뮬레이션). 전원 도달 시 `complete=true`.
- **서버 교체 지점 = 한 곳**: 주입부에서 `createFakeClassVotesSource()` → `createServerClassVotesSource()`,
  폴링 간격 상수(`POLL_MS`)만 1500 → 10000. 컴포넌트/로직/집계 무변경.

## 집계 로직 (`classResults.logic.ts`, 순수·테스트)

원본 `renderTeacherStats`/`renderTeacherActionDetails` 이식:

```ts
// 특정 상황의 감정 분포: 감정별 표수 + 퍼센트, maxCount
export function emotionDistribution(votes: ClassVote[], situationId: number):
  { emotionId: string; count: number; pct: number }[];
// 상위 1~3위(표수 내림차순)
export function leaderboard(votes: ClassVote[], situationId: number):
  { emotionId: string; count: number; pct: number }[]; // 길이 3, 빈 자리는 count 0
// 특정 상황·감정의 행동별 선택자 명단
export function actionBreakdown(votes: ClassVote[], situationId: number, emotionId: string):
  { actionId: number; count: number; voterNames: string[] }[]; // 6개(id 1~6)
```

`EMOTIONS`/`SITUATIONS`/`COPING_ACTIONS`는 `emotionGuide.data`에서 재사용.

## 대시보드 컴포넌트 (`ClassResultsBoard.tsx`)

props: `{ source: ClassVotesSource; pollMs: number; onComplete: () => void }`.
- 마운트 시 `source.fetch()`를 즉시 + `pollMs`마다 폴링 → 스냅샷 state 갱신. 언마운트 시 인터벌 정리.
- 상단: 하티 말풍선 바("우리 반 친구들은 어떤 대답을 했는지 알아보자. 모두 다 대답을 할 때까지 기다려볼까.")
  + 응답 현황 `respondedStudents / totalStudents` + **완료** 버튼(`complete`일 때만 활성) → `onComplete`.
- 왼쪽: 상황 선택 드롭다운(10개) + 감정 분포 막대(8감정 count+%) + 🏆 순위표 1~3위.
- 오른쪽: 선택 감정의 해소 & 공감 분석 — 행동 6개별 count + 선택 대원 명단(가짜 이름).
- 감정 막대 클릭 → 오른쪽 분석 감정 전환.
- 로컬 UI state: 선택 상황(기본 1), 선택 감정(기본 분포 1위 또는 첫 감정).

## 흐름

```
EmotionGuideStage: phase "play" (10문항) → 완료 시 results 보관 + phase="board"
ClassResultsBoard: source.fetch() 폴링 → 점진 도착 표시 → 전원 응답 시 완료 활성
완료 클릭 → onComplete → EmotionGuideStage.props.onFinish(results) → 엔진 advance → p2_m1_result
```

## 비주얼

같은 카드(1632×1020) 안이라 **양장본 톤(초록/금색/종이)** 으로 통일(원본의 stone 다크 대기록관 색이 아님).

## 테스트

- `classResults.logic.test.ts`: 분포 count/pct, 순위 정렬(내림차순·상위3), 행동별 명단 매칭.
- `classResults.source.test.ts`: 가짜 어댑터가 25×10=250표(유효 emotion/action) 생성, `fetch()` 반복 시 respondedStudents 증가 → 전원 도달 시 complete, revealed subset만 votes에 포함.
- 컴포넌트 DOM 테스트 없음(관례) → tsc/lint + 1280×800 스크린샷(점진 도착·완료 활성·상황/감정 전환).

## 적응 결정 / 스코프 제외

- 제외: 가상 학급 데이터 채우기·통계 초기화 버튼(원본), 새 노드/JSON 변경.
- 내 답은 서버가 나중에 병합 — 지금 가짜 25명엔 미포함(이름 없음).
- 폴링 간격: 가짜 1500ms(데모용), 실제 10000ms(상수 하나).
