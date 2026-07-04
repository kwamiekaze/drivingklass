import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

function CarModel() {
  const { scene } = useGLTF(MODEL_URL) as any;
  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    // center at origin
    cloned.position.sub(center);
    // sit on ground: shift up by half-height
    cloned.position.y += size.y / 2;
    // scale so car length (max horizontal dim) ≈ 2.4
    const maxHoriz = Math.max(size.x, size.z);
    const scale = maxHoriz > 0 ? 2.4 / maxHoriz : 1;
    cloned.scale.setScalar(scale);
    cloned.position.multiplyScalar(scale);
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
    return cloned;
  }, [scene]);
  return <primitive object={prepared} />;
}

function CameraBob({ enabled }: { enabled: boolean }) {
  const baseY = useRef<number | null>(null);
  useFrame(({ camera, clock }) => {
    if (!enabled) return;
    if (baseY.current === null) baseY.current = camera.position.y;
    camera.position.y = baseY.current + Math.sin(clock.elapsedTime * (Math.PI * 2 / 7)) * 0.04;
  });
  return null;
}

export default function CarShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      {/* Soft gold radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 55%, rgba(242,193,78,0.12) 0%, rgba(242,193,78,0.06) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <Canvas
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        shadows
        camera={{ fov: 35, position: [3.2, 1.6, 3.2] }}
        style={{
          background: "transparent",
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
        onCreated={() => setReady(true)}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[-3, 4, 3]}
            intensity={1.2}
            color={"#FFE7B0"}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[3, 2, -2]} intensity={0.4} color={"#ffffff"} />
          <Environment preset="city" />
          <CarModel />
          <ContactShadows position={[0, 0, 0]} opacity={0.45} blur={2.4} far={3} scale={6} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.7}
            minPolarAngle={Math.PI * 0.36}
            maxPolarAngle={Math.PI * 0.46}
            target={[0, 0.5, 0]}
          />
          <CameraBob enabled={!reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
