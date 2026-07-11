import { describe, it, expect } from 'vitest';
import { hexKey, axialToWorld, worldToAxial, hexRound, neighbors, hexDistance, fieldCoords, findPath } from './hexgrid';

const SIZE = 2;

describe('hexKey', () => {
  it('formats coords', () => { expect(hexKey(1, -2)).toBe('1,-2'); });
});

describe('axialToWorld (flat-top, size=2)', () => {
  it('origin maps to origin', () => {
    expect(axialToWorld(0, 0, SIZE)).toEqual({ x: 0, z: 0 });
  });
  it('q axis spacing is 1.5*size', () => {
    expect(axialToWorld(1, 0, SIZE).x).toBeCloseTo(3, 5);
  });
  it('q=1 shifts z by half a row', () => {
    expect(axialToWorld(1, 0, SIZE).z).toBeCloseTo(Math.sqrt(3), 5);
  });
});

describe('worldToAxial roundtrip', () => {
  it('recovers integer coords', () => {
    for (const [q, r] of [[0, 0], [2, -1], [-3, 4], [5, 5], [-4, -2]]) {
      const { x, z } = axialToWorld(q, r, SIZE);
      expect(worldToAxial(x, z, SIZE)).toEqual({ q, r });
    }
  });
});

describe('hexRound', () => {
  it('snaps a near-center point to origin', () => {
    expect(hexRound(0.1, -0.1)).toEqual({ q: 0, r: 0 });
  });
});

describe('neighbors', () => {
  it('returns exactly 6', () => {
    expect(neighbors(0, 0)).toHaveLength(6);
  });
  it('each neighbor is distance 1 away', () => {
    for (const n of neighbors(3, -1)) {
      expect(hexDistance({ q: 3, r: -1 }, n)).toBe(1);
    }
  });
});

describe('hexDistance', () => {
  it('same hex is 0', () => { expect(hexDistance({ q: 2, r: 2 }, { q: 2, r: 2 })).toBe(0); });
  it('known distance', () => { expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3); });
});

describe('fieldCoords', () => {
  it('radius 0 = 1 hex', () => { expect(fieldCoords(0)).toHaveLength(1); });
  it('radius 1 = 7 hexes', () => { expect(fieldCoords(1)).toHaveLength(7); });
  it('radius 2 = 19 hexes', () => { expect(fieldCoords(2)).toHaveLength(19); });
  it('all within radius of center', () => {
    for (const c of fieldCoords(3)) {
      expect(hexDistance({ q: 0, r: 0 }, c)).toBeLessThanOrEqual(3);
    }
  });
});

describe('findPath', () => {
  const openAll = () => true;

  it('start === goal returns single hex', () => {
    expect(findPath({ q: 0, r: 0 }, { q: 0, r: 0 }, openAll)).toEqual([{ q: 0, r: 0 }]);
  });

  it('finds a straight path on open grid', () => {
    const path = findPath({ q: 0, r: 0 }, { q: 3, r: 0 }, openAll)!;
    expect(path[0]).toEqual({ q: 0, r: 0 });
    expect(path[path.length - 1]).toEqual({ q: 3, r: 0 });
    // each consecutive pair is adjacent
    for (let i = 1; i < path.length; i++) {
      expect(hexDistance(path[i - 1], path[i])).toBe(1);
    }
  });

  it('routes around a blocked hex', () => {
    // block the direct neighbor (1,0); path must detour but still reach (2,0)
    const blocked = new Set(['1,0']);
    const isWalkable = (q: number, r: number) => !blocked.has(`${q},${r}`);
    const path = findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, isWalkable);
    expect(path).not.toBeNull();
    expect(path!.some((h) => h.q === 1 && h.r === 0)).toBe(false);
    expect(path![path!.length - 1]).toEqual({ q: 2, r: 0 });
  });

  it('returns null when goal is unreachable (bounded field)', () => {
    // A finite walkable field so the search space is bounded. The goal sits
    // inside the field but every one of its six neighbors is removed, walling
    // it off — so there is no path, and A* terminates (finite walkable set).
    const goal = { q: 2, r: 0 };
    const walls = new Set(['3,0', '3,-1', '2,-1', '1,0', '1,1', '2,1']); // the 6 neighbors of (2,0)
    const walkable = new Set(
      fieldCoords(3)
        .map((c) => hexKey(c.q, c.r))
        .filter((k) => !walls.has(k))
    );
    const isWalkable = (q: number, r: number) => walkable.has(hexKey(q, r));
    expect(isWalkable(goal.q, goal.r)).toBe(true); // goal is walkable...
    expect(findPath({ q: 0, r: 0 }, goal, isWalkable)).toBeNull(); // ...but walled off
  });

  it('returns null when goal itself is blocked', () => {
    const isWalkable = (q: number, r: number) => !(q === 2 && r === 0);
    expect(findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, isWalkable)).toBeNull();
  });
});
