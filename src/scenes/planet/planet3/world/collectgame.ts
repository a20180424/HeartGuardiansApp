// 착한 말 수집(1단계) 순수 게임 상태 + 데이터 검증 (THREE 비의존, 단위 테스트용).

export type CGBubble = { id: number; q: number; r: number; text: string; good: boolean };

// stage1 JSON을 검증·정규화한다.
//   isWalkableKey(q, r) -> boolean : 해당 hex가 걸을 수 있는지(아니면 말풍선 제외).
// 반환 { bubbles:[{id,q,r,text,good}], passScore, warnings:[] }
export function parseStage1Data(
  data: unknown,
  isWalkableKey: (q: number, r: number) => boolean,
): { bubbles: CGBubble[]; passScore: number; warnings: string[] } {
  const warnings: string[] = [];
  const passScore = (data && typeof (data as any).passScore === 'number') ? (data as any).passScore : 5;
  const raw = data && Array.isArray((data as any).bubbles) ? (data as any).bubbles : [];
  const bubbles: CGBubble[] = [];
  raw.forEach((b: any, i: number) => {
    if (!b || typeof b.q !== 'number' || typeof b.r !== 'number' || typeof b.text !== 'string') {
      warnings.push(`bubble[${i}] 형식 오류 — 건너뜀`);
      return;
    }
    if (!isWalkableKey(b.q, b.r)) {
      warnings.push(`bubble[${i}] (${b.q},${b.r})는 걸을 수 없는 칸 — 건너뜀`);
      return;
    }
    bubbles.push({ id: bubbles.length, q: b.q, r: b.r, text: b.text, good: !!b.good });
  });
  const goodCount = bubbles.filter((b) => b.good).length;
  if (goodCount < passScore) {
    warnings.push(`착한 말이 ${goodCount}개뿐 — passScore(${passScore})보다 적어 통과 불가`);
  }
  return { bubbles, passScore, warnings };
}

// 점수 상태 머신. 착한 말 가져가기 +1, 나쁜 말 가져가기 −1(최저 0), 안 가져가기 0.
export function createCollectGame(opts?: { passScore?: number }): {
  choose(bubble: CGBubble, take: boolean): { scored: boolean; score: number; passed: boolean; alreadyConsumed: boolean };
  isConsumed(id: number): boolean;
  passScore: number;
  readonly score: number;
  readonly passed: boolean;
} {
  const { passScore = 5 } = opts ?? {};
  let score = 0;
  let passed = false;
  const consumed = new Set<number>(); // 이미 선택된 bubble id

  // bubble 하나에 대한 선택 적용. take=가져가기 여부.
  // scored = 착한 말을 모아 점수가 오른 경우만 true(HUD/피드백용).
  // 반환 { scored, score, passed, alreadyConsumed }
  function choose(bubble: CGBubble, take: boolean): { scored: boolean; score: number; passed: boolean; alreadyConsumed: boolean } {
    if (consumed.has(bubble.id)) {
      return { scored: false, score, passed, alreadyConsumed: true };
    }
    consumed.add(bubble.id);
    let scored = false;
    if (take) {
      if (bubble.good) {
        score += 1;
        scored = true;
      } else {
        score = Math.max(0, score - 1); // 나쁜 말: −1, 단 0 아래로는 안 내려감
      }
    }
    if (!passed && score >= passScore) passed = true;
    return { scored, score, passed, alreadyConsumed: false };
  }

  return {
    choose,
    isConsumed: (id: number): boolean => consumed.has(id),
    passScore,
    get score() { return score; },
    get passed() { return passed; },
  };
}
