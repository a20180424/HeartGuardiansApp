import { useNavigate } from "react-router-dom";
import MissionPlayer from "../player/MissionPlayer";
import { MISSION01_THEME } from "./theme";

export default function Planet1() {
  const nav = useNavigate();
  return (
    <MissionPlayer
      scenarioUrl="/scenarios/mission01.json"
      theme={MISSION01_THEME}
      onExit={() => nav("/home")}
    />
  );
}
