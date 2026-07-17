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
  // ⚠️ 아래 두 테스트(이것과 "여러 단어로 된 대사")는 typeSound.ts 의 BLIP_EVERY 값에
  // 묶여 있다. 사람이 귀로 튜닝해 그 상수를 바꾸면 여기 기대값도 같이 고쳐야 한다.
  // 나머지 테스트는 상수와 무관한 불변식(공백에서 안 울림, 쉼 뒤 첫 글자는 울림 등)이다.
  it("쉼 없는 긴 단어에서는 BLIP_EVERY(현재 4)마다 한 번 울린다", () => {
    const t = "가나다라마바사";
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => blipAt(t, i))).toEqual([
      true, false, false, false, true, false, false,
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

  it("여러 단어로 된 대사: 각 단어 첫 글자에서 울리고, 5글자 이상인 단어만 중간에 한 번 더 울린다", () => {
    // BLIP_EVERY=4 기준. 한국어 어절은 대부분 2~3음절이라 실질적으로 "어절 첫 음절마다"가 된다.
    // 안(1,울림) 녕(2) 하(3) 세(4) 요(5,울림) / 오(1,울림) 늘(2) / 기(1,울림) 분(2) 이(3) / 어(1,울림) 때(2) 요(3)
    const t = "안녕하세요 오늘 기분이 어때요";
    const result = Array.from({ length: t.length }, (_, i) => blipAt(t, i));
    expect(result).toEqual([
      true, false, false, false, true, // 안녕하세요 — 5글자라 중간(요)에서 한 번 더
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
