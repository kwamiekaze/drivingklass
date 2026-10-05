import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { FleetCar, type CarSignal } from './Fleet';
import { carAt, intro } from './intro';

/**
 * The orange DrivingKlass sports car of the opening shot. It drives the avenue, waits at the stop sign, signals right,
 * turns onto the street, signals left into the east driveway, turns left again into the aisle, then signals right and
 * parks in the reserved stall for good. The route and the blinker times live in intro.ts.
 */
export function IntroCar({ lite }: { lite: boolean }) {
  const g = useRef<THREE.Group>(null);
  const signal = useRef<CarSignal>({ left: false, right: false });
  useFrame(() => {
    const m = g.current; if (!m) return;
    const c = carAt(intro.t, intro.t3);
    m.position.set(c.x, c.y, c.z); m.rotation.y = c.yaw;
    signal.current.left = c.left; signal.current.right = c.right;
  });
  const c0 = carAt(intro.t, intro.t3);
  return <group ref={g} position={[c0.x, c0.y, c0.z]} rotation-y={c0.yaw}>
    <FleetCar specId="camry" color="#f2b92a" plate="DK27RR" position={[0, 0, 0]} rotationY={0} lite={lite} signal={signal} />
  </group>;
}
