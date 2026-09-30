import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx } from './theme';
import { palette } from './palette';
import { Box, Cyl, FONT, V3, drawSpaced, goldGradient, makeCanvasTexture, starShape } from './parts';

/*
 * The Course: lane paint, crosswalk, slalom cones, road signs and two working traffic signals.
 * Paint sits on the asphalt at y .014, the crosswalk on top at .026, so nothing shares a depth and nothing shimmers.
 * Plaza: x ±17, z -5.35 to 7.75. Traffic runs along x. Signs stand on the front edge facing the viewer.
 */
export const PAINT_Y = .014;

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

function laneMarkings() {
  const white: Dec[] = [], yellow: Dec[] = [], cross: Dec[] = [];
  const L = 16.4;
  white.push({ x: 0, z: -4.9, w: L * 2, d: .14 }, { x: 0, z: 7.3, w: L * 2, d: .14 });
  [-1, 1].forEach(s => { const a = 3.7, b = L, w = b - a; yellow.push({ x: s * (a + w / 2), z: 1.1, w, d: .1 }, { x: s * (a + w / 2), z: 1.3, w, d: .1 }); });
  [-1.8, 4.2].forEach(z => { for (let x = -15.6; x < 15.6; x += 3.4) { if (Math.abs(x + .9) < 4.2) continue; white.push({ x: x + .9, z, w: 1.8, d: .12 }); } });
  white.push({ x: 9.3, z: 4.3, w: .42, d: 5.8 }, { x: 13.1, z: -1.9, w: .42, d: 5.8 });
  for (let k = 0; k < 14; k++) { const z = -4.3 + k * .8; if (Math.abs(z - 1.2) < .5) continue; cross.push({ x: 11.2, z, w: 2.3, d: .44 }); }
  // parallel parking box, open to the lane
  white.push({ x: -12, z: 5.25, w: 4.4, d: .1 }, { x: -12, z: 6.95, w: 4.4, d: .1 }, { x: -14.2, z: 6.1, w: .1, d: 1.8 }, { x: -9.8, z: 6.1, w: .1, d: 1.8 });
  return { white, yellow, cross };
}

/** Slalom and parking cones: base plate, orange body and a white reflective band, three draw calls in total. */
function Cones() {
  const pos = useMemo<[number, number][]>(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < 7; i++) out.push([-15.2 + i * 1.8, -3.3]);
    out.push([-14.2, 5.25], [-9.8, 5.25], [-14.2, 6.95], [-9.8, 6.95]);
    return out;
  }, []);
  const a = useRef<THREE.InstancedMesh>(null), b = useRef<THREE.InstancedMesh>(null), c = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new THREE.Object3D();
    [a, b, c].forEach((r, k) => {
      const m = r.current; if (!m) return;
      pos.forEach(([x, z], i) => { d.position.set(x, k === 0 ? .03 : k === 1 ? .32 : .36, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
      m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
    });
  }, [pos]);
  return <group>
    <instancedMesh ref={a} args={[undefined, undefined, pos.length]} castShadow receiveShadow><boxGeometry args={[.42, .05, .42]} /><meshStandardMaterial color="#1a1a1e" roughness={.7} /></instancedMesh>
    <instancedMesh ref={b} args={[undefined, undefined, pos.length]} castShadow receiveShadow><coneGeometry args={[.17, .58, 18]} /><meshStandardMaterial color="#ff6a13" roughness={.5} emissive="#ff4a00" emissiveIntensity={.08} /></instancedMesh>
    <instancedMesh ref={c} args={[undefined, undefined, pos.length]}><cylinderGeometry args={[.104, .131, .14, 18]} /><meshStandardMaterial color="#fafafa" roughness={.4} emissive="#ffffff" emissiveIntensity={.12} /></instancedMesh>
  </group>;
}

type SignKind = 'stop' | 'yield' | 'speed' | 'school';

function signTexture(kind: SignKind) {
  return makeCanvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const c = w / 2;
    if (kind === 'stop') {
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const x = c + Math.cos(a) * 122, y = c + Math.sin(a) * 122; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
      g.fillStyle = '#c4161f'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = '#fff'; g.font = `800 76px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', c, c + 4);
    } else if (kind === 'yield') {
      g.beginPath(); g.moveTo(c, 232); g.lineTo(18, 34); g.lineTo(238, 34); g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#c4161f'; g.stroke();
      g.beginPath(); g.moveTo(c, 190); g.lineTo(62, 62); g.lineTo(194, 62); g.closePath(); g.lineWidth = 14; g.strokeStyle = '#c4161f'; g.stroke();
    } else if (kind === 'speed') {
      g.fillStyle = '#fff'; g.fillRect(24, 10, 208, 236); g.lineWidth = 6; g.strokeStyle = '#111'; g.strokeRect(24, 10, 208, 236);
      g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 34px ${FONT}`; g.fillText('SPEED', c, 54); g.fillText('LIMIT', c, 92);
      g.font = `800 112px ${FONT}`; g.fillText('25', c, 176);
    } else {
      g.beginPath(); g.moveTo(c, 10); g.lineTo(240, 100); g.lineTo(200, 240); g.lineTo(56, 240); g.lineTo(16, 100); g.closePath(); g.fillStyle = '#d6f016'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#111'; g.stroke();
      g.fillStyle = '#111'; g.font = `800 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCHOOL', c, 120); g.font = `800 30px ${FONT}`; g.fillText('ZONE', c, 170);
    }
  }, 8);
}

function RoadSign({ x, kind }: { x: number; kind: SignKind }) {
  const tex = useMemo(() => signTexture(kind), [kind]);
  return <group position={[x, 0, 8.45]}>
    <Cyl p={[0, 1.15, 0]} r={.04} h={2.3} c="#8a8f98" m={.8} rough={.35} seg={10} />
    <mesh position={[0, 2.25, .03]} castShadow><planeGeometry args={[.78, .78]} /><meshStandardMaterial map={tex} transparent alphaTest={.4} side={THREE.DoubleSide} roughness={.45} metalness={.15} /></mesh>
  </group>;
}

/** A working signal: green 6 s, yellow 1.6 s, red 5 s. `offset` shifts it so neighbours alternate. */
function Signal({ x, offset }: { x: number; offset: number }) {
  const lamps = useMemo(() => [0, 1, 2].map(i => new THREE.MeshStandardMaterial({ color: ['#ff4b3e', '#ffc93a', '#37d36b'][i], emissive: ['#ff2a1a', '#ffb000', '#14c050'][i], emissiveIntensity: .1, roughness: .35 })), []);
  const mix = useContext(NightCtx);
  useFrame(({ clock }) => {
    const c = (clock.elapsedTime + offset) % 12.6, on = c < 6 ? 2 : c < 7.6 ? 1 : 0;
    lamps.forEach((m, i) => { m.emissiveIntensity = i === on ? 2.4 + mix.current * 3 : .06; });
  });
  return <group position={[x, 0, 8.45]}>
    <Cyl p={[0, 1.6, 0]} r={.05} h={3.2} c="#2a2a30" m={.6} rough={.4} seg={10} />
    <Box p={[0, 3.0, .08]} s={[.34, .98, .24]} c="#0b0b0e" r={.4} />
    {[0, 1, 2].map(i => <mesh key={i} position={[0, 3.3 - i * .3, .21]} material={lamps[i]}><circleGeometry args={[.11, 20]} /></mesh>)}
    {[0, 1, 2].map(i => <mesh key={`h${i}`} position={[0, 3.3 - i * .3 + .04, .22]} rotation-x={-.25}><boxGeometry args={[.24, .02, .12]} /><meshStandardMaterial color="#0b0b0e" /></mesh>)}
  </group>;
}

/** Roadside pylon: five stars, the wordmark and the slogan. */
function Pylon({ position, rotY }: { position: V3; rotY: number }) {
  const mix = useContext(NightCtx);
  const tex = useMemo(() => ({
    base: makeCanvasTexture(720, 980, (g, w, h) => {
      g.fillStyle = '#0e0e12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9971f'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36); g.strokeStyle = 'rgba(242,193,78,.45)'; g.lineWidth = 2; g.strokeRect(34, 34, w - 68, h - 68);
      const sh = starShape(46); for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2 + (i - 2) * 110, 170); g.scale(1, -1); g.beginPath(); sh.getPoints().forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = goldGradient(g, -46, 46); g.fill(); g.restore(); }
      g.fillStyle = goldGradient(g, 330, 470); g.font = `800 112px ${FONT}`; drawSpaced(g, 'DRIVING', w / 2, 400, 10); g.font = `800 140px ${FONT}`; g.fillStyle = goldGradient(g, 500, 650); drawSpaced(g, 'KLASS', w / 2, 590, 12);
      g.fillStyle = '#c9971f'; g.fillRect(w / 2 - 200, 710, 400, 4);
      g.fillStyle = '#f6ede4'; g.font = `600 40px ${FONT}`; drawSpaced(g, 'WHERE 5 STAR DRIVERS', w / 2, 780, 3); drawSpaced(g, 'ARE MADE', w / 2, 834, 3);
    }),
    glow: makeCanvasTexture(720, 980, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      const sh = starShape(46); for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2 + (i - 2) * 110, 170); g.scale(1, -1); g.beginPath(); sh.getPoints().forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = '#ffd98a'; g.fill(); g.restore(); }
      g.fillStyle = '#ffd98a'; g.font = `800 112px ${FONT}`; drawSpaced(g, 'DRIVING', w / 2, 400, 10); g.font = `800 140px ${FONT}`; drawSpaced(g, 'KLASS', w / 2, 590, 12);
      g.fillStyle = '#f0e2c0'; g.font = `600 40px ${FONT}`; drawSpaced(g, 'WHERE 5 STAR DRIVERS', w / 2, 780, 3); drawSpaced(g, 'ARE MADE', w / 2, 834, 3);
    }, 2),
  }), []);
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: tex.base, emissiveMap: tex.glow, emissive: '#ffffff', emissiveIntensity: .2, roughness: .4, metalness: .3 }), [tex]);
  useFrame(() => { face.emissiveIntensity = .2 + 1.5 * mix.current; });
  return <group position={position} rotation-y={rotY}>
    <Box p={[0, .09, 0]} s={[2.9, .18, .9]} c="#22222a" r={.7} />
    <Box p={[0, 2.25, 0]} s={[2.5, 3.4, .3]} c="#0e0e12" r={.5} m={.2} />
    <mesh position={[0, 2.3, .16]} material={face}><planeGeometry args={[2.4, 3.27]} /></mesh>
    <mesh position={[0, 2.3, -.16]} rotation-y={Math.PI} material={face}><planeGeometry args={[2.4, 3.27]} /></mesh>
    <Box p={[0, 4.0, 0]} s={[2.6, .1, .36]} c={palette.goldBright} m={1} r={.25} />
  </group>;
}

export function Course() {
  const { white, yellow, cross } = useMemo(laneMarkings, []);
  return <group>
    <Decals items={white} color="#f4f1ea" />
    <Decals items={yellow} color="#f2c14e" emissive={.15} />
    <Decals items={cross} color="#f8f6ef" y={.026} />
    <Cones />
    <RoadSign x={-15} kind="speed" /><RoadSign x={-11.5} kind="yield" /><RoadSign x={-4.2} kind="stop" />
    <RoadSign x={4.2} kind="school" /><RoadSign x={11.5} kind="stop" /><RoadSign x={15} kind="speed" />
    <Signal x={-7.4} offset={0} /><Signal x={7.4} offset={6.3} />
    <Pylon position={[-20.4, 0, 9.6]} rotY={.32} />
  </group>;
}
