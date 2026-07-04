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

    // Roof height at the car's center (raycast straight down)
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(0, worldBox.max.y + 5, 0), new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(cloned, true);
    const roofYCenter = hits.length > 0 ? hits[0].point.y : worldBox.max.y - 0.2;

    // ---- MEASURE the model's ORIGINAL roof sign ----
    // Collect every vertex that sits above the roofline; percentile-trim to
    // ignore thin outliers like the antenna.
    const thresh = roofYCenter + 0.012;
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const v = new THREE.Vector3();
    cloned.updateMatrixWorld(true);
    cloned.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (v.y > thresh) {
            xs.push(v.x);
            ys.push(v.y);
            zs.push(v.z);
          }
        }
      }
    });

    const pct = (arr: number[], p: number) => {
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
    };

    let cx = 0;
    let cz = 0;
    let baseY = roofYCenter;
    let mSizeX = 0;
    let mSizeY = 0;
    let mSizeZ = 0;
    let measured = false;

    if (xs.length > 50) {
      const x1 = pct(xs, 0.02), x2 = pct(xs, 0.98);
      const z1 = pct(zs, 0.02), z2 = pct(zs, 0.98);
      const y1 = pct(ys, 0.02), y2 = pct(ys, 0.98);
      cx = (x1 + x2) / 2;
      cz = (z1 + z2) / 2;
      baseY = y1;
      mSizeX = x2 - x1;
      mSizeY = y2 - y1;
      mSizeZ = z2 - z1;
      measured = mSizeX > 0.02 && mSizeZ > 0.02 && mSizeY > 0.01;
    }

    if (!measured) {
      // Fallback: taxi-sign proportions at the roof center
      cx = 0;
      cz = 0;
      baseY = roofYCenter;
      const across = 0.2 * L;
      const alongLen = 0.035 * L;
      mSizeY = 0.05 * L;
      if (lengthAxis === "x") {
        mSizeX = alongLen;
        mSizeZ = across;
      } else {
        mSizeX = across;
        mSizeZ = alongLen;
      }
    }

    const clamp = (val: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, val));
    const sizeX = clamp(mSizeX * 1.04, 0.02 * L, 0.45 * L);
    const sizeZ = clamp(mSizeZ * 1.04, 0.02 * L, 0.45 * L);
    const sizeY = clamp(mSizeY * 1.02, 0.03 * L, 0.09 * L);

    // ---- FLATTEN the original sign into the roof ----
    // Everything above both the roof apex and the sign's base gets pressed
    // down; the sliver that remains is hidden inside our replacement box.
    const flattenTo = Math.max(roofYCenter, baseY) + 0.006;
    const cutoff = flattenTo + 0.006;
    cloned.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        const pos = o.geometry.attributes.position;
        const inv = new THREE.Matrix4().copy(o.matrixWorld).invert();
        let changed = false;
        const w = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          w.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (w.y > cutoff) {
            w.y = flattenTo;
            w.applyMatrix4(inv);
            pos.setXYZ(i, w.x, w.y, w.z);
            changed = true;
          }
        }
        if (changed) {
          pos.needsUpdate = true;
          o.geometry.computeVertexNormals();
          o.geometry.computeBoundingBox();
          o.geometry.computeBoundingSphere();
        }
      }
    });

    // Text sits on the two faces whose normal runs along the sign's SHORT
    // horizontal axis, so the word runs the length of the sign bar.
    const longDim = Math.max(sizeX, sizeZ);
    const shortDim = Math.min(sizeX, sizeZ);
    const facesAlongX = sizeX < sizeZ;

    const sign = {
      cx,
      cz,
      baseY,
      sizeX,
      sizeY,
      sizeZ,
      facesAlongX,
      off: shortDim / 2 + 0.003,
      textSize: sizeY * 0.55,
      textMaxWidth: longDim * 0.92,
    };

    return { prepared: cloned, sign };
  }, [scene]);

  const textProps = {
    fontSize: sign.textSize,
    color: "#F2C14E",
    anchorX: "center" as const,
    anchorY: "middle" as const,
    letterSpacing: 0.03,
    maxWidth: sign.textMaxWidth,
  };

  return (
    <group>
      <primitive object={prepared} />
      {/* The one and only roof sign — rebuilt in the original sign's measured spot */}
      <group position={[sign.cx, sign.baseY + sign.sizeY / 2, sign.cz]}>
        <mesh castShadow>
          <boxGeometry args={[sign.sizeX, sign.sizeY, sign.sizeZ]} />
          <meshStandardMaterial color="#0d0d10" roughness={0.55} metalness={0.15} />
        </mesh>
        {sign.facesAlongX ? (
          <>
            <Text position={[sign.off, 0, 0]} rotation={[0, Math.PI / 2, 0]} {...textProps}>
              DRIVINGKLASS
            </Text>
            <Text position={[-sign.off, 0, 0]} rotation={[0, -Math.PI / 2, 0]} {...textProps}>
              DRIVINGKLASS
            </Text>
          </>
        ) : (
          <>
            <Text position={[0, 0, sign.off]} {...textProps}>
              DRIVINGKLASS
            </Text>
            <Text position={[0, 0, -sign.off]} rotation={[0, Math.PI, 0]} {...textProps}>
              DRIVINGKLASS
            </Text>
          </>
        )}
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
