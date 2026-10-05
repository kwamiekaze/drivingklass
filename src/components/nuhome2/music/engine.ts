import { cinema } from '../world/reel';

export type Track = { id: string; title: string; url: string };

/**
 * The home page player. One <audio> element walks the playlist; a Web Audio analyser listens to the bass and calls a beat
 * whenever it jumps above its recent average. Every fourth beat becomes a camera cut (see cinema.beatCuts).
 */
class Engine {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private an: AnalyserNode | null = null;
  private bins = new Uint8Array(0);
  private hist: number[] = [];
  private lastBeat = 0;
  private beats = 0;
  tracks: Track[] = [];
  index = 0;
  playing = false;
  private listeners = new Set<() => void>();
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private emit() { this.listeners.forEach(f => f()); }

  setTracks(t: Track[]) { const same = t.length === this.tracks.length && t.every((x, i) => x.id === this.tracks[i]!.id); this.tracks = t; if (!same && this.playing) { this.index = 0; this.load(); } if (!t.length) this.pause(); }
  private ensure() {
    if (this.el) return;
    const a = new Audio(); a.crossOrigin = 'anonymous'; a.preload = 'auto'; a.loop = false;
    a.addEventListener('ended', () => { this.index = (this.index + 1) % Math.max(1, this.tracks.length); this.load(); void a.play().catch(() => {}); });
    a.addEventListener('error', () => { if (this.tracks.length > 1) { this.index = (this.index + 1) % this.tracks.length; this.load(); void a.play().catch(() => {}); } });
    this.el = a;
  }
  private wire() {
    if (this.an || !this.el) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC(); const src = this.ctx.createMediaElementSource(this.el); this.an = this.ctx.createAnalyser(); this.an.fftSize = 1024; this.an.smoothingTimeConstant = .55;
      src.connect(this.an); this.an.connect(this.ctx.destination); this.bins = new Uint8Array(this.an.frequencyBinCount);
    } catch { this.an = null; }
  }
  private load() { if (!this.el || !this.tracks.length) return; this.el.src = this.tracks[this.index % this.tracks.length]!.url; }
  /** Must be called from a tap or click. */
  async play() {
    if (!this.tracks.length) return; this.ensure(); this.wire();
    if (this.ctx?.state === 'suspended') await this.ctx.resume().catch(() => {});
    if (!this.el!.src) this.load();
    try { await this.el!.play(); this.playing = true; cinema.playing = true; } catch { this.playing = false; cinema.playing = false; }
    this.emit();
  }
  pause() { this.el?.pause(); this.playing = false; cinema.playing = false; this.emit(); }
  toggle() { return this.playing ? (this.pause(), Promise.resolve()) : this.play(); }
  next() { if (!this.tracks.length) return; this.index = (this.index + 1) % this.tracks.length; this.load(); if (this.playing) void this.el?.play().catch(() => {}); this.emit(); }
  /** Called every frame by the camera rig. */
  tick(now: number) {
    if (!this.playing || !this.an) return;
    this.an.getByteFrequencyData(this.bins);
    let bass = 0; for (let i = 1; i <= 7; i++) bass += this.bins[i]!; bass /= 7;
    this.hist.push(bass); if (this.hist.length > 45) this.hist.shift();
    const avg = this.hist.reduce((a, b) => a + b, 0) / this.hist.length;
    if (bass > 105 && bass > avg * 1.26 && now - this.lastBeat > .3) { this.lastBeat = now; this.beats++; if (this.beats % 4 === 0) cinema.beatCuts++; }
  }
}
export const engine = new Engine();
