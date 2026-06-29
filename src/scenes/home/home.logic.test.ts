import { describe, it, expect } from "vitest";
import { planetState, nicknameFor, commentFor, energyNoteFor } from "./home.logic";

describe("planetState", () => {
  it("progress보다 작거나 같은 행성은 completed", () => {
    expect(planetState(1, 2)).toBe("completed");
    expect(planetState(2, 2)).toBe("completed");
  });
  it("progress 바로 다음 행성은 unlocked", () => {
    expect(planetState(1, 0)).toBe("unlocked");
    expect(planetState(3, 2)).toBe("unlocked");
  });
  it("그 이후 행성은 locked", () => {
    expect(planetState(2, 0)).toBe("locked");
    expect(planetState(4, 1)).toBe("locked");
  });
  it("progress=4면 4개 모두 completed (unlocked 없음)", () => {
    expect([1, 2, 3, 4].map((id) => planetState(id, 4))).toEqual([
      "completed", "completed", "completed", "completed",
    ]);
  });
});

describe("nicknameFor", () => {
  it("progress별 별명을 반환한다", () => {
    expect(nicknameFor(0)).toBe("견습 가디언");
    expect(nicknameFor(4)).toBe("하트 가디언");
  });
  it("범위를 벗어나면 양 끝으로 clamp", () => {
    expect(nicknameFor(-1)).toBe("견습 가디언");
    expect(nicknameFor(9)).toBe("하트 가디언");
  });
});

describe("commentFor", () => {
  it("progress별 멘트를 반환한다", () => {
    expect(commentFor(0)).toContain("빛의 행성");
    expect(commentFor(4)).toContain("모두 구했어");
  });
  it("범위를 벗어나면 clamp", () => {
    expect(commentFor(99)).toBe(commentFor(4));
  });
});

describe("energyNoteFor", () => {
  it("progress별 안내 문구를 반환한다", () => {
    expect(energyNoteFor(0)).toBe("다음 행성까지 25% 필요!");
    expect(energyNoteFor(3)).toBe("그림자 행성 출발!");
    expect(energyNoteFor(4)).toBe("공감 에너지 완성!");
  });
  it("범위를 벗어나면 양 끝으로 clamp", () => {
    expect(energyNoteFor(-1)).toBe("다음 행성까지 25% 필요!");
    expect(energyNoteFor(99)).toBe("공감 에너지 완성!");
  });
});
