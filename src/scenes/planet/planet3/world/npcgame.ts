// stage2 NPC 감정 녹이기(미션3) 순수 게임 상태 + 데이터 검증 (THREE 비의존, 단위 테스트용).

// 한 라운드: NPC 대사 + 선택지. 선택지가 있으면(>=2) '스텝'(정답 고르기), 없으면(choices=[])
// 마무리 '대사 라운드'(선택 없이 NPC 대사만 보여주고 넘어감). 정답/오답 피드백은 공통 상수.
export type NpcRound = { prompt: string; choices: string[]; answer: number };
export type NpcDef = { id: number; q: number; r: number; name: string; emoji: string; rounds: NpcRound[] };

const WRONG_FEEDBACK = "음… 친구가 조금 서운해할 것 같아.";
const CORRECT_FEEDBACK = "🌱 친구 마음이 사르르 녹아요!";

// stage2 JSON을 검증·정규화한다. isWalkableKey(q,r)로 배치 가능 여부를 확인하고,
// id는 배열 인덱스로 재부여한다(3D·미니맵과 공유하는 안정적 키).
export function parseStage2Data(
  data: unknown,
  isWalkableKey: (q: number, r: number) => boolean,
): { npcs: NpcDef[]; warnings: string[] } {
  const warnings: string[] = [];
  const raw = data && Array.isArray((data as any).npcs) ? (data as any).npcs : [];
  const npcs: NpcDef[] = [];
  raw.forEach((n: any, i: number) => {
    if (!n || typeof n.q !== "number" || typeof n.r !== "number" || !Array.isArray(n.rounds) || n.rounds.length === 0) {
      warnings.push(`npc[${i}] 형식 오류 — 건너뜀`);
      return;
    }
    if (!isWalkableKey(n.q, n.r)) {
      warnings.push(`npc[${i}] (${n.q},${n.r})는 걸을 수 없는 칸 — 건너뜀`);
      return;
    }
    const rounds: NpcRound[] = [];
    n.rounds.forEach((rd: any, j: number) => {
      const choices: unknown = Array.isArray(rd?.choices) ? rd.choices : [];
      const allStrings = (choices as any[]).every((c) => typeof c === "string");
      // choices: 0개=대사 라운드, 2개 이상=스텝(정답 필요), 1개=오류.
      if (!rd || typeof rd.prompt !== "string" || !allStrings || (choices as any[]).length === 1) {
        warnings.push(`npc[${i}].round[${j}] 형식 오류 — 건너뜀`);
        return;
      }
      let answer = -1;
      if ((choices as any[]).length >= 2) {
        if (typeof rd.answer !== "number" || rd.answer < 0 || rd.answer >= (choices as any[]).length) {
          warnings.push(`npc[${i}].round[${j}] 정답(answer) 오류 — 건너뜀`);
          return;
        }
        answer = rd.answer;
      }
      rounds.push({ prompt: rd.prompt, choices: (choices as string[]).slice(), answer });
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
// 선택지 없는 '대사 라운드'는 어떤 입력으로도 그냥 넘어간다(닫기). 모든 라운드를 지나면 완료.
// level(감정 단계) = 지금까지 지나온 '스텝' 수(0..3). 대사 라운드는 감정을 올리지 않는다.
export function createNpcGame(npcs: NpcDef[]): {
  currentRound(id: number): NpcRound | null;
  choose(id: number, choiceIndex: number): { accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string };
  levelOf(id: number): number;
  isDone(id: number): boolean;
  allDone(): boolean;
} {
  const byId = new Map<number, NpcDef>(npcs.map((n) => [n.id, n]));
  const progress = new Map<number, number>(npcs.map((n) => [n.id, 0])); // id -> 지나온 라운드 수

  const cap3 = (v: number): number => Math.max(0, Math.min(3, v));
  function isDone(id: number): boolean {
    const n = byId.get(id);
    return !!n && (progress.get(id) ?? 0) >= n.rounds.length;
  }
  function allDone(): boolean {
    return npcs.every((n) => isDone(n.id));
  }
  function levelOf(id: number): number {
    const n = byId.get(id);
    if (!n) return 0;
    const p = progress.get(id) ?? 0;
    return cap3(n.rounds.slice(0, p).filter((r) => r.choices.length > 0).length);
  }
  function currentRound(id: number): NpcRound | null {
    const n = byId.get(id);
    if (!n) return null;
    const p = progress.get(id) ?? 0;
    return p < n.rounds.length ? n.rounds[p]! : null;
  }
  function choose(id: number, choiceIndex: number): { accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string } {
    const n = byId.get(id);
    if (!n || isDone(id)) {
      return { accepted: false, level: levelOf(id), npcDone: isDone(id), allDone: allDone(), feedback: "" };
    }
    const p = progress.get(id)!;
    const rd = n.rounds[p]!;
    // 대사 라운드(선택지 없음): 어떤 입력으로도 그냥 넘어간다(피드백 없음 — 대사가 이미 카드에 보였음).
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
