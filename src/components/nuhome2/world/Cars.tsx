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
  civic: { id: 'civic', year: 2023, make: 'Honda', model: 'Civic LX', color: '#b9bec4', L: 4.68, W: 1.80, H: 1.415, WB: 2.74, fo: .96, trunk: .97, roofBack: .96, tire: .31 },
  elantra: { id: 'elantra', year: 2024, make: 'Hyundai', model: 'Elantra SE', color: '#5d6269', L: 4.68, W: 1.83, H: 1.43, WB: 2.72, fo: .93, trunk: 1.02, hood: 1.02, tire: .32 },
  camry: { id: 'camry', year: 2024, make: 'Toyota', model: 'Camry LE', color: '#17191d', L: 4.88, W: 1.84, H: 1.445, WB: 2.82, fo: .98, trunk: 1.0, tire: .325 },
  sentra: { id: 'sentra', year: 2023, make: 'Nissan', model: 'Sentra S', color: '#eceae4', L: 4.64, W: 1.82, H: 1.45, WB: 2.71, fo: .95, hood: .98, tire: .315 },
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
    const c = w / 2; g.fillStyle = '#1b1c20'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(c * .8, c * .8, 6, c, c, c); gr.addColorStop(0, '#f1f3f6'); gr.addColorStop(.7, '#aeb3ba'); gr.addColorStop(1, '#7b8088');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * .95, 0, 7); g.fill();
    g.fillStyle = '#16171b'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + .3; g.save(); g.translate(c, c); g.rotate(a); g.beginPath(); g.moveTo(c * .2, -c * .13); g.lineTo(c * .86, -c * .2); g.lineTo(c * .86, c * .2); g.lineTo(c * .2, c * .13); g.closePath(); g.fill(); g.restore(); }
    g.fillStyle = '#c4c8ce'; g.beginPath(); g.arc(c, c, c * .17, 0, 7); g.fill(); g.fillStyle = '#2a2b30'; g.beginPath(); g.arc(c, c, c * .07, 0, 7); g.fill();
  }, 8, false);
}

function starPath(g: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R * .42 : R; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath();
}
function magnetTexture(top: boolean) {
  const W = top ? 600 : 1200, H = top ? 224 : 120;
  return makeCanvasTexture(W, H, (g) => {
    g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, W, H); g.strokeStyle = '#d9a621'; g.lineWidth = top ? 6 : 5; g.strokeRect(top ? 10 : 8, top ? 10 : 8, W - (top ? 20 : 16), H - (top ? 20 : 16));
    const R = top ? 36 : 36, gap = top ? 104 : 190, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#fff2b8'); gr.addColorStop(.5, '#f2c14e'); gr.addColorStop(1, '#b98714');
    for (let i = 0; i < 5; i++) { starPath(g, W / 2 + (i - 2) * gap, H / 2, R); g.fillStyle = gr; g.fill(); g.strokeStyle = '#8a6208'; g.lineWidth = 1.5; g.stroke(); }
  }, 8, false);
}

let shared: { tire: THREE.MeshStandardMaterial; rim: THREE.MeshStandardMaterial; arch: THREE.MeshBasicMaterial; glass: THREE.MeshPhysicalMaterial; dark: THREE.MeshStandardMaterial; chrome: THREE.MeshStandardMaterial; head: THREE.MeshStandardMaterial; tail: THREE.MeshStandardMaterial; plate: THREE.MeshStandardMaterial; mag: THREE.Material[]; shadow: THREE.MeshBasicMaterial } | null = null;
function getShared() {
  if (shared) return shared;
  const top = magnetTexture(true), side = magnetTexture(false), black = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: .6 });
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.6, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  shared = {
    tire: new THREE.MeshStandardMaterial({ color: '#101113', roughness: .92 }),
    rim: new THREE.MeshStandardMaterial({ map: rimTexture(), metalness: .75, roughness: .32 }),
    arch: new THREE.MeshBasicMaterial({ color: '#050506' }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d141b', roughness: .05, metalness: .55, clearcoat: 1, envMapIntensity: 1.7 }),
    dark: new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: .5, metalness: .2 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#cfd3d8', roughness: .22, metalness: 1 }),
    head: new THREE.MeshStandardMaterial({ color: '#e9eef6', emissive: '#dfe8f6', emissiveIntensity: .12, roughness: .15, metalness: .3 }),
    tail: new THREE.MeshStandardMaterial({ color: '#8f1119', emissive: '#a8101a', emissiveIntensity: .18, roughness: .25 }),
    plate: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: .5 }),
    mag: [black, black, new THREE.MeshStandardMaterial({ map: top, roughness: .55 }), black, new THREE.MeshStandardMaterial({ map: side, roughness: .55 }), new THREE.MeshStandardMaterial({ map: side, roughness: .55 })],
    shadow: new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  };
  return shared;
}

const tireGeo = new THREE.CylinderGeometry(1, 1, 1, 28);
const rimGeo = new THREE.CircleGeometry(1, 28);
const archGeo = new THREE.RingGeometry(.76, 1, 28);

export function Car({ spec, position, rotationY = 0 }: { spec: CarSpec; position: [number, number, number]; rotationY?: number }) {
  const geos = useMemo(() => buildGeos(spec), [spec]);
  const m = getShared();
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: spec.color, metalness: .42, roughness: .3, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.3 }), [spec.color]);
  const roofMat = useMemo(() => { const r = paint.clone(); r.side = THREE.DoubleSide; return r; }, [paint]);
  const { L, W, H, WB, fo, tire } = spec, hw = W / 2, ax = L / 2 - fo, rx = ax - WB;
  const archZ = hw * .975 + .003;
  const wheels = [[ax, 1], [ax, -1], [rx, 1], [rx, -1]] as const;
  const seams = [.585, .455, .30];
  return <group position={position} rotation-y={rotationY}>
    <mesh position={[0, .06, 0]} rotation-x={-Math.PI / 2} material={m.shadow} scale={[L * 1.28, W * 1.5, 1]} renderOrder={2}><planeGeometry args={[1, 1]} /></mesh>
    <mesh geometry={geos.body} material={paint} castShadow receiveShadow />
    <mesh geometry={geos.cabin} material={m.glass} castShadow />
    <mesh geometry={geos.roof} material={roofMat} />
    {/* wheels, wheel wells */}
    {wheels.map(([x, s], i) => <group key={i} position={[x, tire, s * (hw - .115)]}>
      <mesh rotation-x={Math.PI / 2} geometry={tireGeo} scale={[tire, .205, tire]} material={m.tire} />
      <mesh position={[0, 0, s * .1035]} rotation-y={s > 0 ? 0 : Math.PI} geometry={rimGeo} scale={tire * .72} material={m.rim} />
      <mesh position={[0, 0, s * (archZ - (hw - .115))]} rotation-y={s > 0 ? 0 : Math.PI} scale={tire * 1.3} geometry={archGeo} material={m.arch} />
    </group>)}
    {/* lamps, grille, bumper intake, plates */}
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[L / 2 - .1, H * .45, s * hw * .62]} rotation-y={-s * .38} material={m.head}><boxGeometry args={[.12, .085, .4]} /></mesh>
      <mesh position={[-L / 2 + .07, H * .56, s * hw * .68]} rotation-y={s * .3} material={m.tail}><boxGeometry args={[.08, .09, .42]} /></mesh>
      <mesh position={[(.585 - .5) * L + .1, H * .7, s * (hw + .06)]} material={paint} castShadow><boxGeometry args={[.13, .09, .16]} /></mesh>
      {seams.map(t => <mesh key={t} position={[(t - .5) * L, H * .42, s * (hw + .001)]} material={m.dark}><boxGeometry args={[.007, H * .5, .004]} /></mesh>)}
      {[.52, .39].map(t => <mesh key={t} position={[(t - .5) * L, H * .6, s * (hw + .008)]} material={m.chrome}><boxGeometry args={[.13, .022, .02]} /></mesh>)}
    </group>)}
    <mesh position={[L / 2 - .03, H * .36, 0]} material={m.dark}><boxGeometry args={[.05, .13, .82]} /></mesh>
    <mesh position={[L / 2 - .045, H * .22, 0]} material={m.dark}><boxGeometry args={[.05, .1, 1.1]} /></mesh>
    <mesh position={[L / 2 - .02, H * .27, 0]} material={m.plate}><boxGeometry args={[.012, .13, .3]} /></mesh>
    <mesh position={[-L / 2 + .01, H * .38, 0]} material={m.plate}><boxGeometry args={[.012, .13, .3]} /></mesh>
    {/* the DrivingKlass roof magnet */}
    <mesh position={[(.44 - .5) * L, H + .06, 0]} material={m.mag}><boxGeometry args={[1.0, .085, .34]} /></mesh>
  </group>;
}
