import { describe, it, expect } from "vitest";
import {
  initialState,
  pickEmotion,
  pickAction,
  canAdvance,
  advance,
  TOTAL_STEPS,
} from "./emotionGuide.logic";

describe("emotionGuide 로직", () => {
  it("초기 상태는 step 1, 선택 없음, 결과 비어있음", () => {
    const s = initialState();
    expect(s).toEqual({ step: 1, emotion: null, action: null, results: [] });
  });

  it("pickEmotion은 감정을 설정하고 action을 리셋한다", () => {
    let s = initialState();
    s = pickAction(pickEmotion(s, "joy"), 3);
    expect(s.action).toBe(3);
    s = pickEmotion(s, "sad"); // 감정 바꾸면 action 리셋
    expect(s.emotion).toBe("sad");
    expect(s.action).toBeNull();
  });

  it("canAdvance는 감정과 행동이 둘 다 선택돼야 true", () => {
    let s = initialState();
    expect(canAdvance(s)).toBe(false);
    s = pickEmotion(s, "joy");
    expect(canAdvance(s)).toBe(false);
    s = pickAction(s, 2);
    expect(canAdvance(s)).toBe(true);
  });

  it("advance는 현재 선택을 결과에 넣고 다음 문항으로 간다", () => {
    let s = pickAction(pickEmotion(initialState(), "anger"), 5);
    const r = advance(s);
    expect(r.kind).toBe("next");
    if (r.kind === "next") {
      expect(r.state.step).toBe(2);
      expect(r.state.emotion).toBeNull();
      expect(r.state.action).toBeNull();
      expect(r.state.results).toEqual([{ situationId: 1, emotionId: "anger", actionId: 5 }]);
    }
  });

  it("마지막 문항에서 advance는 done과 10개 결과를 돌려준다", () => {
    let s = initialState();
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      s = pickAction(pickEmotion(s, "calm"), 1);
      const r = advance(s);
      if (i < TOTAL_STEPS) {
        expect(r.kind).toBe("next");
        if (r.kind === "next") s = r.state;
      } else {
        expect(r.kind).toBe("done");
        if (r.kind === "done") {
          expect(r.results).toHaveLength(10);
          expect(r.results.map((x) => x.situationId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        }
      }
    }
  });
});
