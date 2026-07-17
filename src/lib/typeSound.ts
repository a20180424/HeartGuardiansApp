/* 말풍선 타자기 blip 의 "언제 울릴지" 순수 로직.
 *
 * MissionPlayer 의 typeInto 는 30ms 마다 한 글자씩 찍는다 = 초당 33회.
 * 매 글자마다 소리를 내면 서로 겹쳐 톱질 소음이 되므로 세 글자마다 한 번만 울린다.
 * 공백·문장부호를 세지 않고 건너뛰면 말의 리듬에 가까워진다. */

export type Speaker = "hati" | "friend";

const BLIP_EVERY = 3;
const SILENT_CHAR = /[\s.,!?…·'"“”‘’\-—~()[\]{}:;]/;

export function isSpeakingChar(ch: string): boolean {
  return !SILENT_CHAR.test(ch);
}

/** text[index] 를 찍는 순간 blip 을 울릴지. 말하는 글자만 세어 BLIP_EVERY 번째마다 true.
 * 공백·문장부호(쉼)를 만나면 카운터를 리셋한다 — 쉼 뒤 첫 글자는 늘 울려서
 * 말의 시작이 들리게 한다(리듬이 끊기지 않도록). */
export function blipAt(text: string, index: number): boolean {
  const ch = text[index];
  if (ch === undefined || !isSpeakingChar(ch)) return false;
  // 대사가 짧아(수십 자) 매 글자 세도 비용이 무시할 수준이다.
  let n = 0;
  for (let i = 0; i <= index; i++) {
    if (isSpeakingChar(text[i])) n++;
    else n = 0;
  }
  return n % BLIP_EVERY === 1; // 1,4,7… → 첫 글자·쉼 뒤 첫 글자에서 바로 울린다
}

export function blipSound(speaker: Speaker): "blipHati" | "blipFriend" {
  return speaker === "hati" ? "blipHati" : "blipFriend";
}
