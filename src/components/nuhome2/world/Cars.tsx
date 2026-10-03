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

/* ---- the body: a smooth sedan, lofted from spline profiles, not a box ---- */
const BODY_W = .965;     // the flank sits just inside the widest line, so the wheels read as fully round and fully outside

/** Smooth 1D curve through (t, value) points: Catmull-Rom, clamped at the ends. */
function curve(pts: [number, number][]) {
  return (t: number) => {
    const n = pts.length; if (t <= pts[0]![0]) return pts[0]![1]; if (t >= pts[n - 1]![0]) return pts[n - 1]![1];
    let i = 0; while (i < n - 2 && t > pts[i + 1]![0]) i++;
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(n - 1, i + 2)]!;
    const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
    const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * (p2[0] - p1[0]), m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * (p2[0] - p1[0]);
    return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
  };
}
// t runs from the tail (0) to the nose (1). Heights are fractions of H, widths fractions of half the car width.
const TOP = curve([[0, .5], [.015, .55], [.05, .6], [.1, .625], [.17, .635], [.26, .645], [.36, .655], [.5, .66], [.6, .65], [.66, .64], [.72, .625], [.82, .6], [.91, .57], [.965, .53], [1, .48]]);
const BOT = curve([[0, .2], [.03, .15], [.1, .125], [.2, .115], [.5, .11], [.8, .115], [.92, .125], [.975, .16], [1, .19]]);
const WID = curve([[0, .78], [.012, .85], [.05, .93], [.12, .98], [.2, 1], [.8, 1], [.9, .98], [.96, .94], [1, .84]]);
const SHO = curve([[0, .25], [.2, .17], [.5, .12], [.75, .17], [1, .25]]);          // shoulder radius in metres
const ROOF = curve([[.17, .64], [.2, .69], [.25, .8], [.31, .91], [.37, .98], [.43, 1], [.5, .995], [.55, .955], [.6, .86], [.65, .74], [.675, .655]]);
const CAB0 = .17, CAB1 = .675;

/** Every triangle is tested on its own so it always faces outward and the inside of the car can never show. */
function loft(rings: THREE.Vector3[][]) {
  const m = rings[0]!.length, pos: number[] = [], idx: number[] = [];
  rings.forEach(r => r.forEach(p => pos.push(p.x, p.y, p.z)));
  const P = (i: number) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const center = (ri: number) => { const c = new THREE.Vector3(); rings[ri]!.forEach(p => c.add(p)); return c.multiplyScalar(1 / m); };
  const tri = (a: number, b: number, c: number, out: THREE.Vector3) => {
    const pa = P(a), n = P(b).sub(pa).cross(P(c).sub(pa));
    if (n.dot(out) < 0) idx.push(a, c, b); else idx.push(a, b, c);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const mid = center(i).add(center(i + 1)).multiplyScalar(.5);
    for (let k = 0; k < m; k++) {
      const a = i * m + k, b = i * m + (k + 1) % m, c = (i + 1) * m + k, d = (i + 1) * m + (k + 1) % m;
      tri(a, c, b, P(a).add(P(c)).add(P(b)).multiplyScalar(1 / 3).sub(mid));
      tri(b, c, d, P(b).add(P(c)).add(P(d)).multiplyScalar(1 / 3).sub(mid));
    }
  }
  const cap = (ri: number, nb: number) => {
    const c = center(ri), ci = pos.length / 3, out = c.clone().sub(center(nb)); pos.push(c.x, c.y, c.z);
    for (let k = 0; k < m; k++) tri(ci, ri * m + k, ri * m + (k + 1) % m, out);
  };
  cap(0, 1); cap(rings.length - 1, rings.length - 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Where the flat flank sits at t: the details (door lines, handles) are placed on this. */
export const flankAt = (s: CarSpec, t: number) => (s.W / 2) * BODY_W * WID(t);
/** The top of the flat flank at t: above it the surface rolls over the shoulder. */
export const flankTop = (s: CarSpec, t: number) => s.H * TOP(t) * (s.trunk && t < .3 ? s.trunk : 1) - .05 - SHO(t);

function buildGeos(s: CarSpec) {
  const { L, W, H } = s, hw = W / 2, tr = s.trunk ?? 1, hd = s.hood ?? 1, rb = s.roofBack ?? 1;
  const N = 72, R1 = .07, CROWN = .05;
  const T = (i: number) => .5 - .5 * Math.cos((Math.PI * i) / (N - 1));         // stations cluster at the nose and tail, where the shape turns
  const bodyRings: THREE.Vector3[][] = [];
  for (let i = 0; i < N; i++) {
    const t = T(i), x = (t - .5) * L;
    const bot = BOT(t) * H, top = TOP(t) * (t < .3 ? tr : t > .7 ? hd : 1) * H, w = hw * BODY_W * WID(t), rs = SHO(t);
    const half: [number, number][] = [[0, bot], [w * .82, bot]];
    for (const a of [-60, -30]) { const r = a * Math.PI / 180; half.push([w - R1 + R1 * Math.cos(r), bot + R1 + R1 * Math.sin(r)]); }
    const ys = top - CROWN - rs;
    half.push([w, bot + R1], [w, bot + R1 + (ys - bot - R1) * .5], [w, ys]);
    for (const a of [22.5, 45, 67.5, 90]) { const r = a * Math.PI / 180; half.push([w - rs + rs * Math.cos(r), ys + rs * Math.sin(r)]); }
    const zt = w - rs;
    for (let k = 1; k <= 4; k++) { const z = zt * (1 - k / 4); half.push([z, top - CROWN * (z / zt) * (z / zt)]); }
    const ring: THREE.Vector3[] = half.map(([z, y]) => new THREE.Vector3(x, y, z));
    for (let k = half.length - 2; k >= 1; k--) ring.push(new THREE.Vector3(x, half[k]![1], -half[k]![0]));
    bodyRings.push(ring);
  }
  // greenhouse: dark glass dome with a little tumblehome, standing on the belt line
  const belt = TOP(.5) * H, J = 14, CN = 40;
  const cabinRings: THREE.Vector3[][] = [], arcs: { x: number; pts: THREE.Vector3[] }[] = [];
  for (let i = 0; i < CN; i++) {
    const t = CAB0 + (CAB1 - CAB0) * (.5 - .5 * Math.cos((Math.PI * i) / (CN - 1))), x = (t - .5) * L;
    const yt = Math.max(belt + .004, ROOF(t) * H + (t < .4 ? (rb - 1) * .02 * H : 0)), hb = Math.min(hw * .78, hw * BODY_W * WID(t) - SHO(t) - .02), d = .07 * H;
    const arc: THREE.Vector3[] = [];
    for (let j = 0; j <= J; j++) {
      const ph = (j / J) * (Math.PI / 2), sn = Math.sin(ph), cs = Math.cos(ph);
      arc.push(new THREE.Vector3(x, belt + (yt - belt) * Math.pow(sn, .8), -hb * Math.pow(cs, .85) * (1 - .24 * sn)));
    }
    const ring = [new THREE.Vector3(x, belt - d, -hb), ...arc];
    for (let j = J - 1; j >= 0; j--) ring.push(new THREE.Vector3(x, arc[j]!.y, -arc[j]!.z));
    ring.push(new THREE.Vector3(x, belt - d, hb));
    cabinRings.push(ring); arcs.push({ x, pts: arc });
  }
  // the painted roof panel: the top of the greenhouse between the headers, lifted 4 mm
  const roofSt = arcs.filter((_, i) => { const t = CAB0 + (CAB1 - CAB0) * (.5 - .5 * Math.cos((Math.PI * i) / (CN - 1))); return t > .345 && t < .565; });
  const jr0 = Math.round(J * .55), roofPos: number[] = [], roofIdx: number[] = [], cols = (J - jr0) * 2 + 1;
  roofSt.forEach(({ x, pts }) => { for (let j = jr0; j <= J; j++) roofPos.push(x, pts[j]!.y + .004, pts[j]!.z); for (let j = J - 1; j >= jr0; j--) roofPos.push(x, pts[j]!.y + .004, -pts[j]!.z); });
  for (let i = 0; i < roofSt.length - 1; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c; roofIdx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1); }
  const roof = new THREE.BufferGeometry(); roof.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3)); roof.setIndex(roofIdx); roof.computeVertexNormals();
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
    tire: new THREE.MeshStandardMaterial({ color: '#0f1012', roughness: .94, side: THREE.DoubleSide }),
    rim: new THREE.MeshStandardMaterial({ map: rimTexture(), metalness: .8, roughness: .28 }),
    arch: new THREE.MeshBasicMaterial({ color: '#040405', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#1d2a38', roughness: .05, metalness: .45, clearcoat: 1, envMapIntensity: 2.6, side: THREE.DoubleSide }),
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

const tireGeo = new THREE.LatheGeometry([[.66, -.5], [.8, -.5], [.93, -.47], [1, -.38], [1, .38], [.93, .47], [.8, .5], [.66, .5], [.66, -.5]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
const rimGeo = new THREE.CircleGeometry(1, 32);
const discGeo = new THREE.CylinderGeometry(1, 1, 1, 24);

export function Car({ spec, position, rotationY = 0 }: { spec: CarSpec; position: [number, number, number]; rotationY?: number }) {
  const geos = useMemo(() => buildGeos(spec), [spec]);
  const m = getShared();
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: spec.color, metalness: .5, roughness: .26, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5, side: THREE.DoubleSide }), [spec.color]);
  const roofMat = useMemo(() => { const r = paint.clone(); r.side = THREE.DoubleSide; return r; }, [paint]);
  const plate = useMemo(() => new THREE.MeshStandardMaterial({ map: plateTexture(`DK${spec.year % 100}${spec.id.slice(0, 2).toUpperCase()}`), roughness: .45 }), [spec]);
  const { L, W, H, WB, fo, tire } = spec, hw = W / 2, fz = hw * BODY_W + .002, ax = L / 2 - fo, rx = ax - WB, belt = .69 * H;
  const wheelZ = hw - .105, archRel = (hw * BODY_W * 1.016 + .004) - wheelZ;
  const arch = useMemo(() => { const rw = tire * 1.22, a0 = Math.asin(Math.max(-1, Math.min(1, (.175 * H - tire) / rw))), sh = new THREE.Shape(); sh.absarc(0, 0, rw, a0, Math.PI - a0, false); sh.closePath(); return new THREE.ShapeGeometry(sh, 28); }, [tire, H]);
  const wheels = [[ax, 1], [ax, -1], [rx, 1], [rx, -1]] as const;
  const doorLo = .25 * H, doorH = flankTop(spec, .45) - doorLo - .01;
  return <group position={position} rotation-y={rotationY}>
    <mesh position={[0, .06, 0]} rotation-x={-Math.PI / 2} material={m.shadow} scale={[L * 1.28, W * 1.5, 1]} renderOrder={2}><planeGeometry args={[1, 1]} /></mesh>
    <mesh geometry={geos.body} material={paint} castShadow receiveShadow />
    {/* a solid core inside the shell: even if a panel were ever missing you would see paint, never the far wheel */}
    <mesh position={[0, H * .42, 0]} material={paint}><boxGeometry args={[L * .94, H * .5, W * .86]} /></mesh>
    <mesh geometry={geos.cabin} material={m.glass} castShadow />
    <mesh geometry={geos.roof} material={roofMat} />
    {/* wheels: wheel well, tire with rounded shoulders, barrel, rim, brake disc and caliper. Centre height = tire radius, so every tire touches the ground. */}
    {wheels.map(([x, s], i) => <group key={i} position={[x, tire, s * wheelZ]}>
      <mesh position={[0, 0, s * archRel]} rotation-y={s > 0 ? 0 : Math.PI} geometry={arch} material={m.arch} />
      <mesh rotation-x={Math.PI / 2} geometry={tireGeo} scale={[tire, .205, tire]} material={m.tire} />
      <mesh rotation-x={Math.PI / 2} scale={[tire * .68, .19, tire * .68]} material={m.dark}><cylinderGeometry args={[1, 1, 1, 24]} /></mesh>
      <mesh position={[0, 0, s * .06]} rotation-x={Math.PI / 2} geometry={discGeo} scale={[tire * .6, .02, tire * .6]} material={m.disc} />
      <mesh position={[tire * .24, tire * .3, s * .075]} material={m.caliper}><boxGeometry args={[.12, .1, .04]} /></mesh>
      <mesh position={[0, 0, s * .1035]} rotation-y={s > 0 ? 0 : Math.PI} geometry={rimGeo} scale={tire * .74} material={m.rim} />
    </group>)}
    {[-1, 1].map(s => <group key={s}>
      {/* lamps: swept ellipsoids sunk into the corners, so they read as moulded lenses, with a thin daytime strip and a red lens at the tail */}
      <mesh position={[L / 2 - .15, H * .44, s * hw * .6]} rotation-y={-s * .42} scale={[.15, .034, .12]} material={m.head}><sphereGeometry args={[1, 20, 12]} /></mesh>
      <mesh position={[L / 2 - .1, H * .475, s * hw * .62]} rotation-y={-s * .42} scale={[.13, .009, .12]} material={m.drl}><sphereGeometry args={[1, 16, 8]} /></mesh>
      <mesh position={[-L / 2 + .06, H * .5, s * hw * .62]} rotation-y={s * .22} scale={[.07, .05, .24]} material={m.tail}><sphereGeometry args={[1, 18, 10]} /></mesh>
      <mesh position={[L / 2 - .05, H * .21, s * hw * .7]} scale={[.05, .04, .12]} material={m.drl}><sphereGeometry args={[1, 12, 8]} /></mesh>
      {/* mirrors */}
      <mesh position={[(.585 - .5) * L + .06, H * .69, s * (fz + .02)]} material={m.dark}><boxGeometry args={[.05, .03, .06]} /></mesh>
      <mesh position={[(.585 - .5) * L + .1, H * .71, s * (fz + .08)]} material={paint} castShadow><boxGeometry args={[.13, .09, .16]} /></mesh>
      {/* doors: shut lines all round, handle pockets and handles, B pillar, window chrome, sill trim */}
      {[.585, .455, .30].map(t => <mesh key={t} position={[(t - .5) * L, doorLo + doorH / 2, s * (fz + .001)]} material={m.dark}><boxGeometry args={[.007, doorH, .004]} /></mesh>)}
      <mesh position={[(.4425 - .5) * L, doorLo, s * (fz + .001)]} material={m.dark}><boxGeometry args={[.285 * L, .006, .004]} /></mesh>
      {[.52, .39].map(t => <group key={t}>
        <mesh position={[(t - .5) * L, H * .56, s * (fz + .004)]} material={m.dark}><boxGeometry args={[.17, .045, .008]} /></mesh>
        <mesh position={[(t - .5) * L, H * .56, s * (fz + .011)]} material={m.chrome}><boxGeometry args={[.13, .022, .02]} /></mesh>
      </group>)}
      <mesh position={[(.42 - .5) * L, belt + .006, s * (.8 * hw + .012)]} material={m.chrome}><boxGeometry args={[L * .42, .016, .012]} /></mesh>
      <mesh position={[(.455 - .5) * L, belt + (H - belt) * .5, s * (.77 * hw)]} material={m.dark}><boxGeometry args={[.07, (H - belt) * .86, .02]} /></mesh>
      <mesh position={[0, H * .17, s * (fz + .003)]} material={m.dark}><boxGeometry args={[L * .5, .05, .014]} /></mesh>
    </group>)}
    <mesh position={[(.215 - .5) * L, H * .7 * (spec.trunk ?? 1) + .005, 0]} material={m.dark}><boxGeometry args={[.006, .004, W * .72]} /></mesh>
    {/* fuel flap */}
    <mesh position={[(.21 - .5) * L, H * .56, fz + .002]} material={m.dark}><boxGeometry args={[.17, .17, .004]} /></mesh>
    {/* wipers and cowl */}
    {[-1, 1].map(s => <mesh key={s} position={[(.6 - .5) * L, belt + .012, s * .34]} rotation-y={s * .12} material={m.dark}><boxGeometry args={[.05, .012, .5]} /></mesh>)}
    {/* grille, intake, plates, exhaust, badge, spoiler lip, shark fin */}
    <mesh position={[L / 2 + .003, H * .37, 0]} rotation-y={Math.PI / 2} material={m.grille}><planeGeometry args={[.78, .13]} /></mesh>
    <mesh position={[L / 2 + .002, H * .245, 0]} rotation-y={Math.PI / 2} material={m.grille}><planeGeometry args={[1.02, .075]} /></mesh>
    <mesh position={[L / 2 + .005, H * .3, 0]} rotation-y={Math.PI / 2} material={plate}><planeGeometry args={[.3, .15]} /></mesh>
    <mesh position={[-L / 2 - .008, H * .36, 0]} rotation-y={-Math.PI / 2} material={plate}><planeGeometry args={[.3, .15]} /></mesh>
    <mesh position={[-L / 2 - .004, H * .5, 0]} material={m.chrome}><boxGeometry args={[.012, .035, .18]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[-L / 2 + .02, H * .16, s * hw * .5]} rotation-z={Math.PI / 2} material={m.chrome}><cylinderGeometry args={[.035, .035, .08, 12]} /></mesh>)}
    <mesh position={[-L / 2 + .13, H * (.7 * (spec.trunk ?? 1)) + .005, 0]} material={paint}><boxGeometry args={[.1, .018, W * .6]} /></mesh>
    <mesh position={[(.34 - .5) * L, H + .02, 0]} material={m.dark}><boxGeometry args={[.13, .04, .035]} /></mesh>
    <Topper position={[(.44 - .5) * L, H + .004, 0]} />
  </group>;
}

/* ---- the roof topper: white shell, yellow face, five glossy gold stars on both sides, black magnet cups ---- */
function drawFacetStar(g: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  const r = R * .46, v: [number, number][] = Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r : R; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
  const mix = (t: number) => { const a = [255, 243, 150], b = [226, 134, 0]; return `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * t)).join(',')})`; };
  v.forEach((p, k) => { const q = v[(k + 1) % 10]!, am = -Math.PI / 2 + ((k + .5) * Math.PI) / 5, light = Math.cos(am + Math.PI * .75); g.beginPath(); g.moveTo(cx, cy); g.lineTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.closePath(); g.fillStyle = mix(.5 - .5 * light); g.fill(); });
  g.beginPath(); v.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.lineJoin = 'round'; g.lineWidth = R * .075; g.strokeStyle = '#8a2a06'; g.stroke();
  g.beginPath(); g.moveTo(cx - R * .08, cy - R * .12); g.lineTo(cx - R * .5, cy - R * .08); g.lineTo(cx - R * .2, cy - R * .5); g.closePath(); g.fillStyle = 'rgba(255,255,255,.4)'; g.fill();
}
function topperTexture() {
  const W = 1400, H = 400;
  return makeCanvasTexture(W, H, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fff400'); bg.addColorStop(.55, '#f6e600'); bg.addColorStop(1, '#e8d000'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const sh = g.createLinearGradient(0, 0, W * .8, H); sh.addColorStop(0, 'rgba(255,255,255,.4)'); sh.addColorStop(.45, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
    [[.135, .92], [.315, .96], [.5, 1.1], [.685, .96], [.865, .92]].forEach(([fx, sc]) => drawFacetStar(g, W * fx!, H * .5, 125 * sc!));
  }, 8, false);
}
const TH = { hl: .475, h: .27, d: .15 };
function topperShape(inset: number) {
  const hl = TH.hl - inset, h = TH.h - inset * 1.4, b = inset * .7, s = new THREE.Shape();
  s.moveTo(-hl + .05, b); s.lineTo(hl - .05, b); s.quadraticCurveTo(hl, b, hl, b + .06); s.lineTo(hl, h - .09); s.quadraticCurveTo(hl, h, hl - .11, h + .012);
  s.quadraticCurveTo(0, h + .05, -hl + .11, h + .012); s.quadraticCurveTo(-hl, h, -hl, h - .09); s.lineTo(-hl, b + .06); s.quadraticCurveTo(-hl, b, -hl + .05, b);
  return s;
}
let topper: { shell: THREE.BufferGeometry; face: THREE.BufferGeometry; shellMat: THREE.Material; faceMat: THREE.Material; cup: THREE.Material; cupTop: THREE.Material } | null = null;
function getTopper() {
  if (topper) return topper;
  const shell = new THREE.ExtrudeGeometry(topperShape(0), { depth: TH.d, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 18 });
  shell.translate(0, 0, -TH.d / 2); shell.rotateY(-Math.PI / 2); shell.computeVertexNormals();
  const face = new THREE.ShapeGeometry(topperShape(.03), 18), pos = face.attributes.position as THREE.BufferAttribute, uv: number[] = [];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < pos.count; i++) { x0 = Math.min(x0, pos.getX(i)); x1 = Math.max(x1, pos.getX(i)); y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); }
  for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) - x0) / (x1 - x0), (pos.getY(i) - y0) / (y1 - y0));
  face.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  topper = {
    shell, face,
    shellMat: new THREE.MeshPhysicalMaterial({ color: '#f8f6ef', roughness: .22, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.2 }),
    faceMat: new THREE.MeshPhysicalMaterial({ map: topperTexture(), roughness: .3, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1 }),
    cup: new THREE.MeshStandardMaterial({ color: '#101012', roughness: .55, metalness: .2 }),
    cupTop: new THREE.MeshStandardMaterial({ color: '#2b2c30', roughness: .5, metalness: .3 }),
  };
  return topper;
}
function Topper({ position }: { position: [number, number, number] }) {
  const t = getTopper(), lift = .055, fx = TH.d / 2 + .012 + .0015;
  return <group position={position}>
    {[[-.045, -.33], [.045, -.33], [-.045, .33], [.045, .33]].map(([x, z], i) => <group key={i} position={[x!, 0, z!]}>
      <mesh position={[0, .012, 0]} material={t.cup}><cylinderGeometry args={[.07, .078, .024, 20]} /></mesh>
      <mesh position={[0, .034, 0]} material={t.cupTop}><cylinderGeometry args={[.045, .06, .02, 20]} /></mesh>
      <mesh position={[0, .048, 0]} material={t.cup}><cylinderGeometry args={[.02, .02, .03, 10]} /></mesh>
    </group>)}
    <group position={[0, lift, 0]}>
      <mesh geometry={t.shell} material={t.shellMat} castShadow />
      <mesh geometry={t.face} material={t.faceMat} position={[fx, 0, 0]} rotation-y={Math.PI / 2} />
      <mesh geometry={t.face} material={t.faceMat} position={[-fx, 0, 0]} rotation-y={-Math.PI / 2} />
    </group>
  </group>;
}
