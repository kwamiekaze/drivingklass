import type { CSSProperties } from 'react';
import type { StopId } from './config';

/** A five point star path centred on 0,0. */
export function starPath(R: number, r = R * .45) {
  let d = '';
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r : R; d += `${k ? 'L' : 'M'}${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)} `; }
  return d + 'Z';
}
export const STAR_6 = starPath(6);

/** Small animated badge on each card. Plays while its stop is active. */
export function StopIcon({ id, active }: { id: StopId | 'home'; active: boolean }) {
  return <svg viewBox="0 0 120 120" className={`n2j-icon n2j-icon-${id}`} data-active={active} role="presentation">
    <defs><linearGradient id={`n2j-ring-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset=".5" stopColor="#f2c14e" /><stop offset="1" stopColor="#a87912" /></linearGradient></defs>
    <circle cx="60" cy="60" r="55" fill="var(--n2j-art)" stroke={`url(#n2j-ring-${id})`} strokeWidth="4" />
    {id === 'lot' && <g className="cone"><ellipse cx="60" cy="96" rx="30" ry="7" fill="rgba(0,0,0,.25)" /><rect x="32" y="88" width="56" height="10" rx="3" fill="#2a2a30" /><path d="M46 88 L56 24 L64 24 L74 88 Z" fill="#ff7a1a" /><path d="M50 66 L70 66 L72 76 L48 76 Z" fill="#fff" /><path d="M53 44 L67 44 L68.5 52 L51.5 52 Z" fill="#fff" /></g>}
    {id === 'subdivision' && <g className="sign"><rect x="56" y="70" width="8" height="38" rx="2" fill="#8a8f98" /><path d={`M${60 - 17} ${22} L${60 + 17} ${22} L${60 + 31} ${36} L${60 + 31} ${60} L${60 + 17} ${74} L${60 - 17} ${74} L${60 - 31} ${60} L${60 - 31} ${36} Z`} fill="#d62839" stroke="#fff" strokeWidth="3.5" /><text x="60" y="55" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontWeight="800" fontSize="19" fill="#fff">STOP</text></g>}
    {id === 'city' && <g><rect x="42" y="14" width="36" height="86" rx="10" fill="#1b1b22" stroke="#f2c14e" strokeWidth="2.5" /><circle className="tl tl-r" cx="60" cy="32" r="9.5" fill="#ff3b3b" /><circle className="tl tl-y" cx="60" cy="57" r="9.5" fill="#ffc23a" /><circle className="tl tl-g" cx="60" cy="82" r="9.5" fill="#3ddc84" /></g>}
    {id === 'interstate' && <g className="shield"><path d="M60 14 C74 22 88 22 98 20 C98 62 88 92 60 108 C32 92 22 62 22 20 C32 22 46 22 60 14 Z" fill="#1d4f9c" stroke="#fff" strokeWidth="3.5" /><path d="M60 22 C71 28 82 29 90 28 L90 40 L30 40 L30 28 C38 29 49 28 60 22 Z" fill="#d62839" /><text x="60" y="76" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontWeight="800" fontSize="34" fill="#fff">5</text><path transform="translate(60 92) scale(.9)" d={STAR_6} fill="#f2c14e" /></g>}
    {id === 'home' && <g className="trophy"><path transform="translate(60 56) scale(5.2)" d={starPath(6, 2.8)} fill="url(#n2j-ring-home)" stroke="#8b6508" strokeWidth=".3" /></g>}
    <g className="spark">{[[24, 28], [98, 26], [92, 94], [24, 92]].map(([x, y], i) => <path key={i} transform={`translate(${x} ${y})`} d={starPath(5, 2)} fill="#f2c14e" style={{ animationDelay: `${i * .35}s` }} />)}</g>
  </svg>;
}

const LABEL: Record<StopId | 'home', string> = { lot: 'Empty lot', subdivision: 'Quiet streets', city: 'Downtown', interstate: 'Highway', home: 'Road test day' };

/** Small top down places the car visits, drawn from the same point of view as the car. */
export function Place({ id, style, active }: { id: StopId | 'home'; style: CSSProperties; active: boolean }) {
  return <div className="n2j-place" style={style} data-active={active}>
    <svg viewBox="0 0 240 220" aria-hidden="true">
      <rect x="6" y="6" width="228" height="196" rx="34" fill={id === 'subdivision' || id === 'home' ? 'var(--n2j-lawn)' : 'var(--n2j-slab)'} />
      {id === 'lot' && <g>
        {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={30 + i * 32} y="34" width="3" height="46" fill="#fff" opacity=".85" />)}
        <rect x="42" y="42" width="24" height="38" rx="7" fill="#c9cdd6" /><rect x="138" y="42" width="24" height="38" rx="7" fill="#2f3340" /><rect x="170" y="42" width="24" height="38" rx="7" fill="#f2c14e" />
        {[[44, 128], [84, 146], [124, 128], [164, 146], [204, 128]].map(([x, y], i) => <g key={i}><rect x={x! - 9} y={y! - 9} width="18" height="18" rx="3" fill="#ff7a1a" /><circle cx={x} cy={y} r="5" fill="#fff" /></g>)}
        <rect x="30" y="170" width="180" height="3" fill="#fff" opacity=".6" />
      </g>}
      {id === 'subdivision' && <g>
        {[[40, 34], [138, 34], [40, 128]].map(([x, y], i) => <g key={i}><rect x={x} y={y} width="62" height="48" rx="5" fill="#f4ecdd" stroke="#cfc3ad" strokeWidth="2" /><path d={`M${x! - 4} ${y! + 24} L${x! + 31} ${y! - 6} L${x! + 66} ${y! + 24}`} fill="none" /><path d={`M${x} ${y! + 24} L${x! + 31} ${y} L${x! + 31} ${y! + 48} L${x} ${y! + 48} Z`} fill="#b86a4b" /><path d={`M${x! + 62} ${y! + 24} L${x! + 31} ${y} L${x! + 31} ${y! + 48} L${x! + 62} ${y! + 48} Z`} fill="#d58863" /><rect x={x! + 22} y={y! + 54} width="18" height="26" fill="#d9d4c8" /></g>)}
        {[[24, 170], [214, 120], [200, 188], [112, 108], [20, 100]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="14" fill="#5f9a5a" />)}
        <circle cx="180" cy="150" r="13" fill="#d62839" stroke="#fff" strokeWidth="2.5" /><rect x="173" y="148" width="14" height="4" fill="#fff" />
      </g>}
      {id === 'city' && <g>
        {[[22, 22, 70, 62], [104, 22, 52, 62], [168, 22, 52, 62], [22, 128, 52, 60], [86, 140, 70, 48], [168, 128, 52, 60]].map(([x, y, w, h], i) => <g key={i}><rect x={x} y={y} width={w} height={h} rx="5" fill="#9aa3b5" stroke="#6d768a" strokeWidth="2" />{Array.from({ length: Math.floor(w! / 18) }).flatMap((_, c) => [0, 1].map(r => <rect key={`${c}${r}`} x={x! + 8 + c * 16} y={y! + 10 + r * 22} width="9" height="12" rx="2" fill="#dfe7f5" opacity=".85" />))}</g>)}
        {Array.from({ length: 7 }).map((_, i) => <rect key={i} x="100" y={96 + i * 4.2} width="42" height="2.4" fill="#fff" opacity=".9" />)}
        <circle cx="156" cy="108" r="9" fill="#1b1b22" /><circle cx="156" cy="108" r="4.5" fill="#3ddc84" />
      </g>}
      {id === 'interstate' && <g>
        <rect x="6" y="6" width="228" height="196" rx="34" fill="#3b3d46" />
        {[70, 120, 170].map(x => <path key={x} d={`M${x} 14 L${x} 196`} stroke="#fff" strokeWidth="3" strokeDasharray="14 12" opacity=".85" />)}
        <path d="M30 14 L30 196 M210 14 L210 196" stroke="#f2c14e" strokeWidth="4" />
        {[[50, 40, '#d62839'], [95, 110, '#c9cdd6'], [145, 56, '#2f6fd6'], [190, 140, '#f2c14e']].map(([x, y, c], i) => <rect key={i} x={(x as number) - 11} y={y as number} width="22" height="38" rx="7" fill={c as string} />)}
        <rect x="150" y="14" width="70" height="26" rx="4" fill="#1f7a45" stroke="#fff" strokeWidth="2.5" /><text x="185" y="32" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontWeight="800" fontSize="13" fill="#fff">EXIT 5</text>
      </g>}
      {id === 'home' && <g>
        <rect x="46" y="48" width="148" height="92" rx="8" fill="#f4ecdd" stroke="#cfc3ad" strokeWidth="2" />
        <path d="M40 94 L120 40 L200 94 Z" fill="#c9971f" /><path d="M40 94 L120 40 L120 148 L40 148 Z" fill="#d9a93a" /><path d="M200 94 L120 40 L120 148 L200 148 Z" fill="#f2c14e" />
        <rect x="104" y="152" width="32" height="44" rx="4" fill="#2a2a30" />
        <path className="n2j-dest-star" d={starPath(26, 11)} fill="#fff3c4" stroke="#c9971f" strokeWidth="3" transform="translate(120 40)" />
        {[[28, 176], [214, 170], [210, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="14" fill="#5f9a5a" />)}
      </g>}
    </svg>
    <span className="n2j-place-label">{LABEL[id]}</span>
  </div>;
}
