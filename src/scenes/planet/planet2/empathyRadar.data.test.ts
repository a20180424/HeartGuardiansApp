import { describe, it, expect } from "vitest";
import { STAGES, stageWords, findEmotion } from "./empathyRadar.data";

describe("empathyRadar 데이터", () => {
  it("3스테이지, 각 3감정, 각 감정 2단어", () => {
    expect(STAGES).toHaveLength(3);
    for (const stage of STAGES) {
      expect(stage.emotions).toHaveLength(3);
      for (const e of stage.emotions) {
        expect(e.words).toHaveLength(2);
        // 각 단어의 emotionId는 소속 감정과 일치해야 한다
        for (const w of e.words) expect(w.emotionId).toBe(e.id);
      }
    }
  });

  it("총 18단어, 단어 id는 유일", () => {
    const words = STAGES.flatMap(stageWords);
    expect(words).toHaveLength(18);
    expect(new Set(words.map((w) => w.id)).size).toBe(18);
  });

  it("partId는 1..9 유일", () => {
    const parts = STAGES.flatMap((s) => s.emotions.map((e) => e.partId)).sort((a, b) => a - b);
    expect(parts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("stageWords는 감정 순서대로 6단어를 준다", () => {
    expect(stageWords(STAGES[0]).map((w) => w.emotionId)).toEqual([
      "joy", "joy", "sad", "sad", "anger", "anger",
    ]);
  });

  it("findEmotion은 감정을 찾고, 없으면 throw", () => {
    expect(findEmotion("joy").partId).toBe(1);
    expect(() => findEmotion("nope")).toThrow();
  });
});
