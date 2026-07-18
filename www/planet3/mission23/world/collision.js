// Footprint-based hex collision helpers.
// src/scenes/planet/planet3/world/collision.ts 이식 — 타입만 제거, 로직 동일.
//
// Obstacles block every hex their footprint covers — not just the single hex
// they stand on — so wide rocks / the monument can't be walked through at their
// overhanging edges.

import { axialToWorld, worldToAxial, hexKey, neighbors } from './hexgrid.js';

// Hexes whose CENTER lies within (R + inradius) of the object center at (x, z),
// where inradius = size*√3/2 is the hex center→edge distance.
export function coveredHexes(x, z, R, size) {
  const inradius = (size * Math.sqrt(3)) / 2;
  const reach = R + inradius;
  const c = worldToAxial(x, z, size);
  const span = Math.ceil(reach / size) + 2;
  const out = [];
  for (let dq = -span; dq <= span; dq++) {
    for (let dr = -span; dr <= span; dr++) {
      const q = c.q + dq;
      const r = c.r + dr;
      const w = axialToWorld(q, r, size);
      const ddx = w.x - x;
      const ddz = w.z - z;
      if (ddx * ddx + ddz * ddz < reach * reach) out.push({ q, r });
    }
  }
  return out;
}

// Flood-fill the walkable set from startKey; returns the Set of reachable keys.
export function reachableFrom(startKey, walkable) {
  const seen = new Set();
  if (!walkable.has(startKey)) return seen;
  const stack = [startKey];
  seen.add(startKey);
  while (stack.length) {
    const k = stack.pop();
    const [q, r] = k.split(',').map(Number);
    for (const n of neighbors(q, r)) {
      const nk = hexKey(n.q, n.r);
      if (walkable.has(nk) && !seen.has(nk)) {
        seen.add(nk);
        stack.push(nk);
      }
    }
  }
  return seen;
}
