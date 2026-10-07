import { useMemo, useRef, useState } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { intro, T_DRIVE, parkCarNow } from './intro';
import { canStartPark, park, startPark } from './park';
import { BAY, BAY_LINE, PBOX, STOP_LINE } from './rearlot';
import { SOLIDS } from './colliders';

/**
 * The four "!" markers of the back lot: the same glowing orange disc, white exclamation mark and pulsing ring as the repair markers of fixing365.com.
 *   parallel   beside the parallel-parking space, at the east end of the box: the car that opened the page backs out of its stall and parallel parks (park.ts)
 *   bay        right behind the closed end of the reverse bay: the car reverses into the bay (from its stall, or by backing out of the parallel box first)
 *   turn       just past the east white line (the old stop line): the car drives out of the bay, turns LEFT onto the lane and stops with its nose at that line
 *   back       just past the west white line: the car backs slowly and straight until its tail touches that line (the exit sign appears when it gets there)
 * Each keeps a steady size on screen at any distance and is hidden while the car is working and once it has no drive left to offer. The parallel one is there from the
 * first frame of the page: if it is pressed while the opening drive is still running, the car goes straight to its stall and the parking drive starts at once.
 * The discs are drawn without a depth test, so the ground never cuts a ring: it shows whole from every angle. They are hidden, whole, when a solid object (the building, the
 * street sign, a wall, a parked car) stands between the lens and the marker: a sight line from the lens to the marker is tested against colliders.ts every frame.
 */
type SpotKind = 'parallel' | 'bay' | 'turn' | 'back';
const ringGeo = new THREE.RingGeometry(.78, 1, 48), discGeo = new THREE.CircleGeometry(.64, 40), barGeo = new THREE.PlaneGeometry(.17, .44), dotGeo = new THREE.CircleGeometry(.105, 20), hitGeo = new THREE.SphereGeometry(1.7, 10, 8), haloGeo = new THREE.CircleGeometry(1.6, 40);
const white = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, depthTest: false, depthWrite: false });
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
/** Does a solid stand between a and b (world points)? Boxes and upright cylinders, by the slab method; thin things (cones, lamp posts, wires) never hide a marker. */
function blocked(a: THREE.Vector3, b: THREE.Vector3): boolean {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  for (const sd of SOLIDS) {
    if (sd.k === 'wire' || (sd.k === 'cyl' && sd.r < .5)) continue;
    let t0 = 0, t1 = 1;
    const slab = (p: number, d: number, lo: number, hi: number) => {
      if (Math.abs(d) < 1e-9) return p >= lo && p <= hi;
      let u = (lo - p) / d, v = (hi - p) / d; if (u > v) { const w = u; u = v; v = w; }
      t0 = Math.max(t0, u); t1 = Math.min(t1, v); return t0 <= t1;
    };
    if (sd.k === 'box') { if (slab(a.x, dx, sd.min[0], sd.max[0]) && slab(a.y, dy, sd.min[1], sd.max[1]) && slab(a.z, dz, sd.min[2], sd.max[2])) return true; continue; }
    if (!slab(a.y, dy, sd.y0, sd.y1)) continue;
    const ox = a.x - sd.x, oz = a.z - sd.z, A = dx * dx + dz * dz, B = 2 * (ox * dx + oz * dz), C = ox * ox + oz * oz - sd.r * sd.r;
    if (A < 1e-9) { if (C <= 0) return true; continue; }
    const disc = B * B - 4 * A * C; if (disc < 0) continue;
    const q = Math.sqrt(disc), u = (-B - q) / (2 * A), v = (-B + q) / (2 * A);
    if (Math.max(t0, u) <= Math.min(t1, v)) return true;
  }
  return false;
}
function makeHalo() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.5)'); r.addColorStop(.4, 'rgba(255,255,255,0.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: '#ff9a4a', transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
}
/** Where the marker floats: just past the east end of the box, level with its middle, at about the height of a car roof. */
/** The hero car is in its stall once the entrance drive is over; no need to wait for the whole opening tour. */
const ready = () => intro.done || intro.t >= intro.t3 + T_DRIVE;

export const SPOT_POS: [number, number, number] = [PBOX.x1 + 1.7, 1.6, (PBOX.zKerb + PBOX.zLane) / 2];
export const BAY_SPOT_POS: [number, number, number] = [(BAY.xW + BAY.xE) / 2, 1.6, BAY.zEnd - 1.3];
const LANE_MID = (STOP_LINE.z0 + STOP_LINE.z1) / 2;
/** The turnabout's "!": just past the east white line (the old stop line), where the car's nose comes to rest after the left turn. */
export const TURN_SPOT_POS: [number, number, number] = [STOP_LINE.x + 1.6, 1.6, LANE_MID];
/** The straight back's "!": just past the west white line (the blue-circled one), where the car's tail comes to rest. */
export const BACK_SPOT_POS: [number, number, number] = [BAY_LINE.x - 1.6, 1.6, LANE_MID];
const SPOTS = { parallel: SPOT_POS, bay: BAY_SPOT_POS, turn: TURN_SPOT_POS, back: BACK_SPOT_POS };
/** Is this marker on offer now? Not while a drive runs; the parallel one from the very first frame; the bay from the stall (once the car is in it) or the box. */
const offered = (kind: SpotKind) => canStartPark(kind) && (kind === 'parallel' || park.loc !== 'front' || ready());

export function ParkSpot({ kind, reducedMotion = false }: { kind: SpotKind; reducedMotion?: boolean }) {
  const [hover, setHover] = useState(false);
  const outer = useRef<THREE.Group>(null), holder = useRef<THREE.Group>(null), ring = useRef<THREE.Mesh>(null), disc = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const mats = useMemo(() => ({ halo: makeHalo(), ring: new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, depthTest: false, toneMapped: false, depthWrite: false }), disc: new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, depthTest: false, depthWrite: false, toneMapped: false }) }), []);
  const seen = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3() }), []);
  useFrame(({ clock, camera }) => {
    const o = outer.current, h = holder.current; if (!o || !h) return;
    let show = offered(kind);
    if (show) { seen.a.copy(camera.position); seen.b.set(...SPOTS[kind]); seen.b.lerp(seen.a, Math.min(1, 1.0 / Math.max(1e-3, seen.a.distanceTo(seen.b)))); show = !blocked(seen.a, seen.b); }   // hidden whole while a solid is in the way (the sight line stops 1 m short of the marker)
    if (o.visible !== show) o.visible = show;
    if (!show) { if (hover) { setHover(false); document.body.style.cursor = 'auto'; } return; }
    // a steady size on screen: small up close, never lost from far away
    const d = camera.position.distanceTo(h.getWorldPosition(tmp));
    h.scale.setScalar(Math.min(3.4, Math.max(.34, d * .03)));
    const t = reducedMotion ? .4 : (clock.elapsedTime * .8) % 1;
    if (ring.current) { ring.current.scale.setScalar(1 + t * 1.2); mats.ring.opacity = (1 - t) * .85; }
    if (disc.current) { const s = hover ? 1.25 : 1; disc.current.scale.lerp(tmp.set(s, s, s), .2); }
  });
  const choose = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 8) return; if (offered(kind)) { document.body.style.cursor = 'auto'; if (!ready()) parkCarNow(); startPark(kind); } };   // pressed during the opening drive: the car is put in its stall now
  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; };
  const out = () => { setHover(false); document.body.style.cursor = 'auto'; };
  return <group ref={outer} visible={false} name={`park-spot-${kind}`}>
    <Billboard position={SPOTS[kind]} ref={holder}>
      <group onClick={choose} onPointerOver={over} onPointerOut={out}>
        <mesh geometry={hitGeo} material={hitMat} />
        <mesh geometry={haloGeo} material={mats.halo} renderOrder={9} />
        <mesh ref={ring} geometry={ringGeo} material={mats.ring} renderOrder={10} />
        <group ref={disc}>
          <mesh geometry={discGeo} material={mats.disc} renderOrder={11} />
          <group renderOrder={12}>
            <mesh geometry={barGeo} material={white} position={[0, .1, .001]} />
            <mesh geometry={dotGeo} material={white} position={[0, -.27, .001]} />
          </group>
        </group>
      </group>
    </Billboard>
  </group>;
}
