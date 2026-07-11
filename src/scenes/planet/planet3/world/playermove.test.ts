import { describe, it, expect } from "vitest";
import { stepForward, resolveSlide } from "./playermove";

describe("stepForward", () => {
  it("yaw 0 faces -Z", () => {
    const p = stepForward(0, 0, 0, 1);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(-1, 5);
  });
  it("yaw PI/2 faces -X", () => {
    const p = stepForward(0, 0, Math.PI / 2, 1);
    expect(p.x).toBeCloseTo(-1, 5);
    expect(p.z).toBeCloseTo(0, 5);
  });
  it("yaw PI faces +Z", () => {
    const p = stepForward(0, 0, Math.PI, 1);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(1, 5);
  });
  it("scales by distance from a base point", () => {
    const p = stepForward(10, 5, 0, 3);
    expect(p.x).toBeCloseTo(10, 5);
    expect(p.z).toBeCloseTo(2, 5);
  });
});

describe("resolveSlide", () => {
  // 벽: x > 1 은 못 가는 영역
  const openLeft = (x: number): boolean => x <= 1;

  it("open candidate moves through", () => {
    expect(resolveSlide(0, 0, 0.5, 0.5, () => true)).toEqual({ x: 0.5, z: 0.5 });
  });
  it("blocked candidate slides along Z when X is blocked", () => {
    // 후보 (2, 1) 막힘, X만(2,0) 막힘, Z만(0,1) 통과
    const r = resolveSlide(0, 0, 2, 1, openLeft);
    expect(r).toEqual({ x: 0, z: 1 });
  });
  it("blocked candidate slides along X when X-only is open", () => {
    // 벽: z > 1 못 감. 후보 (0.5, 2) 막힘, X만(0.5,0) 통과
    const openLow = (_x: number, z: number): boolean => z <= 1;
    const r = resolveSlide(0, 0, 0.5, 2, openLow);
    expect(r).toEqual({ x: 0.5, z: 0 });
  });
  it("fully blocked stays put", () => {
    const r = resolveSlide(0, 0, 2, 2, () => false);
    expect(r).toEqual({ x: 0, z: 0 });
  });
  it("prefers X-axis slide when both fallbacks are open", () => {
    // Only the diagonal candidate (2,2) is blocked; both (2,0) and (0,2) are open.
    const blockCorner = (x: number, z: number): boolean => !(x === 2 && z === 2);
    const r = resolveSlide(0, 0, 2, 2, blockCorner);
    expect(r).toEqual({ x: 2, z: 0 }); // X-only wins because it is checked first
  });
});
