import type { PlanetStatus } from "./home.logic";
import { PLANET_NAMES } from "./home.data";
import lockUrl from "../../assets/home/Lock.png";
import rocketUrl from "../../assets/home/RocketButton.png";
import starUrl from "../../assets/home/PurposeStart.png";
import a1h from "../../assets/home/Alien01_Happy.png";
import a1s from "../../assets/home/Alien01_Sad.png";
import a2h from "../../assets/home/Alien02_Happy.png";
import a2s from "../../assets/home/Alien02_Sad.png";
import a3h from "../../assets/home/Alien03_Happy.png";
import a3s from "../../assets/home/Alien03_Sad.png";
import a4h from "../../assets/home/Alien04_Happy.png";
import a4s from "../../assets/home/Alien04_Sad.png";

const ART: Record<number, { happy: string; sad: string }> = {
  1: { happy: a1h, sad: a1s },
  2: { happy: a2h, sad: a2s },
  3: { happy: a3h, sad: a3s },
  4: { happy: a4h, sad: a4s },
};

interface PlanetButtonProps {
  id: 1 | 2 | 3 | 4;
  status: PlanetStatus;
  onPlay: (id: number) => void;
}

export default function PlanetButton({ id, status, onPlay }: PlanetButtonProps) {
  const art = ART[id];
  const img = status === "completed" ? art.happy : art.sad;
  const playable = status === "unlocked";
  return (
    <button
      type="button"
      className={`home-planet home-planet--${status}`}
      disabled={!playable}
      onClick={() => playable && onPlay(id)}
      aria-label={PLANET_NAMES[id - 1]}
    >
      {status === "unlocked" && (
        <span className="home-planet__rocket" style={{ backgroundImage: `url(${rocketUrl})` }}>
          탐험 시작!
        </span>
      )}
      {status === "completed" && <img className="home-planet__star" src={starUrl} alt="" />}
      {status === "locked" && <img className="home-planet__lock" src={lockUrl} alt="잠김" />}
      <img className="home-planet__char" src={img} alt="" />
    </button>
  );
}
