import { useEffect, useRef, useState } from "react";
import { DMAX, park, parkCarAt, parkTotal } from "./world/park";

/**
 * The steering wheel in the header follows the real wheel of the car in the back lot (park.ts): the same steering angle the simulation turns the front wheels to, at every
 * moment of every manoeuvre, including the turns the wheel makes while the car stands still, and the straightening afterwards. The emblem turns by 450 degrees at full lock
 * (33 degrees at the road wheels), left for left. While the wheel is being turned, a pair of glowing gold arrows (the style of the PARKING and EXIT signs) curves round it in
 * the direction the driver's hands are moving, with a caption: TURN LEFT, TURN RIGHT or STRAIGHTEN. Mounted inside .n2-hdr-wheelwrap; it reads park.ts a frame at a time.
 */
const LOCK_DEG = 450;
type Hint = { dir: -1 | 0 | 1; label: string };
const NONE: Hint = { dir: 0, label: "" };
export function SteeringLive() {
  const host = useRef<HTMLSpanElement>(null);
  const [hint, setHint] = useState<Hint>(NONE);
  useEffect(() => {
    const wrap = host.current?.parentElement, img = wrap?.querySelector("img") as HTMLImageElement | null;
    if (!wrap || !img) return;
    let raf = 0, last = performance.now(), deg = 0, shown = NONE, hold = 0, lastKey = "";
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const run = park.phase === "run", T = parkTotal();
      let steer = 0, ahead = 0;
      if (run) { steer = parkCarAt(Math.min(park.t, T)).steer; ahead = parkCarAt(Math.min(park.t + .3, T)).steer; }
      const target = -steer / DMAX * LOCK_DEG;                            // left (positive steer) turns the wheel counter-clockwise
      deg += (target - deg) * (1 - Math.exp(-16 * dt)); if (Math.abs(target - deg) < .05) deg = target;
      img.style.transform = Math.abs(deg) < .01 ? "" : `rotate(${deg.toFixed(2)}deg)`;
      const turning = Math.abs(deg) > 3;
      if (wrap.dataset.turn !== (turning ? "on" : "off")) wrap.dataset.turn = turning ? "on" : "off";
      // which way are the hands moving? (over the next 0.3 s; held on screen for a moment so a short turn is still read)
      const d = ahead - steer; let h = NONE;
      if (run && Math.abs(d) > .012) h = { dir: d > 0 ? 1 : -1, label: Math.abs(ahead) < Math.abs(steer) ? "STRAIGHTEN" : d > 0 ? "TURN LEFT" : "TURN RIGHT" };
      if (h.dir !== 0) { shown = h; hold = .45; } else if (hold > 0) { hold -= dt; } else shown = NONE;
      const key = shown.dir + shown.label; if (key !== lastKey) { lastKey = key; setHint(shown); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); img.style.transform = ""; };
  }, []);
  // clockwise arrows (right); the left ones are the same drawing mirrored
  const arrow = <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 17.5A46 46 0 0 1 82.5 17.5" /><path d="M80.8 7.6L82.5 17.5L72.6 15.8" /></g>;
  return (
    <span ref={host} className="n2-steer" data-dir={hint.dir} aria-hidden={hint.dir === 0}>
      <svg viewBox="0 0 100 100" className="n2-steer-arrows" style={{ transform: hint.dir > 0 ? "scaleX(-1)" : undefined }}>{arrow}<g transform="rotate(180 50 50)">{arrow}</g></svg>
      <span className="n2-steer-cap" role="status">{hint.label}</span>
    </span>
  );
}
