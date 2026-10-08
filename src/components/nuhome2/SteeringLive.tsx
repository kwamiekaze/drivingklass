import { useEffect, useRef, useState } from "react";
import { DMAX, park, parkCarAt, parkTotal } from "./world/park";

/**
 * The steering wheel in the header follows the real wheel of the car in the back lot (park.ts): the same steering angle the simulation turns the front wheels to, at every
 * moment of every manoeuvre, including the turns the wheel makes while the car stands still, and the straightening afterwards. The emblem turns by 450 degrees at full lock
 * (33 degrees at the road wheels), left for left. While the wheel is being turned, a pair of glowing gold arrows (the style of the PARKING and EXIT signs) curves round it in
 * the direction the driver's hands are moving. It follows every drive up to the end of the left turn out of the bay; for the straight back and the way out (EXIT) it stays still.
 * Only during the parallel park and the reverse into the bay does a caption (TURN LEFT, TURN RIGHT, STRAIGHTEN) go with it: SteeringCaption, a pill under the header at the left,
 * well clear of the slogan. Mounted inside .n2-hdr-wheelwrap; it reads park.ts a frame at a time.
 */
const LOCK_DEG = 450;
/**
 * The wheel moves ONLY from the moment the car is at the second white line of the back lot (the signal before the parallel park or the reverse into the bay) to the end of the
 * left turn out of the bay. Before that (the front lot, the drive round, leaving the stall or the box) and after it (the straight back, the way out) it stays dead still, and as
 * soon as EXIT is pressed it eases back to centre and takes no more part.
 */
const WHEEL_STATES = new Set<string>([
  'SIGNAL_RIGHT', 'SHIFT_TO_REVERSE', 'REVERSE_STRAIGHT_1', 'STOP_AT_BLACK_LINE', 'STEER_FULL_RIGHT', 'REVERSE_FULL_RIGHT', 'STRAIGHTEN_1', 'REVERSE_STRAIGHT_2', 'STEER_FULL_LEFT', 'REVERSE_FULL_LEFT', 'STRAIGHTEN_2', 'FINAL_ALIGNMENT', 'PARKED',   // the parallel park, from the line
  'BAY_SIGNAL_RIGHT', 'BAY_SHIFT_R', 'BAY_REVERSE', 'BAY_PARKED',                                                                                                                                                                        // the reverse into the bay, from the line
  'TURN_SIGNAL', 'TURN_SHIFT_D', 'TURN_DRIVE', 'TURN_STOP',                                                                                                                                                                              // the left turn out of the bay: the last of it
]);
/** The states in which the words are shown: the steering of the parallel park and of the reverse into the bay (from the second white line). */
const CAPTION_STATES = new Set<string>([
  'SIGNAL_RIGHT', 'SHIFT_TO_REVERSE', 'REVERSE_STRAIGHT_1', 'STOP_AT_BLACK_LINE', 'STEER_FULL_RIGHT', 'REVERSE_FULL_RIGHT', 'STRAIGHTEN_1', 'REVERSE_STRAIGHT_2', 'STEER_FULL_LEFT', 'REVERSE_FULL_LEFT', 'STRAIGHTEN_2', 'FINAL_ALIGNMENT', 'PARKED',
  'BAY_SIGNAL_RIGHT', 'BAY_SHIFT_R', 'BAY_REVERSE', 'BAY_PARKED',
]);
/** What the caption says now ('' for none); written by SteeringLive, read by SteeringCaption. */
const caption = { label: "" };
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
      const kindOk = run && !park.exitPending && (park.kind === "parallel" || park.kind === "bay" || park.kind === "turn");
      const c0 = kindOk ? parkCarAt(Math.min(park.t, T)) : null, live = !!c0 && WHEEL_STATES.has(c0.state);
      let words = false;
      if (live && c0) { steer = c0.steer; ahead = parkCarAt(Math.min(park.t + .3, T)).steer; words = (park.kind === "parallel" || park.kind === "bay") && CAPTION_STATES.has(c0.state); }
      const target = -steer / DMAX * LOCK_DEG;                            // left (positive steer) turns the wheel counter-clockwise
      if (!live && !park.exitPending) deg = 0;                           // outside the allowed window the wheel is simply still
      else { deg += (target - deg) * (1 - Math.exp(-16 * dt)); if (Math.abs(target - deg) < .05) deg = target; }   // (EXIT pressed: it eases back to centre)
      img.style.transform = Math.abs(deg) < .01 ? "" : `rotate(${deg.toFixed(2)}deg)`;
      const turning = Math.abs(deg) > 3;
      if (wrap.dataset.turn !== (turning ? "on" : "off")) wrap.dataset.turn = turning ? "on" : "off";
      // which way are the hands moving? (over the next 0.3 s; held on screen for a moment so a short turn is still read)
      const d = ahead - steer; let h = NONE;
      if (live && Math.abs(d) > .012) h = { dir: d > 0 ? 1 : -1, label: Math.abs(ahead) < Math.abs(steer) ? "STRAIGHTEN" : d > 0 ? "TURN LEFT" : "TURN RIGHT" };
      if (h.dir !== 0) { shown = h; hold = .45; } else if (hold > 0) { hold -= dt; } else shown = NONE;
      caption.label = words ? shown.label : "";
      const key = shown.dir + "|" + shown.label; if (key !== lastKey) { lastKey = key; setHint(shown); }
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
    </span>
  );
}

/** The words for the wheel: a glass pill just under the header at the left (the PARKING and EXIT signs are on the right), so it never sits on the slogan. */
export function SteeringCaption() {
  const [label, setLabel] = useState(""), [top, setTop] = useState(150);
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (now: number) => {
      if (now - last > 80) {
        last = now;
        setLabel(p => (p === caption.label ? p : caption.label));
        const h = document.querySelector(".n2-hdr");
        if (h) { const b = Math.round(h.getBoundingClientRect().bottom) + 10; setTop(p => (Math.abs(p - b) < 1 ? p : b)); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!label) return null;
  return <div className="n2-steer-cap" style={{ top }} role="status">{label}</div>;
}
