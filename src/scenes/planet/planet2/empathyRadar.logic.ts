import { STAGES, stageWords, findEmotion, type Stage, type Word } from "./empathyRadar.data";

export interface GameState {
  stageIndex: number; // 0..2
  words: Word[]; // 현재 스테이지의 셔플된 6단어
  wordIndex: number; // 0..6 (6이면 스테이지 끝)
  correctCounts: Record<string, number>; // 현재 스테이지 감정별 정답 수(0..2)
  earnedParts: number[]; // 획득한 부품 partId 목록(획득 순서)
}

export type Shuffle = <T>(arr: T[]) => T[];
const identity: Shuffle = (arr) => arr;

function zeroCounts(stage: Stage): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of stage.emotions) counts[e.id] = 0;
  return counts;
}

export function initialState(stages: Stage[] = STAGES, shuffle: Shuffle = identity): GameState {
  const stage = stages[0];
  return {
    stageIndex: 0,
    words: shuffle(stageWords(stage)),
    wordIndex: 0,
    correctCounts: zeroCounts(stage),
    earnedParts: [],
  };
}

export function currentWord(state: GameState): Word | null {
  return state.words[state.wordIndex] ?? null;
}

export type ClassifyResult =
  | { kind: "wrong" }
  | {
      kind: "correct";
      state: GameState;
      earnedPartId: number | null; // 이번 분류로 완성된 부품(2개째 정답), 아니면 null
      stageCleared: boolean; // 이번 분류로 스테이지 6단어를 끝냈는가
      gameDone: boolean; // 이번 분류로 게임 전체가 끝났는가
    };

// 현재 단어를 emotionId 상자에 넣었을 때의 결과. 오답이면 상태 불변(wrong).
export function classify(
  state: GameState,
  emotionId: string,
  stages: Stage[] = STAGES,
  shuffle: Shuffle = identity,
): ClassifyResult {
  const word = currentWord(state);
  if (!word || word.emotionId !== emotionId) return { kind: "wrong" };

  const newCount = state.correctCounts[emotionId] + 1;
  const correctCounts = { ...state.correctCounts, [emotionId]: newCount };

  let earnedPartId: number | null = null;
  let earnedParts = state.earnedParts;
  if (newCount === 2) {
    earnedPartId = findEmotion(emotionId, stages).partId;
    earnedParts = [...earnedParts, earnedPartId];
  }

  const nextWordIndex = state.wordIndex + 1;
  const stageCleared = nextWordIndex >= state.words.length;

  if (!stageCleared) {
    return {
      kind: "correct",
      earnedPartId,
      stageCleared: false,
      gameDone: false,
      state: { ...state, wordIndex: nextWordIndex, correctCounts, earnedParts },
    };
  }

  const isLastStage = state.stageIndex >= stages.length - 1;
  if (isLastStage) {
    return {
      kind: "correct",
      earnedPartId,
      stageCleared: true,
      gameDone: true,
      state: { ...state, wordIndex: nextWordIndex, correctCounts, earnedParts },
    };
  }

  // 다음 스테이지로 자동 전환(단어 셔플, 카운트 리셋).
  const nextStage = stages[state.stageIndex + 1];
  return {
    kind: "correct",
    earnedPartId,
    stageCleared: true,
    gameDone: false,
    state: {
      stageIndex: state.stageIndex + 1,
      words: shuffle(stageWords(nextStage)),
      wordIndex: 0,
      correctCounts: zeroCounts(nextStage),
      earnedParts,
    },
  };
}
