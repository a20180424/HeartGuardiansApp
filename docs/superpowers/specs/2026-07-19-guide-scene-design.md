# 탐험 안내서 씬 분리 — 설계 (Guide Scene)

**날짜:** 2026-07-19
**브랜치:** `feat/guide-scene` (worktree 격리)
**한 줄 요약:** Home 하단 "미션" 버튼이 지금 여는 빈 모달을, 세계관을 소개하는 독립 씬 `www/guide/`로 대체하고 씬 전환으로 진입한다.

## 배경 / 문제

- Home 하단 메뉴 첫 버튼 "미션"은 현재 [www/home/script.js:901-904](../../../www/home/script.js)에서 `plateMission.webp` 프레임만 뜨는 **빈 모달**을 연다(내용 미정 상태).
- 채울 콘텐츠로 `mytemp/가디언즈 탐험 안내서/`에 외부에서 만들어진 **6장짜리 인터랙티브 안내서**(자기완결형 단일 `index.html`)가 반입되어 있다.
- 분량·연출(6 슬라이드 + SVG 애니메이션)이 팝업에 담기엔 많아, **팝업이 아니라 독립 씬 + 씬 전환**으로 처리한다.

## 결정된 방향 (확정)

| 항목 | 결정 |
| --- | --- |
| 표현 방식 | 팝업 아님 → **독립 씬 + 페이드 전환** |
| 레이아웃 모델 | **A안: 안내서 자체 레이아웃 유지** (container-query 3:2, `#stage`/fitStage 미사용) |
| 씬 폴더 | `www/guide/index.html` (인라인 CSS/JS 그대로, script.js/css 분리 안 함) |
| 에셋 폴더 | `www/assets/guide/` (home이 `assets/home/` 쓰는 규칙과 동일) |
| 폰트 | 외부 Google Fonts 제거 → 앱 메인 **BMJUA**(`assets/font/BMJUA.ttf`) 하나로 통일 |
| 에셋 포맷 | 한글/공백 PNG 30개 → **영문 파일명 + WebP**(투명도 유지, `magick -quality 82`) |
| 홈 복귀 | 프레임 우측 상단 X 위에 **투명 버튼** 절대배치 → `fadeNav`로 홈 이동 |
| 효과음 | 공유 오디오 블록 + 전역 클릭 리스너 이식 → 모든 버튼 기본 `tap`(Home 팝업 X와 동일), `hg_muted` 존중, **음소거 버튼은 미표시** |

## 아키텍처 / 구현 상세

### 1. 새 씬 `www/guide/index.html`

레이아웃 A이므로 반입 `index.html`을 기반으로 하되, 아래 **씬 계약 배선**을 `<script>`에 추가한다(다른 씬들의 공통 블록에서 복사):

- **ROOT 상수** = `"../"` (guide는 www 한 단계 아래).
- **세션 가드**: `hg_session` 없으면 `location.href = ROOT + "auth/index.html"`.
- **페이드 전환**: 공통 `#scene-fade` 블록 + `fadeNav(href)` (FADE_MS=160). 홈 버튼이 사용.
- **하드웨어 뒤로가기 무시**: Capacitor `App.backButton` no-op.
- **오디오 + 전역 SFX 리스너**: `createAudio()`(오실레이터 `tone`/`SOUNDS`) + `sfxNameFor` + 전역 `pointerdown` 리스너(첫 제스처 unlock + 버튼 클릭음) + 네이티브 즉시 unlock 블록. `data-sfx` 없는 버튼은 기본 `tap`.
- `#stage`/`fitStage`/히든 메뉴/음소거 버튼은 **미포함**(A안 + 정적 안내서라 불필요).
- `<head>`: `<title>하트가디언즈 — 탐험 안내서</title>`, favicon `../favicon.svg`.

### 2. 폰트 오프라인화

- CSS 최상단 `@import url('https://fonts.googleapis.com/...')` **삭제**.
- `@font-face { font-family:"BMJUA"; src:url("../assets/font/BMJUA.ttf") format("truetype"); }` 추가.
- 기존 `font-family` 값의 `"Jua"` 및 `"Noto Sans KR"`를 모두 **`"BMJUA"`**로 치환(앱은 이미 본문까지 BMJUA를 쓰므로 일관됨; BMJUA=주아체라 기존 Jua와 사실상 동일 디자인).

### 3. 홈 복귀 버튼 (투명)

- `.app` 기준 `position:absolute`로 우측 상단 X(프레임 기준 대략 `top:8%~15% / right:4%~9%`, 지름 ~6%)에 겹치는 `<button class="guide-home" aria-label="홈으로">`.
- 배경 투명, 클릭 영역만. 클릭 → `fadeNav(ROOT + "home/index.html")`.
- 정확한 좌표는 구현 시 playwright 스크린샷으로 X 원과 겹치게 미세조정.

### 4. Home 진입 배선 (유일한 home 수정)

[www/home/script.js:901-904](../../../www/home/script.js)의 `openMenu` mission 분기:

```js
// 변경 전: mission → 빈 모달
} else {
  openModal(A + "home/plateMission.webp", null);
}
// 변경 후: mission → guide 씬으로 페이드 이동
} else {
  fadeNav(ROOT + "guide/index.html");
}
```

`plateMission.webp`는 더 이상 참조되지 않으나 삭제하지 않는다(다른 참조 여부 불확실 시 보존, 범위 최소화).

### 5. 에셋 rename + WebP 변환

`mytemp/가디언즈 탐험 안내서/*.png` → `www/assets/guide/*.webp` (30개). 변환: `magick "<src>.png" -quality 82 "www/assets/guide/<slug>.webp"`.

| 원본(한글) | → 신규 슬러그(.webp) |
| --- | --- |
| 탐험 안내서 | frame |
| 우주 배경 | space-bg |
| 하트 커넥트 | heart-connect |
| 빛의 행성 아이콘 / 안개 / 얼음 / 그림자 | planet-light / planet-mist / planet-ice / planet-shadow |
| 남자 가디언 프로필 / 여자 가디언 프로필 / 행복한 하티 | guardian-boy / guardian-girl / hati-happy |
| 루미 / 고마워하는 솔라 / 기쁜 라라 / 루나 | lumi / sola / lala / luna |
| arji2 / nubi2 / mira2 | arji / nubi / mira |
| 보니 / 코코 / 모카 / 루키 | boni / coco / mocha / luki |
| 2-1 / 1-1 / 2-2 / 4-2 (지로/토르/쉐라/쉐도) | jiro / tor / shera / shedo |
| 견습가디언(1단계) … 하트 가디언(5단)계 | badge-lv1 … badge-lv5 |

**참조 갱신 (모두 `guide/index.html` 내부):**
- 모든 HTML `<img src="…">` → 새 파일명. (경로는 CSS `background:url()`가 `frame.webp`/`space-bg.webp`를 파일명만으로 참조 → guide 폴더 기준 상대. img `src`도 파일명만 사용 중이므로, 에셋을 `assets/guide/`에 두면 `src`는 `../assets/guide/<slug>.webp`로 접두어를 붙여야 함. **CSS `url()`도 동일 접두어로 수정.**)
- ⚠ **파일명 기반 속성 선택자 11개** 갱신 필수: `.resident-photo img[src="루미.png"]{…}` 형태(루미/고마워하는 솔라/기쁜 라라/루나/arji2/nubi2/mira2/2-1/1-1/2-2/4-2)를 새 `src` 값(`../assets/guide/lumi.webp` 등)에 맞춰 고친다. 안 고치면 주민 사진 스케일 튜닝이 무효화됨.

> 경로 주의: A안에서 `index.html`이 이미지를 파일명만으로 참조하던 것을, 에셋이 `www/assets/guide/`로 이동하므로 `../assets/guide/` 접두어로 일괄 변경한다(img src, CSS url(), 속성 선택자 셀렉터 값 모두).

## 검증 (Definition of Done)

- Home "미션" 버튼 → 페이드 후 guide 씬 진입.
- 6장 슬라이드가 prev/next·닷·키보드·스와이프로 정상 전환, 이미지·배경·폰트(BMJUA) 모두 표시.
- 우측 상단 X 투명버튼 → 페이드 후 Home 복귀.
- 버튼 클릭 시 `tap` 효과음(음소거 아닐 때), `hg_muted=1`이면 무음.
- 콘솔 에러 0. playwright MCP로 1280×800에서 실행 검증(필러박스 정상).
- `www/assets/guide/`에 한글/공백 파일명·PNG 잔존 없음.

## 범위 밖 (YAGNI)

- 히든 점프 메뉴·음소거 버튼·`#stage`/fitStage 이식.
- 안내서 텍스트/이미지 콘텐츠 자체의 개편(반입본 그대로 사용).
- `plateMission.webp` 등 미사용 에셋 정리.
