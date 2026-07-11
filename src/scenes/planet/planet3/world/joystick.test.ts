import { describe, it, expect } from "vitest";
import { joystickVector } from "./joystick";

const R = 50;

describe("joystickVector", () => {
  it("center is neutral", () => {
    expect(joystickVector(0, 0, R)).toEqual({ throttle: 0, turn: 0 });
  });

  it("full up = full throttle, no turn", () => {
    const v = joystickVector(0, -R, R);
    expect(v.throttle).toBeCloseTo(1, 5);
    expect(v.turn).toBeCloseTo(0, 5);
  });

  it("down gives zero throttle (forward only)", () => {
    const v = joystickVector(0, R, R);
    expect(v.throttle).toBe(0);
  });

  it("full right = turn 1", () => {
    const v = joystickVector(R, 0, R);
    expect(v.turn).toBeCloseTo(1, 5);
    expect(v.throttle).toBe(0);
  });

  it("full left = turn -1", () => {
    expect(joystickVector(-R, 0, R).turn).toBeCloseTo(-1, 5);
  });

  it("clamps beyond radius", () => {
    expect(joystickVector(2 * R, 0, R).turn).toBeCloseTo(1, 5);
  });

  it("deadzone near center is neutral", () => {
    expect(joystickVector(3, -3, R)).toEqual({ throttle: 0, turn: 0 });
  });

  it("up-left diagonal walks and turns left", () => {
    const v = joystickVector(-R, -R, R);
    expect(v.throttle).toBeGreaterThan(0);
    expect(v.turn).toBeLessThan(0);
  });
});
