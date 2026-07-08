import type {
  RefObject,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SyntheticEvent,
} from "react";
import type { MissionTheme } from "../engine/types";

// 화면 A(2거울)/B(1거울) 렌더에 쓰는 VM 조각. MissionPlayer 의 vm 에서 채워 넘긴다.
export type MirrorVM = {
  friend: string;
  title: string;
  line: string;
  bubble: string;
  done: boolean;
  charImage: string; // 거울 안 캐릭터 이미지(지정 시 friend 스프라이트 대신 사용, "" 이면 스프라이트)
};
export type GaugeVM = { icon: string; title: string; desc: string; fill: number };

export interface MirrorStageProps {
  stage: "mirrors" | "gauge";
  theme: MissionTheme;
  hideBubbles: boolean; // 캐릭터 말풍선 숨김(대사가 캐릭터 이미지에 포함된 경우)
  banner: string;
  prompt: string;
  // mirrors (화면 A)
  card: string; // "" 이면 카드 숨김
  targets: MirrorVM[];
  activeTarget: number; // 현재 드롭 가능한 타깃 idx, -1=없음
  revealPhase: "none" | "await" | "done";
  revealFriend: string;
  // gauge (화면 B)
  friend: string;
  friendLine: string;
  header: string;
  gaugeImage: string; // 거울 안을 통째로 채우는 이미지("" 이면 friend 스프라이트 + 말풍선 사용)
  options: GaugeVM[];
  // handlers / refs
  cardRef: RefObject<HTMLButtonElement | null>;
  mirrorRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  onCardDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMirrorTouch: (idx: number) => void;
  onGaugeDown: (e: ReactPointerEvent<HTMLDivElement>, idx: number) => void;
}

// 프레임/씬 이미지가 아직 없을 때(플레이스홀더 부재) 레이아웃이 깨지지 않게 숨긴다.
const hideOnError = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

function friendSrc(theme: MissionTheme, friend: string): string {
  const set = theme.friends[friend];
  return set ? set.char[set.initial] : "";
}

export default function MirrorStage(p: MirrorStageProps) {
  const t = p.theme;
  return (
    <div id="mirrorStage" className={`mstage ${p.stage}`}>
      <div className="ms-banner">
        <span className="ms-pill">특별 미션</span>
        <h2 className="ms-title">{p.banner}</h2>
        <p className="ms-sub">친구의 마음을 이해하고, 따뜻한 말을 전해 봐!</p>
      </div>

      {p.stage === "mirrors" && (
        <div className="ms-mirrors">
          {p.targets.map((tg, i) => (
            <div className="ms-col" key={i}>
              <div className="ms-badge">
                <b>{i + 1}</b> {tg.title}
              </div>
              <div
                className={`ms-mirror${p.activeTarget === i ? " active" : ""}${
                  p.revealPhase !== "none" && p.revealFriend === tg.friend ? " touchable" : ""
                }`}
                ref={(el) => {
                  p.mirrorRefs.current[i] = el;
                }}
                onClick={() => p.onMirrorTouch(i)}
              >
                <img className="ms-char" src={tg.charImage || friendSrc(t, tg.friend)} alt={tg.title} />
                {!p.hideBubbles && <div className="ms-bubble">{tg.bubble}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {p.stage === "gauge" && (
        <div className="ms-gaugeWrap">
          <div className={`ms-mirror single${p.gaugeImage ? " full" : ""}`}>
            {p.gaugeImage ? (
              // 프레임+캐릭터+말풍선이 합쳐진 거울 통짜 이미지
              <img className="ms-fullmirror" src={p.gaugeImage} alt={p.friend} />
            ) : (
              <>
                <img className="ms-char" src={friendSrc(t, p.friend)} alt={p.friend} />
                {!p.hideBubbles && <div className="ms-bubble">{p.friendLine}</div>}
              </>
            )}
          </div>

          <div className="ms-gauge">
            <div className="ms-gauge-head">✧ {p.header} ✧</div>
            {p.options.map((o, i) => {
              const deco = t.gaugeIcons?.[o.icon] || { emoji: "💭", color: "#64748b" };
              return (
                <div className="ms-opt" key={i} onPointerDown={(e) => p.onGaugeDown(e, i)}>
                  <div className="ms-opt-ico" style={{ color: deco.color }}>
                    {deco.emoji}
                  </div>
                  <div className="ms-opt-body">
                    <div className="ms-opt-title">
                      {i + 1}. {o.title}
                    </div>
                    <div className="ms-opt-desc">{o.desc}</div>
                    <div className="ms-bar">
                      <span className="ms-bar-label">진행도</span>
                      <div className="ms-bar-track">
                        <div className="ms-bar-fill" style={{ width: `${o.fill}%`, background: deco.color }} />
                      </div>
                      <span className="ms-bar-pct">{Math.round(o.fill)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="ms-guidebar">
        <img className="ms-hati" src="/assets/char/Hati/hati_explaining.png" alt="하티" onError={hideOnError} />
        <div className="ms-guide-body">
          <div className="ms-guide-name">하티</div>
          <p className="ms-guidetext">{p.prompt}</p>
        </div>
      </div>

      {/* 드래그 카드 — 화면 중앙에 두어 좌/우 어느 거울로도 대칭 드래그. 홀더가 중앙에
          고정하고, 카드 자체 transform 은 드래그에만 쓰이므로 서로 간섭하지 않는다. */}
      {p.stage === "mirrors" && p.card && (
        <div className="ms-card-holder">
          <button
            className="ms-card"
            ref={p.cardRef}
            onPointerDown={p.onCardDown}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {p.card}
          </button>
        </div>
      )}
    </div>
  );
}
