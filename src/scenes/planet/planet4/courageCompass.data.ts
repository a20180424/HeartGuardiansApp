// 미션2 "공감 나침반 작전" 미니게임 데이터.
// 원본: mytemp/그림자행성 미션2 게임/index.html 의 stages 배열을 그대로 이식.
// 4개 스테이지 × 2개 시나리오 = 8개. 스테이지를 깨면 용기 조각을 하나 얻는다.

const ASSET = "/assets/planet4";

export type CourageScenario = {
  situation: string; // 친구의 상황 설명
  image: string; // 상황 이미지
  good: string; // 공감의 길 표지판 문구
  bad: string; // 그림자의 길 표지판 문구
  reply: string; // 공감의 길 선택 후 친구가 하는 말
  choices: [string, string]; // 친구의 말에 대한 2지선다
  answer: 0 | 1; // choices 의 정답 인덱스
};

export type CourageStage = {
  title: string; // 스테이지 이름 = 획득하는 용기 조각 이름
  learn: string; // 보상 화면에서 하티가 타자기로 찍어주는 교훈
  shard: string; // 용기 조각 이미지
  scenarios: [CourageScenario, CourageScenario];
};

export const STAGES: CourageStage[] = [
  {
    title: "다가갈 용기",
    learn: "친구의 마음은 이해해 주었지만 잘못된 행동까지 함께하지는 않았구나!",
    shard: `${ASSET}/courage-shard1.png`,
    scenarios: [
      {
        situation: "친구가 경기에서 져서 화가 났습니다.",
        image: `${ASSET}/situation-1-1.png`,
        good: "괜찮은지 조심스럽게 말을 건다.",
        bad: "괜히 어색하니까 그냥 지나간다.",
        reply: "“다음에는 반칙을 해서라도 이길 거야.”",
        choices: [
          "그래! 같이 반칙하자.",
          "많이 화가 났겠구나. 하지만 반칙은 모두에게 공평하지 않아.",
        ],
        answer: 1,
      },
      {
        situation: "친구가 놀림을 당해서 울고 있습니다.",
        image: `${ASSET}/situation-1-2.png`,
        good: "무슨 일인지 차분히 들어본다.",
        bad: "모른 척 지나간다.",
        reply: "“나도 더 심하게 놀릴 거야.”",
        choices: [
          "정말 속상했겠다. 하지만 같이 놀리면 더 큰 싸움이 될 수도 있어.",
          "그래! 같이 놀리자.",
        ],
        answer: 0,
      },
    ],
  },
  {
    title: "존중할 용기",
    learn: "친구가 원하는 방법을 존중해 주었구나!",
    shard: `${ASSET}/courage-shard2.png`,
    scenarios: [
      {
        situation: "친구가 쉬는 시간에 혼자 창밖을 바라보고 있습니다.",
        image: `${ASSET}/situation-2-1.png`,
        good: "친구 곁으로 가서 괜찮은지 물어본다.",
        bad: "“괜히 방해될 거야.” 하며 돌아선다.",
        reply: "“괜찮아. 조금만 혼자 있을게.”",
        choices: [
          "혼자 있고 싶은 마음이 있구나. 편해지면 언제든 이야기해 줘.",
          "혼자 있으면 더 힘들어. 같이 가자.",
        ],
        answer: 0,
      },
      {
        situation: "친구가 점심시간에 혼자서 앉아 밥을 먹고 있습니다.",
        image: `${ASSET}/situation-2-2.png`,
        good: "같이 있어도 괜찮은지 물어본다.",
        bad: "모른 척 다른 자리로 간다.",
        reply: "“오늘은 혼자 먹고 싶어.”",
        choices: [
          "같이 먹어야 덜 외롭잖아.",
          "오늘은 혼자 있고 싶은 마음이구나. 나중에 같이 이야기하자.",
        ],
        answer: 1,
      },
    ],
  },
  {
    title: "함께 해결할 용기",
    learn: "혼자 해결하기 어려울 때는 함께 도움을 요청하는 것도 용기란다.",
    shard: `${ASSET}/courage-shard3.png`,
    scenarios: [
      {
        situation: "친구가 계속 괴롭힘을 당하고 있습니다.",
        image: `${ASSET}/situation-3-1.png`,
        good: "친구에게 다가가 무슨 일이 있었는지 들어본다.",
        bad: "괜히 나까지 피해를 볼까 봐 지나간다.",
        reply: "“혼자 해결하기 어려워.”",
        choices: [
          "많이 힘들었겠구나. 우리 함께 믿을 수 있는 어른께 도움을 요청하자.",
          "조금만 더 참자.",
        ],
        answer: 0,
      },
      {
        situation: "친구가 물건을 잃어버려 울고 있습니다.",
        image: `${ASSET}/situation-3-2.png`,
        good: "친구의 이야기를 끝까지 들어준다.",
        bad: "그냥 다시 찾으라고 한다.",
        reply: "“어떻게 해야 할지 모르겠어.”",
        choices: [
          "혼자 한번 더 찾아봐.",
          "많이 당황했겠구나. 우리 같이 선생님께 말씀드리자.",
        ],
        answer: 1,
      },
    ],
  },
  {
    title: "나를 지킬 용기",
    learn: "친구를 아끼는 만큼 나의 마음도 소중하단다.",
    shard: `${ASSET}/courage-shard4.png`,
    scenarios: [
      {
        situation: "친구가 매일 고민을 이야기합니다.",
        image: `${ASSET}/situation-4-1.png`,
        good: "친구 이야기를 차분히 들어준다.",
        bad: "귀찮아서 피한다.",
        reply: "“앞으로도 계속 너만 내 이야기를 들어줘.”",
        choices: [
          "네 이야기를 들어주는 건 좋지만, 나도 잠시 쉬면서 함께 다른 방법을 찾아보자.",
          "알겠어. 계속 내가 다 들어줄게.",
        ],
        answer: 0,
      },
      {
        situation:
          "다른 친구와 다투고 화가 난 친구가 “나 쟤랑 이제 안 놀 거야!”라고 말합니다.",
        image: `${ASSET}/situation-4-2.png`,
        good: "친구의 이야기를 끝까지 들어준다.",
        bad: "“그만 좀 해.” 하며 자리를 떠난다.",
        reply: "“너도 쟤랑 놀면 안 돼! 너는 내 편이야, 그렇지?”",
        choices: [
          "많이 속상했겠구나. 그래도 나는 다른 친구와도 사이좋게 지내고 싶어.",
          "응! 나도 이제 그 친구랑 안 놀 거야.",
        ],
        answer: 0,
      },
    ],
  },
];

// 표지판 — 좌/우가 서로 다른 디자인이라 2세트. 뒷면(back)에서 앞면(front)으로 뒤집힌다.
export const SIGN_LEFT = { back: `${ASSET}/sign1-back.png`, front: `${ASSET}/sign1-front.png` };
export const SIGN_RIGHT = { back: `${ASSET}/sign2-back.png`, front: `${ASSET}/sign2-front.png` };

// 나침반 다이얼(compass-dial.png)은 CourageCompassStage.css 가 background url 로 직접 쓴다.

// 하티 — 원본은 harti.png / 기뻐하는 하티.png / 행복한 하티.png(합계 5.6MB)를 따로 썼지만
// 미션1이 이미 쓰는 planet4 스프라이트를 재사용한다(에셋 중복·APK 용량 절감).
export const HATI_DEFAULT = `${ASSET}/hati-default.png`;
export const HATI_HAPPY = `${ASSET}/hati-clap.png`;

// 바늘이 멈추는 각도 — 원본 index.html 의 --needle-end 값 그대로.
// 나침반이 정답(공감의 길) 쪽을 가리키며 멈춘다.
export const NEEDLE_END_LEFT = 1035; // 공감의 길이 왼쪽
export const NEEDLE_END_RIGHT = 1125; // 공감의 길이 오른쪽
