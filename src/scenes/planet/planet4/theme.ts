import type { MissionData, MissionTheme, SpriteSet } from "../engine/types";
import mission01 from "./mission01.json";
import mission02 from "./mission02.json";
import mission03 from "./mission03.json";

// JSON 추론 타입은 union(type/next 등)과 안 맞아 단언한다(planet1 관례).
export const MISSION01_DATA = mission01 as unknown as MissionData;
export const MISSION02_DATA = mission02 as unknown as MissionData;
export const MISSION03_DATA = mission03 as unknown as MissionData;

// 미션 이름 — 프롤로그 스텝 목록 + 미션 진행 스테퍼 라벨 + 각 미션 배너 제목의 단일 출처.
export const MISSION_STEPS = ["가디언즈 최종 점검", "공감 나침반 작전", "마지막 공감 연결"];

const A = "/assets";

// 하티 스프라이트 — planet1과 동일(미션 공통). 골격에선 하티만 말한다.
const HATI_CHAR: Record<string, string> = {
  thinking: `${A}/char/Hati/hati_thinking.png`,
  explaining: `${A}/char/Hati/hati_explaining.png`,
  suggesting: `${A}/char/Hati/hati_suggesting.png`,
  worried: `${A}/char/Hati/hati_worried.png`,
  praising: `${A}/char/Hati/hati_praising.png`,
  cheering: `${A}/char/Hati/hati_cheering.png`,
  proud: `${A}/char/Hati/hati_proud.png`,
  celebrating: `${A}/char/Hati/hati_celebrating.png`,
};

// placeholder 친구 — 타입상 friends/initialFriend 가 필수라 Lumi 스프라이트를 임시 사용.
// 골격의 모든 노드가 hideFriend:true 라 화면엔 안 보인다. 안개 행성 아트 준비 시 교체.
const PLACEHOLDER_FRIEND: SpriteSet = {
  char: { sad: `${A}/char/Lumi/lumi_sad.png` },
  initial: "sad",
  byNode: {},
};

// 레이더 — planet1 에셋 재사용. showRadar:false 라 화면엔 안 뜨지만 타입상 필수.
const RADAR = {
  states: {
    p25: `${A}/device/radar_25.png`,
    p50: `${A}/device/radar_50.png`,
    p75: `${A}/device/radar_75.png`,
    p100: `${A}/device/radar_100.png`,
    active: `${A}/device/radar_active.png`,
  },
  initial: "p100",
  byNode: {},
};

const BADGE_COLORS = ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"];

export const MISSION01_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 1", title: MISSION_STEPS[0], ribbon: "지금까지의 공감 여정을 돌아보고, 마지막 시험을 통과하라!" },
  bannerNode: "p4_m1_intro",
  // 미션1 전 구간 하티를 전신 하티로 통일(play 는 미니게임이라 하티 없음). 타이틀 배너는 인트로만.
  fullHatiNodes: ["p4_m1_postplay", "p4_m1_end"],
  bg: {
    states: { main: `${A}/planet4/shadow-spaceship-bg.png` },
    initial: "main",
    byNode: { p4_m1_intro: "main" },
  },
  hatiSprites: { char: HATI_CHAR, initial: "thinking", byNode: {} },
  friends: { placeholder: PLACEHOLDER_FRIEND },
  initialFriend: "placeholder",
  radar: RADAR,
  showRadar: false,
  badgeColors: BADGE_COLORS,
  choiceIcons: {},
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};

export const MISSION02_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 2", title: MISSION_STEPS[1], ribbon: "그림자 행성 미션 2 골격" },
  bannerNode: "p4_m2_intro",
  bg: {
    states: { main: `${A}/bg/light-planet-stage2-bg.png` },
    initial: "main",
    byNode: { p4_m2_intro: "main" },
  },
  hatiSprites: { char: HATI_CHAR, initial: "thinking", byNode: {} },
  friends: { placeholder: PLACEHOLDER_FRIEND },
  initialFriend: "placeholder",
  radar: RADAR,
  showRadar: false,
  badgeColors: BADGE_COLORS,
  choiceIcons: {},
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};

export const MISSION03_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` } },
  banner: { pill: "미션 3", title: MISSION_STEPS[2], ribbon: "그림자 행성 미션 3 골격" },
  bannerNode: "p4_m3_intro",
  bg: {
    states: { main: `${A}/bg/light-planet-stage2-bg.png` },
    initial: "main",
    byNode: { p4_m3_intro: "main" },
  },
  hatiSprites: { char: HATI_CHAR, initial: "thinking", byNode: {} },
  friends: { placeholder: PLACEHOLDER_FRIEND },
  initialFriend: "placeholder",
  radar: RADAR,
  showRadar: false,
  badgeColors: BADGE_COLORS,
  choiceIcons: {},
  fx: { fx_light_return: "lightReturn" },
  sfx: { byNode: {} },
};
