import { describe, it, expect } from "vitest";
import { createFakeClassVotesSource } from "./classResults.source";

describe("createFakeClassVotesSource", () => {
  it("전원 응답 스냅샷은 25×10=250표이고 감정/행동이 유효하다", async () => {
    const src = createFakeClassVotesSource({ arrivalPerTick: 25, seed: 42 });
    const snap = await src.fetch();
    expect(snap.totalStudents).toBe(25);
    expect(snap.respondedStudents).toBe(25);
    expect(snap.complete).toBe(true);
    expect(snap.votes).toHaveLength(250);
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

  it("fetch를 반복하면 응답 학생이 점진적으로 늘고 전원 도달 시 complete", async () => {
    const src = createFakeClassVotesSource({ arrivalPerTick: 5, seed: 1 });
    const counts: number[] = [];
    let last = await src.fetch();
    counts.push(last.respondedStudents);
    for (let i = 0; i < 10; i++) {
      last = await src.fetch();
      counts.push(last.respondedStudents);
    }
    // 단조 증가하고 25에서 멈춘다.
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      expect(counts[i]).toBeLessThanOrEqual(25);
    }
    expect(last.respondedStudents).toBe(25);
    expect(last.complete).toBe(true);
  });

  it("응답 전에는 도착한 학생 수만큼만 표가 들어있다", async () => {
    const src = createFakeClassVotesSource({ arrivalPerTick: 3, seed: 7 });
    const snap = await src.fetch();
    expect(snap.respondedStudents).toBe(3);
    expect(snap.complete).toBe(false);
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
