import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTRO_LENGTH, INTRO_NARROW, INTRO_WIDE, STAGES, type Stop } from './views';
import { makeSample, sample } from './cinema';

type Controls = {
  target: THREE.Vector3; enabled: boolean; autoRotate: boolean; autoRotateSpeed: number; getAzimuthalAngle: () => number;
  addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void;
};
type Mode = 'intro' | 'fly' | 'free';

/**
 * One camera brain, the same feel as thestylevan.com. Intro: a scripted dolly with a gimbal float.
 * Fly: NEXT VIEW glides to the stop. Free: a slow drift that sways across the front of the building and yields to the visitor.
 */
export function Rig({ stage, reducedMotion, skipIntro, onIntroDone }: { stage: number; reducedMotion: boolean; skipIntro: boolean; onIntroDone: () => void }) {
  const { camera, size } = useThree();
  const controls = useThree(s => s.controls) as unknown as Controls | null;
  const narrow = size.width < 700 || size.width / size.height < .8;
  const mode = useRef<Mode>(skipIntro || reducedMotion ? 'fly' : 'intro');
  const clock = useRef(0), first = useRef(true), snapped = useRef(false), dir = useRef(1), done = useRef(false);
  const tp = useRef(new THREE.Vector3()), tl = useRef(new THREE.Vector3()), smp = useRef(makeSample());
  const stopOf = (i: number): Stop => { const s = STAGES[i] ?? STAGES[0]!; return narrow ? s.narrow : s.wide; };

  useEffect(() => {
    if (!controls || snapped.current || mode.current === 'intro') return;
    snapped.current = true;
    const s = stopOf(stage), persp = camera as THREE.PerspectiveCamera;
    camera.position.set(...s.p); controls.target.set(...s.l); camera.lookAt(...s.l);
    persp.fov = s.fov; persp.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);
  useEffect(() => { if (first.current) { first.current = false; return; } mode.current = 'fly'; }, [stage, narrow]);
  useEffect(() => {
    if (!controls) return;
    const grab = () => { if (mode.current === 'intro' || mode.current === 'fly') mode.current = 'free'; };
    controls.addEventListener('start', grab);
    return () => controls.removeEventListener('start', grab);
  }, [controls]);

  useFrame((state, delta) => {
    if (!controls) return;
    const dt = Math.min(delta, .05), time = state.clock.elapsedTime, persp = camera as THREE.PerspectiveCamera;
    const m = mode.current;
    controls.autoRotate = m === 'free' && !reducedMotion;
    if (controls.autoRotate) {
      const a = controls.getAzimuthalAngle();
      if (a < -.85) dir.current = -1; else if (a > .85) dir.current = 1;
      controls.autoRotateSpeed = .42 * dir.current;
    }
    if (m === 'intro') {
      clock.current += dt;
      const s = sample(narrow ? INTRO_NARROW : INTRO_WIDE, clock.current, smp.current);
      tp.current.copy(s.p);
      tp.current.x += Math.sin(time * .9) * .035; tp.current.y += Math.sin(time * .7 + 1) * .03; tp.current.z += Math.sin(time * .8 + 2) * .035;
      camera.position.copy(tp.current); controls.target.copy(s.l); camera.lookAt(s.l);
      if (Math.abs(persp.fov - s.fov) > .01) { persp.fov = s.fov; persp.updateProjectionMatrix(); }
      if (clock.current >= INTRO_LENGTH) mode.current = 'free';
    } else if (m === 'fly') {
      const st = stopOf(stage), k = reducedMotion ? 1 : 1 - Math.exp(-2.2 * dt);
      tp.current.set(...st.p); tl.current.set(...st.l);
      if (Math.abs(persp.fov - st.fov) > .01) { persp.fov += (st.fov - persp.fov) * Math.min(1, k * 1.4); persp.updateProjectionMatrix(); }
      camera.position.lerp(tp.current, k); controls.target.lerp(tl.current, k);
      if (camera.position.distanceTo(tp.current) < .06) mode.current = 'free';
    } else {
      controls.target.y += Math.sin(time * .35) * .0012;
    }
    if (!done.current && mode.current !== 'intro') { done.current = true; onIntroDone(); }
    const t = controls.target; t.x = THREE.MathUtils.clamp(t.x, -30, 30); t.z = THREE.MathUtils.clamp(t.z, -26, 24); t.y = THREE.MathUtils.clamp(t.y, .4, 14);
  });
  return null;
}
