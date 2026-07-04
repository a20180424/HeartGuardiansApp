import FixedStage from "../../../lib/FixedStage";
import "./Prologue.css";

// Planet1 프롤로그 subscene — 행성 도착 도입부.
// 요소: ① 타이틀 배너 / ② 학습 목표 / ③ 하티+말풍선 / ④ 배경 / ⑤ 보상 /
//       ⑥ 오늘의 탐험 패널 / ⑦ 시작 버튼 / ⑧ 스텝 인디케이터 / ⑨ 우주선 버튼.
// NOTE: 텍스트/보상/스텝 목록은 planet1 전용으로 inline. 색·위치·크기 미세조정과
//       props/theme 일반화는 9개 요소를 모두 올린 뒤 한 번에 진행한다.

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

// ⑧ 미션 흐름 — 행성별로 달라지는 데이터.
const STEPS = ["마음 신호 탐색하기", "얼어붙은 공감 거울 깨우기", "공감없는 세상으로"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <FixedStage>
    <div className="prologue">
      {/* ① 타이틀 배너 */}
      <div className="prologue__title">
        <img className="prologue__title-star" src="/assets/icon/star.png" alt="" />
        <span className="prologue__title-text">빛의 행성</span>
      </div>

      {/* ③ 하티 + 말풍선 */}
      <div className="prologue__hati">
        <img
          className="prologue__hati-img"
          src="/assets/char/Hati/hati_robot_worried.png"
          alt="하티"
        />
        <div className="prologue__bubble">
          <span className="prologue__nametag">하티</span>
          <p className="prologue__bubble-text">
            이해의 빛이 사라졌어…
            <br />
            친구들의 마음을 이해하면
            <br />
            빛을 되찾을 수 있어!
          </p>
        </div>
      </div>

      {/* ② 학습 목표 */}
      <section className="info-panel prologue__goals">
        <header className="info-panel__head">🎯 학습 목표</header>
        <ul className="prologue__goal-list">
          {OBJECTIVES.map((text) => (
            <li key={text}>
              <span className="prologue__goal-star">⭐</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ⑤ 획득 가능한 보상 */}
      <section className="info-panel prologue__rewards">
        <header className="info-panel__head">✨ 획득 가능한 보상</header>
        <ul className="prologue__reward-list">
          {REWARDS.map((reward) => (
            <li key={reward.name}>
              <span className="prologue__reward-icon">{reward.icon}</span>
              <div className="prologue__reward-text">
                <strong>{reward.name}</strong>
                <span>{reward.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ⑥ 오늘의 탐험 패널 (+ ⑦ 시작 버튼) */}
      <section className="prologue__quest">
        <span className="prologue__quest-tab">오늘의 탐험</span>
        <img
          className="prologue__quest-mascot"
          src="/assets/char/planet1-lumi.png"
          alt="루미"
        />
        <div className="prologue__quest-body">
          <h2 className="prologue__quest-title">사라진 이해의 빛을 찾아라!</h2>
          <p className="prologue__quest-sub">
            친구들의 마음을 이해하고 빛을 되찾아보자!
          </p>
          <button type="button" className="btn prologue__start" onClick={onStart}>
            탐험 시작!
          </button>
        </div>
      </section>

      {/* ⑨ 우주선으로 이동 (홈 복귀) */}
      <button type="button" className="prologue__home" onClick={onHome}>
        <img
          className="prologue__home-icon"
          src="/assets/char/SpaceshipIcon.png"
          alt=""
        />
        <span>우주선으로 이동</span>
      </button>

      {/* ⑧ 미션 흐름(스텝) 인디케이터 */}
      <ol className="prologue__steps">
        {STEPS.map((label, i) => (
          <li key={label} className="prologue__step">
            <span className="prologue__step-num">{i + 1}</span>
            <span className="prologue__step-label">{label}</span>
            {i < STEPS.length - 1 && (
              <span className="prologue__step-arrow" aria-hidden="true">
                ➔
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
    </FixedStage>
  );
}
