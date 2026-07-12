import PrologueTemplate from "../prologue/PrologueTemplate";
import "./Prologue.css"; // planet4 전용: 그림자톤 포인트 색

const OBJECTIVES = [
  "공감하려면 용기가 필요함을 이해한다.",
  "편견 없이 친구를 받아들이고 존중하는 태도를 배운다.",
  "용기 있는 공감이 더 큰 변화를 만든다는 것을 깨닫는다.",
];

const REWARDS = [
  { icon: "💎", name: "용기의 원석", desc: "그림자 행성에서 얻는 첫 번째 원석이에요." },
  { icon: "🧭", name: "공감 나침반", desc: "올바른 공감의 방향을 알려주는 도구예요." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

const STEPS = ["용기 조각 모으기", "그림자 신전의 빛 찾기", "어둠에 갇힌 마음 마을로"];

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
      hatiLines={[
        "공감할 용기가",
        "사라지고 있어…",
        "용기를 모아 친구들에게",
        "손을 내밀어 보자!",
        "빛이 돌아올 거야!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="공감할 용기를 되찾아라!"
      questSub="용기를 모아 친구들에게 손을 내밀고 그림자를 밝혀보자!"
      questMascot="/assets/planet4/planet4-jiro.png"
      questMascotAlt="지로"
      steps={STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
