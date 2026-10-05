import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { FleetCar } from './Fleet';
import { carAt, intro } from './intro';

/** The gold DrivingKlass car of the opening shot. It drives the avenue, waits at the stop sign, then parks in the reserved stall for good. */
export function IntroCar({ lite }: { lite: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const m = g.current; if (!m) return;
    const c = carAt(intro.t, intro.t3);
    m.position.set(c.x, .002, c.z); m.rotation.y = c.yaw;
  });
  const c0 = carAt(intro.t, intro.t3);
  return <group ref={g} position={[c0.x, .002, c0.z]} rotation-y={c0.yaw}>
    <FleetCar specId="hero" color="#f2b92a" plate="DK5STAR" position={[0, 0, 0]} rotationY={0} lite={lite} />
  </group>;
}
