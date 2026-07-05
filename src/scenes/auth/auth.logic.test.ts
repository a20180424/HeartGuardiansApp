import { describe, it, expect } from "vitest";
import {
  initialForm,
  sanitizePin,
  isComplete,
  toCredentials,
  pickDefaultSchool,
  classifyVerifyError,
  type FormState,
} from "./auth.logic";
import { ApiError } from "../../lib/api";
import type { School } from "../../lib/auth";

const filled: FormState = { grade: 3, class: 2, number: 12, pin: "1234", pinConfirm: "1234", gender: "male" };

describe("credential form logic", () => {
  it("initialForm은 모든 값이 비어있다", () => {
    expect(initialForm()).toEqual({
      grade: null,
      class: null,
      number: null,
      pin: "",
      pinConfirm: "",
      gender: null,
    });
  });

  it("sanitizePin은 숫자만 남기고 4자리로 자른다", () => {
    expect(sanitizePin("12a3b456")).toBe("1234");
    expect(sanitizePin("")).toBe("");
    expect(sanitizePin("99")).toBe("99");
  });

  it("login isComplete는 학년/반/번호/pin(4)만 채우면 true (성별 무관)", () => {
    expect(isComplete(filled, "login", "")).toBe(true);
    expect(isComplete({ ...filled, gender: null }, "login", "")).toBe(true);
    expect(isComplete({ ...filled, pin: "12" }, "login", "")).toBe(false);
    expect(isComplete({ ...filled, class: null }, "login", "")).toBe(false);
  });

  it("signup isComplete는 이름·비밀번호 확인·성별까지 맞아야 true", () => {
    expect(isComplete(filled, "signup", "이시형")).toBe(true);
    expect(isComplete(filled, "signup", "  ")).toBe(false); // 이름 공백
    expect(isComplete({ ...filled, pinConfirm: "0000" }, "signup", "이시형")).toBe(false); // 불일치
    expect(isComplete({ ...filled, gender: null }, "signup", "이시형")).toBe(false); // 성별 미선택
  });

  it("toCredentials는 폼 값을 그대로 Credentials로 만든다", () => {
    expect(toCredentials(filled, "school-uuid")).toEqual({
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
