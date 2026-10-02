import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Moon, Phone, Sun } from 'lucide-react';
import { STOPS, STEPS, PLACES, type StopId } from './config';
import { Place, StopIcon, starPath, STAR_6 } from './art';
import { Backdrop } from './Backdrop';
import { BRAND } from '../content';
import './journey.css';

type Theme = 'day' | 'night';
type Side = 'left' | 'right';
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const N = STOPS.length;

type Layout = { W: number; H: number; mobile: boolean; scale: number; roadW: number; ys: number[]; xs: number[]; endX: number; endY: number; cardSide: Side[]; d: string };

/** Everything is in pixels. The road runs straight beside each card, then sweeps across the gap to the next stop. */
function computeLayout(W: number): Layout {
  const mobile = W < 820, scale = clamp(W / 900, .6, 1.15), roadW = Math.round(108 * scale);
  const gap = mobile ? 700 : 660, y0 = mobile ? 300 : 340, run = mobile ? 240 : 160;
  const ys = STOPS.map((_, i) => y0 + i * gap);
  const endY = ys[N - 1]! + gap * .92, H = endY + (mobile ? 150 : 210);
  const edge = roadW / 2 + 12;
  const xs = STOPS.map((_, i) => (mobile ? (i % 2 === 0 ? edge : W - edge) : W / 2 + (i % 2 === 0 ? 1 : -1) * W * .085));
  const endX = W / 2;
  let d = `M ${xs[0]} 0 L ${xs[0]} ${ys[0]! + run}`;
  for (let i = 0; i < N - 1; i++) { const a = ys[i]! + run, b = ys[i + 1]! - run, m = (a + b) / 2; d += ` C ${xs[i]} ${m}, ${xs[i + 1]} ${m}, ${xs[i + 1]} ${b} L ${xs[i + 1]} ${ys[i + 1]! + run}`; }
  const a = ys[N - 1]! + run, m = (a + endY) / 2; d += ` C ${xs[N - 1]} ${m}, ${endX} ${m}, ${endX} ${endY}`;
  const cardSide = STOPS.map((_, i): Side => (mobile ? (i % 2 === 0 ? 'right' : 'left') : (i % 2 === 0 ? 'left' : 'right')));
  return { W, H, mobile, scale, roadW, ys, xs, endX, endY, cardSide, d };
}

/**
 * The DrivingKlass car from above, front toward +x: gold sedan with a black roof magnet carrying five gold stars.
 * The magnet is a box across the roof, so its top face shows the five stars in a row across the car.
 */
function CarSprite({ carRef, near }: { carRef: React.RefObject<SVGGElement | null>; near: boolean }) {
  return <g className="n2j-car" data-near={near}>
    <defs>
      <linearGradient id="n2j-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".45" stopColor="#f2c14e" /><stop offset="1" stopColor="#b98714" /></linearGradient>
      <linearGradient id="n2j-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a5568" /><stop offset="1" stopColor="#12151c" /></linearGradient>
      <linearGradient id="n2j-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff3c8" stopOpacity=".8" /><stop offset="1" stopColor="#fff3c8" stopOpacity="0" /></linearGradient>
      <radialGradient id="n2j-shadow"><stop offset="0" stopColor="#000" stopOpacity=".42" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
    </defs>
    <g ref={carRef}>
      <ellipse cx="0" cy="5" rx="82" ry="40" fill="url(#n2j-shadow)" />
      <path className="beam" d="M60 -15 L168 -46 L168 -5 L60 -5 Z M60 15 L168 46 L168 5 L60 5 Z" fill="url(#n2j-beam)" />
      {[-1, 1].map(s => <g key={s}>{[-38, 30].map(x => <rect key={x} x={x} y={s > 0 ? 24 : -33} width="21" height="9" rx="3.5" fill="#15151a" />)}<rect x="31" y={s > 0 ? 27 : -34} width="9" height="6" rx="3" fill="#0d0d11" /></g>)}
      <rect x="-63" y="-27" width="126" height="54" rx="17" fill="url(#n2j-body)" stroke="#7a5606" strokeWidth="1.6" />
      <path d="M-50 -22 C-10 -26 24 -26 52 -20" fill="none" stroke="#fff6c9" strokeWidth="2.6" strokeLinecap="round" opacity=".7" />
      <path d="M26 -21 L50 -18 L54 -16 L54 16 L50 18 L26 21 Z" fill="url(#n2j-glass)" />
      <path d="M-52 -17 L-40 -19 L-40 19 L-52 17 Z" fill="url(#n2j-glass)" />
      <rect x="-37" y="-20" width="60" height="40" rx="11" fill="#e6b03a" stroke="#9a6f0c" strokeWidth="1.2" />
      <rect x="-31" y="-15" width="48" height="30" rx="8" fill="none" stroke="#fff3c4" strokeWidth="1" opacity=".5" />
      {/* the roof magnet: a black box across the roof with five gold stars on its top */}
      <g className="n2j-magnet" transform="translate(-6 0)">
        <rect x="-10" y="-24" width="20" height="48" rx="5" fill="#0c0c10" stroke="#f2c14e" strokeWidth="1.5" />
        {[-18, -9, 0, 9, 18].map((y, i) => <path key={i} className="n2j-mstar" transform={`translate(0 ${y})`} d={starPath(4.2, 1.8)} fill="#ffd86a" style={{ animationDelay: `${i * .18}s` }} />)}
      </g>
      {[-1, 1].map(s => <g key={s}><rect x="22" y={s > 0 ? 25 : -31} width="9" height="6" rx="3" fill="#d8a52c" /><circle cx="60" cy={s * 17} r="3.8" fill="#fff6d6" /><circle className="lamp" cx="60" cy={s * 17} r="8" fill="#fff6d6" opacity=".4" /><rect x="-66" y={s > 0 ? 13 : -21} width="4" height="8" rx="1.5" fill="#e0243a" /></g>)}
    </g>
  </g>;
}

function Stop({ i, side, top, style, active, onBook }: { i: number; side: Side; top: number; style: React.CSSProperties; active: boolean; onBook: () => void }) {
  const s = STOPS[i]!;
  return <article className="n2j-stop" data-active={active} data-side={side} style={{ ...style, top }} aria-labelledby={`n2j-stop-${s.id}`}>
    <div className="n2j-stop-art" aria-hidden="true"><StopIcon id={s.id} active={active} /></div>
    <div className="n2j-stop-copy">
      <p className="n2j-stop-num">Stop {s.number}</p>
      <h3 id={`n2j-stop-${s.id}`}>{s.name}</h3>
      <p className="n2j-stop-promise">{s.promise}</p>
      <p className="n2j-stop-blurb">{s.blurb}</p>
      <ul>{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>
      <p className="n2j-stop-comes"><span>Right to your door</span>{s.comesTo}</p>
      <button type="button" className="n2j-btn" onClick={onBook}>Book your Klass <ArrowUpRight size={17} aria-hidden="true" /></button>
    </div>
  </article>;
}

export function Journey({ theme, onBook, onTheme }: { theme: Theme; onBook: () => void; onTheme: () => void }) {
  const wrap = useRef<HTMLDivElement>(null), road = useRef<SVGPathElement>(null), trailRef = useRef<SVGGElement>(null), carRef = useRef<SVGGElement>(null), glow = useRef<SVGPathElement>(null);
  const [W, setW] = useState(() => (typeof window === 'undefined' ? 390 : window.innerWidth));
  const [active, setActive] = useState(-1);                       // -1 none, 0..N-1 a stop, N the arrival
  const [burst, setBurst] = useState<{ k: number; x: number; y: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const L = useMemo(() => computeLayout(W), [W]);
  const samples = useRef<{ x: Float32Array; y: Float32Array; n: number; len: number } | null>(null);
  const st = useRef({ s: 0, t: 0, lastTrail: 0, running: false, active: -1 });

  useEffect(() => { const ro = new ResizeObserver(() => setW(Math.round(wrap.current?.clientWidth ?? window.innerWidth))); if (wrap.current) ro.observe(wrap.current); return () => ro.disconnect(); }, []);

  useEffect(() => {                                                // sample the path once per layout so the frame loop is only lookups
    const p = road.current; if (!p) return; const len = p.getTotalLength(), n = Math.ceil(len / 3) + 1, x = new Float32Array(n), y = new Float32Array(n);
    for (let i = 0; i < n; i++) { const pt = p.getPointAtLength(Math.min(len, i * 3)); x[i] = pt.x; y[i] = pt.y; }
    samples.current = { x, y, n, len };
    if (glow.current) { glow.current.style.strokeDasharray = `${len}`; glow.current.style.strokeDashoffset = `${len}`; }
  }, [L]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0; const trail = Array.from({ length: 14 }, () => ({ x: 0, y: 0, t: -99 })); let ti = 0;
    const io = new IntersectionObserver(([e]) => { st.current.running = !!e?.isIntersecting; if (e?.isIntersecting && !raf) raf = requestAnimationFrame(tick); }, { rootMargin: '400px 0px 400px 0px' });
    if (wrap.current) io.observe(wrap.current);
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * .6);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    function at(i: number) { const S = samples.current!; const k = clamp(Math.round(i / 3), 0, S.n - 1); return [S.x[k]!, S.y[k]!] as const; }
    function tick() {
      raf = 0; const S = samples.current, w = wrap.current; if (!S || !w) { raf = requestAnimationFrame(tick); return; }
      const top = w.getBoundingClientRect().top, vy = window.innerHeight * .56 - top;
      let lo = 0, hi = S.n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (S.y[m]! < vy) lo = m + 1; else hi = m; }
      const target = vy <= 0 ? 0 : Math.min(S.len, lo * 3);
      const now = performance.now(), dt = Math.min(.25, (now - (st.current.t || now)) / 1000); st.current.t = now;
      st.current.s += (target - st.current.s) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
      const s = st.current.s, sc = L.scale;
      const [x, y] = at(s), [ax, ay] = at(s - 9), [bx, by] = at(s + 9), ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
      carRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${sc})`);
      if (glow.current) glow.current.style.strokeDashoffset = String(S.len - s);
      if (!reduce && Math.abs(s - st.current.lastTrail) > 24) { st.current.lastTrail = s; const p = at(Math.max(0, s - 74 * sc)); trail[ti = (ti + 1) % trail.length] = { x: p[0], y: p[1], t: performance.now() }; }
      if (trailRef.current) Array.from(trailRef.current.children).forEach((c, i) => { const p = trail[i]!, age = (performance.now() - p.t) / 1600, o = Math.max(0, .95 - age); c.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - age * 20).toFixed(1)}) rotate(${(age * 160).toFixed(0)}) scale(${(Math.max(.01, (1.05 - age * .5)) * sc * 1.3).toFixed(2)})`); c.setAttribute('opacity', String(o)); });
      let a = -1; L.ys.forEach((yy, i) => { if (Math.abs(y - yy) < (L.mobile ? 210 : 190)) a = i; }); if (s > S.len - 6) a = N;
      if (a !== st.current.active) { st.current.active = a; setActive(a); if (a >= 0) setBurst({ k: performance.now(), x, y }); }
      if (st.current.running) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [L]);

  const goTo = useCallback((i: number) => { const w = wrap.current; if (!w) return; const y = i === N ? L.endY : L.ys[i]!; window.scrollTo({ top: w.getBoundingClientRect().top + window.scrollY + y - window.innerHeight * .5, behavior: 'smooth' }); }, [L]);
  const cardStyle = (side: Side): React.CSSProperties => L.mobile ? (side === 'right' ? { left: L.roadW + 26, right: 14 } : { left: 14, right: L.roadW + 26 }) : (side === 'left' ? { left: '5%', width: 'min(470px, 40%)' } : { right: '5%', width: 'min(470px, 40%)' });
  const tel = `tel:+1${BRAND.phone.replace(/\D/g, '')}`;

  return <section className="n2j" id="journey" data-theme={theme} aria-label="The road to five stars">
    <Backdrop theme={theme} active={active} />
    <header className="n2j-intro">
      <p className="n2j-kicker">THE ROAD TO FIVE STARS</p>
      <h2>Every great driver<br /><em>starts somewhere.</em></h2>
      <p className="n2j-lead">From an empty parking lot to the open interstate, we coach you one step at a time, in a spotless ride that picks you up at your door. Follow the road and watch the stars light up.</p>
      <ul className="n2j-pills" aria-label="Jump to a stop">{STOPS.map((s, i) => <li key={s.id}><button type="button" onClick={() => goTo(i)}><span>{s.number}</span>{s.name}</button></li>)}</ul>
      <p className="n2j-cue"><ArrowDown size={16} aria-hidden="true" /> Follow the road</p>
    </header>

    <div className="n2j-road" ref={wrap} style={{ height: L.H }}>
      <svg className="n2j-road-svg" width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} aria-hidden="true">
        <path d={L.d} fill="none" stroke="var(--n2j-road-edge)" strokeWidth={L.roadW + 10} strokeLinecap="round" strokeLinejoin="round" />
        <path ref={road} d={L.d} fill="none" stroke="var(--n2j-road)" strokeWidth={L.roadW} strokeLinecap="round" strokeLinejoin="round" />
        <path d={L.d} fill="none" stroke="var(--n2j-road-dash)" strokeWidth={Math.max(2, 3 * L.scale)} strokeDasharray={`${16 * L.scale} ${18 * L.scale}`} strokeLinecap="round" />
        <path ref={glow} d={L.d} fill="none" stroke="#f2c14e" strokeWidth={Math.max(3, 5 * L.scale)} strokeLinecap="round" opacity=".9" className="n2j-road-glow" />
      </svg>
      {!L.mobile && STOPS.map((s, i) => <Place key={s.id} id={s.id as StopId} style={{ top: L.ys[i], [L.cardSide[i] === 'left' ? 'right' : 'left']: '6%' } as React.CSSProperties} active={active === i} />)}
      {!L.mobile && <Place id="home" style={{ top: L.endY - 40, right: '14%' }} active={active === N} />}
      {STOPS.map((s, i) => <Stop key={s.id} i={i} side={L.cardSide[i]!} top={L.ys[i]!} style={cardStyle(L.cardSide[i]!)} active={active === i} onBook={onBook} />)}
      <svg className="n2j-car-svg" width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} aria-hidden="true">
        <g ref={trailRef}>{Array.from({ length: 14 }).map((_, i) => <path key={i} d={STAR_6} fill="#f2c14e" opacity="0" />)}</g>
        <CarSprite carRef={carRef} near={active >= 0} />
      </svg>
      {burst && <div className="n2j-burst" key={burst.k} style={{ left: burst.x, top: burst.y }} aria-hidden="true">{Array.from({ length: 16 }).map((_, i) => <span key={i} style={{ ['--a' as string]: `${(i / 16) * 360}deg`, ['--d' as string]: `${50 + (i % 4) * 18}px`, animationDelay: `${(i % 5) * 30}ms` }}>{i % 3 === 0 ? '✦' : '★'}</span>)}</div>}
      <div className="n2j-you" style={{ top: L.endY + (L.mobile ? 34 : 118), left: L.mobile ? 0 : undefined, right: L.mobile ? 0 : '14%' }} data-active={active === N}><span>★</span> Five stars earned</div>
    </div>

    <section className="n2j-steps" aria-labelledby="n2j-steps-h">
      <p className="n2j-kicker">SO EASY</p>
      <h2 id="n2j-steps-h">Three steps. That is it.</h2>
      <ol>{STEPS.map(s => <li key={s.n}><span className="n2j-step-n">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    </section>

    <section className="n2j-places" aria-label="What we cover">
      <p className="n2j-kicker">RIGHT TO YOUR DOOR</p>
      <div className="n2j-marquee" aria-hidden="true"><div className="n2j-marquee-track">{[0, 1].map(k => <span key={k}>{PLACES.map(p => <b key={p}>{p}<i>★</i></b>)}</span>)}</div></div>
    </section>

    <section className="n2j-cta" aria-label="Book your klass">
      <p className="n2j-script">{BRAND.slogan}</p>
      <p>Pick your package, pick your time, and we will take it from there.</p>
      <div className="n2j-cta-row">
        <button type="button" className="n2j-btn n2j-btn-big" onClick={onBook}>Book your Klass <ArrowUpRight size={20} aria-hidden="true" /></button>
        <a className="n2j-btn n2j-btn-ghost" href={tel}><Phone size={18} aria-hidden="true" /> {BRAND.phone}</a>
      </div>
    </section>
    <footer className="n2j-footer"><span>DRIVINGKLASS</span><span>★ ★ ★ ★ ★</span></footer>

    <nav className={`n2j-chapters ${scrolled ? 'show' : ''}`} aria-label="Stops">
      {STOPS.map((s, i) => <button key={s.id} type="button" aria-current={active === i} onClick={() => goTo(i)}><b>{s.number}</b><span>{s.name}</span></button>)}
    </nav>
    <div className={`n2j-dock ${scrolled ? 'show' : ''}`}>
      <button type="button" onClick={onTheme} aria-label={theme === 'day' ? 'Switch to night' : 'Switch to day'}>{theme === 'day' ? <Moon size={19} /> : <Sun size={19} />}</button>
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to the top"><ArrowUp size={19} /></button>
    </div>
  </section>;
}
