// 미션1 "가디언즈 최종 점검하기" 미니게임 데이터.
// 원본: mytemp/그림자행성 미션1 게임/index.html 의 tools 배열을 그대로 이식.
// 5개 공감 도구 × 각 1~4개 점검 문항(총 11문항). O/X 정답은 없고 자기 점검용.

const ASSET = "/assets/planet4";

export type EmpathyTool = {
  name: string; // 도구 이름
  key: string; // 핵심 공감 능력 키워드
  img: string; // 좌측 스텝/보상에 쓰는 도구 이미지
  items: string[]; // 점검 문항들
};

export const TOOLS: EmpathyTool[] = [
  {
    name: "마음 신호 탐색기",
    key: "관심",
    img: `${ASSET}/tool-signal-detector.png`,
    items: ["친구에게 평소 관심을 가지고 살펴봅니다."],
  },
  {
    name: "공감 거울",
    key: "이해",
    img: `${ASSET}/tool-empathy-mirror.png`,
    items: [
      "내 마음보다 친구의 마음을 먼저 이해하려고 노력합니다.",
      "같은 상황에서도 사람마다 느끼는 감정이 다를 수 있음을 이해합니다.",
    ],
  },
  {
    name: "공감 레이더",
    key: "관찰",
    img: `${ASSET}/tool-empathy-radar.png`,
    items: [
      "친구가 처한 상황, 표정, 행동을 자세히 살펴봅니다.",
      "한 가지 모습만 보고 감정을 결정하지 않습니다.",
    ],
  },
  {
    name: "공감 송신기",
    key: "표현",
    img: `${ASSET}/tool-empathy-transmitter.png`,
    items: [
      "친구와 눈을 마주치고 친구의 말에 귀를 기울여 듣습니다.",
      "친구의 말을 들을 때 고개를 끄덕이거나 친구와 같은 표정을 지어 줍니다.",
      "친구의 감정을 읽고 “그랬구나.”와 같은 말로 표현해 줍니다.",
      "내 감정을 친구에게 강요하지 않고 친구의 감정을 존중합니다.",
    ],
  },
  {
    name: "공감 나침반",
    key: "실천",
    img: `${ASSET}/tool-empathy-compass.png`,
    items: [
      "도움이 필요한 친구에게 용기를 내어 먼저 다가갑니다.",
      "공감은 완벽하게 잘하는 것이 아니라, 계속 실천하려고 노력하는 것임을 알고 있습니다.",
    ],
  },
];

export const HATI_DEFAULT = `${ASSET}/hati-default.png`;
export const HATI_CLAP = `${ASSET}/hati-clap.png`;
export const PLEDGE_SHEET = `${ASSET}/guardians-pledge.png`;
export const COMPASS_IMG = `${ASSET}/tool-empathy-compass.png`;
