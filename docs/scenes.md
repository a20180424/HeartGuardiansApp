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
