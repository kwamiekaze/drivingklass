import { useFrame, useLoader } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { supabase } from "@/integrations/supabase/client";
import { useGlbAvailable, GLB_URL } from "./useGlbAvailable";
import carImage from "@/assets/car-headlights-off.png";

/**
 * Resolves the current auth destination the same way CarCenterLink does.
 */
function useAuthDestination(): string {
  const [dest, setDest] = useState("/auth");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        setDest("/auth");
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const role = roleData?.role;
      if (role === "admin" || role === "staff") setDest("/admin");
      else if (role === "instructor") setDest("/instructor");
      else setDest("/student");
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return dest;
}

interface Props {
  autoRotate: boolean;
}

export function DkCar({ autoRotate }: Props) {
  const glb = useGlbAvailable();
  const dest = useAuthDestination();

  return (
    <group>
      {/* Real GLB when the file exists on disk. */}
      {glb === true ? (
        <Suspense fallback={<CarFallback autoRotate={autoRotate} />}>
          <GlbCar autoRotate={autoRotate} />
        </Suspense>
      ) : (
        <CarFallback autoRotate={autoRotate} />
      )}

      {/* Invisible full-car click target that routes like CarCenterLink. */}
      <Html
        center
        position={[0, 0.5, 0]}
        distanceFactor={7}
        pointerEvents="auto"
      >
        <a
          href={dest}
          aria-label={dest === "/auth" ? "Sign in" : "Go to your dashboard"}
          className="block w-[200px] h-[120px] rounded-2xl"
          style={{ background: "transparent" }}
          onClick={(e) => {
            // Let React Router handle it via a full nav — Index is client-side too,
            // but Link isn't available here. window.location keeps it simple.
            e.preventDefault();
            window.location.assign(dest);
          }}
        />
      </Html>
    </group>
  );
}

function GlbCar({ autoRotate }: { autoRotate: boolean }) {
  const gltf = useLoader(GLTFLoader, GLB_URL);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && autoRotate) ref.current.rotation.y += dt * 0.15;
  });
  return (
    <group ref={ref} scale={1}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function CarFallback({ autoRotate }: { autoRotate: boolean }) {
  const texture = useLoader(THREE.TextureLoader, carImage);
  texture.anisotropy = 8;
  const ref = useRef<THREE.Group>(null);
  const floatRef = useRef(0);
  useFrame((_, dt) => {
    floatRef.current += dt;
    if (!ref.current) return;
    if (autoRotate) ref.current.rotation.y += dt * 0.15;
    ref.current.position.y = 0.5 + Math.sin(floatRef.current * 1.2) * 0.05;
  });

  // Aspect from asset (approx 3:2); use a tilted plane so it reads as 3D.
  return (
    <group ref={ref} position={[0, 0.5, 0]} rotation={[-0.28, 0, 0]}>
      {/* Layered shadow / reflection */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 48]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -0.5, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 48]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      {/* Gold glow behind the car */}
      <mesh position={[0, 0.1, -0.02]}>
        <planeGeometry args={[2.6, 2.0]} />
        <meshBasicMaterial
          color="#f2c14e"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Car image */}
      <mesh>
        <planeGeometry args={[1.9, 2.6]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
