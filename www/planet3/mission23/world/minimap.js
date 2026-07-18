// Top-down, north-up minimap drawn on a small 2D canvas.
// src/scenes/planet/planet3/world/minimap.ts 이식 — 타입만 제거, 로직 동일.
export function createMinimap({ worldExtent }) {
  const R = 225; // css px (square) — 하단 이동 후 가독성 위해 1.5배 확대
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const center = R / 2;
  const mapRadius = R / 2 - 9; // leave room for the ring border
  const scale = mapRadius / worldExtent;
  const k = R / 150; // 마커 크기 스케일 — 원래 R=150 기준 값을 함께 키운다

  const canvas = document.createElement('canvas');
  canvas.className = 'minimap';
  canvas.width = R * dpr;
  canvas.height = R * dpr;
  canvas.style.width = `${R}px`;
  canvas.style.height = `${R}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  function update(px, pz, yaw, bubbles = [], npcs = []) {
    ctx.clearRect(0, 0, R, R);

    // Field disc — clip everything else inside it.
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, mapRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(226, 237, 248, 0.92)';
    ctx.fill();
    ctx.clip();

    // Monument marker at world origin (map center) — teal diamond.
    ctx.fillStyle = '#2fb3c4';
    ctx.beginPath();
    ctx.moveTo(center, center - 5 * k);
    ctx.lineTo(center + 5 * k, center);
    ctx.lineTo(center, center + 5 * k);
    ctx.lineTo(center - 5 * k, center);
    ctx.closePath();
    ctx.fill();

    // Remaining speech bubbles — small purple dots.
    ctx.fillStyle = '#7b61ff';
    for (const b of bubbles) {
      ctx.beginPath();
      ctx.arc(center + b.x * scale, center + b.z * scale, 3 * k, 0, Math.PI * 2);
      ctx.fill();
    }

    // NPC 마커 — 미완료(파랑)/완료(초록).
    for (const n of npcs) {
      ctx.beginPath();
      ctx.arc(center + n.x * scale, center + n.z * scale, 4.5 * k, 0, Math.PI * 2);
      ctx.fillStyle = n.done ? '#28c76f' : '#4a9df0';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player: world +z maps to screen-down; north (−z) is up.
    const mx = center + px * scale;
    const my = center + pz * scale;
    const fx = -Math.sin(yaw); // forward direction on the map
    const fz = -Math.cos(yaw);
    const rx = -fz; // perpendicular ("right")
    const rz = fx;
    ctx.beginPath();
    ctx.moveTo(mx + fx * 8 * k, my + fz * 8 * k); // tip
    ctx.lineTo(mx - fx * 5 * k + rx * 4.5 * k, my - fz * 5 * k + rz * 4.5 * k);
    ctx.lineTo(mx - fx * 5 * k - rx * 4.5 * k, my - fz * 5 * k - rz * 4.5 * k);
    ctx.closePath();
    ctx.fillStyle = '#ff6b4a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Ring border on top.
    ctx.beginPath();
    ctx.arc(center, center, mapRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  return { element: canvas, update };
}
