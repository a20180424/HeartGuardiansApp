// Flat-top hexagons in axial (q, r) coordinates.
// size = center-to-corner distance. width(x)=2*size, height(z)=sqrt(3)*size.

const SQRT3 = Math.sqrt(3);

export interface AxialCoord {
  q: number;
  r: number;
}

export interface WorldCoord {
  x: number;
  z: number;
}

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function axialToWorld(q: number, r: number, size: number): WorldCoord {
  const x = size * 1.5 * q;
  const z = size * SQRT3 * (r + q / 2);
  return { x, z };
}

export function hexRound(qf: number, rf: number): AxialCoord {
  // axial -> cube, round, fix the largest rounding drift
  let x = qf;
  let z = rf;
  let y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx + 0, r: rz + 0 };
}

export function worldToAxial(x: number, z: number, size: number): AxialCoord {
  const qf = (2 / 3) * x / size;
  const rf = ((-1 / 3) * x + (SQRT3 / 3) * z) / size;
  return hexRound(qf, rf);
}

const DIRS = [
  [+1, 0], [+1, -1], [0, -1],
  [-1, 0], [-1, +1], [0, +1],
];

export function neighbors(q: number, r: number): AxialCoord[] {
  return DIRS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  return (
    Math.abs(a.q - b.q) +
    Math.abs(a.q + a.r - b.q - b.r) +
    Math.abs(a.r - b.r)
  ) / 2;
}

export function fieldCoords(radius: number): AxialCoord[] {
  const out: AxialCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) out.push({ q, r });
  }
  return out;
}

// A* over a walkable hex region. `isWalkable(q, r)` must describe a FINITE
// region (e.g. a bounded field) — a walled-off goal inside an unbounded
// walkable area would expand forever. Game callers pass a finite Set, so this
// holds. Returns the start->goal path (inclusive), or null if blocked/unreachable.
export function findPath(
  start: AxialCoord,
  goal: AxialCoord,
  isWalkable: (q: number, r: number) => boolean
): AxialCoord[] | null {
  if (!isWalkable(start.q, start.r) || !isWalkable(goal.q, goal.r)) return null;
  const startK = hexKey(start.q, start.r);
  const goalK = hexKey(goal.q, goal.r);
  if (startK === goalK) return [{ q: start.q, r: start.r }];

  const openF = new Map<string, number>([[startK, hexDistance(start, goal)]]); // key -> f
  const gScore = new Map<string, number>([[startK, 0]]);
  const cameFrom = new Map<string, string>(); // key -> parent key

  while (openF.size) {
    // pick open node with lowest f
    let curK: string | null = null;
    let best = Infinity;
    for (const [k, f] of openF) if (f < best) { best = f; curK = k; }

    if (curK === goalK) {
      const path: AxialCoord[] = [];
      let k: string | undefined = goalK;
      while (k !== undefined) {
        const [q, r] = k.split(',').map(Number);
        path.unshift({ q, r });
        k = cameFrom.get(k);
      }
      return path;
    }

    openF.delete(curK as string);
    const [cq, cr] = (curK as string).split(',').map(Number);
    const g = gScore.get(curK as string) as number;

    for (const nb of neighbors(cq, cr)) {
      if (!isWalkable(nb.q, nb.r)) continue;
      const nbK = hexKey(nb.q, nb.r);
      const tentative = g + 1;
      if (tentative < (gScore.get(nbK) ?? Infinity)) {
        cameFrom.set(nbK, curK as string);
        gScore.set(nbK, tentative);
        openF.set(nbK, tentative + hexDistance(nb, goal));
      }
    }
  }
  return null;
}
