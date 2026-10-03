import { useContext, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, rng } from './theme';
import { SIGN_FONT, goldGradient, makeCanvasTexture, starShape } from './parts';

/*
 * The DrivingKlass building: cream stone, black slate roofs, warm LED cove lighting, tall glazed bays with lit offices,
 * an arched pediment with five gold stars and big gold lettering, round columns, double glass doors, topiary in planters.
 * World meters in building space: x across, y up, z toward the viewer. The main front wall is the plane z = 3 and the
 * building is 44.8 m wide. The portico and its steps reach z 7.2, the pavilions stand 0.6 m proud of the wall.
 *
 * Flicker rules: every window is a real opening cut through a wall of boxes, so there are no panels laid on a wall;
 * no two surfaces sit closer than 5 cm; thin trim is thick enough (7 cm and up) to survive the far zoom; the stone
 * texture has soft mortar lines and mipmaps; lettering is stacked in layers 3 cm apart for depth instead of one decal.
 */
const WALL_H = 6.4, PAV_H = 8.0, FRONT = 3, DEPTH = .9, HALF = 22.4;

function limestone() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!; const r = rng(41);
  g.fillStyle = '#eadfce'; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
    const x = col * 128 + (row % 2) * 64, y = row * 64; const v = (r() - .5) * 12;
    g.fillStyle = `rgb(${236 + v},${225 + v},${208 + v})`; g.fillRect(x + 2, y + 2, 124, 60);
  }
  g.strokeStyle = 'rgba(150,132,110,.34)'; g.lineWidth = 4;
  for (let row = 0; row <= 8; row++) { g.beginPath(); g.moveTo(0, row * 64); g.lineTo(512, row * 64); g.stroke(); }
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) { const x = col * 128 + (row % 2) * 64; g.beginPath(); g.moveTo(x, row * 64); g.lineTo(x, row * 64 + 64); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

type Kind = 'tv' | 'meeting' | 'office' | 'hall' | 'lobby';
/** What you see through a window: warm light, desks, chairs, a TV with a car on it. Flat, so it never shimmers. */
function interiorTexture(kind: Kind, w: number, h: number) {
  return makeCanvasTexture(w, h, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#fff0c8'); bg.addColorStop(.55, '#ffd98a'); bg.addColorStop(1, '#d99a45');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * .8); glow.addColorStop(0, 'rgba(255,255,240,.85)'); glow.addColorStop(1, 'rgba(255,255,240,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b97c36'; g.fillRect(0, h * .84, w, h * .16);                                  // floor
    const desk = (x: number, y: number, dw: number) => { g.fillStyle = '#8a5a2b'; g.fillRect(x, y, dw, h * .035); g.fillStyle = '#6b4320'; g.fillRect(x + 4, y + h * .035, 6, h * .1); g.fillRect(x + dw - 10, y + h * .035, 6, h * .1); };
    const chair = (x: number, y: number, s: number) => { g.fillStyle = '#26262c'; g.fillRect(x, y, s, s * .8); g.fillRect(x + s * .1, y + s * .8, s * .8, s * .2); g.fillRect(x + s * .45, y + s, s * .1, s * .5); };
    const plant = (x: number, y: number, s: number) => { g.fillStyle = '#6b4320'; g.fillRect(x - s * .25, y, s * .5, s * .5); g.fillStyle = '#3f8a45'; g.beginPath(); g.arc(x, y - s * .1, s * .6, 0, 7); g.fill(); g.fillStyle = '#58a85a'; g.beginPath(); g.arc(x - s * .2, y - s * .3, s * .38, 0, 7); g.fill(); };
    if (kind === 'tv') {
      g.fillStyle = '#1b2230'; g.fillRect(w * .12, h * .2, w * .56, h * .24); g.fillStyle = '#2f66c8'; g.fillRect(w * .14, h * .22, w * .52, h * .2);
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(w * .26, h * .3, w * .28, h * .07, 6); g.fill(); g.beginPath(); g.roundRect(w * .31, h * .26, w * .16, h * .06, 6); g.fill();
      g.fillStyle = '#2f66c8'; [w * .31, w * .49].forEach(x => { g.beginPath(); g.arc(x, h * .375, w * .025, 0, 7); g.fill(); });
      desk(w * .08, h * .6, w * .5); chair(w * .16, h * .52, w * .13); chair(w * .42, h * .52, w * .13); desk(w * .62, h * .66, w * .34); chair(w * .72, h * .58, w * .12);
    } else if (kind === 'meeting') {
      [[.1, .18], [.4, .2], [.7, .18]].forEach(([x, y]) => { g.fillStyle = '#c9971f'; g.fillRect(w * x!, h * y!, w * .2, h * .13); g.fillStyle = '#fff3d6'; g.fillRect(w * x! + 5, h * y! + 5, w * .2 - 10, h * .13 - 10); });
      desk(w * .12, h * .62, w * .78); [.18, .36, .56, .74].forEach(x => chair(w * x, h * .54, w * .1)); plant(w * .9, h * .72, w * .12);
    } else if (kind === 'office') {
      desk(w * .08, h * .62, w * .84); [.2, .5, .74].forEach(x => { g.fillStyle = '#20222a'; g.fillRect(w * x, h * .5, w * .13, h * .1); chair(w * x, h * .56, w * .12); }); plant(w * .12, h * .72, w * .1);
    } else if (kind === 'hall') {
      plant(w * .2, h * .8, w * .24); plant(w * .8, h * .8, w * .24);
      g.fillStyle = '#fffbe6'; g.fillRect(w * .42, h * .1, w * .16, h * .55);
      g.fillStyle = '#26262c'; g.fillRect(w * .3, h * .72, w * .4, h * .05); g.fillRect(w * .34, h * .77, w * .06, h * .08); g.fillRect(w * .6, h * .77, w * .06, h * .08);
    } else {
      g.fillStyle = '#fff6dd'; g.fillRect(0, 0, w, h * .84);
      g.strokeStyle = '#c9971f'; g.lineWidth = 6; g.beginPath(); g.ellipse(w / 2, h * .16, w * .2, h * .05, 0, 0, 7); g.stroke();
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(w / 2 + Math.cos(a) * w * .2, h * .16 + Math.sin(a) * h * .05, 7, 0, 7); g.fill(); }
      g.fillStyle = '#c9971f'; g.fillRect(w / 2 - 3, 0, 6, h * .12);
      plant(w * .14, h * .72, w * .16); plant(w * .86, h * .72, w * .16); desk(w * .32, h * .7, w * .36);
    }
  }, 8, false);
}

function lettersTexture(color: 'face' | 'side') {
  return makeCanvasTexture(2048, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.font = `700 196px ${SIGN_FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const text = 'DRIVINGKLASS', sp = 18, ws = [...text].map(c => g.measureText(c).width), total = ws.reduce((a, b) => a + b, 0) + sp * (text.length - 1);
    let x = (w - total) / 2;
    g.fillStyle = color === 'face' ? goldGradient(g, 30, 226) : '#8b6508';
    if (color === 'face') { g.strokeStyle = '#7a5606'; g.lineWidth = 5; g.lineJoin = 'round'; }
    [...text].forEach((c, i) => { if (color === 'face') g.strokeText(c, x, h / 2 + 8); g.fillText(c, x, h / 2 + 8); x += ws[i]! + sp; });
  }, 16);
}

function doorSignTexture(open: boolean) {
  return makeCanvasTexture(512, 256, (g, w, h) => {
    const rr = (x: number, y: number, ww: number, hh: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
    g.clearRect(0, 0, w, h); g.fillStyle = '#16181d'; rr(6, 6, w - 12, h - 12, 28); g.fill();
    g.strokeStyle = 'rgba(244,239,228,.6)'; g.lineWidth = 4; rr(6, 6, w - 12, h - 12, 28); g.stroke();
    const word = open ? 'OPEN' : 'CLOSED'; let size = 124; g.font = `700 ${size}px ${SIGN_FONT}`;
    while (g.measureText(word).width > w - 90 && size > 40) { size -= 4; g.font = `700 ${size}px ${SIGN_FONT}`; }
    g.fillStyle = open ? '#6fdc9a' : '#ee7b72'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2 - 14);
    g.fillStyle = '#f4efe4'; g.font = `600 30px ${SIGN_FONT}`; g.fillText('9AM \u2013 6PM', w / 2, h - 52);
  }, 8);
}

/** Hip roof over a w by d rectangle: four planes and a ridge. */
function hipRoof(w: number, d: number, h: number) {
  const hw = w / 2, hd = d / 2, rr = Math.max(0, (w - d) / 2);
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd], E = [-rr, h, 0], F = [rr, h, 0];
  const tris = rr > 0 ? [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F] : [D, C, E, C, B, E, B, A, E, A, D, E];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3)); g.computeVertexNormals();
  return g;
}

type Opening = { cx: number; w: number; y0: number; y1: number };

export function Building({ position, lite, open }: { position: [number, number, number]; lite: boolean; open: boolean }) {
  const mix = useContext(NightCtx);
  const base = useMemo(limestone, []);
  const stoneMats = useMemo(() => new Map<string, THREE.MeshStandardMaterial>(), []);
  const stone = (w: number, h: number) => {
    const k = `${w.toFixed(1)}x${h.toFixed(1)}`; let m = stoneMats.get(k);
    if (!m) { const t = base.clone(); t.repeat.set(Math.max(.25, w / 3.2), Math.max(.25, h / 1.6)); t.needsUpdate = true; m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffcf80', emissiveIntensity: .05, roughness: .9, color: '#f6ecd2' }); stoneMats.set(k, m); }
    return m;
  };
  const M = useMemo(() => ({
    trim: new THREE.MeshStandardMaterial({ color: '#f5ecdc', roughness: .6 }),
    roof: new THREE.MeshStandardMaterial({ color: '#101218', roughness: .62, metalness: 0, side: THREE.DoubleSide, flatShading: true }),
    black: new THREE.MeshStandardMaterial({ color: '#15161a', roughness: .45, metalness: .3 }),
    led: new THREE.MeshStandardMaterial({ color: '#fff4cf', emissive: '#ffd070', emissiveIntensity: .8, roughness: .5 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffbf70', emissiveIntensity: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d9a93a', roughness: .5, metalness: .3 }),
    crown: new THREE.MeshStandardMaterial({ color: '#e0a21a', emissive: '#ff9d00', emissiveIntensity: .3, roughness: .45, metalness: .25 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#2f6b34', roughness: .95, flatShading: true }),
    leaf2: new THREE.MeshStandardMaterial({ color: '#3d8a42', roughness: .95, flatShading: true }),
    bark: new THREE.MeshStandardMaterial({ color: '#5a3b20', roughness: .9 }),
  }), []);
  const tex = useMemo(() => ({
    tv: interiorTexture('tv', 256, 480), meeting: interiorTexture('meeting', 256, 480), office: interiorTexture('office', 256, 480),
    hall: interiorTexture('hall', 256, 768), lobby: interiorTexture('lobby', 512, 512),
    face: lettersTexture('face'), side: lettersTexture('side'), door: { open: doorSignTexture(true), closed: doorSignTexture(false) },
  }), []);
  const glass = useMemo(() => {
    const mk = (t: THREE.Texture) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    return { tv: mk(tex.tv), meeting: mk(tex.meeting), office: mk(tex.office), hall: mk(tex.hall), lobby: mk(tex.lobby) };
  }, [tex]);
  const letterFace = useMemo(() => new THREE.MeshBasicMaterial({ map: tex.face, transparent: true, toneMapped: false, depthWrite: false }), [tex]);
  const letterSide = useMemo(() => new THREE.MeshBasicMaterial({ map: tex.side, transparent: true, toneMapped: false, depthWrite: false }), [tex]);

  useFrame(() => {
    const n = mix.current;
    M.led.emissiveIntensity = .7 + 3.4 * n; M.lamp.emissiveIntensity = .7 + 2.0 * n; M.crown.emissiveIntensity = .3 + 1.5 * n;
    stoneMats.forEach(m => { m.emissiveIntensity = .03 + .26 * n; });
    Object.values(glass).forEach(m => m.color.setScalar(.8 + .2 * n));
  });

  const archGeo = useMemo(() => {
    const s = new THREE.Shape(), R = 5.55, cy = .55 + 2.3 - R;
    s.moveTo(-5.3, 0); s.lineTo(5.3, 0); s.lineTo(5.3, .4); s.quadraticCurveTo(4.7, .45, 4.4, .6);
    for (let i = 0; i <= 40; i++) { const x = 4.4 - (8.8 * i) / 40; s.lineTo(x, cy + Math.sqrt(R * R - x * x)); }
    s.quadraticCurveTo(-4.7, .45, -5.3, .4); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.computeVertexNormals(); return g;
  }, []);
  const archLed = useMemo(() => { const R = 5.55, cy = .55 + 2.3 - R, pts: THREE.Vector3[] = []; for (let i = 0; i <= 48; i++) { const x = -4.1 + (8.2 * i) / 48; pts.push(new THREE.Vector3(x, cy + Math.sqrt(R * R - x * x) - .3, 0)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, .08, 6, false); }, []);
  const roofs = useMemo(() => ({ main: hipRoof(45, 6.6, 1.9), center: hipRoof(14, 6.4, 4.1), pav: hipRoof(6.4, 5.6, 2.0) }), []);
  const crownGeo = useMemo(() => { const g = new THREE.ExtrudeGeometry(starShape(1, .46), { depth: .34, bevelEnabled: true, bevelThickness: .12, bevelSize: .06, bevelSegments: 2 }); g.translate(0, 0, -.17); g.computeVertexNormals(); return g; }, []);

  /** A wall built from boxes with real openings, so every window has depth. */
  const Wall = ({ x0, x1, y0, y1, z, d, openings }: { x0: number; x1: number; y0: number; y1: number; z: number; d: number; openings: Opening[] }) => {
    const ops = [...openings].sort((a, b) => a.cx - b.cx), parts: JSX.Element[] = []; let cur = x0;
    const box = (xa: number, xb: number, ya: number, yb: number, key: string) => {
      const w = xb - xa, h = yb - ya; if (w < .01 || h < .01) return;
      parts.push(<mesh key={key} position={[(xa + xb) / 2, (ya + yb) / 2, z - d / 2]} material={stone(w, h)} castShadow receiveShadow><boxGeometry args={[w, h, d]} /></mesh>);
    };
    ops.forEach((o, i) => { const l = o.cx - o.w / 2, r = o.cx + o.w / 2; box(cur, l, y0, y1, `p${i}`); box(l, r, y0, o.y0, `s${i}`); box(l, r, o.y1, y1, `h${i}`); cur = r; });
    box(cur, x1, y0, y1, 'pe');
    return <>{parts}</>;
  };

  /** Black window frame with mullions, glass showing the interior texture behind it. */
  const Bay = ({ cx, w, y0, y1, z, kind, rows = 2 }: { cx: number; w: number; y0: number; y1: number; z: number; kind: keyof typeof glass; rows?: number }) => {
    const h = y1 - y0, zf = z - .12, f = .13, planeZ = FRONT - DEPTH - .05;
    return <group>
      <mesh position={[cx, (y0 + y1) / 2, planeZ]} material={glass[kind]}><planeGeometry args={[w + .3, h + .3]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[cx + s * (w / 2 - f / 2), (y0 + y1) / 2, zf]} material={M.black}><boxGeometry args={[f, h, .22]} /></mesh>)}
      {[y0 + f / 2, y1 - f / 2].map(y => <mesh key={y} position={[cx, y, zf]} material={M.black}><boxGeometry args={[w, f, .22]} /></mesh>)}
      <mesh position={[cx, (y0 + y1) / 2, zf]} material={M.black}><boxGeometry args={[.08, h, .2]} /></mesh>
      {Array.from({ length: rows - 1 }).map((_, i) => <mesh key={i} position={[cx, y0 + (h * (i + 1)) / rows, zf]} material={M.black}><boxGeometry args={[w, .08, .2]} /></mesh>)}
    </group>;
  };

  const Planter = ({ x, z, kind }: { x: number; z: number; kind: 'cone' | 'ball' | 'tree' | 'small' }) => {
    const ph = kind === 'small' ? .5 : .95, pw = kind === 'small' ? .9 : 1.5;
    return <group position={[x, 0, z]}>
      <mesh position={[0, ph / 2 + .16, 0]} material={M.trim} castShadow><boxGeometry args={[pw, ph, pw]} /></mesh>
      {kind === 'cone' && <mesh position={[0, ph + .16 + 1.35, 0]} material={M.leaf} castShadow><coneGeometry args={[.95, 2.7, 9]} /></mesh>}
      {kind === 'small' && <mesh position={[0, ph + .16 + .6, 0]} material={M.leaf} castShadow><coneGeometry args={[.5, 1.2, 8]} /></mesh>}
      {kind === 'ball' && <mesh position={[0, ph + .16 + .75, 0]} material={M.leaf2} castShadow><icosahedronGeometry args={[.8, 1]} /></mesh>}
      {kind === 'tree' && <><mesh position={[0, ph + .16 + .8, 0]} material={M.bark}><cylinderGeometry args={[.1, .13, 1.6, 8]} /></mesh><mesh position={[0, ph + .16 + 2.1, 0]} material={M.leaf2} castShadow><icosahedronGeometry args={[1.05, 1]} /></mesh></>}
      <mesh position={[pw / 2 - .05, ph + .2, pw / 2 - .05]} material={M.lamp}><boxGeometry args={[.14, .08, .14]} /></mesh>
    </group>;
  };

  // openings through the main front wall
  const wallOps: Opening[] = [
    { cx: 0, w: 3.8, y0: 1.0, y1: 4.7 },
    ...[-1, 1].flatMap(s => [{ cx: s * 6.55, w: 2.1, y0: 1.0, y1: 4.9 }, { cx: s * 10.5, w: 2.0, y0: 1.0, y1: 6.0 }, { cx: s * 15.4, w: 2.1, y0: 1.0, y1: 4.9 }, { cx: s * 19.4, w: 2.1, y0: 1.0, y1: 4.9 }]),
  ];
  const pavOps = (s: number): Opening[] => [{ cx: s * 10.5, w: 2.0, y0: 1.0, y1: 6.0 }];
  const kinds: Record<number, Kind> = { 6.55: 'tv', 15.4: 'office', 19.4: 'meeting' };
  const lampOn = open;

  return <group position={position}>
    {/* body, cornice and roofs */}
    <mesh position={[0, WALL_H / 2 + .08, -.5]} material={stone(44.8, 6)}><boxGeometry args={[44.8, WALL_H - .16, 4.9]} /></mesh>
    <Wall x0={-HALF} x1={HALF} y0={.16} y1={WALL_H} z={FRONT} d={DEPTH} openings={wallOps} />
    <mesh position={[0, WALL_H + .25, 0]} material={M.trim} castShadow><boxGeometry args={[HALF * 2 + .4, .5, 7]} /></mesh>
    <mesh position={[0, WALL_H - .08, FRONT + .55]} material={M.led}><boxGeometry args={[HALF * 2 + .2, .12, .12]} /></mesh>
    <mesh geometry={roofs.main} material={M.roof} position={[0, WALL_H + .5, 0]} castShadow />
    <mesh geometry={roofs.center} material={M.roof} position={[0, WALL_H + .5, -.2]} castShadow />

    {/* pavilions: taller, proud of the wall, each with a tall lit window and its own pyramid roof */}
    {[-1, 1].map(s => <group key={s}>
      <Wall x0={s < 0 ? -13.1 : 7.7} x1={s < 0 ? -7.7 : 13.1} y0={.16} y1={PAV_H} z={FRONT + .6} d={.9} openings={pavOps(s)} />
      <mesh position={[s * 10.4, PAV_H + .3, -.3]} material={M.trim} castShadow><boxGeometry args={[6.1, .6, 7.2]} /></mesh>
      <mesh position={[s * 10.4, PAV_H - .08, FRONT + 1.2]} material={M.led}><boxGeometry args={[5.9, .12, .12]} /></mesh>
      <mesh geometry={roofs.pav} material={M.roof} position={[s * 10.4, PAV_H + .6, -.1]} castShadow />
      <mesh position={[s * 10.4, (WALL_H + PAV_H) / 2, -.6]} material={stone(5.4, 1.6)}><boxGeometry args={[5.4, PAV_H - WALL_H, 4.2]} /></mesh>
      <Bay cx={s * 10.5} w={2.0} y0={1.0} y1={6.0} z={FRONT + .6} kind="hall" rows={3} />
      <Bay cx={s * 6.55} w={2.1} y0={1.0} y1={4.9} z={FRONT} kind={s < 0 ? 'tv' : 'meeting'} />
      <Bay cx={s * 15.4} w={2.1} y0={1.0} y1={4.9} z={FRONT} kind="office" />
      <Bay cx={s * 19.4} w={2.1} y0={1.0} y1={4.9} z={FRONT} kind={s < 0 ? 'meeting' : 'tv'} />
      {/* low hedges under the far windows and a round, a cone and a tree at each end */}
      <mesh position={[s * 17.4, .55, FRONT + .9]} material={M.leaf} castShadow><boxGeometry args={[8.8, .8, .9]} /></mesh>
      <mesh position={[s * 6.55, .5, FRONT + .8]} material={M.leaf} castShadow><boxGeometry args={[3.2, .7, .8]} /></mesh>
      <Planter x={s * 8.6} z={FRONT + 2.2} kind="cone" /><Planter x={s * 13.4} z={FRONT + 2.4} kind="tree" /><Planter x={s * 12.2} z={FRONT + 2.2} kind="small" />
      {/* the steps' handrails: two posts and a sloped top rail beside each flight */}
      <mesh position={[s * 3.7, 1.45, 6.25]} material={M.black}><cylinderGeometry args={[.045, .045, .9, 8]} /></mesh>
      <mesh position={[s * 3.7, .89, 7.15]} material={M.black}><cylinderGeometry args={[.045, .045, .9, 8]} /></mesh>
      <mesh position={[s * 3.7, 1.64, 6.7]} rotation={[Math.atan2(.56, .9), 0, 0]} material={M.black}><boxGeometry args={[.08, .08, 1.06]} /></mesh>
    </group>)}

    {/* entrance: doors, pilasters, canopy, columns, sign panel, arch, stars, letters */}
    <Bay cx={0} w={3.8} y0={1.0} y1={4.7} z={FRONT} kind="lobby" rows={3} />
    {[-1.9, -.95, 0, .95, 1.9].map(x => <mesh key={x} position={[x, 2.85, FRONT - .12]} material={M.black}><boxGeometry args={[x === 0 ? .1 : .1, 3.7, .2]} /></mesh>)}
    {[-.14, .14].map(x => <mesh key={x} position={[x * 1.4, 2.3, FRONT - .04]} material={M.gold}><boxGeometry args={[.07, .8, .09]} /></mesh>)}
    <mesh position={[1.45, 2.7, FRONT + .1]} material={undefined}><planeGeometry args={[.95, .48]} /><meshBasicMaterial map={lampOn ? tex.door.open : tex.door.closed} transparent toneMapped={false} /></mesh>
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[s * 3.75, 3.1, FRONT + .35]} material={stone(.8, 4.3)} castShadow><boxGeometry args={[.8, 4.3, .7]} /></mesh>
      <mesh position={[s * 2.7, 3.9, FRONT + .25]} material={M.black}><boxGeometry args={[.16, .5, .16]} /></mesh>
      <mesh position={[s * 2.7, 3.9, FRONT + .43]} material={M.lamp}><boxGeometry args={[.22, .42, .22]} /></mesh>
      <mesh position={[s * 4.8, 3.2, 5.7]} material={M.trim} castShadow><cylinderGeometry args={[.55, .55, 4.1, 28]} /></mesh>
      <mesh position={[s * 4.8, 1.2, 5.7]} material={M.trim}><cylinderGeometry args={[.72, .76, .4, 28]} /></mesh>
      <mesh position={[s * 4.8, 5.15, 5.7]} material={M.trim}><cylinderGeometry args={[.74, .6, .4, 28]} /></mesh>
      <Planter x={s * 2.85} z={4.6} kind="ball" />
    </group>)}
    <mesh position={[0, .58, 4.7]} material={stone(11.6, .9)} receiveShadow><boxGeometry args={[11.6, .84, 3.4]} /></mesh>
    <mesh position={[0, .3, 6.95]} material={stone(8, .3)}><boxGeometry args={[8, .28, .5]} /></mesh>
    <mesh position={[0, .44, 6.55]} material={stone(7.4, .3)}><boxGeometry args={[7.4, .56, .5]} /></mesh>
    <mesh position={[0, 5.62, 4.75]} material={M.trim} castShadow><boxGeometry args={[13.6, .55, 3.5]} /></mesh>
    <mesh position={[0, 5.26, 6.45]} material={M.led}><boxGeometry args={[13.4, .12, .12]} /></mesh>
    {[-4.4, -2.2, 2.2, 4.4].map(x => <mesh key={x} position={[x, 5.3, 5.0]} rotation-x={Math.PI / 2} material={M.lamp}><circleGeometry args={[.13, 14]} /></mesh>)}
    <mesh position={[0, 6.75, 4.0]} material={stone(12.8, 1.7)} castShadow><boxGeometry args={[12.8, 1.7, 2.0]} /></mesh>
    <mesh geometry={archGeo} material={stone(10.6, 3)} position={[0, 7.6, 4.0]} castShadow />
    <mesh geometry={archLed} material={M.led} position={[0, 7.6, 5.04]} />
    {[[-2.4, .42, 8.05], [-1.3, .52, 8.3], [0, .78, 8.62], [1.3, .52, 8.3], [2.4, .42, 8.05]].map(([x, r, y]) => <mesh key={x} geometry={crownGeo} material={M.crown} position={[x!, y!, 5.2]} scale={[r!, r!, 1]} castShadow />)}
    {[.06, .12].map((o, i) => <mesh key={o} material={letterSide} position={[-.02 * (i + 1), 6.73 - .02 * (i + 1), 5.0 + o]}><planeGeometry args={[11.6, 1.45]} /></mesh>)}
    <mesh material={letterFace} position={[0, 6.75, 5.0 + .18]}><planeGeometry args={[11.6, 1.45]} /></mesh>
    <mesh position={[0, WALL_H - .08, FRONT - 2]} visible={false}><boxGeometry args={[.01, .01, .01]} /></mesh>
  </group>;
}
