// 착한 말 수집(1단계) 순수 게임 상태 + 데이터 검증.
// src/scenes/planet/planet3/world/collectgame.ts 이식 — 타입만 제거, 로직 동일.

// stage1 JSON을 검증·정규화한다.
//   isWalkableKey(q, r) -> boolean : 해당 hex가 걸을 수 있는지(아니면 말풍선 제외).
// 반환 { bubbles:[{id,q,r,text,good}], passScore, warnings:[] }
export function parseStage1Data(data, isWalkableKey) {
  const warnings = [];
  const passScore = (data && typeof data.passScore === 'number') ? data.passScore : 5;
  const raw = data && Array.isArray(data.bubbles) ? data.bubbles : [];
  const bubbles = [];
  raw.forEach((b, i) => {
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
export function createCollectGame(opts) {
  const { passScore = 5 } = opts ?? {};
  let score = 0;
  let passed = false;
  const consumed = new Set(); // 이미 선택된 bubble id

  function choose(bubble, take) {
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
    isConsumed: (id) => consumed.has(id),
    passScore,
    get score() { return score; },
    get passed() { return passed; },
  };
}
