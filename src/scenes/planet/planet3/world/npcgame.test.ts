import { describe, it, expect } from "vitest";
import { parseStage2Data, createNpcGame } from "./npcgame";
import type { NpcDef } from "./npcgame";

const allWalkable = (): boolean => true;

const sampleRaw = {
  npcs: [
    { id: 9, q: 1, r: 2, name: "A", emoji: "🐰", rounds: [
      { prompt: "p1", warm: "w1", cold: "c1", feedback: "f1" },
      { prompt: "p2", warm: "w2", cold: "c2", feedback: "f2" },
      { prompt: "p3", warm: "w3", cold: "c3", feedback: "f3" },
    ] },
  ],
};

describe("parseStage2Data", () => {
  it("normalizes npcs and reassigns ids by index", () => {
    const { npcs, warnings } = parseStage2Data(sampleRaw, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]!.id).toBe(0); // json의 id:9 무시, 인덱스로 재부여
    expect(npcs[0]!.rounds).toHaveLength(3);
    expect(warnings).toHaveLength(0);
  });

  it("drops npc on non-walkable hex with a warning", () => {
    const isWalkable = (q: number, r: number): boolean => !(q === 1 && r === 2);
    const { npcs, warnings } = parseStage2Data(sampleRaw, isWalkable);
    expect(npcs).toHaveLength(0);
    expect(warnings.some((w) => w.includes("1,2"))).toBe(true);
  });

  it("warns when round count is not 3 but keeps the npc", () => {
    const data = { npcs: [{ q: 0, r: 0, rounds: [{ prompt: "p", warm: "w", cold: "c", feedback: "f" }] }] };
    const { npcs, warnings } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(warnings.some((w) => w.includes("라운드"))).toBe(true);
  });

  it("drops malformed npc", () => {
    const data = { npcs: [{ q: 0, rounds: [] }, sampleRaw.npcs[0]] };
    const { npcs } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
  });
});

describe("createNpcGame", () => {
  const npcs = (): NpcDef[] => parseStage2Data(sampleRaw, allWalkable).npcs;

  it("warm answer raises level and advances round", () => {
    const g = createNpcGame(npcs());
    expect(g.currentRound(0)!.prompt).toBe("p1");
    const r = g.choose(0, true);
    expect(r.accepted).toBe(true);
    expect(r.level).toBe(1);
    expect(r.npcDone).toBe(false);
    expect(r.feedback).toBe("f1");
    expect(g.currentRound(0)!.prompt).toBe("p2");
  });

  it("cold answer keeps level and round (retry)", () => {
    const g = createNpcGame(npcs());
    const r = g.choose(0, false);
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(0);
    expect(g.levelOf(0)).toBe(0);
    expect(g.currentRound(0)!.prompt).toBe("p1"); // 같은 라운드 유지
  });

  it("three warm answers complete the npc at level 3", () => {
    const g = createNpcGame(npcs());
    g.choose(0, true);
    g.choose(0, true);
    const r = g.choose(0, true);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
    expect(r.allDone).toBe(true);
    expect(g.isDone(0)).toBe(true);
    expect(g.currentRound(0)).toBeNull();
  });

  it("choosing on a finished npc is a no-op", () => {
    const g = createNpcGame(npcs());
    g.choose(0, true); g.choose(0, true); g.choose(0, true);
    const r = g.choose(0, true);
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
  });
});
