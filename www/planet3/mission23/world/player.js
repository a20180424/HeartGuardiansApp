// src/scenes/planet/planet3/world/player.ts 이식 — 타입만 제거, 로직 동일.
import { worldToAxial, hexKey, axialToWorld } from './hexgrid.js';
import { stepForward, resolveSlide } from './playermove.js';

const WALK_SPEED = 6;    // units/sec
const REVERSE_SPEED = 3; // 후진 속도 — 1인칭에서 뒤가 안 보이므로 전진의 절반으로 천천히
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

    if (throttle !== 0) {
      // throttle 부호가 방향(양수 전진·음수 후진), 후진은 더 느린 속도를 쓴다.
      const speed = throttle > 0 ? WALK_SPEED : REVERSE_SPEED;
      const dist = throttle * speed * dt;
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

  // (tx,tz)를 정면으로 바라보도록 즉시 회전. 팝업으로 입력이 잠겨 update가 멈춘
  // 동안에도 반영되도록 카메라 회전을 바로 적용한다.
  function faceToward(tx, tz) {
    const dx = pos.x - tx;
    const dz = pos.z - tz;
    if (dx === 0 && dz === 0) return; // 완전히 겹치면 방향 불명 → 현재 시선 유지
    yaw = Math.atan2(dx, dz); // forward=(-sin,-cos) 규약에서 (tx,tz)를 향하는 yaw
    camera.rotation.set(0, yaw, 0, 'YXZ');
  }

  return { update, resetTo, faceToward };
}
