import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import EmotionGuideStage from "./EmotionGuideStage";
import type { EmotionGuideResult } from "./emotionGuide.data";
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
import "./Mission.css"; // planet2 전용 미션 오버라이드(.planet2 스코프) — intro 하티 등

// Planet2 컨테이너. subscene들을 순서대로 진행한다(내부 상태 머신).
// prologue → mission1 → mission2 → mission3 → home. 각 미션은 현재 시작·끝 골격.
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet2() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // 개발용 단축키(프로덕션 빌드에선 무시): #/planet/2?stage=mission3 또는 ?m=3 (m=0 → prologue)
  const m = params.get("m");
  const wanted =
    params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null);
  const initialStage: Stage =
    import.meta.env.DEV && wanted && (STAGES as string[]).includes(wanted)
      ? (wanted as Stage)
      : "prologue";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  // 미션1 미니게임 결과(감정/행동 선택). 서버 준비 전까지 세션 메모리에만 보관.
  const emotionResultRef = useRef<EmotionGuideResult[] | null>(null);

  // 전환 시 배경 깜빡임 방지: 미션 배경들을 미리 캐시에 올려둔다.
  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME, MISSION03_THEME].forEach((t) =>
      Object.values(t.bg.states).forEach((src) => {
        if (!src) return;
        const im = new Image();
        im.src = src;
      }),
    );
  }, []);

  // subscene 전환: 검은 오버레이로 페이드아웃 → 교체 → 페이드인.
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
          scopeClass="planet2"
          games={{
            emotionGuide: ({ onDone }) => (
              <EmotionGuideStage
                onFinish={(results) => {
                  emotionResultRef.current = results; // TODO: 서버 준비 시 이 지점에서 POST
                  onDone();
                }}
              />
            ),
          }}
          onExit={() => goTo("mission2")}
        />
      )}
      {stage === "mission2" && (
        <MissionPlayer
          scenario={MISSION02_DATA}
          theme={MISSION02_THEME}
          currentStep={2}
          steps={MISSION_STEPS}
          scopeClass="planet2"
          onExit={() => goTo("mission3")}
        />
      )}
      {stage === "mission3" && (
        <MissionPlayer
          scenario={MISSION03_DATA}
          theme={MISSION03_THEME}
          currentStep={3}
          steps={MISSION_STEPS}
          scopeClass="planet2"
          finish={{ label: "우주선으로 이동", icon: "/assets/char/SpaceshipIcon.png" }}
          onExit={() => nav("/home")}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
