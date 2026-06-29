import plateUrl from "../../assets/home/HeartScorePlate.png";
import heartFull from "../../assets/home/HeartFull.png";
import heartEmpty from "../../assets/home/HeartEmpty.png";

interface EnergyGaugeProps {
  progress: number;
}

export default function EnergyGauge({ progress }: EnergyGaugeProps) {
  const percent = Math.max(0, Math.min(4, progress)) * 25;
  return (
    <div className="home-energy" style={{ backgroundImage: `url(${plateUrl})` }}>
      <span className="home-energy__label">공감 에너지</span>
      <div className="home-energy__hearts">
        {[0, 1, 2, 3].map((i) => (
          <img key={i} src={i < progress ? heartFull : heartEmpty} alt="" className="home-energy__heart" />
        ))}
        <span className="home-energy__percent">{percent}%</span>
      </div>
      <div className="home-energy__bar">
        <div className="home-energy__bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
