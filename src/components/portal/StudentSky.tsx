import { useEffect, useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { rng } from "@/components/nuhome2/world/theme";
import { StyleVanSun } from "@/components/nuhome2/StyleVanSun";

/*
 * The student portal's background: the same world as the home page, a soft sky with a sun or a moon, a skyline and slow
 * gold stars, painted behind every student page. Static and light: CSS only, nothing re-renders while you scroll.
 */
function skyline(seed: number, base: number, minH: number, maxH: number) {
  const r = rng(seed); let x = 0, d = `M0 ${base} `; const lit: { x: number; y: number }[] = [];
  while (x < 1600) { const w = 34 + r() * 66, h = minH + r() * (maxH - minH), top = base - h; d += `L${x} ${top} L${x + w} ${top} `; for (let k = 0; k < 6; k++) if (r() > .55) lit.push({ x: x + 6 + (k % 3) * (w / 3.4), y: top + 10 + Math.floor(k / 3) * 17 }); x += w + r() * 8; }
  return { d: d + `L1600 ${base} Z`, lit };
}
const star = "M0 -7 L2 -2.2 L7 -2.1 L3 1.2 L4.4 6.2 L0 3.3 L-4.4 6.2 L-3 1.2 L-7 -2.1 L-2 -2.2 Z";

export function StudentSky() {
  const { resolvedTheme } = useTheme();
  const night = resolvedTheme === "dark";
  const far = useMemo(() => skyline(3, 200, 40, 120), []), near = useMemo(() => skyline(7, 200, 30, 90), []);
  const twinkles = useMemo(() => { const r = rng(5); return Array.from({ length: 60 }).map(() => ({ l: r() * 100, t: r() * 70, s: 1.4 + r() * 2.6, d: -r() * 6 })); }, []);
  const floaters = useMemo(() => { const r = rng(21); return Array.from({ length: 14 }).map((_, i) => ({ l: (i / 14) * 100 + (r() - .5) * 5, s: 12 + r() * 20, d: -r() * 40, du: 30 + r() * 22 })); }, []);
  useEffect(() => {          // the portal's headings use the home page's serif; load it once
    if (document.getElementById("dk-portal-fonts")) return;
    const l = document.createElement("link"); l.id = "dk-portal-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap";
    document.head.appendChild(l);
  }, []);
  return (
    <div className="dk-sky" data-theme={night ? "night" : "day"} aria-hidden="true">
      <div className="dk-sky-base" />
      <div className="dk-sky-stars">{twinkles.map((t, i) => <span key={i} style={{ left: `${t.l}%`, top: `${t.t}%`, width: t.s, height: t.s, animationDelay: `${t.d}s` }} />)}</div>
      <div className="dk-sky-orb"><i className="dk-sun"><StyleVanSun /></i><i className="dk-moon" /></div>
      <svg className="dk-sky-city dk-sky-far" viewBox="0 0 1600 200" preserveAspectRatio="none"><path d={far.d} />{far.lit.map((w, i) => <rect key={i} x={w.x} y={w.y} width="8" height="11" />)}</svg>
      <svg className="dk-sky-city dk-sky-near" viewBox="0 0 1600 200" preserveAspectRatio="none"><path d={near.d} />{near.lit.map((w, i) => <rect key={i} x={w.x} y={w.y} width="8" height="11" />)}</svg>
      <div className="dk-sky-floaters">{floaters.map((f, i) => <span key={i} style={{ left: `${f.l}%`, animationDelay: `${f.d}s`, animationDuration: `${f.du}s` }}><svg width={f.s} height={f.s} viewBox="-8 -8 16 16"><path d={star} /></svg></span>)}</div>
      <div className="dk-sky-veil" />
    </div>
  );
}
