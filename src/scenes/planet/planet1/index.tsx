import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import {
  MISSION01_THEME,
  MISSION01_DATA,
  MISSION02_THEME,
  MISSION02_DATA,
  MISSION03_THEME,
  MISSION03_DATA,
} from "./theme";
import "./Planet1.css";

// Planet1 컨테이너. subscene들을 순서대로 진행한다(내부 상태 머신).
// 목표: prologue → mission1 → mission2 → mission3 → epilogue.
// 현재 구현: prologue, mission1, mission2, mission3(시작·끝 골격).
type Stage = "prologue" | "mission1" | "mission2" | "mission3";

const STAGES: Stage[] = ["prologue", "mission1", "mission2", "mission3"];
const FADE_MS = 160;

export default function Planet1() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // 개발용 단축키: 특정 subscene부터 시작.
  //   #/planet/1?stage=mission3  (풀네임)
  //   #/planet/1?m=3             (짧은 별칭: 숫자만, m=0 은 prologue)
  // import.meta.env.DEV 가드 → 프로덕션 빌드(APK)에선 항상 prologue.
  const m = params.get("m"); // "3" → "mission3", "0" → "prologue"
  const wanted =
    params.get("stage") ?? (m ? (m === "0" ? "prologue" : `mission${m}`) : null);
  const initialStage: Stage =
    import.meta.env.DEV && wanted && (STAGES as string[]).includes(wanted)
      ? (wanted as Stage)
      : "prologue";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [fading, setFading] = useState(false);

  // 전환 시 배경 깜빡임 방지: 미션 배경들을 미리 캐시에 올려둔다.
  useEffect(() => {
    [MISSION01_THEME, MISSION02_THEME, MISSION03_THEME].forEach((t) =>
      Object.values(t.bg.states).forEach((src) => {
        if (!src) return; // 빈 상태(예: black)는 스킵
        const im = new Image();
        im.src = src;
      }),
    );
  }, []);

  // subscene 전환: 검은 오버레이로 페이드아웃 → 교체 → 페이드인. 마운트 깜빡임을 가린다.
  const goTo = (next: Stage) => {
    setFading(true);
    window.setTimeout(() => {
      setStage(next);
      // 새 subscene이 한 프레임 그려진 뒤 페이드인 시작.
      window.setTimeout(() => setFading(false), 60);
    }, FADE_MS);
  };

  return (
    <>
      {stage === "prologue" && (
        <Prologue onStart={() => goTo("mission1")} onHome={() => nav("/home")} />
      )}
      {stage === "mission1" && (
        // mission1 완료(다음 미션으로 버튼) → mission2로 전환.
        <MissionPlayer
          scenario={MISSION01_DATA}
          theme={MISSION01_THEME}
          currentStep={1}
          onExit={() => goTo("mission2")}
        />
      )}
      {stage === "mission2" && (
        // mission2 완료 → mission3로 전환.
        <MissionPlayer
          scenario={MISSION02_DATA}
          theme={MISSION02_THEME}
          currentStep={2}
          onExit={() => goTo("mission3")}
        />
      )}
      {stage === "mission3" && (
        // 마지막 미션: 완료 시 "다음 미션으로" 대신 우주선 버튼 → 홈으로.
        <MissionPlayer
          scenario={MISSION03_DATA}
          theme={MISSION03_THEME}
          currentStep={3}
          finish={{ label: "우주선으로 이동", icon: "/assets/char/SpaceshipIcon.png" }}
          onExit={() => nav("/home")}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
