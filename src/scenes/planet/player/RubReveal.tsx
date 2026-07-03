import { useEffect, useRef } from "react";

type Pair = { before: string; after: string };
const COLS = 36;
const ROWS = 20;
const LENS = 0.3; // 거울 폭 대비 렌즈 반경 비율

export default function RubReveal(props: {
  pairs: Pair[];
  mirrorImage: string;
  text: string;
  threshold: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onDone: () => void;
}) {
  const { pairs, mirrorImage, text, threshold, stageRef, onDone } = props;
  const mirrorRef = useRef<HTMLImageElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const grids = useRef<{ marks: Uint8Array; done: boolean }[]>([]);
  const doneRef = useRef(false);

  // before 이미지를 각 캔버스에 그린다(슬롯은 CSS aspect-ratio 로 크기 확정되어 로드 전에도 offset 유효).
  useEffect(() => {
    pairs.forEach((p, i) => {
      const cv = canvasRefs.current[i];
      if (!cv) return;
      const w = cv.offsetWidth;
      const h = cv.offsetHeight;
      cv.width = w;
      cv.height = h;
      grids.current[i] = { marks: new Uint8Array(COLS * ROWS), done: false };
      const img = new Image();
      img.onload = () => {
        const ctx = cv.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = p.before;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageScale = () => {
    const r = stageRef.current?.getBoundingClientRect();
    return r ? r.width / 1920 : 1;
  };
  const lensRadius = () => (mirrorRef.current?.offsetWidth || 200) * LENS;

  const maybeFinish = () => {
    if (doneRef.current) return;
    const all =
      grids.current.length === pairs.length && grids.current.every((g) => g && g.done);
    if (!all) return;
    doneRef.current = true;
    mirrorRef.current?.classList.add("rr-mirror-done");
    window.setTimeout(() => onDone(), 700);
  };

  // 한 점에서 각 캔버스를 지우고 커버리지 그리드 갱신
  const stampAt = (clientX: number, clientY: number) => {
    const scale = stageScale();
    const R = lensRadius();
    canvasRefs.current.forEach((cv, i) => {
      const g = grids.current[i];
      if (!cv || !g || g.done) return;
      const rect = cv.getBoundingClientRect();
      const x = (clientX - rect.left) / scale;
      const y = (clientY - rect.top) / scale;
      if (x < -R || y < -R || x > cv.width + R || y > cv.height + R) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const grad = ctx.createRadialGradient(x, y, R * 0.55, x, y, R);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const cw = cv.width / COLS;
      const ch = cv.height / ROWS;
      const c0 = Math.max(0, Math.floor((x - R) / cw));
      const c1 = Math.min(COLS - 1, Math.floor((x + R) / cw));
      const r0 = Math.max(0, Math.floor((y - R) / ch));
      const r1 = Math.min(ROWS - 1, Math.floor((y + R) / ch));
      for (let cc = c0; cc <= c1; cc++) {
        for (let rr = r0; rr <= r1; rr++) {
          const ccx = (cc + 0.5) * cw;
          const ccy = (rr + 0.5) * ch;
          if ((ccx - x) ** 2 + (ccy - y) ** 2 <= R * R) g.marks[rr * COLS + cc] = 1;
        }
      }
      let covered = 0;
      for (let k = 0; k < g.marks.length; k++) covered += g.marks[k];
      if (covered / g.marks.length >= threshold) {
        g.done = true;
        ctx.clearRect(0, 0, cv.width, cv.height);
        maybeFinish();
      }
    });
  };

  const onMirrorDown = (e: React.PointerEvent) => {
    if (doneRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const mirror = mirrorRef.current;
    const scale = stageScale();
    const stageRect = stageRef.current!.getBoundingClientRect();
    let lastX = e.clientX;
    let lastY = e.clientY;
    const moveMirror = (cx: number, cy: number) => {
      if (!mirror) return;
      mirror.style.left = (cx - stageRect.left) / scale - mirror.offsetWidth / 2 + "px";
      mirror.style.top = (cy - stageRect.top) / scale - mirror.offsetHeight / 2 + "px";
      mirror.style.right = "auto";
      mirror.style.bottom = "auto";
    };
    moveMirror(e.clientX, e.clientY);
    stampAt(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - lastX, ev.clientY - lastY);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let s = 1; s <= steps; s++) {
        stampAt(
          lastX + ((ev.clientX - lastX) * s) / steps,
          lastY + ((ev.clientY - lastY) * s) / steps,
        );
      }
      lastX = ev.clientX;
      lastY = ev.clientY;
      moveMirror(ev.clientX, ev.clientY);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div id="rubStage" className="rr-enter">
      <div id="rubImages">
        {pairs.map((p, i) => (
          <div className="rr-slot" key={i}>
            <img className="rr-after" src={p.after} alt="" />
            <canvas
              className="rr-canvas"
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
            />
          </div>
        ))}
      </div>

      <img
        className="rr-mirror"
        ref={mirrorRef}
        src={mirrorImage}
        alt="공감 거울"
        onPointerDown={onMirrorDown}
      />

      <div className="rr-guide">
        <img className="rr-guide-avatar" src="/assets/char/Hati/hati_thinking.png" alt="하티" />
        <div>
          <div className="rr-guide-name">하티</div>
          <div className="rr-guide-text">{text}</div>
        </div>
      </div>

      <div className="rr-sparks" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={`rr-spark s${i}`}>
            ✦
          </span>
        ))}
      </div>
    </div>
  );
}
