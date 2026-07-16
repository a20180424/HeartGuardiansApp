import { useCallback, useState } from "react";
import { useCornerLongPress } from "./useCornerLongPress";
import { isMenuAvailable, isUnlocked } from "./hiddenMenu";
import "./hidden-menu.css";

// 교사 시연용 히든 점프 메뉴. 앱 루트(무대 바깥)에 마운트되는 전역 오버레이다.
// 진입: 좌상단 두 손가락 2초 롱프레스(또는 개발용 Ctrl+Shift+J) → PIN → 그리드.

type Phase = "closed" | "pin" | "grid";

export default function HiddenMenu() {
  const [phase, setPhase] = useState<Phase>("closed");

  const open = useCallback(() => {
    if (!isMenuAvailable()) return; // PIN 미설정 프로덕션 빌드 — fail closed
    // DEV에서는 PIN을 건너뛴다. devJump 게이트도 어차피 DEV면 열려 있다.
    setPhase(import.meta.env.DEV || isUnlocked() ? "grid" : "pin");
  }, []);

  useCornerLongPress(open);

  if (phase === "closed") return null;

  return (
    <div className="hidden-menu" role="dialog" aria-label="교사용 점프 메뉴">
      <div className="hidden-menu__panel">
        <div className="hidden-menu__head">
          <strong>교사용 점프 메뉴</strong>
          <button
            type="button"
            className="hidden-menu__close"
            onClick={() => setPhase("closed")}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        {phase === "pin" ? <p>PIN 패드 자리 (Task 5)</p> : <p>그리드 자리 (Task 6)</p>}
      </div>
    </div>
  );
}
