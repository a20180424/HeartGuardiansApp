import PrologueTemplate from "../prologue/PrologueTemplate";
// planet1은 기본 색이라 전용 override CSS가 없다(공용 Prologue.css의 기본값 사용).

const OBJECTIVES = [
  "공감의 뜻과 공감이 필요한 까닭을 이해한다.",
  "공감하는 말과 행동이 상황에 따라 다르게 받아들여질 수도 있음을 이해한다.",
];

const REWARDS = [
  { icon: "/assets/reward/gem-planet1-sapphire.png", name: "이해의 사파이어", desc: "빛의 행성에서 얻는 첫 번째 원석이에요." },
  { icon: "/assets/reward/tool-planet1-mirror.png", name: "공감 거울", desc: "친구의 마음을 비추어 공감의 말을 만들어줘요." },
  { icon: "/assets/reward/energy.png", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["마음 신호 탐색하기", "얼어붙은 공감 거울 깨우기", "공감없는 세상으로"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <PrologueTemplate
      planetName="빛의 행성"
      hatiLines={[
        "빛의 행성이 어두워졌어!",
        "주민들이 서로의 마음 신호를",
        "알아채지 못해 '이해의 빛'이",
        "점점 사라지고 있어. 친구의",
        "마음을 이해하는 방법을 배우고,",
        "미션을 해결해서 빛의 행성의",
        "밝은 빛을 되찾아 보자!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="사라진 이해의 빛을 찾아라!"
      questSub="친구의 마음을 이해하며 공감의 첫걸음을 시작해 보세요!"
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="루미"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
