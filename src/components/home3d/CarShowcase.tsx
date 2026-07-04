import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";
import goldCarFallback from "@/assets/gold-car-transparent.png";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL, true);

function CarModel() {
  const { scene } = useGLTF(MODEL_URL, true) as any;

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

    const worldBox = new THREE.Box3().setFromObject(cloned);
    const worldSize = new THREE.Vector3();
    worldBox.getSize(worldSize);
    const L = Math.max(worldSize.x, worldSize.z);
    const H = worldSize.y;
    const topY = worldBox.max.y;
    const lengthAxis: "x" | "z" = worldSize.x >= worldSize.z ? "x" : "z";

    // Structural roof band: the original roof sign is the highest part of the
    // model, so its vertices live in the top slice of the model's height.
    // NO raycasting — this cannot return a bogus floor height.
    const signBand = topY - 0.16 * H;

    // Defaults (used if measurement fails): spec-proportion sign near the top,
    // and NO flattening (a leftover sign is better than a crushed car).
    let cx = 0;
    let cz = 0;
    let baseY = topY - 0.12 * H;
    let sizeX: number;
    let sizeZ: number;
    let sizeY = 0.05 * L;
    if (lengthAxis === "x") {
      sizeX = 0.035 * L;
      sizeZ = 0.2 * L;
    } else {
      sizeX = 0.2 * L;
      sizeZ = 0.035 * L;
    }
    let doFlatten = false;
    let flattenTo = topY;

    try {
      // ---- MEASURE the original roof sign (vertices in the top band) ----
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
        const x1 = pct(xs, 0.02), x2 = pct(xs, 0.98);
        const z1 = pct(zs, 0.02), z2 = pct(zs, 0.98);
        const y1 = pct(ys, 0.02);
        const mX = x2 - x1;
        const mZ = z2 - z1;

        // Sanity guards: a roof sign is small. If the measured blob looks like
        // the whole roof or the whole car, DO NOT trust it and do not flatten.
        const plausible =
          mX > 0.02 * L && mX < 0.5 * L &&
          mZ > 0.02 * L && mZ < 0.5 * L &&
          y1 > topY - 0.2 * H;

        if (plausible) {
          cx = (x1 + x2) / 2;
          cz = (z1 + z2) / 2;
          baseY = y1;
          sizeX = Math.min(mX * 1.04, 0.45 * L);
          sizeZ = Math.min(mZ * 1.04, 0.45 * L);
          sizeY = Math.min(Math.max((topY - y1) * 1.02, 0.03 * L), 0.09 * L);
          flattenTo = baseY + 0.004;
          // HARD SAFETY RAIL: never allowed to flatten below the roofline.
          doFlatten = flattenTo > worldBox.min.y + 0.6 * H;
        }
      }

      if (doFlatten) {
        const cutoff = flattenTo + 0.006;
        cloned.traverse((o: any) => {
          if (o.isMesh && o.geometry?.attributes?.position) {
            // Clone geometry before mutating so the GLTF cache stays pristine.
            o.geometry = o.geometry.clone();
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
      }
    } catch (e) {
      // On any failure: leave the model completely untouched.
      console.error("Roof sign processing failed; rendering unmodified car", e);
    }

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

function LoadedSignal({ onLoaded }: { onLoaded: () => void }) {
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);
  return null;
}

class CarErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error("CarShowcase failed to render 3D car:", err);
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function LoadingOverlay() {
  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "3px solid rgba(242,193,78,0.18)",
          borderTopColor: "#F2C14E",
          animation: "dk-car-spin 900ms linear infinite",
        }}
      />
      <div style={{ color: "#F2C14E", fontSize: 12, letterSpacing: 0.5, fontWeight: 500 }}>
        Loading your ride…
      </div>
      <style>{`@keyframes dk-car-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorFallback() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <img
        src={goldCarFallback}
        alt="DrivingKlass gold car"
        style={{ width: "82%", height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

export default function CarShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const showCanvas = canvasReady && modelLoaded && !errored;

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

      {!modelLoaded && !errored && <LoadingOverlay />}
      {errored && <ErrorFallback />}

      {!errored && (
        <Canvas
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          shadows
          camera={{ fov: 35, position: [3.2, 1.6, 3.2] }}
          style={{
            background: "transparent",
            opacity: showCanvas ? 1 : 0,
            transition: "opacity 600ms ease-out",
          }}
          onCreated={() => setCanvasReady(true)}
        >
          <Suspense fallback={null}>
            <CarErrorBoundary onError={() => setErrored(true)}>
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
              <LoadedSignal onLoaded={() => setModelLoaded(true)} />
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
            </CarErrorBoundary>
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
