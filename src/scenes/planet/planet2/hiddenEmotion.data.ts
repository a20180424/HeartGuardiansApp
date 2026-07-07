// 미션3 "숨은 감정 찾기" 콘텐츠. 원본: mytemp/안개행성_미션3_숨은감정찾기_게임/index2.html.
const ASSET = "/assets/planet2/hidden-emotion";

export interface Card {
  text: string;
  art: string;
}

export interface Mission {
  person: string;
  intro: string;
  answer: string;
  feedback: string; // 정답 후 하티의 교훈
  resultImage: string;
  resultFeedback: string; // 친구의 속마음 대사
  cards: Card[]; // 5장
  emotions: string[]; // 선택지 4개(정답 포함)
}

export const EMOTION_FACES: Record<string, string> = {
  "기쁨": "😄", "속상함": "😢", "아무렇지 않음": "😐", "신남": "🤩",
  "외로움": "☹️", "화남": "😡", "편안함": "🙂", "미안함": "🥺",
  "자랑스러움": "😌", "심심함": "😶",
};

export const MISSIONS: Mission[] = [
  {
    person: "아르지",
    intro: "공감 레이더를 사용하여 아르지의 숨겨진 감정을 찾아봐!",
    answer: "속상함",
    feedback:
      "겉으로는 웃는 얼굴만 보면 아르지가 기쁘다고 생각하기 쉬워. 하지만 행동과 상황을 함께 보면, 사실은 속상한 마음을 숨기고 있다는 걸 알 수 있어.",
    resultImage: `${ASSET}/arji-feeling.png`,
    resultFeedback:
      "기대했던 것보다 시험 결과가 좋지 못해서 속상했어. 하지만 친구들에게 나의 마음을 이야기하기가 싫었어. 내 마음을 알아줘서 고마워!",
    cards: [
      { text: "아르지는 기대하는 눈빛으로 시험 결과를 확인하고 있어요.", art: `${ASSET}/arji-card-1.png` },
      { text: "친구에게 시험을 잘 봤다고 얘기하고 있어요.", art: `${ASSET}/arji-card-2.png` },
      { text: "시험지를 금방 접었어요.", art: `${ASSET}/arji-card-3.png` },
      { text: "시험지를 가방 맨 밑에 넣었어요.", art: `${ASSET}/arji-card-4.png` },
      { text: "쉬는 시간 내내 창밖만 바라봤어요.", art: `${ASSET}/arji-card-5.png` },
    ],
    emotions: ["기쁨", "속상함", "아무렇지 않음", "신남"],
  },
  {
    person: "누비",
    intro: "생일파티 이야기를 듣는 누비를 살펴봐요.",
    answer: "외로움",
    feedback:
      "\"안 가도 돼”라는 말만 들으면 정말 괜찮은 줄 알 수 있어. 하지만 손을 만지작거리는 행동과, 혼자만 초대받지 못한 상황을 보면 서운하고 외로운 마음이 숨어있다는 걸 알 수 있어.",
    resultImage: `${ASSET}/nubi-feeling.png`,
    resultFeedback:
      "사실은... 다들 파티 얘기하니까 나만 쏙 빠진 것 같아서 조금 외로웠거든. 그런데 네가 내 마음 알아채고 먼저 말 걸어줘서 정말 고마워. 마음이 되게 편해졌어!",
    cards: [
      { text: "친구들이 생일파티 이야기를 하는 걸 들었어요.", art: `${ASSET}/nubi-card-1.png` },
      { text: "누비는 웃으며 이야기했어요.", art: `${ASSET}/nubi-card-2.png` },
      { text: "손가락으로 옷자락을 만지작거렸어요.", art: `${ASSET}/nubi-card-3.png` },
      { text: "친구들이 떠난 뒤에도 한참 그 자리에 있었어요.", art: `${ASSET}/nubi-card-4.png` },
      { text: "자신만 초대받지 못했다고 느끼고 있어요", art: `${ASSET}/nubi-card-5.png` },
    ],
    emotions: ["외로움", "신남", "화남", "편안함"],
  },
  {
    person: "미라",
    intro: "필통이 망가진 뒤 미라의 행동을 살펴봐요.",
    answer: "미안함",
    feedback:
      "겉으로는 화를 내는 모습만 보면 미라가 짜증난다고 생각하기 쉬워. 하지만 실수한 상황과 눈을 마주치지 못하는 행동을 함께 보면, 사실은 미안한 마음을 숨기고 있다는 걸 알 수 있어.",
    resultImage: `${ASSET}/mira-feeling.png`,
    resultFeedback:
      "내 마음을 알아줘서 고마워! 사실은 친구한테 너무 미안했는데, 친구가 나를 싫어하게 될까 봐 겁이 났어!",
    cards: [
      { text: "미라는 실수로 친구의 필통을 바닥에 떨궜어요.", art: `${ASSET}/mira-card-1.png` },
      { text: "필통이 부서져서 친구가 깜짝 놀랐어요.", art: `${ASSET}/mira-card-2.png` },
      { text: "미라는 큰소리로 화를 냈어요.", art: `${ASSET}/mira-card-3.png` },
      { text: "짝꿍과 눈을 마주치지 못하고 손을 꼼지락거렸어요.", art: `${ASSET}/mira-card-4.png` },
      { text: "부서진 필통을 보며 고개를 숙이고 아무말도 하지 않아요.", art: `${ASSET}/mira-card-5.png` },
    ],
    emotions: ["미안함", "기쁨", "자랑스러움", "심심함"],
  },
];
