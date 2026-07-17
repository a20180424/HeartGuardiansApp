import { Fragment } from "react";
import FixedStage from "../../../lib/FixedStage";
import "./Prologue.css";

// 행성 도착 도입부 프롤로그의 공용 레이아웃(9개 요소). 행성별로 다른 값은 props로 받고,
// 색/배경은 modifier 클래스(.prologue--planetN)로 CSS 변수를 오버라이드한다.
// 레이아웃 CSS 단일 소스: ./Prologue.css.

export interface PrologueContent {
  modifier?: string; // 루트 추가 클래스, 예: "prologue--planet3" (planet1: 없음=기본 색)
  planetName: string;
  hatiLines: string[]; // 말풍선 줄들(사이에 <br/> 삽입)
  objectives: string[];
  rewards: { icon: string; name: string; desc: string }[];
  questTitle: string;
  questSub: string;
  questMascot: string; // 마스코트 이미지 경로
  questMascotAlt: string;
  steps: string[];
}

export default function PrologueTemplate({
  modifier,
  planetName,
  hatiLines,
  objectives,
  rewards,
  questTitle,
  questSub,
  questMascot,
  questMascotAlt,
  steps,
  onStart,
  onHome,
}: PrologueContent & { onStart: () => void; onHome: () => void }) {
  return (
    <FixedStage>
      <div className={modifier ? `prologue ${modifier}` : "prologue"}>
        {/* ① 타이틀 배너 */}
        <div className="prologue__title">
          <img className="prologue__title-star" src="/assets/icon/star.png" alt="" />
          <span className="prologue__title-text">{planetName}</span>
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
              {hatiLines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
          </div>
        </div>

        {/* ② 학습 목표 */}
        <section className="info-panel prologue__goals">
          <header className="info-panel__head">🎯 학습 목표</header>
          <ul className="prologue__goal-list">
            {objectives.map((text) => (
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
            {rewards.map((reward) => (
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
          <img className="prologue__quest-mascot" src={questMascot} alt={questMascotAlt} />
          <div className="prologue__quest-body">
            <h2 className="prologue__quest-title">{questTitle}</h2>
            <p className="prologue__quest-sub">{questSub}</p>
            <button type="button" className="btn prologue__start" onClick={onStart}>
              탐험 시작!
            </button>
          </div>
        </section>

        {/* ⑨ 우주선으로 이동 (홈 복귀) */}
        <button
          type="button"
          className="prologue__home"
          data-sfx="none" /* onHome이 Home으로 nav()해 whoosh를 울린다 — tap과 겹치면 안 된다 */
          onClick={onHome}
        >
          <img className="prologue__home-icon" src="/assets/char/SpaceshipIcon.png" alt="" />
          <span>우주선으로 이동</span>
        </button>

        {/* ⑧ 미션 흐름(스텝) 인디케이터 */}
        <ol className="prologue__steps">
          {steps.map((label, i) => (
            <li key={label} className="prologue__step">
              <span className="prologue__step-num">{i + 1}</span>
              <span className="prologue__step-label">{label}</span>
              {i < steps.length - 1 && (
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
