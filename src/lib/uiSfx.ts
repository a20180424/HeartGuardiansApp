/* 버튼 효과음을 data-sfx 속성으로 선언한다.
 *
 *   <button>                 → tap  (기본)
 *   <button data-sfx="pop">  → pop  (팝업 열기)
 *   <button data-sfx="none"> → 무음
 *
 * App 의 리스너 하나가 이 속성을 읽는다. 버튼이 있는 컴포넌트를 각각 고치는 대신
 * 예외인 곳에만 속성을 붙인다.
 *
 * "none" 을 쓰는 곳은 지금 셋뿐이고 이유가 각각 다르다:
 *  · 음소거 버튼 — 음소거를 켜는 순간 tap 이 나면 앞뒤가 안 맞는다
 *  · 인트로/아웃트로의 화면 전체 탭 레이어 — 영상 보며 아무데나 누를 때마다 영화 위에
 *    비프음이 겹친다 (건너뛰기 버튼은 진짜 버튼이라 소리를 유지한다) */

export type UiSfx = "tap" | "pop" | null;

export function sfxNameFor(dataSfx: string | undefined): UiSfx {
  if (dataSfx === "none") return null;
  if (dataSfx === "pop") return "pop";
  return "tap"; // 오타가 무음으로 새지 않게 기본으로 떨어뜨린다
}
