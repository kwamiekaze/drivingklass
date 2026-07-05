import { Component, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";
import goldCarFallback from "@/assets/gold-car-transparent.png";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

// Cover box enlarged in +0.006 steps until no baked sign/star peeks around it.
const SIGN = {
  cx: 0.145,
  cy: 0.861,
  cz: 0.007,
  width: 0.508,  // was 0.478
  height: 0.054, // was 0.036
  depth: 0.097,  // was 0.079
};
const FACE_OFF = SIGN.depth / 2 + 0.002;

function makeStarPlateTexture() {
  const w = 1024;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0d0d10";
  ctx.fillRect(0, 0, w, h);

  const drawStar = (cx: number, cy: number, r: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(angle) * rad;
      const y = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = "#F2C14E";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();
  };

  const count = 5;
  const pad = w * 0.08;
  const usable = w - pad * 2;
  const step = usable / (count - 1);
  const r = h * 0.38;
  for (let i = 0; i < count; i++) {
    drawStar(pad + step * i, h / 2, r, "#F2C14E");
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

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

  const starTex = useMemo(() => makeStarPlateTexture(), []);
  const plateW = SIGN.width * 0.92;
  const plateH = SIGN.height * 0.9;

  return (
    <group>
      <primitive object={prepared} />
      {/* Sign cover box + 5-star plates */}
      <group position={[SIGN.cx, SIGN.cy, SIGN.cz]}>
        <mesh castShadow>
          <boxGeometry args={[SIGN.depth, SIGN.height, SIGN.width]} />
          <meshStandardMaterial color="#0d0d10" roughness={0.6} metalness={0.15} />
        </mesh>
        {/* +X face */}
        <mesh position={[FACE_OFF, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[plateW, plateH]} />
          <meshBasicMaterial map={starTex} toneMapped={false} />
        </mesh>
        {/* -X face */}
        <mesh position={[-FACE_OFF, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[plateW, plateH]} />
          <meshBasicMaterial map={starTex} toneMapped={false} />
        </mesh>
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

function LoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid rgba(242,193,78,0.2)",
            borderTopColor: "#F2C14E",
            animation: "dk-car-spin 900ms linear infinite",
          }}
        />
        <div
          style={{
            color: "#F2C14E",
            fontSize: 13,
            letterSpacing: 0.4,
            fontWeight: 500,
            whiteSpace: "nowrap",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          Loading your ride…
        </div>
        <style>{`@keyframes dk-car-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Html>
  );
}

class CarErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[CarShowcase] 3D load failed, using fallback image", err);
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ borderRadius: "50%", overflow: "hidden" }}
        >
          <img
            src={goldCarFallback}
            alt="DrivingKlass gold car"
            style={{ width: "82%", height: "auto", objectFit: "contain", filter: "drop-shadow(0 8px 24px rgba(242,193,78,0.35))" }}
          />
        </div>
      );
    }
    return this.props.children;
  }
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
      <CarErrorBoundary>
        <Canvas
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          shadows
          camera={{ fov: 35, position: [3.2, 1.6, 3.2] }}
          style={{ background: "transparent", opacity: ready ? 1 : 0, transition: "opacity 600ms ease-out" }}
          onCreated={() => setReady(true)}
        >
          <Suspense fallback={<LoadingFallback />}>
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
      </CarErrorBoundary>
    </div>
  );
}
