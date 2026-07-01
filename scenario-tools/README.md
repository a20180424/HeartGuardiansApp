# scenario-tools

미션 시나리오 JSON(`src/scenes/planet/**/mission*.json`) 검토용 스크립트.
**최종 앱에는 포함되지 않는다** (리뷰 전용). 원본: `D:/Work-HeartGuardians/Scenario/tools`.

## 사용법

```bash
cd scenario-tools

# 스키마 검증 (끊긴 링크·고아 노드·무한루프 검사)
python validate.py  ../src/scenes/planet/planet1/mission02.json

# Mermaid 그래프 HTML 생성 → build/*.html
python visualize.py ../src/scenes/planet/planet1/mission02.json
```

- 인자 없이 실행하면 CWD 기준 `scenarios/*.json`을 찾으므로, 위처럼 파일 경로를 넘긴다.
- 산출물(`build/`)은 git에 커밋하지 않는다(`.gitignore`).
- HTML은 `file:` 접근이 막힌 브라우저에선 `python -m http.server`로 띄워서 연다.
