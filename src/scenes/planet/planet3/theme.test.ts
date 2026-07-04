import { describe, it, expect } from "vitest";
import type { MissionData, MissionTheme } from "../engine/types";
import {
  MISSION01_DATA,
  MISSION01_THEME,
  MISSION02_DATA,
  MISSION02_THEME,
  MISSION03_DATA,
  MISSION03_THEME,
} from "./theme";

const PAIRS: [string, MissionData, MissionTheme][] = [
  ["mission01", MISSION01_DATA, MISSION01_THEME],
  ["mission02", MISSION02_DATA, MISSION02_THEME],
  ["mission03", MISSION03_DATA, MISSION03_THEME],
];

describe("planet2 theme integrity", () => {
  it.each(PAIRS)("%s: bannerNode 가 DATA 의 실제 노드 id 다", (_id, data, theme) => {
    expect(data.nodes.some((n) => n.id === theme.bannerNode)).toBe(true);
  });

  it.each(PAIRS)("%s: initialFriend 가 friends 에 존재한다", (_id, _data, theme) => {
    expect(Object.keys(theme.friends)).toContain(theme.initialFriend);
  });

  it.each(PAIRS)("%s: fx 에 fx_light_return→lightReturn 매핑이 있다", (_id, _data, theme) => {
    expect(theme.fx.fx_light_return).toBe("lightReturn");
  });
});
