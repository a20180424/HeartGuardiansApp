import type { MissionData, MissionTheme, SpriteSet } from "../engine/types";
import mission01 from "./mission01.json";
import mission02 from "./mission02.json";
import mission03 from "./mission03.json";

// JSON 추론 타입은 union(type/next 등)과 안 맞아 단언한다(planet1 관례).
export const MISSION01_DATA = mission01 as unknown as MissionData;
export const MISSION02_DATA = mission02 as unknown as MissionData;
export const MISSION03_DATA = mission03 as unknown as MissionData;

// 미션 이름 — 프롤로그 스텝 목록 + 미션 진행 스테퍼 라벨에서 공유한다.
export const MISSION_STEPS = [
  "감정 설명서",
  "공감 레이더 만들기",
  "숨은 감정 찾기",
];

const A = "/assets";

// 안개 행성 배경 — 프롤로그부터 마지막 미션까지 전 구간 동일한 안개 배경 하나만 쓴다.
// (프롤로그는 Prologue.css 에서 같은 이미지를 배경으로 지정.)
const BG = {
  states: { main: `${A}/bg/fog-planet-stage1.png` },
  initial: "main",
  byNode: {},
};

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
  banner: { pill: "미션 1", title: "감정 설명서", ribbon: "마음의 차이를 발견하라!" },
  bannerNode: "p2_m1_intro",
  bg: BG,
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
  banner: { pill: "미션 2", title: "공감 레이더 만들기", ribbon: "공감 레이더 부품을 조립하라!" },
  bannerNode: "p2_m2_intro",
  bg: BG,
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
  banner: { pill: "미션 3", title: "숨은 감정 찾기", ribbon: "안개 속 진짜 진심을 해독하라" },
  bannerNode: "p2_m3_intro",
  bg: BG,
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
