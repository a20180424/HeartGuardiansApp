import PrologueTemplate from "../prologue/PrologueTemplate";
// planet1은 기본 색이라 전용 override CSS가 없다(공용 Prologue.css의 기본값 사용).

const OBJECTIVES = [
  "공감이 왜 필요한지 이해한다.",
  "다른 사람의 마음을 이해하려고 노력하는 방법을 배운다.",
  "공감이 사람들을 연결하고 행복하게 만든다는 것을 깨닫는다.",
];

const REWARDS = [
  { icon: "💎", name: "이해의 원석", desc: "빛의 행성에서 얻는 첫 번째 원석이에요." },
  { icon: "🪞", name: "공감 거울", desc: "친구의 마음을 비추어 공감의 말을 만들어줘요." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
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
      hatiLines={["이해의 빛이 사라졌어…", "친구들의 마음을 이해하면", "빛을 되찾을 수 있어!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="사라진 이해의 빛을 찾아라!"
      questSub="친구들의 마음을 이해하고 빛을 되찾아보자!"
      questMascot="/assets/char/planet1-lumi.png"
      questMascotAlt="루미"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
