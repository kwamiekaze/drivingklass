import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Estate } from './Estate';
import { Butterflies } from './Butterflies';
import { Doves } from './Doves';
import { Clouds, Moon, ShootingStars, SkyDome, Stars, Sun } from './Sky';
import { NightCtx } from './theme';
import { Rig } from './Rig';
import { detectTier, qualityFor, stepDown, type Quality } from './quality';
import { INTRO_NARROW, INTRO_WIDE, type ViewId } from './views';

export type Theme = 'day' | 'night';
export type SceneProps = {
  view: ViewId; theme: Theme; reducedMotion: boolean; skipIntro: boolean;
  onReady: () => void; onIntroDone: () => void; onLost: () => void;
};

/** Animates every light, the fog and the exposure between day and night. */
function ThemeDriver({ night, mix, shadow }: { night: boolean; mix: { current: number }; shadow: number }) {
  const { scene } = useThree();
  const amb = useRef<THREE.AmbientLight>(null), hemi = useRef<THREE.HemisphereLight>(null), dir = useRef<THREE.DirectionalLight>(null), fill = useRef<THREE.DirectionalLight>(null);
  const c = useMemo(() => ({
    fogD: new THREE.Color('#f3e4c6'), fogN: new THREE.Color('#0d1440'),
    ambD: new THREE.Color('#fff6ea'), ambN: new THREE.Color('#5a68b0'),
    hsD: new THREE.Color('#cfe6ff'), hsN: new THREE.Color('#4a5bb0'), hgD: new THREE.Color('#d2c2a8'), hgN: new THREE.Color('#1c1a38'),
    dirD: new THREE.Color('#fff0d2'), dirN: new THREE.Color('#9db8ff'),
  }), []);
  useEffect(() => { scene.fog = new THREE.Fog('#f3e4c6', 46, 128); }, [scene]);
  useFrame((_, dt) => {
    const target = night ? 1 : 0;
    mix.current += (target - mix.current) * (1 - Math.exp(-2.2 * Math.min(dt, .05)));
    if (Math.abs(target - mix.current) < .0005) mix.current = target;
    const m = mix.current;
    const fog = scene.fog as THREE.Fog | null; if (fog) fog.color.copy(c.fogD).lerp(c.fogN, m);
    if (amb.current) { amb.current.color.copy(c.ambD).lerp(c.ambN, m); amb.current.intensity = .5 - .32 * m; }
    if (hemi.current) { hemi.current.color.copy(c.hsD).lerp(c.hsN, m); hemi.current.groundColor.copy(c.hgD).lerp(c.hgN, m); hemi.current.intensity = 1.0 - .68 * m; }
    if (dir.current) { dir.current.color.copy(c.dirD).lerp(c.dirN, m); dir.current.intensity = 2.9 - 2.25 * m; }
    if (fill.current) fill.current.intensity = .5 * m;
  });
  return <>
    <ambientLight ref={amb} />
    <hemisphereLight ref={hemi} />
    <directionalLight ref={dir} position={[-9, 12, 10]} castShadow={shadow > 0} shadow-mapSize-width={shadow || 16} shadow-mapSize-height={shadow || 16} shadow-camera-left={-19} shadow-camera-right={19} shadow-camera-top={13} shadow-camera-bottom={-11} shadow-bias={-.0002} shadow-normalBias={.025} />
    <directionalLight ref={fill} position={[10, 9, -8]} color="#b8c8ff" />
  </>;
}

function World({ quality, shadow, ...p }: Omit<SceneProps, 'onReady' | 'onLost'> & { quality: Quality; shadow: number; onTier: () => void }) {
  const { onTier, theme } = p as typeof p & { onTier: () => void };
  const night = theme === 'night';
  const mix = useRef(night ? 1 : 0);
  const lite = quality.lite;
  return <NightCtx.Provider value={mix}>
    <PerformanceMonitor flipflops={2} onDecline={onTier} />
    <ThemeDriver night={night} mix={mix} shadow={shadow} />
    <Environment resolution={lite ? 128 : 256}>
      <Lightformer intensity={2.2} position={[0, 8, 4]} scale={[24, 10, 1]} />
      <Lightformer intensity={1.8} color={night ? '#9db4ff' : '#fff0d8'} position={[-12, 3, 6]} scale={[18, 7, 1]} />
      <Lightformer intensity={1.3} color="#ffe2a0" position={[12, 3, 8]} scale={[16, 6, 1]} />
      <Lightformer intensity={1.9} color="#fff0d0" position={[0, 4, 22]} rotation-y={Math.PI} scale={[44, 9, 1]} />
    </Environment>
    <SkyDome /><Stars count={lite ? 2600 : 6000} /><ShootingStars />
    <Sun position={[26, 25, -70]} /><Moon position={[30, 32, -66]} />
    <Clouds count={lite ? 12 : 22} />
    <Suspense fallback={null}><Estate quality={quality} /></Suspense>
    {!lite && <Butterflies />}
    <Doves />
    <Rig viewId={p.view} reducedMotion={p.reducedMotion} skipIntro={p.skipIntro} onIntroDone={p.onIntroDone} />
    <OrbitControls makeDefault enablePan enableZoom zoomSpeed={.7} panSpeed={.6} rotateSpeed={.55} minDistance={3} maxDistance={64} minPolarAngle={.2} maxPolarAngle={1.52} enableDamping dampingFactor={.07} target={[0, 6, -12]} />
  </NightCtx.Provider>;
}

function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => { if (n.current < 4 && ++n.current === 4) onReady(); });
  return null;
}

export default function Scene({ onReady, onLost, ...rest }: SceneProps) {
  const [tier, setTier] = useState(detectTier);
  const first = useRef(tier);
  const quality = qualityFor(tier);
  const fixed = qualityFor(first.current);
  const narrow = typeof window !== 'undefined' && (window.innerWidth < 700 || window.innerWidth / window.innerHeight < .8);
  const k0 = (narrow ? INTRO_NARROW : INTRO_WIDE)[0]!;
  const lost = useRef(onLost);
  useEffect(() => { lost.current = onLost; }, [onLost]);
  return <Canvas
    className="n2-canvas"
    shadows={fixed.shadow > 0}
    dpr={quality.dpr}
    gl={{ antialias: tier !== 'lite', alpha: false, powerPreference: 'high-performance' }}
    camera={{ position: k0.p, fov: k0.fov, near: 1, far: 170 }}
    onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = .9;
      gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost.current(); }, { once: true });
    }}
    fallback={<div />}
  >
    <World {...rest} quality={quality} shadow={fixed.shadow} onTier={() => setTier(stepDown)} />
    <Ready onReady={onReady} />
  </Canvas>;
}
