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
  speaker?: "hati" | "lumi";
  text?: string;
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

export interface MissionTheme {
  speakers: { hati: { name: string; avatar: string }; lumi: { name: string } };
  bannerNode: string;
  drag?: { node: string };
  bg: { states: Record<string, string>; initial: string; byNode: Record<string, string> };
  hatiSprites: { char: Record<string, string>; initial: string; byNode: Record<string, string> };
  lumiSprites: { char: Record<string, string>; initial: string; byNode: Record<string, string> };
  radar: { states: Record<string, string>; initial: string; byNode: Record<string, string> };
  badgeColors: string[];
  choiceIcons: Record<string, { emoji: string; bg: string }>;
  fx: Record<string, string>;
  sfx: { byNode: Record<string, string> };
}
