// 연료 게이지 HUD: 🔋 + passScore칸 분절 게이지.
// src/scenes/planet/planet3/world/scorehud.ts 이식 — 타입만 제거, 로직 동일.
export function createScoreHud(passScore) {
  const el = document.createElement('div');
  el.className = 'score-hud';

  // 왼쪽: 배터리 이모지.
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

  // 오른쪽: 공감 송신기 아이콘 — "송신기를 충전한다"는 의미를 준다.
  const transmitter = document.createElement('img');
  transmitter.className = 'fuel-transmitter';
  transmitter.src = '../../assets/planet3/empathy-transmitter-icon.webp';
  transmitter.alt = '';
  el.appendChild(transmitter);

  function set(score) {
    cells.forEach((c, i) => c.classList.toggle('filled', i < score));
  }
  function remove() { el.remove(); }

  return { element: el, set, remove };
}
