// player 이동 계산.
// src/scenes/planet/planet3/world/playermove.ts 이식 — 타입만 제거, 로직 동일.

// 시선 전방으로 distance 만큼 전진. forward = (-sin yaw, -cos yaw) — 카메라 규약과 일치.
export function stepForward(x, z, yaw, distance) {
  return {
    x: x - Math.sin(yaw) * distance,
    z: z - Math.cos(yaw) * distance,
  };
}

// 후보(nx,nz)가 막히면 X만/ Z만 이동해 미끄러진다. 둘 다 막히면 제자리.
export function resolveSlide(x, z, nx, nz, isWalkableAt) {
  if (isWalkableAt(nx, nz)) return { x: nx, z: nz };
  if (isWalkableAt(nx, z)) return { x: nx, z };
  if (isWalkableAt(x, nz)) return { x, z: nz };
  return { x, z };
}
