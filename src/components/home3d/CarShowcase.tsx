import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

interface SignFaces {
  cx: number;
  cz: number;
  cy: number;
  faceW: number;
  faceH: number;
  off: number;
  facesAlongX: boolean;
}

function CarModel() {
  const { scene } = useGLTF(MODEL_URL) as any;

  const { prepared, faces } = useMemo(() => {
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
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });

    // ---- Measure the existing roof sign (topmost slice of the model). ----
    // Read-only: the model's geometry is never modified.
    let faces: SignFaces | null = null;
    try {
      const worldBox = new THREE.Box3().setFromObject(cloned);
      const worldSize = new THREE.Vector3();
      worldBox.getSize(worldSize);
      const L = Math.max(worldSize.x, worldSize.z);
      const H = worldSize.y;
      const topY = worldBox.max.y;
      const signBand = topY - 0.16 * H;

      const xs: number[] = [];
      const ys: number[] = [];
      const zs: number[] = [];
      const v = new THREE.Vector3();
      cloned.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          const pos = o.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            if (v.y > signBand) {
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

      if (xs.length > 50) {
        const x1 = pct(xs, 0.03), x2 = pct(xs, 0.97);
        const z1 = pct(zs, 0.03), z2 = pct(zs, 0.97);
        const y1 = pct(ys, 0.03), y2 = pct(ys, 0.97);
        const mX = x2 - x1;
        const mZ = z2 - z1;
        const mY = y2 - y1;

        const plausible =
          mX > 0.02 * L && mX < 0.5 * L &&
          mZ > 0.02 * L && mZ < 0.5 * L &&
          mY > 0.015 * L && mY < 0.2 * H &&
          y1 > topY - 0.2 * H;

        if (plausible) {
          const longDim = Math.max(mX, mZ);
          const shortDim = Math.min(mX, mZ);
          faces = {
            cx: (x1 + x2) / 2,
            cz: (z1 + z2) / 2,
            cy: (y1 + y2) / 2,
            faceW: longDim * 0.96,
            faceH: mY * 0.88,
            off: shortDim / 2 + 0.004,
            facesAlongX: mX < mZ,
          };
        }
      }
    } catch (e) {
      console.error("Sign face measurement failed; rendering unmodified car", e);
      faces = null;
    }

    return { prepared: cloned, faces };
  }, [scene]);

  return (
    <group>
      <primitive object={prepared} />
      {faces && <SignFacePlates faces={faces} />}
    </group>
  );
}

/** Paper-thin lettering plates laid over BOTH faces of the existing sign.
 *  The sign's own geometry is untouched — these sit 4mm proud of each face. */
function SignFacePlates({ faces }: { faces: SignFaces }) {
  const textProps = {
    fontSize: faces.faceH * 0.52,
    color: "#F2C14E",
    anchorX: "center" as const,
    anchorY: "middle" as const,
    letterSpacing: 0.03,
    maxWidth: faces.faceW * 0.94,
  };

  const plate = (
    <>
      <mesh>
        <planeGeometry args={[faces.faceW, faces.faceH]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.55} metalness={0.15} />
      </mesh>
      <Text position={[0, 0, 0.002]} {...textProps}>
        DRIVINGKLASS
      </Text>
    </>
  );

  return (
    <group position={[faces.cx, faces.cy, faces.cz]}>
      {faces.facesAlongX ? (
        <>
          <group position={[faces.off, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            {plate}
          </group>
          <group position={[-faces.off, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            {plate}
          </group>
        </>
      ) : (
        <>
          <group position={[0, 0, faces.off]}>{plate}</group>
          <group position={[0, 0, -faces.off]} rotation={[0, Math.PI, 0]}>
            {plate}
          </group>
        </>
      )}
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
