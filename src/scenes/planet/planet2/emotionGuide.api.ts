// 행성2 · 미션1(감정 안내) 서버 API 클라이언트.
// 스펙: POST /api/planet2/emotion-guide/answers, GET /api/planet2/emotion-guide/class-answers
// 인증은 다른 엔드포인트와 동일하게 저장된 자격증명 헤더(authHeaders)로 실린다.

import { request, authHeaders } from "../../../lib/api";
import type { EmotionGuideResult } from "./emotionGuide.data";
import type { ClassVote } from "./classResults.source";

const BASE = "/api/planet2/emotion-guide";

/** 내 답변 10건을 제출(재제출 시 서버가 upsert). 실패 시 ApiError throw. */
export function submitEmotionGuideAnswers(
  answers: EmotionGuideResult[],
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`${BASE}/answers`, {
    method: "POST",
    headers: authHeaders(),
    body: { answers },
  });
}

/** 오늘(KST) 우리 반의 모든 답변을 flat 배열로 조회. 폴링에서 호출한다. */
export async function fetchClassAnswers(): Promise<ClassVote[]> {
  const res = await request<{ votes: ClassVote[] }>(`${BASE}/class-answers`, {
    headers: authHeaders(),
  });
  return res.votes;
}
