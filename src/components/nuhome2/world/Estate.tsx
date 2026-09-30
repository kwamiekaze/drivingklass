import { useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { palette } from './palette';
import { NightCtx, rng } from './theme';
import { Fountain } from './Fountain';
import { HQ } from './HQ';
import { Course } from './Course';
import { StarPad } from './StarPad';
import { Blooms, Grass, Trees, lawnTexture } from './Grounds';
import type { Quality } from './quality';

function windowsTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, 256, 512);
  const r = rng(5);
  for (let y = 8; y < 512; y += 22) for (let x = 8; x < 256; x += 22) if (r() > .38) { g.fillStyle = r() > .7 ? '#ffd9a0' : r() > .4 ? '#ffb86b' : '#cfe0ff'; g.fillRect(x, y, 12, 14); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

const PLAZA = { x: 34, z: 12.7, cz: 1.2 };
/** Height of the asphalt surface. */
export const FLOOR_Y = .002;
export const FOUNTAIN_POS: [number, number, number] = [0, 0, 24];
export const PAD_POS: [number, number, number] = [0, 0, PLAZA.cz];

/** String light canopy over the course. */
function Canopy({ poles, bulbs, curve, bulbMat }: { poles: THREE.Vector3[]; bulbs: THREE.Vector3[]; curve: (a: THREE.Vector3, b: THREE.Vector3, t: number) => THREE.Vector3; bulbMat: THREE.Material }) {
  const wire = useMemo(() => mergeGeometries(poles.map((a, i) => { const b = poles[(i + 1) % poles.length]!; const pts = Array.from({ length: 23 }).map((_, k) => curve(a, b, k / 22)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 44, .011, 5, false); }))!, [poles, curve]);
  const inst = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => { const m = inst.current; if (!m) return; const d = new THREE.Object3D(); bulbs.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }, [bulbs]);
  return <group>
    {poles.map((p, i) => <group key={i} position={[p.x, 0, p.z]}>
      <mesh position={[0, 2.65, 0]}><cylinderGeometry args={[.06, .08, 5.3, 8]} /><meshStandardMaterial color="#26262c" roughness={.5} metalness={.5} /></mesh>
      <mesh position={[0, 5.32, 0]} material={bulbMat}><sphereGeometry args={[.13, 12, 8]} /></mesh>
    </group>)}
    <mesh geometry={wire}><meshStandardMaterial color="#2a2a30" roughness={.6} metalness={.3} /></mesh>
    <instancedMesh ref={inst} args={[undefined, undefined, bulbs.length]} material={bulbMat} frustumCulled={false}><sphereGeometry args={[.09, 8, 6]} /></instancedMesh>
  </group>;
}

export function Estate({ quality, children }: { quality: Quality; children?: React.ReactNode }) {
  const mix = useContext(NightCtx);
  const { reflective, lite } = quality;
  const winTex = useMemo(windowsTexture, []);
  const lawnTex = useMemo(() => { const t = lawnTexture(); t.repeat.set(1 / 8, 1 / 8); return t; }, []);
  const bulbMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff2d6', emissive: '#ffc57a', emissiveIntensity: 1 }), []);
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9aa3b4', emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: .05, roughness: 1 }), [winTex]);
  const lampA = useRef<THREE.PointLight>(null), lampB = useRef<THREE.PointLight>(null);
  const reflMat = useRef<THREE.MeshStandardMaterial & { mixStrength?: number }>(null), glossMat = useRef<THREE.MeshPhysicalMaterial>(null), flatMat = useRef<THREE.MeshStandardMaterial>(null);
  const floorDay = useMemo(() => new THREE.Color('#5d5d66'), []), floorNight = useMemo(() => new THREE.Color('#1d1d24'), []);
  const dayT = useMemo(() => new THREE.Color('#7e89a2'), []), nightT = useMemo(() => new THREE.Color('#2a2c55'), []);
  useFrame(() => {
    const m = mix.current;
    bulbMat.emissiveIntensity = .9 + 3.4 * m; towerMat.emissiveIntensity = .04 + 1.15 * m; towerMat.color.copy(dayT).lerp(nightT, m);
    if (reflMat.current) { reflMat.current.color.copy(floorDay).lerp(floorNight, m); reflMat.current.mixStrength = 2.4 - .5 * m; }
    if (flatMat.current) flatMat.current.color.copy(floorDay).lerp(floorNight, m);
    if (glossMat.current) glossMat.current.opacity = .3 - .06 * m;
    if (lampA.current) lampA.current.intensity = 1.2 + 5 * m; if (lampB.current) lampB.current.intensity = 1.2 + 5 * m;
  });

  const lawnGeo = useMemo(() => {
    const s = new THREE.Shape(); s.absarc(0, 0, 118, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); const x = PLAZA.x / 2, z0 = PLAZA.cz - PLAZA.z / 2, z1 = PLAZA.cz + PLAZA.z / 2;
    hole.moveTo(-x, -z1); hole.lineTo(x, -z1); hole.lineTo(x, -z0); hole.lineTo(-x, -z0); hole.closePath(); s.holes.push(hole);
    return new THREE.ShapeGeometry(s, 40);
  }, []);
  const skyline = useMemo(() => { const r = rng(9); const n = lite ? 34 : 56; return Array.from({ length: n }).map((_, i) => { const a = (i / n) * Math.PI * 2; const rad = 84 + r() * 12; const h = 5 + r() * 13, w = 3.5 + r() * 4; return { p: [Math.cos(a) * rad, h / 2, Math.sin(a) * rad] as [number, number, number], s: [w, h, w] as [number, number, number], rot: -a }; }); }, [lite]);
  const trees = useMemo(() => {
    const r = rng(15); const out: { x: number; z: number; s: number; kind: 'oak' | 'cypress' | 'blossom' }[] = [];
    for (let i = 0; out.length < quality.trees && i < 400; i++) {
      const a = r() * Math.PI * 2, rad = 40 + r() * 16, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (z < 4 && Math.abs(x) < 28) continue; if (Math.hypot(x, z - 24) < 12) continue;
      const k = r(); out.push({ x, z, s: .85 + r() * .7, kind: k < .16 ? 'cypress' : k < .34 ? 'blossom' : 'oak' });
    }
    return out;
  }, [quality.trees]);
  const framing = useMemo(() => ([[-27, -9, 1.25, 'oak'], [-24, -21, 1.35, 'oak'], [27, -9, 1.2, 'blossom'], [25, -21, 1.3, 'oak'], [-34, 1, 1.3, 'blossom'], [34, 2, 1.25, 'oak'], [-38, -14, 1.4, 'oak'], [38, -15, 1.35, 'cypress'], [-31, -28, 1.4, 'oak'], [31, -28, 1.4, 'oak']] as [number, number, number, 'oak' | 'cypress' | 'blossom'][]).map(([x, z, s, kind]) => ({ x, z, s, kind })), []);
  const spots = useMemo(() => {
    const out: { x: number; z: number; r: number; n: number; kind: 'flower' | 'bush' }[] = [];
    for (let x = -19; x <= 19; x += 1.6) { if (Math.abs(x) < 3.2) continue; out.push({ x, z: -6.5, r: .35, n: 2, kind: 'bush' }); }
    for (let x = -19; x <= 19; x += 1.5) { if (Math.abs(x) < 6.2) continue; out.push({ x, z: -11.1, r: .7, n: lite ? 6 : 14, kind: 'flower' }); out.push({ x, z: -11.5, r: .4, n: 1, kind: 'bush' }); }
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; out.push({ x: Math.cos(a) * 5.6, z: 24 + Math.sin(a) * 5.6, r: .6, n: lite ? 6 : 12, kind: 'flower' }); }
    return out;
  }, [lite]);
  const poles = useMemo(() => Array.from({ length: 14 }).map((_, i) => { const a = (i / 14) * Math.PI * 2 + .11; return new THREE.Vector3(Math.cos(a) * 17.8, 0, 7 + Math.sin(a) * 11.6); }), []);
  const curve = useCallback((a: THREE.Vector3, b: THREE.Vector3, t: number) => new THREE.Vector3(a.x + (b.x - a.x) * t, 5.2 - 1.05 * 4 * t * (1 - t), a.z + (b.z - a.z) * t), []);
  const bulbs = useMemo(() => { const pts: THREE.Vector3[] = []; poles.forEach((a, i) => { const b = poles[(i + 1) % poles.length]!; for (let k = 1; k < 22; k++) pts.push(curve(a, b, k / 22)); }); return pts; }, [poles, curve]);
  const stonePath = '#d9cbb9';

  return <group>
    <mesh geometry={lawnGeo} rotation-x={-Math.PI / 2} position={[0, -.02, 0]} receiveShadow><meshStandardMaterial map={lawnTex} roughness={.95} /></mesh>
    {reflective
      ? <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, PLAZA.cz]} receiveShadow><planeGeometry args={[PLAZA.x, PLAZA.z]} /><MeshReflectorMaterial ref={reflMat as never} blur={[40, 10]} resolution={1024} mixBlur={.6} mixStrength={2.4} mixContrast={1.05} roughness={.42} depthScale={.3} minDepthThreshold={.6} maxDepthThreshold={1.6} color="#5d5d66" metalness={.3} mirror={.5} /></mesh>
      : <group>
        <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, PLAZA.cz]} receiveShadow><planeGeometry args={[PLAZA.x, PLAZA.z]} /><meshStandardMaterial ref={flatMat} color="#5d5d66" roughness={.8} /></mesh>
        {!lite && <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y + .004, PLAZA.cz]} renderOrder={1}><planeGeometry args={[PLAZA.x, PLAZA.z]} /><meshPhysicalMaterial ref={glossMat} color="#ffffff" roughness={.08} clearcoat={1} clearcoatRoughness={.05} transparent opacity={.3} depthWrite={false} /></mesh>}
      </group>}
    {[-1, 1].map(s => <mesh key={s} position={[0, .05, PLAZA.cz + s * (PLAZA.z / 2 + .18)]}><boxGeometry args={[PLAZA.x + .8, .1, .36]} /><meshStandardMaterial color="#e6dccb" roughness={.5} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * (PLAZA.x / 2 + .18), .05, PLAZA.cz]}><boxGeometry args={[.36, .1, PLAZA.z + .8]} /><meshStandardMaterial color="#e6dccb" roughness={.5} /></mesh>)}
    {/* path to HQ and to the fountain, fountain court */}
    <mesh rotation-x={-Math.PI / 2} position={[0, .02, -6.9]}><planeGeometry args={[4.6, 3.2]} /><meshStandardMaterial color={stonePath} roughness={.6} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .02, 12.55]}><planeGeometry args={[4.6, 9.9]} /><meshStandardMaterial color={stonePath} roughness={.6} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .035, 24]}><circleGeometry args={[6.6, 64]} /><meshStandardMaterial color={stonePath} roughness={.6} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .05, 24]}><ringGeometry args={[6.3, 6.5, 64]} /><meshStandardMaterial color={palette.goldBright} metalness={1} roughness={.25} /></mesh>
    {[-2.6, 2.6].flatMap(x => [9.5, 12.5, 15.5].map(z => <mesh key={`${x}${z}`} position={[x, .45, z]} material={bulbMat}><cylinderGeometry args={[.12, .14, .9, 10]} /></mesh>))}
    {skyline.map((t, i) => <mesh key={i} position={t.p} rotation-y={t.rot} scale={t.s} material={towerMat}><boxGeometry args={[1, 1, 1]} /></mesh>)}
    <HQ position={[0, 0, -15]} lite={lite} />
    <Course />
    <StarPad position={PAD_POS}>{children}</StarPad>
    <Fountain position={FOUNTAIN_POS} mobile={lite} />
    <Grass count={quality.grass} />
    <Trees list={trees} clumps={quality.clumps} />
    <Trees list={framing} clumps={quality.clumps * 3} />
    <Blooms spots={spots} />
    <Canopy poles={poles} bulbs={bulbs} curve={curve} bulbMat={bulbMat} />
    <pointLight ref={lampA} position={[-8, 3, -3]} intensity={2} distance={14} color="#ffc98f" />
    <pointLight ref={lampB} position={[8, 3, -3]} intensity={2} distance={14} color="#ffc98f" />
  </group>;
}
