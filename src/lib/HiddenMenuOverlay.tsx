import { Fragment, useCallback, useState } from "react";
import { useCornerLongPress } from "./useCornerLongPress";
import { isMenuAvailable, isUnlocked, unlock } from "./hiddenMenu";
import { useFadeNav } from "./sceneTransition";
import "./hidden-menu.css";

// 교사 시연용 히든 점프 메뉴. 앱 루트(무대 바깥)에 마운트되는 전역 오버레이다.
// 진입: 좌상단 두 손가락 2초 롱프레스(또는 개발용 Ctrl+Alt+J) → PIN → 그리드.

type Phase = "closed" | "pin" | "grid";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

const PLANETS = [1, 2, 3, 4] as const;

// 네 행성 모두 같은 규칙이다. 행성3은 미션3이 독립 시나리오가 아니라 미션2
// 미니게임의 stage2지만, devJump의 mission3 → mission2 별칭이 흡수한다.
const COLUMNS: { label: string; query: string }[] = [
  { label: "미션1", query: "?m=1" },
  { label: "미션2", query: "?m=2" },
  { label: "미션3", query: "?m=3" },
  { label: "엔딩", query: "?m=3&end=1" },
];

export default function HiddenMenu() {
  const [phase, setPhase] = useState<Phase>("closed");
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const open = useCallback(() => {
    if (!isMenuAvailable()) {
      // PIN 미설정 빌드 — fail closed. 개발에서는 왜 아무 일도 안 일어나는지
      // 알려준다(조용한 무반응은 새로 클론한 개발자가 진단하기 어렵다).
      if (import.meta.env.DEV) {
        console.warn(
          "[hiddenMenu] VITE_HG_MENU_PIN 미설정 — .env.local 에 4자리 PIN을 넣어야 메뉴가 열린다",
        );
      }
      return;
    }
    setEntry("");
    setWrong(false);
    // 개발에서도 프로덕션과 같은 흐름을 탄다(DEV 우회 없음) — 교사가 볼 화면을
    // 개발 중에 그대로 확인하기 위해서다. 해제는 앱 실행당 1회라 두 번째부터는
    // 바로 그리드로 간다.
    setPhase(isUnlocked() ? "grid" : "pin");
  }, []);

  useCornerLongPress(open);

  const close = () => setPhase("closed");

  const fadeNav = useFadeNav();
  const go = (to: string) => {
    setPhase("closed");
    fadeNav(to);
  };

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
          <div className="hidden-menu__grid-wrap">
            <p className="hidden-menu__warn">
              ⚠️ 엔딩에서 "우주선으로 이동"을 누르면 진도가 자동 저장됩니다
            </p>
            <div className="hidden-menu__grid">
              <span />
              {COLUMNS.map((c) => (
                <span key={c.label} className="hidden-menu__col">
                  {c.label}
                </span>
              ))}
              {PLANETS.map((p) => (
                <Fragment key={p}>
                  <span className="hidden-menu__row">행성{p}</span>
                  {COLUMNS.map((c) => (
                    <button
                      type="button"
                      key={c.label}
                      onClick={() => go(`/planet/${p}${c.query}`)}
                    >
                      {c.label}
                    </button>
                  ))}
                </Fragment>
              ))}
            </div>
            <button type="button" className="hidden-menu__home" onClick={() => go("/home")}>
              홈으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
