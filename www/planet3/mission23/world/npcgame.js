// stage2 NPC 감정 녹이기(미션3) 순수 게임 상태 + 데이터 검증.
// src/scenes/planet/planet3/world/npcgame.ts 이식 — 타입만 제거, 로직 동일.

const WRONG_FEEDBACK = "음… 친구가 조금 서운해할 것 같아.";
const CORRECT_FEEDBACK = "🌱 친구 마음이 사르르 녹아요!";

// stage2 JSON을 검증·정규화한다. id는 배열 인덱스로 재부여한다.
export function parseStage2Data(data, isWalkableKey) {
  const warnings = [];
  const raw = data && Array.isArray(data.npcs) ? data.npcs : [];
  const npcs = [];
  raw.forEach((n, i) => {
    if (!n || typeof n.q !== "number" || typeof n.r !== "number" || !Array.isArray(n.rounds) || n.rounds.length === 0) {
      warnings.push(`npc[${i}] 형식 오류 — 건너뜀`);
      return;
    }
    if (!isWalkableKey(n.q, n.r)) {
      warnings.push(`npc[${i}] (${n.q},${n.r})는 걸을 수 없는 칸 — 건너뜀`);
      return;
    }
    const rounds = [];
    n.rounds.forEach((rd, j) => {
      const choices = Array.isArray(rd?.choices) ? rd.choices : [];
      const allStrings = choices.every((c) => typeof c === "string");
      // choices: 0개=대사 라운드, 2개 이상=스텝(정답 필요), 1개=오류.
      if (!rd || typeof rd.prompt !== "string" || !allStrings || choices.length === 1) {
        warnings.push(`npc[${i}].round[${j}] 형식 오류 — 건너뜀`);
        return;
      }
      let answer = -1;
      if (choices.length >= 2) {
        if (typeof rd.answer !== "number" || rd.answer < 0 || rd.answer >= choices.length) {
          warnings.push(`npc[${i}].round[${j}] 정답(answer) 오류 — 건너뜀`);
          return;
        }
        answer = rd.answer;
      }
      rounds.push({ prompt: rd.prompt, choices: choices.slice(), answer });
    });
    if (rounds.length === 0) {
      warnings.push(`npc[${i}] 유효한 라운드 없음 — 건너뜀`);
      return;
    }
    const stepCount = rounds.filter((r) => r.choices.length > 0).length;
    if (stepCount !== 3) {
      warnings.push(`npc[${i}] 선택 스텝이 ${stepCount}개 — 감정 lv0~lv3에 맞추려면 3개 권장`);
    }
    npcs.push({
      id: npcs.length,
      q: n.q,
      r: n.r,
      name: typeof n.name === "string" ? n.name : `친구 ${npcs.length + 1}`,
      emoji: typeof n.emoji === "string" ? n.emoji : "🐰",
      rounds,
    });
  });
  return { npcs, warnings };
}

// 감정 상태 머신. 스텝에서 정답을 고르면 감정 +1단계·다음 라운드(오답은 제자리 재시도).
export function createNpcGame(npcs) {
  const byId = new Map(npcs.map((n) => [n.id, n]));
  const progress = new Map(npcs.map((n) => [n.id, 0])); // id -> 지나온 라운드 수

  const cap3 = (v) => Math.max(0, Math.min(3, v));
  function isDone(id) {
    const n = byId.get(id);
    return !!n && (progress.get(id) ?? 0) >= n.rounds.length;
  }
  function allDone() {
    return npcs.every((n) => isDone(n.id));
  }
  function levelOf(id) {
    const n = byId.get(id);
    if (!n) return 0;
    const p = progress.get(id) ?? 0;
    return cap3(n.rounds.slice(0, p).filter((r) => r.choices.length > 0).length);
  }
  function currentRound(id) {
    const n = byId.get(id);
    if (!n) return null;
    const p = progress.get(id) ?? 0;
    return p < n.rounds.length ? n.rounds[p] : null;
  }
  function choose(id, choiceIndex) {
    const n = byId.get(id);
    if (!n || isDone(id)) {
      return { accepted: false, level: levelOf(id), npcDone: isDone(id), allDone: allDone(), feedback: "" };
    }
    const p = progress.get(id);
    const rd = n.rounds[p];
    // 대사 라운드(선택지 없음): 어떤 입력으로도 그냥 넘어간다(피드백 없음).
    if (rd.choices.length === 0) {
      progress.set(id, p + 1);
      return { accepted: true, level: levelOf(id), npcDone: isDone(id), allDone: allDone(), feedback: "" };
    }
    // 스텝: 정답 판정.
    if (choiceIndex !== rd.answer) {
      return { accepted: false, level: levelOf(id), npcDone: false, allDone: allDone(), feedback: WRONG_FEEDBACK };
    }
    progress.set(id, p + 1);
    return { accepted: true, level: levelOf(id), npcDone: isDone(id), allDone: allDone(), feedback: CORRECT_FEEDBACK };
  }

  return { currentRound, choose, levelOf, isDone, allDone };
}
