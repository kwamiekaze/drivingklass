import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from './theme';

/*
 * Doves that visit the fountain. Visits start 20 s, then 25 s, then 30 s apart, then the pattern repeats.
 * Each visit is one dove, or now and then two. A dove glides in on a curved approach, flares, lands on a
 * bowl rim, preens for a few seconds, then takes off and leaves.
 */
const FOUNTAIN = new THREE.Vector3(0, 0, 24);
const RIMS = [{ r: .94, y: 3.34 }, { r: 1.55, y: 2.33 }];
const INTERVALS = [20, 25, 30];
const SCALE = 1.4;
const BODY_H = .105 * SCALE; // body centre above the perch when the feet are down

let wingTex: THREE.CanvasTexture | null = null;
/** Wing feather map: span runs bottom (shoulder) to top (tip), leading edge on the right. */
function wingTexture() {
  if (wingTex) return wingTex;
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!; const r = rng(17);
  g.clearRect(0, 0, W, H);
  // primaries and secondaries: overlapping feathers fanning toward the tip
  for (let i = 0; i < 11; i++) {
    const t = i / 10, y = H - 18 - t * (H - 40), len = 58 + (1 - Math.abs(t - .75)) * 34 + t * 12, x = W - 30 - len * .5 - (1 - t) * 4;
    g.save(); g.translate(x + len * .5 - 8, y); g.rotate(-.1 - t * .18);
    const grad = g.createLinearGradient(-len, 0, len * .5, 0); grad.addColorStop(0, '#d9d3ca'); grad.addColorStop(.45, '#f3efe8'); grad.addColorStop(1, '#fbfaf7');
    g.fillStyle = grad; g.strokeStyle = 'rgba(150,140,128,.55)'; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(-len * .5, 0, len * .78, 10.5 + r() * 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-len * 1.2, 0); g.lineTo(len * .2, 0); g.strokeStyle = 'rgba(120,110,98,.5)'; g.lineWidth = 1; g.stroke();
    g.restore();
  }
  // covert feathers along the leading edge
  for (let i = 0; i < 16; i++) { const y = H - 14 - (i / 15) * (H - 60); g.fillStyle = i % 2 ? '#f8f6f1' : '#efebe3'; g.strokeStyle = 'rgba(150,140,128,.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(W - 26, y, 26, 11, -.1, 0, Math.PI * 2); g.fill(); g.stroke(); }
  wingTex = new THREE.CanvasTexture(c); wingTex.colorSpace = THREE.SRGBColorSpace; wingTex.anisotropy = 4; return wingTex;
}

function wingSeg(span: number, chord: number, v0: number, v1: number) {
  const g = new THREE.PlaneGeometry(chord, span); g.translate(-chord * .18, span / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0));
  g.rotateX(Math.PI / 2); return g;
}

const white = new THREE.MeshStandardMaterial({ color: '#f6f3ee', roughness: .85 });
const grey = new THREE.MeshStandardMaterial({ color: '#d9d4cc', roughness: .9 });
const beakMat = new THREE.MeshStandardMaterial({ color: '#8f847e', roughness: .6 });
const legMat = new THREE.MeshStandardMaterial({ color: '#d78c86', roughness: .7 });
const eyeMat = new THREE.MeshBasicMaterial({ color: '#2a1512' });

type Phase = 'off' | 'in' | 'perch' | 'out';
type Rt = { phase: Phase; t: number; dur: number; curve: THREE.CatmullRomCurve3 | null; perch: THREE.Vector3; delay: number; hold: number; seed: number; yaw: number; lastYaw: number; roll: number };
const fresh = (): Rt => ({ phase: 'off', t: 0, dur: 1, curve: null, perch: new THREE.Vector3(), delay: 0, hold: 7, seed: 0, yaw: 0, lastYaw: 0, roll: 0 });

function Dove({ rt }: { rt: React.MutableRefObject<Rt> }) {
  const root = useRef<THREE.Group>(null), wl = useRef<THREE.Group>(null), wr = useRef<THREE.Group>(null), ol = useRef<THREE.Group>(null), orr = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null), tail = useRef<THREE.Group>(null), legs = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null);
  const geo = useMemo(() => ({ inner: wingSeg(.17, .2, 0, .5), outer: wingSeg(.2, .17, .5, 1), tail: (() => { const g = new THREE.CircleGeometry(.2, 14, Math.PI - .5, 1), s = 1; g.scale(1, .6 * s, 1); g.rotateX(-Math.PI / 2); return g; })() }), []);
  const wingMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wingTexture(), alphaTest: .35, side: THREE.DoubleSide, roughness: .9 }), []);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), tg: new THREE.Vector3() }), []);
  useFrame(({ clock }, dtRaw) => {
    const r = rt.current, g = root.current; if (!g) return; const dt = Math.min(dtRaw, .05), time = clock.elapsedTime;
    if (r.phase === 'off') { g.visible = false; return; }
    if (r.delay > 0) { r.delay -= dt; g.visible = false; return; }
    g.visible = true; r.t += dt;
    let pitch = 0, flap = 0, amp = .8, freq = 6.5, fold = 0, legsDown = 0, gliding = 0;
    if (r.phase === 'in' && r.curve) {
      const s = Math.min(1, r.t / r.dur), u = 1 - Math.pow(1 - s, 1.7);
      r.curve.getPointAt(u, tmp.p); r.curve.getTangentAt(Math.min(.999, u), tmp.tg);
      const yaw = Math.atan2(-tmp.tg.z, tmp.tg.x); pitch = Math.asin(THREE.MathUtils.clamp(tmp.tg.y, -1, 1));
      const dy = Math.atan2(Math.sin(yaw - r.lastYaw), Math.cos(yaw - r.lastYaw)); r.roll += (THREE.MathUtils.clamp(-dy / Math.max(dt, .001) * .35, -.5, .5) - r.roll) * Math.min(1, dt * 4); r.lastYaw = yaw; r.yaw = yaw;
      g.position.copy(tmp.p);
      const flare = THREE.MathUtils.smoothstep(s, .82, .98);
      pitch = pitch * (1 - flare) + .75 * flare; amp = .8 + .55 * flare; freq = 6.5 + 2.5 * flare; legsDown = flare;
      gliding = s < .8 ? THREE.MathUtils.smoothstep(Math.sin(time * .9 + r.seed * 7), .55, .8) : 0;
      if (s >= 1) { r.phase = 'perch'; r.t = 0; }
    } else if (r.phase === 'perch') {
      g.position.copy(r.perch); pitch = 0; fold = THREE.MathUtils.smoothstep(r.t, 0, .6); legsDown = 1; amp = 0; freq = 0; r.roll *= .9;
      if (r.t > r.hold) {
        const a = Math.atan2(r.perch.z - FOUNTAIN.z, r.perch.x - FOUNTAIN.x), az = r.seed * 6.28;
        const far = new THREE.Vector3(Math.cos(az) * 60, 21 + r.seed * 4, FOUNTAIN.z + Math.sin(az) * 60);
        r.curve = new THREE.CatmullRomCurve3([r.perch.clone(), r.perch.clone().add(new THREE.Vector3(Math.cos(a) * .5, 1.0, Math.sin(a) * .5)), new THREE.Vector3(Math.cos(a) * 5 + FOUNTAIN.x, 7.5, Math.sin(a) * 5 + FOUNTAIN.z), new THREE.Vector3(Math.cos(az) * 22, 13, FOUNTAIN.z + Math.sin(az) * 22), far], false, 'centripetal');
        r.phase = 'out'; r.t = 0; r.dur = 8.5;
      }
    } else if (r.phase === 'out' && r.curve) {
      const s = Math.min(1, r.t / r.dur), u = Math.pow(s, 1.55);
      r.curve.getPointAt(u, tmp.p); r.curve.getTangentAt(Math.min(.999, u), tmp.tg);
      const yaw = Math.atan2(-tmp.tg.z, tmp.tg.x); pitch = Math.asin(THREE.MathUtils.clamp(tmp.tg.y, -1, 1));
      const dy = Math.atan2(Math.sin(yaw - r.lastYaw), Math.cos(yaw - r.lastYaw)); r.roll += (THREE.MathUtils.clamp(-dy / Math.max(dt, .001) * .35, -.5, .5) - r.roll) * Math.min(1, dt * 4); r.lastYaw = yaw; r.yaw = yaw;
      g.position.copy(tmp.p); const lift = 1 - THREE.MathUtils.smoothstep(s, 0, .15); amp = .8 + .5 * lift; freq = 7 + 2 * lift; legsDown = lift;
      if (s >= 1) { r.phase = 'off'; g.visible = false; return; }
    }
    g.rotation.order = 'YZX'; g.rotation.set(r.roll, r.phase === 'perch' ? r.yaw : r.yaw, pitch);
    g.scale.setScalar(SCALE);
    // wings: shoulder flap, outer segment lags for a natural bend; folded flat along the body when perched
    const ph = time * freq * Math.PI * 2 + r.seed * 9;
    flap = Math.sin(ph) * amp * (1 - gliding * .92) * (1 - fold);
    const lag = Math.sin(ph - .9) * amp * .55 * (1 - gliding * .9) * (1 - fold);
    const rise = .12 + gliding * .1;
    [[wr.current, orr.current, -1], [wl.current, ol.current, 1]].forEach(([w, o, side]) => {
      const W = w as THREE.Group | null, O = o as THREE.Group | null, sd = side as number; if (!W || !O) return;
      W.rotation.set(sd * (flap + (1 - fold) * rise) + sd * fold * .1, -sd * fold * 1.35, sd * fold * -.25); W.scale.set(1, 1, 1 - fold * .35);
      O.rotation.set(sd * lag * .8, sd * fold * -.25, 0);
    });
    if (head.current) { head.current.position.y = .06 + (r.phase === 'perch' ? Math.sin(time * 3.1 + r.seed * 5) * .004 : 0); head.current.rotation.z = r.phase === 'perch' ? Math.sin(time * 1.3 + r.seed * 3) * .18 : -.05; head.current.rotation.y = r.phase === 'perch' ? Math.sin(time * .7 + r.seed * 4) * .5 : 0; }
    if (tail.current) tail.current.rotation.z = -.15 + (r.phase === 'perch' ? Math.sin(time * 2.2 + r.seed) * .05 : .12 + Math.sin(ph) * .04) + legsDown * .18;
    if (legs.current) { legs.current.scale.y = .25 + .75 * legsDown; legs.current.position.y = -.045 - .03 * legsDown; legs.current.visible = legsDown > .05; }
    if (body.current) body.current.position.y = (r.phase === 'perch' ? 0 : Math.sin(ph) * .008);
  });
  return <group ref={root} visible={false}>
    <group ref={body}>
      <mesh material={white} scale={[.15, .07, .075]}><sphereGeometry args={[1, 24, 16]} /></mesh>
      <mesh material={white} position={[.065, .004, 0]} scale={[.085, .072, .076]}><sphereGeometry args={[1, 20, 14]} /></mesh>
      <mesh material={grey} position={[-.02, .04, 0]} scale={[.11, .04, .07]}><sphereGeometry args={[1, 16, 10]} /></mesh>
      <group ref={head} position={[.15, .06, 0]}>
        <mesh material={white}><sphereGeometry args={[.038, 20, 14]} /></mesh>
        <mesh material={beakMat} position={[.048, -.006, 0]} rotation-z={-Math.PI / 2 + .12}><coneGeometry args={[.0085, .034, 8]} /></mesh>
        <mesh material={legMat} position={[.036, .004, 0]} scale={[1, .6, 1.4]}><sphereGeometry args={[.007, 8, 6]} /></mesh>
        {[-1, 1].map(s => <mesh key={s} material={eyeMat} position={[.022, .012, s * .028]}><sphereGeometry args={[.0055, 8, 6]} /></mesh>)}
      </group>
      <group ref={tail} position={[-.13, .005, 0]}>
        <mesh geometry={geo.tail} material={grey} rotation-y={0} position={[.02, 0, 0]} />
        <mesh geometry={geo.tail} material={white} position={[.02, .004, 0]} scale={[.85, 1, .85]} />
      </group>
      {[[wr, orr, 1], [wl, ol, -1]].map(([w, o, s], i) => <group key={i} ref={w as React.RefObject<THREE.Group>} position={[.02, .045, (s as number) * .05]} scale={[1, 1, s as number]}>
        <mesh geometry={geo.inner} material={wingMat} />
        <group ref={o as React.RefObject<THREE.Group>} position={[0, 0, .17]}><mesh geometry={geo.outer} material={wingMat} /></group>
      </group>)}
      <group ref={legs} position={[.015, -.05, 0]}>
        {[-1, 1].map(s => <group key={s} position={[0, 0, s * .03]}>
          <mesh material={legMat} position={[0, -.03, 0]}><cylinderGeometry args={[.004, .004, .06, 6]} /></mesh>
          <mesh material={legMat} position={[.012, -.062, 0]}><boxGeometry args={[.035, .004, .012]} /></mesh>
        </group>)}
      </group>
    </group>
  </group>;
}

export function Doves() {
  const birds = [useRef<Rt>(fresh()), useRef<Rt>(fresh())];
  const q = typeof window !== 'undefined' ? window.location.search : '';
  const dbg = q.includes('dove=perch'); // ?dove=perch shows a perched dove at once, ?dove=perch2 shows two (screenshots only)
  const sched = useRef({ next: dbg ? 0 : q.includes('dove=1') ? 1 : 20, idx: 0 }); // ?dove=1 brings the first visit forward
  useFrame((_, dtRaw) => {
    const s = sched.current, dt = Math.min(dtRaw, .05); s.next -= dt;
    if (s.next > 0) return;
    s.next = INTERVALS[++s.idx % INTERVALS.length] + 0; s.idx = s.idx % INTERVALS.length; // gap to the next visit start
    const busy = birds.some(b => b.current.phase !== 'off'); if (busy) return;
    const two = dbg ? q.includes('dove=perch2') : Math.random() < .3, r0 = Math.random() * 6.28, rimA = Math.random() * 6.28;
    birds.forEach((b, i) => {
      if (i === 1 && !two) return;
      const rim = RIMS[i === 0 ? Math.floor(Math.random() * 2) : 1 - (birds[0].current.perch.y > 3 ? 0 : 1)] ?? RIMS[0];
      const a = rimA + i * (2.2 + Math.random() * .8), az = r0 + i * .35, rt = b.current;
      rt.perch.set(FOUNTAIN.x + Math.cos(a) * rim.r, rim.y + BODY_H, FOUNTAIN.z + Math.sin(a) * rim.r);
      const pts = [new THREE.Vector3(Math.cos(az) * 58, 16 + Math.random() * 6, FOUNTAIN.z + Math.sin(az) * 58), new THREE.Vector3(Math.cos(az + .5) * 30, 11 + Math.random() * 3, FOUNTAIN.z + Math.sin(az + .5) * 30), new THREE.Vector3(FOUNTAIN.x + Math.cos(a + .55) * 8, 6.2 + i * .6, FOUNTAIN.z + Math.sin(a + .55) * 8), new THREE.Vector3(FOUNTAIN.x + Math.cos(a + .18) * (rim.r + 1.6), rim.y + 1.05, FOUNTAIN.z + Math.sin(a + .18) * (rim.r + 1.6)), rt.perch.clone().add(new THREE.Vector3(0, .03, 0))];
      rt.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); rt.phase = 'in'; rt.t = 0; rt.dur = 10.5 + i * .8; rt.delay = i * 1.4; rt.hold = dbg ? 9999 : 6 + Math.random() * 4; if (dbg) { rt.t = rt.dur; rt.delay = 0; } rt.seed = Math.random(); rt.roll = 0; rt.lastYaw = 0;
    });
  });
  return <group><Dove rt={birds[0]} /><Dove rt={birds[1]} /></group>;
}
