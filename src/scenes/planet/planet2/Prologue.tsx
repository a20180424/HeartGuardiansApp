import FixedStage from "../../../lib/FixedStage";
import "../planet1/Prologue.css"; // 공용 레이아웃/템플릿(단일 소스)
import "./Prologue.css"; // planet2 전용: 포인트 색 + 배경만 오버라이드

// Planet2 프롤로그 subscene — planet1 템플릿을 그대로 복제한 시작 화면.
// "일단 행성1과 동일하게" 구성. 이후 이 파일에서 ①내용(텍스트/보상/스텝/마스코트),
// ./Prologue.css 에서 ②포인트 색 ③배경만 교체하면 안개 행성으로 바뀐다.
// 루트에 prologue--planet2 modifier를 달아 색/배경 오버라이드가 planet1로 새지 않게 한다.

const OBJECTIVES = [
  "다른 사람의 감정을 관찰하고 알아차리는 방법을 배운다.",
  "상황과 표정을 통해 마음을 이해하려고 노력한다.",
  "관찰과 관심이 공감의 시작임을 이해한다.",
];

const REWARDS = [
  { icon: "💎", name: "관찰의 원석", desc: "안개 행성에서 얻는 첫 번째 원석이에요." },
  { icon: "📡", name: "마음 신호 탐색기", desc: "보이지 않는 마음 신호를 찾아내는 도구예요." },
  { icon: "❤️", name: "공감 에너지 경험치", desc: "공감 에너지를 모아 레벨을 올릴 수 있어요." },
];

// ⑧ 미션 흐름 — 행성별로 달라지는 데이터.
const STEPS = ["마음 신호 발견하기", "안개 수정 나무 깨우기", "흐려진 마음의 마을로"];

export default function Prologue({
  onStart,
  onHome,
}: {
  onStart: () => void;
  onHome: () => void;
}) {
  return (
    <FixedStage>
    <div className="prologue prologue--planet2">
      {/* ① 타이틀 배너 */}
      <div className="prologue__title">
        <img className="prologue__title-star" src="/assets/icon/star.png" alt="" />
        <span className="prologue__title-text">안개 행성</span>
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
            안개 때문에 마을이
            <br />
            잘 보이지 않아. 친구들의
            <br />
            마음 신호를 찾아주면
            <br />
            길이 열릴거야!
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
          src="/assets/char/planet2_arji.png"
          alt="아르지"
        />
        <div className="prologue__quest-body">
          <h2 className="prologue__quest-title">숨겨진 마음 신호를 찾아라!</h2>
          <p className="prologue__quest-sub">
            친구들의 마음 신호를 관찰하고 안개를 걷어내자!
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
