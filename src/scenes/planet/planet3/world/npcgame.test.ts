import { describe, it, expect } from "vitest";
import { parseStage2Data, createNpcGame } from "./npcgame";
import type { NpcDef } from "./npcgame";

const allWalkable = (): boolean => true;

// 3지선다 라운드: choices 3개 + 정답 인덱스(answer). 각 라운드 정답은 index 2.
const round = (n: number) => ({
  prompt: `p${n}`,
  choices: [`a${n}`, `b${n}`, `c${n}`],
  answer: 2,
  feedback: `f${n}`,
});

const sampleRaw = {
  npcs: [
    { id: 9, q: 1, r: 2, name: "A", emoji: "🐰", rounds: [round(1), round(2), round(3)] },
  ],
};

describe("parseStage2Data", () => {
  it("normalizes npcs and reassigns ids by index", () => {
    const { npcs, warnings } = parseStage2Data(sampleRaw, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]!.id).toBe(0); // json의 id:9 무시, 인덱스로 재부여
    expect(npcs[0]!.rounds).toHaveLength(3);
    expect(npcs[0]!.rounds[0]!.choices).toEqual(["a1", "b1", "c1"]);
    expect(npcs[0]!.rounds[0]!.answer).toBe(2);
    expect(warnings).toHaveLength(0);
  });

  it("drops npc on non-walkable hex with a warning", () => {
    const isWalkable = (q: number, r: number): boolean => !(q === 1 && r === 2);
    const { npcs, warnings } = parseStage2Data(sampleRaw, isWalkable);
    expect(npcs).toHaveLength(0);
    expect(warnings.some((w) => w.includes("1,2"))).toBe(true);
  });

  it("warns when round count is not 3 but keeps the npc", () => {
    const data = { npcs: [{ q: 0, r: 0, rounds: [round(1)] }] };
    const { npcs, warnings } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(warnings.some((w) => w.includes("라운드"))).toBe(true);
  });

  it("drops a round with too few choices or an out-of-range answer", () => {
    const data = { npcs: [{ q: 0, r: 0, rounds: [
      { prompt: "p", choices: ["only-one"], answer: 0, feedback: "f" },      // 선택지 부족
      { prompt: "p", choices: ["a", "b"], answer: 5, feedback: "f" },        // answer 범위 밖
      round(1),                                                              // 유효
    ] }] };
    const { npcs, warnings } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]!.rounds).toHaveLength(1); // 유효한 것만 남음
    expect(warnings.filter((w) => w.includes("형식 오류")).length).toBe(2);
  });

  it("drops malformed npc", () => {
    const data = { npcs: [{ q: 0, rounds: [] }, sampleRaw.npcs[0]] };
    const { npcs } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
  });
});

describe("createNpcGame", () => {
  const npcs = (): NpcDef[] => parseStage2Data(sampleRaw, allWalkable).npcs;

  it("correct choice raises level and advances round", () => {
    const g = createNpcGame(npcs());
    expect(g.currentRound(0)!.prompt).toBe("p1");
    const r = g.choose(0, 2); // 정답 인덱스
    expect(r.accepted).toBe(true);
    expect(r.level).toBe(1);
    expect(r.npcDone).toBe(false);
    expect(r.feedback).toBe("f1");
    expect(g.currentRound(0)!.prompt).toBe("p2");
  });

  it("wrong choice keeps level and round (retry)", () => {
    const g = createNpcGame(npcs());
    const r = g.choose(0, 0); // 오답 인덱스
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(0);
    expect(g.levelOf(0)).toBe(0);
    expect(g.currentRound(0)!.prompt).toBe("p1"); // 같은 라운드 유지
  });

  it("three correct choices complete the npc at level 3", () => {
    const g = createNpcGame(npcs());
    g.choose(0, 2);
    g.choose(0, 2);
    const r = g.choose(0, 2);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
    expect(r.allDone).toBe(true);
    expect(g.isDone(0)).toBe(true);
    expect(g.currentRound(0)).toBeNull();
  });

  it("choosing on a finished npc is a no-op", () => {
    const g = createNpcGame(npcs());
    g.choose(0, 2); g.choose(0, 2); g.choose(0, 2);
    const r = g.choose(0, 2);
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
  });

  it("allDone stays false until every npc is finished", () => {
    const two = parseStage2Data({ npcs: [
      { q: 0, r: 0, rounds: [round(1)] },
      { q: 1, r: 0, rounds: [round(1)] },
    ] }, allWalkable).npcs;
    const g = createNpcGame(two);
    expect(g.allDone()).toBe(false);
    g.choose(0, 2);            // npc0 done, npc1 not
    expect(g.isDone(0)).toBe(true);
    expect(g.allDone()).toBe(false);
    g.choose(1, 2);            // both done
    expect(g.allDone()).toBe(true);
  });
});
