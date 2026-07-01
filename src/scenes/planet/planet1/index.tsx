import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Prologue from "./Prologue";
import MissionPlayer from "../player/MissionPlayer";
import { MISSION01_THEME, MISSION01_DATA } from "./theme";
import "./Planet1.css";

// Planet1 컨테이너. subscene들을 순서대로 진행한다(내부 상태 머신).
// 목표: prologue → mission1 → mission2 → mission3 → epilogue.
// 현재 구현: prologue, mission1.
type Stage = "prologue" | "mission1";

const FADE_MS = 160;

export default function Planet1() {
  const nav = useNavigate();
  const [stage, setStage] = useState<Stage>("prologue");
  const [fading, setFading] = useState(false);

  // 프롤로그→mission1 전환 시 배경 깜빡임 방지: 미션 배경을 미리 캐시에 올려둔다.
  useEffect(() => {
    Object.values(MISSION01_THEME.bg.states).forEach((src) => {
      const im = new Image();
      im.src = src;
    });
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
      {stage === "prologue" ? (
        <Prologue onStart={() => goTo("mission1")} onHome={() => nav("/home")} />
      ) : (
        <MissionPlayer
          scenario={MISSION01_DATA}
          theme={MISSION01_THEME}
          onExit={() => nav("/home")}
        />
      )}
      <div className={`planet-fade${fading ? " show" : ""}`} aria-hidden="true" />
    </>
  );
}
