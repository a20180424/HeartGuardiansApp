import { describe, it, expect, vi } from "vitest";
import { createFakeClassVotesSource, createServerClassVotesSource } from "./classResults.source";

describe("createFakeClassVotesSource", () => {
  it("전원 도착 스냅샷은 25×10=250표이고 감정/행동/상황이 유효하다", async () => {
    const src = createFakeClassVotesSource({ arrivalPerTick: 25, seed: 42 });
    const snap = await src.fetch();
    expect(snap.votes).toHaveLength(250);
    expect(new Set(snap.votes.map((v) => v.studentId)).size).toBe(25);
    const emotions = new Set([
      "joy", "sad", "anger", "anxiety", "anticipation", "calm", "proud", "shy",
    ]);
    snap.votes.forEach((v) => {
      expect(emotions.has(v.emotionId)).toBe(true);
      expect(v.actionId).toBeGreaterThanOrEqual(1);
      expect(v.actionId).toBeLessThanOrEqual(6);
      expect(v.situationId).toBeGreaterThanOrEqual(1);
      expect(v.situationId).toBeLessThanOrEqual(10);
    });
  });

  it("fetch를 반복하면 도착 학생(표)이 점진적으로 늘고 25명(250표)에서 멈춘다", async () => {
    const src = createFakeClassVotesSource({ arrivalPerTick: 5, seed: 1 });
    const counts: number[] = [];
    let last = await src.fetch();
    counts.push(last.votes.length);
    for (let i = 0; i < 10; i++) {
      last = await src.fetch();
      counts.push(last.votes.length);
    }
    // 표 수는 단조 증가하고 250(=25×10)에서 멈춘다.
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      expect(counts[i]).toBeLessThanOrEqual(250);
    }
    expect(last.votes).toHaveLength(250);
  });

  it("도착 초기에는 도착한 학생 수만큼만 표가 들어있다", async () => {
    const src = createFakeClassVotesSource({ arrivalPerTick: 3, seed: 7 });
    const snap = await src.fetch();
    // 학생당 10표 → 3명이면 30표.
    expect(snap.votes).toHaveLength(30);
    expect(new Set(snap.votes.map((v) => v.studentId)).size).toBe(3);
  });

  it("같은 seed는 같은 결과(결정적)를 만든다", async () => {
    const a = await createFakeClassVotesSource({ arrivalPerTick: 25, seed: 99 }).fetch();
    const b = await createFakeClassVotesSource({ arrivalPerTick: 25, seed: 99 }).fetch();
    expect(a.votes).toEqual(b.votes);
  });
});

vi.mock("./emotionGuide.api", () => ({
  fetchClassAnswers: vi.fn(),
}));
import { fetchClassAnswers } from "./emotionGuide.api";

describe("createServerClassVotesSource", () => {
  it("서버가 준 votes 배열을 그대로 스냅샷 { votes } 로 감싼다", async () => {
    const votes = [
      { studentId: "u1", studentName: "김민준", situationId: 1, emotionId: "sad", actionId: 3 },
      { studentId: "u2", studentName: "이서연", situationId: 1, emotionId: "joy", actionId: 5 },
    ];
    vi.mocked(fetchClassAnswers).mockResolvedValueOnce(votes);
    const snap = await createServerClassVotesSource().fetch();
    expect(snap).toEqual({ votes });
  });
});
