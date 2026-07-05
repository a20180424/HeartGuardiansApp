import { useRef, useState } from "react";
import { STAGES, type Emotion } from "./empathyRadar.data";
import { initialState, currentWord, classify, type GameState } from "./empathyRadar.logic";
import "./EmpathyRadarStage.css";

const ASSET = "/assets/planet2";

// Fisher-Yates 셔플(런타임용). 로직/테스트는 기본 identity를 쓰므로 여기서 주입.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ⚠️ 좌표 튜닝용 임시 플래그. true면 획득 여부와 무관하게 9개 부품을 모두 표시한다.
// 커밋/PR 전에 반드시 false로 되돌릴 것.
const DEBUG_SHOW_ALL_PARTS = false;

// 부품 슬롯 좌표(이미지 컨테이너 대비 %). 슬롯이 규칙적인 3×3 그리드라
// 열 X 3개 + 행 Y 3개만으로 9칸을 생성한다. → 이 6개 값만 만지면 일괄 조정.
//   · 그리드 전체를 좌우로: COL_X 세 값을 같이 ± / 상하로: ROW_Y 세 값을 같이 ±
//   · 열/행 간격: 각 배열의 벌어진 정도를 조정
// ⚠️ dev 서버에서 배경과 겹쳐보며 미세조정할 것.
const COL_X = ["42%", "52%", "62%"]; // 좌·중·우 열의 가로 중심
const ROW_Y = ["31%", "45%", "58%"]; // 상·중·하 행의 세로 중심
// 부품 번호 1..9는 행 우선(1,2,3=윗줄 / 4,5,6=가운뎃줄 / 7,8,9=아랫줄).
const SLOT_POS: { left: string; top: string }[] = ROW_Y.flatMap((top) =>
  COL_X.map((left) => ({ left, top })),
);

export default function EmpathyRadarStage({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<GameState>(() => initialState(STAGES, shuffle));
  const [wrongBox, setWrongBox] = useState<string | null>(null);
  // 드래그 중 포인터가 올라간 드롭존 하나만 하이라이트(카드 크기와 무관하게 대상 명확).
  const [hoverBox, setHoverBox] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const doneRef = useRef(false);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragOrigin = useRef<{ px: number; py: number } | null>(null);
  const activePointerId = useRef<number | null>(null);
  const dragScale = useRef(1);

  const stage = STAGES[state.stageIndex];
  const word = currentWord(state);
  const earned = new Set(state.earnedParts);

  // 현재 단어를 emotionId 상자에 넣는 시도(탭/드롭 공용).
  function attempt(emotionId: string) {
    if (doneRef.current || !word) return;
    const r = classify(state, emotionId, STAGES, shuffle);
    if (r.kind === "wrong") {
      setWrongBox(emotionId);
      window.setTimeout(() => setWrongBox(null), 450);
      return;
    }
    setState(r.state);
    if (r.gameDone) {
      doneRef.current = true;
      setBanner("공감 레이더 완성! 🛰️");
      window.setTimeout(() => onDone(), 1100);
      return;
    }
    if (r.stageCleared) {
      const next = STAGES[r.state.stageIndex];
      setBanner(`${next.id}단계 · ${next.title}`);
      window.setTimeout(() => setBanner(null), 1200);
    }
  }

  // 화면 좌표가 어느 감정 상자(드롭존) 안인지 히트테스트. 없으면 null.
  function boxAt(clientX: number, clientY: number): string | null {
    const hit = Object.entries(boxRefs.current).find(([, el]) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    });
    return hit ? hit[0] : null;
  }

  // 드래그: 단어 버블을 포인터로 옮기고, 놓은 지점의 감정 상자를 판정.
  function onBubbleDown(e: React.PointerEvent) {
    if (!word || doneRef.current) return;
    if (activePointerId.current !== null) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    dragOrigin.current = { px: e.clientX, py: e.clientY };
    // 스테이지가 CSS scale 되므로 포인터 델타를 scale로 나눔
    const stageEl = document.getElementById("stage");
    const w = stageEl?.getBoundingClientRect().width || 1920;
    dragScale.current = w / 1920 || 1;
    setDrag({ x: 0, y: 0 });
  }
  function onBubbleMove(e: React.PointerEvent) {
    if (e.pointerId !== activePointerId.current) return;
    if (!dragOrigin.current) return;
    setDrag({
      x: (e.clientX - dragOrigin.current.px) / dragScale.current,
      y: (e.clientY - dragOrigin.current.py) / dragScale.current,
    });
    setHoverBox(boxAt(e.clientX, e.clientY));
  }
  function onBubbleUp(e: React.PointerEvent) {
    if (e.pointerId !== activePointerId.current) return;
    if (!dragOrigin.current) return;
    activePointerId.current = null;
    dragOrigin.current = null;
    setDrag(null);
    setHoverBox(null);
    // 놓은 지점이 어느 감정 상자 안인가 히트테스트.
    const target = boxAt(e.clientX, e.clientY);
    if (target) attempt(target);
  }
  function onBubbleCancel(e: React.PointerEvent) {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    dragOrigin.current = null;
    setDrag(null);
    setHoverBox(null);
  }

  return (
    <div className="er-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="er-panel">
        {/* 좌: 조립기 인벤토리 */}
        <div className="er-inventory">
          <img className="er-assembler" src={`${ASSET}/radar-assembler.png`} alt="공감 레이더 조립기" draggable={false} />
          {SLOT_POS.map((pos, i) => {
            const partId = i + 1;
            if (!DEBUG_SHOW_ALL_PARTS && !earned.has(partId)) return null;
            return (
              <div key={partId} className="er-part" style={{ left: pos.left, top: pos.top }}>
                <img
                  className="er-part-img"
                  src={`${ASSET}/radar-part-${partId}.png`}
                  alt={`부품 ${partId}`}
                  style={{ animationDelay: `${(i % 4) * 0.3}s` }}
                  draggable={false}
                />
              </div>
            );
          })}
        </div>

        {/* 우: 플레이 영역 */}
        <div className="er-play">
          <div className="er-header">
            <span className="er-stage">{stage.id}단계 · {stage.title}</span>
            <span className="er-progress">부품 {state.earnedParts.length} / 9</span>
          </div>
          <div className="er-instruction">감정 단어를 성격에 맞게 분류해 보자!</div>

          {/* 감정 상자 3개(드롭 존 + 탭): 컬러 명패 + 레이더 글라스 원형 */}
          <div className="er-boxes">
            {stage.emotions.map((e: Emotion) => (
              <div
                key={e.id}
                ref={(el) => { boxRefs.current[e.id] = el; }}
                className={`er-box${wrongBox === e.id ? " er-box--wrong" : ""}${hoverBox === e.id ? " er-box--over" : ""}`}
                style={{ ["--box-color" as string]: e.color }}
                onClick={() => attempt(e.id)}
              >
                <div className="er-box-radar">
                  <span className="er-box-radar-label">{e.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 현재 단어 버블(드래그 가능) */}
          <div className="er-word-area">
            {word && (
              <div
                ref={bubbleRef}
                className="er-word"
                style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)`, transition: "none" } : undefined}
                onPointerDown={onBubbleDown}
                onPointerMove={onBubbleMove}
                onPointerUp={onBubbleUp}
                onPointerCancel={onBubbleCancel}
              >
                <span className="er-word-text">{word.text}</span>
              </div>
            )}
          </div>
        </div>

        {banner && <div className="er-banner">{banner}</div>}
      </div>
    </div>
  );
}
