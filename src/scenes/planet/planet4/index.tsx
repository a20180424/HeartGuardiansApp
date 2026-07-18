import { useEffect, useState } from "react";
import { useFadeNav } from "../../../lib/sceneTransition";
import { useDevJump } from "../devJump";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import EmpathyCompassStage from "./EmpathyCompassStage"; // 미션1 "가디언즈 최종 점검하기" 미니게임
import CourageCompassStage from "./CourageCompassStage"; // 미션2 "공감 나침반 작전" 미니게임
import HeartConnectStage from "./HeartConnectStage"; // 미션3 "마지막 공감 연결" 미니게임
import { completePlanet } from "../../../lib/session";
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
import "./Mission.css"; // planet4 미션별 미세조정 노브(.p4_m1 / .p4_m2 스코프)

// Planet4(그림자 행성) 컨테이너. prologue → mission1 → mission2 → mission3 → home 상태 머신.
// 각 미션은 현재 시작·끝 골격.
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet4() {
  const nav = useFadeNav();

  // 개발용 점프(#/planet/4?m=3&end=1 등). 파라미터 규격은 ../devJump.ts 참고.
  const { stage: initialStage, startFrom } = useDevJump(STAGES);

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

  // 미션3 = 최종 행성 마지막 미션 = 게임 전체 완료 지점. 낙관적 로컬 갱신 + 백그라운드 저장.
  const exitToHome = () => {
    completePlanet(4);
    nav("/home");
  };

  return (
    <>
      {stage === "prologue" && (
        <Prologue onStart={() => goTo("mission1")} onHome={() => nav("/home")} />
      )}
      {stage === "mission1" && (
        <MissionPlayer
          scenario={startFrom(MISSION01_DATA)}
          theme={MISSION01_THEME}
          currentStep={1}
          steps={MISSION_STEPS}
          scopeClass="p4_m1"
          games={{
            // 미션1 "가디언즈 최종 점검하기" — 11문항 자기점검 → 서약서 → 나침반 획득 → onDone.
            empathyCompass: ({ onDone }) => <EmpathyCompassStage onDone={onDone} />,
          }}
          finish={{
            label: "그림자 행성으로 이동",
            image: "/assets/planet4/shadow-planet-move-banner.png",
          }}
          onExit={() => goTo("mission2")}
        />
      )}
      {stage === "mission2" && (
        <MissionPlayer
          scenario={startFrom(MISSION02_DATA)}
          theme={MISSION02_THEME}
          currentStep={2}
          steps={MISSION_STEPS}
          scopeClass="p4_m2"
          games={{
            // 미션2 "공감 나침반 작전" — 4스테이지 × 2시나리오(갈림길·대화·용기조각) → onDone.
            // 공감 카드·엔딩 화면은 미니게임이 아니라 이후 시나리오 노드가 맡는다.
            courageCompass: ({ onDone }) => <CourageCompassStage onDone={onDone} />,
          }}
          onExit={() => goTo("mission3")}
        />
      )}
      {stage === "mission3" && (
        <MissionPlayer
          scenario={startFrom(MISSION03_DATA)}
          theme={MISSION03_THEME}
          currentStep={3}
          steps={MISSION_STEPS}
          scopeClass="p4_m3"
          games={{
            // 미션3 "마지막 공감 연결" — story→quiz→video→epilogue→success 전체를 미니게임이 소유.
            // 미션이 미니게임에서 끝나 이후 엔진 화면이 없다. 엔진 finishMinigame(showNext 미점등)이 아니라
            // 성공 화면 "우주선으로 이동" 버튼이 exitToHome 을 직접 호출한다.
            heartConnect: () => <HeartConnectStage onDone={exitToHome} />,
          }}
          onExit={exitToHome}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
