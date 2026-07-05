import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

const SIGN = {
  cx: 0.143,
  cy: 0.833,
  cz: 0.002,
  width: 0.520,
  height: 0.072,
  depth: 0.135,
};
const FACE_OFF = SIGN.depth / 2 + 0.0005;

function makeStarsTexture() {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0d0d10";
  ctx.fillRect(0, 0, w, h);

  const drawStar = (cx: number, cy: number, r: number) => {
    const spikes = 5;
    const inner = r * 0.42;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    }
    ctx.closePath();
    ctx.fillStyle = "#F2C14E";
    ctx.fill();
  };

  const count = 5;
  const r = h * 0.32;
  const slot = w / count;
  for (let i = 0; i < count; i++) {
    drawStar(slot * (i + 0.5), h / 2, r);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}



// Cinematic entrance for the whole car group: fade + rise + rotate settle
function CarModel({ onLoaded }: { onLoaded?: () => void }) {
  const { scene } = useGLTF(MODEL_URL) as any;
  const groupRef = useRef<THREE.Group>(null!);
  const starsTexture = useMemo(() => makeStarsTexture(), []);

  const progress = useRef(0); // 0..1 over ~1.6s
  const notified = useRef(false);

  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cloned.position.sub(center);
    cloned.position.y += size.y / 2;
    const scale = 2.1 / Math.max(size.x, size.z);
    cloned.scale.setScalar(scale);
    cloned.position.multiplyScalar(scale);
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        if (o.material && "envMapIntensity" in o.material) {
          o.material.envMapIntensity = 1.35;
          o.material.needsUpdate = true;
        }
      }
    });
    return cloned;
  }, [scene]);

  useEffect(() => {
    if (!notified.current) {
      notified.current = true;
      onLoaded?.();
    }
  }, [onLoaded]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + dt / 1.6);
      const p = progress.current;
      const e = 1 - Math.pow(1 - p, 3);
      groupRef.current.position.y = -0.35 * (1 - e);
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(-25) * (1 - e);
      const opacity = e;
      groupRef.current.traverse((o: any) => {
        if (o.isMesh && o.material) {
          o.material.transparent = opacity < 1;
          o.material.opacity = opacity;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={prepared} />
      <group position={[SIGN.cx, SIGN.cy, SIGN.cz]}>
        <mesh>
          <boxGeometry args={[SIGN.width, SIGN.height, SIGN.depth]} />
          <meshBasicMaterial color="#0d0d10" toneMapped={false} />
        </mesh>
        <mesh position={[FACE_OFF, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[SIGN.width * 0.95, SIGN.height * 0.85]} />
          <meshBasicMaterial map={starsTexture} toneMapped={false} />
        </mesh>
        <mesh position={[-FACE_OFF, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[SIGN.width * 0.95, SIGN.height * 0.85]} />
          <meshBasicMaterial map={starsTexture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}


// Warm drifting dust particles (max 60, additive)
function DustField() {
  const ref = useRef<THREE.Points>(null!);
  const { positions } = useMemo(() => {
    const n = 60;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 4.5;
      arr[i * 3 + 1] = Math.random() * 2.2 + 0.1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
    }
    return { positions: arr };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const geo = ref.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + dt * 0.04;
      let x = pos.getX(i) + Math.sin((y + i) * 0.6) * dt * 0.01;
      if (y > 2.4) y = 0.05;
      pos.setY(i, y);
      pos.setX(i, x);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={"#F2C14E"}
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

export default function CarShowcase() {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const resumeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(wrapperRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const onStart = () => {
      c.autoRotate = false;
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
    const onEnd = () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true;
      }, 3000);
    };
    c.addEventListener("start", onStart);
    c.addEventListener("end", onEnd);
    return () => {
      c.removeEventListener("start", onStart);
      c.removeEventListener("end", onEnd);
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, [ready]);

  return (
    <div
      ref={wrapperRef}
      className="absolute"
      style={{
        // Expand ~145% beyond the original circle bounds, kept centered.
        top: "50%",
        left: "50%",
        width: "145%",
        height: "145%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none", // ring buttons stay clickable
        zIndex: 0,
      }}
    >
      {/* Gold spinner crossfades out */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: loaded ? 0 : 1,
          transition: "opacity 500ms ease-out",
          pointerEvents: "none",
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: 42,
            height: 42,
            border: "3px solid rgba(242,193,78,0.25)",
            borderTopColor: "rgba(242,193,78,0.9)",
            borderRadius: "50%",
          }}
        />
      </div>

      <Canvas
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 34, position: [3.2, 1.6, 3.2] }}
        style={{
          background: "transparent",
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease-out",
          touchAction: "none",
          pointerEvents: "auto",
        }}
        onCreated={() => setReady(true)}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.32} color={"#FFE7B0"} />
          <directionalLight position={[-3, 4, 3]} intensity={1.35} color={"#FFDFA0"} />
          <directionalLight position={[3.5, 2.2, 2.5]} intensity={0.55} color={"#FFF3D9"} />
          <directionalLight position={[0, 2.5, -4]} intensity={0.9} color={"#FFB86B"} />
          <pointLight position={[0, 0.6, -2.5]} intensity={0.6} color={"#F2A24A"} distance={6} decay={2} />

          <Environment files="/assets/potsdamer_platz_1k.hdr" />

          <CarModel onLoaded={() => setLoaded(true)} />
          <DustField />

          <OrbitControls
            ref={controlsRef}
            enabled
            enableRotate
            enableZoom
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate
            autoRotateSpeed={0.6}
            minDistance={1.5}
            maxDistance={8}
            target={[0, 0.5, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
