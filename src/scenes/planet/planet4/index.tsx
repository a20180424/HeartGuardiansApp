import { useNavigate } from "react-router-dom";
import MissionPlayer from "../player/MissionPlayer";
import { MISSION01_THEME, MISSION01_DATA } from "../planet1/theme";

export default function Planet4() {
  const nav = useNavigate();
  return (
    <MissionPlayer
      scenario={MISSION01_DATA}
      theme={MISSION01_THEME}
      onExit={() => nav("/home")}
    />
  );
}
