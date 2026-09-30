import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTRO_LENGTH, INTRO_NARROW, INTRO_WIDE, VIEWS, type Stop, type ViewId } from './views';
import { makeSample, sample } from './cinema';

type Controls = {
  target: THREE.Vector3; enabled: boolean; autoRotate: boolean; autoRotateSpeed: number;
  addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void; update: () => void;
};
type Mode = 'intro' | 'fly' | 'hold' | 'free';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * One camera brain. Intro: a scripted dolly on first load. Fly: glide to the chosen view. Hold: a slow sway so the frame
 * is never frozen. Free: the visitor drives (drag to orbit, pinch or scroll to zoom); after a quiet spell it drifts again.
 */
export function Rig({ viewId, reducedMotion, skipIntro, onIntroDone }: { viewId: ViewId; reducedMotion: boolean; skipIntro: boolean; onIntroDone: () => void }) {
  const { camera, size } = useThree();
  const controls = useThree(s => s.controls) as unknown as Controls | null;
  const narrow = size.width < 700 || size.width / size.height < .8;
  const mode = useRef<Mode>(skipIntro || reducedMotion ? 'fly' : 'intro');
  const clock = useRef(0), idle = useRef(0), sway = useRef(0), first = useRef(true), shift = useRef({ x: 0, y: 0 });
  const tp = useRef(new THREE.Vector3()), tl = useRef(new THREE.Vector3()), smp = useRef(makeSample());
  const done = useRef(false);

  const stopOf = (id: ViewId): Stop => { const v = VIEWS.find(x => x.id === id) ?? VIEWS[0]!; return narrow ? v.narrow : v.wide; };

  // Jump straight to the stop when there is no intro to play.
  useEffect(() => {
    if (!controls || mode.current === 'intro') return;
    const s = stopOf(viewId);
    camera.position.set(...s.p); controls.target.set(...s.l); camera.lookAt(...s.l);
    (camera as THREE.PerspectiveCamera).fov = s.fov; (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    shift.current = { x: s.shift[0] * size.width, y: s.shift[1] * size.height };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);

  useEffect(() => { if (first.current) { first.current = false; return; } if (mode.current !== 'intro') { mode.current = 'fly'; idle.current = 0; } }, [viewId, narrow]);

  useEffect(() => {
    if (!controls) return;
    const grab = () => { if (mode.current !== 'intro' || true) { mode.current = 'free'; idle.current = 0; controls.autoRotate = false; } };
    const release = () => { idle.current = 0; };
    controls.addEventListener('start', grab); controls.addEventListener('end', release);
    return () => { controls.removeEventListener('start', grab); controls.removeEventListener('end', release); };
  }, [controls]);

  useFrame((state, delta) => {
    if (!controls) return;
    const dt = Math.min(delta, .05), time = state.clock.elapsedTime, persp = camera as THREE.PerspectiveCamera;
    const m = mode.current, st = stopOf(viewId);
    controls.autoRotate = m === 'free' && !reducedMotion && idle.current > 7;
    controls.autoRotateSpeed = .35;
    if (m === 'free') idle.current += dt;

    if (m === 'intro') {
      clock.current += dt;
      const s = sample(narrow ? INTRO_NARROW : INTRO_WIDE, clock.current, smp.current);
      camera.position.copy(s.p); controls.target.copy(s.l); camera.lookAt(s.l);
      if (Math.abs(persp.fov - s.fov) > .01) { persp.fov = s.fov; persp.updateProjectionMatrix(); }
      if (clock.current >= INTRO_LENGTH) { mode.current = 'hold'; }
    } else if (m === 'fly') {
      const k = reducedMotion ? 1 : 1 - Math.exp(-2.3 * dt);
      tp.current.set(...st.p); tl.current.set(...st.l);
      camera.position.lerp(tp.current, k); controls.target.lerp(tl.current, k);
      if (Math.abs(persp.fov - st.fov) > .01) { persp.fov += (st.fov - persp.fov) * Math.min(1, k * 1.2); persp.updateProjectionMatrix(); }
      camera.lookAt(controls.target);
      if (camera.position.distanceTo(tp.current) < .08 && controls.target.distanceTo(tl.current) < .08) { mode.current = 'hold'; sway.current = 0; }
    } else if (m === 'hold' && !reducedMotion) {
      const a = Math.sin(time * .22) * .05, d = a - sway.current; sway.current = a;
      camera.position.sub(controls.target).applyAxisAngle(UP, d).add(controls.target);
      camera.position.y += Math.sin(time * .5) * .0016;
    }
    if (!done.current && mode.current !== 'intro') { done.current = true; onIntroDone(); }

    // slide the picture clear of the page's own UI
    const tx = st.shift[0] * size.width, ty = st.shift[1] * size.height, k2 = reducedMotion ? 1 : 1 - Math.exp(-3 * dt);
    const c = shift.current; c.x += (tx - c.x) * k2; c.y += (ty - c.y) * k2;
    if (Math.abs(c.x) > .5 || Math.abs(c.y) > .5) camera.setViewOffset(size.width, size.height, -c.x, -c.y, size.width, size.height);
    else if (camera.view?.enabled) camera.clearViewOffset();
    const t = controls.target; t.x = THREE.MathUtils.clamp(t.x, -30, 30); t.z = THREE.MathUtils.clamp(t.z, -24, 34); t.y = THREE.MathUtils.clamp(t.y, .3, 14);
  });
  return null;
}
