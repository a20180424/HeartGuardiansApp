import { describe, it, expect } from "vitest";
import { DialogueRunner } from "../engine/runner";
import type { MissionData, MissionNode, RunnerView, Command } from "../engine/types";
import mission01 from "./mission01.json";
import mission02 from "./mission02.json";

const MISSIONS: Record<string, MissionData> = {
  mission01: mission01 as unknown as MissionData,
  mission02: mission02 as unknown as MissionData,
};

// 미션을 FakeView로 끝까지 자동 진행하며 통과한 라인 텍스트와 fx 커맨드 값을 수집한다.
function runToEnd(data: MissionData): Promise<{ lines: string[]; fx: string[] }> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const fx: string[] = [];
    const view: RunnerView = {
      reset() {},
      execCommands(cmds: Command[] | undefined) {
        (cmds || []).forEach((c) => {
          if (c.cmd === "fx" && c.value) fx.push(c.value);
        });
      },
      showLine(node: MissionNode, onTyped: () => void) {
        lines.push(node.text || "");
        onTyped();
        return Promise.resolve();
      },
      showChoices() {},
      showMirrors(_n, done) {
        done();
      },
      showGauge(_n, done) {
        done();
      },
      showReveal(_n, done) {
        done();
      },
      showVideo(_n, done) {
        done();
      },
      showMinigame(_n, done) {
        done();
      },
      end() {
        resolve({ lines, fx });
      },
    };
    new DialogueRunner(data, view).start();
  });
}

describe("planet2 mission skeletons", () => {
  it.each(["mission01", "mission02"])(
    "%s: 시작→끝을 걸어 end 에 도달하고 마지막에 fx_light_return 을 쏜다",
    async (id) => {
      const { lines, fx } = await runToEnd(MISSIONS[id]);
      // mission02 는 intro 라인을 없애고 미니게임으로 바로 시작하므로 end 라인 1개만 남는다.
      expect(lines.length).toBeGreaterThanOrEqual(1); // 최소 end 라인
      expect(fx).toContain("fx_light_return"); // 다음 버튼 조건
    },
  );

  it.each(["mission01", "mission02"])(
    "%s: 노드 id 가 p3_m 접두어를 쓰고 start 노드가 존재한다",
    (id) => {
      const data = MISSIONS[id];
      expect(data.nodes.some((n) => n.id === data.start)).toBe(true);
      expect(data.nodes.every((n) => n.id.startsWith("p3_m"))).toBe(true);
    },
  );
});
