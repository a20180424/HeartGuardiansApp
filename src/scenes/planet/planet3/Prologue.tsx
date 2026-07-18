import PrologueTemplate from "../prologue/PrologueTemplate";
import { MISSION_STEPS } from "./theme"; // 미션 이름(스텝 라벨) 단일 출처
import "./Prologue.css"; // planet3 전용: 얼음톤 포인트 색

const OBJECTIVES = [
  "친구의 이야기를 끝까지 귀 기울여 듣고, 적절하게 반응한다.",
  "상황에 맞는 따뜻한 말과 행동으로 공감을 표현한다.",
];

const REWARDS = [
  { icon: "/assets/reward/gem-planet3-topaz-ruby.png", name: "경청의 토파즈 / 표현의 루비", desc: "얼음 행성에서 얻는 세 번째 원석이에요." },
  { icon: "/assets/reward/tool-planet3-transmitter.png", name: "공감 송신기", desc: "따듯한 공감을 말과 행동으로 전하는 도구예요." },
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
      modifier="prologue--planet3"
      planetName="얼음 행성"
      hatiLines={[
        "얼음 행성 주민의 마음이",
        "꽁꽁 얼어붙었어! 주민들은",
        "서로의 이야기를 듣지 않고",
        "마음도 전하지 못해서",
        "따뜻한 공감이 사라졌어.",
        "따뜻한 말과 행동으로",
        "얼어붙은 마음을 녹여 보자!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="얼어붙은 마음을 녹여라!"
      questSub="따뜻한 말과 행동으로 얼어붙은 친구의 마음을 녹여 보세요!"
      questMascot="/assets/planet3/planet3-bunny.png"
      questMascotAlt="마스코트"
      steps={MISSION_STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
