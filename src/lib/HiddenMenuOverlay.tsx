import { useCallback, useState } from "react";
import { useCornerLongPress } from "./useCornerLongPress";
import { isMenuAvailable, isUnlocked, unlock } from "./hiddenMenu";
import "./hidden-menu.css";

// 교사 시연용 히든 점프 메뉴. 앱 루트(무대 바깥)에 마운트되는 전역 오버레이다.
// 진입: 좌상단 두 손가락 2초 롱프레스(또는 개발용 Ctrl+Shift+J) → PIN → 그리드.

type Phase = "closed" | "pin" | "grid";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function HiddenMenu() {
  const [phase, setPhase] = useState<Phase>("closed");
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const open = useCallback(() => {
    if (!isMenuAvailable()) return; // PIN 미설정 프로덕션 빌드 — fail closed
    setEntry("");
    setWrong(false);
    // DEV에서는 PIN을 건너뛴다. devJump 게이트도 어차피 DEV면 열려 있다.
    setPhase(import.meta.env.DEV || isUnlocked() ? "grid" : "pin");
  }, []);

  useCornerLongPress(open);

  const close = () => setPhase("closed");

  // 4자리가 차면 즉시 판정한다 — 확인 버튼을 따로 두지 않는다.
  // press()는 버튼 탭(사용자 이벤트)에만 반응하므로 클로저의 entry를 읽어도 안전하다 —
  // state updater 안에서 unlock()/setPhase() 같은 부수효과를 실행하지 않기 위해 판정을 밖으로 뺐다.
  const press = (k: string) => {
    setWrong(false);
    if (k === "clear") return setEntry("");
    if (k === "back") return setEntry((s) => s.slice(0, -1));
    const next = (entry + k).slice(0, 4);
    if (next.length === 4) {
      setEntry("");
      if (unlock(next)) {
        setPhase("grid");
      } else {
        setWrong(true);
      }
      return;
    }
    setEntry(next);
  };

  if (phase === "closed") return null;

  return (
    <div className="hidden-menu" role="dialog" aria-label="교사용 점프 메뉴">
      <div className="hidden-menu__panel">
        <div className="hidden-menu__head">
          <strong>교사용 점프 메뉴</strong>
          <button type="button" className="hidden-menu__close" onClick={close} aria-label="닫기">
            ✕
          </button>
        </div>

        {phase === "pin" ? (
          <div className="hidden-menu__pin">
            <div className="hidden-menu__dots" aria-label={`${entry.length}자리 입력됨`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < entry.length ? "on" : ""} />
              ))}
            </div>
            {wrong && <p className="hidden-menu__wrong">PIN이 맞지 않습니다</p>}
            <div className="hidden-menu__keys">
              {KEYS.map((k) => (
                <button type="button" key={k} onClick={() => press(k)}>
                  {k === "clear" ? "지움" : k === "back" ? "←" : k}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p>그리드 자리 (Task 6)</p>
        )}
      </div>
    </div>
  );
}
