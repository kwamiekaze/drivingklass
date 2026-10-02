import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, rng } from './theme';
import { SIGN_FONT, goldGradient, makeCanvasTexture, starShape } from './parts';

/*
 * Every dimension below is meters in mansion space: x across, y up, z toward the viewer.
 * Main block  x ±9.5, z ±3, walls to y 7.2, cornice 7.2 to 7.6, terrace at 7.6.
 * Wings       centred x ±15, walls to y 5.6, cornice 5.6 to 5.95, terrace at 5.95.
 * Balustrades sit ON the terrace, 0.3 m inside the cornice edge. Roofs start 0.5 m inside the
 * balustrade, so nothing ever crosses.
 */
const MAIN = { w: 19, d: 6, h: 7.2, corniceH: .4 };
const WING = { w: 11, d: 5, h: 5.6, cx: 15, cz: -.3, corniceH: .35 };
const PED_H = 1.7;

function limestone() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!; const r = rng(41);
  g.fillStyle = '#eadfce'; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
    const x = col * 128 + (row % 2) * 64, y = row * 64; const v = (r() - .5) * 16;
    g.fillStyle = `rgb(${234 + v},${223 + v},${206 + v})`; g.fillRect(x + 1.5, y + 1.5, 125, 61);
  }
  g.strokeStyle = 'rgba(150,132,110,.55)'; g.lineWidth = 3;
  for (let row = 0; row <= 8; row++) { g.beginPath(); g.moveTo(0, row * 64); g.lineTo(512, row * 64); g.stroke(); }
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) { const x = col * 128 + (row % 2) * 64; g.beginPath(); g.moveTo(x, row * 64); g.lineTo(x, row * 64 + 64); g.stroke(); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > .5 ? '120,100,80' : '255,250,240'},.09)`; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/** Hip roof over a w by d rectangle: four planes, a ridge, no overhang tricks. */
function hipRoof(w: number, d: number, h: number) {
  const hw = w / 2, hd = d / 2, rr = (w - d) / 2;
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd], E = [-rr, h, 0], F = [rr, h, 0];
  const tris = [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

type Mat = THREE.Material;
function Slab({ p, s, m }: { p: [number, number, number]; s: [number, number, number]; m: Mat }) {
  return <mesh position={p} material={m} castShadow receiveShadow><boxGeometry args={s} /></mesh>;
}

function WindowUnit({ x, y, z, w, h, glass, trim }: { x: number; y: number; z: number; w: number; h: number; glass: Mat; trim: Mat }) {
  return <group position={[x, y, z]}>
    <mesh position={[0, 0, .02]} material={glass}><boxGeometry args={[w, h, .05]} /></mesh>
    <mesh position={[0, 0, .06]} material={trim}><boxGeometry args={[.06, h, .04]} /></mesh>
    <mesh position={[0, h * .12, .06]} material={trim}><boxGeometry args={[w, .06, .04]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 + .09), 0, .05]} material={trim}><boxGeometry args={[.18, h + .3, .1]} /></mesh>)}
    <mesh position={[0, h / 2 + .19, .06]} material={trim}><boxGeometry args={[w + .6, .2, .14]} /></mesh>
    <mesh position={[0, -h / 2 - .08, .09]} material={trim}><boxGeometry args={[w + .5, .12, .22]} /></mesh>
  </group>;
}

/** Balustrade run: two rails and instanced posts. axis 'x' runs along x at fixed z, 'z' the reverse. */
type Run = { axis: 'x' | 'z'; at: number; from: number; to: number; y: number };
function Balustrades({ runs, trim }: { runs: Run[]; trim: Mat }) {
  const posts = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => { const out: [number, number, number][] = []; runs.forEach(r => { for (let t = r.from + .3; t <= r.to - .29; t += .55) out.push(r.axis === 'x' ? [t, r.y + .4, r.at] : [r.at, r.y + .4, t]); }); return out; }, [runs]);
  useLayoutEffect(() => { const m = posts.current; if (!m) return; const d = new THREE.Object3D(); list.forEach((p, i) => { d.position.set(...p); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.instanceMatrix.needsUpdate = true; }, [list]);
  return <group>
    <instancedMesh ref={posts} args={[undefined, undefined, list.length]} material={trim} castShadow><cylinderGeometry args={[.085, .1, .74, 8]} /></instancedMesh>
    {runs.map((r, i) => { const len = r.to - r.from, mid = (r.from + r.to) / 2; const s: [number, number, number] = r.axis === 'x' ? [len, .1, .24] : [.24, .1, len]; const at = (y: number): [number, number, number] => r.axis === 'x' ? [mid, y, r.at] : [r.at, y, mid];
      return <group key={i}><mesh position={at(r.y + .05)} material={trim}><boxGeometry args={s} /></mesh><mesh position={at(r.y + .82)} material={trim} castShadow><boxGeometry args={[s[0], .14, s[2]]} /></mesh></group>; })}
    {runs.flatMap((r, i) => [r.from, r.to].map((t, k) => <mesh key={`${i}${k}`} position={r.axis === 'x' ? [t + (k ? -.12 : .12), r.y + .48, r.at] : [r.at, r.y + .48, t + (k ? -.12 : .12)]} material={trim}><boxGeometry args={[.3, .96, .3]} /></mesh>))}
  </group>;
}

function Column({ x, z, shaft, base, trim, gold }: { x: number; z: number; shaft: Mat; base: number; trim: Mat; gold: Mat }) {
  return <group position={[x, 0, z]}>
    <mesh position={[0, base + .15, 0]} material={trim}><boxGeometry args={[1.0, .3, 1.0]} /></mesh>
    <mesh position={[0, base + 1.85, 0]} material={shaft} castShadow><cylinderGeometry args={[.36, .43, 3.4, 22]} /></mesh>
    <mesh position={[0, base + 3.7, 0]} material={gold}><cylinderGeometry args={[.42, .38, .1, 22]} /></mesh>
    <mesh position={[0, base + 3.9, 0]} material={trim}><boxGeometry args={[1.0, .3, 1.0]} /></mesh>
  </group>;
}

/** Clock dial: ivory enamel, minute track, Roman numerals and a gold chapter ring. */
function clockFace() {
  const S = 1024, C = S / 2, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!;
  const bg = g.createRadialGradient(C * .9, C * .85, C * .1, C, C, C);
  bg.addColorStop(0, '#fffdf8'); bg.addColorStop(.8, '#f7efe2'); bg.addColorStop(1, '#eadcc6');
  g.fillStyle = bg; g.beginPath(); g.arc(C, C, C, 0, Math.PI * 2); g.fill();
  const ring = (r: number, w: number, col: string) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke(); };
  ring(C * .965, C * .03, '#b8924a'); ring(C * .86, 3, '#3a2e2a'); ring(C * .79, 3, '#3a2e2a');
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    g.save(); g.translate(C, C); g.rotate(a); g.fillStyle = '#2a211f';
    if (big) g.fillRect(-C * .012, -C * .86, C * .024, C * .07); else g.fillRect(-C * .005, -C * .86, C * .01, C * .045);
    g.restore();
  }
  const numerals = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  g.fillStyle = '#2a211f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  numerals.forEach((n, i) => {
    const a = (i / 12) * Math.PI * 2;
    g.save(); g.translate(C + Math.sin(a) * C * .64, C - Math.cos(a) * C * .64); g.rotate(a);
    g.font = `600 ${C * (n.length > 3 ? .15 : .17)}px "Cormorant Garamond", "Times New Roman", Georgia, serif`;
    g.fillText(n, 0, 0); g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** Hand geometry with its pivot at the dial centre, pointing up (12 o'clock). */
function handGeo(len: number, w: number, tail: number, tip = .6) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, -tail); sh.lineTo(w / 2, -tail); sh.lineTo(w / 2, len * tip); sh.lineTo(0, len); sh.lineTo(-w / 2, len * tip); sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: false });
}

/** Working clock in the pediment: reads the visitor's local time, sweeping second hand. */
function PedimentClock({ position, r, gold, trim, mix }: { position: [number, number, number]; r: number; gold: Mat; trim: Mat; mix: { current: number } }) {
  const face = useMemo(clockFace, []);
  const dial = useMemo(() => new THREE.MeshStandardMaterial({ map: face, emissive: '#fff1d6', emissiveMap: face, emissiveIntensity: .05, roughness: .35 }), [face]);
  const ink = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f1816', roughness: .35, metalness: .4 }), []);
  const geos = useMemo(() => ({ hour: handGeo(r * .52, r * .075, r * .12, .7), minute: handGeo(r * .8, r * .05, r * .14, .75), second: handGeo(r * .86, r * .014, r * .22, .98) }), [r]);
  const hour = useRef<THREE.Group>(null), minute = useRef<THREE.Group>(null), second = useRef<THREE.Group>(null);
  useFrame(() => {
    const d = new Date();
    const sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
    if (second.current) second.current.rotation.z = -(sec / 60) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(min / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(hr / 12) * Math.PI * 2;
    dial.emissiveIntensity = .05 + .9 * mix.current;
  });
  return <group position={position}>
    <mesh rotation-x={Math.PI / 2} position-z={.012} material={trim}><cylinderGeometry args={[r * 1.18, r * 1.18, .02, 64]} /></mesh>
    <mesh position-z={.024} material={dial}><circleGeometry args={[r, 72]} /></mesh>
    <mesh position-z={.03} material={gold}><torusGeometry args={[r * 1.04, r * .06, 12, 72]} /></mesh>
    <mesh position-z={.03} material={gold}><torusGeometry args={[r * 1.14, r * .025, 8, 72]} /></mesh>
    <group ref={hour} position-z={.036}><mesh geometry={geos.hour} material={ink} /></group>
    <group ref={minute} position-z={.05}><mesh geometry={geos.minute} material={ink} /></group>
    <group ref={second} position-z={.064}><mesh geometry={geos.second} material={ink} /><mesh position-y={-r * .16} material={gold}><circleGeometry args={[r * .045, 20]} /></mesh></group>
    <mesh position-z={.078} rotation-x={Math.PI / 2} material={gold}><cylinderGeometry args={[r * .05, r * .05, .012, 20]} /></mesh>
  </group>;
}

function Urn({ x, z, gold, stone }: { x: number; z: number; gold: Mat; stone: Mat }) {
  return <group position={[x, 0, z]}>
    <mesh position={[0, .35, 0]} material={stone}><boxGeometry args={[.8, .7, .8]} /></mesh>
    <mesh position={[0, .78, 0]} material={gold}><cylinderGeometry args={[.42, .42, .06, 16]} /></mesh>
    <mesh position={[0, 1.55, 0]}><coneGeometry args={[.55, 1.4, 12]} /><meshStandardMaterial color="#456f48" roughness={.95} flatShading /></mesh>
    <mesh position={[0, 1.0, 0]}><sphereGeometry args={[.42, 12, 10]} /><meshStandardMaterial color="#4f7b52" roughness={.95} flatShading /></mesh>
  </group>;
}


function signTexture() {
  const W = 2048, H = 368;
  return makeCanvasTexture(W, H, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1c22'); bg.addColorStop(.5, '#0c0d11'); bg.addColorStop(1, '#16171c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d9a93a'; g.lineWidth = 7; g.strokeRect(20, 20, W - 40, H - 40);
    g.strokeStyle = 'rgba(242,193,78,.55)'; g.lineWidth = 2.5; g.strokeRect(38, 38, W - 76, H - 76);
    for (let i = 0; i < 5; i++) {                                              // five gold stars
      const cx = W / 2 + (i - 2) * 150, cy = 100, R = 56, r = R * .42; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r : R; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
      g.closePath(); g.fillStyle = goldGradient(g, cy - R, cy + R); g.fill();
    }
    g.font = `700 150px ${SIGN_FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const text = 'DRIVINGKLASS', sp = 30, ws = [...text].map(c => g.measureText(c).width), total = ws.reduce((a, b) => a + b, 0) + sp * (text.length - 1);
    let x = (W - total) / 2; g.fillStyle = goldGradient(g, 175, 330); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    [...text].forEach((c, i) => { g.fillText(c, x, 252); x += ws[i]! + sp; });
  }, 8);
}

/** A thick, bevelled five point star: solid from every angle, satin gold, so it never glints or thins out edge on. */
function CrownStar({ x, y, z, r, mat }: { x: number; y: number; z: number; r: number; mat: THREE.Material }) {
  const geo = useMemo(() => { const g = new THREE.ExtrudeGeometry(starShape(r, r * .46), { depth: r * .34, bevelEnabled: true, bevelThickness: r * .12, bevelSize: r * .06, bevelSegments: 2 }); g.translate(0, 0, -r * .17); g.computeVertexNormals(); return g; }, [r]);
  return <mesh geometry={geo} material={mat} position={[x, y, z]} castShadow />;
}

function doorSignTexture(open: boolean) {
  return makeCanvasTexture(512, 256, (g, w, h) => {
    const rr = (x: number, y: number, ww: number, hh: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
    g.clearRect(0, 0, w, h); g.fillStyle = '#16181d'; rr(6, 6, w - 12, h - 12, 28); g.fill();
    g.strokeStyle = 'rgba(244,239,228,.6)'; g.lineWidth = 4; rr(6, 6, w - 12, h - 12, 28); g.stroke();
    const c = open ? '#6fdc9a' : '#ee7b72', word = open ? 'OPEN' : 'CLOSED'; let size = 124; g.font = `700 ${size}px ${SIGN_FONT}`;
    while (g.measureText(word).width > w - 90 && size > 40) { size -= 4; g.font = `700 ${size}px ${SIGN_FONT}`; }
    g.fillStyle = c; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2 - 14);
    g.fillStyle = '#f4efe4'; g.font = `600 30px ${SIGN_FONT}`; g.fillText('9AM \u2013 6PM', w / 2, h - 52);
  }, 8);
}

export function HQ({ position, lite, open }: { position: [number, number, number]; lite: boolean; open: boolean }) {
  const mobile = lite;
  const mix = useContext(NightCtx);
  const base = useMemo(limestone, []);
  const mats = useMemo(() => {
    const mk = (rx: number, ry: number) => { const t = base.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: .6, roughness: .85, color: '#f3e9db' }); };
    return { main: mk(4.75, 1.8), wing: mk(2.9, 1.4), col: mk(1, 1.6), trim: new THREE.MeshStandardMaterial({ color: '#f7f0e6', roughness: .55 }), roof: new THREE.MeshStandardMaterial({ color: '#59566a', roughness: .5, metalness: .2, side: THREE.DoubleSide, flatShading: true }) };
  }, [base]);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffe3b4', emissive: '#ffb45e', emissiveIntensity: .2, roughness: .12, metalness: .2 }), []);
  const door = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3d2a2c', roughness: .4, metalness: .1 }), []);
  const goldM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfc7b8', roughness: .5, metalness: .35 }), []);
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffbf70', emissiveIntensity: 1 }), []);
  const crown = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e0a21a', emissive: '#ff9d00', emissiveIntensity: .3, roughness: .45, metalness: .25 }), []);
  const bezel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9971f', roughness: .5, metalness: .3 }), []);
  useFrame(() => { const m = mix.current; glass.emissiveIntensity = .12 + .8 * m; lamp.emissiveIntensity = .9 + 1.1 * m; board.emissiveIntensity = .14 + .85 * m; crown.emissiveIntensity = .3 + 1.5 * m; });

  const mainRoof = useMemo(() => hipRoof(17.4, 4.4, 2.5), []);
  const wingRoof = useMemo(() => hipRoof(9.4, 3.2, 1.7), []);
  // Pediment raised from 1.3 m to 1.7 m so the clock reads clearly from the plaza.
  const pediment = useMemo(() => { const sh = new THREE.Shape(); sh.moveTo(-5, 0); sh.lineTo(5, 0); sh.lineTo(0, PED_H); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 2.5, bevelEnabled: false }); g.translate(0, 0, -1.25); return g; }, []);

  const mainTop = MAIN.h + MAIN.corniceH;      // 7.6
  const wingTop = WING.h + WING.corniceH;      // 5.95
  const runs = useMemo<Run[]>(() => {
    const mw = MAIN.w / 2 + .4 - .3, md = MAIN.d / 2 + .4 - .3; // cornice overhangs 0.4, balustrade sits 0.3 inside it
    const out: Run[] = [
      { axis: 'x', at: -md, from: -mw, to: mw, y: mainTop },
      { axis: 'z', at: -mw, from: -md, to: md, y: mainTop }, { axis: 'z', at: mw, from: -md, to: md, y: mainTop },
    ];
    [-1, 1].forEach(s => {
      const cx = s * WING.cx, hw = WING.w / 2 + .3 - .3, hd = WING.d / 2 + .3 - .3;
      const inner = cx - s * hw, outer = cx + s * hw; // inner edge touches the main wall
      const a = Math.min(inner, outer), b = Math.max(inner, outer);
      const fromX = s > 0 ? a + .2 : a, toX = s > 0 ? b : b - .2;
      out.push({ axis: 'x', at: WING.cz + hd, from: fromX, to: toX, y: wingTop }, { axis: 'x', at: WING.cz - hd, from: fromX, to: toX, y: wingTop }, { axis: 'z', at: outer, from: WING.cz - hd, to: WING.cz + hd, y: wingTop });
    });
    return out;
  }, [mainTop, wingTop]);

  const signTex = useMemo(() => signTexture(), []);
  const board = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: '#ffffff', emissiveIntensity: .12, roughness: .6, metalness: .05 }), [signTex]);
  const doorSigns = useMemo(() => ({ open: doorSignTexture(true), closed: doorSignTexture(false) }), []);
  const wingWinX = mobile ? [-2.6, 2.6] : [-3.4, 0, 3.4];
  return <group position={position}>
    {/* main block */}
    <Slab p={[0, .35, 0]} s={[MAIN.w + .4, .7, MAIN.d + .4]} m={mats.trim} />
    <Slab p={[0, MAIN.h / 2, 0]} s={[MAIN.w, MAIN.h, MAIN.d]} m={mats.main} />
    <Slab p={[0, MAIN.h + MAIN.corniceH / 2, 0]} s={[MAIN.w + .8, MAIN.corniceH, MAIN.d + .8]} m={mats.trim} />
    <Slab p={[0, MAIN.h - .25, MAIN.d / 2 + .06]} s={[MAIN.w + .2, .12, .14]} m={mats.trim} />
    <mesh geometry={mainRoof} material={mats.roof} position={[0, mainTop, 0]} castShadow />
    {[-5.2, 5.2].map(x => <Slab key={x} p={[x, mainTop + 1.5, 0]} s={[1, 2.9, 1]} m={mats.main} />)}
    {[-5.2, 5.2].map(x => <Slab key={`c${x}`} p={[x, mainTop + 3.02, 0]} s={[1.2, .14, 1.2]} m={mats.trim} />)}
    {/* wings */}
    {[-1, 1].map(s => <group key={s}>
      <Slab p={[s * WING.cx, .3, WING.cz]} s={[WING.w + .4, .6, WING.d + .4]} m={mats.trim} />
      <Slab p={[s * WING.cx, WING.h / 2, WING.cz]} s={[WING.w, WING.h, WING.d]} m={mats.wing} />
      <Slab p={[s * WING.cx, WING.h + WING.corniceH / 2, WING.cz]} s={[WING.w + .6, WING.corniceH, WING.d + .6]} m={mats.trim} />
      <mesh geometry={wingRoof} material={mats.roof} position={[s * WING.cx, wingTop, WING.cz]} castShadow />
      <Slab p={[s * (WING.cx + 3.2), wingTop + 1.1, WING.cz]} s={[.9, 2.2, .9]} m={mats.wing} />
      <Slab p={[s * (WING.cx + 3.2), wingTop + 2.24, WING.cz]} s={[1.1, .12, 1.1]} m={mats.trim} />
      {wingWinX.map(dx => <group key={dx}>
        <WindowUnit x={s * WING.cx + dx} y={2.5} z={WING.cz + WING.d / 2 + .01} w={1.2} h={2.2} glass={glass} trim={mats.trim} />
        <WindowUnit x={s * WING.cx + dx} y={4.55} z={WING.cz + WING.d / 2 + .01} w={1.2} h={1.25} glass={glass} trim={mats.trim} />
      </group>)}
    </group>)}
    <Balustrades runs={runs} trim={mats.trim} />
    {/* portico: platform, steps, columns, entablature, pediment, all below the main cornice */}
    <Slab p={[0, .45, MAIN.d / 2 + 1.2]} s={[9.6, .9, 2.4]} m={mats.trim} />
    <Slab p={[0, .3, MAIN.d / 2 + 2.6]} s={[10.2, .6, .5]} m={mats.trim} />
    <Slab p={[0, .15, MAIN.d / 2 + 3.05]} s={[10.8, .3, .5]} m={mats.trim} />
    {[-4.2, -1.4, 1.4, 4.2].map(x => <Column key={x} x={x} z={MAIN.d / 2 + 2.0} shaft={mats.col} base={.9} trim={mats.trim} gold={goldM} />)}
    <Slab p={[0, 5.15, MAIN.d / 2 + 1.25]} s={[10.2, .5, 2.6]} m={mats.trim} />
    <mesh geometry={pediment} material={mats.trim} position={[0, 5.4, MAIN.d / 2 + 1.25]} castShadow />
    <PedimentClock position={[0, 5.4 + .68, MAIN.d / 2 + 2.5]} r={.5} gold={goldM} trim={mats.trim} mix={mix} />
    <Urn x={-5.6} z={MAIN.d / 2 + 2.8} gold={goldM} stone={mats.trim} /><Urn x={5.6} z={MAIN.d / 2 + 2.8} gold={goldM} stone={mats.trim} />
    {/* grand door on the platform */}
    <mesh position={[0, .9 + 1.65, MAIN.d / 2 + .05]} material={door}><boxGeometry args={[2.5, 3.3, .1]} /></mesh>
    <mesh position={[0, 4.2 + .35 + .004, MAIN.d / 2 + .058]} material={glass}><boxGeometry args={[2.5, .7 - .008, .1]} /></mesh>
    <mesh position={[0, 4.2, MAIN.d / 2 + .1]} material={goldM}><boxGeometry args={[2.6, .05, .1]} /></mesh>
    <mesh position={[0, .9 + 1.65, MAIN.d / 2 + .13]} material={goldM}><boxGeometry args={[.05, 3.28, .03]} /></mesh>
    {[-.28, .28].map(x => <mesh key={x} position={[x, .9 + 1.6, MAIN.d / 2 + .16]} material={goldM}><sphereGeometry args={[.07, 10, 8]} /></mesh>)}
    {[-2.6, 2.6].map(x => <mesh key={x} position={[x, 3.4, MAIN.d / 2 + .16]} material={lamp}><boxGeometry args={[.2, .5, .2]} /></mesh>)}
    {/* windows either side of the portico, two floors */}
    {[-6.5, -8.3, 6.5, 8.3].map(x => <group key={x}>
      <WindowUnit x={x} y={3.5} z={MAIN.d / 2 + .01} w={1.15} h={2.5} glass={glass} trim={mats.trim} />
      <WindowUnit x={x} y={5.95} z={MAIN.d / 2 + .01} w={1.15} h={1.4} glass={glass} trim={mats.trim} />
    </group>)}
    {/* DRIVINGKLASS and five stars, standing on the main cornice */}
    <mesh position={[0, mainTop + 1.4, 2.8]} material={board} castShadow><boxGeometry args={[15.6, 2.8, .4]} /></mesh>
    <mesh position={[0, mainTop + 1.4, 3.005]} material={board}><planeGeometry args={[15.2, 2.72]} /></mesh>
    {/* gold bezel: four bars proud of the board face, then five gold stars standing on the sign */}
    <mesh position={[0, mainTop + 2.86, 3.02]} material={bezel}><boxGeometry args={[15.9, .22, .3]} /></mesh>
    <mesh position={[0, mainTop - .06, 3.02]} material={bezel}><boxGeometry args={[15.9, .22, .3]} /></mesh>
    {[-7.9, 7.9].map(x => <mesh key={x} position={[x, mainTop + 1.4, 3.02]} material={bezel}><boxGeometry args={[.22, 3.0, .3]} /></mesh>)}
    {[[-6.2, .5], [-3.1, .72], [0, 1.15], [3.1, .72], [6.2, .5]].map(([x, r]) => <CrownStar key={x} x={x!} y={mainTop + 2.97 + r! * .95} z={2.95} r={r!} mat={crown} />)}
    {/* OPEN 9am to 6pm Georgia time, otherwise CLOSED. Matte, steady, never tied to the day/night toggle. */}
    <mesh position={[0, 3.05, MAIN.d / 2 + .2]}><planeGeometry args={[1.5, .75]} /><meshBasicMaterial map={open ? doorSigns.open : doorSigns.closed} transparent /></mesh>
  </group>;
}
