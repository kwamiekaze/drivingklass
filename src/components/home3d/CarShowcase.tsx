import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

function CarModel() {
  const { scene } = useGLTF(MODEL_URL) as any;

  const { prepared, sign } = useMemo(() => {
    const cloned = scene.clone(true);

    // Normalize: center at origin, sit on ground, scale so longest horiz dim ~= 2.4
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

    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });

    // World bbox after normalization
    const worldBox = new THREE.Box3().setFromObject(cloned);
    const worldSize = new THREE.Vector3();
    worldBox.getSize(worldSize);
    const L = Math.max(worldSize.x, worldSize.z);
    const lengthAxis: "x" | "z" = worldSize.x >= worldSize.z ? "x" : "z";

    // EXACT SIGN SPEC
    // width = across the car (text runs this way) = perpendicular to length axis
    // depth = front-to-back along length axis
    const signWidthAcross = 0.20 * L; // across (short axis of car)
    const signHeight = 0.05 * L;
    const signDepthAlongLen = 0.035 * L;

    // Roof top Y at center of car (raycast down from above through center)
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(0, worldBox.max.y + 5, 0), new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(cloned, true);
    const roofY = hits.length > 0 ? hits[0].point.y : worldBox.max.y;

    // Sign local size in [x, y, z]:
    // In the model's LOCAL frame after our clone, world axes X/Z correspond
    // (no rotation applied to `cloned`), so map directly.
    let sizeX: number, sizeZ: number;
    if (lengthAxis === "x") {
      // length is X, so depthAlongLen -> X, widthAcross -> Z
      sizeX = signDepthAlongLen;
      sizeZ = signWidthAcross;
    } else {
      sizeX = signWidthAcross;
      sizeZ = signDepthAlongLen;
    }

    const sign = {
      sizeX,
      sizeY: signHeight,
      sizeZ,
      widthAcross: signWidthAcross,
      centerY: roofY + signHeight / 2,
      lengthAxis,
    };

    return { prepared: cloned, sign };
  }, [scene]);

  // Text runs across the car (perpendicular to length axis).
  // The front/back faces (where text sits) face along the SHORT axis.
  const textRotY = sign.lengthAxis === "x" ? Math.PI / 2 : 0;
  const faceOffset = (sign.lengthAxis === "x" ? sign.sizeX : sign.sizeZ) / 2 + 0.002;
  const textSize = sign.sizeY * 0.58;
  const textMaxWidth = sign.widthAcross * 0.9;

  return (
    <group>
      <primitive object={prepared} />
      {/* Roof sign — child of the car group so it inherits any transform */}
      <group position={[0, sign.centerY, 0]} rotation={[0, textRotY, 0]}>
        {/* Note: after rotY, local X aligns with widthAcross */}
        <mesh castShadow>
          <boxGeometry
            args={[
              sign.widthAcross,
              sign.sizeY,
              sign.lengthAxis === "x" ? sign.sizeX : sign.sizeZ,
            ]}
          />
          <meshStandardMaterial color="#0d0d10" roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Front face text */}
        <Text
          position={[0, 0, (sign.lengthAxis === "x" ? sign.sizeX : sign.sizeZ) / 2 + 0.002]}
          fontSize={textSize}
          color="#F2C14E"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.03}
          maxWidth={textMaxWidth}
        >
          DRIVINGKLASS
        </Text>
        {/* Back face text */}
        <Text
          position={[0, 0, -((sign.lengthAxis === "x" ? sign.sizeX : sign.sizeZ) / 2 + 0.002)]}
          rotation={[0, Math.PI, 0]}
          fontSize={textSize}
          color="#F2C14E"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.03}
          maxWidth={textMaxWidth}
        >
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
