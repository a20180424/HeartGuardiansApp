// Auth Scene의 순수 로직(서버/DOM 의존 없음). 컴포넌트는 이 함수들만 호출한다.
import { ApiError, type Credentials } from "../../lib/api";
import type { School } from "../../lib/auth";

export type FieldKey = "class" | "number" | "pin";

export interface FormState {
  grade: number | null; // 1~6, 버튼으로 선택
  class: string; // 숫자 키패드 입력(문자열로 누적)
  number: string;
  pin: string; // 4자리
  active: FieldKey; // 키패드가 입력할 현재 필드
}

const ORDER: FieldKey[] = ["class", "number", "pin"];
export const MAX_LEN: Record<FieldKey, number> = { class: 2, number: 2, pin: 4 };

export function initialForm(): FormState {
  return { grade: null, class: "", number: "", pin: "", active: "class" };
}

export function setActive(s: FormState, f: FieldKey): FormState {
  return { ...s, active: f };
}

export function setGrade(s: FormState, g: number): FormState {
  return { ...s, grade: g };
}

/** active 필드에 숫자 한 자리 추가. 가득 차면 다음 필드로 자동 이동. */
export function applyDigit(s: FormState, d: string): FormState {
  const cur = s[s.active];
  if (cur.length >= MAX_LEN[s.active]) return s; // 가득 참 → 무시
  const next: FormState = { ...s, [s.active]: cur + d };
  if (next[s.active].length >= MAX_LEN[s.active]) {
    const i = ORDER.indexOf(s.active);
    if (i < ORDER.length - 1) return { ...next, active: ORDER[i + 1] };
  }
  return next;
}

/** active 필드의 마지막 글자 삭제. 비어 있으면 이전 필드로 이동. */
export function applyBackspace(s: FormState): FormState {
  const cur = s[s.active];
  if (cur.length > 0) return { ...s, [s.active]: cur.slice(0, -1) };
  const i = ORDER.indexOf(s.active);
  if (i > 0) return { ...s, active: ORDER[i - 1] };
  return s;
}

export function isComplete(s: FormState): boolean {
  return s.grade !== null && s.class !== "" && s.number !== "" && s.pin.length === 4;
}

export function toCredentials(s: FormState, schoolId: string): Credentials {
  return {
    school_id: schoolId,
    grade: s.grade ?? 0,
    class: Number(s.class),
    number: Number(s.number),
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
