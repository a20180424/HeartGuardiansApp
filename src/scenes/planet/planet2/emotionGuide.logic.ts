import type { EmotionGuideResult } from "./emotionGuide.data";

export const TOTAL_STEPS = 10;

export interface GameState {
  step: number; // 1..TOTAL_STEPS
  emotion: string | null;
  action: number | null;
  results: EmotionGuideResult[];
}

export function initialState(): GameState {
  return { step: 1, emotion: null, action: null, results: [] };
}

// 감정 선택 시 이전에 고른 행동은 리셋(원본 selectEmotion 동작).
export function pickEmotion(state: GameState, emotion: string): GameState {
  return { ...state, emotion, action: null };
}

export function pickAction(state: GameState, action: number): GameState {
  return { ...state, action };
}

export function canAdvance(state: GameState): boolean {
  return state.emotion !== null && state.action !== null;
}

export type AdvanceResult =
  | { kind: "next"; state: GameState }
  | { kind: "done"; results: EmotionGuideResult[] };

// 현재 선택을 결과에 확정하고 다음 문항으로 가거나 전체 완료를 알린다.
// 호출 전 canAdvance(state) === true 를 보장해야 한다.
export function advance(state: GameState, total = TOTAL_STEPS): AdvanceResult {
  const results: EmotionGuideResult[] = [
    ...state.results,
    // 텍스트가 아니라 id만 저장 — 이 배열이 그대로 서버 payload가 된다.
    { situationId: state.step, emotionId: state.emotion!, actionId: state.action! },
  ];
  if (state.step >= total) return { kind: "done", results };
  return {
    kind: "next",
    state: { step: state.step + 1, emotion: null, action: null, results },
  };
}
