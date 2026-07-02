export interface Command {
  cmd: string;
  value?: string;
}

export interface Choice {
  text: string;
  next: string | null;
}

export interface MirrorTarget {
  friend: string; // theme.friends 키 (예: "lumi" | "lala")
  title: string; // 거울 위 뱃지 타이틀 (예: "루미의 마음")
  scene: string; // theme.mirror.scenes 키 (거울 안쪽 배경)
  line: string; // 거울 안 친구 말풍선
  onDrop: string; // 카드 드롭 후 친구 반응 대사
  charImage?: string; // 거울 안 캐릭터 이미지 경로(지정 시 friend 스프라이트 대신 사용)
  onDropImage?: string; // 카드 드롭 후 교체할 캐릭터 이미지(없으면 charImage 유지)
}

export interface MirrorReveal {
  prompt: string; // 터치 유도 하티 대사(하단 바)
  friend: string; // 터치 대상 거울의 friend
  line: string; // 터치 후 드러나는 속마음 말풍선
  image?: string; // 터치(속마음 공개) 후 교체할 캐릭터 이미지
}

export interface GaugeOption {
  icon: string; // theme.gaugeIcons 키 (예: "run" | "meditate")
  title: string; // "계속 다가가기"
  desc: string; // "용기를 내서 다가가 보자."
  correct: boolean; // 정답 여부
  onPick: string; // 100% 도달 시 친구 반응 대사
}

export interface MissionNode {
  id: string;
  type?: "line" | "choice" | "branch" | "mirrors" | "gauge";
  speaker?: string; // "hati" | 친구 id(예: "lumi" | "lala" | "sola")
  text?: string;
  // 친구 대사를 하티 라인·선택 화면에서도 계속 띄워둔다(맥락 유지).
  // true=이 대사를 유지, false=유지 중이던 대사를 비움. 다음 친구가 말하면 자동 교체.
  hold?: boolean;
  // 이 노드에서 화면의 친구 캐릭터 레이어를 숨긴다(친구 없이 하티만 말하는 전환 구간용).
  hideFriend?: boolean;
  // 교훈 배너(금색 오너먼트 배너)로 이 미션의 교훈을 표시한다. 있으면 하티 박스 대신 배너를 띄운다.
  lesson?: { title: string; sub: string };
  // 화면 우측 가운데에 띄우는 장식 이미지 경로(세로 80% 크기). 지정한 노드에서만 표시.
  sideImage?: string;
  next?: string | null;
  choices?: Choice[];
  // 선택지 카드 위에 띄우는 짧은 안내 문구(선택). 없으면 표시하지 않는다.
  prompt?: string;
  requireAll?: boolean;
  condition?: string; // "allExplored"
  watch?: string; // 감시할 choice 노드 id
  ifTrue?: string;
  ifFalse?: string;
  onEnter?: Command[];
  onComplete?: Command[];
  // type: "mirrors" (화면 A) 전용
  banner?: string;
  card?: string;
  targets?: MirrorTarget[];
  reveal?: MirrorReveal;
  // 거울/게이지 캐릭터 말풍선을 숨긴다(대사가 캐릭터 이미지에 포함된 경우).
  // 대사 데이터(line/onDrop/reveal.line)는 그대로 두어 나중에 쉽게 다시 켤 수 있다.
  hideBubbles?: boolean;
  // type: "gauge" (화면 B) 전용
  header?: string; // 선택 패널 제목 ("어떻게 도와줄래?")
  lead?: string; // 게이지 등장 전 하티 도입 대사
  scene?: string; // 거울 안쪽 배경 키
  options?: GaugeOption[];
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
  showMirrors(node: MissionNode, done: () => void): void;
  showGauge(node: MissionNode, done: () => void): void;
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
  // 레이더 HUD("마음 신호 탐색기") 표시 여부. 생략 시 표시(true). 미션2처럼 안 쓰는 미션은 false.
  showRadar?: boolean;
  badgeColors: string[];
  choiceIcons: Record<string, { emoji: string; bg: string }>;
  fx: Record<string, string>;
  sfx: { byNode: Record<string, string> };
  // 공감 거울 특별 파트(화면 A/B) 에셋. 없으면 해당 미션엔 특별 파트가 없다.
  mirror?: { frameA: string; frameB: string; scenes: Record<string, string> };
  gaugeIcons?: Record<string, { emoji: string; color: string }>;
}
