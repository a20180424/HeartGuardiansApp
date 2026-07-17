// 로그인 후 현재 사용자 정보를 메모리에 보관한다. (자격증명은 api.ts가 localStorage에 별도 저장)
// Profile/Progress는 매 실행 시 verify + getProgress로 새로 받아 항상 최신 상태를 유지한다.
// Home/Planet 등 다른 Scene이 progress를 읽고 쓰는 단일 출처.
// progress 저장의 책임은 여기로 위임한다 — 호출부는 completePlanet만 부르면
// 서버 저장(completePlanet API)과 로컬 세션 갱신을 세션 저장소가 함께 처리한다.

import type { Profile } from "./auth";
import type { ClassBoardResponse } from "./classBoard";
import { completePlanet as apiCompletePlanet } from "./progress";

export interface SessionData {
  profile: Profile;
  progress: number; // 0~4, 완료한 Planet 수
  // 학교·학년·반 게시판 URL(planet1~3). 자주 안 바뀌어 로그인 시 한 번 받아 보관.
  // 조회 실패 시 null (게시판은 부가 정보라 로그인을 막지 않는다).
  board: ClassBoardResponse | null;
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
 * 행성(1-4) 완료를 저장한다 — 논블로킹.
 *
 * 화면 전환(홈 이동)이 서버 응답을 기다리지 않도록 **await하지 않는다**. 네트워크가
 * 느리거나 timeout이어도 게임이 멈추지 않게 하기 위함이다. 대신:
 *   1) 로컬 progress를 즉시 낙관적으로 올려 Home의 잠금 해제가 곧바로 반영되게 한다
 *      (Home은 렌더 시점에 세션 progress를 동기로 읽어 잠금을 계산한다).
 *   2) 서버 저장은 백그라운드로 던진다. 성공하면 서버의 권위 있는 progress로 로컬을
 *      덮어써 동기화하고, 실패해도 throw하지 않고 콘솔에만 남긴다(다음 실행 시
 *      getProgress로 재동기화되므로 안전).
 *
 * review는 아직 입력 UI가 없어 고정 기본 문구로 저장한다.
 * (서버가 review를 최소 1자 요구하므로 빈 문자열은 400으로 거부된다. 나중에 감상 UI가
 *  생기면 이 기본값을 실제 입력으로 교체한다.)
 */
export function completePlanet(planet: number): void {
  // 0) 세션이 없으면 저장하지 않는다.
  //    로그인하지 않았는데 여기 닿을 수 있다 — 교사용 히든 점프 메뉴로 auth 화면에서
  //    바로 미션 엔딩에 갈 수 있기 때문이다. 가드가 없으면 두 가지가 터진다:
  //     · 자격증명이 없는 기기: authHeaders()가 동기적으로 throw 한다(progress.ts가
  //       headers: authHeaders() 를 인자로 먼저 평가한다). 아래 .catch()는 프로미스
  //       거절만 잡으므로 이 예외는 호출부(onExit) 밖으로 새고, 뒤따르는 nav()가
  //       실행되지 않아 완료 화면에 갇힌다.
  //     · 자격증명이 남아있는 기기: 저장이 "성공"해서 마지막에 로그인했던 학생 계정에
  //       엉뚱한 진도가 올라간다. 조용해서 더 나쁘다.
  if (!current) {
    console.warn(`[session] 세션 없음 — 행성 ${planet} 진도 저장을 건너뛴다`);
    return;
  }
  // 1) 낙관적 로컬 갱신 — 네트워크와 무관하게 홈 잠금 해제를 즉시 반영.
  if (current.progress < planet) {
    current = { ...current, progress: planet };
  }
  // 2) 서버 저장은 백그라운드(await 없음). 성공 시 서버값으로 동기화, 실패 시 로그만.
  apiCompletePlanet(planet, `행성 ${planet} 클리어`)
    .then(({ progress }) => {
      if (current) current = { ...current, progress };
    })
    .catch((e) => {
      console.error(`[session] 행성 ${planet} 완료 저장 실패`, e);
    });
}
