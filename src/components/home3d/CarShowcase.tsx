import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

const CAR_TARGET_LENGTH = 2.4;
const GOLD = "#F2C14E";
const SIGN_DARK = "#0e0e10";

function RoofSign({
  size,
  lengthAxis,
}: {
  size: THREE.Vector3; // world-space scaled size of the car
  lengthAxis: "x" | "z";
}) {
  // Sign box dimensions — oversized so the garbled baked sign is fully hidden.
  const carLen = lengthAxis === "x" ? size.x : size.z;
  const carWid = lengthAxis === "x" ? size.z : size.x;
  const signLen = carLen * 0.42;
  const signWid = carWid * 0.34;
  const signHei = size.y * 0.14;

  // Position: on top of the car, slightly toward the front along the length axis.
  const yTop = size.y + signHei / 2 + 0.005;
  const forwardOffset = carLen * 0.04;
  const pos: [number, number, number] =
    lengthAxis === "x" ? [forwardOffset, yTop, 0] : [0, yTop, forwardOffset];

  // Orient: text faces are perpendicular to the length axis (front & back of car).
  // Box local: length along X, height along Y, depth along Z. Text faces on ±Z.
  // If car length is on world Z, rotate the group 90° around Y.
  const rotY = lengthAxis === "z" ? Math.PI / 2 : 0;

  const textSize = Math.min(signHei * 0.62, signLen / 12);
  const textZ = signWid / 2 + 0.002;

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* Main dark box */}
      <mesh castShadow>
        <boxGeometry args={[signLen, signHei, signWid]} />
        <meshStandardMaterial color={SIGN_DARK} metalness={0.3} roughness={0.55} />
      </mesh>
      {/* Gold trim: top edge */}
      <mesh position={[0, signHei / 2 + 0.001, 0]}>
        <boxGeometry args={[signLen * 1.005, signHei * 0.06, signWid * 1.005]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Gold trim: bottom edge */}
      <mesh position={[0, -signHei / 2 - 0.001, 0]}>
        <boxGeometry args={[signLen * 1.005, signHei * 0.06, signWid * 1.005]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Front face text */}
      <Text
        position={[0, 0, textZ]}
        fontSize={textSize}
        color={GOLD}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
        fontWeight={800}
        maxWidth={signLen * 0.92}
      >
        DRIVINGKLASS
      </Text>
      {/* Back face text (rotated so it reads correctly from behind) */}
      <Text
        position={[0, 0, -textZ]}
        rotation={[0, Math.PI, 0]}
        fontSize={textSize}
        color={GOLD}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.05}
        fontWeight={800}
        maxWidth={signLen * 0.92}
      >
        DRIVINGKLASS
      </Text>
    </group>
  );
}

function CarModel() {
  const { scene } = useGLTF(MODEL_URL) as any;
  const { prepared, scaledSize, lengthAxis } = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cloned.position.sub(center);
    cloned.position.y += size.y / 2;
    const maxHoriz = Math.max(size.x, size.z);
    const scale = maxHoriz > 0 ? CAR_TARGET_LENGTH / maxHoriz : 1;
    cloned.scale.setScalar(scale);
    cloned.position.multiplyScalar(scale);
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
    const scaledSize = size.clone().multiplyScalar(scale);
    const lengthAxis: "x" | "z" = size.x >= size.z ? "x" : "z";
    return { prepared: cloned, scaledSize, lengthAxis };
  }, [scene]);
  return (
    <group>
      <primitive object={prepared} />
      <RoofSign size={scaledSize} lengthAxis={lengthAxis} />
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
