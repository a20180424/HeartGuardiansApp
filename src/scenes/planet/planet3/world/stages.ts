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

// ctx = { scene, camera, walkable, size, uiRoot, setInputLocked, onComplete }
export function createStageManager(ctx: {
  scene: THREE.Scene;
  camera: THREE.Camera;
  walkable: Set<string>;
  size: number;
  uiRoot: HTMLElement;
  setInputLocked: (locked: boolean) => void;
  onComplete: () => void;
}): {
  start(): Promise<void>;
  update(dt: number): void;
  bubblePoints(): { x: number; z: number }[];
} {
  let bubbles: Awaited<ReturnType<typeof createBubbles>> | null = null;
  let game: ReturnType<typeof createCollectGame> | null = null;
  let hud: ReturnType<typeof createScoreHud> | null = null;
  let elapsed = 0;
  let popupOpen = false;

  async function start(): Promise<void> {
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

  function onPass(): void {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '충전 완료! 공감 송신기가 켜졌어요 🎉\n다음으로 갈까?',
      '다음으로',
      () => {
        bubbles!.clear();
        bubbles = null;
        hud!.remove();
        hud = null;
        popupOpen = false;
        ctx.setInputLocked(false);
        ctx.onComplete();
      },
      '🎉',
    );
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
