import PrologueTemplate from "../prologue/PrologueTemplate";
import { MISSION_STEPS } from "./theme"; // 미션 이름(스텝 라벨) 단일 출처
import "./Prologue.css"; // planet2 전용: 포인트 색 + 배경 오버라이드(prologue--planet2)

const OBJECTIVES = [
  "다른 사람의 감정을 관찰하고 알아차리는 방법을 배운다.",
  "상황과 표정을 통해 마음을 이해하려고 노력한다.",
  "관찰과 관심이 공감의 시작임을 이해한다.",
];

const REWARDS = [
  { icon: "/assets/reward/gem-planet2-amber.png", name: "관찰의 호박석", desc: "안개 행성에서 얻는 두 번째 원석이에요." },
  { icon: "/assets/reward/tool-planet2-radar.png", name: "공감 레이더", desc: "친구의 숨은 감정을 찾아내는 도구예요." },
  { icon: "/assets/reward/energy.png", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      modifier="prologue--planet2"
      planetName="안개 행성"
      hatiLines={[
        "안개 때문에 마을이",
        "잘 보이지 않아. 친구들의",
        "마음 신호를 찾아주면",
        "길이 열릴거야!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="숨겨진 마음 신호를 찾아라!"
      questSub="친구들의 마음 신호를 관찰하고 안개를 걷어내자!"
      questMascot="/assets/char/planet2_arji.png"
      questMascotAlt="아르지"
      steps={MISSION_STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
