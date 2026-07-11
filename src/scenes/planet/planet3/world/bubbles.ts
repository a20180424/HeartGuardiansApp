// 말풍선 3D 표현: 육각 좌표에 말풍선 GLB. 위아래 흔들림 + 항상 카메라 정면(billboard) + 근접 감지.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { axialToWorld } from './hexgrid';
import { MODEL_URLS } from './assets';
import type { CGBubble } from './collectgame';

const BUBBLE_URL = MODEL_URLS.bubble;

const TARGET_SIZE = 1.8;                        // 가장 긴 축 기준 목표 크기(월드 단위)
const EMISSIVE_COLOR = new THREE.Color(0x66d9ff); // 발광 색(현재 intensity 0으로 꺼둠)
const EMISSIVE_INTENSITY = 0;                   // 0=발광 없음(필요하면 0.2~0.5로)
// 모델의 정면이 카메라를 향하도록 하는 Y축 보정(π면 앞뒤 뒤집힘). 브라우저로 튜닝.
const FACE_OFFSET = Math.PI;
// 누운 원본 말풍선을 세우는 X축 회전. ±π/2 중 꼬리가 아래로 가는 쪽으로. 브라우저로 튜닝.
const STAND_ROT = Math.PI / 2;

type BubbleItem = {
  pivot: THREE.Group;
  baseY: number;
  x: number;
  z: number;
  data: CGBubble;
};

// bubbles: [{ id, q, r, text, good }]. GLB를 로드해야 하므로 async.
export async function createBubbles(
  scene: THREE.Scene,
  bubbles: CGBubble[],
  { size, hexTopY = 0, floatHeight = 2.6 }: { size: number; hexTopY?: number; floatHeight?: number }
): Promise<{
  update(dt: number, elapsed: number, camera: THREE.Camera): void;
  nearest(px: number, pz: number, radius: number): CGBubble | null;
  remove(id: number): void;
  clear(): void;
  points(): { x: number; z: number }[];
}> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(BUBBLE_URL);
  const template = gltf.scene;

  // 모델 크기·방향에 상관없이 정규화: 바운딩 박스로 중심을 원점에 맞추고
  // 가장 긴 축을 TARGET_SIZE로 스케일한다.
  template.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(template);
  const dim = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scaleF = TARGET_SIZE / (Math.max(dim.x, dim.y, dim.z) || 1);

  // 클론들이 공유하는 geometry/material — clear()에서 한 번만 dispose한다.
  const geoms = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  template.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    geoms.add(o.geometry);
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      // 살짝 발광 — emissive를 지원하는 재질(Standard/Physical)에만 적용.
      const em = m as THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
      if (em.emissive && !mats.has(m)) {
        em.emissive.copy(EMISSIVE_COLOR);
        em.emissiveIntensity = EMISSIVE_INTENSITY;
        em.needsUpdate = true;
      }
      mats.add(m);
    });
  });

  const group = new THREE.Group();
  const items = new Map<number, BubbleItem>(); // id -> { pivot, baseY, x, z, data }

  for (const b of bubbles) {
    const { x, z } = axialToWorld(b.q, b.r, size);
    const baseY = hexTopY + floatHeight;
    // 구조: pivot(위치·스케일·billboard Y회전) > standUp(누운 모델 세우기) > inner(중심보정 클론)
    const pivot = new THREE.Group();
    const standUp = new THREE.Group();
    standUp.rotation.x = STAND_ROT;      // 눕혀진 원본을 세운다
    const inner = template.clone(true);  // geometry/material은 공유(가벼움)
    inner.position.set(-center.x, -center.y, -center.z); // bbox 중심을 원점에
    standUp.add(inner);
    pivot.add(standUp);
    pivot.scale.setScalar(scaleF);
    pivot.position.set(x, baseY, z);
    group.add(pivot);
    items.set(b.id, { pivot, baseY, x, z, data: b });
  }
  scene.add(group);

  // 부드러운 위아래 흔들림 + 항상 카메라 정면. elapsed=누적 시간(초), camera=플레이어 카메라.
  function update(_dt: number, elapsed: number, camera: THREE.Camera): void {
    for (const it of items.values()) {
      it.pivot.position.y = it.baseY + Math.sin(elapsed * 2 + it.x) * 0.15;
      if (camera) {
        // Y축만 돌려 꼬리는 아래로 두고 정면이 플레이어를 향하게(수평 billboard).
        it.pivot.rotation.y = Math.atan2(camera.position.x - it.x, camera.position.z - it.z) + FACE_OFFSET;
      }
    }
  }

  // 남아있는(미소비) 말풍선들의 월드 좌표 목록 — 미니맵 표시용.
  function points(): { x: number; z: number }[] {
    return [...items.values()].map((it) => ({ x: it.x, z: it.z }));
  }

  // (px,pz)에서 radius 이내 가장 가까운 미소비 말풍선 데이터, 없으면 null.
  function nearest(px: number, pz: number, radius: number): CGBubble | null {
    let best: CGBubble | null = null;
    let bestD2 = radius * radius;
    for (const it of items.values()) {
      const dx = it.x - px;
      const dz = it.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = it.data; }
    }
    return best;
  }

  // 개별 제거: 씬 그래프에서만 떼어낸다(geometry/material은 공유라 유지).
  function remove(id: number): void {
    const it = items.get(id);
    if (!it) return;
    group.remove(it.pivot);
    items.delete(id);
  }

  function clear(): void {
    for (const id of [...items.keys()]) remove(id);
    scene.remove(group);
    // 공유 자원은 여기서 한 번만 해제.
    geoms.forEach((g) => g.dispose());
    mats.forEach((m) => {
      Object.values(m).forEach((v) => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); });
      m.dispose();
    });
  }

  return { update, nearest, remove, clear, points };
}
