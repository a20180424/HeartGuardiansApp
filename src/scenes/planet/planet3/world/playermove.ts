// player 이동 계산 (THREE 비의존, 단위 테스트용으로 분리).

// 시선 전방으로 distance 만큼 전진. forward = (-sin yaw, -cos yaw) — 카메라 규약과 일치.
export function stepForward(x: number, z: number, yaw: number, distance: number): { x: number; z: number } {
  return {
    x: x - Math.sin(yaw) * distance,
    z: z - Math.cos(yaw) * distance,
  };
}

// 후보(nx,nz)가 막히면 X만/ Z만 이동해 미끄러진다. 둘 다 막히면 제자리.
// isWalkableAt(worldX, worldZ) -> boolean.
export function resolveSlide(
  x: number,
  z: number,
  nx: number,
  nz: number,
  isWalkableAt: (x: number, z: number) => boolean,
): { x: number; z: number } {
  if (isWalkableAt(nx, nz)) return { x: nx, z: nz };
  if (isWalkableAt(nx, z)) return { x: nx, z };
  if (isWalkableAt(x, nz)) return { x, z: nz };
  return { x, z };
}
