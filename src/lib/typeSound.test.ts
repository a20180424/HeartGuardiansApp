import { describe, it, expect } from "vitest";
import { isSpeakingChar, blipAt, blipSound } from "./typeSound";

describe("isSpeakingChar", () => {
  it("공백·문장부호는 말하는 글자가 아니다", () => {
    for (const ch of [" ", "\n", ".", ",", "!", "?", "…", "~", "-", "(", ")"]) {
      expect(isSpeakingChar(ch)).toBe(false);
    }
  });

  it("한글·영문·숫자는 말하는 글자다", () => {
    for (const ch of ["가", "힣", "a", "Z", "7"]) {
      expect(isSpeakingChar(ch)).toBe(true);
    }
  });
});

describe("blipAt", () => {
  it("말하는 글자 3개마다 한 번만 울린다", () => {
    const t = "가나다라마바사";
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => blipAt(t, i))).toEqual([
      true, false, false, true, false, false, true,
    ]);
  });

  it("첫 글자에서 바로 울린다 (대사 시작이 들려야 한다)", () => {
    expect(blipAt("안녕", 0)).toBe(true);
  });

  it("공백·문장부호에서는 절대 울리지 않는다", () => {
    const t = "가 나.다";
    expect(blipAt(t, 1)).toBe(false); // " "
    expect(blipAt(t, 3)).toBe(false); // "."
  });

  it("공백·문장부호는 세지 않으므로 리듬이 유지된다", () => {
    // "가"(1) " " "나"(2) "." "다"(3) → "다"에서 다시 울린다
    expect(blipAt("가 나.다", 4)).toBe(true);
  });

  it("범위를 벗어난 인덱스는 false", () => {
    expect(blipAt("가", 5)).toBe(false);
    expect(blipAt("", 0)).toBe(false);
  });
});

describe("blipSound", () => {
  it("화자에 따라 다른 소리를 고른다", () => {
    expect(blipSound("hati")).toBe("blipHati");
    expect(blipSound("friend")).toBe("blipFriend");
  });
});
