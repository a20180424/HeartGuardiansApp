# HeartGuardiansApp

**순수 vanilla HTML/JS/CSS 무빌드 MPA** + Capacitor 8 (`webDir: "www"`).
최종 실행 환경은 **Galaxy Tab A9+ 전체화면(immersive) APK**. 빌드 도구 없음 — `www/`의 정적 파일이 곧 앱이다.

## 구조 — 씬별 독립 페이지 (수정 시 필독)

- `www/` 아래 씬(행성은 미션)마다 독립 폴더: `index.html` + `script.js` + `style.css`.
  intro(`www/`) · `auth/` · `home/` · `planetN/prologue|missionM/` · `planet3/mission23/`(3D 월드).
- **페이지 간 js/css 공유 금지** — 유일한 공유는 `www/assets/`(에셋)와 `www/libs/`(three.js 복사본).
  공통 코드(히든 메뉴·음소거·SFX·fitStage·세션 가드)는 **페이지마다 복사**돼 있다(의도된 설계 —
  A 페이지 수정이 B에 영향을 주지 않게). 공통 블록을 고치면 전 페이지에 같은 수정을 반복할 것.
- 페이지 이동은 상대경로 `location.href`. DEV 점프 파라미터(`?node=`, `?step=`, `?stage2=1`,
  auth `?autologin=1`, home `?prog=N`)가 페이지마다 있다 — 미션 중간 확인에 활용.

## 레이아웃 기준

- **1280 × 800 CSS px, DPR 1.5, 가로 고정** (물리 1920×1200 ÷ 1.5). immersive라 세로 800 전부 사용.
- 미션 페이지는 관례상 **1920×1200 무대** (같은 화면의 물리픽셀 표기).
- 각 페이지의 `#stage`를 인라인 `fitStage()`가 letterbox 축소·확대. **스케일 계산은 반드시
  `document.documentElement.clientWidth`** — `window.innerWidth`는 DevTools DPR 에뮬레이션에서
  간헐적으로 어긋난다(전 페이지 수정 완료, 재도입 금지).
- 무대 내부는 px 절대배치. **`vw/vh/dvh/svh` 금지** (예외: 공통 블록의 히든 메뉴 오버레이만).

## localStorage 계약

| 키 | 내용 |
| --- | --- |
| `hg_session` | `{ creds, profile, name, progress, classBoard:[url×3] }` — auth 로그인 시 저장, intro가 시작 시 삭제 |
| `hg_progress` | `{ planetN: true }` — 행성 완료 시 병합. **로그인 때 서버값으로 덮어씀(서버 권위)** |
| `hg_pending_sync` | 완료 PUT 실패 기록 — auth 로그인 직전 재전송 후 성공분 삭제 |
| `hg_muted` | 음소거 |

home 표시 진도 = `max(hg_session.progress, hg_progress)`.

## 개발·검증

- `npm run dev` → browser-sync (CSS는 리로드 없이 주입). 테스트 계정은 gitignore된
  `www/dev-config.js` (`.env.local` 백업본 참고, 없으면 새로 작성).
- UI/씬 수정 후에는 **playwright MCP로 실제 실행 검증** (스크린샷·플레이·콘솔 에러 0).
- APK: `npm run apk` (sync → assembleDebug → adb install). 상세는 [docs/runtime-environment.md](docs/runtime-environment.md).
- 웹 배포: Cloudflare Pages가 `www/`를 무빌드로 서빙 (build command 없음, output `www`).

## mytemp — 외부 리소스 임시 반입 공간

- `mytemp/`는 게임에 쓸 이미지 등을 **외부에서 가져오는 임시 공간**이다.
- 사용자가 "새 리소스 파일"을 언급하면 **먼저 `mytemp/`를 찾아본다**.
- `mytemp/`의 리소스를 asset으로 쓸 때는 **영문으로 이름을 바꾸고**(한글·공백 파일명 금지),
  적당한 위치(예: `www/assets/planetN/`)로 **옮겨서** 사용한다.

## 이력

React 19 + Vite SPA에서 2026-07 전환됨 — 계획·규약(R1~R6)은
[docs/superpowers/plans/2026-07-18-vanilla-mpa-conversion.md](docs/superpowers/plans/2026-07-18-vanilla-mpa-conversion.md).
미션 대화는 각 페이지 `script.js`의 `MISSION` 노드 그래프(구 missionNN.json verbatim 인라인).
