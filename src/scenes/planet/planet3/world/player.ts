import type * as THREE from 'three';
import { worldToAxial, hexKey, axialToWorld } from './hexgrid';
import { stepForward, resolveSlide } from './playermove';

const WALK_SPEED = 6;    // units/sec
const TURN_SPEED = 2.5;  // radians/sec (약 140°/s)

// 1인칭 컨트롤러: 시선은 yaw(좌우)만, 이동은 시선 전방으로만.
// update(dt, { throttle 0..1, turn -1..1 })를 매 프레임 호출한다.
export function createPlayer(
  camera: THREE.Camera,
  { size, hexTopY, eyeHeight, walkable, startHex }: {
    size: number;
    hexTopY: number;
    eyeHeight: number;
    walkable: Set<string>;
    startHex: { q: number; r: number };
  }
): { update(dt: number, input: { throttle: number; turn: number }): void } {
  let yaw = 0; // 0 = -Z(월드 중심)를 바라봄
  const start = axialToWorld(startHex.q, startHex.r, size);
  const pos = { x: start.x, z: start.z };

  const isWalkableAt = (x: number, z: number): boolean => {
    const a = worldToAxial(x, z, size);
    return walkable.has(hexKey(a.q, a.r));
  };

  function update(dt: number, input: { throttle: number; turn: number }): void {
    const turn = input ? input.turn : 0;
    const throttle = input ? input.throttle : 0;

    // 좌우 회전(제자리 회전 = 360° 둘러보기 포함). turn 양수 = 우회전.
    yaw -= turn * TURN_SPEED * dt;

    if (throttle > 0) {
      const dist = throttle * WALK_SPEED * dt;
      const cand = stepForward(pos.x, pos.z, yaw, dist);
      const next = resolveSlide(pos.x, pos.z, cand.x, cand.z, isWalkableAt);
      pos.x = next.x;
      pos.z = next.z;
    }

    camera.position.set(pos.x, hexTopY + eyeHeight, pos.z);
    camera.rotation.set(0, yaw, 0, 'YXZ'); // pitch/roll 0 — 수평 시선 고정
  }

  return { update };
}
