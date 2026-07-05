// 반 결과 집계 — 순수 함수(데이터 소스와 무관, ClassVote[] 만 받는다).
// 원본 renderTeacherStats / renderTeacherActionDetails 이식.
import { EMOTIONS, COPING_ACTIONS } from "./emotionGuide.data";
import type { ClassVote } from "./classResults.source";

export interface EmotionStat {
  emotionId: string;
  count: number;
  pct: number; // 해당 상황 응답 대비 백분율(반올림)
}

export interface ActionStat {
  actionId: number;
  count: number;
  voterNames: string[];
}

function votesFor(votes: ClassVote[], situationId: number): ClassVote[] {
  return votes.filter((v) => v.situationId === situationId);
}

// 특정 상황의 8감정 분포(감정 정의 순서 유지). pct 는 그 상황 응답 수 대비.
export function emotionDistribution(votes: ClassVote[], situationId: number): EmotionStat[] {
  const sit = votesFor(votes, situationId);
  const total = sit.length || 1;
  return EMOTIONS.map((e) => {
    const count = sit.filter((v) => v.emotionId === e.id).length;
    return { emotionId: e.id, count, pct: Math.round((count / total) * 100) };
  });
}

// 상위 1~3위(표수 내림차순). 항상 길이 3, 부족하면 count 0 자리로 채운다.
export function leaderboard(votes: ClassVote[], situationId: number): EmotionStat[] {
  const sorted = [...emotionDistribution(votes, situationId)].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 3);
  while (top.length < 3) top.push({ emotionId: "", count: 0, pct: 0 });
  return top;
}

// 특정 상황·감정의 행동(1~6)별 선택자 명단.
export function actionBreakdown(
  votes: ClassVote[],
  situationId: number,
  emotionId: string,
): ActionStat[] {
  const matching = votesFor(votes, situationId).filter((v) => v.emotionId === emotionId);
  const actions = COPING_ACTIONS[emotionId]?.actions ?? [];
  return actions.map((a) => {
    const picked = matching.filter((v) => v.actionId === a.id);
    return {
      actionId: a.id,
      count: picked.length,
      voterNames: picked.map((v) => v.studentName),
    };
  });
}
