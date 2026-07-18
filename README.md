# 하트가디언즈 우주공감탐험대 (HeartGuardiansApp)

초등학생 대상 공감 교육 게임. 순수 vanilla HTML/JS/CSS **무빌드 MPA**로,
Capacitor로 Galaxy Tab A9+ 전체화면 APK를 만든다.

## 실행

```bash
npm install
npm run dev     # browser-sync 개발 서버 (www/ 서빙, 자동 리로드 + CSS 주입)
npm run apk     # 태블릿 연결 후: cap sync → APK 빌드 → adb 설치·실행
```

- 로그인 테스트 계정: gitignore된 `www/dev-config.js` (팀 내 공유).
- 웹 배포: Cloudflare Pages — 빌드 명령 없음, output 디렉터리 `www`.

## 구조

- `www/` — 앱 전체. 씬(행성은 미션)마다 독립 폴더(`index.html`+`script.js`+`style.css`).
- `www/assets/`, `www/libs/` — 유일한 공유물 (에셋, three.js 복사본).
- `android/` — Capacitor 안드로이드 프로젝트.
- 자세한 작업 규칙: [CLAUDE.md](CLAUDE.md), [docs/runtime-environment.md](docs/runtime-environment.md).
