// stage2 NPC 3D 표현: 감정 클립(lv0~lv3)을 crossfade로 전환 + Y축 빌보드 + 근접 감지.
// src/scenes/planet/planet3/world/npcs.ts 이식 — 타입만 제거, 로직 동일.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { axialToWorld } from './hexgrid.js';
import { MODEL_URLS } from './assets.js';

const CLIPS = ['lv0', 'lv1', 'lv2', 'lv3'];
const FADE = 1.2;             // 감정 전환 crossfade(초)
const TARGET_HEIGHT = 3.6;    // NPC 키(월드 단위) — bbox 높이 기준 정규화
const FACE_OFFSET = 0;         // 정면이 카메라를 향하게 하는 Y축 보정

const NPC_URLS = [MODEL_URLS.npc1, MODEL_URLS.npc2, MODEL_URLS.npc3, MODEL_URLS.npc4];

export async function createNpcs(scene, defs, { size, hexTopY = 0 }) {
  const loader = new GLTFLoader();
  const items = new Map();
  const geoms = new Set();
  const mats = new Set();
  const group = new THREE.Group();

  for (const def of defs) {
    // NPC마다 별도 GLB를 로드한다(애니메이션이 독립이라 clone 대신 개별 로드가 단순).
    const url = NPC_URLS[def.id % NPC_URLS.length];
    const gltf = await loader.loadAsync(url);
    const inner = gltf.scene;

    // 키를 TARGET_HEIGHT로 정규화한 뒤, bbox로 수평 중심을 원점에·발(min.y)을 바닥에 맞춘다.
    inner.updateWorldMatrix(true, true);
    const box0 = new THREE.Box3().setFromObject(inner);
    const dim = box0.getSize(new THREE.Vector3());
    inner.scale.setScalar(TARGET_HEIGHT / (dim.y || 1));
    inner.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner);
    const c = box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x, -box.min.y, -c.z);

    const { x, z } = axialToWorld(def.q, def.r, size);
    const pivot = new THREE.Group();
    pivot.position.set(x, hexTopY, z);
    pivot.add(inner);
    group.add(pivot);

    inner.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geoms.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mats.add(mm));
    });

    const mixer = new THREE.AnimationMixer(inner);
    const actions = {};
    CLIPS.forEach((name) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) return;
      const a = mixer.clipAction(clip);
      a.enabled = true;
      a.setEffectiveWeight(0);
      a.play();
      actions[name] = a;
    });
    if (actions.lv0) actions.lv0.setEffectiveWeight(1);

    items.set(def.id, { pivot, mixer, actions, current: 'lv0', x, z, def });
  }
  scene.add(group);

  // 현재 액션 → 목표 액션으로 crossfade. 목표 클립이 없으면 current만 갱신.
  function setLevel(id, level) {
    const it = items.get(id);
    if (!it) return;
    const toName = CLIPS[Math.max(0, Math.min(3, level))];
    const to = it.actions[toName];
    const from = it.actions[it.current];
    if (!to || to === from) { it.current = toName; return; }
    to.enabled = true;
    to.setEffectiveTimeScale(1);
    to.setEffectiveWeight(1);
    to.time = 0;
    if (from) from.crossFadeTo(to, FADE, false);
    it.current = toName;
  }

  function update(dt, camera) {
    for (const it of items.values()) {
      it.mixer.update(dt);
      if (camera) {
        it.pivot.rotation.y = Math.atan2(camera.position.x - it.x, camera.position.z - it.z) + FACE_OFFSET;
      }
    }
  }

  function nearest(px, pz, radius, accept) {
    let best = null;
    let bestD2 = radius * radius;
    for (const it of items.values()) {
      if (accept && !accept(it.def)) continue;
      const dx = it.x - px;
      const dz = it.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = it.def; }
    }
    return best;
  }

  function points() {
    return [...items.values()].map((it) => ({ x: it.x, z: it.z, done: it.current === 'lv3' }));
  }

  function clear() {
    scene.remove(group);
    geoms.forEach((g) => g.dispose());
    mats.forEach((m) => {
      Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
    items.clear();
  }

  return { update, nearest, setLevel, points, clear };
}
