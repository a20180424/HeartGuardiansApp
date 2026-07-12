import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { getSession } from "../../lib/session";
import { planetState, devProgressOverride } from "./home.logic";
import ProfileCard from "./components/ProfileCard";
import EnergyGauge from "./components/EnergyGauge";
import Mothership from "./components/Mothership";
import PlanetButton from "./components/PlanetButton";
import MenuBar, { type MenuKey } from "./components/MenuBar";
import HatiHelper from "./components/HatiHelper";
import EmpathyTools from "./components/EmpathyTools";
import GemBook from "./components/GemBook";
import Modal from "../../shared/components/Modal";
import FixedStage from "../../lib/FixedStage";
import bannerUrl from "../../shared/assets/TitleBanner.png";
import goalPlate from "./assets/BannerPlate03.png";
import starUrl from "./assets/PurposeStart.png";
import plateMission from "./assets/plateMission.png";
import plateGem from "./assets/plateGem.png";
import plateInventory from "./assets/plateInventory.png";
import plateHistory from "./assets/plateHistory.png";
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

  const { profile } = session;
  // DEV에서는 #/home?prog=N 으로 progress를 덮어써 DB 없이 화면을 테스트할 수 있다.
  const progress = devProgressOverride(session.progress);
  const popupPlate: string =
    popup && popup !== "goal" ? MENU_PLATE[popup] : goalPlate;

  return (
    <FixedStage>
    <div className="home">
      <img className="home-title" src={bannerUrl} alt="하트 가디언즈: 우주 공감 탐험대" />

      <ProfileCard name={profile.name} progress={progress} gender={profile.gender} />

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

      {/* 도감형 이미지 팝업: 가디언즈 가방=공감 도구, 원석 도감=원석 */}
      {popup === "inventory" ? (
        <EmpathyTools progress={progress} onClose={() => setPopup(null)} />
      ) : popup === "gem" ? (
        <GemBook progress={progress} onClose={() => setPopup(null)} />
      ) : (
        /* 나머지 메뉴/목표 팝업 내용은 추후 채움 (지금은 빈 모달) */
        <Modal open={popup !== null} onClose={() => setPopup(null)} plateUrl={popupPlate} />
      )}
    </div>
    </FixedStage>
  );
}
