// 연료 게이지 HUD: 🔋 + passScore칸 분절 게이지. 따듯한 말을 충전할수록 칸이 찬다.
export function createScoreHud(passScore: number): {
  element: HTMLElement;
  set(score: number): void;
  remove(): void;
} {
  const el = document.createElement('div');
  el.className = 'score-hud';

  const icon = document.createElement('span');
  icon.className = 'fuel-icon';
  icon.textContent = '🔋';
  el.appendChild(icon);

  const gauge = document.createElement('div');
  gauge.className = 'fuel-gauge';
  const cells: HTMLSpanElement[] = [];
  for (let i = 0; i < passScore; i++) {
    const c = document.createElement('span');
    c.className = 'fuel-cell';
    gauge.appendChild(c);
    cells.push(c);
  }
  el.appendChild(gauge);

  // score칸까지 채운다(나머지는 비움). CSS 트랜지션으로 충전/방전이 보인다.
  function set(score: number): void {
    cells.forEach((c, i) => c.classList.toggle('filled', i < score));
  }
  function remove(): void { el.remove(); }

  return { element: el, set, remove };
}
