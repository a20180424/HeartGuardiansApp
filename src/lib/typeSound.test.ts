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

  it("공백·문장부호를 만나면 카운터가 리셋된다 (쉼 뒤 첫 글자는 항상 울린다)", () => {
    // "가"→n=1(울림) → " "→리셋 n=0 → "나"→n=1 → "."→리셋 n=0 → "다"→n=1(울림)
    // 세지 않고 건너뛰는 게 아니라 만날 때마다 카운터를 0으로 되돌린다 — 그 결과
    // 매 단어의 첫 글자가 항상 (n=1로) 다시 울려서 말의 시작이 들린다.
    expect(blipAt("가 나.다", 4)).toBe(true);
  });

  it("여러 단어로 된 대사: 각 단어 첫 글자에서 울리고, 4글자 이상인 단어는 중간에 한 번 더 울린다", () => {
    // "안녕하세요"(5글자) " " "오늘"(2글자) " " "기분이"(3글자) " " "어때요"(3글자)
    // 안(1,울림) 녕(2) 하(3) 세(4,울림) 요(5) / 오(1,울림) 늘(2) / 기(1,울림) 분(2) 이(3) / 어(1,울림) 때(2) 요(3)
    const t = "안녕하세요 오늘 기분이 어때요";
    const result = Array.from({ length: t.length }, (_, i) => blipAt(t, i));
    expect(result).toEqual([
      true, false, false, true, false, // 안녕하세요
      false, // " "
      true, false, // 오늘
      false, // " "
      true, false, false, // 기분이
      false, // " "
      true, false, false, // 어때요
    ]);
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
