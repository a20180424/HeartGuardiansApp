#!/usr/bin/env python3
"""시나리오 JSON 검증기.

자작 대화 시스템에서 ROI가 제일 큰 도구. 손으로 쓴 JSON의
끊긴 링크/오타/도달 불가 노드를 런타임 전에 잡아준다.

사용법:
    python tools/validate.py scenarios/example_mood.json
    python tools/validate.py            # scenarios/ 폴더 전체 검사
"""
import json
import sys
import glob
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def validate_scenario(path):
    errors, warns = [], []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    nodes = data.get("nodes", [])
    ids = [n.get("id") for n in nodes]

    # 1) 필수 최상위 필드
    for key in ("id", "start", "nodes"):
        if key not in data:
            errors.append(f"최상위 필드 누락: '{key}'")

    # 2) 노드 id 중복 / 누락
    seen = set()
    for i, n in enumerate(nodes):
        nid = n.get("id")
        if nid is None:
            errors.append(f"nodes[{i}]: id 없음")
            continue
        if nid in seen:
            errors.append(f"노드 id 중복: '{nid}'")
        seen.add(nid)

        ntype = n.get("type") or ("choice" if n.get("choices") else "line")
        if n.get("type") and n["type"] not in ("line", "choice", "branch"):
            errors.append(f"노드 '{nid}': 알 수 없는 type '{n['type']}' (line/choice/branch만 허용)")
        if ntype == "line":
            for key in ("speaker", "text"):
                if key not in n:
                    errors.append(f"노드 '{nid}'(line): 필수 필드 '{key}' 누락")
            if n.get("choices"):
                errors.append(f"노드 '{nid}'(line): choices가 있으면 type을 choice로")
        elif ntype == "branch":
            for key in ("ifTrue", "ifFalse"):
                if not n.get(key):
                    errors.append(f"노드 '{nid}'(branch): 필수 필드 '{key}' 누락")
            if n.get("condition") == "allExplored" and not n.get("watch"):
                errors.append(f"노드 '{nid}'(branch): allExplored인데 watch가 없음")
            elif n.get("condition") and n["condition"] not in ("allExplored",):
                warns.append(f"노드 '{nid}'(branch): 처음 보는 condition '{n['condition']}'")
        else:
            if not n.get("choices"):
                errors.append(f"노드 '{nid}'(choice): choices가 없음")

    idset = set(ids)

    # 3) start 유효성
    start = data.get("start")
    if start is not None and start not in idset:
        errors.append(f"start '{start}' 에 해당하는 노드가 없음")

    # 4) 간선 유효성 (next / choices.next / branch)
    for n in nodes:
        nid = n.get("id")
        ntype = n.get("type") or ("choice" if n.get("choices") else "line")
        has_choices = bool(n.get("choices"))
        require_all = bool(n.get("requireAll"))
        nxt = n.get("next")

        if ntype == "branch":
            for key in ("ifTrue", "ifFalse", "watch"):
                tgt = n.get(key)
                if tgt and tgt not in idset:
                    errors.append(f"노드 '{nid}'(branch): {key} '{tgt}' 가 존재하지 않는 노드를 가리킴")
            continue

        if require_all and not has_choices:
            errors.append(f"노드 '{nid}': requireAll인데 choices가 없음")
        # requireAll의 next는 폴백(선택). 완료 진행은 보통 branch가 담당
        if require_all and nxt not in (None, "") and nxt not in idset:
            errors.append(f"노드 '{nid}': next '{nxt}' 가 존재하지 않는 노드를 가리킴")
        if not require_all and has_choices and nxt not in (None, ""):
            warns.append(f"노드 '{nid}': choices와 next 동시 존재 (런너는 choices 우선, next 무시됨)")
        if not has_choices and nxt not in (None, "") and nxt not in idset:
            errors.append(f"노드 '{nid}': next '{nxt}' 가 존재하지 않는 노드를 가리킴")
        for j, c in enumerate(n.get("choices") or []):
            cn = c.get("next")
            if cn not in idset:
                errors.append(f"노드 '{nid}'.choices[{j}]: next '{cn}' 가 존재하지 않는 노드를 가리킴")
        if n.get("choices") == []:
            warns.append(f"노드 '{nid}': choices가 빈 배열 (분기 없음으로 처리됨)")

    # 5) 도달 가능성 (start에서 BFS)
    by_id = {n.get("id"): n for n in nodes}
    reachable = set()
    if start in by_id:
        stack = [start]
        while stack:
            cur = stack.pop()
            if cur in reachable or cur not in by_id:
                continue
            reachable.add(cur)
            n = by_id[cur]
            nt = n.get("type") or ("choice" if n.get("choices") else "line")
            if nt == "branch":
                for key in ("ifTrue", "ifFalse"):
                    if n.get(key):
                        stack.append(n[key])
            elif n.get("choices"):
                for c in n["choices"]:
                    if c.get("next"):
                        stack.append(c["next"])
                if n.get("requireAll") and n.get("next"):
                    stack.append(n["next"])   # 폴백 자동 진행
            elif n.get("next"):
                stack.append(n["next"])
    for nid in idset:
        if nid not in reachable:
            warns.append(f"노드 '{nid}': start에서 도달 불가 (고아 노드)")

    # 6) 종료 가능성 (line 중 next:null 이 있나)
    terminals = [n.get("id") for n in nodes
                 if (n.get("type") or ("choice" if n.get("choices") else "line")) == "line"
                 and n.get("next") in (None, "")]
    if not terminals:
        warns.append("종료 노드(next:null, choices 없음)가 하나도 없음 — 무한 루프 위험")

    return errors, warns


def main(argv):
    paths = argv[1:] or sorted(glob.glob("scenarios/*.json"))
    if not paths:
        print("검사할 시나리오가 없습니다. (scenarios/*.json)")
        return 1

    total_err = 0
    for path in paths:
        try:
            errors, warns = validate_scenario(path)
        except json.JSONDecodeError as e:
            print(f"❌ {path}: JSON 문법 오류 — {e}")
            total_err += 1
            continue

        name = os.path.basename(path)
        if not errors and not warns:
            print(f"✅ {name}: 통과")
        else:
            status = "❌" if errors else "⚠️ "
            print(f"{status} {name}")
            for e in errors:
                print(f"   ERROR: {e}")
            for w in warns:
                print(f"   WARN:  {w}")
        total_err += len(errors)

    print(f"\n총 {len(paths)}개 검사, 오류 {total_err}건")
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
