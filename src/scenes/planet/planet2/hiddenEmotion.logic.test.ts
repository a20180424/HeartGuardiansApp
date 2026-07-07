import { describe, it, expect } from "vitest";
import {
  initialState, useRadar, allRevealed, submitPuzzle, nextMission, isLastMission,
} from "./hiddenEmotion.logic";

describe("hiddenEmotion 로직", () => {
  it("초기 상태: 미션0, 카드 2장 공개, 미해결", () => {
    const s = initialState();
    expect(s.missionIndex).toBe(0);
    expect(s.revealedCount).toBe(2);
    expect(s.puzzleSolved).toBe(false);
    expect(s.feedbackShown).toBe(false);
  });

  it("useRadar 3회로 5장까지 공개되고 그 이상은 안 올라감", () => {
    let s = initialState();
    s = useRadar(s); s = useRadar(s); s = useRadar(s);
    expect(s.revealedCount).toBe(5);
    expect(allRevealed(s)).toBe(true);
    s = useRadar(s);
    expect(s.revealedCount).toBe(5);
  });

  it("퍼즐: 단서 2개 미만이면 need-more", () => {
    const s = initialState();
    expect(submitPuzzle(s, [0], "속상함").kind).toBe("need-more");
  });

  it("퍼즐: 감정 오답이면 wrong", () => {
    const s = initialState();
    expect(submitPuzzle(s, [0, 2], "기쁨").kind).toBe("wrong");
  });

  it("퍼즐: 단서 2개+정답이면 solved (puzzleSolved·feedbackShown true)", () => {
    const s = initialState();
    const r = submitPuzzle(s, [0, 4], "속상함"); // 미션0 정답=속상함
    expect(r.kind).toBe("solved");
    if (r.kind !== "solved") return;
    expect(r.state.puzzleSolved).toBe(true);
    expect(r.state.feedbackShown).toBe(true);
  });

  it("nextMission: 인덱스 +1, 미션 상태 리셋", () => {
    let s = initialState();
    s = { ...s, revealedCount: 5, puzzleSolved: true, feedbackShown: true };
    s = nextMission(s);
    expect(s.missionIndex).toBe(1);
    expect(s.revealedCount).toBe(2);
    expect(s.puzzleSolved).toBe(false);
    expect(s.feedbackShown).toBe(false);
  });

  it("isLastMission: 미션2에서 true", () => {
    let s = initialState();
    expect(isLastMission(s)).toBe(false);
    s = nextMission(nextMission(s));
    expect(s.missionIndex).toBe(2);
    expect(isLastMission(s)).toBe(true);
  });
});
