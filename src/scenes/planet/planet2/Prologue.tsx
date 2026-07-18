import PrologueTemplate from "../prologue/PrologueTemplate";
import { MISSION_STEPS } from "./theme"; // 미션 이름(스텝 라벨) 단일 출처
import "./Prologue.css"; // planet2 전용: 포인트 색 + 배경 오버라이드(prologue--planet2)

const OBJECTIVES = [
  "사람마다 느끼는 감정과 감정을 해소하는 방법, 공감받고 싶은 방법이 서로 다를 수 있음을 이해한다.",
  "표정, 말투, 행동, 상황을 종합하여 친구의 감정을 이해한다.",
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
        "안개 행성이 짙은 안개에",
        "뒤덮였어! 주민들이 겉모습만",
        "보고 서로를 판단하면서",
        "진짜 감정을 잃어버렸어.",
        "표정과 행동, 상황의 단서를",
        "찾아 숨겨진 감정을 밝혀 보자!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="안개 속 숨겨진 감정을 찾아라!"
      questSub="감정의 단서를 찾아 친구의 진짜 마음을 알아보세요!"
      questMascot="/assets/char/planet2_arji.png"
      questMascotAlt="아르지"
      steps={MISSION_STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
