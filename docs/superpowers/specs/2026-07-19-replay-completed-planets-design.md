# 완료 행성 재탐험 허용 — 설계

- 날짜: 2026-07-19
- 상태: 승인됨 (구현 계획 대기)

## 배경 / 목표

현재 홈에서는 **바로 다음 행성(unlocked) 하나만** 탐험할 수 있고, 이미 완료한 행성은
버튼이 `disabled`라 다시 들어갈 수 없다.

이걸 바꿔서:

- 이미 완료한 행성도 홈에서 선택해 **다시 탐험**할 수 있게 한다.
- 완료 행성에 대한 **추가 UI(배지·라벨 등)는 없다** — 손모양 커서만 추가.
- 이미 완료한 행성을 **또 완료해도 진도를 갱신하지 않는다**(다운그레이드·중복 저장 방지).

## 현재 동작 (근거)

- `planetState(id, progress)` — `id <= progress` → `completed`, `id === progress+1` → `unlocked`,
  나머지 `locked`. ([home/script.js](../../../www/home/script.js) L564)
- 행성 버튼 렌더링에서 `playable = status === "unlocked"` 만 클릭 가능,
  나머지는 `btn.disabled = true`. ([home/script.js](../../../www/home/script.js) L720–L751)
- `.home-planet--completed { cursor: default }` — `pointer-events` 차단은 없음.
  즉 클릭을 막는 건 오직 JS의 `disabled`. ([home/style.css](../../../www/home/style.css) L304)
- 완료 저장 `completePlanet(planet)`는 **클라이언트 측에서 이미 단조(monotonic)**:
  - `mergeProgress(planet)` — `planet1..N = true` 합집합 병합(재완료해도 상위 행성 안 지움).
  - `bumpSessionProgress(planet)` — `Math.max(현재, value)`(재완료해도 진도 안 내려감).
  - 그러나 **서버 PUT `/api/progress/{planet}` 은 재완료여도 무조건 전송**된다.
    ([planet1/mission3/script.js](../../../www/planet1/mission3/script.js) L587–L616)

### 핵심 리스크 (이 설계가 막는 것)

서버가 `progress = max(현재, planet)` 이 아니라 `progress = planet` 으로 저장하면,
낮은 행성을 재완료할 때 **서버 권위 진도가 다운그레이드**된다. localStorage 계약상
*로그인 때 `hg_progress` 를 서버값으로 덮어씀* 이라, 다음 로그인에 상위 행성 진도가 유실된다.
또한 재완료마다 더미 `review` 를 다시 PUT 하면 학급 게시판(탐험 일지)에 중복/덮어쓰기가 생길 수 있다.
서버 코드는 이 레포에 없어 거동을 확인할 수 없으므로 **클라이언트에서 재완료 저장을 스킵**해 원천 차단한다.

## 변경 사항

### 변경 1 — 홈: 완료 행성 클릭 가능

파일: [www/home/script.js](../../../www/home/script.js) (행성 버튼 렌더 블록 L720–L751)

- `playable` 판정을 `status === "unlocked"` → `status === "unlocked" || status === "completed"` 로 확장.
- 그 결과 완료 행성은 `btn.disabled` 가 걸리지 않고, unlocked 와 **동일한** 클릭 핸들러
  (`fadeNav(ROOT + "planet" + id + "/prologue/index.html")`)가 붙는다. 새 목적지·새 화면 없음.
- 로켓 라벨("탐험 시작!") 스팬은 **`status === "unlocked"` 조건 그대로 유지** — 완료 행성엔 붙이지 않는다.

### 변경 2 — 홈 CSS: 손모양 커서

파일: [www/home/style.css](../../../www/home/style.css) (L304)

- `.home-planet--completed` 의 `cursor: default` → `cursor: pointer`. 그 외 시각 변화 없음.

### 변경 3 — 재완료 스킵 가드 (completePlanet ×4)

파일 (각각 `function completePlanet` 정의를 가진 완료 지점):
- [www/planet1/mission3/script.js](../../../www/planet1/mission3/script.js)
- [www/planet2/mission3/script.js](../../../www/planet2/mission3/script.js)
- [www/planet3/mission23/script.js](../../../www/planet3/mission23/script.js)
- [www/planet4/mission3/script.js](../../../www/planet4/mission3/script.js)

각 `completePlanet(planet)` **진입부**에 가드를 추가한다:

```js
function completePlanet(planet) {
  // 재완료 스킵: 이미 완료한(진도 이하) 행성은 로컬 병합·서버 PUT을 모두 건너뛴다.
  // (서버가 progress를 max로 처리하지 않을 수 있어, 재완료가 서버 진도를 다운그레이드하고
  //  게시판 review를 중복 저장하는 것을 클라이언트에서 원천 차단한다.)
  if (planet <= currentProgress()) return;

  // 1) 낙관적 로컬 갱신 ...
  mergeProgress(planet);
  bumpSessionProgress(planet);
  ...
}
```

`currentProgress()` 는 홈의 진도 계산과 동일하게 구한다 —
`max(hg_session.progress, hg_progress에서 읽은 최고 행성 번호)`:

```js
function currentProgress() {
  let p = 0;
  try {
    const s = JSON.parse(localStorage.getItem("hg_session") || "null");
    if (s && typeof s.progress === "number") p = s.progress;
  } catch (_) { /* 무시 */ }
  try {
    const obj = JSON.parse(localStorage.getItem("hg_progress") || "{}") || {};
    for (let n = 1; n <= 4; n++) if (obj["planet" + n]) p = Math.max(p, n);
  } catch (_) { /* 무시 */ }
  return p;
}
```

- 이 헬퍼는 4개 파일 각각에 **복사**한다(페이지 간 js 공유 금지 = 공통 블록 복사 설계 준수).
- 가드는 `mergeProgress`/`bumpSessionProgress`/서버 PUT **이전**에 위치해 저장 전체를 스킵한다.

## 명시적 비변경 (YAGNI)

- 완료 행성 외관(Happy 이미지), 프롤로그·미션 내용, 서버 API·엔드포인트 불변.
- 재방문 배지/"다시 방문" 라벨 없음.
- `planetState` 판정 로직·닉네임·에너지 게이지 계산 불변(모두 단조 진도 기반이라 재탐험해도 그대로).

## 검증

playwright MCP로 실제 실행 (스크린샷·플레이·콘솔 에러 0):

1. `home/?prog=3` 진입 → 완료 행성 1·2·3 클릭 시 각 `planetN/prologue` 진입 확인.
2. 완료 행성(예: 행성2)을 끝까지 플레이해 완료 지점 도달 → 홈 복귀 시
   진도(공감 에너지 %·하트·닉네임·하티 멘트)가 **불변**인지 확인(가드 동작).
3. unlocked(다음 행성) 정상 진입·완료 시 진도 정상 증가(회귀 없음) 확인.
4. locked 행성은 여전히 클릭 불가 확인.
5. 콘솔 에러 0.
