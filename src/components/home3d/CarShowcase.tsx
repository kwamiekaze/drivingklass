import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

type SignPlacement = {
  center: THREE.Vector3; // center of new sign box
  width: number; // along car length axis (X world)
  depth: number; // along car short axis (Z world)
  height: number;
  lengthAxis: "x" | "z"; // which axis is the car length
};

function CarModel({ onPlacement }: { onPlacement: (p: SignPlacement) => void }) {
  const { scene } = useGLTF(MODEL_URL) as any;
  const { prepared, placement } = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cloned.position.sub(center);
    cloned.position.y += size.y / 2;
    const maxHoriz = Math.max(size.x, size.z);
    const scale = maxHoriz > 0 ? 2.4 / maxHoriz : 1;
    cloned.scale.setScalar(scale);
    cloned.position.multiplyScalar(scale);
    cloned.updateMatrixWorld(true);

    // Recompute world bbox after transform
    const worldBox = new THREE.Box3().setFromObject(cloned);
    const worldSize = new THREE.Vector3();
    worldBox.getSize(worldSize);
    const carLength = Math.max(worldSize.x, worldSize.z);
    const lengthAxis: "x" | "z" = worldSize.x >= worldSize.z ? "x" : "z";

    // Roofline: top 12% of car height belongs to the old sign region
    const rooflineY = worldBox.min.y + worldSize.y * 0.88;

    // Sample vertices above roofline in world space to find the old sign footprint
    const v = new THREE.Vector3();
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sampleCount = 0;
    cloned.traverse((o: any) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const pos = o.geometry.attributes.position;
      o.updateMatrixWorld(true);
      const mat = o.matrixWorld;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mat);
        if (v.y >= rooflineY) {
          if (v.x < minX) minX = v.x;
          if (v.x > maxX) maxX = v.x;
          if (v.z < minZ) minZ = v.z;
          if (v.z > maxZ) maxZ = v.z;
          if (v.y < minY) minY = v.y;
          if (v.y > maxY) maxY = v.y;
          sampleCount++;
        }
      }
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });

    let placement: SignPlacement;
    if (sampleCount > 0 && isFinite(minX)) {
      const rawW = maxX - minX;
      const rawD = maxZ - minZ;
      const rawH = maxY - minY;
      // Cap: sign no wider than 40% of car length along the length axis
      const maxSignLen = carLength * 0.4;
      let widthAlongLen = lengthAxis === "x" ? rawW : rawD;
      let depthAlongShort = lengthAxis === "x" ? rawD : rawW;
      widthAlongLen = Math.min(widthAlongLen * 1.05, maxSignLen);
      depthAlongShort = depthAlongShort * 1.05;
      const height = rawH * 1.05;
      // Center: use footprint center X/Z, and vertical center so bottom sits at old sign bottom (roof surface)
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const bottomY = minY; // roof surface where old sign meets car
      const cy = bottomY + height / 2;
      placement = {
        center: new THREE.Vector3(cx, cy, cz),
        width: widthAlongLen,
        depth: depthAlongShort,
        height,
        lengthAxis,
      };
    } else {
      // Fallback: modest sign near the top of the car, along length axis
      const width = carLength * 0.3;
      const depth = (lengthAxis === "x" ? worldSize.z : worldSize.x) * 0.35;
      const height = worldSize.y * 0.06;
      placement = {
        center: new THREE.Vector3(0, worldBox.max.y - height / 2, 0),
        width,
        depth,
        height,
        lengthAxis,
      };
    }
    return { prepared: cloned, placement };
  }, [scene]);

  useEffect(() => {
    onPlacement(placement);
  }, [placement, onPlacement]);

  return <primitive object={prepared} />;
}

function RoofSign({ placement }: { placement: SignPlacement }) {
  const { center, width, depth, height, lengthAxis } = placement;
  // Box dims: X = along length axis of car, Z = short axis
  const boxLen = width;
  const boxShort = depth;
  const rotY = lengthAxis === "x" ? 0 : Math.PI / 2;
  // Text sizing: fill the long face with padding
  const textSize = Math.min(height * 0.6, boxLen / 8);
  const faceZ = boxShort / 2 + 0.002; // slight offset to avoid z-fighting
  return (
    <group position={center.toArray()} rotation={[0, rotY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[boxLen, height, boxShort]} />
        <meshStandardMaterial color="#111114" metalness={0.15} roughness={0.55} />
      </mesh>
      {/* Front face text */}
      <Text
        position={[0, 0, faceZ]}
        fontSize={textSize}
        color="#F2C14E"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        fontWeight={800}
        maxWidth={boxLen * 0.94}
      >
        DRIVINGKLASS
      </Text>
      {/* Back face text */}
      <Text
        position={[0, 0, -faceZ]}
        rotation={[0, Math.PI, 0]}
        fontSize={textSize}
        color="#F2C14E"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
        fontWeight={800}
        maxWidth={boxLen * 0.94}
      >
        DRIVINGKLASS
      </Text>
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
  const [placement, setPlacement] = useState<SignPlacement | null>(null);

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
          <CarModel onPlacement={setPlacement} />
          {placement && <RoofSign placement={placement} />}
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
