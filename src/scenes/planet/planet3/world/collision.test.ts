import { describe, it, expect } from 'vitest';
import { coveredHexes, reachableFrom } from './collision';
import { axialToWorld, hexKey, neighbors } from './hexgrid';

const SIZE = 2;
const INRADIUS = (SIZE * Math.sqrt(3)) / 2; // 1.732

// world distance from a hex center to an object center
const distToHex = (q: number, r: number, x: number, z: number) => {
  const w = axialToWorld(q, r, SIZE);
  return Math.hypot(w.x - x, w.z - z);
};

describe('coveredHexes', () => {
  it('a small footprint (R < inradius) covers only its own hex', () => {
    const { x, z } = axialToWorld(0, 0, SIZE);
    const hexes = coveredHexes(x, z, 0.5, SIZE);
    expect(hexes).toEqual([{ q: 0, r: 0 }]);
  });

  it('a large footprint covers the center hex and all six neighbors', () => {
    const { x, z } = axialToWorld(0, 0, SIZE);
    const hexes = coveredHexes(x, z, 5, SIZE);
    const keys = new Set(hexes.map((h) => hexKey(h.q, h.r)));
    expect(keys.has(hexKey(0, 0))).toBe(true);
    for (const n of neighbors(0, 0)) {
      expect(keys.has(hexKey(n.q, n.r))).toBe(true);
    }
  });

  it('every returned hex center is within R + inradius of the object', () => {
    const { x, z } = axialToWorld(3, -1, SIZE); // arbitrary non-origin object
    const R = 4;
    const hexes = coveredHexes(x, z, R, SIZE);
    for (const h of hexes) {
      expect(distToHex(h.q, h.r, x, z)).toBeLessThan(R + INRADIUS);
    }
  });

  it('excludes hexes beyond the reach and finds all within it (no window clipping)', () => {
    const { x, z } = axialToWorld(0, 0, SIZE);
    const R = 5;
    const reach = R + INRADIUS;
    const hexes = coveredHexes(x, z, R, SIZE);
    const keys = new Set(hexes.map((h) => hexKey(h.q, h.r)));
    // brute-force truth over a wide axial window
    for (let q = -10; q <= 10; q++) {
      for (let r = -10; r <= 10; r++) {
        const inside = distToHex(q, r, x, z) < reach;
        expect(keys.has(hexKey(q, r))).toBe(inside);
      }
    }
  });
});

describe('reachableFrom', () => {
  const setOf = (...ks: string[]) => new Set(ks);

  it('returns empty when start is not walkable', () => {
    expect(reachableFrom('0,0', setOf('1,0')).size).toBe(0);
  });

  it('reaches a connected chain', () => {
    // (0,0)-(1,0)-(2,0) are pairwise adjacent along +q
    const walkable = setOf('0,0', '1,0', '2,0');
    const seen = reachableFrom('0,0', walkable);
    expect(seen).toEqual(setOf('0,0', '1,0', '2,0'));
  });

  it('does not reach an isolated island', () => {
    // (0,0)-(1,0) connected; (5,0) is far and isolated
    const walkable = setOf('0,0', '1,0', '5,0');
    const seen = reachableFrom('0,0', walkable);
    expect(seen.has('5,0')).toBe(false);
    expect(seen).toEqual(setOf('0,0', '1,0'));
  });
});
