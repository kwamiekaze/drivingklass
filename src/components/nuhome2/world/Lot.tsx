import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, radialTexture, rng } from './theme';
import { Box, Cyl, SIGN_FONT, V3, makeCanvasTexture, starShape } from './parts';
import { CAR_SPECS, Car } from './Cars';

/*
 * The lot, laid out like a real one. World meters. Building front wall z -14.5, terrace z -15.2 to -8.6.
 *   Row A    z -8.5 to -3.5   stalls nose to the terrace, the reserved stall (CAR_POS) is dead centre
 *   Aisle    z -3.5 to 3.0    two way
 *   Row B    z 3.0 to 8.0     stalls nose to the planted islands
 *   Islands  z 8.0 to 13.6    curbed, hedged, with trees and lights
 *   Entry    side lane x +29.2 to 34.2 (in), exit side lane x -34.2 to -29.2 (out)
 *   Avenue   x -4.1 to 4.1, a straight two way road from far away to the reserved stall, crossing the front street (z 19 to 31)
 */
export const CAR_POS: V3 = [0, 0, -6];
export const ISLANDS = [{ x: -16.9, z: 10.8, w: 24.4, d: 5.2 }, { x: 16.9, z: 10.8, w: 24.4, d: 5.2 }];
export const ISLAND_TREES: [number, number][] = [[-9.5, 10.8], [-16.5, 10.8], [-23.5, 10.8], [9.5, 10.8], [16.5, 10.8], [23.5, 10.8]];
const LOT_LAMPS: [number, number][] = [[-13, 10.8], [13, 10.8], [-26, 10.8], [26, 10.8], [-24.4, -8.2], [24.4, -8.2]];
const AVENUE_LAMPS: [number, number][] = [[6.2, 46], [-6.2, 76], [6.2, 106], [-6.2, 136], [6.2, 166], [-6.2, 196]];
const PAINT_Y = .04, HI_Y = .16;

type Dec = { x: number; z: number; w: number; d: number };

function Decals({ items, color, y = PAINT_Y }: { items: Dec[]; color: string; y?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.set(it.x, y, it.z); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(it.w, it.d, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items, y]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow frustumCulled={false}>
    <planeGeometry args={[1, 1]} /><meshStandardMaterial color={color} roughness={.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
  </instancedMesh>;
}

function Arrows({ items }: { items: { x: number; z: number; yaw: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 1.6); s.lineTo(.62, .55); s.lineTo(.2, .55); s.lineTo(.2, -1.6); s.lineTo(-.2, -1.6); s.lineTo(-.2, .55); s.lineTo(-.62, .55); s.closePath(); return new THREE.ShapeGeometry(s); }, []);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.set(it.x, PAINT_Y, it.z); o.rotation.set(-Math.PI / 2, 0, it.yaw); o.scale.set(1, 1, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, undefined, items.length]} frustumCulled={false}><meshStandardMaterial color="#e8e6df" roughness={.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /></instancedMesh>;
}

function markings() {
  const white: Dec[] = [], yellow: Dec[] = [], yellowHi: Dec[] = [], streetW: Dec[] = [], avenueW: Dec[] = [], cross: Dec[] = [];
  for (let j = 0; j <= 10; j++) { const x = 1.375 + 2.75 * j; [-1, 1].forEach(s => white.push({ x: s * x, z: -6, w: j === 0 ? .16 : .1, d: 5 })); }
  for (let k = 0; k <= 9; k++) { const x = 4.125 + 2.75 * k; [-1, 1].forEach(s => white.push({ x: s * x, z: 5.5, w: .1, d: 5 })); }
  white.push({ x: -31.7, z: 13.3, w: 5, d: .45 }, { x: -2.05, z: 13.3, w: 4, d: .45 });
  [-1, 1].forEach(s => yellow.push({ x: s * .09, z: 5.65, w: .1, d: 17.3 }));
  [-1, 1].forEach(s => yellowHi.push({ x: s * .09, z: 16.7, w: .1, d: 5 }));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => streetW.push({ x: sx * 132.3, z: 25.25 + sz * .09, w: 255.4, d: .1 })));
  [19.95, 30.55].forEach(z => [-1, 1].forEach(sx => streetW.push({ x: sx * 132.3, z, w: 255.4, d: .14 })));
  [-1, 1].forEach(s => { yellow.push({ x: s * .09, z: 135.75, w: .1, d: 208.5 }); avenueW.push({ x: s * 3.85, z: 135.75, w: .14, d: 208.5 }); });
  avenueW.push({ x: 2.05, z: 36.6, w: 4, d: .45 });
  [-1, 1].forEach(s => { for (let z = 19.8; z < 30.9; z += .9) cross.push({ x: s * 7.4, z, w: 2.6, d: .45 }); });
  return { white, yellow, yellowHi, streetW, avenueW, cross };
}

const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3d8', emissive: '#ffd08a', emissiveIntensity: .6 });
const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(radialTexture([[0, 'rgba(255,236,180,1)'], [.4, 'rgba(255,205,120,.35)'], [1, 'rgba(255,190,90,0)']])), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, opacity: 0 });
const wellMat = new THREE.MeshStandardMaterial({ color: '#fff2d2', emissive: '#ffcf8a', emissiveIntensity: .2 });

function foliageTexture() {
  const t = makeCanvasTexture(256, 256, (g, w, h) => {
    const r = rng(5); g.fillStyle = '#2b5a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = ['#244f2a', '#33683a', '#3f7a43', '#4f8f4c', '#1f4426'][Math.floor(r() * 5)]!; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 6, 0, 7); g.fill(); }
  }, 4, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

type Plant = { core: THREE.Material; blob: THREE.BufferGeometry; leaf: THREE.Material; k: number };

/** A clipped hedge built the way a real one looks: a solid core, covered in hundreds of small leaf clusters in varied greens. */
function Hedge({ x, z, w, d = 1, h = .9, y = .16, seed = 1, pl, density = 1 }: { x: number; z: number; w: number; d?: number; h?: number; y?: number; seed?: number; pl: Plant; density?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const area = w * (2 * h + d), n = Math.max(30, Math.round(area * 70 * pl.k * density));
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const r = rng(Math.floor(seed * 7919 + Math.abs(x) * 131 + Math.abs(z) * 17 + w * 3)); const o = new THREE.Object3D(), c = new THREE.Color();
    const hw = (w - .2) / 2, hd = (d - .2) / 2, y0 = y + .08, hh = h - .1;
    for (let i = 0; i < n; i++) {
      const pick = r() * (2 * h + d), s = .5 + r() * .7;
      let px: number, py: number, pz: number, v: number;
      if (pick < h) { px = (r() * 2 - 1) * hw; py = r() * hh; pz = hd; v = py / hh; }
      else if (pick < 2 * h) { px = (r() * 2 - 1) * hw; py = r() * hh; pz = -hd; v = py / hh; }
      else { px = (r() * 2 - 1) * hw; py = hh; pz = (r() * 2 - 1) * hd; v = 1; }
      o.position.set(x + px, y0 + py, z + pz + (pick < 2 * h ? (pick < h ? -.04 : .04) : 0));
      o.scale.set(s * (1 + r() * .5), s * (.7 + r() * .4), s * (1 + r() * .5)); o.rotation.set(r() * 3, r() * 3, r() * 3); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      c.setHSL(.27 + r() * .05, .5 + r() * .25, .03 + v * .045 + r() * .03); m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
  }, [n, x, z, w, d, h, y, seed]);
  return <group>
    <mesh position={[x, y + h * .46, z]} material={pl.core} castShadow receiveShadow><boxGeometry args={[w - .25, h * .88, d - .3]} /></mesh>
    <instancedMesh ref={ref} args={[pl.blob, pl.leaf, n]} frustumCulled={false} />
  </group>;
}

function Island({ x, z, w, d, pl, density }: { x: number; z: number; w: number; d: number; pl: Plant; density: number }) {
  return <group>
    <Box p={[x, .15, z]} s={[w, .3, d]} c="#d6d1c6" r={.75} />
    <Box p={[x, .33, z]} s={[w - .6, .1, d - .6]} c="#2b2018" r={1} cast={false} />
    <Hedge x={x} y={.36} z={z + d / 2 - .75} w={w - 1.6} d={.9} h={.95} seed={3} pl={pl} density={density} />
    <Hedge x={x} y={.36} z={z - d / 2 + .6} w={w - 1.6} d={.7} h={.5} seed={4} pl={pl} density={density} />
  </group>;
}

function Lamp({ x, z, rotY = 0, tall = 7.2 }: { x: number; z: number; rotY?: number; tall?: number }) {
  return <group position={[x, 0, z]} rotation-y={rotY}>
    <Cyl p={[0, .22, 0]} r={.2} h={.44} c="#26262b" m={.5} rough={.5} seg={12} />
    <Cyl p={[0, tall / 2, 0]} r={.06} rb={.09} h={tall} c="#26262b" m={.5} rough={.45} seg={10} />
    <Box p={[.7, tall - .05, 0]} s={[1.5, .1, .1]} c="#26262b" m={.5} r={.45} cast={false} />
    <mesh position={[1.35, tall - .1, 0]}><boxGeometry args={[.95, .14, .42]} /><meshStandardMaterial color="#303036" metalness={.5} roughness={.4} /></mesh>
    <mesh position={[1.35, tall - .19, 0]} material={lampMat}><boxGeometry args={[.8, .03, .34]} /></mesh>
    <sprite position={[1.35, tall - .5, 0]} scale={[5, 5, 1]} material={glowMat} />
  </group>;
}

const topiaryGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position as THREE.BufferAttribute, r = rng(77); for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 9) * Math.cos(p.getY(i) * 7 + p.getZ(i) * 5)) * .035 + (r() - .5) * .02; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; })();
function Topiary({ x, z, y = .3, s = 1 }: { x: number; z: number; y?: number; s?: number }) {
  return <group position={[x, y, z]} scale={s}>
    <mesh position={[0, .34, 0]} castShadow><cylinderGeometry args={[.46, .36, .68, 18]} /><meshStandardMaterial color="#3b3a3f" roughness={.55} metalness={.15} /></mesh>
    <mesh position={[0, 1.42, 0]} scale={[.64, .74, .64]} geometry={topiaryGeo} castShadow><meshStandardMaterial color="#2a5a30" roughness={.92} /></mesh>
  </group>;
}

function ReservedSign() {
  const tex = useMemo(() => makeCanvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe4'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4efe4'; g.font = `700 36px ${SIGN_FONT}`; g.fillText('RESERVED', w / 2, 58);
    g.fillStyle = '#d9a621'; g.font = `600 24px ${SIGN_FONT}`; g.fillText('5 STAR DRIVER', w / 2, 108);
  }, 4), []);
  return <group position={[-1.75, 0, -8.15]}>
    <Cyl p={[0, .8, 0]} r={.035} h={1.6} c="#1a1a1e" m={.6} rough={.4} seg={8} />
    <mesh position={[0, 1.55, .02]}><planeGeometry args={[.82, .52]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
  </group>;
}

function Monument({ position }: { position: V3 }) {
  const tex = useMemo(() => makeCanvasTexture(1024, 400, (g, w, h) => {
    g.fillStyle = '#0e0e12'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(244,239,228,.6)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    const sh = starShape(34); for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2 + (i - 2) * 86, 84); g.scale(1, -1); g.beginPath(); sh.getPoints().forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = '#f4efe4'; g.fill(); g.restore(); }
    g.fillStyle = '#f4efe4'; g.font = `700 112px ${SIGN_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRIVINGKLASS', w / 2, 220);
    g.fillStyle = '#cfc6b6'; g.font = `600 30px ${SIGN_FONT}`; g.fillText('WHERE 5 STAR DRIVERS ARE MADE', w / 2, 330);
  }), []);
  return <group position={position}>
    <Box p={[0, .35, 0]} s={[6.6, .7, 1.3]} c="#cfc2a8" r={.8} />
    <Box p={[0, 1.9, 0]} s={[6.2, 2.4, .5]} c="#0e0e12" r={.5} m={.2} />
    <mesh position={[0, 1.9, .27]}><planeGeometry args={[6.0, 2.3]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    <Box p={[0, 3.18, 0]} s={[6.4, .14, .6]} c="#cfc9bd" r={.6} />
  </group>;
}

function roadGeo(w: number, h: number) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 10, uv.getY(i) * h / 10); return g; }

function Road({ asphalt }: { asphalt: THREE.Material }) {
  const street = useMemo(() => roadGeo(520, 12.2), []), avenue = useMemo(() => roadGeo(8.2, 208.65), []);
  const mk = useMemo(markings, []);
  const kerb = '#cfc9bd', walk = '#d9d4c8';
  const segs: [number, number][] = [[4.2, 29.1], [34.3, 260]];       // near side, broken at the three driveways
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, .006, 25.25]} geometry={street} material={asphalt} receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, .006, 135.675]} geometry={avenue} material={asphalt} receiveShadow />
    {[-1, 1].flatMap(s => segs.map(([a, b]) => { const len = b - a, cx = s * (a + b) / 2; return <group key={`${s}${a}`}>
      <Box p={[cx, .06, 17.3]} s={[len, .12, 3.2]} c={walk} r={.85} cast={false} /><Box p={[cx, .1, 19.1]} s={[len, .2, .3]} c={kerb} r={.8} cast={false} />
    </group>; }))}
    {[-1, 1].map(s => <group key={`f${s}`}>
      <Box p={[s * 132.1, .06, 33.3]} s={[255.8, .12, 3.4]} c={walk} r={.85} cast={false} /><Box p={[s * 132.1, .1, 31.4]} s={[255.8, .2, .3]} c={kerb} r={.8} cast={false} />
    </group>)}
    {[0, -31.7, 31.7].map((x, i) => <mesh key={i} position={[x, .066, 16.7]} material={asphalt} receiveShadow><boxGeometry args={[i ? 5.2 : 8.2, .132, 5.1]} /></mesh>)}
    <Decals items={mk.streetW} color="#e8e6df" /><Decals items={mk.avenueW} color="#e8e6df" /><Decals items={mk.cross} color="#f1efe8" /><Decals items={mk.yellowHi} color="#d9a621" y={HI_Y} />
  </group>;
}

export function Lot({ lite, tier, asphalt }: { lite: boolean; tier: 'high' | 'mid' | 'lite'; asphalt: THREE.Material }) {
  const mix = useContext(NightCtx);
  const mk = useMemo(markings, []);
  const arrows = useMemo(() => [{ x: 31.7, z: 6, yaw: 0 }, { x: 31.7, z: -.2, yaw: 0 }, { x: -31.7, z: 6, yaw: Math.PI }, { x: -31.7, z: -.2, yaw: Math.PI }, { x: 2.05, z: 10.6, yaw: 0 }, { x: -2.05, z: 10.6, yaw: Math.PI }], []);
  const pl = useMemo<Plant>(() => ({
    core: (() => { const t = foliageTexture(); t.repeat.set(2, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: .95, color: '#5f7a5a' }); })(),
    blob: new THREE.IcosahedronGeometry(.17, tier === 'high' ? 1 : 0),
    leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9 }),
    k: tier === 'high' ? 1 : tier === 'mid' ? .62 : .32,
  }), [lite, tier]);
  useFrame(() => { const n = mix.current; lampMat.emissiveIntensity = .5 + 2.6 * n; wellMat.emissiveIntensity = .15 + 2 * n; glowMat.opacity = .05 + .62 * n; });
  const hedgeSegs: [number, number][] = [[-23, -17.2], [-16.6, -10.6], [-10, -3.7]];
  const wells: V3[] = ISLAND_TREES.map(([x, z]) => [x, .42, z + .5] as V3);
  const lots = lite ? LOT_LAMPS.slice(0, 4) : LOT_LAMPS, aves = lite ? AVENUE_LAMPS.slice(0, 3) : AVENUE_LAMPS;
  const cars: { id: keyof typeof CAR_SPECS; x: number; z: number; r: number }[] = [
    { id: 'corolla', x: -5.5, z: -6, r: Math.PI / 2 }, { id: 'civic', x: 8.25, z: -6, r: Math.PI / 2 }, { id: 'elantra', x: -16.5, z: -6, r: Math.PI / 2 },
    { id: 'camry', x: 11, z: 5.5, r: -Math.PI / 2 }, { id: 'sentra', x: -13.75, z: 5.5, r: -Math.PI / 2 },
  ];
  return <group>
    <Decals items={mk.white} color="#e2dfd6" /><Decals items={mk.yellow} color="#d9a621" /><Arrows items={arrows} />
    {/* terrace and kerbs */}
    <Box p={[0, .08, -11.9]} s={[46, .16, 6.6]} c="#d9d2c4" r={.7} />
    <Box p={[0, .1, -8.5]} s={[46.2, .2, .3]} c="#cfc9bd" r={.7} />
    {[-1, 1].map(s => <Box key={`sk${s}`} p={[s * 34.35, .1, -.2]} s={[.3, .2, 29]} c="#cfc9bd" r={.7} />)}
    {[-1, 1].map(s => <Box key={`fk${s}`} p={[s * 16.65, .1, 14.35]} s={[25.1, .2, .3]} c="#cfc9bd" r={.7} />)}
    <Road asphalt={asphalt} />
    {/* planted islands, front strip, building beds */}
    {ISLANDS.map((i, k) => <Island key={k} {...i} pl={pl} density={1} />)}
    {[-1, 1].map(s => <Hedge key={`fh${s}`} x={s * 22.6} y={.2} z={15.0} w={13.6} d={1.1} h={.9} seed={6 + s} pl={pl} density={.7} />)}
    {[-1, 1].flatMap(s => hedgeSegs.map(([a, b], i) => { const x0 = s < 0 ? a : -b, x1 = s < 0 ? b : -a; return <Hedge key={`bh${s}${a}`} x={(x0 + x1) / 2} z={-9.25} w={Math.abs(x1 - x0)} d={1} h={1.05} seed={10 + i} pl={pl} />; }))}
    {[-1, 1].map(s => <group key={`wb${s}`}>
      <Box p={[s * 15.3, .2, -14.3]} s={[10.8, .12, 1.4]} c="#2d2118" r={1} cast={false} />
      <Hedge x={s * 15.3} y={.24} z={-14.3} w={10.4} d={.9} h={.85} seed={20 + s} pl={pl} />
    </group>)}
    {[-3.7, 3.7].map(x => <Topiary key={x} x={x} z={-9.25} y={.16} s={.9} />)}
    {/* lights */}
    {lots.map(([x, z], i) => <Lamp key={`l${i}`} x={x} z={z} rotY={x < 0 ? 0 : Math.PI} />)}
    {aves.map(([x, z], i) => <Lamp key={`a${i}`} x={x} z={z} rotY={x < 0 ? 0 : Math.PI} tall={8} />)}
    {wells.map((p, i) => <mesh key={i} position={p} material={wellMat}><cylinderGeometry args={[.14, .14, .08, 10]} /></mesh>)}
    <ReservedSign />
    <Monument position={[10.4, 0, 14.9]} />
    {cars.map(c => <Car key={c.id} spec={CAR_SPECS[c.id]!} position={[c.x, .002, c.z]} rotationY={c.r} />)}
  </group>;
}
