// Auth Scene의 순수 로직(서버/DOM 의존 없음). 컴포넌트는 이 함수들만 호출한다.
import { ApiError, type Credentials } from "../../lib/api";
import type { School, Gender } from "../../lib/auth";

export interface FormState {
  grade: number | null; // 1~6 (select)
  class: number | null; // 1~10 (select)
  number: number | null; // 1~30 (select)
  pin: string; // 4자리, 시스템 키보드 입력
  pinConfirm: string; // signup 전용 확인 입력
  gender: Gender | null; // signup 전용, male/female
}

export function initialForm(): FormState {
  return { grade: null, class: null, number: null, pin: "", pinConfirm: "", gender: null };
}

/** 숫자만 남기고 최대 4자리로 자른다(PIN/확인 입력 정제). */
export function sanitizePin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

/** 폼 완성 여부. signup이면 이름(공백 아님)과 비밀번호 확인 일치까지 본다. */
export function isComplete(s: FormState, mode: "login" | "signup", name: string): boolean {
  const base = s.grade !== null && s.class !== null && s.number !== null && s.pin.length === 4;
  if (mode === "login") return base;
  return base && name.trim().length > 0 && s.pin === s.pinConfirm && s.gender !== null;
}

export function toCredentials(s: FormState, schoolId: string): Credentials {
  return {
    school_id: schoolId,
    grade: s.grade ?? 0,
    class: s.class ?? 0,
    number: s.number ?? 0,
    pin: s.pin,
  };
}

/** 마지막 사용 학교를 기본 선택, 없으면 첫 번째. 목록이 비면 null. */
export function pickDefaultSchool(schools: School[], lastId: string | null): School | null {
  if (schools.length === 0) return null;
  return schools.find((s) => s.id === lastId) ?? schools[0];
}

/** verify 실패 원인을 분류: 자격증명 문제(4xx)면 "auth", 통신/서버 문제면 "network". */
export function classifyVerifyError(err: unknown): "auth" | "network" {
  if (err instanceof ApiError) return err.status >= 500 ? "network" : "auth";
  return "network";
}
