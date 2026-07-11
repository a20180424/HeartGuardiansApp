// GLB 모델 URL 맵 + stage1 문장 데이터. 원본 import.meta.glob 대신 명시적 맵.
import hexA from "/assets/planet3/world/models/hex-01a.glb?url";
import hexB from "/assets/planet3/world/models/hex-01b.glb?url";
import tree01 from "/assets/planet3/world/models/tree-01.glb?url";
import tree02a from "/assets/planet3/world/models/tree-02a.glb?url";
import tree02b from "/assets/planet3/world/models/tree-02b.glb?url";
import tree02c from "/assets/planet3/world/models/tree-02c.glb?url";
import rock01 from "/assets/planet3/world/models/rock-01.glb?url";
import snowRock01 from "/assets/planet3/world/models/snow-rock-01.glb?url";
import snowRock02 from "/assets/planet3/world/models/snow-rock-02.glb?url";
import edgeRock from "/assets/planet3/world/models/snow-rock-cluster-03.glb?url";
import monument from "/assets/planet3/world/models/stone-monument-01-lit.glb?url";
import bubble from "/assets/planet3/world/models/speech-bubble.glb?url";
import stage1 from "./stage1-sentences.json";

export type ModelKey =
  | "hexA" | "hexB"
  | "tree01" | "tree02a" | "tree02b" | "tree02c"
  | "rock01" | "snowRock01" | "snowRock02"
  | "edgeRock" | "monument" | "bubble";

export const MODEL_URLS: Record<ModelKey, string> = {
  hexA, hexB, tree01, tree02a, tree02b, tree02c,
  rock01, snowRock01, snowRock02, edgeRock, monument, bubble,
};

export type Bubble = { q: number; r: number; text: string; good: boolean };
export const STAGE1_DATA = stage1 as { passScore: number; bubbles: Bubble[] };
