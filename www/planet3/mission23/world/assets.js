// GLB 모델 URL 맵 + stage 문장/NPC 데이터.
// src/scenes/planet/planet3/world/assets.ts 이식 — Vite `?url` import 대신 명시적 경로 맵.
// 경로는 페이지(www/planet3/mission23/index.html) 기준 상대경로 — GLTFLoader 는 문서 URL 기준으로 해석한다.
import stage1 from "./stage1-sentences.js";
import stage2 from "./stage2-npcs.js";

const M = "../../assets/planet3/world/models/";

export const MODEL_URLS = {
  hexA: M + "hex-01a.glb",
  hexB: M + "hex-01b.glb",
  tree01: M + "tree-01.glb",
  tree02a: M + "tree-02a.glb",
  tree02b: M + "tree-02b.glb",
  tree02c: M + "tree-02c.glb",
  rock01: M + "rock-01.glb",
  snowRock01: M + "snow-rock-01.glb",
  snowRock02: M + "snow-rock-02.glb",
  edgeRock: M + "snow-rock-cluster-03.glb",
  monument: M + "stone-monument-01-lit.glb",
  bubble: M + "speech-bubble.glb",
  npc1: M + "NPCs/npcA1.glb",
  npc2: M + "NPCs/npcB2.glb",
  npc3: M + "NPCs/npcC2.glb",
};

export const STAGE1_DATA = stage1;
export const STAGE2_DATA = stage2;
