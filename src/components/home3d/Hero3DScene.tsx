import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DkCar } from "./DkCar";
import { PriceRing } from "./PriceRing";
import { PackageModal } from "@/components/PackageModal";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { Package } from "@/data/packages";
import type { CapabilityTier } from "./useCapabilityTier";
import { useSound } from "./SoundManager";

interface Props {
  tier: CapabilityTier;
  isDark: boolean;
}

export function Hero3DScene({ tier, isDark }: Props) {
  const { trackClick } = useAnalytics();
  const [openPkg, setOpenPkg] = useState<Package | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const { play } = useSound();

  const handleSelect = (pkg: Package) => {
    trackClick("package_select", { package_id: pkg.id });
    trackClick("open_info", { package_id: pkg.id });
    setOpenPkg(pkg);
  };
  const handleBook = (pkg: Package) => {
    trackClick("package_select", { package_id: pkg.id });
    trackClick("book_click", { package_id: pkg.id, square_url: pkg.squareUrl });
    const w = window.open(pkg.squareUrl, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = pkg.squareUrl;
  };

  const dpr = tier === "full" ? [1, 2] : [1, 1.25];
  const usePost = tier === "full";

  return (
    <>
      <div className="absolute inset-0" aria-hidden={false}>
        <Canvas
          dpr={dpr as [number, number]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 3.2, 8], fov: 42 }}
          onPointerDown={() => {
            play("whoosh");
            setIntroDone(true);
          }}
          onWheel={() => setIntroDone(true)}
        >
          <color attach="background" args={[isDark ? "#0a0a10" : "#1a1615"]} />
          <fog attach="fog" args={[isDark ? "#0a0a10" : "#2a2622", 8, 22]} />

          <PerspectiveCamera makeDefault position={[0, 3.2, 8]} fov={42} />
          <IntroRig done={introDone} onDone={() => setIntroDone(true)} />
          <ParallaxCamera enabled={introDone} />

          {/* Warm golden-hour lighting */}
          <ambientLight intensity={0.35} color={"#3a2f22"} />
          <directionalLight
            position={[6, 6, 4]}
            intensity={1.6}
            color={"#f2c14e"}
            castShadow={false}
          />
          <directionalLight
            position={[-5, 3, -4]}
            intensity={0.6}
            color={"#7a5a2a"}
          />
          <spotLight
            position={[0, 8, 0]}
            angle={0.6}
            penumbra={0.9}
            intensity={0.8}
            color={"#f2c14e"}
          />

          <Suspense fallback={null}>
            <Environment preset="sunset" />

            {/* Reflective asphalt */}
            <mesh
              position={[0, -0.001, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[60, 60]} />
              <meshStandardMaterial
                color={"#0d0d12"}
                roughness={0.55}
                metalness={0.6}
              />
            </mesh>

            {/* Single gold lane line running to the horizon */}
            <mesh
              position={[0, 0.005, -6]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.18, 40]} />
              <meshStandardMaterial
                color={"#f2c14e"}
                emissive={"#f2c14e"}
                emissiveIntensity={0.7}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>

            {tier !== "poster" && <DustParticles count={tier === "full" ? 90 : 40} />}

            <DkCar autoRotate />
            <PriceRing onSelect={handleSelect} onBook={handleBook} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            minPolarAngle={Math.PI * 0.32}
            maxPolarAngle={Math.PI * 0.52}
            rotateSpeed={0.55}
          />

          {usePost && (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={0.55}
                luminanceThreshold={0.55}
                luminanceSmoothing={0.2}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.2} darkness={0.75} />
            </EffectComposer>
          )}
        </Canvas>
      </div>

      <PackageModal
        isOpen={!!openPkg}
        onClose={() => setOpenPkg(null)}
        pkg={openPkg}
      />
    </>
  );
}

/**
 * 2.5s cinematic glide from low-front to hero framing. Skips on any interaction.
 */
function IntroRig({ done, onDone }: { done: boolean; onDone: () => void }) {
  const { camera } = useThree();
  const t = useRef(0);
  const start = useMemo(() => new THREE.Vector3(0, 1.4, 5.2), []);
  const end = useMemo(() => new THREE.Vector3(0, 3.2, 8), []);

  useEffect(() => {
    if (done) return;
    camera.position.copy(start);
    camera.lookAt(0, 0.6, 0);
  }, [camera, done, start]);

  useFrame((_, delta) => {
    if (done) return;
    t.current = Math.min(1, t.current + delta / 2.5);
    const e = 1 - Math.pow(1 - t.current, 3); // easeOutCubic
    camera.position.lerpVectors(start, end, e);
    camera.lookAt(0, 0.6, 0);
    if (t.current >= 1) onDone();
  });
  return null;
}

/**
 * Subtle mouse / device-tilt parallax after the intro.
 */
function ParallaxCamera({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      target.current = { x: nx * 0.6, y: -ny * 0.35 };
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      target.current = {
        x: THREE.MathUtils.clamp(e.gamma / 45, -1, 1) * 0.4,
        y: THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1) * 0.2,
      };
    };
    el.addEventListener("pointermove", onMove);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [enabled, gl]);

  useFrame(() => {
    if (!enabled) return;
    const base = camera.position;
    const desiredX = target.current.x;
    const desiredY = 3.2 + target.current.y;
    base.x += (desiredX - base.x) * 0.04;
    base.y += (desiredY - base.y) * 0.04;
    camera.lookAt(0, 0.6, 0);
  });
  return null;
}

function DustParticles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = Math.random() * 3.5 + 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const geo = ref.current.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const y = attr.getY(i) + dt * 0.12;
      attr.setY(i, y > 4 ? 0.2 : y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={"#f2c14e"}
        transparent
        opacity={0.55}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
