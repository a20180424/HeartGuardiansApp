# Scene 폴더 구조 리팩터링 (대기 중)

> 상태: **제안 / 미착수.** `feat/home-scene` 머지 후 별도 브랜치
> (`refactor/scene-folders`)에서 진행한다. 순수 구조 리팩터링이라 기능
> 브랜치와 섞지 않는다.
>
> 착수 시: brainstorming으로 아래 "확정 필요" 항목을 먼저 결정한 뒤 plan을 짠다.

## 왜

앞으로 8개 Scene(Intro/Auth/Home/Planet1~4/Outro, [scenes.md](scenes.md))을
계속 추가할 건데, 지금 구조는 **절반만 scene 기반**이라 일관성이 없다.
"같이 바뀌는 건 같이 둔다"는 원칙으로 scene을 폴더째 이해/이동/삭제할 수 있게 만든다.

## 현재 상태 진단

```
src/scenes/
  Auth.tsx        ← 진입 컴포넌트는 평면
  Auth.css
  auth/           ← 부품은 하위 폴더 (두 곳에 걸침)
    Chooser.tsx, CredentialForm.tsx, SchoolPicker.tsx, WelcomePanel.tsx,
    auth.logic.ts
  Home.tsx
  Home.css
  home/
    EnergyGauge.tsx, ProfileCard.tsx, Mothership.tsx, PlanetButton.tsx,
    MenuBar.tsx, HatiHelper.tsx, Modal.tsx, home.logic.ts, home.data.ts
  Intro.tsx, Intro.css, intro.logic.ts
  Planet1~4.tsx, Outro.tsx
src/assets/auth/, src/assets/home/   ← 에셋은 별도 트리
src/lib/        ← 공용: api, auth, session, progress, useFitStage
src/mission/, src/missions/, src/engine/, src/three/  ← 사실상 Planet 구현
```

문제 3가지:

1. **진입 파일과 부품이 분리됨** — `Home.tsx`는 `scenes/`에, 부품은
   `scenes/home/`에. 한 scene이 두 곳에 걸쳐 있다.
2. **에셋이 멀리 떨어져 있음** — `src/assets/home/`은 별도 트리. scene을
   통째로 옮기거나 지우려면 두 군데를 건드려야 한다.
3. **Planet scene의 실제 구현이 top-level에 흩어짐** — `mission/`,
   `missions/`, `engine/`, `three/`가 사실상 Planet1~4의 내용물인데
   `scenes/`와 완전히 분리돼 있다.

## 목표 구조 (제안)

scene별 자족(self-contained) 폴더 + 공용은 명시적으로 분리.

```
src/
  scenes/
    home/
      index.tsx          (현 Home.tsx)
      Home.css
      components/         (EnergyGauge, ProfileCard, Mothership, ...)
      home.logic.ts
      home.data.ts
      assets/            (현 src/assets/home/*)
    auth/
      index.tsx
      ...
    planet/              (mission / missions / engine / three 흡수)
  shared/  (또는 lib/ 유지)
    session.ts, api.ts, progress.ts, useFitStage.ts
    components/          (여러 scene 공용 UI)
```

핵심 원칙: **"같이 바뀌는 건 같이 둔다"** — scene 하나를 폴더째로 이해/이동/삭제.

## 결정된 사항

- **Modal은 공용으로 뺀다.** 현재 `scenes/home/Modal.tsx`는 주석상 "Generic
  Modal"이고 다른 scene도 쓸 예정. scene 폴더에 두면 "home의 부품"으로
  오해된다 → `shared/components/Modal.tsx`로 이동.
- **이번 Home 기능 브랜치에 섞지 않는다.** 거의 모든 import 경로를 건드리는
  순수 구조 변경이라 별도 브랜치/PR로 분리.

## 착수 전 확정 필요 (brainstorming 항목)

- `components/` 하위 폴더로 묶을지 vs scene 폴더에 평면으로 둘지
- 공용 폴더 네이밍: `shared/` 신설 vs 기존 `lib/` 유지·확장
- 에셋 co-locate 방식: `scenes/home/assets/`로 이동 vs `src/assets/home/` 유지
  (Vite import 경로 / 빌드 영향 확인)
- 진입 파일 네이밍: `index.tsx` vs `Home.tsx` 유지 (import 경로 가독성 trade-off)
- `mission/missions/engine/three`를 `scenes/planet/` 아래로 어떻게 흡수할지
  (Planet1~4가 공유하는 엔진이라 scene 종속이 아닐 수 있음 — 재검토)
