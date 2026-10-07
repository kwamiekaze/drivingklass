import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { FleetCar, fleetFiles, type CarSignal } from './Fleet';
import { CAST, PLATES } from './cast';
import { detectTier } from './quality';
import { carAt, intro } from './intro';
import { park, parkCarAt } from './park';

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
  useFrame((_, dt) => {
    const m = g.current; if (!m) return;
    if (park.phase !== 'idle') {
      // the parallel-parking drive (park.ts): the pose, the signals and the weight of the car all come from the simulated steering
      const c = parkCarAt(park.t);
      m.position.set(c.x, c.y, c.z); m.rotation.y = c.yaw;
      m.visible = !(park.kind === 'exit' && park.phase === 'done');       // the car has driven out of the scene
      signal.current.left = c.left; signal.current.right = c.right;
      const b = body.current, k = 1 - Math.exp(-6 * Math.min(dt, .05));
      if (b) { const L = lean.current; L.pitch += (Math.max(-.035, Math.min(.035, .011 * c.accel)) - L.pitch) * k; L.roll += (Math.max(-.03, Math.min(.03, .0045 * c.lat)) - L.roll) * k; b.rotation.z = L.pitch; b.rotation.x = L.roll; }
      return;
    }
    const c = carAt(intro.t, intro.t3);
    m.position.set(c.x, c.y, c.z); m.rotation.y = c.yaw;
    signal.current.left = c.left; signal.current.right = c.right;
  });
  const c0 = carAt(intro.t, intro.t3);
  return <group ref={g} position={[c0.x, c0.y, c0.z]} rotation-y={c0.yaw}>
    <group ref={body}>
      <FleetCar specId={CAST} color="#f2b92a" plate={PLATES[CAST]} position={[0, 0, 0]} rotationY={0} lite={lite} signal={signal} />
    </group>
  </group>;
}
