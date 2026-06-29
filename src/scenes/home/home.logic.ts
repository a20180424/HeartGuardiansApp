import { NICKNAMES, COMMENTS, ENERGY_NOTES } from "./home.data";

export type PlanetStatus = "completed" | "unlocked" | "locked";

/** 행성 id(1~4)와 progress(0~4)로 상태를 판정한다. 진행은 순차적이다. */
export function planetState(id: number, progress: number): PlanetStatus {
  if (id <= progress) return "completed";
  if (id === progress + 1) return "unlocked";
  return "locked";
}

function clampIndex(n: number, len: number): number {
  return Math.max(0, Math.min(len - 1, n));
}

/** progress(0~4)에 대응하는 별명. 범위를 벗어나면 양 끝으로 clamp. */
export function nicknameFor(progress: number): string {
  return NICKNAMES[clampIndex(progress, NICKNAMES.length)];
}

/** progress(0~4)에 대응하는 하티 멘트. 범위를 벗어나면 양 끝으로 clamp. */
export function commentFor(progress: number): string {
  return COMMENTS[clampIndex(progress, COMMENTS.length)];
}

/** progress(0~4)에 대응하는 에너지 게이지 안내 문구. 범위를 벗어나면 양 끝으로 clamp. */
export function energyNoteFor(progress: number): string {
  return ENERGY_NOTES[clampIndex(progress, ENERGY_NOTES.length)];
}
