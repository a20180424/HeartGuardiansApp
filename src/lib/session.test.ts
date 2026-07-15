import { describe, it, expect, beforeEach } from "vitest";
import { setSession, getSession, clearSession, getProgressValue, type SessionData } from "./session";
import type { Profile } from "./auth";

const profile: Profile = {
  id: "u1",
  name: "이현수",
  grade: 3,
  class: 2,
  number: 12,
  gender: "male",
  school: { id: "s1", name: "행복초등학교" },
};
const data: SessionData = { profile, progress: 2, board: null };

describe("session store", () => {
  beforeEach(() => clearSession());

  it("초기 상태는 null", () => {
    expect(getSession()).toBeNull();
  });

  it("setSession 후 getSession이 같은 데이터를 돌려준다", () => {
    setSession(data);
    expect(getSession()).toEqual(data);
  });

  it("clearSession 후 다시 null", () => {
    setSession(data);
    clearSession();
    expect(getSession()).toBeNull();
  });

  it("getProgressValue는 세션이 없으면 0", () => {
    expect(getProgressValue()).toBe(0);
  });

  it("getProgressValue는 세션의 progress를 돌려준다", () => {
    setSession(data);
    expect(getProgressValue()).toBe(2);
  });
});
