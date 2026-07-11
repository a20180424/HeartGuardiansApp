import { describe, it, expect } from "vitest";
import { parseStage1Data, createCollectGame } from "./collectgame";
import type { CGBubble } from "./collectgame";

const allWalkable = (): boolean => true;

describe("parseStage1Data", () => {
  it("normalizes valid bubbles with ids and boolean good", () => {
    const data = { passScore: 5, bubbles: [
      { q: 0, r: 3, text: "고마워", good: true },
      { q: 1, r: 2, text: "싫어", good: false },
    ] };
    const { bubbles, passScore, warnings } = parseStage1Data(data, allWalkable);
    expect(passScore).toBe(5);
    expect(bubbles).toEqual([
      { id: 0, q: 0, r: 3, text: "고마워", good: true },
      { id: 1, q: 1, r: 2, text: "싫어", good: false },
    ]);
    // good(1) < passScore(5) → 경고
    expect(warnings.some((w) => w.includes("착한 말"))).toBe(true);
  });

  it("drops bubbles on non-walkable hexes with a warning", () => {
    const data = { bubbles: [{ q: 9, r: 9, text: "x", good: true }] };
    const isWalkable = (q: number, r: number): boolean => !(q === 9 && r === 9);
    const { bubbles, warnings } = parseStage1Data(data, isWalkable);
    expect(bubbles).toHaveLength(0);
    expect(warnings.some((w) => w.includes("9,9") || w.includes("(9,9)"))).toBe(true);
  });

  it("drops malformed bubbles", () => {
    const data = { bubbles: [{ q: 0, text: 123 }, { q: 0, r: 0, text: "ok", good: true }] };
    const { bubbles } = parseStage1Data(data, allWalkable);
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0]!.text).toBe("ok");
  });

  it("defaults passScore to 5 when missing", () => {
    const { passScore } = parseStage1Data({ bubbles: [] }, allWalkable);
    expect(passScore).toBe(5);
  });
});

describe("createCollectGame", () => {
  const good: CGBubble = { id: 1, q: 0, r: 0, text: "", good: true };
  const bad: CGBubble = { id: 2, q: 0, r: 0, text: "", good: false };

  it("adds 1 for taking a good word", () => {
    const g = createCollectGame({ passScore: 5 });
    const r = g.choose(good, true);
    expect(r.scored).toBe(true);
    expect(r.score).toBe(1);
    expect(g.score).toBe(1);
  });

  it("taking a bad word at score 0 stays at 0 (floor)", () => {
    const g = createCollectGame({ passScore: 5 });
    const r = g.choose(bad, true);
    expect(r.scored).toBe(false);
    expect(r.score).toBe(0);
  });

  it("subtracts 1 for taking a bad word when score is positive", () => {
    const g = createCollectGame({ passScore: 5 });
    g.choose({ id: 10, q: 0, r: 0, text: "", good: true }, true);
    g.choose({ id: 11, q: 0, r: 0, text: "", good: true }, true); // score 2
    const r = g.choose({ id: 2, q: 0, r: 0, text: "", good: false }, true); // 2 -> 1
    expect(r.score).toBe(1);
    expect(g.score).toBe(1);
  });

  it("never lets the score go below 0 across repeated bad words", () => {
    const g = createCollectGame({ passScore: 5 });
    g.choose({ id: 10, q: 0, r: 0, text: "", good: true }, true); // score 1
    expect(g.choose({ id: 2, q: 0, r: 0, text: "", good: false }, true).score).toBe(0); // 1 -> 0
    expect(g.choose({ id: 3, q: 0, r: 0, text: "", good: false }, true).score).toBe(0); // stays 0
  });

  it("adds 0 for not taking a good word", () => {
    const g = createCollectGame({ passScore: 5 });
    const r = g.choose(good, false);
    expect(r.score).toBe(0);
  });

  it("ignores a bubble already consumed (no double score)", () => {
    const g = createCollectGame({ passScore: 5 });
    g.choose(good, true);
    const r = g.choose(good, true);
    expect(r.alreadyConsumed).toBe(true);
    expect(g.score).toBe(1);
    expect(g.isConsumed(good.id)).toBe(true);
  });

  it("sets passed once score reaches passScore", () => {
    const g = createCollectGame({ passScore: 2 });
    expect(g.choose({ id: 1, q: 0, r: 0, text: "", good: true }, true).passed).toBe(false);
    expect(g.choose({ id: 2, q: 0, r: 0, text: "", good: true }, true).passed).toBe(true);
    expect(g.passed).toBe(true);
  });
});
