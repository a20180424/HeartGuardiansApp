// 콘텐츠는 emotionGuide.content.json 에서 관리하고, 여기서 타입을 입혀 재노출한다.
import content from "./emotionGuide.content.json";

export interface Situation {
  id: number;
  title: string;
  desc: string;
}

export interface Emotion {
  id: string;
  name: string;
  emoji: string;
}

export interface CopingAction {
  id: number;
  text: string;
  emoji: string;
}

export interface EmotionCoping {
  actions: CopingAction[];
  feedbacks: Record<number, string>;
}

// 서버로 전송할 답변 1건. 텍스트가 아니라 id만 담는다.
export interface EmotionGuideResult {
  situationId: number; // 상황 id
  emotionId: string; // 감정 키(예: "joy")
  actionId: number; // 행동 id(1~6)
}

export const SITUATIONS = content.situations as Situation[];
export const EMOTIONS = content.emotions as Emotion[];
// JSON의 feedbacks 키는 문자열("1"..)이지만 런타임 접근은 숫자 인덱스로도 동작한다.
export const COPING_ACTIONS = content.copingActions as unknown as Record<string, EmotionCoping>;
