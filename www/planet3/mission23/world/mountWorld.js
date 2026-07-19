// 3D 월드 조립 + 라이프사이클.
// src/scenes/planet/planet3/world/mountWorld.ts 이식 — 타입만 제거, 로직 동일.
//   mountWorld(container, { onStage2Enter, onComplete, startStage }) -> dispose()
// dispose는 초기화 완료 여부와 무관하게 즉시 안전하게 호출할 수 있다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTerrain, createSnow } from './worldbuild.js';
import { createPlayer } from './player.js';
import { createMinimap } from './minimap.js';
import { createJoystick } from './joystick.js';
import { createStageManager } from './stages.js';

export function mountWorld(container, { onStage2Enter, onComplete, startStage }) {
  // dispose가 비동기 초기화 완료보다 먼저 호출된 경우 완료 콜백을 막는 경쟁 조건 가드.
  let disposed = false;

  // -------------------------------------------------------------------------
  // Renderer
  // -------------------------------------------------------------------------
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const onContextMenu = (e) => e.preventDefault();
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
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target); // updated to the player's position in the loop
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // -------------------------------------------------------------------------
  // Camera — driven by the player controller (see player.js).
  // -------------------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  camera.position.set(0, 12, 30);
  camera.lookAt(0, 0, 0);

  // -------------------------------------------------------------------------
  // Resize
  // -------------------------------------------------------------------------
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Paint the gradient sky immediately so the child never sees a black screen.
  renderer.setAnimationLoop(() => renderer.render(scene, camera));

  // -------------------------------------------------------------------------
  // Kid-friendly full-screen message overlay (loading / error).
  // -------------------------------------------------------------------------
  function makeOverlay(text) {
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
  // Input: keyboard.
  // -------------------------------------------------------------------------
  const keys = new Set();
  const onKeyDown = (e) => { keys.add(e.key.toLowerCase()); };
  const onKeyUp = (e) => { keys.delete(e.key.toLowerCase()); };
  const onBlur = () => { keys.clear(); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function keyboardInput() {
    let throttle = 0;
    let turn = 0;
    if (keys.has('arrowup') || keys.has('w')) throttle += 1;
    if (keys.has('arrowdown') || keys.has('s')) throttle -= 1; // 후진
    if (keys.has('arrowleft') || keys.has('a')) turn -= 1;
    if (keys.has('arrowright') || keys.has('d')) turn += 1;
    return { throttle, turn };
  }

  // 축별로 더 크게 입력된 소스를 채택(아날로그 스틱과 키보드가 서로 덮어쓰지 않음).
  const largerMag = (a, b) => (Math.abs(a) >= Math.abs(b) ? a : b);

  // -------------------------------------------------------------------------
  // World — models are uncompressed .glb, so a plain GLTFLoader is all we need.
  // -------------------------------------------------------------------------
  const loader = new GLTFLoader();

  const RADIUS = 20; // ~4x the area of radius 10 (field area ∝ radius²)
  const SIZE = 2;
  const START_HEX = { q: 0, r: 7 };

  // 씬 리소스 정리 (geometry + material 모두).
  function disposeSceneResources() {
    scene.traverse((o) => {
      const mesh = o;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
        Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
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

      // Snow spreads a fixed distance around the player.
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

      // Input: 가상 조이스틱(터치·마우스 공용) + 키보드.
      const joystick = createJoystick({ radius: 75 }); // CSS 210px(반경 105) 위젯에 맞춘 입력 반경
      container.appendChild(joystick.element);

      function readInput() {
        const j = joystick.value;
        const k = keyboardInput();
        return {
          throttle: largerMag(j.throttle, k.throttle),
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
        hexTopY: world.hexTopY,
        isDisposed: () => disposed,
        uiRoot: container,
        setInputLocked: (locked) => { inputLocked = locked; },
        onStage2Enter: () => {
          // 미션3(stage2)은 미션2 종료 위치가 아니라 항상 지정된 시작 위치에서 시작한다.
          player.resetTo(START_HEX);
          onStage2Enter?.();
        },
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
        // Keep the sun's shadow box centered on the player so shadows stay crisp.
        sun.position.set(camera.position.x + 30, 45, camera.position.z + 20);
        sun.target.position.set(camera.position.x, 0, camera.position.z);
        snow.userData.update(dt);
        snow.position.set(camera.position.x, 0, camera.position.z); // keep snow around the player
        minimap.update(camera.position.x, camera.position.z, camera.rotation.y, stages.bubblePoints(), stages.npcPoints());
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
