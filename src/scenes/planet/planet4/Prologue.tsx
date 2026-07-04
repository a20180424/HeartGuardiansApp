import PrologueTemplate from "../prologue/PrologueTemplate";
import "./Prologue.css"; // planet4 전용: 그림자톤 포인트 색

const OBJECTIVES = [
  "(임시) 그림자 행성 학습 목표 1.",
  "(임시) 그림자 행성 학습 목표 2.",
  "(임시) 그림자 행성 학습 목표 3.",
];

const REWARDS = [
  { icon: "💎", name: "(임시) 그림자 원석", desc: "(임시) 보상 설명이 들어갈 예정." },
  { icon: "🔦", name: "(임시) 탐험 도구", desc: "(임시) 보상 설명이 들어갈 예정." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["(임시) 미션 1", "(임시) 미션 2", "(임시) 미션 3"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      modifier="prologue--planet4"
      planetName="그림자 행성"
      hatiLines={["(임시) 그림자 행성 도입 대사.", "여기에 하티 소개가", "들어갈 예정이야!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="(임시) 그림자 행성 탐험!"
      questSub="(임시) 오늘의 탐험 부제가 들어갈 예정."
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="마스코트"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
