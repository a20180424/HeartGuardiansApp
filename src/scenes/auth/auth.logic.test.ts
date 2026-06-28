import { describe, it, expect } from "vitest";
import {
  initialForm,
  applyDigit,
  applyBackspace,
  setActive,
  setGrade,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  classifyVerifyError,
} from "./auth.logic";
import { ApiError } from "../../lib/api";
import type { School } from "../../lib/auth";

describe("credential form logic", () => {
  it("initialForm은 class가 active인 빈 폼", () => {
    expect(initialForm()).toEqual({ grade: null, class: "", number: "", pin: "", active: "class" });
  });

  it("applyDigit은 active 필드에 숫자를 덧붙인다", () => {
    const s = applyDigit(initialForm(), "3");
    expect(s.class).toBe("3");
  });

  it("active 필드가 최대 길이에 도달하면 다음 필드로 자동 이동한다", () => {
    let s = initialForm();
    s = applyDigit(s, "1");
    s = applyDigit(s, "2"); // class=12 (max 2) → active=number
    expect(s.class).toBe("12");
    expect(s.active).toBe("number");
  });

  it("필드가 가득 차면 더 입력해도 무시한다(pin 4자리)", () => {
    let s = setActive(initialForm(), "pin");
    for (const d of ["1", "2", "3", "4", "5"]) s = applyDigit(s, d);
    expect(s.pin).toBe("1234");
  });

  it("applyBackspace는 active 필드의 마지막 글자를 지운다", () => {
    let s = applyDigit(initialForm(), "3");
    s = applyBackspace(s);
    expect(s.class).toBe("");
  });

  it("active가 비어 있으면 backspace는 이전 필드로 이동한다", () => {
    let s = setActive(initialForm(), "number");
    s = applyBackspace(s);
    expect(s.active).toBe("class");
  });

  it("setGrade는 학년을 설정한다", () => {
    expect(setGrade(initialForm(), 4).grade).toBe(4);
  });

  it("isComplete는 모든 값이 채워졌을 때만 true", () => {
    let s = setGrade(initialForm(), 3);
    s = { ...s, class: "2", number: "12", pin: "1234" };
    expect(isComplete(s)).toBe(true);
    expect(isComplete({ ...s, pin: "12" })).toBe(false);
  });

  it("toCredentials는 숫자 필드를 number로 변환한다", () => {
    let s = setGrade(initialForm(), 3);
    s = { ...s, class: "2", number: "12", pin: "1234" };
    expect(toCredentials(s, "school-uuid")).toEqual({
      school_id: "school-uuid",
      grade: 3,
      class: 2,
      number: 12,
      pin: "1234",
    });
  });
});

describe("pickDefaultSchool", () => {
  const schools: School[] = [
    { id: "a", name: "가나초" },
    { id: "b", name: "다라초" },
  ];
  it("lastId와 일치하는 학교를 고른다", () => {
    expect(pickDefaultSchool(schools, "b")?.id).toBe("b");
  });
  it("lastId가 없거나 안 맞으면 첫 번째 학교", () => {
    expect(pickDefaultSchool(schools, null)?.id).toBe("a");
    expect(pickDefaultSchool(schools, "zzz")?.id).toBe("a");
  });
  it("학교가 없으면 null", () => {
    expect(pickDefaultSchool([], "a")).toBeNull();
  });
});

describe("classifyVerifyError", () => {
  it("4xx ApiError는 auth(자격증명 문제)", () => {
    expect(classifyVerifyError(new ApiError(401, "nope", null))).toBe("auth");
    expect(classifyVerifyError(new ApiError(404, "nope", null))).toBe("auth");
  });
  it("5xx ApiError는 network", () => {
    expect(classifyVerifyError(new ApiError(500, "boom", null))).toBe("network");
  });
  it("ApiError가 아니면(fetch 실패) network", () => {
    expect(classifyVerifyError(new TypeError("Failed to fetch"))).toBe("network");
  });
});
