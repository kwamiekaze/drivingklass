import { useEffect, useMemo, useRef } from 'react';
import { rng } from '../world/theme';
import { starPath } from './art';

/*
 * The living sky behind the whole road. One sticky, viewport sized stage: as you scroll, the day sky slides from sunrise
 * to blue to sunset and the night sky deepens, a sun or moon crosses, two skylines slide at different speeds and gold stars
 * drift upward. Everything animates with CSS transforms, nothing re-renders while scrolling.
 */
type Theme = 'day' | 'night';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function skyline(seed: number, base: number, minH: number, maxH: number) {
  const r = rng(seed); let x = 0, d = `M0 ${base} `; const lit: { x: number; y: number }[] = [];
  while (x < 1600) { const w = 34 + r() * 66, h = minH + r() * (maxH - minH), top = base - h; d += `L${x} ${top} L${x + w} ${top} `; for (let k = 0; k < 6; k++) if (r() > .5) lit.push({ x: x + 6 + (k % 3) * (w / 3.4), y: top + 10 + Math.floor(k / 3) * 17 }); x += w + r() * 8; }
  return { d: d + `L1600 ${base} Z`, lit };
}

/** The Style Van sun, drawn to the same numbers as the 3D one: gradient disc, sixteen triangle rays, sunglasses, a smile and blush. */
function StyleVanSun() {
  const lens = (s: number) => { const w = 3.1, h = 2.1, r = .55, x = s * 1.95 - w / 2, y = .7 - h / 2; return `M${x + r},${y} H${x + w - r * 2.2} Q${x + w},${y} ${x + w},${y + r} V${y + h - r * 2.2} Q${x + w},${y + h} ${x + w - r * 2.2},${y + h} H${x + r * 2.2} Q${x},${y + h} ${x},${y + h - r * 2.2} V${y + r} Q${x},${y} ${x + r},${y} Z`; };
  const smile = Array.from({ length: 25 }, (_, k) => { const a = Math.PI + (k / 24) * Math.PI * .8; return `${(1.85 * Math.cos(a)).toFixed(3)},${(-.9 + 1.85 * Math.sin(a)).toFixed(3)}`; }).join(' ');
  return <svg viewBox="-12 -12 24 24" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }} aria-hidden="true">
    <defs>
      <radialGradient id="svg-glow"><stop offset="0" stopColor="#fff4be" stopOpacity=".95" /><stop offset=".3" stopColor="#ffe082" stopOpacity=".4" /><stop offset="1" stopColor="#ffc85a" stopOpacity="0" /></radialGradient>
      <radialGradient id="svg-disc"><stop offset="0" stopColor="#fff7c2" /><stop offset=".7" stopColor="#ffd84f" /><stop offset="1" stopColor="#ffb62e" /></radialGradient>
    </defs>
    <g transform="scale(1,-1)">
      <circle r="31" fill="url(#svg-glow)" />
      <g className="n2j-sun-rays">{Array.from({ length: 16 }, (_, i) => <path key={i} transform={`rotate(${(i / 16) * 360})`} d="M-.74,7.7 L.74,7.7 L0,11.1 Z" fill="#ffd23f" />)}</g>
      <circle r="6.6" fill="url(#svg-disc)" />
      {[-1, 1].map(s => <g key={s}><path d={lens(s)} fill="#14101c" /><rect x={-.45} y={-.08} width=".9" height=".16" fill="#8f86b8" opacity=".75" transform={`translate(${s * 1.95 - s * .55},${1.15}) rotate(${s * 28.6})`} /><rect x={s * 3.67 - 1.3} y=".74" width="2.6" height=".22" fill="#14101c" /></g>)}
      <rect x="-.45" y=".83" width=".9" height=".24" fill="#14101c" />
      <polyline points={smile} fill="none" stroke="#b5541f" strokeWidth=".34" strokeLinecap="round" strokeLinejoin="round" />
      {[-1, 1].map(s => <circle key={s} cx={s * 3.5} cy="-.6" r=".62" fill="#ff9c8a" opacity=".55" />)}
    </g>
  </svg>;
}

export function Backdrop({ theme, active }: { theme: Theme; active: number }) {
  const root = useRef<HTMLDivElement>(null);
  const layers = useRef<{ dawn?: HTMLElement | null; noon?: HTMLElement | null; dusk?: HTMLElement | null; orb?: HTMLElement | null; far?: SVGElement | null; near?: SVGElement | null }>({});
  const far = useMemo(() => skyline(3, 200, 40, 120), []), near = useMemo(() => skyline(7, 200, 30, 90), []);
  const floaters = useMemo(() => { const r = rng(21); return Array.from({ length: 16 }).map((_, i) => ({ left: `${(i / 16) * 100 + (r() - .5) * 5}%`, size: 14 + r() * 22, delay: -r() * 40, dur: 28 + r() * 22 })); }, []);
  const twinkles = useMemo(() => { const r = rng(5); return Array.from({ length: 56 }).map(() => ({ left: `${r() * 100}%`, top: `${r() * 100}%`, size: 1.5 + r() * 2.6, delay: -r() * 6 })); }, []);

  useEffect(() => {
    const el = root.current; if (!el) return; const host = el.parentElement as HTMLElement;
    let raf = 0;
    const apply = () => {
      raf = 0; const r = host.getBoundingClientRect(), p = clamp((-r.top) / Math.max(1, r.height - window.innerHeight), 0, 1);
      const L = layers.current;
      if (L.dawn) L.dawn.style.opacity = String(clamp(1 - p * 3, 0, 1));
      if (L.noon) L.noon.style.opacity = String(clamp(1 - Math.abs(p - .45) * 2.6, 0, 1));
      if (L.dusk) L.dusk.style.opacity = String(clamp((p - .55) * 2.4, 0, 1));
      if (L.orb) // it first appears in the open sky above the heading, top left, then drifts across and down as you scroll, so it never starts behind the words
      L.orb.style.transform = `translate3d(${(5 + p * 77).toFixed(1)}vw, ${(1 + Math.sin(p * Math.PI) * 13 + p * 18).toFixed(1)}svh, 0)`;
      if (L.far) L.far.style.transform = `translate3d(${(-p * 90).toFixed(1)}px, 0, 0)`;
      if (L.near) L.near.style.transform = `translate3d(${(-p * 220).toFixed(1)}px, 0, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); apply();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return <div className="n2j-bd" ref={root} data-theme={theme} data-active={active} aria-hidden="true">
    <div className="n2j-sky n2j-sky-dawn" ref={e => { layers.current.dawn = e; }} />
    <div className="n2j-sky n2j-sky-noon" ref={e => { layers.current.noon = e; }} />
    <div className="n2j-sky n2j-sky-dusk" ref={e => { layers.current.dusk = e; }} />
    <div className="n2j-sky n2j-sky-night" />
    <div className="n2j-twinkles">{twinkles.map((t, i) => <span key={i} style={{ left: t.left, top: t.top, width: t.size, height: t.size, animationDelay: `${t.delay}s` }} />)}</div>
    <div className="n2j-orb" ref={e => { layers.current.orb = e; }}><div className="n2j-sun"><StyleVanSun /></div><div className="n2j-moon" /></div>
    <svg className="n2j-city n2j-city-far" viewBox="0 0 1600 200" preserveAspectRatio="none" ref={e => { layers.current.far = e; }}><path d={far.d} />{far.lit.map((w, i) => <rect key={i} className="win" x={w.x} y={w.y} width="8" height="11" />)}</svg>
    <svg className="n2j-city n2j-city-near" viewBox="0 0 1600 200" preserveAspectRatio="none" ref={e => { layers.current.near = e; }}><path d={near.d} />{near.lit.map((w, i) => <rect key={i} className="win" x={w.x} y={w.y} width="8" height="11" />)}</svg>
    <div className="n2j-floaters">{floaters.map((f, i) => <span key={i} style={{ left: f.left, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }}><svg width={f.size} height={f.size} viewBox="-7 -7 14 14"><path d={starPath(6.4, 2.9)} /></svg></span>)}</div>
  </div>;
}
