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

const A = "/assets";

export const MISSION01_THEME: MissionTheme = {
  speakers: { hati: { name: "하티", avatar: `${A}/char/Hati/hati_thinking.png` }, lumi: { name: "루미" } },
  bannerNode: "m1_intro",
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
    char: {
      thinking: `${A}/char/Hati/hati_thinking.png`,
      explaining: `${A}/char/Hati/hati_explaining.png`,
      suggesting: `${A}/char/Hati/hati_suggesting.png`,
      worried: `${A}/char/Hati/hati_worried.png`,
      praising: `${A}/char/Hati/hati_praising.png`,
      cheering: `${A}/char/Hati/hati_cheering.png`,
      proud: `${A}/char/Hati/hati_proud.png`,
      celebrating: `${A}/char/Hati/hati_celebrating.png`,
    },
    initial: "thinking",
    byNode: {
      m1_intro: "explaining", m1_q1_prompt: "thinking", m1_q1_react: "thinking",
      m1_q2_prompt: "thinking", m1_q2_wrongA: "worried", m1_q2_wrongC: "worried",
      m1_q2_retry: "suggesting", m1_q2_correct: "explaining", m1_q3_prompt: "suggesting",
      m1_q4_prompt: "thinking", m1_q4_retry: "suggesting", m1_end1: "praising",
      m1_end_recover: "cheering", m1_end2: "proud", m1_end3: "celebrating",
    },
  },
  lumiSprites: {
    char: {
      sad: `${A}/char/Lumi/lumi_sad.png`, confused: `${A}/char/Lumi/lumi_confused.png`,
      sick: `${A}/char/Lumi/lumi_sick.png`, happy: `${A}/char/Lumi/lumi_happy.png`,
      recovered: `${A}/char/Lumi/lumi_recovered.png`,
    },
    initial: "sad",
    byNode: {
      m1_lumi_intro: "sad", m1_lumi_answer: "sick", m1_q4_wrongA_lumi: "confused",
      m1_q4_wrongB_lumi: "sick", m1_q4_correct_lumi: "happy", m1_end1: "happy",
      m1_end_recover: "recovered",
    },
  },
  radar: {
    states: {
      p25: `${A}/device/radar_25.png`, p50: `${A}/device/radar_50.png`,
      p75: `${A}/device/radar_75.png`, p100: `${A}/device/radar_100.png`,
      active: `${A}/device/radar_active.png`,
    },
    initial: "p100",
    byNode: {
      m1_intro: "p100", m1_lumi_intro: "p25", m1_q2_prompt: "p50",
      m1_q3_prompt: "p75", m1_q4_correct_lumi: "p100", m1_end_recover: "active",
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
    "따듯함": { emoji: "🤗", bg: "#ffedd5" }, "불안함": { emoji: "😰", bg: "#e0f2fe" },
    "지침": { emoji: "😩", bg: "#eef2f7" }, "짜증남": { emoji: "😤", bg: "#fee2e2" },
    "안도": { emoji: "😌", bg: "#dcfce7" },
    "감기 정도는 참아": { emoji: "😣", bg: "#ede9fe" },
    "그래도 나랑 놀자": { emoji: "😐", bg: "#dbeafe" },
    "많이 힘들었겠구나": { emoji: "🙂", bg: "#dcfce7" },
  },
  fx: {
    fx_ending_1: "sparkle", fx_signal_recover: "signalRecover",
    fx_ending_2: "empathyCard", fx_light_return: "lightReturn",
  },
  // 반응 노드 진입 시 감정 피드백음(정답 차임 / 부드러운 오답음). 다른 일회성 소리
  // (tap/pop/select/stage/title/fx)는 뷰에서 해당 순간에 직접 재생한다.
  sfx: {
    byNode: {
      m1_q2_wrongA: "wrong", m1_q2_wrongC: "wrong", m1_q2_correct: "correct",
      m1_q4_wrongA_lumi: "wrong", m1_q4_wrongB_lumi: "wrong", m1_q4_correct_lumi: "correct",
    },
  },
};
