import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface CameraKeyframe {
  position: [number, number, number];
  lookAt: [number, number, number];
}

// Section keyframes: hero, side profile, roof push-in, low front CTA
export const SECTION_KEYFRAMES: CameraKeyframe[] = [
  { position: [5.5, 2.2, 5.5], lookAt: [0, 1.0, 0] },     // hero front-3/4
  { position: [0, 1.2, 7.5], lookAt: [0, 0.9, 0] },        // side profile
  { position: [0.5, 3.2, 3.2], lookAt: [-0.1, 1.55, 0] },  // roof sign push-in
  { position: [4.5, 0.7, 4.5], lookAt: [0, 1.2, 0] },      // low front hero
];

const INTRO_START: CameraKeyframe = {
  position: [-5, 1.2, -5.5],
  lookAt: [0, 1.0, 0],
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface RigProps {
  scrollProgress: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
}

export function CameraRig({ scrollProgress, pointer, reducedMotion }: RigProps) {
  const { camera } = useThree();
  const startTime = useRef(performance.now());
  const introDuration = 7000;
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    if (reducedMotion) {
      camera.position.set(...SECTION_KEYFRAMES[0].position);
      camera.lookAt(...SECTION_KEYFRAMES[0].lookAt);
    } else {
      camera.position.set(...INTRO_START.position);
    }
  }, [camera, reducedMotion]);

  useFrame((_, delta) => {
    if (reducedMotion) {
      camera.lookAt(...SECTION_KEYFRAMES[0].lookAt);
      return;
    }

    const elapsed = performance.now() - startTime.current;
    const introT = Math.min(elapsed / introDuration, 1);

    if (introT < 1) {
      // Cinematic orbital sweep from rear-3/4 driver side to front-3/4
      const t = easeInOutCubic(introT);
      const startAngle = Math.atan2(INTRO_START.position[2], INTRO_START.position[0]);
      const endAngle = Math.atan2(
        SECTION_KEYFRAMES[0].position[2],
        SECTION_KEYFRAMES[0].position[0]
      );
      // Sweep the short way around driver side
      const angle = startAngle + (endAngle - startAngle) * t;
      const radius = THREE.MathUtils.lerp(7.5, 7.2, t);
      const y = THREE.MathUtils.lerp(1.2, 2.2, t);
      targetPos.current.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      targetLook.current.set(0, 1.0, 0);
    } else {
      // Scroll-driven keyframes with slow idle orbit
      const p = scrollProgress.current * (SECTION_KEYFRAMES.length - 1);
      const idx = Math.floor(p);
      const frac = p - idx;
      const a = SECTION_KEYFRAMES[idx];
      const b = SECTION_KEYFRAMES[Math.min(idx + 1, SECTION_KEYFRAMES.length - 1)];
      const ease = easeInOutCubic(frac);
      const px = THREE.MathUtils.lerp(a.position[0], b.position[0], ease);
      const py = THREE.MathUtils.lerp(a.position[1], b.position[1], ease);
      const pz = THREE.MathUtils.lerp(a.position[2], b.position[2], ease);
      const lx = THREE.MathUtils.lerp(a.lookAt[0], b.lookAt[0], ease);
      const ly = THREE.MathUtils.lerp(a.lookAt[1], b.lookAt[1], ease);
      const lz = THREE.MathUtils.lerp(a.lookAt[2], b.lookAt[2], ease);

      // Idle orbit drift on the hero (only when near section 0)
      const idleAmt = Math.max(0, 1 - scrollProgress.current * 3);
      const time = performance.now() * 0.00012;
      const orbitX = Math.cos(time) * 0.6 * idleAmt;
      const orbitZ = Math.sin(time) * 0.6 * idleAmt;
      const bob = Math.sin(time * 3.2) * 0.15 * idleAmt;

      // Parallax from pointer
      const parX = pointer.current.x * 0.35;
      const parY = pointer.current.y * 0.2;

      targetPos.current.set(px + orbitX + parX, py + bob + parY, pz + orbitZ);
      targetLook.current.set(lx, ly, lz);
    }

    // Damped interpolation
    const lerpFactor = 1 - Math.pow(0.001, delta);
    camera.position.lerp(targetPos.current, lerpFactor);
    currentLook.current.lerp(targetLook.current, lerpFactor);
    camera.lookAt(currentLook.current);
  });

  return null;
}
