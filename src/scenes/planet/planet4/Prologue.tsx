import PrologueTemplate from "../prologue/PrologueTemplate";
import { MISSION_STEPS } from "./theme"; // 미션 이름(스텝 라벨) 단일 출처
import "./Prologue.css"; // planet4 전용: 그림자톤 포인트 색

const OBJECTIVES = [
  "도움이 필요한 친구에게 먼저 다가가 말과 행동으로 공감을 실천하는 태도를 기른다.",
  "공감에도 올바른 기준이 있음을 알고, 친구와 나의 마음을 모두 소중히 여기는 태도를 기른다.",
];

const REWARDS = [
  { icon: "/assets/reward/gem-planet4-emerald.png", name: "용기의 에메랄드", desc: "그림자 행성에서 얻는 네 번째 원석이에요." },
  { icon: "/assets/reward/tool-planet4-compass.png", name: "공감 나침반", desc: "올바른 공감의 방향을 알려주는 도구예요." },
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
      modifier="prologue--planet4"
      planetName="그림자 행성"
      hatiLines={[
        "그림자 행성이 두려움에",
        "갇혀버렸어! 주민들은 공감하는",
        "방법은 알고 있지만, 먼저",
        "다가갈 용기를 잃어버렸어.",
        "올바른 길을 찾아 용기를 되찾고,",
        "함께 공감을 실천하는",
        "행성으로 만들어 보자!",
      ]}
      objectives={OBJECTIVES}
      rewards={REWARDS}
      questTitle="공감할 용기를 되찾아라!"
      questSub="용기를 내어 먼저 다가가 공감을 실천하고 서로의 마음을 다시 연결해 보세요!"
      questMascot="/assets/planet4/planet4-jiro.png"
      questMascotAlt="지로"
      steps={MISSION_STEPS}
      onStart={onStart}
      onHome={onHome}
    />
  );
}
