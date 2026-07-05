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

// 조립기 배경 이미지 위 9개 부품 슬롯 중심(이미지 컨테이너 대비 %).
// ⚠️ dev 서버에서 배경과 겹쳐보며 미세조정할 것(Step 6).
const SLOT_POS: { left: string; top: string }[] = [
  { left: "42%", top: "31%" }, // 1
  { left: "52%", top: "31%" }, // 2
  { left: "62%", top: "31%" }, // 3
  { left: "42%", top: "45%" }, // 4
  { left: "52%", top: "45%" }, // 5
  { left: "62%", top: "45%" }, // 6
  { left: "42%", top: "58%" }, // 7
  { left: "52%", top: "58%" }, // 8
  { left: "62%", top: "58%" }, // 9
];

export default function EmpathyRadarStage({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<GameState>(() => initialState(STAGES, shuffle));
  const [wrongBox, setWrongBox] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const doneRef = useRef(false);
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragOrigin = useRef<{ px: number; py: number } | null>(null);

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

  // 드래그: 단어 버블을 포인터로 옮기고, 놓은 지점의 감정 상자를 판정.
  function onBubbleDown(e: React.PointerEvent) {
    if (!word || doneRef.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragOrigin.current = { px: e.clientX, py: e.clientY };
    setDrag({ x: 0, y: 0 });
  }
  function onBubbleMove(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    setDrag({ x: e.clientX - dragOrigin.current.px, y: e.clientY - dragOrigin.current.py });
  }
  function onBubbleUp(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    setDrag(null);
    // 놓은 지점이 어느 감정 상자 안인가 히트테스트.
    const hit = Object.entries(boxRefs.current).find(([, el]) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (hit) attempt(hit[0]);
  }

  return (
    <div className="er-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="er-panel">
        {/* 좌: 조립기 인벤토리 */}
        <div className="er-inventory">
          <img className="er-assembler" src={`${ASSET}/radar-assembler.png`} alt="공감 레이더 조립기" draggable={false} />
          {SLOT_POS.map((pos, i) => {
            const partId = i + 1;
            if (!earned.has(partId)) return null;
            return (
              <img
                key={partId}
                className="er-part"
                src={`${ASSET}/radar-part-${partId}.png`}
                alt={`부품 ${partId}`}
                style={{ left: pos.left, top: pos.top }}
                draggable={false}
              />
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

          {/* 감정 상자 3개(드롭 존 + 탭) */}
          <div className="er-boxes">
            {stage.emotions.map((e: Emotion) => (
              <div
                key={e.id}
                ref={(el) => { boxRefs.current[e.id] = el; }}
                className={`er-box${wrongBox === e.id ? " er-box--wrong" : ""}`}
                style={{ ["--box-color" as string]: e.color }}
                onClick={() => attempt(e.id)}
              >
                <span className="er-box-emoji">{e.emoji}</span>
                <span className="er-box-name">{e.name}</span>
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
              >
                <span className="er-word-emoji">{word.emoji}</span>
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
