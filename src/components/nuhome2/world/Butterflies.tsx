import { useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx } from './theme';

/*
 * Butterflies over the front gardens: the same three species and wing drawing as the butterflies outside the window on
 * cleanupcrew.com (monarch, tiger swallowtail, cabbage white) plus a common blue. They cross the planted islands in
 * unhurried passes, beat and glide, bank as they climb, and rest between passes for a random time. They go home at night.
 */
const GAP_MIN = 4, GAP_RANGE = 5;
const BODY = '#2c2317';
const SPECIES = [
  { margin: '#241a10', wing: '#e0812a', dot: '#fff4e0' },   // monarch
  { margin: '#2f2a17', wing: '#f0cf4c', dot: '#f0cf4c' },   // tiger swallowtail
  { margin: '#5f5e50', wing: '#f7f4e8', dot: '#f7f4e8' },   // cabbage white
  { margin: '#3a3f55', wing: '#7fb0ee', dot: '#e8f1ff' },   // common blue
];
const ROUTES = [{ x0: -26, x1: 26, z: 10.4 }, { x0: -26, x1: 26, z: 5.2 }, { x0: -30, x1: 30, z: -9.6 }];

function wingShape() {
  const s = new THREE.Shape();
  s.moveTo(.04, .12);
  s.bezierCurveTo(.34, .36, .74, .34, 1.0, .06);
  s.bezierCurveTo(1.04, -.04, .95, -.12, .78, -.16);
  s.bezierCurveTo(.66, -.19, .56, -.18, .5, -.14);
  s.bezierCurveTo(.64, -.32, .58, -.55, .36, -.62);
  s.bezierCurveTo(.2, -.67, .06, -.5, .03, -.24);
  s.closePath();
  return s;
}

type Flight = { active: boolean; start: number; duration: number; dir: number; height: number; route: number; bob: number; bobRate: number; phase: number; flapRate: number; glide: number; span: number; prevH: number; zOff: number };
const idle = (): Flight => ({ active: false, start: 0, duration: 12, dir: 1, height: 1.6, route: 0, bob: .1, bobRate: 2, phase: 0, flapRate: 6, glide: .4, span: .13, prevH: 1.6, zOff: 0 });

export function Butterflies({ count = 6 }: { count?: number }) {
  const COUNT = count;
  const mix = useContext(NightCtx);
  const bodies = useRef<(THREE.Group | null)[]>([]), lefts = useRef<(THREE.Group | null)[]>([]), rights = useRef<(THREE.Group | null)[]>([]);
  const flights = useRef<Flight[]>(Array.from({ length: COUNT }, idle));
  const nextPass = useRef(2), lastDir = useRef(1);
  const [outer, inner] = useMemo(() => {
    const sh = wingShape(), o = new THREE.ShapeGeometry(sh, 10), p = new THREE.ShapeGeometry(sh, 10);
    p.scale(.84, .82, 1); p.translate(.05, -.015, 0); return [o, p] as const;
  }, []);
  const dotGeo = useMemo(() => new THREE.CircleGeometry(.035, 8), []);
  const mats = useMemo(() => SPECIES.map(s => ({
    margin: new THREE.MeshBasicMaterial({ color: s.margin, side: THREE.DoubleSide }),
    wing: new THREE.MeshBasicMaterial({ color: s.wing, side: THREE.DoubleSide }),
    dot: new THREE.MeshBasicMaterial({ color: s.dot, side: THREE.DoubleSide }),
  })), []);
  const body = useMemo(() => new THREE.MeshBasicMaterial({ color: BODY }), []);
  useEffect(() => { bodies.current.forEach(g => { if (g) g.rotation.order = 'YXZ'; }); }, []);
  useEffect(() => () => { outer.dispose(); inner.dispose(); dotGeo.dispose(); }, [outer, inner, dotGeo]);

  useFrame(({ clock }, raw) => {
    const now = clock.elapsedTime, dt = Math.max(raw, .001), night = mix.current > .45;
    if (!night && now >= nextPass.current) {
      const waiting = flights.current.filter(f => !f.active);
      let ends = now;
      if (waiting.length) {
        const dir = Math.random() < .74 ? -lastDir.current : lastDir.current; lastDir.current = dir;
        const together = Math.random() < .35 ? 2 : 1;
        for (let i = 0; i < Math.min(together, waiting.length); i++) {
          const f = waiting[i]!;
          f.active = true; f.start = now + i * (.5 + Math.random() * 1.2); f.duration = 14 + Math.random() * 9; ends = Math.max(ends, f.start + f.duration);
          f.dir = dir; f.route = Math.floor(Math.random() * ROUTES.length); f.height = 1.0 + Math.random() * 1.5;
          f.bob = .08 + Math.random() * .16; f.bobRate = 1.3 + Math.random() * 1.9; f.phase = Math.random() * Math.PI * 2;
          f.flapRate = 5 + Math.random() * 2.4; f.glide = .26 + Math.random() * .45; f.span = .12 + Math.random() * .05; f.prevH = f.height; f.zOff = (Math.random() - .5) * 1.2;
        }
      }
      nextPass.current = ends - 6 + GAP_MIN + Math.random() * GAP_RANGE;
    }
    for (let i = 0; i < COUNT; i++) {
      const f = flights.current[i]!, g = bodies.current[i]; if (!g) continue;
      if (night) { f.active = false; g.visible = false; continue; }
      if (!f.active || now < f.start) { g.visible = false; continue; }
      const p = (now - f.start) / f.duration;
      if (p >= 1) { f.active = false; g.visible = false; continue; }
      const flap = now * f.flapRate * Math.PI * 2 + f.phase, effort = .55 + .45 * Math.sin(now * f.glide + f.phase), stroke = .12 + .75 * Math.sin(flap) * effort;
      const r = ROUTES[f.route]!, x = f.dir * (-(r.x1 - r.x0) / 2 + p * (r.x1 - r.x0));
      const h = f.height + Math.sin(p * Math.PI * f.bobRate * 2 + f.phase) * f.bob + Math.sin(flap) * .016 * effort;
      const z = r.z + f.zOff + Math.sin(p * Math.PI * 2.1 + f.phase * .5) * .9;
      const climb = (h - f.prevH) / dt; f.prevH = h;
      g.visible = true; g.position.set(x, h, z);
      g.rotation.y = (f.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(p * Math.PI * 2.3 + f.phase) * .3;
      g.rotation.x = Math.max(-.4, Math.min(.4, climb * .5)); g.rotation.z = Math.max(-.45, Math.min(.45, -climb * .6));
      g.scale.setScalar(f.span);
      const l = lefts.current[i], rr = rights.current[i]; if (l) l.rotation.z = -stroke; if (rr) rr.rotation.z = stroke;
    }
  });

  return <group>
    {Array.from({ length: COUNT }, (_, i) => {
      const m = mats[i % mats.length]!;
      return <group key={i} visible={false} ref={n => { bodies.current[i] = n; }}>
        <mesh position={[0, 0, -.08]} rotation-x={Math.PI / 2} material={body}><cylinderGeometry args={[.032, .05, .78, 6]} /></mesh>
        <mesh position={[0, .01, .33]} material={body}><sphereGeometry args={[.07, 8, 6]} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * .07, .12, .44]} rotation={[Math.PI / 2 - .62, 0, s * .42]} material={body}><cylinderGeometry args={[.004, .008, .26, 4]} /></mesh>)}
        {([['l', -1, lefts], ['r', 1, rights]] as const).map(([k, side, store]) => <group key={k} scale-x={side} ref={n => { store.current[i] = n; }}>
          <mesh geometry={outer} rotation-x={Math.PI / 2} material={m.margin} />
          {[.0016, -.0016].map(lift => <mesh key={lift} geometry={inner} position={[0, lift, 0]} rotation-x={Math.PI / 2} material={m.wing} />)}
          {[[.82, -.02], [.7, .1], [.4, -.5], [.28, -.4]].map(([px, pz], d) => <mesh key={d} geometry={dotGeo} position={[px!, .003, -pz!]} rotation-x={Math.PI / 2} material={m.dot} />)}
        </group>)}
      </group>;
    })}
  </group>;
}
