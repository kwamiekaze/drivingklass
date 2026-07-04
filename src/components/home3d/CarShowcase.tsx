import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

// Measured from new opt.glb, band f=0.03 (see STEP 2 output):
// x=[0.1097,0.1808] (span 0.0712), y=[0.8456,0.8754], z=[-0.2282,0.2413] (span 0.4695)
// Padded slightly to fully hide original sign face.
const SIGN = {
  cx: 0.145,
  cy: 0.861,
  cz: 0.007,
  width: 0.478,  // long span along Z + ~0.008 pad
  height: 0.036, // topY - y[0] + ~0.006 pad
  depth: 0.079,  // short span along X + ~0.008 pad
};
const LONG_AXIS: "x" | "z" = "z";

function makeStarsTexture(): THREE.CanvasTexture {
  const w = 512, h = 160;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  const drawStar = (cx: number, cy: number, R: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? R : R * 0.42;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
    g.addColorStop(0, "#FFE9A8"); g.addColorStop(0.5, "#F2C14E"); g.addColorStop(1, "#C9971F");
    ctx.fillStyle = g; ctx.fill();
  };
  const R = 42, gap = w / 5;
  for (let i = 0; i < 5; i++) drawStar(gap * i + gap / 2, h / 2, R);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8; tex.needsUpdate = true;
  return tex;
}

function CarModel() {
  const { scene } = useGLTF(MODEL_URL) as any;
  const starTex = useMemo(makeStarsTexture, []);

  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3(); const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    cloned.position.sub(center);
    cloned.position.y += size.y / 2;
    const scale = 2.4 / Math.max(size.x, size.z);
    cloned.scale.setScalar(scale);
    cloned.position.multiplyScalar(scale);
    cloned.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return cloned;
  }, [scene]);

  const faceOff = LONG_AXIS === "z" ? SIGN.depth / 2 + 0.002 : SIGN.depth / 2 + 0.002;
  const plateW = SIGN.width * 0.9;
  const plateH = SIGN.height * 0.66;

  const StarPlate = () => (
    <mesh>
      <planeGeometry args={[plateW, plateH]} />
      <meshBasicMaterial map={starTex} transparent toneMapped={false} />
    </mesh>
  );

  return (
    <group>
      <primitive object={prepared} />
      <group position={[SIGN.cx, SIGN.cy, SIGN.cz]}>
        <mesh castShadow>
          <boxGeometry args={[SIGN.depth, SIGN.height, SIGN.width]} />
          <meshStandardMaterial color="#0d0d10" roughness={0.5} metalness={0.2} />
        </mesh>
        {LONG_AXIS === "z" ? (
          <>
            <group position={[faceOff, 0, 0]} rotation={[0, Math.PI / 2, 0]}><StarPlate /></group>
            <group position={[-faceOff, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><StarPlate /></group>
          </>
        ) : (
          <>
            <group position={[0, 0, faceOff]}><StarPlate /></group>
            <group position={[0, 0, -faceOff]} rotation={[0, Math.PI, 0]}><StarPlate /></group>
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
    const l = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", l);
    return () => mq.removeEventListener("change", l);
  }, []);

  return (
    <div className="absolute inset-0" style={{ borderRadius: "50%", overflow: "hidden", pointerEvents: "auto" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 55%, rgba(242,193,78,0.12) 0%, rgba(242,193,78,0.06) 40%, transparent 70%)", pointerEvents: "none" }} />
      <Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 2]} shadows camera={{ fov: 35, position: [3.2, 1.6, 3.2] }}
        style={{ background: "transparent", opacity: ready ? 1 : 0, transition: "opacity 600ms ease-out" }}
        onCreated={() => setReady(true)}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[-3, 4, 3]} intensity={1.2} color={"#FFE7B0"} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <directionalLight position={[3, 2, -2]} intensity={0.4} color={"#ffffff"} />
          <Environment preset="city" />
          <CarModel />
          <ContactShadows position={[0, 0, 0]} opacity={0.45} blur={2.4} far={3} scale={6} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate={!reducedMotion} autoRotateSpeed={0.7} minPolarAngle={Math.PI * 0.36} maxPolarAngle={Math.PI * 0.46} target={[0, 0.5, 0]} />
          <CameraBob enabled={!reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
