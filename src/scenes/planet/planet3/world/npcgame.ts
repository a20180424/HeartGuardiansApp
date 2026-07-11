// stage2 NPC 감정 녹이기(미션3) 순수 게임 상태 + 데이터 검증 (THREE 비의존, 단위 테스트용).

export type NpcRound = { prompt: string; warm: string; cold: string; feedback: string };
export type NpcDef = { id: number; q: number; r: number; name: string; emoji: string; rounds: NpcRound[] };

const COLD_FEEDBACK = "음… 그 말은 조금 차가운 것 같아.";

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
      if (!rd || typeof rd.prompt !== "string" || typeof rd.warm !== "string" || typeof rd.cold !== "string") {
        warnings.push(`npc[${i}].round[${j}] 형식 오류 — 건너뜀`);
        return;
      }
      rounds.push({
        prompt: rd.prompt,
        warm: rd.warm,
        cold: rd.cold,
        feedback: typeof rd.feedback === "string" ? rd.feedback : "",
      });
    });
    if (rounds.length === 0) {
      warnings.push(`npc[${i}] 유효한 라운드 없음 — 건너뜀`);
      return;
    }
    if (rounds.length !== 3) {
      warnings.push(`npc[${i}] 라운드가 ${rounds.length}개 — 감정 lv0~lv3에 맞추려면 3개 권장`);
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

// 감정 상태 머신. warm(따듯한 말)이면 감정 +1단계·다음 라운드, cold(차가운 말)이면 제자리.
// level = 진행한 라운드 수(0..3). round가 rounds.length에 도달하면 그 NPC는 완료(lv3).
export function createNpcGame(npcs: NpcDef[]): {
  currentRound(id: number): NpcRound | null;
  choose(id: number, warm: boolean): { accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string };
  levelOf(id: number): number;
  isDone(id: number): boolean;
  allDone(): boolean;
} {
  const byId = new Map<number, NpcDef>(npcs.map((n) => [n.id, n]));
  const round = new Map<number, number>(npcs.map((n) => [n.id, 0])); // id -> 진행 라운드 수

  const cap3 = (v: number): number => Math.max(0, Math.min(3, v));
  function isDone(id: number): boolean {
    const n = byId.get(id);
    return !!n && (round.get(id) ?? 0) >= n.rounds.length;
  }
  function allDone(): boolean {
    return npcs.every((n) => isDone(n.id));
  }
  function currentRound(id: number): NpcRound | null {
    const n = byId.get(id);
    if (!n) return null;
    const r = round.get(id) ?? 0;
    return r < n.rounds.length ? n.rounds[r]! : null;
  }
  function levelOf(id: number): number {
    return cap3(round.get(id) ?? 0);
  }
  function choose(id: number, warm: boolean): { accepted: boolean; level: number; npcDone: boolean; allDone: boolean; feedback: string } {
    const n = byId.get(id);
    if (!n || isDone(id)) {
      return { accepted: false, level: cap3(round.get(id) ?? 0), npcDone: isDone(id), allDone: allDone(), feedback: "" };
    }
    const cur = round.get(id) ?? 0;
    if (!warm) {
      return { accepted: false, level: cap3(cur), npcDone: false, allDone: allDone(), feedback: COLD_FEEDBACK };
    }
    const passed = n.rounds[cur]!;
    round.set(id, cur + 1);
    return { accepted: true, level: cap3(cur + 1), npcDone: isDone(id), allDone: allDone(), feedback: passed.feedback };
  }

  return { currentRound, choose, levelOf, isDone, allDone };
}
