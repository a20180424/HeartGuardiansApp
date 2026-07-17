import { describe, it, expect } from "vitest";
import { sfxNameFor } from "./uiSfx";

describe("sfxNameFor", () => {
  it("속성이 없으면 기본은 tap", () => {
    expect(sfxNameFor(undefined)).toBe("tap");
  });

  it('data-sfx="pop"이면 pop', () => {
    expect(sfxNameFor("pop")).toBe("pop");
  });

  it('data-sfx="none"이면 소리 없음', () => {
    expect(sfxNameFor("none")).toBeNull();
  });

  it("모르는 값이면 기본 tap으로 떨어진다 (오타가 무음이 되면 안 된다)", () => {
    expect(sfxNameFor("popp")).toBe("tap");
    expect(sfxNameFor("")).toBe("tap");
  });
});
