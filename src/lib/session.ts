// 로그인 후 현재 사용자 정보를 메모리에 보관한다. (자격증명은 api.ts가 localStorage에 별도 저장)
// Profile/Progress는 매 실행 시 verify + getProgress로 새로 받아 항상 최신 상태를 유지한다.
// Home/Planet 등 다른 Scene이 progress를 읽는 단일 출처.

import type { Profile } from "./auth";

export interface SessionData {
  profile: Profile;
  progress: number; // 0~4, 완료한 Planet 수
}

let current: SessionData | null = null;

export function setSession(d: SessionData): void {
  current = d;
}

export function getSession(): SessionData | null {
  return current;
}

export function clearSession(): void {
  current = null;
}

/** 세션이 없으면 0을 돌려준다(잠금 계산 기본값). */
export function getProgressValue(): number {
  return current?.progress ?? 0;
}
