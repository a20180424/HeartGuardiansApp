/* audio.ts — synthesized SFX (Web Audio API). game/src/audio.js 충실 이식.
 *
 * 에셋 파일 없이 oscillator + gain 엔벨로프로 모든 소리를 생성한다(라이선스/캐시 무관).
 * 브라우저 자동재생 정책상 첫 사용자 제스처(탭) 전에는 소리가 나지 않으므로,
 * MissionPlayer가 첫 pointerdown에서 unlock()을 호출한다. 음소거(master gain 0)는
 * localStorage(hg_muted)에 저장된다. */
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

/* sound library — name -> function(am). Kept soft (low per-note gain). */
const SOUNDS: Record<string, (a: AudioManager) => void> = {
  tap: (a) => a.tone({ freq: 520, type: "sine", dur: 0.05, gain: 0.11, release: 0.05 }),
  pop: (a) =>
    a.tone({ freq: 400, type: "triangle", dur: 0.07, gain: 0.13, glideTo: 680, release: 0.06 }),
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
    a.tone({ freq: 320, type: "sine", dur: 0.16, gain: 0.13, glideTo: 200, release: 0.1 }),
  stage: (a) => {
    a.tone({ freq: 600, type: "triangle", dur: 0.08, gain: 0.12 });
    a.tone({ freq: 900, type: "triangle", start: 0.08, dur: 0.1, gain: 0.12 });
  },
  sparkle: (a) => {
    for (let i = 0; i < 6; i++)
      a.tone({
        freq: 1600 + Math.random() * 1100,
        type: "triangle",
        start: i * 0.05,
        dur: 0.1,
        gain: 0.06,
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
      a.tone({ freq: f, type: "triangle", start: i * 0.07, dur: 0.14, gain: 0.12, release: 0.12 }),
    ),
};

/* 앱 전역 단일 인스턴스. 예전엔 MissionPlayer가 직접 new 했으나, 그러면 미션이
 * 마운트돼야 오디오가 생기고 unlock 도 미션 안 첫 탭에서만 걸려 홈·로그인이 무음이었다.
 * 이제 App 이 첫 제스처에서 unlock 하고, 모든 씬이 이 하나를 공유한다. */
export const audio = new AudioManager();
