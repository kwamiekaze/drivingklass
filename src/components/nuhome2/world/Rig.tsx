import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FOV, INTRO, PAN, STAGES, type Stop, type V3 } from './views';

type Controls = {
  target: THREE.Vector3; enabled: boolean; autoRotate: boolean; autoRotateSpeed: number; getAzimuthalAngle: () => number;
  addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void;
};
type Mode = 'intro' | 'pan' | 'fly' | 'free';
const curve = (pts: V3[]) => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal');
const ease = (t: number) => .5 - .5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

/**
 * One camera brain. Intro and Pan are scripted, unbroken moves (see views.ts). NEXT VIEW glides to a stop. As soon as the
 * visitor touches the scene it becomes free: orbit, zoom, a slow drift that yields to the hand. Every hand-over keeps
 * the lens exactly where it was, so nothing ever jumps.
 */
export function Rig({ stage, reducedMotion, skipIntro, onIntroDone }: { stage: number; reducedMotion: boolean; skipIntro: boolean; onIntroDone: () => void }) {
  const { camera, size } = useThree();
  const controls = useThree(s => s.controls) as unknown as Controls | null;
  const narrow = size.width < 700 || size.width / size.height < .8;
  const q = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const hasStage = q.get('stage') !== null, hasCam = q.get('cam') !== null;
  const mode = useRef<Mode>(reducedMotion || hasStage ? 'fly' : skipIntro ? 'pan' : 'intro');
  const clock = useRef(0), panClock = useRef(0), first = useRef(true), snapped = useRef(false), dir = useRef(1), done = useRef(false);
  const tp = useRef(new THREE.Vector3()), tl = useRef(new THREE.Vector3());
  const C = useMemo(() => ({ ip: curve(INTRO.p), il: curve(INTRO.l), pp: curve(PAN.p), pl: curve(PAN.l) }), []);
  const fovNow = narrow ? FOV.narrow : FOV.wide;
  const stopOf = (i: number): Stop => { const s = STAGES[i] ?? STAGES[0]!; return narrow ? s.narrow : s.wide; };

  useEffect(() => {
    if (!controls || snapped.current || mode.current === 'intro') return;
    snapped.current = true;
    const persp = camera as THREE.PerspectiveCamera;
    if (mode.current === 'pan') { camera.position.copy(C.pp.getPoint(0)); controls.target.copy(C.pl.getPoint(0)); persp.fov = fovNow; }
    else { const s = stopOf(stage); camera.position.set(...s.p); controls.target.set(...s.l); persp.fov = s.fov; }
    camera.lookAt(controls.target); persp.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);
  useEffect(() => {
    const v = q.get('cam')?.split(',').map(Number); if (!v || !controls) return;
    camera.position.set(v[0]!, v[1]!, v[2]!); controls.target.set(v[3]!, v[4]!, v[5]!); camera.lookAt(v[3]!, v[4]!, v[5]!); mode.current = 'free'; snapped.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, camera]);
  useEffect(() => { if (first.current) { first.current = false; return; } mode.current = 'fly'; }, [stage, narrow]);
  useEffect(() => {
    if (!controls) return;
    const grab = () => { if (mode.current !== 'free') mode.current = 'free'; };
    controls.addEventListener('start', grab);
    return () => controls.removeEventListener('start', grab);
  }, [controls]);

  useFrame((state, delta) => {
    if (!controls) return;
    const dt = Math.min(delta, .05), time = state.clock.elapsedTime, persp = camera as THREE.PerspectiveCamera;
    const m = mode.current;
    controls.autoRotate = m === 'free' && !reducedMotion && !hasCam;
    if (controls.autoRotate) {
      const a = controls.getAzimuthalAngle();
      if (Math.abs(a) < 1.5) { if (a < -.85) dir.current = -1; else if (a > .85) dir.current = 1; }
      controls.autoRotateSpeed = .42 * dir.current;
    }
    const glide = (p: THREE.Vector3) => { p.x += Math.sin(time * .9) * .03; p.y += Math.sin(time * .7 + 1) * .025; p.z += Math.sin(time * .8 + 2) * .03; };
    const fovTo = (f: number, k = .08) => { if (Math.abs(persp.fov - f) > .01) { persp.fov += (f - persp.fov) * k; persp.updateProjectionMatrix(); } };
    if (m === 'intro' || m === 'pan') {
      let u: number;
      if (m === 'intro') { clock.current += dt; u = ease(clock.current / INTRO.len); }
      else { panClock.current += dt; u = .5 - .5 * Math.cos((panClock.current / PAN.period) * Math.PI * 2); }
      const [pc, lc] = m === 'intro' ? [C.ip, C.il] : [C.pp, C.pl];
      tp.current.copy(pc.getPoint(u)); glide(tp.current); tl.current.copy(lc.getPoint(u));
      camera.position.copy(tp.current); controls.target.copy(tl.current); camera.lookAt(tl.current);
      fovTo(fovNow);
      if (m === 'intro' && clock.current >= INTRO.len) { mode.current = 'pan'; panClock.current = 0; }
    } else if (m === 'fly') {
      const st = stopOf(stage), k = reducedMotion ? 1 : 1 - Math.exp(-2.2 * dt);
      tp.current.set(...st.p); tl.current.set(...st.l);
      fovTo(st.fov, Math.min(1, k * 1.4));
      camera.position.lerp(tp.current, k); controls.target.lerp(tl.current, k);
      if (camera.position.distanceTo(tp.current) < .06) mode.current = 'free';
    } else {
      controls.target.y += Math.sin(time * .35) * .0012;
      if (camera.position.y < .8) camera.position.y = .8;
    }
    if (!done.current && m !== 'intro') { done.current = true; onIntroDone(); }
    const t = controls.target; t.x = THREE.MathUtils.clamp(t.x, -45, 45); t.z = THREE.MathUtils.clamp(t.z, -45, 30); t.y = THREE.MathUtils.clamp(t.y, .4, 16);
  });
  return null;
}
