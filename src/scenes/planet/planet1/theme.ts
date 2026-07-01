import type { MissionData, MissionTheme, SpriteSet } from "../engine/types";
import missionData from "./mission01.json";
import mission2Data from "./mission02.json";

// 시나리오 콘텐츠(대사·선택지·분기 그래프). 런타임 fetch 대신 빌드 타임 import로
// 타입 검증·파일 존재 보장. JSON 추론 타입은 union(type/next 등)과 안 맞아 단언한다.
export const MISSION01_DATA = missionData as unknown as MissionData;
export const MISSION02_DATA = mission2Data as unknown as MissionData;

const A = "/assets";

// 하티 스프라이트는 미션 공통. mission2에서 재사용한다.
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

export const MISSION01_THEME: MissionTheme = {
  speakers: {
    hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` },
    lumi: { name: "루미" },
  },
  banner: { pill: "미션 1", title: "마음 신호 탐색기", ribbon: "친구의 마음을 찾아라!" },
  bannerNode: "m1_intro",
  initialFriend: "lumi",
  // Q4: 카드를 루미의 빈 말풍선(#dropZone)으로 드래그해서 답한다. 탭도 선택 fallback.
  drag: { node: "m1_q4_choice" },
  // 배경 — 노드별 교체(sparse, 다음 지정 노드까지 유지). 인트로는 stage1, 엔딩 빛 복귀에서 stage2.
  bg: {
    states: {
      stage1: `${A}/bg/light-planet-stage1-bg.png`,
      stage2: `${A}/bg/light-planet-stage2.png`,
    },
    initial: "stage1",
    byNode: { m1_intro: "stage1", m1_end3: "stage2" },
  },
  hatiSprites: {
    char: HATI_CHAR,
    initial: "thinking",
    byNode: {
      m1_intro: "explaining",
      m1_q1_prompt: "thinking",
      m1_q1_react: "thinking",
      m1_q2_prompt: "thinking",
      m1_q2_wrongA: "worried",
      m1_q2_wrongC: "worried",
      m1_q2_retry: "suggesting",
      m1_q2_correct: "explaining",
      m1_q3_prompt: "suggesting",
      m1_q4_prompt: "thinking",
      m1_q4_retry: "suggesting",
      m1_end1: "praising",
      m1_end_recover: "cheering",
      m1_end2: "proud",
      m1_end3: "celebrating",
    },
  },
  friends: {
    lumi: {
      char: {
        sad: `${A}/char/Lumi/lumi_sad.png`,
        confused: `${A}/char/Lumi/lumi_confused.png`,
        sick: `${A}/char/Lumi/lumi_sick.png`,
        happy: `${A}/char/Lumi/lumi_happy.png`,
        recovered: `${A}/char/Lumi/lumi_recovered.png`,
      },
      initial: "sad",
      byNode: {
        m1_lumi_intro: "sad",
        m1_lumi_answer: "sick",
        m1_q4_wrongA_lumi: "confused",
        m1_q4_wrongB_lumi: "sick",
        m1_q4_correct_lumi: "happy",
        m1_end1: "happy",
        m1_end_recover: "recovered",
      },
    },
  },
  radar: {
    states: {
      p25: `${A}/device/radar_25.png`,
      p50: `${A}/device/radar_50.png`,
      p75: `${A}/device/radar_75.png`,
      p100: `${A}/device/radar_100.png`,
      active: `${A}/device/radar_active.png`,
    },
    initial: "p100",
    byNode: {
      m1_intro: "p100",
      m1_lumi_intro: "p25",
      m1_q2_prompt: "p50",
      m1_q3_prompt: "p75",
      m1_q4_correct_lumi: "p100",
      m1_end_recover: "active",
    },
  },
  badgeColors: ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"],
  choiceIcons: {
    "나를 싫어하게 된 것 같아": { emoji: "💔", bg: "#f3e8ff" },
    "무슨 힘든 일이 있는 것 같아": { emoji: "🌧️", bg: "#e0f2fe" },
    "그냥 혼자 있고 싶은가 봐": { emoji: "🧍", bg: "#eef2f7" },
    "왜그래?": { emoji: "❓", bg: "#fef3c7" },
    "무슨 일 있어?": { emoji: "💬", bg: "#dcfce7" },
    "나랑 놀기 싫어?": { emoji: "🙅", bg: "#fee2e2" },
    따듯함: { emoji: "🤗", bg: "#ffedd5" },
    불안함: { emoji: "😰", bg: "#e0f2fe" },
    지침: { emoji: "😩", bg: "#eef2f7" },
    짜증남: { emoji: "😤", bg: "#fee2e2" },
    안도: { emoji: "😌", bg: "#dcfce7" },
    "감기 정도는 참아": { emoji: "😣", bg: "#ede9fe" },
    "그래도 나랑 놀자": { emoji: "😐", bg: "#dbeafe" },
    "많이 힘들었겠구나": { emoji: "🙂", bg: "#dcfce7" },
  },
  fx: {
    fx_ending_1: "sparkle",
    fx_signal_recover: "signalRecover",
    fx_ending_2: "empathyCard",
    fx_light_return: "lightReturn",
  },
  // 반응 노드 진입 시 감정 피드백음(정답 차임 / 부드러운 오답음). 다른 일회성 소리
  // (tap/pop/select/stage/title/fx)는 뷰에서 해당 순간에 직접 재생한다.
  sfx: {
    byNode: {
      m1_q2_wrongA: "wrong",
      m1_q2_wrongC: "wrong",
      m1_q2_correct: "correct",
      m1_q4_wrongA_lumi: "wrong",
      m1_q4_wrongB_lumi: "wrong",
      m1_q4_correct_lumi: "correct",
    },
  },
};

// ---------- Mission 2: 얼어붙은 공감 거울 깨우기 (라라 → 솔라 2파트) ----------
const LALA_SPRITES: SpriteSet = {
  char: {
    anxious: `${A}/char/Lala/lala_anxious.png`,
    thinking: `${A}/char/Lala/lala_thinking.png`,
    smiling: `${A}/char/Lala/lala_smiling.png`,
    happy: `${A}/char/Lala/lala_happy.png`,
  },
  initial: "anxious",
  byNode: {
    m2_lala_intro: "anxious",
    m2_q2_wrongA_lala: "thinking",
    m2_q2_wrongB_lala: "thinking",
    m2_q2_correct_lala: "smiling",
  },
};

const SOLA_SPRITES: SpriteSet = {
  char: {
    sad: `${A}/char/Sola/sola_sad.png`,
    sad2: `${A}/char/Sola/sola_sad2.png`,
    serious: `${A}/char/Sola/sola_serious.png`,
    thankful: `${A}/char/Sola/sola_thankful.png`,
  },
  initial: "sad",
  byNode: {
    m2_sola_intro: "sad",
    m2_q4_wrongA_sola: "sad2",
    m2_q4_wrongB_sola: "sad",
    m2_q4_correct_sola: "thankful",
    m2_end1: "thankful", // 엔딩: 공감 거울 회복 후광과 함께 밝은 표정 유지
  },
};

export const MISSION02_THEME: MissionTheme = {
  speakers: {
    hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` },
    lala: { name: "라라" },
    sola: { name: "솔라" },
  },
  banner: {
    pill: "미션 2",
    title: "얼어붙은 공감 거울 깨우기",
    ribbon: "친구들의 마음을 이해해 거울을 깨워라!",
  },
  bannerNode: "m2_intro",
  initialFriend: "lala",
  bg: {
    states: {
      stage2: `${A}/bg/light-planet-stage2-bg.png`,
      stage3: `${A}/bg/light-planet-stage3.png`,
    },
    initial: "stage2",
    byNode: { m2_intro: "stage2", m2_end3: "stage3" },
  },
  hatiSprites: {
    char: HATI_CHAR,
    initial: "thinking",
    byNode: {
      m2_intro: "explaining",
      m2_q1_prompt: "thinking",
      m2_q1_wrong_angry: "worried",
      m2_q1_wrong_upset: "worried",
      m2_q1_retry: "suggesting",
      m2_q1_correct: "explaining",
      m2_q2_prompt: "thinking",
      m2_q2_wrongA_hati: "worried",
      m2_q2_wrongB_hati: "worried",
      m2_q2_retry: "suggesting",
      m2_q2_correct_hati: "praising",
      m2_q3_prompt: "thinking",
      m2_q3_wrong_angry: "worried",
      m2_q3_wrong_disappoint: "worried",
      m2_q3_retry: "suggesting",
      m2_q3_correct: "explaining",
      m2_q4_prompt: "suggesting",
      m2_q4_wrongA_hati: "worried",
      m2_q4_wrongB_hati: "worried",
      m2_q4_retry: "suggesting",
      m2_q4_correct_hati: "praising",
      m2_end1: "cheering",
      m2_end2: "proud",
      m2_end3: "celebrating",
    },
  },
  friends: { lala: LALA_SPRITES, sola: SOLA_SPRITES },
  radar: {
    states: {
      p25: `${A}/device/radar_25.png`,
      p50: `${A}/device/radar_50.png`,
      p75: `${A}/device/radar_75.png`,
      p100: `${A}/device/radar_100.png`,
      active: `${A}/device/radar_active.png`,
    },
    initial: "p100",
    byNode: {
      m2_intro: "p100",
      m2_lala_intro: "p25",
      m2_q2_prompt: "p50",
      m2_q2_correct_hati: "p75",
      m2_sola_intro: "p50",
      m2_q3_correct: "p75",
      m2_q4_correct_sola: "p100",
      m2_end1: "active",
    },
  },
  badgeColors: ["#7c3aed", "#2563eb", "#16a34a", "#e11d48", "#0ea5a3"],
  choiceIcons: {
    걱정됨: { emoji: "😟", bg: "#e0f2fe" },
    실망함: { emoji: "😞", bg: "#eef2f7" },
    화남: { emoji: "😠", bg: "#fee2e2" },
    속상함: { emoji: "😢", bg: "#e0f2fe" },
    "같이 화해할 방법을 생각해보자": { emoji: "🤝", bg: "#ede9fe" },
    "금방 다시 친해질 거야": { emoji: "🌈", bg: "#dbeafe" },
    "많이 걱정됐겠다": { emoji: "💗", bg: "#dcfce7" },
    "왜 그렇게 소중했는지 이야기를 들어준다": { emoji: "👂", bg: "#ede9fe" },
    "장난감을 고칠 방법을 찾아본다": { emoji: "🔧", bg: "#dbeafe" },
    "옆에 가서 함께 있어 준다": { emoji: "🫂", bg: "#dcfce7" },
  },
  // 엔딩 연출(mission1과 동일 구성): 공감 거울 회복 후광 → 공감 카드 → 빛 복귀+"다음 미션으로" 버튼.
  fx: {
    fx_mirror_wake: "signalRecover",
    fx_empathy_card: "empathyCard",
    fx_light_return: "lightReturn",
  },
  sfx: {
    byNode: {
      m2_q1_wrong_angry: "wrong",
      m2_q1_wrong_upset: "wrong",
      m2_q1_correct: "correct",
      m2_q2_wrongA_hati: "wrong",
      m2_q2_wrongB_hati: "wrong",
      m2_q2_correct_hati: "correct",
      m2_q3_wrong_angry: "wrong",
      m2_q3_wrong_disappoint: "wrong",
      m2_q3_correct: "correct",
      m2_q4_wrongA_hati: "wrong",
      m2_q4_wrongB_hati: "wrong",
      m2_q4_correct_hati: "correct",
    },
  },
};
