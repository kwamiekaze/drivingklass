import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface Hero3DCanvasProps {
  modelUrl: string;
}

function Car({ modelUrl, scrollRef }: { modelUrl: string; scrollRef: React.MutableRefObject<number> }) {
  const gltf = useGLTF(modelUrl) as any;
  const group = useRef<THREE.Group>(null);

  const prepared = useMemo(() => {
    const scene: THREE.Object3D = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    // Center on origin, sit on ground
    scene.position.sub(center);
    scene.position.y += size.y / 2;
    // Fit to a target footprint of ~3 world units on longest horizontal axis
    const targetSpan = 3.0;
    const scale = targetSpan / Math.max(size.x, size.z);
    scene.scale.setScalar(scale);
    scene.position.multiplyScalar(scale);
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
    return scene;
  }, [gltf.scene]);

  useFrame((_, delta) => {
    if (!group.current) return;
    // Base gentle auto-rotate
    group.current.rotation.y += delta * 0.25;
    // Scroll-linked additional rotation offset
    group.current.rotation.y += scrollRef.current * 0.0008 * delta * 60;
  });

  return (
    <group ref={group}>
      <primitive object={prepared} />
    </group>
  );
}

function ScrollTracker({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const { invalidate } = useThree();
  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = window.scrollY;
      invalidate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [invalidate, scrollRef]);
  return null;
}

export default function Hero3DCanvas({ modelUrl }: Hero3DCanvasProps) {
  const scrollRef = useRef(0);
  const [ready, setReady] = useState(false);

  // Preload the GLB (throws in Suspense on 404 → boundary catches)
  useGLTF.preload(modelUrl);

  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 32, position: [4.5, 1.8, 4.5] }}
      style={{
        background: "transparent",
        opacity: ready ? 1 : 0,
        transition: "opacity 700ms ease-out",
      }}
      onCreated={() => setReady(true)}
    >
      <Suspense fallback={null}>
        <ScrollTracker scrollRef={scrollRef} />
        {/* Warm key + fill lighting to match the caramel scene */}
        <ambientLight intensity={0.45} color={"#ffd9a8"} />
        <directionalLight
          position={[-4, 5, 3]}
          intensity={1.6}
          color={"#ffe1b0"}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[4, 3, -2]} intensity={0.6} color={"#ffb877"} />
        <pointLight position={[0, 3, 4]} intensity={0.5} color={"#fff2d4"} />

        <Environment preset="sunset" />

        <Car modelUrl={modelUrl} scrollRef={scrollRef} />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.55}
          blur={2.6}
          far={3.5}
          scale={7}
          color="#3a1f0d"
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI * 0.34}
          maxPolarAngle={Math.PI * 0.5}
          target={[0, 0.6, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
