import { useEffect, useState } from "react";
import { commentFor } from "./home.logic";
import bubbleUrl from "../../assets/auth/PanelBackground01.png";

const HATI_SRC = "/assets/char/Hati/hati_default.png";

interface HatiHelperProps {
  progress: number;
}

export default function HatiHelper({ progress }: HatiHelperProps) {
  const full = commentFor(progress);
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
      <img className="home-hati__robot" src={HATI_SRC} alt="하티" />
      <div
        className="home-hati__bubble"
        style={{ borderImage: `url(${bubbleUrl}) 44 fill / 28px / 0 stretch` }}
      >
        <p className="home-hati__text">{full.slice(0, count)}</p>
      </div>
    </div>
  );
}
