import { useMemo } from "react";
import { rng } from "./world/theme";

/** A few slow gold glints, like light catching a luxury finish. Pure CSS animation, no scripts, still for reduced motion. */
export function Sparkles() {
  const spots = useMemo(() => { const r = rng(2026); return Array.from({ length: 26 }).map(() => ({ l: 3 + r() * 94, t: 14 + r() * 66, s: 8 + r() * 16, d: -r() * 7, du: 3.2 + r() * 3.6 })); }, []);
  return (
    <div className="n2-sparkles" aria-hidden="true">
      {spots.map((p, i) => (
        <svg key={i} viewBox="-10 -10 20 20" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, animationDuration: `${p.du}s` }}>
          <path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10 Z" />
        </svg>
      ))}
    </div>
  );
}
