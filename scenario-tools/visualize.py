#!/usr/bin/env python3
"""시나리오 JSON -> 단독 실행 HTML 그래프(Mermaid).

리뷰용 그래프를 JSON에서 '자동 생성'한다. 리뷰하는 그래프가
곧 Unity가 읽는 데이터다 (단일 진실 원천).

사용법:
    python tools/visualize.py scenarios/example_mood.json
    python tools/visualize.py            # scenarios/ 전체를 한 페이지로
    -> build/<name>.html 생성 (브라우저로 열기)
"""
import json
import sys
import glob
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

OUT_DIR = "build"


def esc(s):
    """Mermaid 라벨용 escape."""
    if s is None:
        return ""
    s = str(s).replace("\"", "'").replace("\n", " ")
    return s.replace("[", "(").replace("]", ")").replace("{", "(").replace("}", ")")


def trunc(s, n=22):
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"


def node_type(n):
    return n.get("type") or ("choice" if n.get("choices") else "line")


def cmds_str(items):
    out = []
    for c in items:
        s = c.get("cmd", "")
        if c.get("target"):
            s += f"·{c['target']}"
        if c.get("value"):
            s += f"={c['value']}"
        out.append(esc(s))
    return ", ".join(out)


def node_mermaid(n):
    """노드를 단(段) 구조로: ① id  ② 헤더(화자/선택)  ③ 대사  ④ 메타."""
    nid = n["id"]
    ntype = node_type(n)
    rows = [f"<span class='nid'>{esc(nid)}</span>"]   # ① id

    if ntype == "choice":                            # ② 헤더
        head = "🔘 선택"
        if n.get("requireAll"):
            head += " · 🔁모두탐색"
        head += f" · {len(n.get('choices') or [])}개"
        rows.append(f"<b class='hd-choice'>{head}</b>")
    elif ntype == "branch":
        rows.append(f"<b class='hd-branch'>◆ 분기 · {esc(n.get('condition', '?'))}</b>")
        if n.get("watch"):
            rows.append(f"<span class='meta'>watch: {esc(n['watch'])}</span>")
    else:
        spk = esc(n.get("speaker", "?"))
        head = f"<b class='hd-{spk}'>💬 {spk}</b>"
        if n.get("emotion"):
            head += f" <i class='emo'>({esc(n['emotion'])})</i>"
        rows.append(head)

    if n.get("text"):                                # ③ 대사
        rows.append(f"<span class='say'>“{esc(trunc(n['text'], 28))}”</span>")

    meta = []                                        # ④ 메타
    if n.get("hold") is True:
        meta.append("📌 hold 유지")
    elif n.get("hold") is False:
        meta.append("📌 hold 해제")
    if n.get("repromptText"):
        meta.append(f"↻ {esc(trunc(n['repromptText'], 20))}")
    if n.get("onEnter"):
        meta.append(f"⚙ {cmds_str(n['onEnter'])}")
    if n.get("onComplete"):
        meta.append(f"✦ {cmds_str(n['onComplete'])}")
    if meta:
        rows.append(f"<span class='meta'>{'<br/>'.join(meta)}</span>")

    label = "<br/>".join(rows)
    if ntype == "choice":
        return f'  {nid}{{{{"{label}"}}}}'   # 육각형 = 선택
    if ntype == "branch":
        return f'  {nid}{{"{label}"}}'       # 마름모 = 분기
    return f'  {nid}["{label}"]'             # 사각형 = 대사


def scenario_mermaid(data):
    lines = ["flowchart TD"]
    nodes = data.get("nodes", [])
    start = data.get("start")
    for n in nodes:
        lines.append(node_mermaid(n))
    # 간선
    for n in nodes:
        nid = n["id"]
        if node_type(n) == "branch":
            if n.get("ifTrue"):
                lines.append(f'  {nid} -->|"⭕ 참"| {n["ifTrue"]}')
            if n.get("ifFalse"):
                lines.append(f'  {nid} -->|"❌ 거짓"| {n["ifFalse"]}')
        elif n.get("choices"):
            for c in n["choices"]:
                tag = "★" if c.get("onSelect") else ""
                lines.append(f'  {nid} -->|"{esc(trunc(c.get("text",""),16))}{tag}"| {c.get("next")}')
            if n.get("requireAll") and n.get("next"):
                lines.append(f'  {nid} -.->|"모두 탐색 시"| {n["next"]}')
        elif n.get("next"):
            lines.append(f"  {nid} --> {n['next']}")
    # 타입별 색상 (classDef)
    lines += [
        "  classDef lineNode  fill:#ffffff,stroke:#9aa5b1,color:#1f2328;",
        "  classDef choiceNode fill:#fff3cd,stroke:#d39e00,stroke-width:2px,color:#5c4400;",
        "  classDef branchNode fill:#efe6ff,stroke:#8250df,stroke-width:2px,color:#3b1f78;",
        "  classDef startNode  fill:#bfe3ff,stroke:#1f6feb,stroke-width:2px;",
        "  classDef endNode    fill:#ffd6d6,stroke:#cf222e,stroke-width:2px;",
    ]
    for n in nodes:
        nid = n["id"]
        ntype = node_type(n)
        if nid == start:
            cls = "startNode"
        elif ntype == "choice":
            cls = "choiceNode"
        elif ntype == "branch":
            cls = "branchNode"
        elif ntype == "line" and n.get("next") in (None, ""):
            cls = "endNode"
        else:
            cls = "lineNode"
        lines.append(f"  class {nid} {cls};")
    return "\n".join(lines)


HTML_TMPL = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>{title}</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
  body{{font-family:system-ui,'Malgun Gothic',sans-serif;margin:0;background:#f6f8fa;color:#1f2328}}
  header{{padding:14px 22px;background:#fff;border-bottom:1px solid #d0d7de;position:sticky;top:0}}
  h1{{font-size:17px;margin:0}}
  .legend{{font-size:12px;color:#656d76;margin-top:4px}}
  .chip{{display:inline-block;padding:1px 7px;border-radius:10px;margin-right:6px}}
  section{{padding:18px 22px}}
  .card{{background:#fff;border:1px solid #d0d7de;border-radius:10px;padding:14px;margin-bottom:22px;overflow:auto}}
  h2{{font-size:14px;margin:0 0 10px;color:#1f6feb}}
  /* 노드 내부 단 구조 */
  .nid{{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#8b949e;letter-spacing:.2px}}
  .hd-hati{{color:#1f6feb}} .hd-lumi{{color:#1a7f37}} .hd-choice{{color:#9a6700}} .hd-branch{{color:#8250df}}
  .emo{{color:#8250df;font-size:11px}}
  .say{{font-size:13px}}
  .meta{{font-size:10px;color:#6e7781}}
</style></head>
<body>
<header>
  <h1>HeartGuardians — 대화 그래프 리뷰</h1>
  <div class="legend">
    <span class="chip" style="background:#bfe3ff">■ 시작</span>
    <span class="chip" style="background:#ffd6d6">■ 종료</span>
    <span class="chip">▭ line(대사)</span>
    <span class="chip">⬡ choice(선택)</span>
    <span class="chip">◇ branch(분기)</span>
    <span class="chip">🔁 모두 탐색</span>
    <span class="chip">↻ 재진입 문구</span>
    <span class="chip">⚙ onEnter(진입)</span>
    <span class="chip">✦ onComplete(대사 후)</span>
    <span class="chip">★ onSelect 효과</span>
  </div>
</header>
<section>{body}</section>
<script>mermaid.initialize({{startOnLoad:true,securityLevel:'loose',flowchart:{{htmlLabels:true,curve:'basis'}}}});</script>
</body></html>
"""


def main(argv):
    paths = argv[1:] or sorted(glob.glob("scenarios/*.json"))
    if not paths:
        print("시각화할 시나리오가 없습니다. (scenarios/*.json)")
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)

    cards = []
    for path in paths:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        title = data.get("title") or data.get("id") or os.path.basename(path)
        graph = scenario_mermaid(data)
        cards.append(f'<div class="card"><h2>{title} '
                     f'<small style="color:#656d76">({os.path.basename(path)})</small></h2>'
                     f'<pre class="mermaid">{graph}</pre></div>')

    out_name = "index.html" if len(paths) > 1 else \
        os.path.splitext(os.path.basename(paths[0]))[0] + ".html"
    out_path = os.path.join(OUT_DIR, out_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(HTML_TMPL.format(title="HeartGuardians 대화 그래프",
                                 body="\n".join(cards)))
    print(f"✅ 생성: {out_path}  (브라우저로 열기)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
