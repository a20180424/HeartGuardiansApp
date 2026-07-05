// 공감 레이더 미니게임 콘텐츠. 3스테이지 × 3감정 × 2단어 = 18단어, 부품 9개.
// partId(1..9)는 좌측 조립기 3×3 슬롯 번호와 1:1 대응(1행=S1, 2행=S2, 3행=S3).

export interface Word {
  id: string;
  text: string;
  emoji: string;
  emotionId: string;
}

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string; // 감정 상자 강조색
  partId: number; // 조립기 슬롯 번호 1..9
  words: Word[];
}

export interface Stage {
  id: number;
  title: string;
  emotions: Emotion[];
}

export const STAGES: Stage[] = [
  {
    id: 1,
    title: "기초 감정",
    emotions: [
      {
        id: "joy", name: "기쁨", emoji: "🟡", color: "#f4c430", partId: 1,
        words: [
          { id: "joy-1", text: "신나다", emoji: "🎵", emotionId: "joy" },
          { id: "joy-2", text: "행복하다", emoji: "✨", emotionId: "joy" },
        ],
      },
      {
        id: "sad", name: "슬픔", emoji: "🔵", color: "#4aa3e0", partId: 2,
        words: [
          { id: "sad-1", text: "울적하다", emoji: "🌧️", emotionId: "sad" },
          { id: "sad-2", text: "우울하다", emoji: "🌫️", emotionId: "sad" },
        ],
      },
      {
        id: "anger", name: "분노", emoji: "🔴", color: "#e05a4a", partId: 3,
        words: [
          { id: "anger-1", text: "화나다", emoji: "🔥", emotionId: "anger" },
          { id: "anger-2", text: "짜증나다", emoji: "⚡", emotionId: "anger" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "사회적 감정",
    emotions: [
      {
        id: "fear", name: "두려움", emoji: "🟣", color: "#9b6fd4", partId: 4,
        words: [
          { id: "fear-1", text: "무섭다", emoji: "👻", emotionId: "fear" },
          { id: "fear-2", text: "불안하다", emoji: "😰", emotionId: "fear" },
        ],
      },
      {
        id: "gratitude", name: "감사", emoji: "🟢", color: "#4bbf87", partId: 5,
        words: [
          { id: "gratitude-1", text: "고맙다", emoji: "🎁", emotionId: "gratitude" },
          { id: "gratitude-2", text: "감사하다", emoji: "🙏", emotionId: "gratitude" },
        ],
      },
      {
        id: "shame", name: "창피함", emoji: "💗", color: "#e97fb0", partId: 6,
        words: [
          { id: "shame-1", text: "민망하다", emoji: "😅", emotionId: "shame" },
          { id: "shame-2", text: "부끄럽다", emoji: "😳", emotionId: "shame" },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "복합 감정",
    emotions: [
      {
        id: "calm", name: "평온", emoji: "🟢", color: "#3fc9b0", partId: 7,
        words: [
          { id: "calm-1", text: "차분하다", emoji: "🧘", emotionId: "calm" },
          { id: "calm-2", text: "느긋하다", emoji: "🛋️", emotionId: "calm" },
        ],
      },
      {
        id: "envy", name: "샘나기", emoji: "🟠", color: "#f0913f", partId: 8,
        words: [
          { id: "envy-1", text: "부럽다", emoji: "🙄", emotionId: "envy" },
          { id: "envy-2", text: "시샘하다", emoji: "😈", emotionId: "envy" },
        ],
      },
      {
        id: "flutter", name: "설레임", emoji: "🔵", color: "#6f7fe0", partId: 9,
        words: [
          { id: "flutter-1", text: "기다려지다", emoji: "⏱️", emotionId: "flutter" },
          { id: "flutter-2", text: "두근거리다", emoji: "💓", emotionId: "flutter" },
        ],
      },
    ],
  },
];

// 스테이지의 6단어를 감정 순서대로 평탄화.
export function stageWords(stage: Stage): Word[] {
  return stage.emotions.flatMap((e) => e.words);
}

// 감정 id로 Emotion 조회. 데이터 무결성상 항상 존재해야 하므로 없으면 throw.
export function findEmotion(emotionId: string, stages: Stage[] = STAGES): Emotion {
  for (const stage of stages) {
    for (const e of stage.emotions) {
      if (e.id === emotionId) return e;
    }
  }
  throw new Error(`unknown emotionId: ${emotionId}`);
}
