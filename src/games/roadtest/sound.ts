/**
 * WebAudio sound system — 100% synthesized, no audio files.
 * All sounds are procedurally generated using oscillators + noise buffers.
 * AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */

const MUTE_KEY = 'dk-game-muted';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch { /* ignore */ }

export const sound = {
  get muted() { return muted; },
  isReady() { return ctx !== null; },

  /** Call from a user gesture (button/tap/keydown) to unlock audio. */
  init() {
    if (ctx) return;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.55;
      masterGain.connect(ctx.destination);
    } catch { /* ignore */ }
  },

  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(v ? 0 : 0.55, ctx.currentTime, 0.02);
    }
  },

  toggleMute(): boolean {
    this.setMuted(!muted);
    return muted;
  },

  startEngine() {
    if (!ctx || !masterGain || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(masterGain);
    engineOsc.start();
  },

  /** speed 0..1 (mph / maxSpeed) */
  updateEngine(speed01: number) {
    if (!ctx || !engineOsc || !engineGain || !engineFilter) return;
    const t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(60 + speed01 * 220, t, 0.05);
    engineFilter.frequency.setTargetAtTime(300 + speed01 * 1400, t, 0.05);
    engineGain.gain.setTargetAtTime(0.02 + speed01 * 0.11, t, 0.05);
  },

  stopEngine() {
    if (engineOsc) {
      try { engineOsc.stop(); } catch { /* ignore */ }
      engineOsc.disconnect();
      engineOsc = null;
    }
    if (engineGain) { engineGain.disconnect(); engineGain = null; }
    if (engineFilter) { engineFilter.disconnect(); engineFilter = null; }
  },

  starPickup() {
    playArp([880, 1175, 1568], 0.07, 'triangle', 0.14);
  },

  checkpoint() {
    playArp([660, 990], 0.09, 'sine', 0.16);
  },

  stopDing() {
    playTone(1320, 0.18, 'sine', 0.18);
  },

  collision() {
    playThud();
    try { navigator.vibrate?.(60); } catch { /* ignore */ }
  },

  nearMissHorn() {
    playTone(340, 0.16, 'square', 0.12);
  },

  fanfare() {
    playArp([523, 659, 784, 1047, 1319], 0.11, 'triangle', 0.2);
  },

  uiTick() {
    playTone(880, 0.04, 'square', 0.06);
  },
};

function playTone(freq: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !masterGain) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function playArp(freqs: number[], step: number, type: OscillatorType, vol: number) {
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, step * 1.6, type, vol), i * step * 1000);
  });
}

function playThud() {
  if (!ctx || !masterGain) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
  g.gain.setValueAtTime(0.28, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.3);

  // Noise burst
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const n = ctx.createBufferSource();
  n.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.value = 0.18;
  n.connect(ng).connect(masterGain);
  n.start(t);
}
