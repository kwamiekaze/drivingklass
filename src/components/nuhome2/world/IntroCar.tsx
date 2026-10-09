import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { FleetCar, fleetFiles, type CarSignal, type WheelState } from './Fleet';
import { CAST, PLATES } from './cast';
import { detectTier } from './quality';
import { carAt, intro } from './intro';
import { park, parkCarAt, DMAX, WB } from './park';

/**
 * The car of the opening shot: a different one of the fleet each page load (see cast.ts). It drives the avenue, waits at the stop sign, signals right,
 * turns onto the street, signals left into the east driveway, turns left again into the aisle, then signals right and
 * parks in the reserved stall for good. The route and the blinker times live in intro.ts.
 */
/** Begin loading the school car the moment this file is imported, the right size for this device. */
if (typeof window !== 'undefined') { const f = fleetFiles(CAST); if (f) useGLTF.preload(detectTier() === 'lite' ? f.lite : f.full); }

export function IntroCar({ lite }: { lite: boolean }) {
  const g = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const signal = useRef<CarSignal>({ left: false, right: false });
  const lean = useRef({ pitch: 0, roll: 0 });
  const wheels = useRef<WheelState>({ steer: 0, dist: 0 });
  const last = useRef<{ x: number; z: number; yaw: number } | null>(null);
  /** The front wheels and the rolling of all four: the distance the car moved along its own nose, and the wheel angle (from the park simulation, or, on the opening drive, from how fast the heading turns per metre: tan(steer) = wheelbase * dyaw / ds). */
  const roll = (x: number, z: number, yaw: number, dt: number, steerNow: number | null) => {
    const w = wheels.current, p = last.current; last.current = { x, z, yaw };
    if (!p) return;
    const ds = (x - p.x) * Math.cos(yaw) - (z - p.z) * Math.sin(yaw);
    let dy = yaw - p.yaw; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI;
    if (Math.abs(ds) > 1.5 || Math.abs(dy) > .6) return;   // the car was put somewhere (a jump), not driven there
    w.dist += ds;
    let target = steerNow;
    if (target === null) target = Math.abs(ds) > 2e-4 ? Math.atan(WB * dy / ds) : w.steer;
    target = Math.max(-DMAX, Math.min(DMAX, target));
    w.steer += (target - w.steer) * (1 - Math.exp(-20 * Math.min(dt, .05)));
  };
  useFrame((_, dt) => {
    const m = g.current; if (!m) return;
    if (park.phase !== 'idle') {
      // the parallel-parking drive (park.ts): the pose, the signals and the weight of the car all come from the simulated steering
      const c = parkCarAt(park.t);
      m.position.set(c.x, c.y, c.z); m.rotation.y = c.yaw;
      m.visible = !(park.kind === 'exit' && park.phase === 'done');       // the car has driven out of the scene
      roll(c.x, c.z, c.yaw, dt, c.steer);
      signal.current.left = c.left; signal.current.right = c.right;
      const b = body.current, k = 1 - Math.exp(-6 * Math.min(dt, .05));
      if (b) { const L = lean.current; L.pitch += (Math.max(-.035, Math.min(.035, .011 * c.accel)) - L.pitch) * k; L.roll += (Math.max(-.03, Math.min(.03, .0045 * c.lat)) - L.roll) * k; b.rotation.z = L.pitch; b.rotation.x = L.roll; }
      return;
    }
    const c = carAt(intro.t, intro.t3);
    m.position.set(c.x, c.y, c.z); m.rotation.y = c.yaw;
    signal.current.left = c.left; signal.current.right = c.right;
    roll(c.x, c.z, c.yaw, dt, null);
  });
  const c0 = carAt(intro.t, intro.t3);
  return <group ref={g} position={[c0.x, c0.y, c0.z]} rotation-y={c0.yaw}>
    <group ref={body}>
      <FleetCar specId={CAST} color="#f2b92a" plate={PLATES[CAST]} position={[0, 0, 0]} rotationY={0} lite={lite} signal={signal} wheels={wheels} />
    </group>
  </group>;
}
