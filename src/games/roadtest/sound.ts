/**
 * WebAudio sound system — 100% synthesized, no audio files.
 * AudioContext is lazily created on the first user gesture (browser autoplay rules).
 * Self-recovering: engine + music intents are remembered and re-attached whenever
 * the context finally reaches 'running' (first tap, tab refocus, etc.).
 *
 * Signal path:
 *   [SFX nodes] -> sfxBus (0.45) -\
 *                                  masterGain (mute switch) -> destination
 *   [Music nodes] -> musicBus (0.7) /
 *
 * NOTE: The iOS hardware silent switch mutes WebAudio at the OS level regardless
 * of what we do here. Nothing to fix in code.
 */

const MUTE_KEY = 'dk-game-muted';
const MUSIC_MUTE_KEY = 'dk-game-music-muted';
const SFX_MUTE_KEY = 'dk-game-sfx-muted';

const MASTER_LEVEL = 0.9;
const MUSIC_LEVEL = 0.7;
const SFX_LEVEL = 0.45;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let engineRunning = false;

let muted = false;
let musicMuted = false;
let sfxMuted = false;

// Tire screech state (throttled)
let lastScreechAt = 0;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
  musicMuted = localStorage.getItem(MUSIC_MUTE_KEY) === '1';
  sfxMuted = localStorage.getItem(SFX_MUTE_KEY) === '1';
} catch { /* ignore */ }

let mediaDest: MediaStreamAudioDestinationNode | null = null;
let mediaEl: HTMLAudioElement | null = null;

function ensureMediaElement() {
  if (mediaEl || typeof document === 'undefined') return;
  try {
    mediaEl = document.createElement('audio');
    mediaEl.autoplay = false;
    (mediaEl as any).playsInline = true;
    mediaEl.setAttribute('playsinline', '');
    mediaEl.setAttribute('webkit-playsinline', '');
    mediaEl.muted = false;
    mediaEl.style.display = 'none';
    document.body.appendChild(mediaEl);
  } catch { /* ignore */ }
}

function tryPlayMediaEl() {
  if (!mediaEl) return;
  if (mediaEl.paused) {
    const p = mediaEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* ignore */ });
  }
}

function buildContext() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : MASTER_LEVEL;

    musicBus = ctx.createGain();
    musicBus.gain.value = musicMuted ? 0 : MUSIC_LEVEL;
    musicBus.connect(masterGain);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxMuted ? 0 : SFX_LEVEL;
    sfxBus.connect(masterGain);

    // Route through a MediaStream so iOS treats output as media playback
    // (unaffected by the ring/silent switch), instead of ctx.destination.
    try {
      mediaDest = ctx.createMediaStreamDestination();
      masterGain.connect(mediaDest);
      ensureMediaElement();
      if (mediaEl) {
        try { (mediaEl as any).srcObject = mediaDest.stream; } catch { /* ignore */ }
      }
    } catch {
      masterGain.connect(ctx.destination);
    }
  } catch { /* ignore */ }
}

function isRunning() {
  return !!ctx && (ctx.state as string) === 'running';
}

function rebuildIfClosed() {
  if (!ctx || (ctx.state as string) === 'closed') {
    ctx = null;
    masterGain = null;
    musicBus = null;
    sfxBus = null;
    engineOsc = null; engineGain = null; engineFilter = null;
    music.teardown();
    buildContext();
  }
}

function buildEngineNodes() {
  if (!ctx || !sfxBus || engineOsc) return;
  try {
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(sfxBus);
    engineOsc.start();
  } catch { /* ignore */ }
}

// ============================================================================
// MUSIC ENGINE — procedural synthwave/arcade groove
// ============================================================================

export type MusicMood = 'calm' | 'tense' | 'dark' | 'ethereal';

interface MoodPreset {
  bpm: number;          // base BPM
  keyMidi: number;      // root MIDI (A2 = 45)
  minor: boolean;
  padType: OscillatorType;
  leadType: OscillatorType;
  bassType: OscillatorType;
  filterBase: number;
  filterPeak: number;
  padLevel: number;
  kickLevel: number;
}

const MOODS: Record<MusicMood, MoodPreset> = {
  calm:     { bpm:  96, keyMidi: 48, minor: false, padType: 'sine',     leadType: 'triangle', bassType: 'triangle', filterBase: 1200, filterPeak: 2600, padLevel: 0.13, kickLevel: 0.45 },
  tense:    { bpm: 108, keyMidi: 45, minor: true,  padType: 'sawtooth', leadType: 'square',   bassType: 'sawtooth', filterBase: 1500, filterPeak: 3200, padLevel: 0.10, kickLevel: 0.55 },
  dark:     { bpm: 118, keyMidi: 41, minor: true,  padType: 'sawtooth', leadType: 'square',   bassType: 'sawtooth', filterBase: 1800, filterPeak: 3600, padLevel: 0.11, kickLevel: 0.60 },
  ethereal: { bpm:  88, keyMidi: 50, minor: true,  padType: 'triangle', leadType: 'sine',     bassType: 'sine',     filterBase: 1000, filterPeak: 2200, padLevel: 0.14, kickLevel: 0.38 },
};

// i - VI - III - VII (minor) as scale-degree root offsets in semitones from key
const PROGRESSION = [0, 8, 3, 10];

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class MusicEngine {
  private preset: MoodPreset = MOODS.tense;
  private wanted = false;
  private timer: number | null = null;
  private barIndex = 0;
  private combo = 1;
  private finalPush = false;
  private lowpass: BiquadFilterNode | null = null;
  private outGain: GainNode | null = null;
  private duckUntil = 0;

  wants() { return this.wanted; }

  start(mood: MusicMood = 'tense') {
    this.preset = MOODS[mood] ?? MOODS.tense;
    this.wanted = true;
    this.attach();
  }

  stop() {
    this.wanted = false;
    this.teardown();
  }

  setMood(mood: MusicMood) {
    if (this.preset === MOODS[mood]) return;
    this.preset = MOODS[mood] ?? MOODS.tense;
  }

  setCombo(combo: number) {
    this.combo = Math.max(1, combo | 0);
  }

  setFinalPush(v: boolean) {
    this.finalPush = v;
  }

  /** Duck the music briefly (loss aversion sting on crash). */
  duck(durMs = 200) {
    if (!ctx || !this.outGain) return;
    const t = ctx.currentTime;
    this.duckUntil = t + durMs / 1000;
    try {
      const g = this.outGain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.25, t + 0.03);
      g.linearRampToValueAtTime(1.0, t + durMs / 1000 + 0.12);
    } catch { /* ignore */ }
    if (this.lowpass) {
      try {
        const f = this.lowpass.frequency;
        f.cancelScheduledValues(t);
        f.setValueAtTime(f.value, t);
        f.linearRampToValueAtTime(500, t + 0.04);
        f.linearRampToValueAtTime(this.preset.filterBase * 2, t + durMs / 1000 + 0.2);
      } catch { /* ignore */ }
    }
  }

  attach() {
    if (!isRunning() || !musicBus || this.timer !== null || muted || musicMuted) return;
    try {
      this.outGain = ctx!.createGain();
      this.outGain.gain.value = 1.0;
      this.lowpass = ctx!.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = this.preset.filterBase * 2;
      this.outGain.connect(this.lowpass).connect(musicBus);
    } catch { return; }
    this.barIndex = 0;
    this.scheduleNextBar();
  }

  teardown() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    if (this.outGain) { try { this.outGain.disconnect(); } catch { /* ignore */ } this.outGain = null; }
    if (this.lowpass) { try { this.lowpass.disconnect(); } catch { /* ignore */ } this.lowpass = null; }
  }

  private currentBpm() {
    // Tempo lifts slightly with combo (up to +12 BPM) and in final push (+6).
    const comboLift = Math.min(12, (this.combo - 1) * 1.5);
    const pushLift = this.finalPush ? 6 : 0;
    return this.preset.bpm + comboLift + pushLift;
  }

  private scheduleNextBar() {
    if (!isRunning() || !this.outGain || !ctx) { this.teardown(); return; }
    const bpm = this.currentBpm();
    const beatSec = 60 / bpm;
    const barSec = beatSec * 4;
    const t0 = ctx.currentTime + 0.05;
    this.scheduleBar(t0, beatSec);
    this.barIndex++;
    this.timer = window.setTimeout(() => this.scheduleNextBar(), barSec * 1000);
  }

  private scheduleBar(t0: number, beatSec: number) {
    if (!ctx || !this.outGain) return;
    const p = this.preset;
    const chordIdx = this.barIndex % PROGRESSION.length;
    const root = p.keyMidi + PROGRESSION[chordIdx];
    const third = root + (p.minor ? 3 : 4);
    const fifth = root + 7;
    const octave = root + 12;

    // ------- Kick: 4-on-the-floor -------
    for (let b = 0; b < 4; b++) this.kick(t0 + b * beatSec, p.kickLevel);

    // ------- Bass arpeggio (8ths) -------
    const bassNotes = [root, fifth, root, octave, fifth, root, octave, fifth];
    for (let i = 0; i < 8; i++) {
      this.pluck(t0 + i * (beatSec / 2), midi(bassNotes[i] - 12), 0.18, p.bassType, beatSec * 0.45);
    }

    // ------- Pad chord (full bar, layered) -------
    [root + 12, third + 12, fifth + 12].forEach((n, i) => {
      this.pad(t0, midi(n), p.padLevel * (i === 0 ? 1 : 0.75), p.padType, beatSec * 4);
    });

    // ------- Combo layer: rising arp at x3+ -------
    if (this.combo >= 3) {
      const arp = [root, third, fifth, octave, fifth, third];
      for (let i = 0; i < 8; i++) {
        const n = arp[i % arp.length] + 12;
        this.pluck(t0 + i * (beatSec / 2) + beatSec / 4, midi(n), 0.09, 'triangle', beatSec * 0.35);
      }
    }

    // ------- Combo layer: brighter lead motif at x5+ -------
    if (this.combo >= 5) {
      const motif = [octave, octave + 2, octave + 5, octave + 7];
      for (let i = 0; i < motif.length; i++) {
        this.pluck(t0 + (i * beatSec) + beatSec * 0.5, midi(motif[i] + 12), 0.11, p.leadType, beatSec * 0.9);
      }
    }

    // ------- Sparkle motif every 8 bars -------
    if (this.barIndex % 8 === 7) {
      const sp = [octave + 12, octave + 15, octave + 19, octave + 24];
      for (let i = 0; i < sp.length; i++) {
        this.pluck(t0 + i * (beatSec / 4) + beatSec * 2, midi(sp[i]), 0.08, 'sine', beatSec * 0.9);
      }
    }

    // ------- Final push: triumphant sub-octave doubling -------
    if (this.finalPush) {
      this.pad(t0, midi(root - 12), 0.14, 'sawtooth', beatSec * 4);
    }

    // Slow filter breathing tied to combo
    if (this.lowpass) {
      const target = p.filterBase + Math.min(this.combo - 1, 6) * ((p.filterPeak - p.filterBase) / 6);
      try {
        // Don't fight an active duck.
        if (ctx.currentTime > this.duckUntil) {
          this.lowpass.frequency.setTargetAtTime(target, t0, 0.6);
        }
      } catch { /* ignore */ }
    }
  }

  private kick(t: number, vol: number) {
    if (!ctx || !this.outGain) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(this.outGain);
      o.start(t); o.stop(t + 0.3);
    } catch { /* ignore */ }
  }

  private pluck(t: number, freq: number, vol: number, type: OscillatorType, dur: number) {
    if (!ctx || !this.outGain) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.outGain);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  private pad(t: number, freq: number, vol: number, type: OscillatorType, dur: number) {
    if (!ctx || !this.outGain) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.2));
      g.gain.setValueAtTime(vol, t + dur - Math.min(0.5, dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.outGain);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }
}

const music = new MusicEngine();

// ============================================================================

/** Re-attach any intended-but-missing audio nodes now that ctx is running. */
function revive() {
  if (!isRunning()) return;
  if (engineRunning && !engineOsc) buildEngineNodes();
  if (music.wants()) music.attach();
  tryPlayMediaEl();
}

// Visibility handler — pause engine + music when hidden; revive on return.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (engineOsc) {
        try { engineOsc.stop(); } catch { /* ignore */ }
        try { engineOsc.disconnect(); } catch { /* ignore */ }
        engineOsc = null;
      }
      if (engineGain) { try { engineGain.disconnect(); } catch { /* ignore */ } engineGain = null; }
      if (engineFilter) { try { engineFilter.disconnect(); } catch { /* ignore */ } engineFilter = null; }
      music.teardown();
    } else {
      sound.ensureRunning();
      revive();
      tryPlayMediaEl();
    }
  });
}

export const sound = {
  get muted() { return muted; },
  get musicMuted() { return musicMuted; },
  get sfxMuted() { return sfxMuted; },
  isReady() { return ctx !== null; },

  /** Call from a user gesture to unlock audio. */
  init() {
    if (!ctx) buildContext();
    ensureMediaElement();
    this.ensureRunning();
    tryPlayMediaEl();
  },

  /** Resume the audio context if it's in any non-running state. Safe to call often. */
  ensureRunning() {
    rebuildIfClosed();
    if (!ctx) return;
    if ((ctx.state as string) === 'running') {
      revive();
      tryPlayMediaEl();
      return;
    }
    try {
      const p = ctx.resume();
      if (p && typeof p.then === 'function') {
        p.then(() => { revive(); tryPlayMediaEl(); }).catch(() => {
          try { ctx?.close(); } catch { /* ignore */ }
          ctx = null; masterGain = null;
        });
      }
    } catch {
      try { ctx?.close(); } catch { /* ignore */ }
      ctx = null; masterGain = null;
    }
  },

  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (masterGain && ctx) {
      try { masterGain.gain.setTargetAtTime(v ? 0 : MASTER_LEVEL, ctx.currentTime, 0.02); } catch { /* ignore */ }
    }
  },

  toggleMute(): boolean {
    this.setMuted(!muted);
    if (muted) music.teardown();
    else if (music.wants() && !musicMuted) music.attach();
    return muted;
  },

  setMusicMuted(v: boolean) {
    musicMuted = v;
    try { localStorage.setItem(MUSIC_MUTE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (musicBus && ctx) {
      try { musicBus.gain.setTargetAtTime(v ? 0 : MUSIC_LEVEL, ctx.currentTime, 0.02); } catch { /* ignore */ }
    }
    if (v) music.teardown();
    else if (music.wants()) music.attach();
  },
  toggleMusicMuted(): boolean { this.setMusicMuted(!musicMuted); return musicMuted; },

  setSfxMuted(v: boolean) {
    sfxMuted = v;
    try { localStorage.setItem(SFX_MUTE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (sfxBus && ctx) {
      try { sfxBus.gain.setTargetAtTime(v ? 0 : SFX_LEVEL, ctx.currentTime, 0.02); } catch { /* ignore */ }
    }
  },
  toggleSfxMuted(): boolean { this.setSfxMuted(!sfxMuted); return sfxMuted; },

  startEngine() {
    engineRunning = true;
    if (isRunning()) buildEngineNodes();
  },

  /** speed 0..1 (mph / maxSpeed) */
  updateEngine(speed01: number) {
    if (!isRunning() || !engineOsc || !engineGain || !engineFilter) return;
    try {
      const t = ctx!.currentTime;
      engineOsc.frequency.setTargetAtTime(60 + speed01 * 220, t, 0.05);
      engineFilter.frequency.setTargetAtTime(300 + speed01 * 1400, t, 0.05);
      engineGain.gain.setTargetAtTime(0.02 + speed01 * 0.11, t, 0.05);
    } catch { /* ignore */ }
  },

  stopEngine() {
    engineRunning = false;
    if (engineOsc) {
      try { engineOsc.stop(); } catch { /* ignore */ }
      try { engineOsc.disconnect(); } catch { /* ignore */ }
      engineOsc = null;
    }
    if (engineGain) { try { engineGain.disconnect(); } catch { /* ignore */ } engineGain = null; }
    if (engineFilter) { try { engineFilter.disconnect(); } catch { /* ignore */ } engineFilter = null; }
  },

  starPickup() { playArp([880, 1175, 1568], 0.07, 'triangle', 0.12); },
  checkpoint() { playArp([660, 990], 0.09, 'sine', 0.14); },
  stopDing() { playTone(1320, 0.18, 'sine', 0.15); },
  collision() {
    playThud();
    music.duck(220);
    try { navigator.vibrate?.(60); } catch { /* ignore */ }
  },
  nearMissHorn() { playTone(340, 0.16, 'square', 0.10); },
  nearMissWhoosh() {
    if (!isRunning() || !sfxBus) return;
    try {
      const t = ctx!.currentTime;
      const dur = 0.22;
      const buf = ctx!.createBuffer(1, Math.floor(ctx!.sampleRate * dur), ctx!.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx!.createBufferSource();
      src.buffer = buf;
      const bp = ctx!.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 4;
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(sfxBus);
      src.start(t); src.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  },
  dogBark() {
    playTone(720, 0.06, 'square', 0.09);
    setTimeout(() => playTone(880, 0.06, 'square', 0.09), 90);
  },
  ownerShout() {
    if (!isRunning() || !sfxBus) return;
    try {
      const t = ctx!.currentTime;
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(220, t + 0.22);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(g).connect(sfxBus);
      o.start(t); o.stop(t + 0.26);
    } catch { /* ignore */ }
  },
  yieldBuzz() {
    playTone(180, 0.09, 'sawtooth', 0.10);
    setTimeout(() => playTone(150, 0.09, 'sawtooth', 0.10), 90);
  },
  catastrophe() {
    // Loud sting — briefly ducks the music.
    playThud();
    music.duck(500);
    if (!isRunning() || !sfxBus) return;
    try {
      const t = ctx!.currentTime;
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.6);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(g).connect(sfxBus);
      o.start(t); o.stop(t + 0.7);
    } catch { /* ignore */ }
  },
  threeStarJingle() {
    playArp([784, 988, 1319, 1568, 1976], 0.09, 'triangle', 0.16);
  },
  fanfare() { playArp([523, 659, 784, 1047, 1319], 0.11, 'triangle', 0.18); },
  uiTick() { playTone(880, 0.04, 'square', 0.05); },

  tireScreech(intensity01 = 0.7) {
    if (!isRunning() || !sfxBus) return;
    const now = performance.now();
    if (now - lastScreechAt < 180) return;
    lastScreechAt = now;
    try {
      const t = ctx!.currentTime;
      const dur = 0.28;
      const buf = ctx!.createBuffer(1, Math.floor(ctx!.sampleRate * dur), ctx!.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx!.createBufferSource();
      src.buffer = buf;
      const bp = ctx!.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1600;
      bp.Q.value = 8;
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.13 * intensity01, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(sfxBus);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  },

  /** Start looping generative background music with a chapter mood preset. */
  startMusic(mood: MusicMood = 'tense') {
    music.start(mood);
    if (!isRunning() || muted || musicMuted) return;
    music.attach();
  },

  stopMusic() { music.stop(); },
  setMusicMood(mood: MusicMood) { music.setMood(mood); },
  setMusicIntensity(combo: number) { music.setCombo(combo); },
  setMusicFinalPush(v: boolean) { music.setFinalPush(v); },
  duckMusic(ms = 220) { music.duck(ms); },
};

function playTone(freq: number, dur: number, type: OscillatorType, vol: number) {
  if (!isRunning() || !sfxBus) return;
  try {
    const t = ctx!.currentTime;
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch { /* ignore */ }
}

function playArp(freqs: number[], step: number, type: OscillatorType, vol: number) {
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, step * 1.6, type, vol), i * step * 1000);
  });
}

function playThud() {
  if (!isRunning() || !sfxBus) return;
  try {
    const t = ctx!.currentTime;
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + 0.3);

    const buf = ctx!.createBuffer(1, ctx!.sampleRate * 0.15, ctx!.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = ctx!.createBufferSource();
    n.buffer = buf;
    const ng = ctx!.createGain();
    ng.gain.value = 0.14;
    n.connect(ng).connect(sfxBus);
    n.start(t);
  } catch { /* ignore */ }
}

/** Pick a chapter-appropriate music mood for a given level config. */
export function pickMoodForLevel(level: { id: string; nightAlpha?: number; endless?: boolean; weatherTint?: unknown }): MusicMood {
  if (level.nightAlpha && level.nightAlpha > 0.15) return 'ethereal';
  const id = level.id;
  const dark = ['road-test-final', 'everything-at-once', 'city-gauntlet', 'precision-parking-final', 'snowbelt-skid', 'foggy-backroads'];
  if (dark.includes(id)) return 'dark';
  const calm = ['parking-lot', 'neighborhood', 'school-zone', 'roundabout-rookie'];
  if (calm.includes(id)) return 'calm';
  return 'tense';
}
