// 연료 게이지 HUD: 🔋 + passScore칸 분절 게이지.
// src/scenes/planet/planet3/world/scorehud.ts 이식 — 타입만 제거, 로직 동일.
export function createScoreHud(passScore) {
  const el = document.createElement('div');
  el.className = 'score-hud';

  const icon = document.createElement('span');
  icon.className = 'fuel-icon';
  icon.textContent = '🔋';
  el.appendChild(icon);

  const gauge = document.createElement('div');
  gauge.className = 'fuel-gauge';
  const cells = [];
  for (let i = 0; i < passScore; i++) {
    const c = document.createElement('span');
    c.className = 'fuel-cell';
    gauge.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gauge);

  function set(score) {
    cells.forEach((c, i) => c.classList.toggle('filled', i < score));
  }
  function remove() { el.remove(); }

  return { element: el, set, remove };
}
