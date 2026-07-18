// 행성4 미션3 "하트 커넥트 : 마지막 연결" 콘텐츠·타입·에셋 경로.
// 원본: mytemp/그림자 행성 미션3 게임/index.html (story[], missions[], postLines[], startFinalTyping).

const A4 = "/assets/planet4";

// 배경·이미지
export const BG_INTERIOR = `${A4}/heart-connect-interior-bg.png`;
export const IMG_DIAMOND = `${A4}/empathy-diamond.png`;
export const IMG_VIDEO = `${A4}/heart-connect-ending.mp4`;
export const IMG_SUCCESS_BG = `${A4}/success-bg.png`;
export const IMG_TITLE_BANNER = `${A4}/title-banner.png`;
export const IMG_SUCCESS_BANNER = `${A4}/mission-success-banner.png`;

// 하티 스프라이트
export const HATI_PONDERING = `${A4}/hati-pondering.png`;
export const HATI_PROPOSING = `${A4}/hati-proposing.png`;
export const HATI_DEFAULT = `${A4}/hati-default.png`;

// 후일담 배경(크로스페이드 순서: earth1→2→3 → school → classroom)
export const EPILOGUE_BG = {
  earth1: `${A4}/earth-1.png`,
  earth2: `${A4}/earth-2.png`,
  earth3: `${A4}/earth-3.png`,
  school: `${A4}/school.png`,
  classroom: `${A4}/classroom.png`,
};

// 스토리 인트로 3줄(원본 story[] + storyLine()의 하티 교체 순서).
export const STORY_LINES: { hati: string; text: string }[] = [
  { hati: HATI_PONDERING, text: "왜일까? 공감 원석도, 공감 에너지도 모두 완성되었는데…" },
  {
    hati: HATI_PROPOSING,
    text: "하트 커넥트를 복원하기 위해서는 다섯 공감 원석이 하나로 연결된 공감 다이아몬드가 필요해.",
  },
  {
    hati: HATI_DEFAULT,
    text: "누군가의 마음과 또 다른 마음이 연결될 때 비로소 다섯 원석이 깨어난단다.\n다섯 공감 원석을 모두 연결해 공감 다이아몬드를 완성하자.",
  },
];

// 5원석 퀴즈(원본 missions[]).
export const MISSIONS: {
  gem: string;
  image: string;
  text: string;
  options: string[];
  correct: number;
}[] = [
  {
    gem: "이해의 사파이어",
    image: `${A4}/gem-sapphire-understanding.png`,
    text: "친구가 발표를 앞두고 손을 떨고 있어. 어떤 마음인지 이해해 볼까?",
    options: ["발표가 싫은가 봐.", "많이 긴장되고 떨리겠구나.", "연습을 안 했나 봐."],
    correct: 1,
  },
  {
    gem: "관찰의 호박석",
    image: `${A4}/gem-amber-observation.png`,
    text: "쉬는 시간, 한 친구가 혼자 창밖만 보고 있어. 어떻게 말하는 것이 좋을까?",
    options: ["표정이 조금 어두워 보여. 무슨 일 있어?", "왜 혼자 있어?", "같이 놀기 싫은가 봐."],
    correct: 0,
  },
  {
    gem: "경청의 토파즈",
    image: `${A4}/gem-topaz-listening.png`,
    text: "친구가 속상한 일을 이야기하기 시작했어.",
    options: ["내 이야기도 들어 봐.", "그건 별일 아니야.", "응, 천천히 말해 줘. 내가 듣고 있어."],
    correct: 2,
  },
  {
    gem: "표현의 루비",
    image: `${A4}/gem-ruby-expression.png`,
    text: "열심히 준비했지만 결과가 좋지 않아 속상하다는 친구에게 어떻게 말할까?",
    options: ["많이 노력했는데 속상했겠다.", "다음엔 잘하면 되지.", "울지 마."],
    correct: 0,
  },
  {
    gem: "용기의 에메랄드",
    image: `${A4}/gem-emerald-courage.png`,
    text: "전학 온 친구에게 먼저 다가가고 싶지만 망설여져.",
    options: ["괜히 어색해질 거야.", "용기 내서 함께 인사해 보자.", "그냥 기다리면 돼."],
    correct: 1,
  },
];

// 후일담 6줄(원본 postLines[]). 마지막 줄은 '\n' 뒤가 강조 span.
export const POST_LINES: string[] = [
  "지금 연결된 원석들의 마음은.",
  "사실 우주에 있는 친구들만이 아니야.",
  "교실에서도…",
  "친구를 이해하려고 하는 작은 말 한마디가…",
  "또 하나의 공감 에너지를 만든단다.",
  "게임은 끝났지만, 하트 커넥트는 계속 연결되고 있어.\n교실에서 그 연결을 이어 가는 건 바로 너야.",
];

// 성공 화면 최종 타이핑 2줄(원본 startFinalTyping()).
export const FINAL_LINES: string[] = [
  "“공감 탐험은 끝난 것이 아니야.”",
  "“이제 지구, 그리고 우리 교실에서 계속 이어질 거야.”",
];
