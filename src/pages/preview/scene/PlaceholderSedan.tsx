import { useMemo } from "react";
import * as THREE from "three";

const GOLD = "#d4a437";
const DARK = "#0a0a0a";
const GLASS = "#0e0f13";

function GoldStar({
  position,
  scale = 1,
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outer = 0.5;
    const inner = 0.22;
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
  }, []);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow>
      <meshPhysicalMaterial
        color={GOLD}
        metalness={1}
        roughness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.1}
        emissive={GOLD}
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.32, 32]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.001, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.34, 24]} />
        <meshPhysicalMaterial
          color={GOLD}
          metalness={1}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </mesh>
    </group>
  );
}

export function PlaceholderSedan() {
  return (
    <group position={[0, 0, 0]}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.7, 1.85]} />
        <meshPhysicalMaterial
          color={GOLD}
          metalness={0.9}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </mesh>
      {/* Lower skirt */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[4.25, 0.28, 1.9]} />
        <meshStandardMaterial color="#1a1408" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Cabin */}
      <mesh position={[-0.1, 1.05, 0]} castShadow>
        <boxGeometry args={[2.4, 0.75, 1.65]} />
        <meshPhysicalMaterial
          color={GOLD}
          metalness={0.9}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </mesh>
      {/* Glass wraparound */}
      <mesh position={[-0.1, 1.06, 0]}>
        <boxGeometry args={[2.36, 0.6, 1.7]} />
        <meshPhysicalMaterial
          color={GLASS}
          metalness={0.4}
          roughness={0.05}
          transmission={0.6}
          thickness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Roof sign */}
      <mesh position={[-0.1, 1.55, 0]} castShadow>
        <boxGeometry args={[1.4, 0.28, 0.5]} />
        <meshStandardMaterial color={DARK} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* 5 gold stars on roof sign — front face */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => (
        <GoldStar
          key={`roof-f-${i}`}
          position={[-0.1 + x, 1.55, 0.26]}
          scale={0.28}
        />
      ))}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => (
        <GoldStar
          key={`roof-b-${i}`}
          position={[-0.1 + x, 1.55, -0.26]}
          scale={0.28}
          rotation={[0, Math.PI, 0]}
        />
      ))}
      {/* 5 stars along each side (door decals) */}
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => (
        <GoldStar
          key={`side-l-${i}`}
          position={[x, 0.6, 0.94]}
          scale={0.22}
        />
      ))}
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => (
        <GoldStar
          key={`side-r-${i}`}
          position={[x, 0.6, -0.94]}
          scale={0.22}
          rotation={[0, Math.PI, 0]}
        />
      ))}
      {/* Wheels */}
      <Wheel position={[1.35, 0.42, 1.0]} />
      <Wheel position={[-1.35, 0.42, 1.0]} />
      <Wheel position={[1.35, 0.42, -1.0]} />
      <Wheel position={[-1.35, 0.42, -1.0]} />
      {/* Headlight glow */}
      <mesh position={[2.11, 0.6, 0.55]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial emissive="#fff2c8" emissiveIntensity={2} color="#fff2c8" />
      </mesh>
      <mesh position={[2.11, 0.6, -0.55]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial emissive="#fff2c8" emissiveIntensity={2} color="#fff2c8" />
      </mesh>
    </group>
  );
}
