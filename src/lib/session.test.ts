import { describe, it, expect, beforeEach } from "vitest";
import {
  setSession,
  getSession,
  clearSession,
  getProgressValue,
  completePlanet,
  type SessionData,
} from "./session";
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

  // 히든 점프 메뉴로 로그인 없이 미션 엔딩에 갈 수 있게 되면서 도달 가능해진 경로.
  // 가드가 없으면 authHeaders()가 자격증명이 없다며 동기적으로 throw하고
  // (progress.ts가 headers: authHeaders() 를 인자로 먼저 평가한다), 그 예외가
  // onExit 밖으로 새어 화면 전환(nav)이 실행되지 않는다.
  it("completePlanet은 세션이 없으면 throw하지 않고 조용히 건너뛴다", () => {
    expect(getSession()).toBeNull();
    expect(() => completePlanet(1)).not.toThrow();
  });
});
