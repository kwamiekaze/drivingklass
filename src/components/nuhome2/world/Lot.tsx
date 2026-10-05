import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx, radialTexture, rng } from './theme';
import { Box, Cyl, SIGN_FONT, V3, makeCanvasTexture, starShape } from './parts';
import { CAR_SPECS } from './Cars';
import { IntroCar } from './IntroCar';
import { FLEET_COLORS, FleetCar } from './Fleet';
const FLEET_ORDER = [FLEET_COLORS.white, FLEET_COLORS.red, FLEET_COLORS.green, FLEET_COLORS.yellow, FLEET_COLORS.black];
import { StopSign } from './StopSign';
import { Plant } from './Plants';
import { Halo, champagneMat, starRow, useGlow, wordGeometry } from './Signage';

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
const PAINT_Y = .034, TOP_Y = .046, HI_Y = .16;   // long lines lie at PAINT_Y; the stop bars, zebra stripes and arrows sit above them at TOP_Y, so no two paints ever share a height

type Dec = { x: number; z: number; w: number; d: number };

/** Short pieces of paint (stop bars, zebra stripes, wide stall lines): flat quads on their own layer, above the long lines. */
function Decals({ items, color, y = TOP_Y }: { items: Dec[]; color: string; y?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.set(it.x, y, it.z); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(it.w, it.d, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items, y]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow frustumCulled={false}>
    <planeGeometry args={[1, 1]} /><meshStandardMaterial color={color} roughness={.8} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
  </instancedMesh>;
}

/**
 * Long painted lines are drawn as a strip texture repeated along the road, not as thin geometry. A texture is mipmapped and
 * anisotropically filtered, so a line that is a fraction of a pixel wide at a distance fades smoothly instead of breaking
 * into dashes and shimmering as the camera moves. `lines` are [centre offset, width] in metres across a road `span` metres wide;
 * the texel coverage is computed exactly, so edges are perfectly anti-aliased at every size.
 */
function stripTexture(lines: [number, number][], span: number, across: 'u' | 'v'): THREE.DataTexture {
  const N = Math.min(2048, Math.ceil(span / .02)), L = 8, data = new Uint8Array(N * L * 4);
  for (let i = 0; i < N; i++) {
    const a = -span / 2 + (i * span) / N, b = a + span / N; let cov = 0;
    for (const [c, w] of lines) cov += Math.max(0, Math.min(b, c + w / 2) - Math.max(a, c - w / 2));
    const v = Math.round(255 * Math.min(1, cov / (span / N)));
    for (let j = 0; j < L; j++) { const k = (across === 'u' ? j * N + i : i * L + j) * 4; data[k] = data[k + 1] = data[k + 2] = v; data[k + 3] = 255; }
  }
  const t = across === 'u' ? new THREE.DataTexture(data, N, L, THREE.RGBAFormat) : new THREE.DataTexture(data, L, N, THREE.RGBAFormat);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;   // the stall rows repeat across the strip too; the road strips are empty at their edges, so nothing wraps visibly
  t.needsUpdate = true; return t;
}
/**
 * One strip of paint over a road. The texture holds one repeat across `span` metres; `across` says which way the lines vary
 * ('u': across x and running along z, 'v': across z and running along x). The plane is `width` (x) by `height` (z) metres and the
 * texture repeats `repeat` times along the way the lines run (or along x for a row of stall lines, whose tile is one bay).
 */
function PaintStrip({ lines, span, across, color, x, z, width, height, repeat, y = PAINT_Y }: { lines: [number, number][]; span: number; across: 'u' | 'v'; color: string; x: number; z: number; width: number; height: number; repeat: [number, number]; y?: number }) {
  const tex = useMemo(() => { const t = stripTexture(lines, span, across); t.repeat.set(repeat[0], repeat[1]); return t; }, [lines, span, across, repeat]);
  return <mesh rotation-x={-Math.PI / 2} position={[x, y, z]} renderOrder={1} receiveShadow>
    <planeGeometry args={[width, height]} />
    <meshStandardMaterial color={color} alphaMap={tex} transparent depthWrite={false} roughness={.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
  </mesh>;
}

function Arrows({ items }: { items: { x: number; z: number; yaw: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 1.6); s.lineTo(.62, .55); s.lineTo(.2, .55); s.lineTo(.2, -1.6); s.lineTo(-.2, -1.6); s.lineTo(-.2, .55); s.lineTo(-.62, .55); s.closePath(); return new THREE.ShapeGeometry(s); }, []);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.set(it.x, TOP_Y, it.z); o.rotation.set(-Math.PI / 2, 0, it.yaw); o.scale.set(1, 1, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, undefined, items.length]} frustumCulled={false}><meshStandardMaterial color="#e8e6df" roughness={.8} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></instancedMesh>;
}

/** The short pieces of paint. The long lines (stall rows, street and avenue lines) are PaintStrip textures. */
function markings() {
  const white: Dec[] = [], avenueW: Dec[] = [], cross: Dec[] = [];
  [-1, 1].forEach(s => white.push({ x: s * 1.375, z: -6, w: .16, d: 5 }));   // the reserved stall's lines are a little heavier
  white.push({ x: -31.7, z: 13.3, w: 5, d: .45 });
  // the avenue's own crosswalk, across the gap in the far pavement: ten bars running along the road, inside the white edge lines
  for (let k = 0; k < 10; k++) cross.push({ x: (k - 4.5) * .72, z: 33.45, w: .62, d: 2.6 });
  [-1, 1].forEach(s => { for (let z = 19.8; z < 30.9; z += .9) cross.push({ x: s * 7.4, z, w: 2.6, d: .45 }); });
  return { white, avenueW, cross };
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
    <Plant kind="ball" y={.62} seed={5} scale={.75} />
  </group>;
}

function ReservedSign() {
  const tex = useMemo(() => makeCanvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#0c0c0f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe4'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4efe4'; g.font = `700 36px ${SIGN_FONT}`; g.fillText('RESERVED', w / 2, 58);
    g.fillStyle = '#d9a621'; g.font = `600 24px ${SIGN_FONT}`; g.fillText('5 STAR DRIVER', w / 2, 108);
  }, 4), []);
  return <group position={[-1.75, 0, -8.15]}>
    <Cyl p={[0, .845, -.05]} r={.035} h={1.69} c="#1a1a1e" m={.6} rough={.4} seg={8} />
    <mesh position={[0, 1.44, -.012]}><boxGeometry args={[.84, .54, .02]} /><meshStandardMaterial color="#1a1a1e" metalness={.5} roughness={.5} /></mesh>
    <mesh position={[0, 1.44, .0]}><planeGeometry args={[.82, .52]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
  </group>;
}

/** The street sign. Front (toward the street): black granite, a champagne frame, five faceted stars, cast DRIVINGKLASS and the slogan.
 *  The back is plain granite with the frame. Limestone cap and plinth, uplights, a low hedge at each end. */
function Monument({ position, pl, lite }: { position: V3; pl: Plant; lite: boolean }) {
  const mix = useContext(NightCtx);
  const PW = 6.0, PH = 2.35, PD = .5, PY = .82 + PH / 2;                     // panel size and centre height
  const metal = useMemo(() => champagneMat(), []);
  const granite = useMemo(() => { const t = makeCanvasTexture(256, 256, (g, w, h) => { const r = rng(21); g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = 18 + r() * 40; g.fillStyle = `rgba(${v},${v},${v + 3},${.25 + r() * .3})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); } }, 4, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, color: '#ffffff', roughness: .38, metalness: .25 }); }, []);
  const word = useMemo(() => wordGeometry('DRIVINGKLASS', 4.7, .09, .025, .05, lite ? 3 : 6), [lite]);
  // The slogan is painted, not cut: letters 12 cm tall and a few millimetres thick shimmer and crawl from far away as 3D geometry.
  // A mipmapped, anisotropic texture of larger, bolder letters stays calm at every distance and crisp up close.
  const slogan = useMemo(() => makeCanvasTexture(2048, 176, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.textBaseline = 'middle'; g.textAlign = 'left';
    const text = 'WHERE 5 STAR DRIVERS ARE MADE'; let size = 104, track = size * .09;
    const measure = () => { g.font = `800 ${size}px ${SIGN_FONT}`; return [...text].reduce((a, c) => a + g.measureText(c).width + track, -track); };
    while (measure() > w - 70 && size > 40) { size -= 2; track = size * .09; }
    let x = (w - measure()) / 2; const gr = g.createLinearGradient(0, h * .2, 0, h * .85); gr.addColorStop(0, '#fff3cf'); gr.addColorStop(.55, '#f0d78e'); gr.addColorStop(1, '#d8b45a');
    g.lineJoin = 'round'; g.lineWidth = size * .07; g.strokeStyle = 'rgba(40,28,6,.55)';
    for (const c of text) { g.strokeText(c, x, h / 2 + 4); g.fillStyle = gr; g.fillText(c, x, h / 2 + 4); x += g.measureText(c).width + track; }
  }, 16), []);
  const front = useMemo(() => starRow([.2, .2, .2, .2, .2], .56, .5), []);
  const lens = useRef<THREE.MeshStandardMaterial>(null);
  useGlow([metal], .02, .75);
  useFrame(() => { if (lens.current) lens.current.emissiveIntensity = .5 + 2.6 * mix.current; });
  const bar = (w: number, h: number, x: number, y: number, z: number, t = .03) => <mesh key={`${x}${y}${w}${z}`} position={[x, y, z]} material={metal}><boxGeometry args={[w, h, t]} /></mesh>;
  const frame = (z: number, sgn: number) => { const fw = PW - .3, fh = PH - .3, iw = fw - .2, ih = fh - .2, zz = z + sgn * .012; return [
    bar(fw, .07, 0, PY + fh / 2, zz), bar(fw, .07, 0, PY - fh / 2, zz), bar(.07, fh, -fw / 2, PY, zz), bar(.07, fh, fw / 2, PY, zz),
    bar(iw, .022, 0, PY + ih / 2, zz), bar(iw, .022, 0, PY - ih / 2, zz), bar(.022, ih, -iw / 2, PY, zz), bar(.022, ih, iw / 2, PY, zz)]; };
  return <group position={position}>
    <Box p={[0, .25, 0]} s={[7.1, .5, 1.45]} c="#d9ceb4" r={.85} />
    <Box p={[0, .66, 0]} s={[6.7, .32, 1.2]} c="#e2d8c0" r={.85} />
    <mesh position={[0, PY, 0]} material={granite} castShadow><boxGeometry args={[PW, PH, PD]} /></mesh>
    <Box p={[0, .82 + PH + .1, 0]} s={[6.5, .2, .8]} c="#e6dcc6" r={.8} />
    <Box p={[0, .82 + PH + .22, 0]} s={[6.62, .05, .9]} c="#d9ceb4" r={.8} />
    {frame(PD / 2, 1)}{frame(-PD / 2, -1)}
    {/* front */}
    <mesh geometry={front} material={metal} position={[0, PY + .72, PD / 2 + .012]} />
    <mesh geometry={word} material={metal} position={[0, PY - .02 - .3, PD / 2 + .012]} castShadow />
    <mesh position={[0, PY - .76, PD / 2 + .02]} renderOrder={2}><planeGeometry args={[4.75, 4.75 * 176 / 2048]} /><meshBasicMaterial map={slogan} transparent toneMapped={false} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} /></mesh>
    <Halo position={[0, PY + .1, PD / 2 + .05]} size={[7.4, 3.2]} strength={.34} />
    {/* uplights at the foot of the plinth and a low hedge at each end */}
    {[-2.6, 2.6].map(x => <group key={x} position={[x, .06, .88]}>
      <mesh position={[0, .06, 0]}><boxGeometry args={[.3, .16, .26]} /><meshStandardMaterial color="#1c1c20" roughness={.5} metalness={.5} /></mesh>
      <mesh position={[0, .14, -.02]} rotation-x={-.5}><boxGeometry args={[.22, .03, .2]} /><meshStandardMaterial ref={x < 0 ? lens : undefined} color="#fff0cc" emissive="#ffc77a" emissiveIntensity={.6} /></mesh>
    </group>)}
    {[-1, 1].map(s => <Hedge key={s} x={s * 4.3} z={0} w={1.5} d={1.0} h={.62} y={0} seed={31 + s} pl={pl} density={.8} />)}
  </group>;
}

function roadGeo(w: number, h: number) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 10, uv.getY(i) * h / 10); return g; }

// across the street (z, from its centre line): the double centre line and the two edge lines; across the avenue (x): edge lines and the yellow centre pair
// (a line at offset c on the street strip lies at world z = 25.25 - c, so the near edge, z 19.95, is +5.3 and the far edge, z 30.55, is -5.3)
const STREET_CENTRE: [number, number][] = [[-.09, .1], [.09, .1]];
const STREET_NEAR: [number, number][] = [[5.3, .14]];
const STREET_FAR: [number, number][] = [[-5.3, .14]];
const AVENUE_EDGES: [number, number][] = [[-3.85, .14], [3.85, .14]];
const AVENUE_CENTRE: [number, number][] = [[-.09, .1], [.09, .1]];
/** The stall lines, one line per 2.75 m bay, repeated along the row. */
const STALL_LINE: [number, number][] = [[0, .1]];
const AVENUE_REPEAT: [number, number] = [1, 52], ROW_A_REPEAT: [number, number] = [22, 1], ROW_B_REPEAT: [number, number] = [9, 1];

/** Radius of the paint that curves from the avenue's edge lines round into the street's far edge line. */
const CORNER_R = 1.2;
const STREET_PIECES: [[number, number][], number, number][] = [
  [STREET_CENTRE, 8.85, 28.8], [STREET_CENTRE, 34.6, 260], [STREET_CENTRE, -260, -8.85],
  [STREET_FAR, 3.85 + CORNER_R, 260], [STREET_FAR, -260, -(3.85 + CORNER_R)],
  [STREET_NEAR, 4.2, 28.8], [STREET_NEAR, 34.6, 260], [STREET_NEAR, -29.1, -4.2], [STREET_NEAR, -260, -34.3],
];

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
    {/* street paint, in pieces so it can break where the real thing does: the centre pair stops at the crosswalks and opens opposite the
        entrance (x +31.7); the near edge line breaks at the avenue and at both driveways (a little wider at the entrance); the far edge
        line stops where the avenue's edge lines curve round into it */}
    {STREET_PIECES.map(([lines, a, b], i) => <PaintStrip key={i} lines={lines} span={12.2} across="v" color="#e8e6df" x={(a + b) / 2} z={25.25} width={b - a} height={12.2} repeat={[(b - a) / 4, 1]} />)}
    {[-1, 1].map(s => <mesh key={`fil${s}`} rotation-x={-Math.PI / 2} position={[s * (3.85 + CORNER_R), PAINT_Y, 30.55 + CORNER_R]} renderOrder={1} receiveShadow>
      <ringGeometry args={[CORNER_R - .07, CORNER_R + .07, 28, 1, s > 0 ? Math.PI / 2 : 0, Math.PI / 2]} />
      <meshStandardMaterial color="#e8e6df" roughness={.8} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>)}
    <PaintStrip lines={AVENUE_EDGES} span={8.2} across="u" color="#e8e6df" x={0} z={(31.75 + 240) / 2} width={8.2} height={240 - 31.75} repeat={AVENUE_REPEAT} />
    <PaintStrip lines={AVENUE_CENTRE} span={8.2} across="u" color="#d9a621" x={0} z={(36.9 + 240) / 2} width={8.2} height={240 - 36.9} repeat={AVENUE_REPEAT} />   {/* the double yellow ends at the stop bar, as on a real road */}
    <Decals items={mk.avenueW} color="#e8e6df" /><Decals items={mk.cross} color="#f1efe8" />
    {/* the stop bar on the inbound (right-hand) lane, 0.6 m in front of where the school car stops, as bright as the zebra paint (drawn without a shadow lookup, so it never greys at the edge of the shadow map) */}
    <mesh rotation-x={-Math.PI / 2} position={[2.05, TOP_Y, 36.4]} renderOrder={2}><planeGeometry args={[3.7, .5]} /><meshStandardMaterial color="#f1efe8" roughness={.8} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></mesh>
  </group>;
}

export function Lot({ lite, tier, asphalt }: { lite: boolean; tier: 'high' | 'mid' | 'lite'; asphalt: THREE.Material }) {
  const mix = useContext(NightCtx);
  const mk = useMemo(markings, []);
  const arrows = useMemo(() => [{ x: 31.7, z: 6, yaw: 0 }, { x: 31.7, z: -.2, yaw: 0 }, { x: -31.7, z: 6, yaw: Math.PI }, { x: -31.7, z: -.2, yaw: Math.PI }], []);
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
    { id: 'hero', x: 11, z: 5.5, r: -Math.PI / 2 }, { id: 'sentra', x: -13.75, z: 5.5, r: -Math.PI / 2 },
  ];
  return <group>
    <Decals items={mk.white} color="#e2dfd6" /><Arrows items={arrows} />
    {/* the stall lines: row A (z -6) from x -30.25 to 30.25, row B (z 5.5) on each side of the fountain drive, 5 m deep */}
    <PaintStrip lines={STALL_LINE} span={2.75} across="u" color="#e2dfd6" x={0} z={-6} width={60.5} height={5} repeat={ROW_A_REPEAT} />
    {[-1, 1].map(sg => <PaintStrip key={sg} lines={STALL_LINE} span={2.75} across="u" color="#e2dfd6" x={sg * 17.875} z={5.5} width={24.75} height={5} repeat={ROW_B_REPEAT} />)}
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
    <Monument position={[10.4, 0, 14.9]} pl={pl} lite={lite} />
    {/* the stop sign for traffic coming up the avenue: on the grass beside the avenue, just before the stop bar */}
    <StopSign position={[5.3, 0, 37.6]} />
    {/* three selected Meshy cars plus two house fleet sedans; every car receives the shared five-star roof topper */}
    {cars.map((c, i) => <FleetCar key={c.id} specId={c.id} color={FLEET_ORDER[i]!} plate={['DK24CO', 'DK25ML', 'DK26OR', 'DK29OR', 'DK28GA'][i]} position={[c.x, .002, c.z]} rotationY={c.r} lite={tier === 'lite'} />)}
    <IntroCar lite={lite} />
  </group>;
}
