import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { getSession } from "../lib/session";
import { planetState } from "./home/home.logic";
import ProfileCard from "./home/ProfileCard";
import EnergyGauge from "./home/EnergyGauge";
import Mothership from "./home/Mothership";
import PlanetButton from "./home/PlanetButton";
import MenuBar, { type MenuKey } from "./home/MenuBar";
import HatiHelper from "./home/HatiHelper";
import Modal from "../shared/components/Modal";
import bannerUrl from "../shared/assets/TitleBanner.png";
import goalPlate from "../assets/home/BannerPlate03.png";
import starUrl from "../assets/home/PurposeStart.png";
import plateMission from "../assets/home/plateMission.png";
import plateGem from "../assets/home/plateGem.png";
import plateInventory from "../assets/home/plateInventory.png";
import plateHistory from "../assets/home/plateHistory.png";
import "./Home.css";

type PopupKey = "goal" | MenuKey;

const MENU_PLATE: Record<MenuKey, string> = {
  mission: plateMission,
  gem: plateGem,
  inventory: plateInventory,
  history: plateHistory,
};

export default function Home() {
  const nav = useNavigate();
  const session = getSession();
  const [popup, setPopup] = useState<PopupKey | null>(null);

  // 세션이 없으면(새로고침/직접진입) 로그인부터.
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const { profile, progress } = session;
  const popupPlate: string =
    popup && popup !== "goal" ? MENU_PLATE[popup] : goalPlate;

  return (
    <div className="home">
      <img className="home-title" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />

      <ProfileCard name={profile.name} progress={progress} />

      <button
        type="button"
        className="home-goal"
        style={{ backgroundImage: `url(${goalPlate})` }}
        onClick={() => setPopup("goal")}
      >
        <img className="home-goal__star" src={starUrl} alt="" />
        <span className="home-goal__text">
          학습 목표<br />
          <small>클릭해서 목표를 완성하세요</small>
        </span>
      </button>

      <EnergyGauge progress={progress} />
      <Mothership />

      <div className="home-planets">
        {([1, 2, 3, 4] as const).map((id) => (
          <PlanetButton
            key={id}
            id={id}
            status={planetState(id, progress)}
            onPlay={(pid) => nav(`/planet/${pid}`)}
          />
        ))}
      </div>

      <MenuBar onOpen={(key) => setPopup(key)} />
      <HatiHelper progress={progress} />

      {/* 팝업 내용은 추후 채움 (지금은 빈 모달) */}
      <Modal open={popup !== null} onClose={() => setPopup(null)} plateUrl={popupPlate} />
    </div>
  );
}
