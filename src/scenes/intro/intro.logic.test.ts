import { describe, it, expect } from "vitest";
import { skipSeekTarget } from "./intro.logic";

describe("skipSeekTarget", () => {
  it("정상 duration이면 마지막 0.1초 전 지점을 반환한다", () => {
    expect(skipSeekTarget(30.9667)).toBeCloseTo(30.8667, 4);
  });

  it("duration이 0.1 이하면 0을 반환한다", () => {
    expect(skipSeekTarget(0.05)).toBe(0);
  });

  it("duration이 0이면 0을 반환한다", () => {
    expect(skipSeekTarget(0)).toBe(0);
  });

  it("duration이 NaN이면 0을 반환한다", () => {
    expect(skipSeekTarget(NaN)).toBe(0);
  });

  it("duration이 Infinity면 0을 반환한다", () => {
    expect(skipSeekTarget(Infinity)).toBe(0);
  });
});
