import PrologueTemplate from "../prologue/PrologueTemplate";
import { MISSION_STEPS } from "./theme"; // 미션 이름(스텝 라벨) 단일 출처
import "./Prologue.css"; // planet3 전용: 얼음톤 포인트 색

const OBJECTIVES = [
  "따듯한 말과 행동이 공감으로 이어진다는 것을 이해한다.",
  "친구의 어려움을 함꼐 나누고 응원하느 방법을 배운다.",
  "공감이 친구에게 힘이 된다는 것을 경험한다.",
];

const REWARDS = [
  { icon: "💎", name: "따듯함의 원석", desc: "얼음 행성에서 얻는 첫 번째 원석이예요." },
  { icon: "🌡️", name: "공감 온도계", desc: "차가운 마음을 감지하고 따듯하게 해주는 도구예요." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
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
      modifier="prologue--planet3"
      planetName="얼음 행성"
      hatiLines={["친구들의 마음이", "얼어붙었어...", "따듯한 말과 행동으로", "마음을 녹여주면", "다시 빛날 수 있어!"]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="얼어붙은 마음을 녹여라"
      questSub="따듯한 말과 행동으로 친구들의 마음을 녹이자."
      questMascot="/assets/planet3/planet3-bunny.png"
      questMascotAlt="마스코트"
      steps={MISSION_STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
