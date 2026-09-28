import { useMemo } from "react";
import { LOW_POWER, brushedGold, goldProps } from "./shared";

/** Heavy honey-gold velvet drapes gathered either side of the window. */
export function Drapes() {
  const folds = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);
  const panel = (x: number, side: number) => (
    <group position={[x, 0, -4.98]}>
      {folds.map((i) => (
        <mesh
          key={i}
          position={[side * (i * 0.036 - 0.1), 2.08, (i % 2) * 0.03]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.036, 2.42, 12, 1, true]} />
          <meshStandardMaterial color={i % 2 ? "#a8742f" : "#b98640"} roughness={0.85} side={2} />
        </mesh>
      ))}
      {/* tie-back with a gold tassel */}
      <mesh position={[0, 1.25, 0.06]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.13, 0.014, 8, 24]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[side * 0.1, 1.12, 0.09]}>
        <coneGeometry args={[0.028, 0.14, 12]} />
        <meshStandardMaterial {...goldProps} roughness={0.35} />
      </mesh>
    </group>
  );
  return (
    <group>
      {panel(-1.93, -1)}
      {panel(1.93, 1)}
      {/* brass rod with ball finials */}
      <mesh position={[0, 3.3, -4.93]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 4.4, 12]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      {[-2.22, 2.22].map((x) => (
        <mesh key={x} position={[x, 3.3, -4.93]}>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      ))}
    </group>
  );
}

/** Brass wall sconce with a glowing linen shade. */
export function Sconce({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.09, 0.2, 0.02]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      <mesh position={[0, 0, 0.09]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.01, 0.01, 0.16, 8]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0, 0.07, 0.17]}>
        <cylinderGeometry args={[0.07, 0.09, 0.16, 24, 1, true]} />
        <meshStandardMaterial
          color="#fff0d2"
          emissive="#ffc877"
          emissiveIntensity={1.4}
          side={2}
          roughness={0.9}
          toneMapped={false}
        />
      </mesh>
      {/* warm wash on the wall */}
      <mesh position={[0, 0.12, 0.002]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#ffcf8a" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Walnut ceiling beams with recessed warm downlights between them. */
export function CeilingBeams() {
  const xs = [-3, 0, 3];
  const zs = [-2.6, 0.2, 3.0];
  return (
    <group>
      {xs.map((x) => (
        <mesh key={`x${x}`} position={[x, 3.53, 0]} castShadow>
          <boxGeometry args={[0.16, 0.14, 10.4]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.5} />
        </mesh>
      ))}
      {zs.map((z) => (
        <mesh key={`z${z}`} position={[0, 3.54, z]}>
          <boxGeometry args={[12, 0.12, 0.14]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.5} />
        </mesh>
      ))}
      {[-4.5, -1.5, 1.5, 4.5].flatMap((x) =>
        [-3.9, -1.2, 1.6, 4.1].map((z) => (
          <group key={`${x}${z}`} position={[x, 3.595, z]}>
            <mesh rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.09, 24]} />
              <meshStandardMaterial color="#fff2d8" emissive="#ffd08a" emissiveIntensity={2} toneMapped={false} />
            </mesh>
            <mesh rotation-x={Math.PI / 2} position={[0, 0.001, 0]}>
              <ringGeometry args={[0.09, 0.11, 24]} />
              <meshStandardMaterial {...brushedGold} side={2} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

/** Brass floor lamp with a warm drum shade. */
export function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.19, 0.03, 32]} />
        <meshStandardMaterial {...goldProps} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 1.56, 10]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0, 1.66, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.3, 32, 1, true]} />
        <meshStandardMaterial
          color="#fbeccd"
          emissive="#ffc47a"
          emissiveIntensity={1.1}
          side={2}
          roughness={0.9}
          toneMapped={false}
        />
      </mesh>
      {!LOW_POWER && <pointLight position={[0, 1.55, 0]} intensity={1.1} distance={4.5} color="#ffcf8a" />}
    </group>
  );
}

const PACK_COLORS = ["#141210", "#6b4428", "#1d2c3a"];

/** A student's backpack slumped against a desk leg. */
export function Backpack({
  position,
  rotationY = 0,
  variant = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
  variant?: number;
}) {
  const color = PACK_COLORS[variant % PACK_COLORS.length]!;
  return (
    <group position={position} rotation={[0.18, rotationY, 0]}>
      <mesh position={[0, 0.2, 0]} scale={[0.17, 0.21, 0.1]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.12, 0.085]} scale={[0.12, 0.09, 0.05]} castShadow>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.35, 0.02]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.05, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1715" roughness={0.6} />
      </mesh>
      <mesh position={[0.05, 0.2, 0.1]}>
        <boxGeometry args={[0.012, 0.03, 0.01]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
    </group>
  );
}
