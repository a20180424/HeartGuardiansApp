/* audio.ts — synthesized SFX (Web Audio API). game/src/audio.js 충실 이식.
 *
 * 에셋 파일 없이 oscillator + gain 엔벨로프로 모든 소리를 생성한다(라이선스/캐시 무관).
 * 브라우저 자동재생 정책상 첫 사용자 제스처(탭) 전에는 소리가 나지 않으므로,
 * MissionPlayer가 첫 pointerdown에서 unlock()을 호출한다. 음소거(master gain 0)는
 * localStorage(hg_muted)에 저장된다. */
import { useSyncExternalStore } from "react";

type ToneOpts = {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  release?: number;
  gain?: number;
  attack?: number;
  start?: number;
  glideTo?: number;
};

export class AudioManager {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted: boolean;
  private _unlocked = false;
  readonly VOL = 0.5; // master volume when unmuted
  // 음소거 상태 구독자들. useMuted()(useSyncExternalStore)가 여기 매달려
  // MuteButton뿐 아니라 인트로/아웃트로 영상 등도 음소거 변경에 반응하게 한다.
  private muteListeners = new Set<(m: boolean) => void>();

  /** 음소거 상태가 바뀔 때마다 fn을 호출한다. 구독 해제 함수를 반환한다. */
  onMuteChange(fn: (m: boolean) => void): () => void {
    this.muteListeners.add(fn);
    return () => this.muteListeners.delete(fn);
  }

  constructor() {
    // 모듈 로드 시점에 만들어지는 싱글턴이라 localStorage 가 없는 환경(node 테스트)에서도
    // 생성자가 터지지 않아야 한다. 브라우저가 아니면 기본값(음소거 아님)으로 둔다.
    this.muted = typeof localStorage !== "undefined" && localStorage.getItem("hg_muted") === "1";
  }

  private _ensure() {
    if (this.ctx) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.VOL;
    this.master.connect(this.ctx.destination);
  }

  /* call on the first user gesture (tap) to satisfy autoplay policy */
  unlock() {
    this._ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    this._unlocked = true;
  }

  setMuted(m: boolean) {
    this.muted = m;
    // localStorage가 없는 환경에서도 in-memory 상태와 master gain은 업데이트한다.
    // 브라우저 환경에서만 localStorage 에 저장한다.
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("hg_muted", m ? "1" : "0");
    }
    if (this.master) this.master.gain.value = m ? 0 : this.VOL;
    this.muteListeners.forEach((fn) => fn(m));
  }
  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /* one oscillator note with a quick attack + exponential release */
  tone(o: ToneOpts) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (o.start || 0);
    const dur = o.dur || 0.15,
      rel = o.release || 0.08,
      gain = o.gain || 0.15;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + rel + 0.02);
  }

  play(name: string) {
    if (this.muted || !this._unlocked) return;
    this._ensure();
    const fn = SOUNDS[name];
    if (fn) fn(this);
  }
}

/* sound library — name -> function(am).
 *
 * gain 은 사람이 사운드 벤치(tools/sound-bench.html)에서 번갈아 들으며 맞춘 값이다.
 * 숫자를 통일한 게 아니라 "같은 크기로 들리게" 맞춘 것이라 값이 들쭉날쭉한 게 정상이다 —
 * 파형(sawtooth 가 sine 보다 훨씬 큼), 동시에 울리는 음 개수, 주파수별 귀의 민감도가
 * 전부 다르기 때문. 예: whoosh 0.06 은 sawtooth 라서 그 값이면 충분하다. */
const SOUNDS: Record<string, (a: AudioManager) => void> = {
  tap: (a) => a.tone({ freq: 520, type: "sine", dur: 0.05, gain: 0.16, release: 0.05 }),
  pop: (a) =>
    a.tone({ freq: 400, type: "triangle", dur: 0.07, gain: 0.16, glideTo: 680, release: 0.06 }),
  select: (a) => {
    a.tone({ freq: 600, type: "triangle", dur: 0.06, gain: 0.14 });
    a.tone({ freq: 900, type: "triangle", start: 0.05, dur: 0.07, gain: 0.12 });
  },
  drop: (a) => {
    a.tone({ freq: 880, type: "sine", dur: 0.08, gain: 0.16 });
    a.tone({ freq: 1320, type: "sine", start: 0.06, dur: 0.14, gain: 0.13, release: 0.12 });
  },
  whoosh: (a) =>
    a.tone({ freq: 520, type: "sawtooth", dur: 0.14, gain: 0.06, glideTo: 150, release: 0.06 }),
  correct: (a) =>
    [660, 880, 1175].forEach((f, i) =>
      a.tone({ freq: f, type: "triangle", start: i * 0.1, dur: 0.12, gain: 0.15, release: 0.12 }),
    ),
  wrong: (a) =>
    a.tone({ freq: 320, type: "sine", dur: 0.16, gain: 0.15, glideTo: 200, release: 0.1 }),
  stage: (a) => {
    a.tone({ freq: 600, type: "triangle", dur: 0.08, gain: 0.12 });
    a.tone({ freq: 900, type: "triangle", start: 0.08, dur: 0.1, gain: 0.12 });
  },
  // 6음이 겹쳐 울리므로 개별 gain 이 작아도 합치면 크다. recover·fanfare 가 이걸
  // 덧붙여 부르므로 여기를 바꾸면 그 둘도 같이 커진다.
  sparkle: (a) => {
    for (let i = 0; i < 6; i++)
      a.tone({
        freq: 1600 + Math.random() * 1100,
        type: "triangle",
        start: i * 0.05,
        dur: 0.1,
        gain: 0.07,
        release: 0.12,
      });
  },
  recover: (a) => {
    a.tone({ freq: 200, type: "sawtooth", dur: 0.4, gain: 0.11, glideTo: 900, release: 0.15 });
    SOUNDS.sparkle(a);
  },
  reveal: (a) =>
    [784, 988, 1318].forEach((f) =>
      a.tone({ freq: f, type: "triangle", dur: 0.3, gain: 0.1, release: 0.25 }),
    ),
  fanfare: (a) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      a.tone({ freq: f, type: "triangle", start: i * 0.1, dur: 0.16, gain: 0.14, release: 0.14 }),
    );
    SOUNDS.sparkle(a);
  },
  title: (a) =>
    [523, 659, 784, 1047].forEach((f, i) =>
      a.tone({ freq: f, type: "triangle", start: i * 0.07, dur: 0.14, gain: 0.13, release: 0.12 }),
    ),
  // 말풍선 타자기. 어절마다 한 번꼴로만 울리므로(typeSound.ts BLIP_EVERY 참조)
  // 또렷하게 들려도 지치지 않는다. 아래 값은 전부 사람이 실제 대사를 들으며 맞춘 것이다.
  // triangle: sine 은 배음이 없어 뭉툭했다 — 약한 홀수 배음이 선명함을 준다.
  // 하티(가이드)는 낮게, 친구(감정을 말하는 외계인)는 높게.
  blipHati: (a) =>
    a.tone({ freq: 500, type: "triangle", dur: 0.05, gain: 0.2, attack: 0.01, release: 0.04 }),
  blipFriend: (a) =>
    a.tone({ freq: 600, type: "triangle", dur: 0.05, gain: 0.2, attack: 0.01, release: 0.04 }),
};

/* 앱 전역 단일 인스턴스. 예전엔 MissionPlayer가 직접 new 했으나, 그러면 미션이
 * 마운트돼야 오디오가 생기고 unlock 도 미션 안 첫 탭에서만 걸려 홈·로그인이 무음이었다.
 * 이제 App 이 첫 제스처에서 unlock 하고, 모든 씬이 이 하나를 공유한다. */
export const audio = new AudioManager();

/** 현재 음소거 상태를 구독하는 훅. MuteButton뿐 아니라 인트로/아웃트로처럼
 * 앱 음소거에 맞춰 자신의 볼륨(예: 영상 muted)도 함께 바꿔야 하는 곳에서 쓴다. */
// useSyncExternalStore 는 subscribe 의 identity 가 바뀌면 재구독한다.
// 훅 안에서 화살표 함수를 만들면 매 렌더마다 구독을 끊고 다시 걸게 되므로
// 모듈 최상단에 고정해 둔다. getSnapshot 은 원시값(boolean)이라 그대로 안전하다.
const subscribeMute = (onStoreChange: () => void) => audio.onMuteChange(onStoreChange);
const getMutedSnapshot = () => audio.muted;

export function useMuted(): boolean {
  return useSyncExternalStore(subscribeMute, getMutedSnapshot);
}
