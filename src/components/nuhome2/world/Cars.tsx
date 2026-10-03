import { useMemo } from 'react';
import * as THREE from 'three';
import { makeCanvasTexture } from './parts';

/*
 * Real driver-education sedans, modeled from published dimensions (meters). Every car wears the DrivingKlass roof magnet:
 * a black pad with five gold stars on the top and on both long faces.
 * Local axes: +x is the nose, +y up, +z the driver's left side. The car is centred on its own length.
 */
export type CarSpec = {
  id: string; year: number; make: string; model: string; color: string;
  L: number; W: number; H: number; WB: number; fo: number;       // length, width, height, wheelbase, front overhang
  trunk?: number; hood?: number; roofBack?: number;              // small silhouette tweaks
  tire: number;                                                  // tire radius
};

export const CAR_SPECS: Record<string, CarSpec> = {
  corolla: { id: 'corolla', year: 2024, make: 'Toyota', model: 'Corolla LE', color: '#f2f3f1', L: 4.63, W: 1.78, H: 1.435, WB: 2.70, fo: .94, tire: .315 },
  civic: { id: 'civic', year: 2023, make: 'Honda', model: 'Civic LX', color: '#c3c8ce', L: 4.68, W: 1.80, H: 1.415, WB: 2.74, fo: .96, trunk: .97, roofBack: .96, tire: .31 },
  elantra: { id: 'elantra', year: 2024, make: 'Hyundai', model: 'Elantra SE', color: '#27428f', L: 4.68, W: 1.83, H: 1.43, WB: 2.72, fo: .93, trunk: 1.02, hood: 1.02, tire: .32 },
  camry: { id: 'camry', year: 2024, make: 'Toyota', model: 'Camry LE', color: '#17191d', L: 4.88, W: 1.84, H: 1.445, WB: 2.82, fo: .98, trunk: 1.0, tire: .325 },
  sentra: { id: 'sentra', year: 2023, make: 'Nissan', model: 'Sentra S', color: '#f1efe9', L: 4.64, W: 1.82, H: 1.45, WB: 2.71, fo: .95, hood: .98, tire: .315 },
};

type Pt = [number, number];
function loft(rings: THREE.Vector3[][]) {
  const m = rings[0]!.length, pos: number[] = [], idx: number[] = [];
  rings.forEach(r => r.forEach(p => pos.push(p.x, p.y, p.z)));
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < m; k++) {
    const a = i * m + k, b = i * m + (k + 1) % m, c = (i + 1) * m + k, d = (i + 1) * m + (k + 1) % m;
    idx.push(a, c, b, b, c, d);
  }
  const cap = (ri: number, flip: boolean) => {
    const c = new THREE.Vector3(); rings[ri]!.forEach(p => c.add(p)); c.multiplyScalar(1 / m);
    const ci = pos.length / 3; pos.push(c.x, c.y, c.z);
    for (let k = 0; k < m; k++) { const a = ri * m + k, b = ri * m + (k + 1) % m; idx.push(...(flip ? [ci, b, a] : [ci, a, b])); }
  };
  cap(0, true); cap(rings.length - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

const BODY_ST: [number, number, number, number][] = [   // t from the tail, top (x H), half width (x W/2), bottom (x H)
  [0, .50, .72, .27], [.015, .60, .88, .22], [.06, .67, .96, .17], [.18, .695, 1, .15], [.30, .70, 1, .14], [.50, .70, 1, .14], [.64, .685, 1, .14],
  [.72, .63, 1, .15], [.84, .585, .97, .17], [.94, .54, .93, .20], [.985, .46, .84, .24], [1, .36, .70, .27],
];
const CABIN_ST: [number, number][] = [   // t, roof height (x H)
  [.215, .69], [.235, .78], [.28, .905], [.34, .975], [.40, 1], [.48, 1], [.53, .975], [.575, .85], [.61, .73], [.625, .69],
];

function buildGeos(s: CarSpec) {
  const { L, W, H } = s, hw = W / 2, tr = s.trunk ?? 1, hd = s.hood ?? 1, rb = s.roofBack ?? 1;
  // flat flanks, rounded shoulder, flat sill: wheels sit inside the body line like a real sedan
  const HALF: [number, number][] = [[.78, 0], [.95, .07], [1, .2], [1, .6], [.985, .8], [.9, .95], [.6, 1]];
  const bodyRings = BODY_ST.map(([t, top, w, bot]) => {
    const x = (t - .5) * L, tp = (t < .3 ? top * tr : t > .7 ? top * hd : top) * H, bt = bot * H, ww = w * hw, pts: THREE.Vector3[] = [];
    HALF.forEach(([wf, yf]) => pts.push(new THREE.Vector3(x, bt + (tp - bt) * yf, wf * ww)));
    pts.push(new THREE.Vector3(x, tp + .004, 0));
    for (let i = HALF.length - 1; i >= 0; i--) { const [wf, yf] = HALF[i]!; pts.push(new THREE.Vector3(x, bt + (tp - bt) * yf, -wf * ww)); }
    pts.push(new THREE.Vector3(x, bt, 0));
    return pts;
  });
  const belt = .69 * H;
  const cabinRings = CABIN_ST.map(([t, roof], i) => {
    const x = (t - .5) * L, yt = roof * H * (t < .4 ? (i < 3 ? 1 : 1) : 1) * (t < .4 ? rb + (1 - rb) * 0 : 1) + (t < .4 ? (rb - 1) * .02 * H : 0), yb = belt - .002;
    const hb = .82 * hw, ht = (roof > .95 ? .7 : .7 + (1 - roof) * .3) * hw;
    const P: Pt[] = [[-hb, yb], [-(hb + ht) / 2 - .012, (yb + yt) / 2], [-ht, yt - .06], [-ht * .88, yt - .014], [-ht * .55, yt], [0, yt + .012], [ht * .55, yt], [ht * .88, yt - .014], [ht, yt - .06], [(hb + ht) / 2 + .012, (yb + yt) / 2], [hb, yb]];
    const ring = P.map(([z, y]) => new THREE.Vector3(x, y, z)); ring.push(new THREE.Vector3(x, yb, 0)); return ring;
  });
  const roofSt = CABIN_ST.slice(2, 7);
  const roof = (() => {
    const cols = 9, pos: number[] = [], idx: number[] = [];
    roofSt.forEach(([t, r]) => { const x = (t - .5) * L, yt = r * H, w = .7 * hw * .9; for (let c = 0; c < cols; c++) { const u = c / (cols - 1) * 2 - 1; pos.push(x, yt + .008 + .014 * (1 - u * u), u * w); } });
    for (let i = 0; i < roofSt.length - 1; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c; idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  return { body: loft(bodyRings), cabin: loft(cabinRings), roof };
}


function rimTexture() {
  return makeCanvasTexture(256, 256, (g, w, h) => {
    const c = w / 2; g.fillStyle = '#0d0e11'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(c * .75, c * .75, 8, c, c, c); gr.addColorStop(0, '#f4f6f9'); gr.addColorStop(.6, '#b7bcc4'); gr.addColorStop(1, '#8a8f98');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * .96, 0, 7); g.fill();
    g.fillStyle = '#121317'; for (let i = 0; i < 10; i++) { g.save(); g.translate(c, c); g.rotate((i / 10) * Math.PI * 2 + .15); g.beginPath(); g.moveTo(c * .3, -c * .09); g.lineTo(c * .88, -c * .14); g.lineTo(c * .88, c * .01); g.lineTo(c * .3, c * .0); g.closePath(); g.fill(); g.restore(); }
    g.strokeStyle = '#d9dde3'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, c * .9, 0, 7); g.stroke();
    g.fillStyle = '#cdd1d7'; g.beginPath(); g.arc(c, c, c * .2, 0, 7); g.fill(); g.fillStyle = '#1b1c21'; g.beginPath(); g.arc(c, c, c * .09, 0, 7); g.fill();
    g.fillStyle = '#9aa0a8'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * c * .15, c + Math.sin(a) * c * .15, 4, 0, 7); g.fill(); }
  }, 8, false);
}

function starPath(g: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * .42 : R; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath();
}
/** The roof magnet: a black pad, a double gold border and five gold stars, long side across the roof so the row reads from behind. */
function magnetTexture(top: boolean) {
  const W = top ? 1200 : 1800, H = top ? 412 : 130;
  const t = makeCanvasTexture(W, H, (g) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 2; for (let x = -H; x < W; x += 14) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
    const bw = top ? 12 : 8, m = top ? 16 : 10;
    g.strokeStyle = '#e0b030'; g.lineWidth = bw; g.strokeRect(m, m, W - 2 * m, H - 2 * m); g.strokeStyle = 'rgba(224,176,48,.55)'; g.lineWidth = 2.5; g.strokeRect(m + bw + 6, m + bw + 6, W - 2 * (m + bw + 6), H - 2 * (m + bw + 6));
    const R = top ? 82 : 46, gap = top ? 215 : 215, gr = g.createLinearGradient(0, H / 2 - R, 0, H / 2 + R); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(.45, '#f6c64f'); gr.addColorStop(1, '#bf8a14');
    for (let i = 0; i < 5; i++) { const cx = W / 2 + (i - 2) * gap; g.save(); g.shadowColor = 'rgba(255,200,60,.55)'; g.shadowBlur = top ? 22 : 10; starPath(g, cx, H / 2 + (top ? 4 : 2), R); g.fillStyle = gr; g.fill(); g.restore(); starPath(g, cx, H / 2 + (top ? 4 : 2), R); g.strokeStyle = '#8a620c'; g.lineWidth = 2; g.stroke(); }
  }, 8, false);
  if (top) { t.center.set(.5, .5); t.rotation = Math.PI / 2; }
  return t;
}
function plateTexture(text: string) {
  return makeCanvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1b2b5a'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#1b2b5a'; g.font = '700 22px Poppins, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('GEORGIA', w / 2, 28);
    g.fillStyle = '#111'; g.font = '700 58px Poppins, Arial, sans-serif'; g.fillText(text, w / 2, 90); g.fillStyle = '#c0572c'; g.font = '600 15px Poppins, Arial, sans-serif'; g.fillText('PEACH STATE', w / 2, 118);
  }, 8);
}
function grilleTexture() {
  return makeCanvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2c31'; g.lineWidth = 2;
    for (let y = 0; y < h + 12; y += 8) for (let x = 0; x < w + 12; x += 12) { const ox = (Math.floor(y / 8) % 2) * 6; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](x + ox + Math.cos(a) * 5.4, y + Math.sin(a) * 5.4); } g.closePath(); g.stroke(); }
    g.strokeStyle = '#c9ced6'; g.lineWidth = 6; g.strokeRect(2, 2, w - 4, h - 4);
  }, 8, false);
}

let shared: { tire: THREE.MeshStandardMaterial; rim: THREE.MeshStandardMaterial; arch: THREE.MeshBasicMaterial; glass: THREE.MeshPhysicalMaterial; dark: THREE.MeshStandardMaterial; chrome: THREE.MeshStandardMaterial; head: THREE.MeshStandardMaterial; drl: THREE.MeshStandardMaterial; tail: THREE.MeshStandardMaterial; grille: THREE.MeshStandardMaterial; disc: THREE.MeshStandardMaterial; caliper: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; mag: THREE.Material[]; shadow: THREE.MeshBasicMaterial } | null = null;
function getShared() {
  if (shared) return shared;
  const top = magnetTexture(true), side = magnetTexture(false), black = new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: .5, metalness: .2 });
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.6, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const face = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: .42, metalness: .25 });
  shared = {
    tire: new THREE.MeshStandardMaterial({ color: '#0f1012', roughness: .94 }),
    rim: new THREE.MeshStandardMaterial({ map: rimTexture(), metalness: .8, roughness: .28 }),
    arch: new THREE.MeshBasicMaterial({ color: '#040405' }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0b1218', roughness: .04, metalness: .6, clearcoat: 1, envMapIntensity: 2 }),
    dark: new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: .5, metalness: .2 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d4d8de', roughness: .18, metalness: 1 }),
    head: new THREE.MeshStandardMaterial({ color: '#dfe7f2', emissive: '#cfe0f6', emissiveIntensity: .1, roughness: .1, metalness: .4 }),
    drl: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#e8f1ff', emissiveIntensity: .5, roughness: .3 }),
    tail: new THREE.MeshStandardMaterial({ color: '#7d0f17', emissive: '#a30f1a', emissiveIntensity: .22, roughness: .2, metalness: .2 }),
    grille: new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: .5, metalness: .4 }),
    disc: new THREE.MeshStandardMaterial({ color: '#7b7e85', roughness: .45, metalness: .8 }),
    caliper: new THREE.MeshStandardMaterial({ color: '#b8141c', roughness: .4 }),
    gold: new THREE.MeshStandardMaterial({ color: '#e0b030', roughness: .28, metalness: .9 }),
    mag: [face(side), face(side), face(top), black, black, black],
    shadow: new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  };
  return shared;
}

const tireGeo = new THREE.CylinderGeometry(1, 1, 1, 32);
const rimGeo = new THREE.CircleGeometry(1, 32);
const archGeo = new THREE.RingGeometry(.76, 1, 32);
const discGeo = new THREE.CylinderGeometry(1, 1, 1, 24);

export function Car({ spec, position, rotationY = 0 }: { spec: CarSpec; position: [number, number, number]; rotationY?: number }) {
  const geos = useMemo(() => buildGeos(spec), [spec]);
  const m = getShared();
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: spec.color, metalness: .5, roughness: .26, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5 }), [spec.color]);
  const roofMat = useMemo(() => { const r = paint.clone(); r.side = THREE.DoubleSide; return r; }, [paint]);
  const plate = useMemo(() => new THREE.MeshStandardMaterial({ map: plateTexture(`DK${spec.year % 100}${spec.id.slice(0, 2).toUpperCase()}`), roughness: .45 }), [spec]);
  const { L, W, H, WB, fo, tire } = spec, hw = W / 2, ax = L / 2 - fo, rx = ax - WB, archZ = hw * .975 + .003, belt = .69 * H;
  const wheels = [[ax, 1], [ax, -1], [rx, 1], [rx, -1]] as const;
  const seams = [.585, .455, .30];
  return <group position={position} rotation-y={rotationY}>
    <mesh position={[0, .06, 0]} rotation-x={-Math.PI / 2} material={m.shadow} scale={[L * 1.28, W * 1.5, 1]} renderOrder={2}><planeGeometry args={[1, 1]} /></mesh>
    <mesh position={[0, .13, 0]} material={m.dark}><boxGeometry args={[L * .86, .02, W * .8]} /></mesh>
    <mesh geometry={geos.body} material={paint} castShadow receiveShadow />
    <mesh geometry={geos.cabin} material={m.glass} castShadow />
    <mesh geometry={geos.roof} material={roofMat} />
    {/* wheels, discs, calipers, wells */}
    {wheels.map(([x, s], i) => <group key={i} position={[x, tire, s * (hw - .115)]}>
      <mesh rotation-x={Math.PI / 2} geometry={tireGeo} scale={[tire, .205, tire]} material={m.tire} />
      <mesh position={[0, 0, s * .06]} rotation-x={Math.PI / 2} geometry={discGeo} scale={[tire * .6, .02, tire * .6]} material={m.disc} />
      <mesh position={[tire * .24, tire * .3, s * .075]} material={m.caliper}><boxGeometry args={[.12, .1, .04]} /></mesh>
      <mesh position={[0, 0, s * .1035]} rotation-y={s > 0 ? 0 : Math.PI} geometry={rimGeo} scale={tire * .74} material={m.rim} />
      <mesh position={[0, 0, s * (archZ - (hw - .115))]} rotation-y={s > 0 ? 0 : Math.PI} scale={tire * 1.3} geometry={archGeo} material={m.arch} />
    </group>)}
    {[-1, 1].map(s => <group key={s}>
      {/* lamps: housing, projector, daytime strip; wraparound tail lamp with a chrome bar */}
      <mesh position={[L / 2 - .1, H * .45, s * hw * .62]} rotation-y={-s * .38} material={m.head}><boxGeometry args={[.12, .085, .4]} /></mesh>
      <mesh position={[L / 2 - .045, H * .452, s * hw * .6]} rotation-x={Math.PI / 2} rotation-z={Math.PI / 2} material={m.dark}><cylinderGeometry args={[.028, .028, .04, 14]} /></mesh>
      <mesh position={[L / 2 - .095, H * .485, s * hw * .62]} rotation-y={-s * .38} material={m.drl}><boxGeometry args={[.125, .014, .38]} /></mesh>
      <mesh position={[-L / 2 + .07, H * .56, s * hw * .68]} rotation-y={s * .3} material={m.tail}><boxGeometry args={[.08, .09, .42]} /></mesh>
      <mesh position={[-L / 2 + .105, H * .56, s * hw * .52]} material={m.chrome}><boxGeometry args={[.012, .016, .3]} /></mesh>
      <mesh position={[L / 2 - .09, H * .21, s * hw * .72]} material={m.drl}><boxGeometry args={[.04, .045, .12]} /></mesh>
      {/* mirrors: stalk and housing */}
      <mesh position={[(.585 - .5) * L + .06, H * .69, s * (hw + .02)]} material={m.dark}><boxGeometry args={[.05, .03, .06]} /></mesh>
      <mesh position={[(.585 - .5) * L + .1, H * .71, s * (hw + .08)]} material={paint} castShadow><boxGeometry args={[.13, .09, .16]} /></mesh>
      {/* door seams, handles, window chrome, B pillar, side skirt */}
      {seams.map(t => <mesh key={t} position={[(t - .5) * L, H * .42, s * (hw + .001)]} material={m.dark}><boxGeometry args={[.007, H * .5, .004]} /></mesh>)}
      {[.52, .39].map(t => <mesh key={t} position={[(t - .5) * L, H * .6, s * (hw + .008)]} material={m.chrome}><boxGeometry args={[.13, .022, .02]} /></mesh>)}
      <mesh position={[(.42 - .5) * L, belt + .006, s * (.82 * hw + .004)]} material={m.chrome}><boxGeometry args={[L * .4, .018, .014]} /></mesh>
      <mesh position={[(.455 - .5) * L, belt + (H - belt) * .5, s * (.77 * hw)]} material={m.dark}><boxGeometry args={[.07, (H - belt) * .86, .02]} /></mesh>
      <mesh position={[0, H * .18, s * (hw - .012)]} material={m.dark}><boxGeometry args={[L * .56, .06, .02]} /></mesh>
    </group>)}
    {/* grille, intake, plates, exhaust, spoiler lip, shark fin */}
    <mesh position={[L / 2 - .028, H * .36, 0]} rotation-y={Math.PI / 2} material={m.grille}><planeGeometry args={[.84, .15]} /></mesh>
    <mesh position={[L / 2 - .05, H * .22, 0]} rotation-y={Math.PI / 2} material={m.grille}><planeGeometry args={[1.1, .1]} /></mesh>
    <mesh position={[L / 2 - .015, H * .27, 0]} rotation-y={Math.PI / 2} material={plate}><planeGeometry args={[.3, .15]} /></mesh>
    <mesh position={[-L / 2 + .012, H * .38, 0]} rotation-y={-Math.PI / 2} material={plate}><planeGeometry args={[.3, .15]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[-L / 2 + .02, H * .2, s * hw * .5]} rotation-z={Math.PI / 2} material={m.chrome}><cylinderGeometry args={[.035, .035, .08, 12]} /></mesh>)}
    <mesh position={[-L / 2 + .13, H * (.7 * (spec.trunk ?? 1)) + .005, 0]} material={paint}><boxGeometry args={[.1, .018, W * .62]} /></mesh>
    <mesh position={[(.34 - .5) * L, H + .02, 0]} material={m.dark}><boxGeometry args={[.13, .04, .035]} /></mesh>
    {/* the DrivingKlass roof magnet: long side across the roof, gold border, five gold stars */}
    <mesh position={[(.44 - .5) * L, H + .018, 0]} material={m.gold}><boxGeometry args={[.4, .012, 1.1]} /></mesh>
    <mesh position={[(.44 - .5) * L, H + .06, 0]} material={m.mag}><boxGeometry args={[.36, .075, 1.05]} /></mesh>
  </group>;
}
