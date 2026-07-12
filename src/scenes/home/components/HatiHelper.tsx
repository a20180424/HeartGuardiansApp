import { useEffect, useState } from "react";
import { commentFor } from "../home.logic";
import bubbleUrl from "../../../shared/assets/PanelBackground01.png";

const HATI_SRC = "/assets/char/Hati/hati_default.png";
// progress 0일 때는 마음 신호 탐색기를 들고 있는 하티를 보여준다.
const HATI_SRC_START = "/assets/char/Hati/hati_signal_detector.png";

interface HatiHelperProps {
  progress: number;
}

export default function HatiHelper({ progress }: HatiHelperProps) {
  const full = commentFor(progress);
  const hatiSrc = progress === 0 ? HATI_SRC_START : HATI_SRC;
  const [count, setCount] = useState(0);

  // progress가 바뀌면 타이핑을 처음부터 다시 시작한다.
  useEffect(() => {
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= full.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 45);
    return () => clearInterval(id);
  }, [full]);

  return (
    <div className="home-hati">
      <img className="home-hati__robot" src={hatiSrc} alt="하티" />
      <div
        className="home-hati__bubble"
        style={{ borderImage: `url(${bubbleUrl}) 44 fill / 28px / 0 stretch` }}
      >
        {/* 전체 문장으로 말풍선 크기를 미리 확정(안 보임) → 타이핑 중 크기 변화 없음 */}
        <p className="home-hati__text home-hati__text--ghost" aria-hidden="true">{full}</p>
        {/* 실제 타이핑 텍스트는 고스트 위에 겹쳐 표시 */}
        <p className="home-hati__text home-hati__text--typed">{full.slice(0, count)}</p>
      </div>
    </div>
  );
}
