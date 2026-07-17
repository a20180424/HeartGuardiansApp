import { useState } from "react";
import { audio } from "./audio";
import "./mute-button.css";

// 전역 음소거 토글. HiddenMenu 와 같은 자리(<Routes> 바깥)에 살아 어느 씬에서도 뜬다.
// FixedStage 안이 아니라 App 레벨이므로 미션(player/, 자체 무대)에서도 동작한다.
//
// 좌상단에 두지 않는다 — useCornerLongPress 의 히든 메뉴 진입 제스처가 좌상단
// 200×200 을 쓴다. 교사용 히든 제스처 자리에 아이가 반복해 누르는 버튼을 겹치지 않는다.
//
// data-sfx="none": 음소거를 켜는 순간 tap 이 나면 앞뒤가 안 맞는다.
export default function MuteButton() {
  const [muted, setMuted] = useState(() => audio.muted);
  return (
    <button
      type="button"
      className="mute-btn"
      data-sfx="none"
      onClick={() => setMuted(audio.toggleMute())}
      aria-label={muted ? "소리 켜기" : "소리 끄기"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
