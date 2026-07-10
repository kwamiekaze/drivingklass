import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  MeshReflectorMaterial,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import * as THREE from "three";
import { CarModel } from "./CarModel";
import { Beams, LineLights } from "./Beams";
import { DustParticles } from "./DustParticles";
import { CameraRig } from "./CameraRig";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return m;
}

export default function PreviewScene() {
  const scrollProgress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 38, near: 0.1, far: 100, position: [-5, 1.2, -5.5] }}
      onCreated={({ scene }) => {
        scene.background = null;
        scene.fog = new THREE.FogExp2(0x120a04, 0.045);
      }}
    >
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#8a6430" />
      <spotLight
        position={[4, 8, 3]}
        angle={0.5}
        penumbra={1}
        intensity={2.4}
        color="#ffe0a8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight
        position={[-4, 6, -5]}
        angle={0.6}
        penumbra={1}
        intensity={1.8}
        color="#d4a437"
      />
      <pointLight position={[0, 3, -6]} intensity={0.9} color="#f5d68a" />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.25} />
        <CarModel />
      </Suspense>

      <Beams count={isMobile ? 3 : 5} />
      <LineLights />
      <DustParticles count={isMobile ? 100 : 220} />

      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={isMobile ? 512 : 1024}
          mixBlur={1}
          mixStrength={1.4}
          roughness={0.85}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#1a1108"
          metalness={0.6}
          mirror={0.4}
        />
      </mesh>

      <CameraRig
        scrollProgress={scrollProgress}
        pointer={pointer}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
