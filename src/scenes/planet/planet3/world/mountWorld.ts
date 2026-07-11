// 3D 월드 조립 + 라이프사이클. 원본 SRC/main.js(최상위 await 스크립트)를
// container에 마운트/언마운트 가능한 함수로 이식한 것.
//   mountWorld(container, { onStage2Enter, onComplete }) -> dispose()
// dispose는 초기화 완료 여부와 무관하게 즉시 안전하게 호출할 수 있다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTerrain, createSnow } from './worldbuild';
import { createPlayer } from './player';
import { createMinimap } from './minimap';
import { createJoystick } from './joystick';
import { createStageManager } from './stages';

export function mountWorld(
  container: HTMLElement,
  {
    onStage2Enter,
    onComplete,
    startStage,
  }: { onStage2Enter: () => void; onComplete: () => void; startStage?: 1 | 2 },
): () => void {
  // dispose가 비동기 초기화 완료보다 먼저 호출된 경우, 완료 콜백이 더 이상
  // 아무것도 시작하지 않도록 막는 경쟁 조건 가드.
  let disposed = false;

  // -------------------------------------------------------------------------
  // Renderer
  // -------------------------------------------------------------------------
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Cap pixel ratio: mobile GPUs (e.g. Galaxy Tab A9+ / Mali-G57) are fill-rate
  // bound, and 1.5x looks the same as 2x here while costing far fewer fragments.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const onContextMenu = (e: MouseEvent): void => e.preventDefault();
  window.addEventListener('contextmenu', onContextMenu);

  // -------------------------------------------------------------------------
  // Scene + gradient sky + fog
  // -------------------------------------------------------------------------
  const HORIZON = 0xcfe6f5;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HORIZON);
  scene.fog = new THREE.Fog(HORIZON, 45, 150);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x6ea9d8) },
        bottom: { value: new THREE.Color(HORIZON) },
        offset: { value: 30 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom;
        uniform float offset; uniform float exponent;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
          float t = pow(max(h, 0.0), exponent);
          gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        }`,
    }),
  );
  sky.name = 'sky';
  scene.add(sky);

  // -------------------------------------------------------------------------
  // Lighting
  // -------------------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6b6658, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.2);
  sun.position.set(30, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  // Keep the shadow box tight (crisp shadows) — it follows the player each frame
  // in the loop, so it stays sharp no matter how large the world gets.
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target); // updated to the player's position in the loop
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // -------------------------------------------------------------------------
  // Camera — driven by the player controller (see player.ts).
  // -------------------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  camera.position.set(0, 12, 30);
  camera.lookAt(0, 0, 0);

  // -------------------------------------------------------------------------
  // Resize (defined early so the sky renders at the right size during loading)
  // -------------------------------------------------------------------------
  function resize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Paint the gradient sky immediately so the child never sees a black screen
  // while the models load. Replaced by the full loop once the world is ready.
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  // -------------------------------------------------------------------------
  // Kid-friendly full-screen message overlay (loading / error). Phase 1: no
  // reload button on the error overlay (mission context — just the message).
  // -------------------------------------------------------------------------
  function makeOverlay(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText =
      'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:16px;color:#fff;font-family:system-ui,sans-serif;' +
      'font-size:22px;text-align:center;padding:24px;z-index:10;' +
      'background:rgba(20,30,45,0.35);';
    const msg = document.createElement('div');
    msg.textContent = text;
    el.appendChild(msg);
    container.appendChild(el);
    return el;
  }

  const loadingOverlay = makeOverlay('❄️ 겨울 숲을 준비하고 있어요…');

  // -------------------------------------------------------------------------
  // Input: keyboard. Declared here (outside the async init) so the handlers
  // exist for the whole component lifetime and dispose() can always remove
  // them safely, regardless of whether async init below has finished.
  // -------------------------------------------------------------------------
  const keys = new Set<string>();
  const onKeyDown = (e: KeyboardEvent): void => { keys.add(e.key.toLowerCase()); };
  const onKeyUp = (e: KeyboardEvent): void => { keys.delete(e.key.toLowerCase()); };
  const onBlur = (): void => { keys.clear(); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function keyboardInput(): { throttle: number; turn: number } {
    let throttle = 0;
    let turn = 0;
    if (keys.has('arrowup') || keys.has('w')) throttle = 1;
    if (keys.has('arrowleft') || keys.has('a')) turn -= 1;
    if (keys.has('arrowright') || keys.has('d')) turn += 1;
    return { throttle, turn };
  }

  // 축별로 더 크게 입력된 소스를 채택(아날로그 스틱과 키보드가 서로 덮어쓰지 않음).
  const largerMag = (a: number, b: number): number => (Math.abs(a) >= Math.abs(b) ? a : b);

  // -------------------------------------------------------------------------
  // World — models are uncompressed .glb, so a plain GLTFLoader is all we need.
  // -------------------------------------------------------------------------
  const loader = new GLTFLoader();

  const RADIUS = 20; // ~4x the area of radius 10 (field area ∝ radius²)
  const SIZE = 2;
  // Start well back from the center so the monument reads as a distant landmark
  // (not a wall in the player's face). Must match the start hex kept walkable in
  // worldbuild.ts. yaw starts at 0 (looking -Z), which points toward the center.
  const START_HEX = { q: 0, r: 7 };

  // 씬 리소스 정리 (geometry + material 모두). dispose()와, StrictMode 이중 마운트로
  // buildTerrain/stages.start 도중 dispose가 먼저 호출된 bail 분기 양쪽에서 재사용된다.
  function disposeSceneResources(): void {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
        Object.values(m).forEach((v) => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); });
        m.dispose();
      });
    });
  }

  (async () => {
    try {
      const world = await buildTerrain(scene, loader, { radius: RADIUS, size: SIZE });
      if (disposed) {
        disposeSceneResources();
        return;
      }

      // Snow spreads a fixed distance around the player (independent of world size)
      // so density stays constant as the map grows; it re-centers on the camera below.
      const snow = createSnow(1800, 90, 40);
      scene.add(snow);

      const EYE_HEIGHT = 2.0;
      const player = createPlayer(camera, {
        size: SIZE,
        hexTopY: world.hexTopY,
        eyeHeight: EYE_HEIGHT,
        walkable: world.walkable,
        startHex: START_HEX,
      });

      // North-up minimap: whole field + monument + player position/heading.
      const minimap = createMinimap({ worldExtent: Math.sqrt(3) * SIZE * RADIUS });
      container.appendChild(minimap.element);

      // Input: 가상 조이스틱(터치·마우스 공용) + 키보드. 매 프레임 { throttle, turn }으로 병합.
      const joystick = createJoystick({ radius: 75 }); // CSS 210px(반경 105) 위젯에 맞춘 입력 반경
      container.appendChild(joystick.element);

      function readInput(): { throttle: number; turn: number } {
        const j = joystick.value;
        const k = keyboardInput();
        return {
          throttle: Math.max(j.throttle, k.throttle),
          turn: largerMag(j.turn, k.turn),
        };
      }

      // 시나리오 단계 매니저 — 팝업이 열리면 이동을 잠근다.
      let inputLocked = false;
      const stages = createStageManager({
        scene,
        camera,
        walkable: world.walkable,
        size: SIZE,
        uiRoot: container,
        setInputLocked: (locked: boolean): void => { inputLocked = locked; },
        onStage2Enter,
        onComplete,
      });
      await stages.start({ startStage });
      if (disposed) {
        disposeSceneResources();
        return;
      }

      // Full animation loop now that the world exists.
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), 0.1);
        if (!inputLocked) player.update(dt, readInput());
        stages.update(dt);
        // Keep the sun's shadow box centered on the player so shadows stay crisp
        // across a large world (constant cost regardless of map size).
        sun.position.set(camera.position.x + 30, 45, camera.position.z + 20);
        sun.target.position.set(camera.position.x, 0, camera.position.z);
        snow.userData.update(dt);
        snow.position.set(camera.position.x, 0, camera.position.z); // keep snow around the player
        minimap.update(camera.position.x, camera.position.z, camera.rotation.y, stages.bubblePoints());
        renderer.render(scene, camera);
      });

      loadingOverlay.remove();
    } catch (err) {
      if (disposed) return;
      console.error('월드 로드 실패:', err);
      loadingOverlay.remove();
      makeOverlay('앗, 숲을 불러오지 못했어요. 다시 시도해 볼까요?');
    }
  })();

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    ro.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('contextmenu', onContextMenu);
    disposeSceneResources();
    renderer.dispose();
    container.replaceChildren(); // canvas·UI DOM 제거
  };
}
