# Scene 목록 (라우트 매핑)

> 출처: `src/App.tsx`의 `<Routes>` 정의. Scene 컴포넌트는 `src/scenes/`에 위치.
> 자주 바뀌지 않는 구조 정보다. 라우트를 추가/변경하면 이 문서도 함께 갱신할 것.

앱은 **8개의 Scene**으로 구성되며, 각 Scene은 1개의 라우트에 매핑된다.

| #   | Scene   | URL         | 컴포넌트                 |
| --- | ------- | ----------- | ------------------------ |
| 1   | Intro   | `/intro`    | `src/scenes/Intro.tsx`   |
| 2   | Auth    | `/auth`     | `src/scenes/Auth.tsx`    |
| 3   | Home    | `/home`     | `src/scenes/Home.tsx`    |
| 4   | Planet1 | `/planet/1` | `src/scenes/Planet1.tsx` |
| 5   | Planet2 | `/planet/2` | `src/scenes/Planet2.tsx` |
| 6   | Planet3 | `/planet/3` | `src/scenes/Planet3.tsx` |
| 7   | Planet4 | `/planet/4` | `src/scenes/Planet4.tsx` |
| 8   | Outro   | `/outro`    | `src/scenes/Outro.tsx`   |

## 진입 처리

- `/` (루트) 진입 시 `<Navigate to="/intro" replace />`로 `/intro`에 리다이렉트된다. 별도 Scene이 아니라 진입 처리용.

## 흐름

```
Intro → Auth → Home → Planet 1~4 → Outro
```

## Planet 내부 구성

각 Planet은 하나의 라우트(`/planet/N`)로 진입하지만, 내부적으로 여러 단계(stage)로 구성된다.

> **용어 주의**: Planet 내부의 도입/마무리 단계는 전체 앱의 `Intro`/`Outro` Scene과 다르다.
> 혼동을 막기 위해 Planet 내부 단계는 **프롤로그(prologue)** / **에필로그(epilogue)**로 부른다.

전체 구성(목표):

```
프롤로그 → mission1 → mission2 → mission3 → 에필로그
```

### Planet1 진도 체크

| 단계               | 설명             | 상태              |
| ------------------ | ---------------- | ----------------- |
| 프롤로그 (prologue) | Planet1 도입부   | 🟡 골격만 (내용 ⬜) |
| mission1           | 미션 1           | ✅ 구현됨         |
| mission2           | 미션 2           | ⬜ 미구현         |
| mission3           | 미션 3           | ⬜ 미구현         |
| 에필로그 (epilogue) | Planet1 마무리   | ⬜ 미구현         |

- `src/scenes/planet/planet1/index.tsx`는 subscene을 순서대로 진행하는 **컨테이너**다(내부 상태 머신, 라우트는 `/planet/1` 하나).
- 프롤로그: `Prologue.tsx` — 배경 + "탐험 시작!" 버튼만 있는 골격. 버튼 → mission1. 내용은 추후.
- mission1: `MissionPlayer`로 `mission01.json` 재생.
- mission2 / mission3 / 에필로그는 아직 미구현 상태.

> **subscene 용어**: Planet 내부의 단위(prologue·mission·epilogue)를 subscene이라 부른다.
> 미션 안의 배경 `stage1/stage2`·진행 스테퍼와 헷갈리지 않게 `stage`라는 말은 피한다.

### Planet2~4 진도 체크

- Planet2~4의 내부 구성은 아직 미정. 확정되면 위와 같은 표로 추가한다.
