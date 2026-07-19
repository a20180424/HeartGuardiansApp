// 단계 매니저: 월드는 계속 유지하고 콘텐츠(1단계 말풍선 → 2단계 NPC)를 갈아끼운다.
// src/scenes/planet/planet3/world/stages.ts 이식 — 타입만 제거, 로직 동일.
import { hexKey, axialToWorld } from './hexgrid.js';
import { parseStage1Data, createCollectGame } from './collectgame.js';
import { createBubbles } from './bubbles.js';
import { createScoreHud } from './scorehud.js';
import { showChoice, showInfo, showFeedback, showDialogue } from './popup.js';
import { STAGE1_DATA, STAGE2_DATA } from './assets.js';
import { parseStage2Data, createNpcGame } from './npcgame.js';
import { createNpcs } from './npcs.js';

const PROXIMITY = 6; // 팝업이 뜨는 근접 거리(월드 단위)
// stage1 말풍선 정면 판정: 시선 정면 기준 이 반각 안쪽에 있는 말풍선만 접촉 인정.
// 뒤로 가다가 등 뒤 말풍선에 닿는 오접촉 방지(내적 >= FRONT_MIN_DOT).
const FRONT_MIN_DOT = Math.cos((75 * Math.PI) / 180); // ±75°

// 이 월드는 stage1(연료 채우기=미션2)과 stage2(NPC=미션3)를 한 번에 살려두고 이어서 진행한다.
export function createStageManager(ctx) {
  let bubbles = null;
  let game = null;
  let hud = null;
  let elapsed = 0;
  let popupOpen = false;
  let npcs = null;
  let npcGame = null;
  let npcCooldown = 0; // 이 시각(elapsed) 이전엔 대화를 다시 열지 않음(피드백 노출용)
  // 이미 끝낸 NPC에게 "다 녹았어" 피드백을 이번 접근에서 이미 보여준 NPC id.
  let doneGreetedId = null;

  async function start(opts) {
    // DEV 편의: stage1을 건너뛰고 stage2로 바로 진입(?stage2=1).
    if (opts?.startStage === 2) {
      await startStage2();
      return;
    }
    const data = STAGE1_DATA;
    const isWalkableKey = (q, r) => ctx.walkable.has(hexKey(q, r));
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
  function showMissionIntro() {
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

  function openPopup(bubble) {
    popupOpen = true;
    ctx.setInputLocked(true);
    showChoice(ctx.uiRoot, bubble.text, (take) => {
      const r = game.choose(bubble, take);
      bubbles.remove(bubble.id);
      hud.set(r.score);
      popupOpen = false;
      ctx.setInputLocked(false);
      if (r.passed) { onPass(); return; } // 통과 순간은 큰 축하 팝업이 대신
      if (take) showFeedback(ctx.uiRoot, bubble.good); // 충전하기에만 피드백
    });
  }

  // Stage 1 통과 → 월드는 유지한 채 stage 2로 전환한다(미니게임을 끝내지 않는다).
  function onPass() {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '충전 완료! 공감 송신기가 켜졌어요 🎉\n이제 얼어붙은 마음을 녹이러 가자!',
      '다음으로',
      () => {
        bubbles.clear();
        bubbles = null;
        hud.remove();
        hud = null;
        popupOpen = false;
        ctx.setInputLocked(false);
        void startStage2();
      },
      '🎉',
    );
  }

  // Stage 2 — 얼어붙은 마음(NPC 3명)을 녹인다.
  async function startStage2() {
    ctx.onStage2Enter();
    try {
      const isWalkableKey = (q, r) => ctx.walkable.has(hexKey(q, r));
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

  // NPC 근접 시 현재 라운드 대화를 연다.
  function openNpcDialogue(def) {
    const round = npcGame.currentRound(def.id);
    if (!round) return;
    // 대화를 열 때 주인공이 NPC를 정면으로 바라보게 회전(뒤/옆에서 닿아도 마주보게).
    const w = axialToWorld(def.q, def.r, ctx.size);
    ctx.facePlayerToward(w.x, w.z);
    popupOpen = true;
    ctx.setInputLocked(true);
    const buttons = round.choices.length > 0 ? round.choices : ["닫기"];
    showDialogue(ctx.uiRoot, round.prompt, buttons, (index) => {
      const r = npcGame.choose(def.id, index);
      popupOpen = false;
      ctx.setInputLocked(false);
      npcCooldown = elapsed + 1.2; // 피드백이 보이도록 잠시 재오픈 지연
      if (r.accepted) {
        if (r.npcDone) doneGreetedId = def.id;
        npcs.setLevel(def.id, r.level);
        if (r.feedback) showFeedback(ctx.uiRoot, true, r.feedback);
        if (r.allDone) onAllNpcsDone();
      } else {
        showFeedback(ctx.uiRoot, false, r.feedback);
      }
    }, def.emoji);
  }

  // 세 NPC 모두 lv3 → 축하 후 미션3(=행성3 최종) 완료.
  function onAllNpcsDone() {
    popupOpen = true;
    ctx.setInputLocked(true);
    showInfo(
      ctx.uiRoot,
      '모두의 얼어붙은 마음이 녹았어요! 🎉\n얼음 행성의 친구들이 다시 웃어요!',
      '미션 완료',
      () => {
        npcs.clear();
        npcs = null;
        popupOpen = false;
        ctx.setInputLocked(false);
        ctx.onComplete();
      },
      '🎉',
    );
  }

  function update(dt) {
    elapsed += dt;
    // Stage 2: NPC가 로드돼 있으면 감정 애니메이션을 매 프레임 갱신하고 근접 시 대화를 연다.
    if (npcs && npcGame) {
      npcs.update(dt, ctx.camera);
      if (popupOpen || elapsed < npcCooldown) return;
      const p = ctx.camera.position;
      // NPC는 방향 무관 거리로 접촉 인정(뒤로 가다 지나치는 문제 방지) — 대신 접촉 시 정면을 향해 회전.
      const near = npcs.nearest(p.x, p.z, PROXIMITY, (d) => !npcGame.isDone(d.id));
      if (near) { openNpcDialogue(near); return; }
      const doneNear = npcs.nearest(p.x, p.z, PROXIMITY, (d) => npcGame.isDone(d.id));
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
    const yaw = ctx.camera.rotation.y;
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) }; // playermove와 동일한 전방 규약
    const near = bubbles.nearest(p.x, p.z, PROXIMITY, forward, FRONT_MIN_DOT);
    if (near) openPopup(near);
  }

  // 현재 남은 말풍선들의 월드 좌표 — 미니맵이 매 프레임 읽는다.
  function bubblePoints() {
    return bubbles ? bubbles.points() : [];
  }

  // stage2 NPC들의 월드 좌표 + 완료 여부 — 미니맵이 매 프레임 읽는다.
  function npcPoints() {
    return npcs ? npcs.points() : [];
  }

  return { start, update, bubblePoints, npcPoints };
}
