// 단계 매니저: 월드는 계속 유지하고 콘텐츠(1단계 말풍선 → 2단계 NPC)를 갈아끼운다.
import type * as THREE from 'three';
import { hexKey } from './hexgrid';
import { parseStage1Data, createCollectGame } from './collectgame';
import type { CGBubble } from './collectgame';
import { createBubbles } from './bubbles';
import { createScoreHud } from './scorehud';
import { showChoice, showInfo, showFeedback, showDialogue } from './popup';
import { STAGE1_DATA, STAGE2_DATA } from './assets';
import { parseStage2Data, createNpcGame } from './npcgame';
import type { NpcDef } from './npcgame';
import { createNpcs } from './npcs';

const PROXIMITY = 6; // 팝업이 뜨는 근접 거리(월드 단위)

// ctx = { scene, camera, walkable, size, uiRoot, setInputLocked, onStage2Enter, onComplete }
// 이 월드는 stage1(연료 채우기=미션2)과 stage2(NPC=미션3)를 한 번에 살려두고 이어서
// 진행한다. onStage2Enter는 stage2로 넘어가는 순간(=행성3 관점의 미션3 전환)을 바깥에
// 알리는 신호이고, onComplete는 stage2까지 다 끝났을 때만 호출된다.
export function createStageManager(ctx: {
  scene: THREE.Scene;
  camera: THREE.Camera;
  walkable: Set<string>;
  size: number;
  hexTopY: number;
  isDisposed: () => boolean;
  uiRoot: HTMLElement;
  setInputLocked: (locked: boolean) => void;
  onStage2Enter: () => void;
  onComplete: () => void;
}): {
  start(opts?: { startStage?: 1 | 2 }): Promise<void>;
  update(dt: number): void;
  bubblePoints(): { x: number; z: number }[];
  npcPoints(): { x: number; z: number; done: boolean }[];
} {
  let bubbles: Awaited<ReturnType<typeof createBubbles>> | null = null;
  let game: ReturnType<typeof createCollectGame> | null = null;
  let hud: ReturnType<typeof createScoreHud> | null = null;
  let elapsed = 0;
  let popupOpen = false;
  let npcs: Awaited<ReturnType<typeof createNpcs>> | null = null;
  let npcGame: ReturnType<typeof createNpcGame> | null = null;
  let npcCooldown = 0; // 이 시각(elapsed) 이전엔 대화를 다시 열지 않음(피드백 노출용)
  // 이미 끝낸 NPC에게 "다 녹았어" 피드백을 이번 접근에서 이미 보여준 NPC id.
  // 반경을 벗어나면 null로 풀려서, 다시 다가오면 한 번 더 보여준다(서 있는 동안 도배 방지).
  let doneGreetedId: number | null = null;

  async function start(opts?: { startStage?: 1 | 2 }): Promise<void> {
    // DEV 편의: stage1을 건너뛰고 stage2로 바로 진입(?m=2&stage2=1). stage1 셋업/인트로
    // 없이 stage2 전환만 실행한다(스테퍼도 onStage2Enter로 미션3이 된다).
    if (opts?.startStage === 2) {
      await startStage2();
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
        void startStage2();
      },
      '🎉',
    );
  }

  // Stage 2 — 얼어붙은 마음(NPC 3명)을 녹인다. stage2 진입을 바깥(스테퍼→미션3)에 알리고,
  // NPC를 로드·배치한다. 3명 모두 lv3에 도달하면 onComplete가 호출된다.
  async function startStage2(): Promise<void> {
    ctx.onStage2Enter();
    try {
      const isWalkableKey = (q: number, r: number): boolean => ctx.walkable.has(hexKey(q, r));
      const parsed = parseStage2Data(STAGE2_DATA, isWalkableKey);
      parsed.warnings.forEach((w) => console.warn('[stage2]', w));
      npcGame = createNpcGame(parsed.npcs);
      const loaded = await createNpcs(ctx.scene, parsed.npcs, { size: ctx.size, hexTopY: ctx.hexTopY });
      // 로드 도중 언마운트됐다면(dispose 선행) 방금 만든 NPC 리소스를 정리하고 중단 — GPU 누수 방지.
      if (ctx.isDisposed()) { loaded.clear(); return; }
      npcs = loaded;
    } catch (err) {
      console.error('[stage2] NPC 로드 실패:', err);
      showInfo(ctx.uiRoot, '앗, 친구들을 불러오지 못했어요.\n잠시 후 다시 시도해 주세요.', '확인', null, '😢');
    }
  }

  // NPC 근접 시 현재 라운드 대화를 연다. 선택지는 대본 순서 그대로 보여주고, 선택지 없는
  // 마무리 '대사 라운드'는 '닫기' 버튼 하나로 넘긴다(대사만 보여주고 그 NPC 종료).
  function openNpcDialogue(def: NpcDef): void {
    const round = npcGame!.currentRound(def.id);
    if (!round) return;
    popupOpen = true;
    ctx.setInputLocked(true);
    const buttons = round.choices.length > 0 ? round.choices : ["닫기"];
    showDialogue(ctx.uiRoot, round.prompt, buttons, (index) => {
      const r = npcGame!.choose(def.id, index);
      popupOpen = false;
      ctx.setInputLocked(false);
      npcCooldown = elapsed + 1.2; // 피드백이 보이도록 잠시 재오픈 지연
      if (r.accepted) {
        // 방금 이 NPC를 끝낸 자리에 그대로 서 있는 경우, 마무리 대사를 닫자마자 "이미 녹았어"가
        // 겹쳐 뜨지 않도록 이번 접근은 인사한 것으로 처리한다(멀어졌다 오면 다시 뜬다).
        if (r.npcDone) doneGreetedId = def.id;
        npcs!.setLevel(def.id, r.level);
        if (r.feedback) showFeedback(ctx.uiRoot, true, r.feedback); // 중간 라운드는 피드백 없이 다음 대사로
        if (r.allDone) onAllNpcsDone();
      } else {
        showFeedback(ctx.uiRoot, false, r.feedback);
      }
    }, def.emoji);
  }

  // 세 NPC 모두 lv3 → 축하 후 미션3(=행성3 최종) 완료.
  function onAllNpcsDone(): void {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '모두의 얼어붙은 마음이 녹았어요! 🎉\n얼음 행성의 친구들이 다시 웃어요!',
      '미션 완료',
      () => {
        npcs!.clear();
        npcs = null;
        popupOpen = false;
        ctx.setInputLocked(false);
        ctx.onComplete();
      },
      '🎉',
    );
  }

  function update(dt: number): void {
    elapsed += dt;
    // Stage 2: NPC가 로드돼 있으면 감정 애니메이션을 매 프레임 갱신하고 근접 시 대화를 연다.
    if (npcs && npcGame) {
      npcs.update(dt, ctx.camera);
      if (popupOpen || elapsed < npcCooldown) return;
      const p = ctx.camera.position;
      const near = npcs.nearest(p.x, p.z, PROXIMITY, (d) => !npcGame!.isDone(d.id));
      if (near) { openNpcDialogue(near); return; }
      // 이미 마음이 녹은 친구는 대화를 다시 열지 않는다. 다만 아무 반응이 없으면 '끝난 친구'와
      // '고장난 친구'가 구분되지 않아, 접근당 한 번 짧은 피드백으로 끝났음을 알린다.
      const doneNear = npcs.nearest(p.x, p.z, PROXIMITY, (d) => npcGame!.isDone(d.id));
      if (!doneNear) { doneGreetedId = null; return; }
      if (doneGreetedId === doneNear.id) return;
      doneGreetedId = doneNear.id;
      showFeedback(ctx.uiRoot, true, '이 친구의 마음은 이미 녹았어 🌱');
      return;
    }
    // Stage 1: 말풍선 근접.
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

  // stage2 NPC들의 월드 좌표 + 완료 여부 — 미니맵이 매 프레임 읽는다(없으면 빈 배열).
  function npcPoints(): { x: number; z: number; done: boolean }[] {
    return npcs ? npcs.points() : [];
  }

  return { start, update, bubblePoints, npcPoints };
}
