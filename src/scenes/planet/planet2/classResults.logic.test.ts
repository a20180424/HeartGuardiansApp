import { describe, it, expect } from "vitest";
import { emotionDistribution, leaderboard, actionBreakdown } from "./classResults.logic";
import type { ClassVote } from "./classResults.source";

// 상황 1 에 대한 소규모 결정적 표(감정/행동 명시).
const votes: ClassVote[] = [
  { studentId: "s1", studentName: "가", situationId: 1, emotionId: "sad", actionId: 1 },
  { studentId: "s2", studentName: "나", situationId: 1, emotionId: "sad", actionId: 1 },
  { studentId: "s3", studentName: "다", situationId: 1, emotionId: "sad", actionId: 4 },
  { studentId: "s4", studentName: "라", situationId: 1, emotionId: "anger", actionId: 2 },
  { studentId: "s5", studentName: "마", situationId: 1, emotionId: "anxiety", actionId: 3 },
  // 다른 상황(집계에서 제외돼야 함)
  { studentId: "s1", studentName: "가", situationId: 2, emotionId: "joy", actionId: 1 },
];

describe("emotionDistribution", () => {
  it("해당 상황만 집계하고 8감정 모두 반환한다", () => {
    const dist = emotionDistribution(votes, 1);
    expect(dist).toHaveLength(8);
    const sad = dist.find((d) => d.emotionId === "sad")!;
    expect(sad.count).toBe(3);
    expect(sad.pct).toBe(60); // 3/5
    expect(dist.find((d) => d.emotionId === "anger")!.count).toBe(1);
    expect(dist.find((d) => d.emotionId === "joy")!.count).toBe(0); // 상황2 표는 제외
  });
});

describe("leaderboard", () => {
  it("표수 내림차순 상위 3위를 반환한다", () => {
    const top = leaderboard(votes, 1);
    expect(top).toHaveLength(3);
    expect(top[0].emotionId).toBe("sad");
    expect(top[0].count).toBe(3);
    expect(top[1].count).toBe(1);
    expect(top[2].count).toBe(1);
    expect(top[0].count).toBeGreaterThanOrEqual(top[1].count);
    expect(top[1].count).toBeGreaterThanOrEqual(top[2].count);
  });
});

describe("actionBreakdown", () => {
  it("상황·감정별 행동 6개와 선택 대원 명단을 반환한다", () => {
    const rows = actionBreakdown(votes, 1, "sad");
    expect(rows).toHaveLength(6);
    const a1 = rows.find((r) => r.actionId === 1)!;
    expect(a1.count).toBe(2);
    expect(a1.voterNames).toEqual(["가", "나"]);
    const a4 = rows.find((r) => r.actionId === 4)!;
    expect(a4.voterNames).toEqual(["다"]);
    const a2 = rows.find((r) => r.actionId === 2)!;
    expect(a2.count).toBe(0); // sad 감정엔 action2 선택자 없음
  });
});
