export interface Command {
  cmd: string;
  value?: string;
}

export interface Choice {
  text: string;
  next: string | null;
}

export interface MissionNode {
  id: string;
  type?: "line" | "choice" | "branch";
  speaker?: string; // "hati" | 친구 id(예: "lumi" | "lala" | "sola")
  text?: string;
  // 친구 대사를 하티 라인·선택 화면에서도 계속 띄워둔다(맥락 유지).
  // true=이 대사를 유지, false=유지 중이던 대사를 비움. 다음 친구가 말하면 자동 교체.
  hold?: boolean;
  next?: string | null;
  choices?: Choice[];
  requireAll?: boolean;
  condition?: string; // "allExplored"
  watch?: string; // 감시할 choice 노드 id
  ifTrue?: string;
  ifFalse?: string;
  onEnter?: Command[];
  onComplete?: Command[];
}

export interface MissionData {
  id: string;
  title: string;
  start: string;
  nodes: MissionNode[];
}

export interface RunnerView {
  reset(): void;
  setDebug?(node: MissionNode): void;
  execCommands(cmds: Command[] | undefined, node: MissionNode): void;
  showLine(node: MissionNode, onTyped: () => void): Promise<void>;
  showChoices(
    node: MissionNode,
    exploredSet: Set<number> | null,
    pick: (idx: number, choice: Choice) => void,
  ): void;
  end(): void;
}

// 노드별로 sparse하게 교체되는 스프라이트 세트(하티/친구 공통 형태).
export interface SpriteSet {
  char: Record<string, string>;
  initial: string;
  byNode: Record<string, string>;
}

export interface MissionTheme {
  // "hati" + 등장 친구들(id → 표시 이름/아바타). 친구가 여럿일 수 있다(예: lala, sola).
  speakers: Record<string, { name: string; avatar?: string }>;
  // 인트로 타이틀 타일 문구(하드코딩 대신 미션별 데이터).
  banner: { pill: string; title: string; ribbon: string };
  bannerNode: string;
  drag?: { node: string };
  bg: { states: Record<string, string>; initial: string; byNode: Record<string, string> };
  hatiSprites: SpriteSet;
  // 친구 id → 스프라이트 세트. 화면엔 "현재 말하는(가장 최근) 친구" 한 명만 보인다.
  friends: Record<string, SpriteSet>;
  // 아무도 말하기 전(인트로) 기본으로 잡아둘 친구 id.
  initialFriend: string;
  radar: { states: Record<string, string>; initial: string; byNode: Record<string, string> };
  badgeColors: string[];
  choiceIcons: Record<string, { emoji: string; bg: string }>;
  fx: Record<string, string>;
  sfx: { byNode: Record<string, string> };
}
