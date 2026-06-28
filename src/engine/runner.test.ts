import { describe, it, expect } from "vitest";
import { DialogueRunner } from "./runner";
import type { MissionData, MissionNode, RunnerView, Choice, Command } from "./types";

const data: MissionData = {
  id: "t",
  title: "t",
  start: "s",
  nodes: [
    { id: "s", type: "line", speaker: "hati", text: "start", next: "q1" },
    {
      id: "q1",
      type: "choice",
      requireAll: true,
      choices: [
        { text: "a", next: "q1r" },
        { text: "b", next: "q1r" },
        { text: "c", next: "q1r" },
      ],
    },
    { id: "q1r", type: "line", speaker: "hati", text: "react", next: "gate" },
    {
      id: "gate",
      type: "branch",
      condition: "allExplored",
      watch: "q1",
      ifTrue: "q2",
      ifFalse: "q1",
    },
    {
      id: "q2",
      type: "choice",
      choices: [
        { text: "wrong", next: "q2w" },
        { text: "right", next: "win" },
      ],
    },
    { id: "q2w", type: "line", speaker: "hati", text: "nope", next: "q2" },
    {
      id: "win",
      type: "line",
      speaker: "lumi",
      text: "고마워!",
      onComplete: [{ cmd: "fx", value: "fx_win" }],
      next: null,
    },
  ],
};

// 자동 진행 FakeView: 라인은 즉시 통과, 선택은 규칙대로 고른다.
function makeFakeView(onEnd: () => void) {
  const lines: string[] = [];
  const fx: string[] = [];
  const q2answers = [0, 1]; // 첫 방문 오답(0), 둘째 정답(1)
  const view: RunnerView = {
    reset() {},
    execCommands(cmds: Command[] | undefined) {
      (cmds || []).forEach((c) => {
        if (c.cmd === "fx" && c.value) fx.push(c.value);
      });
    },
    showLine(node: MissionNode, onTyped: () => void) {
      lines.push(node.text || "");
      onTyped(); // 타이핑 완료 → onComplete 실행
      return Promise.resolve();
    },
    showChoices(node, exploredSet, pick: (i: number, c: Choice) => void) {
      let idx: number;
      if (node.requireAll && exploredSet) {
        idx = node.choices!.findIndex((_, i) => !exploredSet.has(i)); // 아직 안 본 것
      } else {
        idx = q2answers.shift() ?? 0;
      }
      // 비동기로 풀어 깊은 동기재귀 방지
      Promise.resolve().then(() => pick(idx, node.choices![idx]));
    },
    end() {
      onEnd();
    },
  };
  return { view, lines, fx };
}

describe("DialogueRunner", () => {
  it("requireAll 3개 탐색 후 통과하고, q2 오답→정답 거쳐 엔딩에 도달한다", async () => {
    await new Promise<void>((resolve) => {
      const { view, lines, fx } = makeFakeView(() => {
        expect(lines).toContain("고마워!"); // 정답 분기 도달
        expect(lines.filter((l) => l === "react").length).toBe(3); // q1 3번 반복
        expect(fx).toContain("fx_win"); // onComplete fx 실행됨
        resolve();
      });
      const runner = new DialogueRunner(data, view);
      runner.start();
    });
  });
});
