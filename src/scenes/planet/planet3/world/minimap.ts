// Top-down, north-up minimap drawn on a small 2D canvas.
//   - field area   : translucent disc (the whole play area)
//   - monument     : teal diamond at world origin (map center)
//   - player       : orange triangle at the player's position, pointing the way
//                    the camera faces (the map itself never rotates)
//
// createMinimap({ worldExtent }) -> { element, update(px, pz, yaw) }
//   worldExtent : world distance from the center to the field edge (map radius).
//   update      : call each frame with the player's world x/z, camera yaw,
//                 and the remaining speech-bubble world positions ([{x,z}]).
export function createMinimap({ worldExtent }: { worldExtent: number }): {
  element: HTMLElement;
  update(px: number, pz: number, yaw: number, points: { x: number; z: number }[]): void;
} {
  const R = 150; // css px (square)
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const center = R / 2;
  const mapRadius = R / 2 - 9; // leave room for the ring border
  const scale = mapRadius / worldExtent;

  const canvas = document.createElement('canvas');
  canvas.className = 'minimap';
  canvas.width = R * dpr;
  canvas.height = R * dpr;
  canvas.style.width = `${R}px`;
  canvas.style.height = `${R}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  function update(px: number, pz: number, yaw: number, bubbles: { x: number; z: number }[] = []): void {
    ctx.clearRect(0, 0, R, R);

    // Field disc — clip everything else inside it.
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, mapRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(226, 237, 248, 0.92)'; // near-opaque so the 3D scene doesn't bleed through
    ctx.fill();
    ctx.clip();

    // Monument marker at world origin (map center) — teal diamond.
    ctx.fillStyle = '#2fb3c4';
    ctx.beginPath();
    ctx.moveTo(center, center - 5);
    ctx.lineTo(center + 5, center);
    ctx.lineTo(center, center + 5);
    ctx.lineTo(center - 5, center);
    ctx.closePath();
    ctx.fill();

    // Remaining speech bubbles — small purple dots (no good/bad distinction,
    // so the child still has to read the sentence to decide). Consumed bubbles
    // drop out of the list, so they vanish here automatically.
    ctx.fillStyle = '#7b61ff';
    for (const b of bubbles) {
      ctx.beginPath();
      ctx.arc(center + b.x * scale, center + b.z * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player: world +z maps to screen-down; north (−z) is up.
    const mx = center + px * scale;
    const my = center + pz * scale;
    const fx = -Math.sin(yaw); // forward direction on the map
    const fz = -Math.cos(yaw);
    const rx = -fz; // perpendicular ("right")
    const rz = fx;
    ctx.beginPath();
    ctx.moveTo(mx + fx * 8, my + fz * 8); // tip
    ctx.lineTo(mx - fx * 5 + rx * 4.5, my - fz * 5 + rz * 4.5);
    ctx.lineTo(mx - fx * 5 - rx * 4.5, my - fz * 5 - rz * 4.5);
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
