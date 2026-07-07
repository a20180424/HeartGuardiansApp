import { describe, it, expect } from "vitest";
import { MISSIONS, EMOTION_FACES } from "./hiddenEmotion.data";

describe("hiddenEmotion 데이터", () => {
  it("친구 3명, 순서는 아르지·누비·미라", () => {
    expect(MISSIONS.map((m) => m.person)).toEqual(["아르지", "누비", "미라"]);
  });

  it("각 친구는 카드 5장·감정 선택지 4개를 가진다", () => {
    for (const m of MISSIONS) {
      expect(m.cards).toHaveLength(5);
      expect(m.emotions).toHaveLength(4);
    }
  });

  it("정답 감정은 각 친구의 선택지 안에 있다", () => {
    for (const m of MISSIONS) {
      expect(m.emotions).toContain(m.answer);
    }
  });

  it("정답표: 아르지=속상함, 누비=외로움, 미라=미안함", () => {
    expect(MISSIONS.map((m) => m.answer)).toEqual(["속상함", "외로움", "미안함"]);
  });

  it("모든 감정 선택지는 이모지 얼굴을 가진다", () => {
    for (const m of MISSIONS) {
      for (const e of m.emotions) expect(EMOTION_FACES[e]).toBeTruthy();
    }
  });

  it("카드 아트는 hidden-emotion 폴더 경로", () => {
    for (const m of MISSIONS) {
      for (const c of m.cards) {
        expect(c.art).toMatch(/^\/assets\/planet2\/hidden-emotion\/.+\.png$/);
      }
    }
  });
});
