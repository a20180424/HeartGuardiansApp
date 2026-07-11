// 단계 매니저: 월드는 계속 유지하고 콘텐츠(1단계 말풍선 → 2단계 NPC)를 갈아끼운다.
import type * as THREE from 'three';
import { hexKey } from './hexgrid';
import { parseStage1Data, createCollectGame } from './collectgame';
import type { CGBubble } from './collectgame';
import { createBubbles } from './bubbles';
import { createScoreHud } from './scorehud';
import { showChoice, showInfo, showFeedback } from './popup';
import { STAGE1_DATA } from './assets';

const PROXIMITY = 1.5; // 팝업이 뜨는 근접 거리(월드 단위)

// ctx = { scene, camera, walkable, size, uiRoot, setInputLocked, onStage2Enter, onComplete }
// 이 월드는 stage1(연료 채우기=미션2)과 stage2(NPC=미션3)를 한 번에 살려두고 이어서
// 진행한다. onStage2Enter는 stage2로 넘어가는 순간(=행성3 관점의 미션3 전환)을 바깥에
// 알리는 신호이고, onComplete는 stage2까지 다 끝났을 때만 호출된다.
export function createStageManager(ctx: {
  scene: THREE.Scene;
  camera: THREE.Camera;
  walkable: Set<string>;
  size: number;
  uiRoot: HTMLElement;
  setInputLocked: (locked: boolean) => void;
  onStage2Enter: () => void;
  onComplete: () => void;
}): {
  start(opts?: { startStage?: 1 | 2 }): Promise<void>;
  update(dt: number): void;
  bubblePoints(): { x: number; z: number }[];
} {
  let bubbles: Awaited<ReturnType<typeof createBubbles>> | null = null;
  let game: ReturnType<typeof createCollectGame> | null = null;
  let hud: ReturnType<typeof createScoreHud> | null = null;
  let elapsed = 0;
  let popupOpen = false;

  async function start(opts?: { startStage?: 1 | 2 }): Promise<void> {
    // DEV 편의: stage1을 건너뛰고 stage2로 바로 진입(?m=2&stage2=1). stage1 셋업/인트로
    // 없이 stage2 전환만 실행한다(스테퍼도 onStage2Enter로 미션3이 된다).
    if (opts?.startStage === 2) {
      startStage2();
      return;
    }
    const data = STAGE1_DATA;
    const isWalkableKey = (q: number, r: number): boolean => ctx.walkable.has(hexKey(q, r));
    const parsed = parseStage1Data(data, isWalkableKey);
    parsed.warnings.forEach((w) => console.warn('[stage1]', w));

    game = createCollectGame({ passScore: parsed.passScore });
    bubbles = await createBubbles(ctx.scene, parsed.bubbles, { size: ctx.size });
    hud = createScoreHud(parsed.passScore);
    ctx.uiRoot.appendChild(hud.element);
    hud.set(0);
    showMissionIntro();
  }

  // 시작 시 1회: 공감 송신기 미션·규칙 안내. 닫을 때까지 이동/근접 잠금.
  function showMissionIntro(): void {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '공감 송신기를 켜려면 에너지가 필요해.\n따듯한 말을 선택하면 에너지가 충전될거야\n차가운 말을 선택하면 에너지가 방전될거야\n신중하게 골라봐',
      '시작!',
      () => {
        popupOpen = false;
        ctx.setInputLocked(false);
      },
      '🔋',
      [
        { words: ['따듯한 말', '충전'], className: 'hi-warm' },
        { words: ['차가운 말', '방전'], className: 'hi-cold' },
      ],
    );
  }

  function openPopup(bubble: CGBubble): void {
    popupOpen = true;
    ctx.setInputLocked(true);
    showChoice(ctx.uiRoot, bubble.text, (take) => {
      const r = game!.choose(bubble, take);
      bubbles!.remove(bubble.id);
      hud!.set(r.score);
      popupOpen = false;
      ctx.setInputLocked(false);
      if (r.passed) { onPass(); return; } // 통과 순간은 큰 축하 팝업이 대신
      if (take) showFeedback(ctx.uiRoot, bubble.good); // 충전하기에만 피드백
    });
  }

  // Stage 1 통과 → 월드는 유지한 채 stage 2로 전환한다(미니게임을 끝내지 않는다).
  // onComplete는 stage 2 끝에서만 호출된다.
  function onPass(): void {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '충전 완료! 공감 송신기가 켜졌어요 🎉\n이제 얼어붙은 마음을 녹이러 가자!',
      '다음으로',
      () => {
        bubbles!.clear();
        bubbles = null;
        hud!.remove();
        hud = null;
        popupOpen = false;
        ctx.setInputLocked(false);
        startStage2();
      },
      '🎉',
    );
  }

  // Stage 2 — 실제 NPC 콘텐츠는 이후(Phase 2)에 채운다. 지금은 stage 2 진입을 바깥
  // (행성3 스테퍼 → 미션3)으로 알리고, onComplete→p3_m2_end까지의 흐름만 확인할 수
  // 있게 임시 완료 버튼 하나만 띄운다. 월드와 이동은 그대로 살아 있다.
  function startStage2(): void {
    ctx.onStage2Enter();
    const btn = document.createElement('button');
    btn.className = 'st2-temp-done';
    btn.textContent = '미션 완료 (임시)';
    btn.style.cssText =
      'position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:20;' +
      'padding:12px 24px;border:none;border-radius:999px;cursor:pointer;' +
      'font-family:system-ui,sans-serif;font-size:18px;font-weight:700;color:#fff;' +
      'background:#2563eb;box-shadow:0 4px 14px rgba(0,0,0,0.25);';
    btn.addEventListener('click', () => {
      btn.remove();
      ctx.onComplete();
    });
    ctx.uiRoot.appendChild(btn);
  }

  function update(dt: number): void {
    elapsed += dt;
    if (!bubbles) return;
    bubbles.update(dt, elapsed, ctx.camera);
    if (popupOpen) return;
    const p = ctx.camera.position;
    const near = bubbles.nearest(p.x, p.z, PROXIMITY);
    if (near) openPopup(near);
  }

  // 현재 남은 말풍선들의 월드 좌표 — 미니맵이 매 프레임 읽는다(없으면 빈 배열).
  function bubblePoints(): { x: number; z: number }[] {
    return bubbles ? bubbles.points() : [];
  }

  return { start, update, bubblePoints };
}
