import { describe, it, expect } from "vitest";
import {
  STORY_LINES,
  MISSIONS,
  POST_LINES,
  FINAL_LINES,
  EPILOGUE_BG,
  BG_INTERIOR,
  IMG_DIAMOND,
  IMG_VIDEO,
} from "./heartConnect.data";

describe("heartConnect.data", () => {
  it("스토리 3줄, 각 줄에 하티 스프라이트와 텍스트가 있다", () => {
    expect(STORY_LINES).toHaveLength(3);
    STORY_LINES.forEach((l) => {
      expect(l.hati).toMatch(/^\/assets\/planet4\//);
      expect(l.text.length).toBeGreaterThan(0);
    });
  });

  it("원석 미션 5개, 선택지 3개, 정답 인덱스가 0..2 범위다", () => {
    expect(MISSIONS).toHaveLength(5);
    MISSIONS.forEach((m) => {
      expect(m.options).toHaveLength(3);
      expect(m.correct).toBeGreaterThanOrEqual(0);
      expect(m.correct).toBeLessThanOrEqual(2);
      expect(m.image).toMatch(/^\/assets\/planet4\/gem-/);
      expect(m.gem.length).toBeGreaterThan(0);
    });
  });

  it("확정된 정답 매핑을 지킨다(원본 원문)", () => {
    expect(MISSIONS.map((m) => m.correct)).toEqual([1, 0, 2, 0, 1]);
    expect(MISSIONS[1].options[MISSIONS[1].correct]).toBe(
      "표정이 조금 어두워 보여. 무슨 일 있어?",
    );
  });

  it("후일담 6줄, 최종 2줄", () => {
    expect(POST_LINES).toHaveLength(6);
    expect(FINAL_LINES).toHaveLength(2);
  });

  it("에셋 경로 상수가 planet4 경로를 가리킨다", () => {
    [BG_INTERIOR, IMG_DIAMOND, IMG_VIDEO, ...Object.values(EPILOGUE_BG)].forEach((p) =>
      expect(p).toMatch(/^\/assets\/planet4\//),
    );
    expect(IMG_VIDEO).toMatch(/\.mp4$/);
  });
});
