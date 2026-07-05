import { describe, it, expect } from "vitest";
import { SITUATIONS, EMOTIONS, COPING_ACTIONS } from "./emotionGuide.data";

describe("emotionGuide 데이터", () => {
  it("상황은 10개이고 id가 1~10이다", () => {
    expect(SITUATIONS).toHaveLength(10);
    expect(SITUATIONS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    SITUATIONS.forEach((s) => {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
    });
  });

  it("감정은 8개이고 id가 유일하며 이모지/이름이 있다", () => {
    expect(EMOTIONS).toHaveLength(8);
    const ids = EMOTIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(8);
    EMOTIONS.forEach((e) => {
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.emoji.length).toBeGreaterThan(0);
    });
  });

  it("모든 감정마다 행동 6개(id 1~6)와 피드백 6개(키 1~6)가 있다", () => {
    EMOTIONS.forEach((e) => {
      const coping = COPING_ACTIONS[e.id];
      expect(coping, `감정 ${e.id}의 copingActions`).toBeDefined();
      expect(coping.actions.map((a) => a.id)).toEqual([1, 2, 3, 4, 5, 6]);
      coping.actions.forEach((a) => {
        expect(a.text.length).toBeGreaterThan(0);
        expect(a.emoji.length).toBeGreaterThan(0);
      });
      [1, 2, 3, 4, 5, 6].forEach((k) => {
        expect(coping.feedbacks[k], `감정 ${e.id} 피드백 ${k}`).toBeTruthy();
      });
    });
  });
});
