import { describe, it, expect } from "vitest";
import { STAGES } from "./empathyRadar.data";
import { initialState, currentWord, classify } from "./empathyRadar.logic";

// 테스트는 shuffle=identity(기본값)로 결정적으로 진행.
// stage0 단어 순서: joy, joy, sad, sad, anger, anger.

describe("empathyRadar 로직", () => {
  it("초기 상태: stage0, 6단어, 진행 0, 부품 없음", () => {
    const s = initialState();
    expect(s.stageIndex).toBe(0);
    expect(s.words).toHaveLength(6);
    expect(s.wordIndex).toBe(0);
    expect(s.earnedParts).toEqual([]);
    expect(currentWord(s)?.emotionId).toBe("joy");
  });

  it("오답: 상태 변화 없이 wrong", () => {
    const s = initialState();
    const r = classify(s, "sad"); // 현재 단어는 joy
    expect(r.kind).toBe("wrong");
  });

  it("정답 1개로는 부품이 안 생기고, 2개째에 부품 획득", () => {
    let s = initialState();
    let r = classify(s, "joy"); // joy 1개째
    expect(r.kind).toBe("correct");
    if (r.kind !== "correct") return;
    expect(r.earnedPartId).toBeNull();
    expect(r.state.wordIndex).toBe(1);
    r = classify(r.state, "joy"); // joy 2개째 → 부품 1
    expect(r.kind).toBe("correct");
    if (r.kind !== "correct") return;
    expect(r.earnedPartId).toBe(1);
    expect(r.state.earnedParts).toEqual([1]);
  });

  it("스테이지 6단어 완료 시 자동으로 다음 스테이지로", () => {
    let s = initialState();
    for (const id of ["joy", "joy", "sad", "sad", "anger", "anger"]) {
      const r = classify(s, id);
      expect(r.kind).toBe("correct");
      if (r.kind === "correct") s = r.state;
    }
    expect(s.stageIndex).toBe(1);
    expect(s.wordIndex).toBe(0);
    expect(s.earnedParts).toEqual([1, 2, 3]);
    expect(currentWord(s)?.emotionId).toBe("fear");
  });

  it("마지막 스테이지 마지막 단어에서 gameDone, 부품 9개", () => {
    let s = initialState();
    const order = STAGES.flatMap((st) => st.emotions.flatMap((e) => [e.id, e.id]));
    let last;
    for (const id of order) {
      last = classify(s, id);
      if (last.kind === "correct") s = last.state;
    }
    expect(last!.kind).toBe("correct");
    if (last!.kind !== "correct") return;
    expect(last!.gameDone).toBe(true);
    expect(s.earnedParts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
