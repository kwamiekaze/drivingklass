import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx } from './theme';

/*
 * A small flock that is always in the air, circling the fountain and the front flower beds where the camera looks.
 * The Style Van sends a few across the whole estate now and then; here they are larger and always present, because
 * a butterfly crossing 90 m of scene every ten seconds is too small to ever notice. Each one follows its own looping path.
 */
const COLORS: [string, string][] = [['#f2c14e', '#fff3c4'], ['#ffd27a', '#c9971f'], ['#ffffff', '#f2c14e'], ['#e9a93a', '#fff0c2'], ['#fff3c4', '#d9a441'], ['#ffb43a', '#ffe9a8']];

function wing(upper: boolean, side: 1 | -1) {
  const s = new THREE.Shape();
  if (upper) { s.moveTo(0, 0); s.bezierCurveTo(-.05, .32, .32, .55, .42, .28); s.bezierCurveTo(.46, .1, .2, -.02, 0, 0); }
  else { s.moveTo(0, 0); s.bezierCurveTo(-.02, -.18, -.2, -.42, -.34, -.22); s.bezierCurveTo(-.36, -.06, -.14, 0, 0, 0); }
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(side * Math.PI / 2);
  return g;
}

type Path = { cx: number; cz: number; rx: number; rz: number; y: number; sp: number; ph: number; bob: number };

/** Orbit centres: the fountain, the two flower islands and the lawn beside the building. */
const CENTERS: [number, number, number, number][] = [[0, 6.6, 6, 5], [-13, 6.6, 9, 4], [13, 6.6, 9, 4], [-24, 0, 7, 8], [24, 0, 7, 8], [0, -2, 16, 4]];

function Butterfly({ index }: { index: number }) {
  const root = useRef<THREE.Group>(null), l = useRef<THREE.Group>(null), r = useRef<THREE.Group>(null);
  const mix = useContext(NightCtx);
  const [c1, c2] = COLORS[index % COLORS.length]!;
  const geo = useMemo(() => ({ ul: wing(true, 1), ll: wing(false, 1), ur: wing(true, -1), lr: wing(false, -1) }), []);
  const m1 = useMemo(() => new THREE.MeshBasicMaterial({ color: c1, side: THREE.DoubleSide, toneMapped: false, fog: false }), [c1]);
  const m2 = useMemo(() => new THREE.MeshBasicMaterial({ color: c2, side: THREE.DoubleSide, toneMapped: false, fog: false }), [c2]);
  const path = useMemo<Path>(() => {
    const [cx, cz, rx, rz] = CENTERS[index % CENTERS.length]!;
    return { cx, cz, rx: rx * (.7 + (index % 3) * .18), rz: rz * (.7 + (index % 2) * .25), y: 1.6 + (index % 4) * .7, sp: .16 + (index % 5) * .035, ph: index * 1.7, bob: .5 + (index % 3) * .25 };
  }, [index]);
  const prev = useRef(new THREE.Vector3()), tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const g = root.current; if (!g) return;
    const t = clock.elapsedTime, a = t * path.sp + path.ph;
    tmp.set(path.cx + Math.cos(a) * path.rx + Math.sin(a * 2.3) * .8, path.y + Math.sin(t * 1.3 + path.ph) * path.bob + Math.sin(t * 3.1) * .12, path.cz + Math.sin(a * 1.0) * path.rz);
    const dx = tmp.x - prev.current.x, dz = tmp.z - prev.current.z;
    if (dx * dx + dz * dz > 1e-8) g.rotation.y = Math.atan2(-dz, dx);
    prev.current.copy(tmp); g.position.copy(tmp);
    const flap = Math.sin(t * 15 + path.ph * 5) * .95 + .35;
    if (l.current) l.current.rotation.x = -flap; if (r.current) r.current.rotation.x = flap;
    const k = 1 - mix.current * .2; m1.color.set(c1).multiplyScalar(k); m2.color.set(c2).multiplyScalar(k);
  });
  return <group ref={root} scale={2.5}>
    <mesh rotation-z={Math.PI / 2}><capsuleGeometry args={[.03, .28, 4, 8]} /><meshBasicMaterial color="#3a2a10" toneMapped={false} fog={false} /></mesh>
    <group ref={l}><mesh geometry={geo.ul} material={m1} /><mesh geometry={geo.ll} material={m2} /></group>
    <group ref={r}><mesh geometry={geo.ur} material={m1} /><mesh geometry={geo.lr} material={m2} /></group>
  </group>;
}

export function Butterflies({ count = 9 }: { count?: number }) {
  return <group>{Array.from({ length: count }).map((_, i) => <Butterfly key={i} index={i} />)}</group>;
}
