import { useContext, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, rng } from './theme';
import { Building } from './Building';
import { Fountain } from './Fountain';
import { StarCanopy } from './StarCanopy';
import { CAR_POS, ISLANDS, ISLAND_TREES, Lot } from './Lot';
import { Blooms, Grass, Trees, lawnTexture } from './Grounds';
import type { Quality } from './quality';

function windowsTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, 256, 512);
  const r = rng(5);
  for (let y = 8; y < 512; y += 22) for (let x = 8; x < 256; x += 22) if (r() > .38) { g.fillStyle = r() > .7 ? '#ffd9a0' : r() > .4 ? '#ffb86b' : '#cfe0ff'; g.fillRect(x, y, 12, 14); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function dayTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d')!; const r = rng(8);
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#8fa3c0'); gr.addColorStop(1, '#6e84a6'); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  for (let y = 8; y < 512; y += 22) for (let x = 8; x < 256; x += 22) { g.fillStyle = r() > .5 ? 'rgba(220,232,248,.55)' : 'rgba(40,60,96,.35)'; g.fillRect(x, y, 12, 14); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function asphaltTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; const r = rng(12);
  g.fillStyle = '#7d7d85'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3400; i++) { const v = 96 + r() * 72; g.fillStyle = `rgba(${v},${v},${v + 6},.55)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(190,190,196,${.1 + r() * .15})`; g.fillRect(r() * 256, r() * 256, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
/** The lot, baked once: grain, sealed seams, patched repairs, hairline cracks, oil stains by the stalls and tire wear down the aisles. */
function lotTexture(lite: boolean) {
  const W = lite ? 1024 : 2048, H = lite ? 512 : 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!; const r = rng(31);
  const X = (x: number) => ((x + 34.6) / 69.2) * W, Z = (z: number) => ((z + 14.7) / 29) * H, sx = W / 69.2, sz = H / 29;
  g.fillStyle = '#7b7b83'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (lite ? 20000 : 70000); i++) { const v = 94 + r() * 74; g.fillStyle = `rgba(${v},${v},${v + 6},.5)`; g.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6); }
  // sealed seams every ~11 m
  g.fillStyle = 'rgba(40,40,46,.35)'; for (let x = -33; x < 34; x += 11) g.fillRect(X(x), 0, 2, H); for (const z of [-9, 0, 9]) g.fillRect(0, Z(z), W, 2);
  // repaired patches
  for (let i = 0; i < 9; i++) { const x = r() * W, z = r() * H, w = 30 + r() * 90, h = 20 + r() * 50; g.fillStyle = `rgba(${r() > .5 ? '58,58,64' : '96,96,102'},.35)`; g.fillRect(x, z, w, h); g.strokeStyle = 'rgba(30,30,34,.35)'; g.lineWidth = 1.5; g.strokeRect(x, z, w, h); }
  // tire wear: darker, smoother tracks along the aisle and the entry lanes
  const wear = (x0: number, z0: number, x1: number, z1: number, wd: number) => { g.strokeStyle = 'rgba(52,52,58,.28)'; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); };
  [-2.1, -1.1, 1.1, 2.1].forEach(dz => wear(-33, dz - .25, 33, dz - .25, sz * .45));
  [-2.05, 2.05].forEach(dx => [-.8, .8].forEach(o => wear(dx + o, 14, dx + o, -3, sx * .3)));
  [-31.7, 31.7].forEach(dx => [-1.1, 1.1].forEach(o => wear(dx + o, 14, dx + o, -3, sx * .3)));
  // oil stains where cars sit
  const stain = (x: number, z: number, rad: number) => { const gr = g.createRadialGradient(x, z, 1, x, z, rad); gr.addColorStop(0, 'rgba(20,20,24,.45)'); gr.addColorStop(1, 'rgba(20,20,24,0)'); g.fillStyle = gr; g.fillRect(x - rad, z - rad, rad * 2, rad * 2); };
  for (let i = 0; i < 70; i++) { const row = r() > .5 ? -6 : 5.5, sxp = (Math.floor(r() * 21) - 10) * 2.75; stain(X(sxp + (r() - .5) * 1.2), Z(row + (r() - .5) * 2.4), 5 + r() * 14); }
  // hairline cracks
  g.strokeStyle = 'rgba(24,24,28,.5)'; g.lineWidth = 1;
  for (let i = 0; i < 26; i++) { let x = r() * W, z = r() * H; g.beginPath(); g.moveTo(x, z); for (let k = 0; k < 9; k++) { x += (r() - .5) * 60; z += (r() - .5) * 40; g.lineTo(x, z); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** The lot ends at z 14.3; the road beyond it runs along x until the fog takes it. */
const PLAZA = { x: 69.2, z: 29, cz: -.2 };
const FOUNTAIN = { x: 0, z: 6.6 };
export const FLOOR_Y = .002;
export const HQ_Z = -17.5;
export { CAR_POS };

type TreeSpec = { x: number; z: number; s: number; kind: 'oak' | 'cypress' | 'blossom' };

export function Estate({ quality, open, children }: { quality: Quality; open: boolean; children?: React.ReactNode }) {
  const mix = useContext(NightCtx);
  const { lite } = quality;
  const winTex = useMemo(windowsTexture, []);
  const dayTex = useMemo(dayTexture, []);
  const lawnTex = useMemo(() => { const t = lawnTexture(); t.repeat.set(1 / 8, 1 / 8); return t; }, []);
  const asphalt = useMemo(() => new THREE.MeshStandardMaterial({ map: asphaltTexture(), color: '#ffffff', roughness: .88 }), []);
  const lotMat = useMemo(() => new THREE.MeshStandardMaterial({ map: lotTexture(lite), color: '#ffffff', roughness: .86 }), [lite]);
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4dbe8', map: dayTex, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: .05, roughness: 1 }), [winTex, dayTex]);
  const dayC = useMemo(() => new THREE.Color('#ffffff'), []), nightC = useMemo(() => new THREE.Color('#55556a'), []);
  const dayT = useMemo(() => new THREE.Color('#d4dbe8'), []), nightT = useMemo(() => new THREE.Color('#2a2c55'), []);
  useFrame(() => {
    const m = mix.current;
    towerMat.emissiveIntensity = .04 + .75 * m; towerMat.color.copy(dayT).lerp(nightT, m);
    asphalt.color.copy(dayC).lerp(nightC, m); lotMat.color.copy(asphalt.color);
  });

  const lawnGeo = useMemo(() => {
    const s = new THREE.Shape(); s.absarc(0, 0, 290, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); const x = PLAZA.x / 2, z0 = PLAZA.cz - PLAZA.z / 2, z1 = PLAZA.cz + PLAZA.z / 2;
    hole.moveTo(-x, -z1); hole.lineTo(x, -z1); hole.lineTo(x, -z0); hole.lineTo(-x, -z0); hole.closePath(); s.holes.push(hole);
    return new THREE.ShapeGeometry(s, 64);
  }, []);
  /** Towers sit in the four corners of the scene and behind the building. Nothing stands on or beside the avenue or the street. */
  const skyline = useMemo(() => {
    const r = rng(9), n = lite ? 70 : 130, out: { p: [number, number, number]; s: [number, number, number]; rot: number }[] = [];
    const deg = (a: number) => ((a * 180) / Math.PI + 360) % 360;
    for (let i = 0; i < n * 3 && out.length < (lite ? 38 : 66); i++) {
      const a = r() * Math.PI * 2, d = deg(a), rad = 92 + r() * 22, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const front = z > 0, corner = (d > 30 && d < 62) || (d > 118 && d < 150);
      if (front && !corner) continue;                        // front half: only the two corners
      if (!front && Math.abs(x) < 16 && z > -110) { /* behind the building is fine */ }
      if (Math.abs(x) < 30 && z > -10) continue;             // never along the avenue
      if (Math.abs(z - 25) < 34 && z > 0) continue;          // never along the street
      const h = 8 + r() * 22 + (r() > .85 ? r() * 8 : 0), w = 5 + r() * 5;
      out.push({ p: [x, h / 2, z], s: [w, h, w], rot: -a });
    }
    return out;
  }, [lite]);
  const ring = useMemo<TreeSpec[]>(() => {
    const r = rng(15); const out: TreeSpec[] = [];
    for (let i = 0; out.length < quality.trees && i < 900; i++) {
      const a = r() * Math.PI * 2, rad = 38 + r() * 30, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (Math.abs(x) < 46 && z > -34 && z < 14.5) continue;       // lot
      if (z > 12 && z < 40) continue;                              // street and sidewalks
      if (Math.abs(x) < 14 && z > 0) continue;                     // the avenue
      const k = r(); out.push({ x, z, s: .9 + r() * .7, kind: k < .14 ? 'cypress' : k < .3 ? 'blossom' : 'oak' });
    }
    return out;
  }, [quality.trees]);
  const framing = useMemo<TreeSpec[]>(() => [[-30, -16, 1.2, 'oak'], [30, -16, 1.15, 'blossom'], [-27, -28, 1.35, 'oak'], [27, -28, 1.3, 'oak'], [-40, 2, 1.3, 'blossom'], [40, 3, 1.25, 'oak'], [-44, -20, 1.4, 'oak'], [44, -21, 1.35, 'cypress'], [-14, -34, 1.5, 'oak'], [15, -34, 1.5, 'oak'], [0, -38, 1.6, 'oak'], [-38, 40, 1.4, 'oak'], [38, 42, 1.4, 'blossom'], [-24, 52, 1.5, 'oak'], [26, 56, 1.4, 'oak']].map(([x, z, s, kind]) => ({ x, z, s, kind }) as TreeSpec), []);
  const young = useMemo<TreeSpec[]>(() => ISLAND_TREES.map(([x, z], i) => ({ x, z, s: .52 + (i % 3) * .05, kind: (i % 3 === 1 ? 'blossom' : 'oak') as TreeSpec['kind'] })), []);
  const spots = useMemo(() => {
    const out: { x: number; z: number; y?: number; r: number; n: number; kind: 'flower' | 'bush' }[] = [];
    ISLANDS.forEach(i => { for (let x = i.x - i.w / 2 + 1.2; x < i.x + i.w / 2 - 1; x += 1.3) out.push({ x, z: i.z - .5, y: .38, r: .6, n: lite ? 5 : 11, kind: 'flower' }); });
    for (let x = -29; x <= 29; x += 1.5) { if (Math.abs(x) < 15) continue; out.push({ x, z: 13.9, y: .2, r: .5, n: lite ? 4 : 9, kind: 'flower' }); }
    for (let x = -20; x <= 20; x += 1.4) { if (Math.abs(x) < 10) continue; out.push({ x, z: -12.9, y: .24, r: .5, n: lite ? 4 : 8, kind: 'flower' }); }
    return out;
  }, [lite]);

  return <group>
    {/* a dark ground underlay: if two ground pieces ever leave a hairline gap, this shows instead of the sky */}
    <mesh rotation-x={-Math.PI / 2} position={[0, -.16, 0]}><planeGeometry args={[900, 900]} /><meshStandardMaterial color="#2b3d26" roughness={1} /></mesh>
    <mesh geometry={lawnGeo} rotation-x={-Math.PI / 2} position={[0, -.07, 0]} receiveShadow><meshStandardMaterial map={lawnTex} roughness={.95} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, PLAZA.cz]} material={lotMat} receiveShadow><planeGeometry args={[PLAZA.x + 1.2, PLAZA.z + 1.2]} /></mesh>
    {skyline.map((t, i) => <mesh key={i} position={t.p} rotation-y={t.rot} scale={t.s} material={towerMat}><boxGeometry args={[1, 1, 1]} /></mesh>)}
    <Building position={[0, 0, HQ_Z]} lite={lite} open={open} />
    <StarCanopy lite={lite} />
    {/* the fountain: a roundabout in the entry avenue, between the two planted islands */}
    <group position={[FOUNTAIN.x, 0, FOUNTAIN.z]}>
      <mesh position={[0, .05, 0]} receiveShadow><cylinderGeometry args={[4, 4, .1, 64]} /><meshStandardMaterial color="#cfc9bd" roughness={.6} /></mesh>
      <mesh position={[0, .1, 0]} receiveShadow><cylinderGeometry args={[3.7, 3.7, .2, 64]} /><meshStandardMaterial color="#e8dcc8" roughness={.7} /></mesh>
      <Fountain position={[0, .2, 0]} mobile={lite} scale={.8} />
    </group>
    <Lot lite={lite} tier={quality.tier} asphalt={asphalt} />
    <group position={CAR_POS}>{children}</group>
    <Grass count={quality.grass} />
    <Trees list={ring} clumps={quality.clumps} />
    <Trees list={framing} clumps={quality.clumps * 3} />
    <Trees list={young} clumps={Math.max(10, Math.round(quality.clumps * .8))} />
    <Blooms spots={spots} />
  </group>;
}
