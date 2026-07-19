// 화면 가상 조이스틱: 터치·마우스 공용(Pointer 이벤트).
// src/scenes/planet/planet3/world/joystick.ts 이식 — 타입만 제거, 로직 동일.

// knob 오프셋(dx,dy px, y는 아래가 +)을 { throttle -1..1, turn -1..1 }로 변환.
// throttle 양수 = 전진(위), 음수 = 후진(아래).
export function joystickVector(dx, dy, radius, deadzone = 0.12) {
  const dist = Math.hypot(dx, dy);
  if (dist < radius * deadzone) return { throttle: 0, turn: 0 };
  const s = dist > radius ? radius / dist : 1; // radius 밖은 경계로 클램프
  const cx = dx * s;
  const cy = dy * s;
  return {
    turn: cx / radius,
    throttle: -cy / radius,
  };
}

// 화면 좌하단 고정 조이스틱 위젯. element를 컨테이너에 붙이고, value를 매 프레임 읽는다.
export function createJoystick({ radius = 50 } = {}) {
  const base = document.createElement("div");
  base.className = "joystick";
  const knob = document.createElement("div");
  knob.className = "knob";
  base.appendChild(knob);

  const value = { throttle: 0, turn: 0 };
  let activeId = null;

  const setKnob = (x, y) => {
    knob.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = () => {
    value.throttle = 0;
    value.turn = 0;
    setKnob(0, 0);
  };

  function handle(e) {
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

  base.addEventListener("pointerdown", (e) => {
    if (activeId !== null) return;
    activeId = e.pointerId;
    try {
      base.setPointerCapture(e.pointerId);
    } catch {
      /* best-effort */
    }
    handle(e);
  });
  base.addEventListener("pointermove", (e) => {
    if (e.pointerId === activeId) handle(e);
  });
  const end = (e) => {
    if (e.pointerId === activeId) {
      activeId = null;
      reset();
    }
  };
  base.addEventListener("pointerup", end);
  base.addEventListener("pointercancel", end);

  return { element: base, value };
}
