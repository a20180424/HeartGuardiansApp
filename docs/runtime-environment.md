# 최종 실행 환경 상세 (Galaxy Tab A9+ / Capacitor APK)

> 요약·작업 기준은 루트 `CLAUDE.md` 참고. 이 문서는 배경 설명과 검증/설정 절차다.

## 기기 사양 (Galaxy Tab A9+, SM-X210 WiFi / SM-X216 5G)

- 11.0인치, 물리 해상도 **1920 × 1200 px**, 약 206 ppi, 90Hz TFT LCD
- **devicePixelRatio = 1.5** (실기기 측정)

## 왜 레이아웃 기준이 1280 × 800인가

웹이 보는 뷰포트는 물리 픽셀이 아니라 **CSS 픽셀(DIP)** 이고, 둘의 비율이 DPR이다.

```
CSS 뷰포트 = 물리 해상도 / devicePixelRatio
1920 / 1.5 = 1280
1200 / 1.5 = 800
```

→ **물리 해상도 1920×1200을 코드/뷰포트 기준으로 쓰면 안 된다.** 실제 기준은 1280×800.

### "626" 함정

일반 모바일 크롬 브라우저에서 `window.innerHeight`를 찍으면 ~626이 나온다. 이는
**주소창 + 안드로이드 상태바/네비게이션바**가 차지한 만큼 빠진 값이라 **최종 APK 환경과 무관**하다.

최종 환경은 immersive 전체화면(아래)이라 그 UI가 전부 없으므로 **세로 800을 전부 사용**한다.

## 전체화면이 보장되는 근거 (코드)

- `android/app/src/main/AndroidManifest.xml` → `android:screenOrientation="landscape"` (가로 고정)
- `android/app/src/main/java/com/heartguardians/app/MainActivity.java`의 `enableImmersive()`:
  - `WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.systemBars())` → 상태바+네비바 숨김
  - `WindowCompat.setDecorFitsSystemWindows(window, false)` → edge-to-edge
  - `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` → 가장자리 스와이프 시 바가 잠깐만 나타남
  - `onWindowFocusChanged`에서 포커스 복귀 시 재적용 (알림 등에서 돌아와도 유지)

가장자리에 붙는 중요한 UI는 transient 바와 겹칠 수 있으니 필요 시 `env(safe-area-inset-*)` 고려.

## Chrome DevTools 커스텀 기기 설정 (개발 검증용)

```
Name: Galaxy Tab A9+ (fullscreen)
Width: 1280   Height: 800   DPR: 1.5   Orientation: Landscape
UA type: Mobile
```

- 모델명: SM-X210(WiFi) / SM-X216(5G). 태블릿이라 일반 크롬 UA에는 `Mobile` 토큰이 없다.

## User Agent

최종 환경은 Chrome 브라우저가 아니라 **Android System WebView**다 (`; wv)` + `Version/4.0` 토큰 포함).
서버가 UA 스니핑을 한다면 유의:

```
Mozilla/5.0 (Linux; Android 14; SM-X210 Build/...; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Safari/537.36
```

정확한 값은 실기기 WebView를 `chrome://inspect`로 열어 `navigator.userAgent`로 확인한다.

## 가장 정확한 검증 방법

1. APK를 디버그 가능 상태로 빌드(WebView 디버깅 활성).
2. PC 크롬 `chrome://inspect/#devices` → **Discover USB devices** → 해당 WebView 탭 **inspect**.
3. 콘솔에서 `window.innerWidth / innerHeight / devicePixelRatio` 직접 확인 → 1280 / 800 / 1.5 기대.

## 빌드

- 웹 빌드 없음 — `www/`의 정적 파일이 곧 앱이다 (무빌드).
- APK: `npm run apk` = `npx cap sync android` → `gradlew assembleDebug` → `adb install` (+실행).

## DevTools 계측 주의 (innerWidth)

DPR 에뮬레이션·OS 배율 환경에서 `window.innerWidth`가 페이지 로드 직후 CSS 뷰포트의
1.25~1.5배로 잘못 보고되는 간헐 현상이 있다(2026-07-19 계측·확인). 레이아웃 계산은
`document.documentElement.clientWidth`를 쓸 것 — 전 페이지의 `fitStage()`가 이미 이 방식이다.

## 스택

순수 vanilla HTML/JS/CSS 무빌드 MPA + Capacitor 8.4.1. `webDir: "www"`, appId `com.heartguardians.app`.
(2026-07: React 19 + Vite에서 전환 — docs/superpowers/plans/2026-07-18-vanilla-mpa-conversion.md)
