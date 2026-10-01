import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { NightCtx, rng } from './theme';
import { HQ } from './HQ';
import { CAR_POS, ISLANDS, Lot } from './Lot';
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

const PLAZA = { x: 68, z: 22.8, cz: 2.8 };
export const FLOOR_Y = .002;
export { CAR_POS };

type TreeSpec = { x: number; z: number; s: number; kind: 'oak' | 'cypress' | 'blossom' };

export function Estate({ quality, open, children }: { quality: Quality; open: boolean; children?: React.ReactNode }) {
  const mix = useContext(NightCtx);
  const { reflective, lite } = quality;
  const winTex = useMemo(windowsTexture, []);
  const dayTex = useMemo(dayTexture, []);
  const lawnTex = useMemo(() => { const t = lawnTexture(); t.repeat.set(1 / 8, 1 / 8); return t; }, []);
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4dbe8', map: dayTex, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: .05, roughness: 1 }), [winTex, dayTex]);
  const reflMat = useRef<THREE.MeshStandardMaterial & { mixStrength?: number }>(null), glossMat = useRef<THREE.MeshPhysicalMaterial>(null), flatMat = useRef<THREE.MeshStandardMaterial>(null);
  const floorDay = useMemo(() => new THREE.Color('#5a5a62'), []), floorNight = useMemo(() => new THREE.Color('#1b1b22'), []);
  const dayT = useMemo(() => new THREE.Color('#d4dbe8'), []), nightT = useMemo(() => new THREE.Color('#2a2c55'), []);
  useFrame(() => {
    const m = mix.current;
    towerMat.emissiveIntensity = .04 + 1.2 * m; towerMat.color.copy(dayT).lerp(nightT, m);
    if (reflMat.current) { reflMat.current.color.copy(floorDay).lerp(floorNight, m); reflMat.current.mixStrength = 2.2 - .4 * m; }
    if (flatMat.current) flatMat.current.color.copy(floorDay).lerp(floorNight, m);
    if (glossMat.current) glossMat.current.opacity = .3 - .06 * m;
  });

  const lawnGeo = useMemo(() => {
    const s = new THREE.Shape(); s.absarc(0, 0, 118, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); const x = PLAZA.x / 2, z0 = PLAZA.cz - PLAZA.z / 2, z1 = PLAZA.cz + PLAZA.z / 2;
    hole.moveTo(-x, -z1); hole.lineTo(x, -z1); hole.lineTo(x, -z0); hole.lineTo(-x, -z0); hole.closePath(); s.holes.push(hole);
    return new THREE.ShapeGeometry(s, 40);
  }, []);
  const skyline = useMemo(() => {
    const r = rng(9); const n = lite ? 30 : 52;
    return Array.from({ length: n }).map((_, i) => {
      const a = Math.PI + .12 + (i / n) * (Math.PI - .24) + (r() - .5) * .05, rad = 86 + r() * 14;
      const tall = Math.abs(Math.cos(a)) > .55 ? r() * 6 : 0, h = 7 + r() * 18 + tall, w = 5 + r() * 5;
      return { p: [Math.cos(a) * rad, h / 2, Math.sin(a) * rad] as [number, number, number], s: [w, h, w] as [number, number, number], rot: -a };
    });
  }, [lite]);
  const ring = useMemo<TreeSpec[]>(() => {
    const r = rng(15); const out: TreeSpec[] = [];
    for (let i = 0; out.length < quality.trees && i < 500; i++) {
      const a = r() * Math.PI * 2, rad = 40 + r() * 24, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (Math.abs(x) < 32 && z > -30) continue;
      const k = r(); out.push({ x, z, s: .9 + r() * .7, kind: k < .14 ? 'cypress' : k < .3 ? 'blossom' : 'oak' });
    }
    return out;
  }, [quality.trees]);
  const framing = useMemo<TreeSpec[]>(() => [[-27.5, -9, 1.2, 'oak'], [-25.5, -23, 1.35, 'oak'], [27.5, -9, 1.15, 'blossom'], [25.5, -23, 1.3, 'oak'], [-36, 4, 1.3, 'blossom'], [36, 5, 1.25, 'oak'], [-38, -14, 1.4, 'oak'], [38, -15, 1.35, 'cypress'], [-31, -29, 1.4, 'oak'], [31, -29, 1.4, 'oak']].map(([x, z, s, kind]) => ({ x, z, s, kind }) as TreeSpec), []);
  const young = useMemo<TreeSpec[]>(() => [[-17.5, 6.6], [-10, 6.6], [10, 6.6], [17.5, 6.6]].map(([x, z]) => ({ x: x!, z: z!, s: .5, kind: 'oak' as const })), []);
  const spots = useMemo(() => {
    const out: { x: number; z: number; y?: number; r: number; n: number; kind: 'flower' | 'bush' }[] = [];
    ISLANDS.forEach(i => { for (let x = i.x - i.w / 2 + 1.2; x < i.x + i.w / 2 - 1; x += 1.4) out.push({ x, z: i.z - .15, y: .38, r: .6, n: lite ? 5 : 11, kind: 'flower' }); });
    for (let x = -33; x <= 33; x += 1.5) { if (Math.abs(x) < 6) continue; out.push({ x, z: 13.6, y: .2, r: .5, n: lite ? 4 : 9, kind: 'flower' }); }
    return out;
  }, [lite]);

  return <group>
    <mesh geometry={lawnGeo} rotation-x={-Math.PI / 2} position={[0, -.02, 0]} receiveShadow><meshStandardMaterial map={lawnTex} roughness={.95} /></mesh>
    {reflective
      ? <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, PLAZA.cz]} receiveShadow><planeGeometry args={[PLAZA.x, PLAZA.z]} /><MeshReflectorMaterial ref={reflMat as never} blur={[40, 10]} resolution={1024} mixBlur={.6} mixStrength={2.2} mixContrast={1.05} roughness={.45} depthScale={.3} minDepthThreshold={.6} maxDepthThreshold={1.6} color="#5a5a62" metalness={.3} mirror={.5} /></mesh>
      : <group>
        <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, PLAZA.cz]} receiveShadow><planeGeometry args={[PLAZA.x, PLAZA.z]} /><meshStandardMaterial ref={flatMat} color="#5a5a62" roughness={.8} /></mesh>
        {!lite && <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y + .004, PLAZA.cz]} renderOrder={1}><planeGeometry args={[PLAZA.x, PLAZA.z]} /><meshPhysicalMaterial ref={glossMat} color="#ffffff" roughness={.08} clearcoat={1} clearcoatRoughness={.05} transparent opacity={.3} depthWrite={false} /></mesh>}
      </group>}
    {skyline.map((t, i) => <mesh key={i} position={t.p} rotation-y={t.rot} scale={t.s} material={towerMat}><boxGeometry args={[1, 1, 1]} /></mesh>)}
    <HQ position={[0, 0, -16]} lite={lite} open={open} />
    <Lot lite={lite} />
    <group position={CAR_POS}>{children}</group>
    <Grass count={quality.grass} />
    <Trees list={ring} clumps={quality.clumps} />
    <Trees list={framing} clumps={quality.clumps * 3} />
    <Trees list={young} clumps={Math.max(10, Math.round(quality.clumps * .8))} />
    <Blooms spots={spots} />
  </group>;
}
