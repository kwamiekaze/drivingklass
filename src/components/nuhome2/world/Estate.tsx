import { useContext, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, rng } from './theme';
import { Building } from './Building';
import { Fountain } from './Fountain';
import { CAR_POS, ISLANDS, Lot } from './Lot';
import { Blooms, Grass, Trees, lawnTexture } from './Grounds';
import { StarCanopy } from './StarCanopy';
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
  g.fillStyle = '#808088'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = 100 + r() * 70; g.fillStyle = `rgba(${v},${v},${v + 6},.5)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/** The lot ends at z 14.3; the road beyond it runs along x until the fog takes it. */
const PLAZA = { x: 68, z: 29, cz: -.2 };
export const FLOOR_Y = .002;
export const HQ_Z = -17.5;
const FOUNTAIN = { x: 0, z: 6.6 };
export { CAR_POS };

type TreeSpec = { x: number; z: number; s: number; kind: 'oak' | 'cypress' | 'blossom' };

export function Estate({ quality, open, children }: { quality: Quality; open: boolean; children?: React.ReactNode }) {
  const mix = useContext(NightCtx);
  const { lite } = quality;
  const winTex = useMemo(windowsTexture, []);
  const dayTex = useMemo(dayTexture, []);
  const lawnTex = useMemo(() => { const t = lawnTexture(); t.repeat.set(1 / 8, 1 / 8); return t; }, []);
  const asphalt = useMemo(() => { const t = asphaltTexture(); t.repeat.set(16, 16); return new THREE.MeshStandardMaterial({ map: t, color: '#ffffff', roughness: .88 }); }, []);
  const lotMat = useMemo(() => { const t = asphaltTexture(); t.repeat.set(17, 7.25); return new THREE.MeshStandardMaterial({ map: t, color: '#ffffff', roughness: .88 }); }, []);
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4dbe8', map: dayTex, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: .05, roughness: 1 }), [winTex, dayTex]);
  const dayC = useMemo(() => new THREE.Color('#ffffff'), []), nightC = useMemo(() => new THREE.Color('#2e2e38'), []);
  const dayT = useMemo(() => new THREE.Color('#d4dbe8'), []), nightT = useMemo(() => new THREE.Color('#2a2c55'), []);
  useFrame(() => {
    const m = mix.current;
    towerMat.emissiveIntensity = .04 + 1.0 * m; towerMat.color.copy(dayT).lerp(nightT, m);
    asphalt.color.copy(dayC).lerp(nightC, m); lotMat.color.copy(asphalt.color);
  });

  const lawnGeo = useMemo(() => {
    const s = new THREE.Shape(); s.absarc(0, 0, 170, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); const x = PLAZA.x / 2, z0 = PLAZA.cz - PLAZA.z / 2, z1 = PLAZA.cz + PLAZA.z / 2;
    hole.moveTo(-x, -z1); hole.lineTo(x, -z1); hole.lineTo(x, -z0); hole.lineTo(-x, -z0); hole.closePath(); s.holes.push(hole);
    return new THREE.ShapeGeometry(s, 48);
  }, []);
  /** A full ring, so the skyline is there from every angle of the 360 orbit. */
  const skyline = useMemo(() => {
    const r = rng(9); const n = lite ? 46 : 84;
    return Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + (r() - .5) * .05, rad = 88 + r() * 14;
      const h = 7 + r() * 20 + (r() > .85 ? r() * 8 : 0), w = 5 + r() * 5;
      return { p: [Math.cos(a) * rad, h / 2, Math.sin(a) * rad] as [number, number, number], s: [w, h, w] as [number, number, number], rot: -a };
    });
  }, [lite]);
  const ring = useMemo<TreeSpec[]>(() => {
    const r = rng(15); const out: TreeSpec[] = [];
    for (let i = 0; out.length < quality.trees && i < 900; i++) {
      const a = r() * Math.PI * 2, rad = 38 + r() * 30, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (Math.abs(x) < 46 && z > -34 && z < 14.5) continue;       // lot
      if (z > 12 && z < 40) continue;                              // road and sidewalks
      const k = r(); out.push({ x, z, s: .9 + r() * .7, kind: k < .14 ? 'cypress' : k < .3 ? 'blossom' : 'oak' });
    }
    return out;
  }, [quality.trees]);
  const framing = useMemo<TreeSpec[]>(() => [[-30, -16, 1.2, 'oak'], [30, -16, 1.15, 'blossom'], [-27, -28, 1.35, 'oak'], [27, -28, 1.3, 'oak'], [-40, 4, 1.3, 'blossom'], [40, 5, 1.25, 'oak'], [-42, -20, 1.4, 'oak'], [42, -21, 1.35, 'cypress'], [-14, -34, 1.5, 'oak'], [15, -34, 1.5, 'oak'], [0, -38, 1.6, 'oak']].map(([x, z, s, kind]) => ({ x, z, s, kind }) as TreeSpec), []);
  const young = useMemo<TreeSpec[]>(() => [[-17.5, 6.6], [-10, 6.6], [10, 6.6], [17.5, 6.6]].map(([x, z]) => ({ x: x!, z: z!, s: .5, kind: 'oak' as const })), []);
  const spots = useMemo(() => {
    const out: { x: number; z: number; y?: number; r: number; n: number; kind: 'flower' | 'bush' }[] = [];
    ISLANDS.forEach(i => { for (let x = i.x - i.w / 2 + 1.2; x < i.x + i.w / 2 - 1; x += 1.4) out.push({ x, z: i.z - .15, y: .38, r: .6, n: lite ? 5 : 11, kind: 'flower' }); });
    for (let x = -33; x <= 33; x += 1.5) { if (Math.abs(x) < 7) continue; out.push({ x, z: 13.6, y: .2, r: .5, n: lite ? 4 : 9, kind: 'flower' }); }
    return out;
  }, [lite]);

  return <group>
    {/* a dark ground underlay: if two ground pieces ever leave a hairline gap, this shows instead of the sky */}
    <mesh rotation-x={-Math.PI / 2} position={[0, -.16, 0]}><planeGeometry args={[700, 700]} /><meshStandardMaterial color="#2b3d26" roughness={1} /></mesh>
    <mesh geometry={lawnGeo} rotation-x={-Math.PI / 2} position={[0, -.07, 0]} receiveShadow><meshStandardMaterial map={lawnTex} roughness={.95} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, PLAZA.cz]} material={lotMat} receiveShadow><planeGeometry args={[PLAZA.x + 1.2, PLAZA.z + 1.2]} /></mesh>
    {skyline.map((t, i) => <mesh key={i} position={t.p} rotation-y={t.rot} scale={t.s} material={towerMat}><boxGeometry args={[1, 1, 1]} /></mesh>)}
    <Building position={[0, 0, HQ_Z]} lite={lite} open={open} />
    <Lot lite={lite} asphalt={asphalt} />
    <StarCanopy lite={lite} />
    {/* the fountain: a round court in the entry aisle, between the two flower islands, gold ring and flowers around it */}
    <group position={[FOUNTAIN.x, 0, FOUNTAIN.z]}>
      <mesh position={[0, .05, 0]} receiveShadow><cylinderGeometry args={[4.5, 4.5, .1, 64]} /><meshStandardMaterial color="#c9971f" roughness={.45} metalness={.35} /></mesh>
      <mesh position={[0, .1, 0]} receiveShadow><cylinderGeometry args={[4.2, 4.2, .2, 64]} /><meshStandardMaterial color="#e8dcc8" roughness={.7} /></mesh>
      <Fountain position={[0, .2, 0]} mobile={lite} scale={.8} />
    </group>
    <group position={CAR_POS}>{children}</group>
    <Grass count={quality.grass} />
    <Trees list={ring} clumps={quality.clumps} />
    <Trees list={framing} clumps={quality.clumps * 3} />
    <Trees list={young} clumps={Math.max(10, Math.round(quality.clumps * .8))} />
    <Blooms spots={spots} />
  </group>;
}
