import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

const MODEL_URL = carAsset.url;
useGLTF.preload(MODEL_URL);

// Roof-sign cover box (measured from opt.glb top band)
const SIGN = {
  cx: 0.143,
  cy: 0.833,
  cz: 0.002,
  width: 0.520,
  height: 0.072,
  depth: 0.135,
};
const FACE_OFF = SIGN.depth / 2 + 0.002;

// Cinematic entrance for the whole car group: fade + rise + rotate settle
function CarModel({ onLoaded }: { onLoaded?: () => void }) {
  const { scene } = useGLTF(MODEL_URL) as any;
  const groupRef = useRef<THREE.Group>(null!);
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
    // Slightly larger for hero dominance
    const scale = 2.75 / Math.max(size.x, size.z);
    cloned.scale.setScalar(scale);
    cloned.position.multiplyScalar(scale);
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
        // Enhance gold: bump env intensity if PBR
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
      // easeOutCubic
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

  const textProps = {
    fontSize: SIGN.height * 0.56,
    color: "#F2C14E",
    anchorX: "center" as const,
    anchorY: "middle" as const,
    letterSpacing: 0.1,
    maxWidth: SIGN.width * 0.95,
  };

  return (
    <group ref={groupRef}>
      <primitive object={prepared} />
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
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={"#F2C14E"}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Radial gradient spotlight pool on the ground under the car
function GroundGlow() {
  const texture = useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(242,193,78,0.55)");
    grad.addColorStop(0.35, "rgba(242,193,78,0.22)");
    grad.addColorStop(1, "rgba(242,193,78,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);
  return (
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.5, 4.5]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Camera bob + mouse parallax + inertial rotation control
function CameraRig({
  enabled,
  dragVelocity,
  isDragging,
}: {
  enabled: boolean;
  dragVelocity: React.MutableRefObject<number>;
  isDragging: React.MutableRefObject<boolean>;
}) {
  const baseY = useRef<number | null>(null);
  const azimuth = useRef(0);
  const targetAzimuth = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  const { camera, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const handle = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [gl]);

  useFrame((_, dt) => {
    if (baseY.current === null) baseY.current = camera.position.y;

    // Inertial azimuth: drag velocity decays; auto-rotate when idle
    if (isDragging.current) {
      azimuth.current += dragVelocity.current * dt;
    } else {
      azimuth.current += dragVelocity.current * dt;
      dragVelocity.current *= Math.pow(0.001, dt); // fast decay
      if (Math.abs(dragVelocity.current) < 0.02 && enabled) {
        azimuth.current += dt * 0.35; // slow auto-rotate (rad/s)
      }
    }

    // Mouse parallax (few degrees) when not dragging
    const parallaxDeg = isDragging.current ? 0 : 4;
    targetAzimuth.current = THREE.MathUtils.degToRad(parallaxDeg) * mouse.current.x;
    const parallaxY = enabled ? Math.sin(performance.now() * 0.00095) * 0.04 : 0;

    const radius = 3.2;
    const yAngle = azimuth.current + targetAzimuth.current;
    camera.position.x = Math.sin(yAngle) * radius;
    camera.position.z = Math.cos(yAngle) * radius;
    camera.position.y = (baseY.current ?? 1.6) + parallaxY - mouse.current.y * 0.1;
    camera.lookAt(0, 0.5, 0);
  });
  return null;
}

export default function CarShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const dragVelocity = useRef(0);
  const isDragging = useRef(false);
  const lastPointerX = useRef(0);
  const lastPointerT = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const l = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", l);
    return () => mq.removeEventListener("change", l);
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(wrapperRef.current);
    return () => io.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPointerX.current = e.clientX;
    lastPointerT.current = performance.now();
    dragVelocity.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const now = performance.now();
    const dx = e.clientX - lastPointerX.current;
    const dt = Math.max(1, now - lastPointerT.current) / 1000;
    // Rotate radians per second
    dragVelocity.current = (dx * 0.008) / dt;
    lastPointerX.current = e.clientX;
    lastPointerT.current = now;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      style={{ borderRadius: "50%", overflow: "hidden", pointerEvents: "auto" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 55%, rgba(242,193,78,0.14) 0%, rgba(242,193,78,0.06) 40%, transparent 72%)",
          pointerEvents: "none",
        }}
      />

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
          style={{
            width: 42,
            height: 42,
            border: "3px solid rgba(242,193,78,0.25)",
            borderTopColor: "rgba(242,193,78,0.9)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>

      <Canvas
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        shadows
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 34, position: [3.2, 1.6, 3.2] }}
        style={{
          background: "transparent",
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease-out",
          cursor: isDragging.current ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onCreated={() => setReady(true)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <Suspense fallback={null}>
          {/* Three-point warm rig + rim */}
          <ambientLight intensity={0.32} color={"#FFE7B0"} />
          {/* Key */}
          <directionalLight
            position={[-3, 4, 3]}
            intensity={1.35}
            color={"#FFDFA0"}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          {/* Fill */}
          <directionalLight position={[3.5, 2.2, 2.5]} intensity={0.55} color={"#FFF3D9"} />
          {/* Back / rim */}
          <directionalLight position={[0, 2.5, -4]} intensity={0.9} color={"#FFB86B"} />
          {/* Low warm rim */}
          <pointLight position={[0, 0.6, -2.5]} intensity={0.6} color={"#F2A24A"} distance={6} decay={2} />

          <Environment files="/assets/potsdamer_platz_1k.hdr" />

          <GroundGlow />
          <CarModel onLoaded={() => setLoaded(true)} />
          <DustField />

          <ContactShadows position={[0, 0, 0]} opacity={0.6} blur={3.2} far={3.5} scale={7} />

          {/* Custom rig replaces OrbitControls autoRotate for inertial feel */}
          <CameraRig
            enabled={!reducedMotion}
            dragVelocity={dragVelocity}
            isDragging={isDragging}
          />
          <OrbitControls
            enabled={false}
            enableZoom={false}
            enablePan={false}
            target={[0, 0.5, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
