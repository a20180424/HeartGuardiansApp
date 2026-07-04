# HeartGuardiansApp

Capacitor 8.4.1 + React 19 + Vite. 최종 실행 환경은 **Galaxy Tab A9+ 전체화면(immersive) APK**.

## 레이아웃 기준 (코드 수정 시 필독)

- **1280 × 800 CSS px, DPR 1.5, 가로(landscape) 고정** 기준으로 설계한다.
  (물리 해상도 1920×1200을 뷰포트 기준으로 쓰지 말 것 — 1920/1.5=1280, 1200/1.5=800.)
- immersive 전체화면이라 상태바·네비바가 없어 **세로 800을 전부 사용**한다.

### FixedStage — 어떤 브라우저·비율에서도 1280×800 강제

- `player/` **바깥**의 모든 씬은 [`src/lib/FixedStage.tsx`](src/lib/FixedStage.tsx)로 감싼다.
  1280×800 고정 캔버스를 화면 중앙에 `transform: scale()`로 균등 축소(letterbox)한다.
  → 어떤 창 크기·비율에서도 내부는 **항상 1280×800 좌표계**로 보인다(남는 곳은 검은 여백).
- 그래서 씬 내부는 **px로 절대배치**한다. **`100vw`/`100dvh`/`100svh`/`vh`/`vw`를 쓰지 말 것**
  — 이 단위들은 무대가 아니라 실제 뷰포트 기준이라 letterbox 시 깨진다. 루트는 `position:absolute; inset:0`으로 무대를 채운다.
  (무대에 transform이 걸려 있어 자식의 `position:fixed`는 뷰포트가 아닌 무대 기준이 된다.)
- **예외 — 미션 엔진(`src/scenes/planet/player/`)**: 자체 무대 `#stage`(**1920×1200**, `useFitStage` 기본값)를
  이미 쓴다. FixedStage로 감싸지 말 것. 미션용 커스텀 CSS는 그 파일의 1920×1200 관례를 따른다.
  (1920×1200 = 1280×800의 물리픽셀 표기라 같은 화면. player/ 안에 격리돼 있음.)

상세 배경·DevTools 설정·UA·검증/빌드 절차는 [docs/runtime-environment.md](docs/runtime-environment.md).
