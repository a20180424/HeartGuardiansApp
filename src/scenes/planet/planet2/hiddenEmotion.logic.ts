import { MISSIONS, type Mission } from "./hiddenEmotion.data";

export interface GameState {
  missionIndex: number; // 0..2
  revealedCount: number; // 2..5
  puzzleSolved: boolean;
  feedbackShown: boolean;
}

const START_REVEALED = 2;
const TOTAL_CARDS = 5;

export function initialState(): GameState {
  return { missionIndex: 0, revealedCount: START_REVEALED, puzzleSolved: false, feedbackShown: false };
}

export function useRadar(s: GameState): GameState {
  if (s.revealedCount >= TOTAL_CARDS) return s;
  return { ...s, revealedCount: s.revealedCount + 1 };
}

export function allRevealed(s: GameState): boolean {
  return s.revealedCount >= TOTAL_CARDS;
}

export type SubmitResult =
  | { kind: "need-more" }
  | { kind: "wrong" }
  | { kind: "solved"; state: GameState };

export function submitPuzzle(
  s: GameState,
  picks: number[],
  emotion: string,
  missions: Mission[] = MISSIONS,
): SubmitResult {
  if (picks.length < 2) return { kind: "need-more" };
  if (emotion !== missions[s.missionIndex].answer) return { kind: "wrong" };
  return { kind: "solved", state: { ...s, puzzleSolved: true, feedbackShown: true } };
}

export function nextMission(s: GameState): GameState {
  return {
    missionIndex: s.missionIndex + 1,
    revealedCount: START_REVEALED,
    puzzleSolved: false,
    feedbackShown: false,
  };
}

export function isLastMission(s: GameState, missions: Mission[] = MISSIONS): boolean {
  return s.missionIndex >= missions.length - 1;
}
