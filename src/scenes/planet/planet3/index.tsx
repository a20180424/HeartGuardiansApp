import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import EmpathyManualGame from "./EmpathyManualGame";
import EmpathyFuelGame from "./EmpathyFuelGame";
import {
  MISSION01_THEME,
  MISSION01_DATA,
  MISSION02_THEME,
  MISSION02_DATA,
  MISSION_STEPS,
} from "./theme";
import "../planet1/Planet1.css"; // 공용 subscene 페이드 오버레이(.planet-fade) 재사용
import "./Mission.css"; // planet3 전용 미션 오버라이드(.planet3 스코프) — intro 하티 등

// Planet3(얼음 행성) 컨테이너. prologue → mission1 → mission2 → home 상태 머신.
// ※ 미션3은 별도 스테이지가 아니다: 미션2 미니게임(3D 월드)이 stage1(미션2) 통과 후
//   끊김 없이 stage2(미션3)로 이어지고, 그때 스테퍼만 미션3으로 올린다(행성3 전용).
//   stage2까지 끝나면 미션2의 마지막 노드(p3_m2_end)가 행성3의 최종 페이지가 된다.
type Stage = "prologue" | "mission1" | "mission2";

const STAGES: Stage[] = ["prologue", "mission1", "mission2"];
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

  // DEV 편의: ?m=2&stage2=1 이면 미션2 미니게임을 stage2(=미션3)부터 바로 시작한다.
  const devStage2 = import.meta.env.DEV && params.has("stage2");

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  // 미션2 미니게임이 stage2(=행성3 관점의 미션3)로 넘어가면 상단 스테퍼를 3단계로 올린다.
  const [m2Step, setM2Step] = useState(devStage2 ? 3 : 2);

  // games 맵은 반드시 안정적인 참조여야 한다 — 매 렌더 새 함수를 넘기면 MissionPlayer가
  // 미니게임 컴포넌트를 remount해 3D 월드가 통째로 재생성된다(stage2 전환 시 치명적).
  const m2Games = useMemo(
    () => ({
      // 미션2 미니게임 — 3D 얼음 숲: stage1(연료 채우기) → stage2(미션3)까지 한 번에.
      empathyFuel: ({ onDone }: { onDone: () => void }) => (
        <EmpathyFuelGame
          onDone={onDone}
          onStage2Enter={() => setM2Step(3)}
          devStartStage={devStage2 ? 2 : undefined}
        />
      ),
    }),
    [devStage2],
  );

  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME].forEach((t) =>
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
            // 미션1 미니게임 — 공감 송신기 사용 설명서 완성(6지선다 ×3단계).
            empathyManual: ({ onDone }) => <EmpathyManualGame onDone={onDone} />,
          }}
          finish={{ label: "얼음 행성으로 이동", image: "/assets/planet3/ice-planet-move-tab.png" }}
          onExit={() => goTo("mission2")}
        />
      )}
      {stage === "mission2" && (
        <MissionPlayer
          scenario={MISSION02_DATA}
          theme={MISSION02_THEME}
          currentStep={m2Step}
          steps={MISSION_STEPS}
          scopeClass="planet3"
          games={m2Games}
          finish={{ label: "우주선으로 이동", icon: "/assets/char/SpaceshipIcon.png" }}
          onExit={() => nav("/home")}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
