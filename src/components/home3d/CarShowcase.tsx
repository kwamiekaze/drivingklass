import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

// Measured from opt.glb (new model), band f=0.03:
// x=[0.1154,0.1743] (span 0.0589), y=[0.8285,0.8584], z=[-0.2236,0.2295] (span 0.4531)
// Long horizontal axis is Z; padded to fully hide the model's original sign face.
const SIGN = {
  cx: 0.143,
  cy: 0.833,
  cz: 0.002,
  width: 0.520,  // long span along Z + pad
  height: 0.072, // vertical + pad
  depth: 0.135,  // short span along X + pad
};
const FACE_OFF = SIGN.depth / 2 + 0.002;

function CarModel() {
  const { scene } = useGLTF(MODEL_URL) as any;

  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cloned.position.sub(center);
    cloned.position.y += size.y / 2;
    const scale = 2.4 / Math.max(size.x, size.z);
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

  const textProps = {
    fontSize: SIGN.height * 0.56,
    color: "#F2C14E",
    anchorX: "center" as const,
    anchorY: "middle" as const,
    letterSpacing: 0.1,
    maxWidth: SIGN.width * 0.95,
  };

  return (
    <group>
      <primitive object={prepared} />
      {/* Sign cover box at the model's measured sign location */}
      <group position={[SIGN.cx, SIGN.cy, SIGN.cz]}>
        <mesh castShadow>
          <boxGeometry args={[SIGN.depth, SIGN.height, SIGN.width]} />
          <meshStandardMaterial color="#0d0d10" roughness={0.5} metalness={0.2} />
        </mesh>
        <Text position={[FACE_OFF, 0, 0]} rotation={[0, Math.PI / 2, 0]} {...textProps}>
          DRIVINGKLASS
        </Text>
        <Text position={[-FACE_OFF, 0, 0]} rotation={[0, -Math.PI / 2, 0]} {...textProps}>
          DRIVINGKLASS
        </Text>
      </group>
    </group>
  );
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
    const l = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", l);
    return () => mq.removeEventListener("change", l);
  }, []);

  return (
    <div className="absolute inset-0" style={{ borderRadius: "50%", overflow: "hidden", pointerEvents: "auto" }}>
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
        style={{ background: "transparent", opacity: ready ? 1 : 0, transition: "opacity 600ms ease-out" }}
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
          <Environment files="/assets/potsdamer_platz_1k.hdr" />
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
