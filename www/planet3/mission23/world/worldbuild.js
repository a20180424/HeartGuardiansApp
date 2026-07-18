// src/scenes/planet/planet3/world/worldbuild.ts 이식 — 타입만 제거, 로직 동일.
import * as THREE from 'three';
import { fieldCoords, axialToWorld, hexKey } from './hexgrid.js';
import { coveredHexes, reachableFrom } from './collision.js';
import { MODEL_URLS } from './assets.js';

// Interior obstacle spawn rate.
const OBSTACLE_PROB = 0.1;
// Objects shorter than this are decoration the child walks over; they block nothing.
const WALKOVER_HEIGHT = 1.0;
// Keep a clear pocket around the spawn hex (in hex distance).
const SPAWN_CLEAR = 3;

// Horizontal footprint radius (rotation-invariant) and height of a loaded template.
function footprint(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  return {
    radius: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2,
    height: b.max.y - b.min.y,
  };
}

// Small deterministic PRNG so the layout is stable between reloads.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TREES = [MODEL_URLS.tree01, MODEL_URLS.tree02a, MODEL_URLS.tree02b, MODEL_URLS.tree02c];
const ROCKS = [MODEL_URLS.rock01, MODEL_URLS.snowRock01, MODEL_URLS.snowRock02];
const EDGE_ROCK = MODEL_URLS.edgeRock;
const MONUMENT = MODEL_URLS.monument;

// Bake each mesh of a loaded template into a reusable base matrix.
function collectMeshes(template, align) {
  template.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(template);
  const center = box.getCenter(new THREE.Vector3());
  const anchorY = align === 'top' ? box.max.y : box.min.y;
  const meshes = [];
  template.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const base = new THREE.Matrix4()
      .makeTranslation(-center.x, -anchorY, -center.z)
      .multiply(o.matrixWorld);
    meshes.push({ geometry: o.geometry, material: o.material, base });
  });
  return meshes;
}

// placements: [{ x, z, y?, rotY?, scale? }]  -> one InstancedMesh per template mesh
function addInstances(scene, meshes, placements, { castShadow = true, receiveShadow = true } = {}) {
  const t = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const scl = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  for (const mesh of meshes) {
    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, placements.length);
    inst.castShadow = castShadow;
    inst.receiveShadow = receiveShadow;
    placements.forEach((p, i) => {
      t.makeTranslation(p.x, p.y ?? 0, p.z);
      rot.makeRotationY(p.rotY ?? 0);
      const s = p.scale ?? 1;
      scl.makeScale(s, s, s);
      m.copy(t).multiply(rot).multiply(scl).multiply(mesh.base);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
}

const TILE_A = MODEL_URLS.hexA;
const TILE_B = MODEL_URLS.hexB;

export async function buildTerrain(scene, loader, { radius, size }) {
  const coords = fieldCoords(radius);

  const [gltfA, gltfB] = await Promise.all([
    loader.loadAsync(TILE_A),
    loader.loadAsync(TILE_B),
  ]);
  const meshesA = collectMeshes(gltfA.scene, 'top');
  const meshesB = collectMeshes(gltfB.scene, 'top');

  // Alternate the two tile variants for a bit of visual variety.
  const placeA = [];
  const placeB = [];
  for (const { q, r } of coords) {
    const { x, z } = axialToWorld(q, r, size);
    ((q + r) % 2 === 0 ? placeA : placeB).push({ x, z });
  }
  addInstances(scene, meshesA, placeA, { castShadow: false });
  addInstances(scene, meshesB, placeB, { castShadow: false });

  // --- obstacles + decoration -------------------------------------------
  const rng = mulberry32(20260708);
  const startQ = 0, startR = 7;            // must match START_HEX in mountWorld.js
  const startKey = hexKey(startQ, startR); // kept walkable
  const hexDist = (q, r) => (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
  const distTo = (q, r, bq, br) =>
    (Math.abs(q - bq) + Math.abs(q + r - bq - br) + Math.abs(r - br)) / 2;

  // Choose placements first (need the loaded templates to know footprints).
  const treePlace = TREES.map(() => []);
  const rockPlace = ROCKS.map(() => []);
  const edgePlace = [];
  const borderKeys = new Set(); // outer ring: blocked per-hex

  for (const { q, r } of coords) {
    const k = hexKey(q, r);
    if (k === hexKey(0, 0) || k === startKey) continue; // monument / spawn
    const { x, z } = axialToWorld(q, r, size);
    if (hexDist(q, r) === radius) {
      borderKeys.add(k);
      edgePlace.push({ x, z, rotY: rng() * Math.PI * 2, scale: 1 });
    } else if (distTo(q, r, startQ, startR) > SPAWN_CLEAR && rng() < OBSTACLE_PROB) {
      if (rng() < 0.6) {
        const idx = Math.floor(rng() * TREES.length);
        treePlace[idx].push({ x, z, rotY: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.3 });
      } else {
        const idx = Math.floor(rng() * ROCKS.length);
        rockPlace[idx].push({ x, z, rotY: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.4 });
      }
    }
  }

  // load prop templates
  const [treeGltfs, rockGltfs, edgeGltf, monumentGltf] = await Promise.all([
    Promise.all(TREES.map((url) => loader.loadAsync(url))),
    Promise.all(ROCKS.map((url) => loader.loadAsync(url))),
    loader.loadAsync(EDGE_ROCK),
    loader.loadAsync(MONUMENT),
  ]);

  treeGltfs.forEach((g, i) => {
    if (treePlace[i].length) addInstances(scene, collectMeshes(g.scene, 'bottom'), treePlace[i]);
  });
  rockGltfs.forEach((g, i) => {
    if (rockPlace[i].length) addInstances(scene, collectMeshes(g.scene, 'bottom'), rockPlace[i]);
  });
  if (edgePlace.length) addInstances(scene, collectMeshes(edgeGltf.scene, 'bottom'), edgePlace);

  // monument centerpiece (single instance; keep its own lights/materials)
  const monFp = footprint(monumentGltf.scene);
  {
    const box = new THREE.Box3().setFromObject(monumentGltf.scene);
    const c = box.getCenter(new THREE.Vector3());
    monumentGltf.scene.position.set(-c.x, -box.min.y, -c.z);
    monumentGltf.scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(monumentGltf.scene);
  }

  // Block every hex an obstacle's FOOTPRINT covers (not just its center hex).
  const blocked = new Set(borderKeys);
  const blockFootprint = (x, z, R) => {
    for (const h of coveredHexes(x, z, R, size)) {
      const k = hexKey(h.q, h.r);
      if (k !== startKey && hexDist(h.q, h.r) <= radius) blocked.add(k);
    }
  };
  const treeFp = treeGltfs.map((g) => footprint(g.scene));
  const rockFp = rockGltfs.map((g) => footprint(g.scene));
  treePlace.forEach((places, i) => {
    if (treeFp[i].height < WALKOVER_HEIGHT) return;
    for (const p of places) blockFootprint(p.x, p.z, treeFp[i].radius * (p.scale ?? 1));
  });
  rockPlace.forEach((places, i) => {
    if (rockFp[i].height < WALKOVER_HEIGHT) return;
    for (const p of places) blockFootprint(p.x, p.z, rockFp[i].radius * (p.scale ?? 1));
  });
  blockFootprint(0, 0, monFp.radius); // monument at world origin

  // walkable = unblocked hexes, pruned to the component reachable from spawn.
  const walkableAll = new Set();
  for (const { q, r } of coords) {
    const k = hexKey(q, r);
    if (!blocked.has(k)) walkableAll.add(k);
  }
  const walkable = reachableFrom(startKey, walkableAll);
  return { walkable, size, radius, hexTopY: 0 };
}

export function createSnow(count, area, height) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * area;
    positions[i * 3 + 1] = Math.random() * height;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.22, transparent: true, opacity: 0.9,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const arr = positions;
  points.userData.update = (dt) => {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= dt * 3;
      arr[i * 3] += Math.sin(now * 0.0006 + i) * dt * 0.25;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = height;
        arr[i * 3] = (Math.random() - 0.5) * area;     // re-seed x so drift can't accumulate
        arr[i * 3 + 2] = (Math.random() - 0.5) * area; // re-seed z too
      }
    }
    geo.attributes.position.needsUpdate = true;
  };
  return points;
}
