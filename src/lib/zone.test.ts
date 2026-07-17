import { describe, it, expect } from "vitest";
import { zoneForPath } from "./zone";

describe("zoneForPath", () => {
  it("로그인·홈은 hub", () => {
    expect(zoneForPath("/auth")).toBe("hub");
    expect(zoneForPath("/home")).toBe("hub");
  });

  it("행성은 planet", () => {
    expect(zoneForPath("/planet/1")).toBe("planet");
    expect(zoneForPath("/planet/4")).toBe("planet");
  });

  it("인트로·아웃트로는 silent (동영상 자체 사운드가 있다)", () => {
    expect(zoneForPath("/intro")).toBe("silent");
    expect(zoneForPath("/outro")).toBe("silent");
  });

  it("모르는 경로는 silent", () => {
    expect(zoneForPath("/")).toBe("silent");
    expect(zoneForPath("/nope")).toBe("silent");
  });
});
