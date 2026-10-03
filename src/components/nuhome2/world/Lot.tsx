import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { NightCtx, radialTexture, rng } from './theme';
import { Box, Cyl, SIGN_FONT, V3, makeCanvasTexture, starShape } from './parts';

/*
 * The lot: stall lines, a crosswalk, curbed islands with hedges, lamp posts, topiary and a monument sign.
 * World meters. Building front at z -12, apron z -11.6 to -8.6, stalls z -8.4 to -3.4, aisle to z 3, islands z 4.6 to 8.6.
 * CAR_POS is the centre of the reserved stall directly in front of the entrance.
 */
export const CAR_POS: V3 = [0, 0, -6.1];
const PAINT_Y = .04;
export const ISLANDS = [{ x: -13, z: 6.6, w: 16, d: 4 }, { x: 13, z: 6.6, w: 16, d: 4 }];
export const LAMPS: [number, number][] = [[-13.7, 6.6], [13.7, 6.6], [-24.4, -8.2], [24.4, -8.2]];

type Dec = { x: number; z: number; w: number; d: number };
function Decals({ items, color, y = PAINT_Y, emissive = 0 }: { items: Dec[]; color: string; y?: number; emissive?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const d = new THREE.Object3D();
    items.forEach((it, i) => { d.position.set(it.x, y, it.z); d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(it.w, it.d, 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items, y]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow frustumCulled={false}>
    <planeGeometry args={[1, 1]} /><meshStandardMaterial color={color} roughness={.75} emissive={color} emissiveIntensity={emissive} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
  </instancedMesh>;
}

function paint() {
  const white: Dec[] = [], gold: Dec[] = [], cross: Dec[] = [];
  for (let j = 0; j < 8; j++) { const x = 1.375 + 2.75 * j; [-1, 1].forEach(s => { (j === 0 ? gold : white).push({ x: s * x, z: -5.9, w: j === 0 ? .2 : .11, d: 5.2 }); }); }
  gold.push({ x: 0, z: -3.45, w: 2.9, d: .16 });
  for (let k = 0; k < 9; k++) cross.push({ x: 12.1, z: -3.0 + k * .75, w: 2.6, d: .4 });
  white.push({ x: 0, z: 3.25, w: 68, d: .12 });
  return { white, gold, cross };
}

const lampMat = new THREE.MeshStandardMaterial({ color: '#fff2d2', emissive: '#ffc77a', emissiveIntensity: 1 });
const wellMat = new THREE.MeshStandardMaterial({ color: '#fff2d2', emissive: '#ffcf8a', emissiveIntensity: .3 });
const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(radialTexture([[0, 'rgba(255,236,180,1)'], [.4, 'rgba(255,200,110,.4)'], [1, 'rgba(255,190,90,0)']])), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, opacity: .2 });

function foliageTexture() {
  const t = makeCanvasTexture(256, 256, (g, w, h) => {
    const r = rng(5); g.fillStyle = '#2b5a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = ['#244f2a', '#33683a', '#3f7a43', '#4f8f4c', '#1f4426'][Math.floor(r() * 5)]!; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 6, 0, 7); g.fill(); }
  }, 4, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function Hedge({ x, y = .16, z, w, d = 1, h = .85, mat }: { x: number; y?: number; z: number; w: number; d?: number; h?: number; mat: THREE.Material }) {
  const geo = useMemo(() => new RoundedBoxGeometry(w, h, d, 3, Math.min(.3, d * .3)), [w, h, d]);
  return <mesh geometry={geo} material={mat} position={[x, y + h / 2, z]} castShadow receiveShadow />;
}

function Island({ x, z, w, d, mat }: { x: number; z: number; w: number; d: number; mat: THREE.Material }) {
  return <group>
    <Box p={[x, .15, z]} s={[w, .3, d]} c="#d8d3c8" r={.7} />
    <Box p={[x, .33, z]} s={[w - .6, .1, d - .6]} c="#2d2118" r={1} cast={false} />
    <Hedge x={x} y={.38} z={z - d / 2 + .75} w={w - 1.4} mat={mat} />
    <Hedge x={x} y={.38} z={z + d / 2 - .75} w={w - 1.4} mat={mat} />
  </group>;
}

function Lamp({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0, z]}>
    <Cyl p={[0, .12, 0]} r={.2} h={.24} c="#1a1a1e" m={.6} rough={.4} seg={12} />
    <Cyl p={[0, 2.7, 0]} r={.06} rb={.085} h={5.4} c="#1a1a1e" m={.6} rough={.4} seg={10} />
    <mesh position={[0, 5.5, 0]} material={lampMat}><boxGeometry args={[.5, .42, .5]} /></mesh>
    <mesh position={[0, 5.78, 0]}><boxGeometry args={[.66, .1, .66]} /><meshStandardMaterial color="#1a1a1e" metalness={.6} roughness={.4} /></mesh>
    <sprite position={[0, 5.5, 0]} scale={[3.6, 3.6, 1]} material={glowMat} />
  </group>;
}

function Topiary({ x, z, y = .3, s = 1 }: { x: number; z: number; y?: number; s?: number }) {
  return <group position={[x, y, z]} scale={s}>
    <mesh position={[0, .32, 0]} castShadow><cylinderGeometry args={[.42, .34, .64, 16]} /><meshStandardMaterial color="#2a2a2f" roughness={.5} metalness={.3} /></mesh>
    <mesh position={[0, 1.55, 0]} castShadow><coneGeometry args={[.62, 1.9, 16]} /><meshStandardMaterial color="#25522b" roughness={.9} /></mesh>
  </group>;
}

function ReservedSign() {
  const tex = useMemo(() => makeCanvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe4'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4efe4'; g.font = `700 36px ${SIGN_FONT}`; g.fillText('RESERVED', w / 2, 58);
    g.fillStyle = '#fff6df'; g.font = `600 24px ${SIGN_FONT}`; g.fillText('5 STAR DRIVER', w / 2, 108);
  }, 4), []);
  return <group position={[-1.75, 0, -8.15]}>
    <Cyl p={[0, .8, 0]} r={.035} h={1.6} c="#1a1a1e" m={.6} rough={.4} seg={8} />
    <mesh position={[0, 1.55, .02]}><planeGeometry args={[.82, .52]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
  </group>;
}

function Monument({ position, rotY }: { position: V3; rotY: number }) {
  const tex = useMemo(() => makeCanvasTexture(1024, 400, (g, w, h) => {
    g.fillStyle = '#0e0e12'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(244,239,228,.6)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    const sh = starShape(34); for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2 + (i - 2) * 86, 84); g.scale(1, -1); g.beginPath(); sh.getPoints().forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = '#f4efe4'; g.fill(); g.restore(); }
    g.fillStyle = '#f4efe4'; g.font = `700 112px ${SIGN_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRIVINGKLASS', w / 2, 220);
    g.fillStyle = '#f6ede4'; g.font = `600 30px ${SIGN_FONT}`; g.fillText('WHERE 5 STAR DRIVERS ARE MADE', w / 2, 330);
  }), []);
  return <group position={position} rotation-y={rotY}>
    <Box p={[0, .35, 0]} s={[6.6, .7, 1.3]} c="#cfc2a8" r={.8} />
    <Box p={[0, 1.9, 0]} s={[6.2, 2.4, .5]} c="#0e0e12" r={.5} m={.2} />
    <mesh position={[0, 1.9, .27]}><planeGeometry args={[6.0, 2.3]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
    <Box p={[0, 3.18, 0]} s={[6.4, .14, .6]} c="#cfc9bd" r={.6} />
  </group>;
}

function Road({ asphalt }: { asphalt: THREE.Material }) {
  const dashes = useMemo(() => { const out: Dec[] = []; for (let x = -196; x <= 196; x += 7) out.push({ x, z: 25.2, w: 3.4, d: .16 }); return out; }, []);
  const edges = useMemo<Dec[]>(() => [{ x: 0, z: 19.95, w: 400, d: .14 }, { x: 0, z: 30.45, w: 400, d: .14 }], []);
  const curb = '#cfc9bd';
  return <group>
    {/* near and far sidewalks and kerbs, then the road itself, running on until the fog takes it */}
    {[-1, 1].map(s => <Box key={`n${s}`} p={[s * 102.25, .06, 17.3]} s={[195.5, .12, 3.2]} c="#d9d4c8" r={.85} cast={false} />)}
    {[-1, 1].map(s => <Box key={`nk${s}`} p={[s * 102.25, .1, 19.1]} s={[195.5, .2, .3]} c={curb} r={.8} cast={false} />)}
    <Box p={[0, .06, 33.3]} s={[400, .12, 3.4]} c="#d9d4c8" r={.85} cast={false} />
    <Box p={[0, .1, 31.4]} s={[400, .2, .3]} c={curb} r={.8} cast={false} />
    <mesh rotation-x={-Math.PI / 2} position={[0, .006, 25.25]} material={asphalt} receiveShadow><planeGeometry args={[400, 12.2]} /></mesh>
    <mesh position={[0, .066, 16.7]} material={asphalt} receiveShadow><boxGeometry args={[9, .132, 5]} /></mesh>
    <Decals items={dashes} color="#f4f1ea" y={.04} /><Decals items={edges} color="#f4f1ea" y={.04} />
  </group>;
}

export function Lot({ lite, asphalt }: { lite: boolean; asphalt: THREE.Material }) {
  const mix = useContext(NightCtx);
  const { white, gold, cross } = useMemo(paint, []);
  const foliage = useMemo(() => { const t = foliageTexture(); t.repeat.set(2, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: .95 }); }, []);
  useFrame(() => {
    const n = mix.current;
    lampMat.emissiveIntensity = .9 + 3.2 * n; wellMat.emissiveIntensity = .25 + 2.2 * n; glowMat.opacity = .16 + .62 * n;
  });
  const hedgeSegs: [number, number][] = [[-23, -17.2], [-16.6, -10.6], [-10, -3.7]];
  const wells: V3[] = [[-17.5, .4, 6.1], [-10, .4, 6.1], [10, .4, 6.1], [17.5, .4, 6.1]];
  return <group>
    <Decals items={white} color="#f4f1ea" /><Decals items={gold} color="#f4f1ea" /><Decals items={cross} color="#f8f6ef" y={.05} />
    {/* apron, kerbs, plaza edge */}
    <Box p={[0, .08, -11.9]} s={[46, .16, 6.6]} c="#d9d2c4" r={.7} />
    <Box p={[0, .1, -8.5]} s={[49.4, .2, .3]} c="#cfc9bd" r={.7} />
    {[-1, 1].map(s => <Box key={`k${s}`} p={[s * 19.45, .1, 14.35]} s={[30.3, .2, .3]} c="#cfc9bd" r={.7} />)}
    <Road asphalt={asphalt} />
    {[-1, 1].map(s => <Box key={s} p={[s * 34.2, .1, 2.9]} s={[.3, .2, 23]} c="#cfc9bd" r={.7} />)}
    {/* islands */}
    {ISLANDS.map((i, k) => <Island key={k} {...i} mat={foliage} />)}
    {/* hedges along the building */}
    {[-1, 1].flatMap(s => hedgeSegs.map(([a, b]) => { const x0 = s < 0 ? a : -b, x1 = s < 0 ? b : -a; return <Hedge key={`${s}${a}`} x={(x0 + x1) / 2} z={-9.25} w={Math.abs(x1 - x0)} d={1} mat={foliage} />; }))}
    {/* foreground planting */}
    {[-1, 1].map(s => <Hedge key={s} x={s * 21} y={.2} z={14.9} w={26} d={1.2} h={.9} mat={foliage} />)}
    {/* lamps */}
    {LAMPS.slice(0, lite ? 2 : 4).map(([x, z], i) => <Lamp key={i} x={x} z={z} />)}
    {/* ground uplights at the island trees */}
    {wells.map((p, i) => <mesh key={i} position={p} material={wellMat}><cylinderGeometry args={[.14, .14, .08, 10]} /></mesh>)}
    <ReservedSign />
    <Monument position={[-29, 0, 11]} rotY={.4} />
  </group>;
}
