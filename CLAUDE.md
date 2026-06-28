# HeartGuardiansApp

Capacitor 8.4.1 + React 19 + Vite. 최종 실행 환경은 **Galaxy Tab A9+ 전체화면(immersive) APK**.

## 레이아웃 기준 (코드 수정 시 필독)

- **1280 × 800 CSS px, DPR 1.5, 가로(landscape) 고정** 기준으로 설계한다.
  (물리 해상도 1920×1200을 뷰포트 기준으로 쓰지 말 것 — 1920/1.5=1280, 1200/1.5=800.)
- immersive 전체화면이라 상태바·네비바가 없어 **세로 800을 전부 사용**한다.
  일반 모바일 크롬에서 나오는 innerHeight ~626은 브라우저 UI 때문이며 **최종 환경과 무관**.
- 세로 높이는 `100vh` 대신 `100dvh` / `min-height: 100svh` 사용.
- 가장자리에 붙는 UI는 transient 시스템바 대비 `env(safe-area-inset-*)` 고려.

상세 배경·DevTools 설정·UA·검증/빌드 절차는 [docs/runtime-environment.md](docs/runtime-environment.md).
