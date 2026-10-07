import { useEffect, useState } from "react";
import { canStartPark, startPark } from "./world/park";

/**
 * The exit sign of the back lot: a small, see-through, blinking sign at the top right of the screen, just under the header, in the page's navy and gold.
 * It appears when the car has backed to the west white line and nothing else is running; pressing it starts the way out (park.ts, kind "exit").
 * The state lives in park.ts (not React), so it is read a few times a second.
 */
export function ExitSign() {
  const [show, setShow] = useState(false), [top, setTop] = useState(150);
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (now: number) => {
      if (now - last > 120) {
        last = now;
        const s = canStartPark("exit");
        setShow(p => (p === s ? p : s));
        const h = document.querySelector(".n2-hdr");
        if (h) { const b = Math.round(h.getBoundingClientRect().bottom) + 10; setTop(p => (Math.abs(p - b) < 1 ? p : b)); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!show) return null;
  return (
    <button type="button" className="n2-exit" style={{ top }} aria-label="Exit the parking lot" onClick={() => startPark("exit")}>
      <svg viewBox="0 0 512 512" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round">
        <path d="M332 195V63a18 18 0 0 0-18-18H96a18 18 0 0 0-18 18v389a18 18 0 0 0 18 18h218a18 18 0 0 0 18-18V315" />
        <path d="M185 255h265M392 175l60 80-60 80" />
      </svg>
      <span>EXIT</span>
    </button>
  );
}
