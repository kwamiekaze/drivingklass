import { useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx } from './theme';
import { palette } from './palette';
import { useStarGeometry, starShape } from './parts';

/**
 * The Star Pad: a gold rimmed turntable in the middle of the course with a five point star inlay, a chasing LED ring,
 * five stars orbiting overhead and a soft light column. Anything placed in `children` sits on the pad (y = pad top).
 * Pad radius 3.0 m, top surface at y .15 above the asphalt.
 */
export const PAD_TOP = .15;
const R = 3.0;

export function StarPad({ position, children }: { position: [number, number, number]; children?: ReactNode }) {
  const mix = useContext(NightCtx);
  const inlay = useMemo(() => { const g = new THREE.ExtrudeGeometry(starShape(2.15), { depth: .03, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; }, []);
  const orbitStar = useStarGeometry(.3, .09);
  const leds = useRef<THREE.InstancedMesh>(null), orbit = useRef<THREE.Group>(null), column = useRef<THREE.Mesh>(null), light = useRef<THREE.SpotLight>(null);
  const N = 56;
  const colMat = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d')!;
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,230,160,0)'); gr.addColorStop(.7, 'rgba(255,220,140,.5)'); gr.addColorStop(1, 'rgba(255,214,120,.9)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  }, []);
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color() }), []);
  useLayoutEffect(() => {
    const m = leds.current; if (!m) return;
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; tmp.o.position.set(Math.cos(a) * (R + .13), PAD_TOP - .01, Math.sin(a) * (R + .13)); tmp.o.rotation.set(0, -a, 0); tmp.o.updateMatrix(); m.setMatrixAt(i, tmp.o.matrix); m.setColorAt(i, tmp.c.set('#ffcf6a')); }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tmp]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, n = mix.current, m = leds.current;
    if (m) { for (let i = 0; i < N; i++) { const k = .22 + .78 * Math.pow(.5 + .5 * Math.sin(i * .36 - t * 3.2), 3); tmp.c.set('#ffcf6a').multiplyScalar(.35 + k * (1.1 + n * 2)); m.setColorAt(i, tmp.c); } if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    if (orbit.current) { orbit.current.rotation.y = t * .28; orbit.current.children.forEach((c, i) => { c.position.y = 1.15 + Math.sin(t * 1.3 + i * 1.26) * .12; c.rotation.y = t * 1.1 + i; }); }
    colMat.opacity = .12 + .2 * n;
    if (light.current) light.current.intensity = 2 + 70 * n;
  });
  return <group position={position}>
    <mesh position={[0, PAD_TOP / 2 - .02, 0]} receiveShadow><cylinderGeometry args={[R, R + .08, PAD_TOP, 72]} /><meshPhysicalMaterial color="#0d0d11" roughness={.22} metalness={.4} clearcoat={1} clearcoatRoughness={.08} /></mesh>
    <mesh position={[0, PAD_TOP - .012, 0]} rotation-x={-Math.PI / 2} receiveShadow><ringGeometry args={[R - .05, R + .14, 72]} /><meshStandardMaterial color={palette.goldBright} metalness={1} roughness={.22} /></mesh>
    <mesh position={[0, PAD_TOP - .02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[R - .35, R - .3, 72]} /><meshStandardMaterial color={palette.gold} metalness={1} roughness={.3} /></mesh>
    <mesh geometry={inlay} position={[0, PAD_TOP - .02, 0]} receiveShadow><meshStandardMaterial color={palette.goldBright} metalness={.85} roughness={.3} emissive="#e0a83a" emissiveIntensity={.4} envMapIntensity={1.6} /></mesh>
    <instancedMesh ref={leds} args={[undefined, undefined, N]} frustumCulled={false}><boxGeometry args={[.09, .05, .34]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <group ref={orbit}>
      {[0, 1, 2, 3, 4].map(i => { const a = (i / 5) * Math.PI * 2; return <mesh key={i} geometry={orbitStar} position={[Math.cos(a) * (R + .75), 1.15, Math.sin(a) * (R + .75)]}><meshStandardMaterial color={palette.goldBright} metalness={1} roughness={.2} emissive="#ffb830" emissiveIntensity={.6} /></mesh>; })}
    </group>
    <mesh ref={column} position={[0, 4.6, 0]} material={colMat}><cylinderGeometry args={[R * .55, R * .9, 9, 40, 1, true]} /></mesh>
    <spotLight ref={light} position={[0, 10.5, 0]} angle={.42} penumbra={.85} distance={24} decay={1.5} color="#ffe3a8" intensity={2} />
    <group position={[0, PAD_TOP, 0]}>{children}</group>
  </group>;
}
