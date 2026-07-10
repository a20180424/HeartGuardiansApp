import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import PlaceholderGameStage from "./PlaceholderGameStage";
import {
  MISSION01_THEME,
  MISSION01_DATA,
  MISSION02_THEME,
  MISSION02_DATA,
  MISSION03_THEME,
  MISSION03_DATA,
  MISSION_STEPS,
} from "./theme";
import "../planet1/Planet1.css"; // 공용 subscene 페이드 오버레이(.planet-fade) 재사용
import "./Mission.css"; // planet3 전용 미션 오버라이드(.planet3 스코프) — intro 하티 등

// Planet3(얼음 행성) 컨테이너. prologue → mission1 → mission2 → mission3 → home 상태 머신.
// 각 미션은 현재 시작·끝 골격. 3D 샘플은 Planet3Sample.tsx에 보존(실제 작업 때 연결).
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet3() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const m = params.get("m");
  const wanted =
    params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null);
  const initialStage: Stage =
    import.meta.env.DEV && wanted && (STAGES as string[]).includes(wanted)
      ? (wanted as Stage)
      : "prologue";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME, MISSION03_THEME].forEach((t) =>
      Object.values(t.bg.states).forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.src = src;
      }),
    );
  }, []);

  const goTo = (next: Stage) => {
    setFading(true);
    window.setTimeout(() => {
      setStage(next);
      window.setTimeout(() => setFading(false), 60);
    }, FADE_MS);
  };

  return (
    <>
      {stage === "prologue" && (
        <Prologue onStart={() => goTo("mission1")} onHome={() => nav("/home")} />
      )}
      {stage === "mission1" && (
        <MissionPlayer
          scenario={MISSION01_DATA}
          theme={MISSION01_THEME}
          currentStep={1}
          steps={MISSION_STEPS}
          scopeClass="planet3"
          games={{
            // 임시: 실제 미니게임 대신 팝업+다음 버튼만. 개발 시 실제 스테이지로 교체.
            placeholder: ({ onDone }) => (
              <PlaceholderGameStage onDone={onDone} label="미션1 미니게임 (임시)" />
            ),
          }}
          finish={{ label: "얼음 행성으로 이동", image: "/assets/planet3/ice-planet-move-tab.png" }}
          onExit={() => goTo("mission2")}
        />
      )}
      {stage === "mission2" && (
        <MissionPlayer
          scenario={MISSION02_DATA}
          theme={MISSION02_THEME}
          currentStep={2}
          steps={MISSION_STEPS}
          scopeClass="planet3"
          games={{
            placeholder: ({ onDone }) => (
              <PlaceholderGameStage onDone={onDone} label="미션2 미니게임 (임시)" />
            ),
          }}
          onExit={() => goTo("mission3")}
        />
      )}
      {stage === "mission3" && (
        <MissionPlayer
          scenario={MISSION03_DATA}
          theme={MISSION03_THEME}
          currentStep={3}
          steps={MISSION_STEPS}
          scopeClass="planet3"
          games={{
            placeholder: ({ onDone }) => (
              <PlaceholderGameStage onDone={onDone} label="미션3 미니게임 (임시)" />
            ),
          }}
          finish={{ label: "우주선으로 이동", icon: "/assets/char/SpaceshipIcon.png" }}
          onExit={() => nav("/home")}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
