import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getPackagesSortedByPosition, type Package } from "@/data/packages";
import { PriceCard } from "./PriceCard";
import { useSound } from "./SoundManager";

interface Props {
  radius?: number;
  height?: number;
  onSelect: (pkg: Package) => void;
  onBook: (pkg: Package) => void;
}

export function PriceRing({
  radius = 2.6,
  height = 0.6,
  onSelect,
  onBook,
}: Props) {
  const packages = useMemo(() => getPackagesSortedByPosition(), []);
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { play } = useSound();
  // reusable temp vectors to avoid per-frame allocations
  const tmpWorld = useRef(new THREE.Vector3());
  const tmpCam = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (!hoveredId) {
      groupRef.current.rotation.y += delta * 0.1; // slow rotation
    }

    // Compute far-side dim per card based on angle to camera
    const cam = state.camera;
    cam.getWorldPosition(tmpCam.current);
    groupRef.current.children.forEach((child) => {
      child.getWorldPosition(tmpWorld.current);
      const dx = tmpCam.current.x - tmpWorld.current.x;
      const dz = tmpCam.current.z - tmpWorld.current.z;
      const distToCam = Math.sqrt(dx * dx + dz * dz);
      // relative dim: front cards close to camera XZ, far ones farther
      const t = THREE.MathUtils.clamp(
        (distToCam - (radius - 0.6)) / (radius * 2),
        0,
        1
      );
      (child.userData as { dim?: number }).dim = t;
      // Emit event via CustomEvent so React can pick up? Simpler: store on userData
      // and let PriceRingHtml read via callback below through refs.
      const setter = (child.userData as { setDim?: (v: number) => void })
        .setDim;
      if (setter) setter(t);
    });
  });

  return (
    <group ref={groupRef} position={[0, height, 0]}>
      {packages.map((pkg, i) => {
        const angle = (i / packages.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <RingCard
            key={pkg.id}
            position={[x, 0, z]}
            pkg={pkg}
            hovered={hoveredId === pkg.id}
            onEnter={() => {
              setHoveredId(pkg.id);
              play("tick");
            }}
            onLeave={() =>
              setHoveredId((cur) => (cur === pkg.id ? null : cur))
            }
            onOpen={() => onSelect(pkg)}
            onBook={() => onBook(pkg)}
          />
        );
      })}
    </group>
  );
}

interface RingCardProps {
  position: [number, number, number];
  pkg: Package;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onOpen: () => void;
  onBook: () => void;
}

function RingCard({
  position,
  pkg,
  hovered,
  onEnter,
  onLeave,
  onOpen,
  onBook,
}: RingCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [dim, setDim] = useState(0);

  // Register setter into userData so PriceRing's frame loop can update dim per card.
  const attachSetter = (g: THREE.Group | null) => {
    groupRef.current = g;
    if (g) (g.userData as { setDim?: (v: number) => void }).setDim = setDim;
  };

  return (
    <group ref={attachSetter} position={position}>
      <Html center distanceFactor={7} zIndexRange={[20, 0]} pointerEvents="auto">
        <PriceCard
          pkg={pkg}
          hovered={hovered}
          dimAmount={dim}
          onEnter={onEnter}
          onLeave={onLeave}
          onOpen={onOpen}
          onBook={onBook}
        />
      </Html>
    </group>
  );
}
