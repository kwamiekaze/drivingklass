import { useId } from "react";

/** The Style Van sun, drawn to the same numbers as the 3D one: gradient disc, sixteen triangle rays, sunglasses, a smile and blush. */
export function StyleVanSun() {
  const uid = useId().replace(/:/g, "");
  const lens = (s: number) => { const w = 3.1, h = 2.1, r = .55, x = s * 1.95 - w / 2, y = .7 - h / 2; return `M${x + r},${y} H${x + w - r * 2.2} Q${x + w},${y} ${x + w},${y + r} V${y + h - r * 2.2} Q${x + w},${y + h} ${x + w - r * 2.2},${y + h} H${x + r * 2.2} Q${x},${y + h} ${x},${y + h - r * 2.2} V${y + r} Q${x},${y} ${x + r},${y} Z`; };
  const smile = Array.from({ length: 25 }, (_, k) => { const a = Math.PI + (k / 24) * Math.PI * .8; return `${(1.85 * Math.cos(a)).toFixed(3)},${(-.9 + 1.85 * Math.sin(a)).toFixed(3)}`; }).join(' ');
  return <svg viewBox="-12 -12 24 24" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }} aria-hidden="true">
    <defs>
      <radialGradient id={`svg-glow${uid}`}><stop offset="0" stopColor="#fff4be" stopOpacity=".95" /><stop offset=".3" stopColor="#ffe082" stopOpacity=".4" /><stop offset="1" stopColor="#ffc85a" stopOpacity="0" /></radialGradient>
      <radialGradient id={`svg-disc${uid}`}><stop offset="0" stopColor="#fff7c2" /><stop offset=".7" stopColor="#ffd84f" /><stop offset="1" stopColor="#ffb62e" /></radialGradient>
    </defs>
    <g transform="scale(1,-1)">
      <circle r="31" fill={`url(#svg-glow${uid})`} />
      <g className="n2j-sun-rays">{Array.from({ length: 16 }, (_, i) => <path key={i} transform={`rotate(${(i / 16) * 360})`} d="M-.74,7.7 L.74,7.7 L0,11.1 Z" fill="#ffd23f" />)}</g>
      <circle r="6.6" fill={`url(#svg-disc${uid})`} />
      {[-1, 1].map(s => <g key={s}><path d={lens(s)} fill="#14101c" /><rect x={-.45} y={-.08} width=".9" height=".16" fill="#8f86b8" opacity=".75" transform={`translate(${s * 1.95 - s * .55},${1.15}) rotate(${s * 28.6})`} /><rect x={s * 3.67 - 1.3} y=".74" width="2.6" height=".22" fill="#14101c" /></g>)}
      <rect x="-.45" y=".83" width=".9" height=".24" fill="#14101c" />
      <polyline points={smile} fill="none" stroke="#b5541f" strokeWidth=".34" strokeLinecap="round" strokeLinejoin="round" />
      {[-1, 1].map(s => <circle key={s} cx={s * 3.5} cy="-.6" r=".62" fill="#ff9c8a" opacity=".55" />)}
    </g>
  </svg>;
}

