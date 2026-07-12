// 로그인 후 현재 사용자 정보를 메모리에 보관한다. (자격증명은 api.ts가 localStorage에 별도 저장)
// Profile/Progress는 매 실행 시 verify + getProgress로 새로 받아 항상 최신 상태를 유지한다.
// Home/Planet 등 다른 Scene이 progress를 읽고 쓰는 단일 출처.
// progress 저장의 책임은 여기로 위임한다 — 호출부는 completePlanet만 부르면
// 서버 저장(completePlanet API)과 로컬 세션 갱신을 세션 저장소가 함께 처리한다.

import type { Profile } from "./auth";
import { completePlanet as apiCompletePlanet } from "./progress";

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

/**
 * 행성(1-4) 완료를 저장한다 — 서버(completePlanet API)와 로컬 세션 progress를 함께 갱신.
 * 서버가 돌려준 progress로 세션을 덮어써 완료 후 홈의 잠금 해제가 즉시 반영된다.
 * review는 아직 입력 UI가 없어 고정 기본 문구로 저장한다.
 * (서버가 review를 최소 1자 요구하므로 빈 문자열은 400으로 거부된다. 나중에 감상 UI가
 *  생기면 이 기본값을 실제 입력으로 교체한다.)
 * 저장에 실패해도 throw하지 않는다 — 홈 이동 등 후속 흐름을 막지 않고 콘솔에만 남긴다.
 */
export async function completePlanet(planet: number): Promise<void> {
  try {
    const { progress } = await apiCompletePlanet(planet, `행성 ${planet} 클리어`);
    if (current) current = { ...current, progress };
  } catch (e) {
    console.error(`[session] 행성 ${planet} 완료 저장 실패`, e);
  }
}
