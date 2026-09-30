import { useContext, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx } from './theme';

const COLORS: [string, string][] = [['#f2c14e', '#fff3c4'], ['#ffd27a', '#c9971f'], ['#ffffff', '#f2c14e'], ['#e9a93a', '#fff0c2'], ['#fff3c4', '#d9a441']];

function wing(upper: boolean, side: 1 | -1) {
  const s = new THREE.Shape();
  if (upper) { s.moveTo(0, 0); s.bezierCurveTo(-.05, .32, .32, .55, .42, .28); s.bezierCurveTo(.46, .1, .2, -.02, 0, 0); }
  else { s.moveTo(0, 0); s.bezierCurveTo(-.02, -.18, -.2, -.42, -.34, -.22); s.bezierCurveTo(-.36, -.06, -.14, 0, 0, 0); }
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(side * Math.PI / 2);
  return g;
}

type Fly = { active: boolean; t: number; dur: number; a: THREE.Vector3; b: THREE.Vector3; y: number; ph: number; wob: number; speed: number };

function Butterfly({ index, api }: { index: number; api: React.MutableRefObject<Fly[]> }) {
  const root = useRef<THREE.Group>(null), l = useRef<THREE.Group>(null), r = useRef<THREE.Group>(null);
  const mix = useContext(NightCtx);
  const [c1, c2] = COLORS[index % COLORS.length];
  const geo = useMemo(() => ({ ul: wing(true, 1), ll: wing(false, 1), ur: wing(true, -1), lr: wing(false, -1) }), []);
  const m1 = useMemo(() => new THREE.MeshBasicMaterial({ color: c1, side: THREE.DoubleSide, toneMapped: false, fog: false }), [c1]);
  const m2 = useMemo(() => new THREE.MeshBasicMaterial({ color: c2, side: THREE.DoubleSide, toneMapped: false, fog: false }), [c2]);
  const prev = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const f = api.current[index], g = root.current; if (!g) return;
    if (!f.active) { g.visible = false; return; }
    g.visible = true; f.t += dt;
    const u = f.t / f.dur;
    if (u >= 1) { f.active = false; return; }
    const p = new THREE.Vector3().lerpVectors(f.a, f.b, u);
    p.y = f.y + Math.sin(f.t * 1.3 + f.ph) * 1.1 + Math.sin(f.t * 3.1) * .18;
    p.z += Math.sin(f.t * .8 + f.ph) * f.wob;
    const d = p.clone().sub(prev.current);
    if (d.lengthSq() > 1e-6) g.rotation.y = Math.atan2(-d.z, d.x);
    prev.current.copy(p); g.position.copy(p);
    const flap = Math.sin(f.t * 17 + f.ph * 5) * .95 + .35;
    if (l.current) l.current.rotation.x = -flap; if (r.current) r.current.rotation.x = flap;
    const k = 1 - mix.current * .28; m1.color.set(c1).multiplyScalar(k); m2.color.set(c2).multiplyScalar(k);
  });
  return <group ref={root} visible={false} scale={.75}>
    <mesh rotation-z={Math.PI / 2}><capsuleGeometry args={[.03, .28, 4, 8]} /><meshBasicMaterial color="#3a2a10" toneMapped={false} fog={false} /></mesh>
    <group ref={l}><mesh geometry={geo.ul} material={m1} /><mesh geometry={geo.ll} material={m2} /></group>
    <group ref={r}><mesh geometry={geo.ur} material={m1} /><mesh geometry={geo.lr} material={m2} /></group>
  </group>;
}

/** Butterflies cross the whole scene every so often. */
export function Butterflies() {
  const api = useRef<Fly[]>(Array.from({ length: 8 }).map(() => ({ active: false, t: 0, dur: 20, a: new THREE.Vector3(), b: new THREE.Vector3(), y: 3, ph: 0, wob: 2, speed: 3 })));
  const timer = useRef(2);
  useFrame((_, dt) => {
    timer.current -= dt;
    if (timer.current > 0) return;
    timer.current = 7 + Math.random() * 10;
    const n = 1 + Math.floor(Math.random() * 3);
    const left = Math.random() > .5, z0 = -10 + Math.random() * 26;
    for (let i = 0; i < n; i++) {
      const f = api.current.find(x => !x.active); if (!f) break;
      const ex = 46;
      f.active = true; f.t = -i * .9; f.dur = 20 + Math.random() * 8;
      f.a.set(left ? -ex : ex, 0, z0 + i * 1.6); f.b.set(left ? ex : -ex, 0, z0 + (Math.random() - .5) * 14);
      f.y = 2.2 + Math.random() * 5; f.ph = Math.random() * 6; f.wob = 1.5 + Math.random() * 3;
    }
  });
  return <group>{api.current.map((_, i) => <Butterfly key={i} index={i} api={api} />)}</group>;
}
