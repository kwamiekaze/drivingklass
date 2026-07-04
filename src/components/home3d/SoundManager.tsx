import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type SoundEvent = "engine" | "tick" | "whoosh";

interface SoundApi {
  muted: boolean;
  toggle: () => void;
  play: (evt: SoundEvent) => void;
}

const Ctx = createContext<SoundApi>({
  muted: true,
  toggle: () => {},
  play: () => {},
});

const STORAGE_KEY = "dk_hero_muted_v1";

/**
 * WebAudio-synthesized ambient + fx. Zero binary assets.
 * Off by default; unmute requires a user gesture (autoplay-safe).
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "off"; // default: muted
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const padStopRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;
    return ctx;
  }, []);

  const startPad = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = 110;
    o2.frequency.value = 138.6; // rough minor third
    g.gain.value = 0;
    o1.connect(g);
    o2.connect(g);
    g.connect(master);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.06, now + 2.5);
    o1.start();
    o2.start();
    padStopRef.current = () => {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.4);
      o1.stop(t + 0.5);
      o2.stop(t + 0.5);
    };
  }, []);

  const playEngine = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = 60;
    o.connect(g);
    g.connect(master);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.6);
    g.gain.linearRampToValueAtTime(0, t + 0.9);
    o.start();
    o.stop(t + 1.0);
  }, []);

  const playTick = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 880;
    o.connect(g);
    g.connect(master);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.start();
    o.stop(t + 0.1);
  }, []);

  const playWhoosh = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const bufSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start();
  }, []);

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (!next) {
        // Unmuting — user gesture required, safe here.
        const ctx = ensureContext();
        if (ctx) {
          if (ctx.state === "suspended") ctx.resume();
          if (!startedRef.current) {
            startedRef.current = true;
            playEngine();
            setTimeout(startPad, 400);
          } else {
            startPad();
          }
        }
      } else {
        padStopRef.current?.();
        padStopRef.current = null;
      }
      return next;
    });
  }, [ensureContext, playEngine, startPad]);

  const play = useCallback(
    (evt: SoundEvent) => {
      if (muted) return;
      if (evt === "tick") playTick();
      else if (evt === "whoosh") playWhoosh();
      else if (evt === "engine") playEngine();
    },
    [muted, playTick, playWhoosh, playEngine]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      padStopRef.current?.();
      ctxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const value = useMemo(() => ({ muted, toggle, play }), [muted, toggle, play]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSound = () => useContext(Ctx);
