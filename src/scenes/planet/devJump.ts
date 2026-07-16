import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { isUnlocked } from "../../lib/hiddenMenu";
import type { MissionData } from "./engine/types";

// 행성 씬의 점프 파라미터를 한 곳에서 해석한다.
//
// 개발 중(vite dev)에는 항상 열려 있다. 프로덕션 빌드(APK)에서는 히든 메뉴가
// PIN으로 해제된 뒤에만(isUnlocked) 파라미터가 해석되고, 그전까지는 전부
// 무시되어 항상 stages[0](=prologue)부터 시작한다.
// APK는 주소창 없는 immersive 웹뷰라 URL 파라미터 자체가 학생 손에 닿지 않는다 —
// 실질 방어선은 히든 메뉴의 제스처 + PIN이다.
//
//   #/planet/2?m=3                 미션3부터 (m=0 → prologue)
//   #/planet/2?stage=mission3      위와 동일(풀네임)
//   #/planet/2?m=3&end=1           미션3의 마지막 노드(=엔딩)부터
//   #/planet/2?m=3&node=p2_m3_cards 미션3의 특정 노드부터

type DevJump<S extends string> = {
  stage: S; // 시작할 subscene
  requested: string | null; // 별칭 적용 전 원본 요청("mission3" 등). DEV 아니면 null
  has: (key: string) => boolean; // 행성 전용 플래그(예: planet3 의 stage2)
  // 시나리오의 start 를 ?node= / ?end= 로 갈아끼운 사본. 해당 없으면 원본을 그대로 돌려준다.
  // 반환값은 useMemo 로 캐시되므로 MissionPlayer 에 그대로 넘겨도 안전하다
  // (scenario 참조가 바뀌면 DialogueRunner 가 재생성돼 미션이 처음부터 다시 시작한다).
  startFrom: (data: MissionData) => MissionData;
};

export function useDevJump<S extends string>(
  stages: readonly S[],
  // 별칭: 이 행성에 없는 stage 를 실제 stage 로 매핑(예: planet3 의 mission3 → mission2).
  alias?: Record<string, S>,
): DevJump<S> {
  const [params] = useSearchParams();
  // DEV는 항상 허용, 프로덕션은 히든 메뉴로 해제된 뒤에만.
  const dev = import.meta.env.DEV || isUnlocked();

  const m = params.get("m");
  const requested = dev
    ? (params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null))
    : null;

  const wanted = (requested && alias?.[requested]) ?? requested;
  const stage =
    wanted && (stages as readonly string[]).includes(wanted) ? (wanted as S) : stages[0];

  const node = dev ? params.get("node") : null;
  const end = dev && params.has("end");

  // data 별로 결과를 캐시한다. node/end 가 없으면 원본 참조를 그대로 유지한다.
  const cache = useMemo(() => new Map<MissionData, MissionData>(), [node, end]);
  const startFrom = (data: MissionData) => {
    if (!node && !end) return data;
    const hit = cache.get(data);
    if (hit) return hit;
    // ?end=1 은 nodes 의 마지막 원소를 쓴다 — 12개 미션 전부 마지막 원소가 엔딩 노드다.
    const target = node ?? data.nodes[data.nodes.length - 1]?.id;
    const found = target && data.nodes.some((n) => n.id === target);
    const out = found ? { ...data, start: target } : data;
    cache.set(data, out);
    return out;
  };

  return {
    stage,
    requested,
    has: (key: string) => dev && params.has(key),
    startFrom,
  };
}
