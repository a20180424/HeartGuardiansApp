// 화면 가상 조이스틱: 터치·마우스 공용(Pointer 이벤트).
// joystickVector는 THREE 비의존 순수 함수라 단위 테스트가 쉽다.

// knob 오프셋(dx,dy px, y는 아래가 +)을 { throttle 0..1, turn -1..1 }로 변환.
// 위(dy<0)=전진, 아래=0(전진 전용), 좌우=회전. deadzone 이내는 중립.
export function joystickVector(
  dx: number,
  dy: number,
  radius: number,
  deadzone = 0.12,
): { throttle: number; turn: number } {
  const dist = Math.hypot(dx, dy);
  if (dist < radius * deadzone) return { throttle: 0, turn: 0 };
  const s = dist > radius ? radius / dist : 1; // radius 밖은 경계로 클램프
  const cx = dx * s;
  const cy = dy * s;
  return {
    turn: cx / radius,
    throttle: Math.max(0, -cy / radius),
  };
}

// 화면 좌하단 고정 조이스틱 위젯. element를 #app에 붙이고, value를 매 프레임 읽는다.
// 한 번에 한 포인터만 추적 — 아이들이 여러 손가락으로 눌러도 상태가 깨지지 않게.
export function createJoystick(
  { radius = 50 }: { radius?: number } = {},
): { element: HTMLDivElement; value: { throttle: number; turn: number } } {
  const base = document.createElement("div");
  base.className = "joystick";
  const knob = document.createElement("div");
  knob.className = "knob";
  base.appendChild(knob);

  const value = { throttle: 0, turn: 0 };
  let activeId: number | null = null;

  const setKnob = (x: number, y: number): void => {
    knob.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = (): void => {
    value.throttle = 0;
    value.turn = 0;
    setKnob(0, 0);
  };

  function handle(e: PointerEvent): void {
    const rect = base.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    const s = dist > radius ? radius / dist : 1; // knob는 원 안에서만 움직임
    setKnob(dx * s, dy * s);
    const v = joystickVector(dx, dy, radius);
    value.throttle = v.throttle;
    value.turn = v.turn;
  }

  base.addEventListener("pointerdown", (e: PointerEvent) => {
    if (activeId !== null) return;
    activeId = e.pointerId;
    try {
      base.setPointerCapture(e.pointerId);
    } catch {
      /* best-effort */
    }
    handle(e);
  });
  base.addEventListener("pointermove", (e: PointerEvent) => {
    if (e.pointerId === activeId) handle(e);
  });
  const end = (e: PointerEvent): void => {
    if (e.pointerId === activeId) {
      activeId = null;
      reset();
    }
  };
  base.addEventListener("pointerup", end);
  base.addEventListener("pointercancel", end);

  return { element: base, value };
}
