// src/scenes/planet/planet3/world/player.ts 이식 — 타입만 제거, 로직 동일.
import { worldToAxial, hexKey, axialToWorld } from './hexgrid.js';
import { stepForward, resolveSlide } from './playermove.js';

const WALK_SPEED = 6;    // units/sec
const TURN_SPEED = 2.5;  // radians/sec (약 140°/s)

// 1인칭 컨트롤러: 시선은 yaw(좌우)만, 이동은 시선 전방으로만.
export function createPlayer(camera, { size, hexTopY, eyeHeight, walkable, startHex }) {
  let yaw = 0; // 0 = -Z(월드 중심)를 바라봄
  const start = axialToWorld(startHex.q, startHex.r, size);
  const pos = { x: start.x, z: start.z };

  const isWalkableAt = (x, z) => {
    const a = worldToAxial(x, z, size);
    return walkable.has(hexKey(a.q, a.r));
  };

  function update(dt, input) {
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

  // 지정 hex로 순간이동(+ 정면 초기화). stage1→stage2 전환 시 시작 위치 고정에 사용.
  function resetTo(hex) {
    const p = axialToWorld(hex.q, hex.r, size);
    pos.x = p.x;
    pos.z = p.z;
    yaw = 0; // 0 = -Z(월드 중심)를 바라봄 — 초기 스폰과 동일한 방향
  }

  return { update, resetTo };
}
