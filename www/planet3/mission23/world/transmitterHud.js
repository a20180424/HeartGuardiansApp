// stage2 공감 송신기 HUD: 하단 가운데 상시 표시 + 대화 중 active 애니메이션.
// scorehud.js / minimap.js 와 같은 독립 위젯 패턴 — 다른 페이지·모듈과 격리.
//   createTransmitterHud() -> { element, setActive(on), remove() }
export function createTransmitterHud() {
  const el = document.createElement('div');
  el.className = 'transmitter-hud';

  // 안테나 위쪽으로 퍼지는 신호파 링 3개(각기 다른 delay 로 순차 방사).
  const waves = document.createElement('div');
  waves.className = 'transmitter-hud__waves';
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('span');
    ring.className = 'transmitter-hud__ring';
    waves.appendChild(ring);
  }
  el.appendChild(waves);

  // stage1 충전바에서 쓴 동일 에셋 재사용.
  const img = document.createElement('img');
  img.className = 'transmitter-hud__img';
  img.src = '../../assets/planet3/empathy-transmitter-icon.webp';
  img.alt = '';
  el.appendChild(img);

  function setActive(on) { el.classList.toggle('active', !!on); }
  function remove() { el.remove(); }

  return { element: el, setActive, remove };
}
