# 탐험 안내서 씬 분리 (Guide Scene) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home 하단 "미션" 버튼이 여는 빈 모달을, 세계관을 소개하는 독립 씬 `www/guide/`로 대체하고 페이드 씬 전환으로 진입한다.

**Architecture:** `mytemp/가디언즈 탐험 안내서/index.html`(자기완결형 6-슬라이드 안내서)을 A안 그대로 — 자체 container-query 레이아웃 유지 — `www/guide/index.html`로 이식한다. 외부 폰트를 앱 BMJUA로 교체하고, 한글/PNG 에셋 30개를 `www/assets/guide/`에 영문+WebP로 변환하며, 다른 씬들의 공통 블록(세션 가드·페이드·오디오)을 복사해 씬 계약을 맞춘다. Home은 mission 분기 한 줄만 바꿔 진입시킨다.

**Tech Stack:** Vanilla HTML/CSS/JS (무빌드), Capacitor 8 (`webDir: www`), ImageMagick 7 (`magick`) for WebP, playwright MCP for verification. **테스트 프레임워크 없음** — 검증은 grep/ls + playwright MCP(실행·스크린샷·콘솔 에러 0), CLAUDE.md 관례.

## Global Constraints

- 레이아웃 기준: 안내서 자체 3:2 container-query 유지. **`#stage`/`fitStage` 미사용**(A안). 다른 씬과 달리 이 씬만 예외.
- 페이지 간 js/css 공유 금지 — 공통 블록(세션 가드·페이드·오디오·SFX)은 **이 씬에 복사**한다(의도된 중복).
- 에셋 파일명 **한글·공백 금지** → 영문 슬러그. 포맷 WebP(투명도 유지), `magick "<src>" -quality 82 "<dst>"`.
- 폰트는 오프라인 APK 대상 → **외부 CDN 금지**. 앱 메인 `BMJUA`(`www/assets/font/BMJUA.ttf`)만 사용.
- ROOT(guide→www) = `"../"`, 에셋 접두어 = `"../assets/"` (home과 동일 깊이).
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: 에셋 변환 (rename + WebP)

`mytemp/가디언즈 탐험 안내서/*.png` 30개를 `www/assets/guide/*.webp`로 영문 슬러그 변환.

**Files:**
- Create: `www/assets/guide/` (신규 폴더, webp 30개)
- Source (읽기): `mytemp/가디언즈 탐험 안내서/*.png`

**Interfaces:**
- Produces: `www/assets/guide/` 아래 다음 30개 파일 — Task 2가 `../assets/guide/<slug>.webp`로 참조.
  `frame, space-bg, heart-connect, planet-light, planet-mist, planet-ice, planet-shadow, guardian-boy, guardian-girl, hati-happy, lumi, sola, lala, luna, arji, nubi, mira, boni, coco, mocha, luki, jiro, tor, shera, shedo, badge-lv1, badge-lv2, badge-lv3, badge-lv4, badge-lv5`

- [ ] **Step 1: 변환 스크립트 실행 (bash)**

`www/assets/guide/`를 만들고, 매핑표대로 각 PNG를 WebP로 변환한다. mytemp 원본은 그대로 둔다(반입 공간).

```bash
cd "D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene"
SRC="mytemp/가디언즈 탐험 안내서"
DST="www/assets/guide"
mkdir -p "$DST"

# "원본파일(확장자 제외)|슬러그" 매핑
map='
탐험 안내서|frame
우주 배경|space-bg
하트 커넥트|heart-connect
빛의 행성 아이콘|planet-light
안개 행성 아이콘|planet-mist
얼음 행성 아이콘|planet-ice
그림자 행성 아이콘|planet-shadow
남자 가디언 프로필|guardian-boy
여자 가디언 프로필|guardian-girl
행복한 하티|hati-happy
루미|lumi
고마워하는 솔라|sola
기쁜 라라|lala
루나|luna
arji2|arji
nubi2|nubi
mira2|mira
보니|boni
코코|coco
모카|mocha
루키|luki
2-1|jiro
1-1|tor
2-2|shera
4-2|shedo
견습가디언(1단계)|badge-lv1
이해의 가디언(2단계)|badge-lv2
관찰의 가디언(3단계)|badge-lv3
연결의 가디언(4단계)|badge-lv4
하트 가디언(5단)계|badge-lv5
'
echo "$map" | while IFS='|' read -r name slug; do
  [ -z "$name" ] && continue
  magick "$SRC/$name.png" -quality 82 "$DST/$slug.webp" && echo "OK $slug.webp"
done
```

- [ ] **Step 2: 결과 검증 (파일 30개, 한글/PNG 없음)**

```bash
cd "D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene"
echo "count:"; ls www/assets/guide/*.webp | wc -l          # 기대: 30
echo "non-ascii names (기대: 없음):"; ls www/assets/guide/ | grep -P '[^\x00-\x7f]' || echo "none"
echo "size before/after (space-bg 예):"; \
  du -h "mytemp/가디언즈 탐험 안내서/우주 배경.png" www/assets/guide/space-bg.webp
```
Expected: `count: 30`, non-ascii "none", space-bg webp가 원본 5.5MB보다 크게 작아짐.

- [ ] **Step 3: Commit**

```bash
git add www/assets/guide
git commit -m "$(printf 'feat(guide): 탐험 안내서 에셋 30개 영문 슬러그+WebP 변환\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: guide 씬 파일 생성 (레이아웃 A + 폰트 + 경로/셀렉터 재작성)

반입 `index.html`을 `www/guide/index.html`로 만들고, 폰트를 BMJUA로, 모든 에셋 참조를 `../assets/guide/<slug>.webp`로 바꾼다. **이 시점엔 씬 계약 배선(Task 3) 전이므로 세션 가드 없이 파일 자체가 브라우저에서 6장 렌더되면 성공.**

**Files:**
- Create: `www/guide/index.html` (from `mytemp/가디언즈 탐험 안내서/index.html`)

**Interfaces:**
- Consumes: Task 1의 `www/assets/guide/*.webp` 30개, `www/assets/font/BMJUA.ttf`.
- Produces: `www/guide/index.html` — Task 3가 여기에 `<script>` 씬 계약 블록과 홈 버튼을 추가.

- [ ] **Step 1: 원본 복사**

```bash
cd "D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene"
mkdir -p www/guide
cp "mytemp/가디언즈 탐험 안내서/index.html" www/guide/index.html
```

- [ ] **Step 2: 외부 폰트 제거 + BMJUA @font-face 추가**

`www/guide/index.html` 첫 `<style>` 최상단의 이 줄을 삭제:
```css
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@500;700;900&display=swap');
```
그 자리에 아래를 넣는다(경로는 guide→assets 한 단계 `../`):
```css
@font-face {
  font-family: "BMJUA";
  src: url("../assets/font/BMJUA.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: 폰트 패밀리 치환 (Jua / Noto Sans KR → BMJUA)**

CSS 전체에서 폰트 지정을 BMJUA로 통일한다. 다음 두 치환을 전역 적용:
- `"Jua", sans-serif` → `"BMJUA", sans-serif`
- `"Jua"` (단독, 예: `font-family: "Jua";`) → `"BMJUA"`
- body의 `font-family: "Noto Sans KR", system-ui, sans-serif;` → `font-family: "BMJUA", system-ui, sans-serif;`

검증:
```bash
grep -n "Jua\|Noto Sans KR\|googleapis" www/guide/index.html || echo "clean"
```
Expected: `clean` (Jua/Noto Sans KR/googleapis 잔존 0).

- [ ] **Step 4: 이미지 경로 접두어 + 슬러그 일괄 치환 (img src / CSS url / 속성 선택자)**

원본은 이미지를 **파일명만**(`src="루미.png"`, `url("탐험 안내서.png")`)으로 참조한다. 에셋이 `www/assets/guide/`로 이동했으므로 **모두 `../assets/guide/<slug>.webp`로** 바꾼다. 대상은 세 종류: `<img src>`, CSS `background: url(...)`, 그리고 `.resident-photo img[src="..."]` **속성 선택자 11개**.

아래 sed 스크립트로 30개 파일명을 한 번에 치환(HTML의 src·CSS url·선택자 문자열이 모두 같은 `"<원본>.png"` 패턴이라 동일 치환으로 커버됨):

```bash
cd "D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene"
F=www/guide/index.html
# "원본.png|../assets/guide/슬러그.webp"
repl='
탐험 안내서.png|../assets/guide/frame.webp
우주 배경.png|../assets/guide/space-bg.webp
하트 커넥트.png|../assets/guide/heart-connect.webp
빛의 행성 아이콘.png|../assets/guide/planet-light.webp
안개 행성 아이콘.png|../assets/guide/planet-mist.webp
얼음 행성 아이콘.png|../assets/guide/planet-ice.webp
그림자 행성 아이콘.png|../assets/guide/planet-shadow.webp
남자 가디언 프로필.png|../assets/guide/guardian-boy.webp
여자 가디언 프로필.png|../assets/guide/guardian-girl.webp
행복한 하티.png|../assets/guide/hati-happy.webp
루미.png|../assets/guide/lumi.webp
고마워하는 솔라.png|../assets/guide/sola.webp
기쁜 라라.png|../assets/guide/lala.webp
루나.png|../assets/guide/luna.webp
arji2.png|../assets/guide/arji.webp
nubi2.png|../assets/guide/nubi.webp
mira2.png|../assets/guide/mira.webp
보니.png|../assets/guide/boni.webp
코코.png|../assets/guide/coco.webp
모카.png|../assets/guide/mocha.webp
루키.png|../assets/guide/luki.webp
2-1.png|../assets/guide/jiro.webp
1-1.png|../assets/guide/tor.webp
2-2.png|../assets/guide/shera.webp
4-2.png|../assets/guide/shedo.webp
견습가디언(1단계).png|../assets/guide/badge-lv1.webp
이해의 가디언(2단계).png|../assets/guide/badge-lv2.webp
관찰의 가디언(3단계).png|../assets/guide/badge-lv3.webp
연결의 가디언(4단계).png|../assets/guide/badge-lv4.webp
하트 가디언(5단)계.png|../assets/guide/badge-lv5.webp
'
# 특수문자(괄호 등)가 있으므로 python으로 안전하게 리터럴 치환
python - "$F" <<'PY'
import sys
f=sys.argv[1]
pairs="""
탐험 안내서.png|../assets/guide/frame.webp
우주 배경.png|../assets/guide/space-bg.webp
하트 커넥트.png|../assets/guide/heart-connect.webp
빛의 행성 아이콘.png|../assets/guide/planet-light.webp
안개 행성 아이콘.png|../assets/guide/planet-mist.webp
얼음 행성 아이콘.png|../assets/guide/planet-ice.webp
그림자 행성 아이콘.png|../assets/guide/planet-shadow.webp
남자 가디언 프로필.png|../assets/guide/guardian-boy.webp
여자 가디언 프로필.png|../assets/guide/guardian-girl.webp
행복한 하티.png|../assets/guide/hati-happy.webp
루미.png|../assets/guide/lumi.webp
고마워하는 솔라.png|../assets/guide/sola.webp
기쁜 라라.png|../assets/guide/lala.webp
루나.png|../assets/guide/luna.webp
arji2.png|../assets/guide/arji.webp
nubi2.png|../assets/guide/nubi.webp
mira2.png|../assets/guide/mira.webp
보니.png|../assets/guide/boni.webp
코코.png|../assets/guide/coco.webp
모카.png|../assets/guide/mocha.webp
루키.png|../assets/guide/luki.webp
2-1.png|../assets/guide/jiro.webp
1-1.png|../assets/guide/tor.webp
2-2.png|../assets/guide/shera.webp
4-2.png|../assets/guide/shedo.webp
견습가디언(1단계).png|../assets/guide/badge-lv1.webp
이해의 가디언(2단계).png|../assets/guide/badge-lv2.webp
관찰의 가디언(3단계).png|../assets/guide/badge-lv3.webp
연결의 가디언(4단계).png|../assets/guide/badge-lv4.webp
하트 가디언(5단)계.png|../assets/guide/badge-lv5.webp
"""
s=open(f,encoding="utf-8").read()
for line in pairs.strip().splitlines():
    src,dst=line.split("|")
    s=s.replace(src,dst)
open(f,"w",encoding="utf-8").write(s)
print("done")
PY
```

검증:
```bash
echo "잔존 .png (기대: 없음):"; grep -o '[^"()]*\.png' www/guide/index.html || echo "none"
echo "non-ascii in src/url (기대: 없음):"; grep -nP 'src="[^"]*[^\x00-\x7f]|url\("[^"]*[^\x00-\x7f]' www/guide/index.html || echo "none"
echo "webp 참조 수:"; grep -o '\.\./assets/guide/[a-z0-9-]*\.webp' www/guide/index.html | sort -u | wc -l   # 기대: 30
```
Expected: `.png` none, non-ascii none, 고유 webp 참조 30.

- [ ] **Step 5: 브라우저 단독 렌더 검증 (playwright MCP)**

이 단계는 아직 세션 가드가 없어 파일을 직접 열어 렌더만 본다. 로컬 파일 경로로 네비게이트(또는 dev 서버):
- `mcp__playwright__browser_navigate` → `file:///D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene/www/guide/index.html`
- `mcp__playwright__browser_take_screenshot` — 1번 슬라이드(우주의 위기)에 프레임·행성 아이콘·하트 커넥트·BMJUA 제목이 보여야 함.
- `mcp__playwright__browser_console_messages` — 404(이미지 로드 실패)·에러 0.
- next 버튼을 6번 눌러(또는 dot) 각 슬라이드 이미지가 다 뜨는지 확인, 특히 슬라이드4(주민 사진 16명)·슬라이드5(배지 5개).

Expected: 6장 모두 이미지 정상, 콘솔 에러/404 0.
(주의: `file://`에서 TTF/webp가 CORS 없이 로드됨. 폰트가 안 뜨면 `@font-face` 경로 재확인.)

- [ ] **Step 6: Commit**

```bash
git add www/guide/index.html
git commit -m "$(printf 'feat(guide): 안내서 index.html 이식 — BMJUA 폰트·WebP 경로 재작성\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: 씬 계약 배선 + 홈 복귀 버튼

`www/guide/index.html`에 세션 가드·페이드·오디오/SFX·뒤로가기 무시를 복사하고, 프레임 X 위 투명 홈 버튼을 추가한다.

**Files:**
- Modify: `www/guide/index.html`
- Reference (복사 원본): `www/home/script.js` (검증된 공통 블록 verbatim)

**Interfaces:**
- Consumes: `www/home/script.js`의 공통 블록. guide는 home과 동일 깊이(`../`)라 블록이 수정 없이 동작.
- Produces: guide 씬이 `hg_session` 가드·`fadeNav`·오디오를 갖춤. 홈 버튼이 `fadeNav("../home/index.html")` 호출.

- [ ] **Step 1: 씬 계약 `<script>` 블록 추가 (기존 캐러셀 `<script>` 위에)**

`www/guide/index.html`의 `</body>` 직전, **기존 캐러셀 스크립트(`const track = ...`)보다 앞**에 새 `<script>`를 추가한다. 아래 순서로, 지정한 원본 라인을 **verbatim 복사**한다(페이지별 복제는 CLAUDE.md 관례). 단, home 전용 로직(홈 렌더링)은 복사하지 않는다 — 아래 열거한 블록만:

새 `<script>` 내용:
```js
"use strict";
const ROOT = "../";               // guide → www 한 단계
```
그다음 아래 블록들을 `www/home/script.js`에서 그대로 이어 붙인다:
- **세션 가드** — [www/home/script.js:14-19](../../../www/home/script.js) (`if (!localStorage.getItem("hg_session")) { location.href = ROOT + "auth/index.html"; }`)
- **뒤로가기 무시** — [www/home/script.js:37-44](../../../www/home/script.js)
- **씬 페이드 + fadeNav** — [www/home/script.js:46-63](../../../www/home/script.js)
- **오디오 모듈** — [www/home/script.js:65-209](../../../www/home/script.js) (`const audio = (function createAudio(){…})();`)
- **sfxNameFor** — [www/home/script.js:211-216](../../../www/home/script.js)
- **전역 pointerdown 리스너(unlock+SFX)** — [www/home/script.js:218-231](../../../www/home/script.js)
- **네이티브 즉시 unlock** — [www/home/script.js:233-241](../../../www/home/script.js)

**복사하지 않는 것:** `fitStage`(24-35), 히든 메뉴, 음소거 버튼, home 렌더 로직.

검증:
```bash
grep -c "createAudio\|sfxNameFor\|fadeNav\|hg_session\|fitStage" www/guide/index.html
```
Expected: `createAudio` 1, `sfxNameFor` 있음(1+), `fadeNav` 있음, `hg_session` 있음, **`fitStage` 0**.

- [ ] **Step 2: `<head>` 타이틀·파비콘 정리**

`www/guide/index.html`의 `<head>`에서 `<title>`을 `하트가디언즈 — 탐험 안내서`로, 파비콘 링크를 추가한다(다른 씬 관례):
```html
<title>하트가디언즈 — 탐험 안내서</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
```

- [ ] **Step 3: 홈 복귀 투명 버튼 — HTML**

`www/guide/index.html`의 `<main class="app" …>` 여는 태그 바로 다음 줄에 투명 버튼을 넣는다(`.app` 기준 절대배치이므로 `.app` 자식이어야 함):
```html
<button type="button" class="guide-home" aria-label="홈으로"></button>
```

- [ ] **Step 4: 홈 복귀 버튼 — CSS (레이아웃 A `<style>` 안, `.controls` 근처)**

프레임 우측 상단 X 원에 겹치도록 `.app` 기준 % 배치. 초기값(플레이라이트로 미세조정):
```css
.guide-home {
  position: absolute;
  z-index: 6;
  top: 6.5%;
  right: 3.4%;
  width: 6.2%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.guide-home:active { transform: scale(.94); }
```

- [ ] **Step 5: 홈 복귀 버튼 — 동작 배선 (캐러셀 스크립트 끝 또는 씬 스크립트 끝)**

버튼 클릭 → 페이드 후 홈. 씬 스크립트(Step 1 블록) 맨 끝에 추가:
```js
document.querySelector(".guide-home").addEventListener("click", () => {
  fadeNav(ROOT + "home/index.html");
});
```
(전역 pointerdown 리스너가 이 버튼 클릭에 `tap` SFX를 자동 재생 — Home 팝업 X와 동일음.)

- [ ] **Step 6: 통합 렌더·가드·홈버튼 검증 (playwright MCP)**

세션 가드를 통과시키려 최소 세션을 심고 guide로 진입:
- `mcp__playwright__browser_navigate` → 앱 오리진(dev 서버 또는 `file://…/www/home/index.html`)
- `mcp__playwright__browser_evaluate`:
  ```js
  () => localStorage.setItem("hg_session", JSON.stringify({ name:"검증", progress:0, profile:{}, creds:{} }))
  ```
- guide로 이동: navigate → `…/www/guide/index.html`
- 스크린샷 — X 자리에 투명버튼이 얹혀 있고(눈엔 X만 보임), 슬라이드1 정상.
- X 영역 클릭(`mcp__playwright__browser_click`, ref=`.guide-home`) → 홈(`home/index.html`)으로 이동했는지 URL/스크린샷 확인.
- 콘솔 에러 0.

Expected: 가드 통과, 6장 정상, X 클릭 시 홈 복귀, 에러 0.

- [ ] **Step 7: Commit**

```bash
git add www/guide/index.html
git commit -m "$(printf 'feat(guide): 세션가드·페이드·SFX 씬계약 + X 투명 홈버튼\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: Home 진입 배선

Home "미션" 버튼을 빈 모달 대신 guide 씬으로 페이드 이동시킨다.

**Files:**
- Modify: `www/home/script.js:901-904` (`openMenu`의 mission `else` 분기)

**Interfaces:**
- Consumes: `fadeNav`(home에 이미 존재, [www/home/script.js:56](../../../www/home/script.js)), `ROOT`(=`"../"`).
- Produces: Home mission 버튼 → `../guide/index.html` 진입.

- [ ] **Step 1: mission 분기 교체**

`www/home/script.js`의 `openMenu` 함수 끝 `else` 분기를 바꾼다.
변경 전:
```js
    } else {
      // mission: 내용 미정 — 빈 모달 (원본과 동일).
      openModal(A + "home/plateMission.webp", null);
    }
```
변경 후:
```js
    } else {
      // mission: 탐험 안내서 씬으로 전환 (guide/index.html).
      fadeNav(ROOT + "guide/index.html");
    }
```

검증:
```bash
grep -n "guide/index.html\|plateMission" www/home/script.js
```
Expected: `fadeNav(ROOT + "guide/index.html")` 존재, `plateMission` 참조 사라짐.

- [ ] **Step 2: Commit**

```bash
git add www/home/script.js
git commit -m "$(printf 'feat(home): 미션 버튼 → 탐험 안내서 씬(guide)으로 전환\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: End-to-End 검증 (Home → Guide → Home)

실제 진입 흐름 전체를 dev 서버 + playwright로 확인한다.

**Files:** 없음(검증 전용). 필요 시 `www/dev-config.js`를 `.env.local` 백업에서 생성(gitignore, 커밋 안 함).

- [ ] **Step 1: dev 서버 기동**

```bash
cd "D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene"
# dev-config 없으면 .env.local 백업에서 생성 (CLAUDE.md)
ls www/dev-config.js 2>/dev/null || echo "필요 시 .env.local(HG_TEST_*)로 www/dev-config.js 작성"
npm run dev   # browser-sync; run_in_background 로 띄우고 URL 확보
```

- [ ] **Step 2: 전체 흐름 playwright 검증**

- `?autologin=1`로 auth→home 진입(또는 Step 3방식 세션 주입 후 home).
- Home에서 하단 첫 버튼(미션) 클릭 → 페이드 후 guide 진입 스크린샷.
- guide에서 next/dot로 6장 순회 — 이미지·BMJUA·애니메이션 정상.
- 좌우 화살표 키(`ArrowRight`)로도 넘어가는지 1회 확인.
- X(홈) 클릭 → Home 복귀 스크린샷.
- `mcp__playwright__browser_console_messages` — 전 과정 에러/404 0.
- 1280×800 리사이즈(`mcp__playwright__browser_resize` 1280×800)에서 3:2 안내서가 좌우 얇은 필러박스로 letterbox되고 잘림 없이 보이는지 확인.

Expected: 진입·순회·복귀 모두 정상, 콘솔 에러 0.

- [ ] **Step 3: 최종 정리 확인 (grep)**

```bash
cd "D:/Work-HeartGuardians/HeartGuardiansApp/.claude/worktrees/feat+guide-scene"
echo "guide 내 한글 파일참조/외부폰트 잔존 (기대: 없음):"
grep -nP '(src|url)\([^)]*[^\x00-\x7f]|googleapis' www/guide/index.html || echo "clean"
echo "assets/guide 목록:"; ls www/assets/guide/ | head
git status --short
```
Expected: `clean`, 워킹트리에 미커밋 변경 없음(dev-config 제외).

- [ ] **Step 4: 브랜치 마무리**

`superpowers:finishing-a-development-branch` 스킬로 PR 생성 옵션 진행(사용자가 병합).

## Self-Review

- **Spec coverage:** 씬 분리+진입(Task 4)·레이아웃 A(Task 2)·BMJUA(Task 2 S2-3)·에셋 영문+WebP(Task 1, 경로 Task 2 S4)·속성 선택자 11개(Task 2 S4에 포함, sed/py가 `"루미.png"` 등 셀렉터 문자열도 동일 치환)·투명 홈버튼(Task 3 S3-5)·SFX=tap(Task 3 S1 오디오+리스너)·검증(Task 5) — 스펙 항목 전부 태스크에 매핑됨.
- **Placeholder scan:** TBD/TODO 없음. 좌표는 "playwright 미세조정"으로 초기값 제시(플레이스홀더 아님).
- **Type/이름 일관성:** 슬러그 30개가 Task 1 produces ↔ Task 2 참조표 ↔ Task 3 검증에서 동일. `fadeNav`/`ROOT`/`hg_session`/`.guide-home` 이름이 Task 3·4에서 일치.
