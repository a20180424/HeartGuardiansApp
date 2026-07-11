import { describe, it, expect } from "vitest";
import { parseStage2Data, createNpcGame } from "./npcgame";
import type { NpcDef } from "./npcgame";

const allWalkable = (): boolean => true;

// 스텝(선택) 라운드: choices 3개 + 정답 인덱스 2. 대사(마무리) 라운드: choices 없음.
const step = (n: number) => ({ prompt: `p${n}`, choices: [`a${n}`, `b${n}`, `c${n}`], answer: 2 });
const closing = { prompt: "bye", choices: [] as string[] };

const sampleRaw = {
  npcs: [
    { id: 9, q: 1, r: 2, name: "A", emoji: "🐰", rounds: [step(1), step(2), step(3), closing] },
  ],
};

describe("parseStage2Data", () => {
  it("normalizes npcs (3 steps + closing round), reassigns ids by index", () => {
    const { npcs, warnings } = parseStage2Data(sampleRaw, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]!.id).toBe(0); // json의 id:9 무시, 인덱스로 재부여
    expect(npcs[0]!.rounds).toHaveLength(4); // 3 스텝 + 1 대사 라운드
    expect(npcs[0]!.rounds[3]!.choices).toEqual([]); // 마지막은 선택지 없는 대사 라운드
    expect(warnings).toHaveLength(0);
  });

  it("drops npc on non-walkable hex with a warning", () => {
    const isWalkable = (q: number, r: number): boolean => !(q === 1 && r === 2);
    const { npcs, warnings } = parseStage2Data(sampleRaw, isWalkable);
    expect(npcs).toHaveLength(0);
    expect(warnings.some((w) => w.includes("1,2"))).toBe(true);
  });

  it("warns when step count is not 3 but keeps the npc", () => {
    const data = { npcs: [{ q: 0, r: 0, rounds: [step(1), closing] }] }; // 스텝 1개뿐
    const { npcs, warnings } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(warnings.some((w) => w.includes("스텝"))).toBe(true);
  });

  it("drops a round with a single choice or an out-of-range answer", () => {
    const data = { npcs: [{ q: 0, r: 0, rounds: [
      { prompt: "p", choices: ["only-one"], answer: 0 },   // 선택지 1개 = 오류
      { prompt: "p", choices: ["a", "b"], answer: 5 },      // answer 범위 밖
      step(1), step(2), step(3),                            // 유효 스텝 3개
    ] }] };
    const { npcs, warnings } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]!.rounds).toHaveLength(3); // 유효한 스텝만 남음
    expect(warnings.filter((w) => w.includes("오류")).length).toBe(2);
  });

  it("drops malformed npc", () => {
    const data = { npcs: [{ q: 0, rounds: [] }, sampleRaw.npcs[0]] };
    const { npcs } = parseStage2Data(data, allWalkable);
    expect(npcs).toHaveLength(1);
  });
});

describe("createNpcGame", () => {
  const npcs = (): NpcDef[] => parseStage2Data(sampleRaw, allWalkable).npcs;

  it("correct choice raises level, advances round, gives positive feedback", () => {
    const g = createNpcGame(npcs());
    expect(g.currentRound(0)!.prompt).toBe("p1");
    const r = g.choose(0, 2); // 정답 인덱스
    expect(r.accepted).toBe(true);
    expect(r.level).toBe(1);
    expect(r.npcDone).toBe(false);
    expect(r.feedback.length).toBeGreaterThan(0); // 공통 정답 피드백
    expect(g.currentRound(0)!.prompt).toBe("p2");
  });

  it("wrong choice keeps level and round (retry) with a gentle nudge", () => {
    const g = createNpcGame(npcs());
    const r = g.choose(0, 0); // 오답 인덱스
    expect(r.accepted).toBe(false);
    expect(r.level).toBe(0);
    expect(r.feedback.length).toBeGreaterThan(0);
    expect(g.currentRound(0)!.prompt).toBe("p1"); // 같은 라운드 유지
  });

  it("after 3 correct steps: level 3, not done yet, closing round is current", () => {
    const g = createNpcGame(npcs());
    g.choose(0, 2);
    g.choose(0, 2);
    const r = g.choose(0, 2);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(false); // 대사 라운드가 남아 아직 완료 아님
    expect(g.currentRound(0)!.choices).toEqual([]); // 선택지 없는 대사 라운드
  });

  it("dismissing the closing round finishes the npc (no feedback toast)", () => {
    const g = createNpcGame(npcs());
    g.choose(0, 2); g.choose(0, 2); g.choose(0, 2);
    const r = g.choose(0, 0); // 대사 라운드는 어떤 입력으로도 닫힘
    expect(r.accepted).toBe(true);
    expect(r.level).toBe(3);
    expect(r.npcDone).toBe(true);
    expect(r.feedback).toBe("");
    expect(g.currentRound(0)).toBeNull();
  });

  it("choosing on a finished npc is a no-op", () => {
    const g = createNpcGame(npcs());
    g.choose(0, 2); g.choose(0, 2); g.choose(0, 2); g.choose(0, 0);
    const r = g.choose(0, 2);
    expect(r.accepted).toBe(false);
    expect(r.npcDone).toBe(true);
  });

  it("allDone stays false until every npc (incl. closing) is finished", () => {
    const two = parseStage2Data({ npcs: [
      { q: 0, r: 0, rounds: [step(1), step(2), step(3), closing] },
      { q: 1, r: 0, rounds: [step(1), step(2), step(3), closing] },
    ] }, allWalkable).npcs;
    const g = createNpcGame(two);
    const finish = (id: number) => { g.choose(id, 2); g.choose(id, 2); g.choose(id, 2); g.choose(id, 0); };
    expect(g.allDone()).toBe(false);
    finish(0);
    expect(g.isDone(0)).toBe(true);
    expect(g.allDone()).toBe(false);
    finish(1);
    expect(g.allDone()).toBe(true);
  });
});
