import { useEffect, useMemo, useRef } from "react";
import { rng } from "./world/theme";

/*
 * The scene behind the contact form: a quiet golden-hour road by day, a starlit road by night. It is a backdrop, never the show.
 *  - Nothing near the form moves fast. Clouds and stars drift very slowly, the lane dashes crawl.
 *  - It answers the visitor gently: layers lean a few pixels with the pointer or the scroll, and as the form fills in,
 *    a DrivingKlass car drives away down the road toward the horizon while five stars light up, one per fifth of the form.
 *  - Reduced-motion visitors get the still picture.
 */
const star = "M0 -7 L2 -2.2 L7 -2.1 L3 1.2 L4.4 6.2 L0 3.3 L-4.4 6.2 L-3 1.2 L-7 -2.1 L-2 -2.2 Z";

export function ContactBackdrop({ night }: { night: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const twinkles = useMemo(() => { const r = rng(44); return Array.from({ length: 46 }).map(() => ({ l: r() * 100, t: r() * 58, s: 1.4 + r() * 2.4, d: -r() * 7 })); }, []);
  const clouds = useMemo(() => [{ t: 9, s: 1, d: -20, dur: 150 }, { t: 22, s: .7, d: -90, dur: 190 }, { t: 36, s: .85, d: -50, dur: 170 }], []);

  useEffect(() => {
    const el = root.current; if (!el) return;
    const host = el.parentElement as HTMLElement; if (!host) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, px = 0, py = 0;
    const set = () => { raf = 0; el.style.setProperty("--px", px.toFixed(3)); el.style.setProperty("--py", py.toFixed(3)); };
    const queue = () => { if (!raf) raf = requestAnimationFrame(set); };
    const onMove = (e: PointerEvent) => { if (still) return; const r = host.getBoundingClientRect(); px = ((e.clientX - r.left) / r.width - .5) * 2; queue(); };
    const onScroll = () => { if (still) return; const r = host.getBoundingClientRect(); py = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (r.top + r.height / 2)) / (r.height / 2 + window.innerHeight / 2))); queue(); };
    // the form drives the car: count the filled controls
    const measure = () => {
      const form = host.querySelector("#contact form") as HTMLFormElement | null; if (!form) return;
      const ctl = Array.from(form.querySelectorAll("input, textarea, select")).filter(c => { const i = c as HTMLInputElement; return !["hidden", "submit", "button", "checkbox", "radio"].includes(i.type) && !i.disabled; }) as HTMLInputElement[];
      if (!ctl.length) return;
      const done = ctl.filter(c => (c.type === "file" ? (c.files?.length ?? 0) > 0 : c.value.trim().length > 0)).length;
      el.style.setProperty("--fill", (done / ctl.length).toFixed(3)); el.dataset.stars = String(Math.round((done / ctl.length) * 5));
    };
    host.addEventListener("pointermove", onMove, { passive: true }); window.addEventListener("scroll", onScroll, { passive: true });
    host.addEventListener("input", measure, true); host.addEventListener("change", measure, true);
    measure(); onScroll();
    return () => { host.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); host.removeEventListener("input", measure, true); host.removeEventListener("change", measure, true); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="n2-cbd" ref={root} data-theme={night ? "night" : "day"} data-stars="0" aria-hidden="true">
      <div className="n2-cbd-sky" />
      <div className="n2-cbd-glow" />
      <div className="n2-cbd-stars">{twinkles.map((t, i) => <span key={i} style={{ left: `${t.l}%`, top: `${t.t}%`, width: t.s, height: t.s, animationDelay: `${t.d}s` }} />)}</div>
      <div className="n2-cbd-clouds">{clouds.map((c, i) => <span key={i} style={{ top: `${c.t}%`, transform: `scale(${c.s})`, animationDelay: `${c.d}s`, animationDuration: `${c.dur}s` }} />)}</div>
      <div className="n2-cbd-orb" />
      <svg className="n2-cbd-land" viewBox="0 0 1600 560" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="cbd-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cbd-road-far)" /><stop offset="1" stopColor="var(--cbd-road-near)" /></linearGradient>
        </defs>
        <path className="n2-cbd-hill n2-cbd-hill-far" d="M0 300 C200 250 380 270 560 285 C760 300 900 240 1120 262 C1320 282 1460 250 1600 270 L1600 560 L0 560 Z" />
        <path className="n2-cbd-hill n2-cbd-hill-near" d="M0 330 C260 296 480 322 700 318 C930 314 1120 290 1340 312 C1460 322 1540 316 1600 310 L1600 560 L0 560 Z" />
        <g className="n2-cbd-city">{[[120, 54], [168, 80], [214, 46], [1180, 70], [1226, 100], [1280, 52], [1330, 76], [1390, 44]].map(([x, h], i) => <rect key={i} x={x} y={318 - h!} width={30} height={h} />)}</g>
        <path className="n2-cbd-road" d="M752 318 L848 318 L1280 560 L320 560 Z" fill="url(#cbd-road)" />
        <path className="n2-cbd-edge" d="M752 318 L320 560 M848 318 L1280 560" />
        <path className="n2-cbd-dash" d="M800 318 L800 560" />
        <g className="n2-cbd-car"><g transform="translate(800 546)">
          <ellipse cx="0" cy="6" rx="62" ry="9" fill="rgba(0,0,0,.28)" />
          <path d="M-58 0 C-58 -26 -44 -40 -26 -44 L26 -44 C44 -40 58 -26 58 0 Z" className="n2-cbd-body" />
          <path d="M-34 -42 L-28 -62 L28 -62 L34 -42 Z" className="n2-cbd-cabin" />
          <rect x="-24" y="-90" width="48" height="26" rx="7" fill="#fbf7ea" /><rect x="-20" y="-86" width="40" height="18" rx="4" fill="#f6e43a" />
          {[-14, -7, 0, 7, 14].map(x => <path key={x} transform={`translate(${x} -77) scale(.55)`} d={star} fill="#d9a21a" />)}
          <rect x="-50" y="-26" width="16" height="8" rx="3" className="n2-cbd-tail" /><rect x="34" y="-26" width="16" height="8" rx="3" className="n2-cbd-tail" />
        </g></g>
      </svg>
      <div className="n2-cbd-five">{[0, 1, 2, 3, 4].map(i => <svg key={i} viewBox="-8 -8 16 16" className="n2-cbd-s" data-i={i}><path d={star} /></svg>)}</div>
      <div className="n2-cbd-veil" />
    </div>
  );
}
