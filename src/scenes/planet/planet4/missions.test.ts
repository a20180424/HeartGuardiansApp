import { describe, it, expect } from "vitest";
import { DialogueRunner } from "../engine/runner";
import type { MissionData, MissionNode, RunnerView, Command } from "../engine/types";
import mission01 from "./mission01.json";
import mission02 from "./mission02.json";
import mission03 from "./mission03.json";

const MISSIONS: Record<string, MissionData> = {
  mission01: mission01 as unknown as MissionData,
  mission02: mission02 as unknown as MissionData,
  mission03: mission03 as unknown as MissionData,
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

describe("planet4 mission skeletons", () => {
  // mission01·02는 엔진 end 노드에서 fx_light_return 을 쏜다. mission03은 미니게임이 종착이라 제외.
  it.each(["mission01", "mission02"])(
    "%s: 시작→끝을 걸어 end 에 도달하고 마지막에 fx_light_return 을 쏜다",
    async (id) => {
      const { lines, fx } = await runToEnd(MISSIONS[id]);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(fx).toContain("fx_light_return");
    },
  );

  it.each(["mission01", "mission02", "mission03"])(
    "%s: 노드 id 가 p4_m 접두어를 쓰고 start 노드가 존재한다",
    (id) => {
      const data = MISSIONS[id];
      expect(data.nodes.some((n) => n.id === data.start)).toBe(true);
      expect(data.nodes.every((n) => n.id.startsWith("p4_m"))).toBe(true);
    },
  );

  it("mission03: 인트로 배너 line + heartConnect 미니게임(종착)으로 끝난다", async () => {
    const data = MISSIONS["mission03"];
    expect(data.start).toBe("p4_m3_intro");
    const intro = data.nodes.find((n) => n.id === "p4_m3_intro");
    const play = data.nodes.find((n) => n.id === "p4_m3_play");
    expect(intro?.type).toBe("line");
    expect(play?.type).toBe("minigame");
    expect(play?.game).toBe("heartConnect");
    expect(play?.next ?? null).toBeNull();
    // FakeView 로 끝까지 걸으면 end 에 도달(showMinigame 이 done 호출).
    const { lines } = await runToEnd(data);
    expect(lines).toContain(intro?.text || "");
  });
});
