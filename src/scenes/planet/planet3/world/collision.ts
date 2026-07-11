// Footprint-based hex collision helpers (THREE-free, unit-tested).
//
// Obstacles block every hex their footprint covers — not just the single hex
// they stand on — so wide rocks / the monument can't be walked through at their
// overhanging edges. See docs/superpowers/specs/2026-07-08-world-footprint-collision-design.md.

import { axialToWorld, worldToAxial, hexKey, neighbors, type AxialCoord } from './hexgrid';

// Hexes whose CENTER lies within (R + inradius) of the object center at (x, z),
// where inradius = size*√3/2 is the hex center→edge distance. Requiring the
// object's footprint circle (radius R) to reach a hex's inscribed circle before
// blocking it means a still-walkable hex can never visually overlap the object
// (the player is a point confined to a walkable hex). This is the "generous"
// margin: zero perceptible pass-through, at the cost of a tiny invisible skirt.
export function coveredHexes(x: number, z: number, R: number, size: number): AxialCoord[] {
  const inradius = (size * Math.sqrt(3)) / 2;
  const reach = R + inradius;
  const c = worldToAxial(x, z, size);
  // Axial window guaranteed to contain the reach circle (over-scans slightly;
  // the exact distance test below is what decides membership).
  const span = Math.ceil(reach / size) + 2;
  const out: AxialCoord[] = [];
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
// Used to prune walkable hexes the player can never actually reach (islands
// walled off by footprints) and to verify the spawn isn't boxed in.
export function reachableFrom(startKey: string, walkable: Set<string>): Set<string> {
  const seen = new Set<string>();
  if (!walkable.has(startKey)) return seen;
  const stack = [startKey];
  seen.add(startKey);
  while (stack.length) {
    const k = stack.pop() as string;
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
