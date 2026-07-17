/* 버튼 효과음을 data-sfx 속성으로 선언한다.
 *
 *   <button>              → tap  (기본)
 *   <button data-sfx="pop">  → pop  (팝업 열기)
 *   <button data-sfx="none"> → 무음 (씬 전환음이 이미 울리는 버튼)
 *
 * App 의 리스너 하나가 이 속성을 읽는다. 버튼이 있는 컴포넌트를 각각 고치는 대신
 * 예외인 곳에만 속성을 붙인다. */

export type UiSfx = "tap" | "pop" | null;

export function sfxNameFor(dataSfx: string | undefined): UiSfx {
  if (dataSfx === "none") return null;
  if (dataSfx === "pop") return "pop";
  return "tap"; // 오타가 무음으로 새지 않게 기본으로 떨어뜨린다
}
