import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { goldProps } from "./shared";

/**
 * Klassroom greenery. The broad-leafed plant and the snake plant come straight
 * from the KleanupCrew office; the fiddle-leaf fig, trailing pothos, monstera
 * and the windowsill succulents are new for the Klassroom.
 */

const PLANT_LEAVES = [
  { angle: 0.35, tilt: 0.62, length: 0.6, size: 0.3 },
  { angle: 1.4, tilt: 0.86, length: 0.46, size: 0.25 },
  { angle: 2.45, tilt: 0.5, length: 0.68, size: 0.32 },
  { angle: 3.4, tilt: 0.92, length: 0.42, size: 0.23 },
  { angle: 4.3, tilt: 0.66, length: 0.56, size: 0.28 },
  { angle: 5.3, tilt: 0.44, length: 0.72, size: 0.27 },
  { angle: 0.95, tilt: 0.16, length: 0.8, size: 0.24 },
  { angle: 2.9, tilt: 0.24, length: 0.74, size: 0.22 },
] as const;

/** Broad-leafed house plant in a matte ceramic pot. */
export function LeafyPlant({
  position,
  scale = 1,
  potColor = "#f1ede4",
}: {
  position: [number, number, number];
  scale?: number;
  potColor?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.29, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.29, 0.225, 0.58, 30]} />
        <meshStandardMaterial color={potColor} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.592, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.042, 30]} />
        <meshStandardMaterial color={potColor} roughness={0.44} />
      </mesh>
      <mesh position={[0, 0.613, 0]}>
        <cylinderGeometry args={[0.268, 0.268, 0.016, 26]} />
        <meshStandardMaterial color="#3a2b20" roughness={1} />
      </mesh>
      {PLANT_LEAVES.map(({ angle, tilt, length, size }, index) => (
        <group key={angle} position={[0, 0.615, 0]} rotation-y={angle}>
          <group rotation-z={tilt}>
            <mesh position={[0, length / 2, 0]} castShadow>
              <cylinderGeometry args={[0.011, 0.017, length, 8]} />
              <meshStandardMaterial color="#4a7b3d" roughness={0.72} />
            </mesh>
            <group position={[0, length, 0]} rotation-z={-tilt * 0.5}>
              {/* blade base meets the tip of the stalk */}
              <mesh position={[0, size * 0.92, 0]} scale={[size * 0.15, size, size * 0.7]} castShadow>
                <sphereGeometry args={[1, 22, 16]} />
                <meshStandardMaterial
                  color={index % 2 ? "#3f7f45" : "#4d8f4b"}
                  roughness={0.66}
                />
              </mesh>
              <mesh position={[0, size * 0.92, 0]} scale={[size * 0.18, size * 0.9, size * 0.06]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color="#2f6135" roughness={0.74} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

const SNAKE_BLADES = [
  { angle: 0.2, tilt: 0.1, height: 0.68 },
  { angle: 0.95, tilt: 0.24, height: 0.5 },
  { angle: 1.7, tilt: 0.14, height: 0.62 },
  { angle: 2.45, tilt: 0.27, height: 0.44 },
  { angle: 3.2, tilt: 0.11, height: 0.72 },
  { angle: 3.95, tilt: 0.25, height: 0.52 },
  { angle: 4.7, tilt: 0.16, height: 0.58 },
  { angle: 5.45, tilt: 0.29, height: 0.46 },
  { angle: 0.6, tilt: 0.36, height: 0.38 },
  { angle: 2.9, tilt: 0.34, height: 0.4 },
  { angle: 4.3, tilt: 0.38, height: 0.36 },
] as const;

/**
 * Upright sword-leaf plant. Deliberately a different species and a lighter
 * green than the broad-leafed plant in the corner, so the two read as two
 * different plants rather than a duplicated prop.
 */
export function SnakePlant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.155, 0.34, 20]} />
        <meshStandardMaterial color="#efe9dd" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.208, 0.208, 0.032, 20]} />
        <meshStandardMaterial color="#e4dccb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.366, 0]}>
        <cylinderGeometry args={[0.182, 0.182, 0.012, 16]} />
        <meshStandardMaterial color="#3a2b20" roughness={1} />
      </mesh>
      {SNAKE_BLADES.map(({ angle, tilt, height }, index) => (
        <group key={angle} position={[0, 0.36, 0]} rotation-y={angle}>
          <group rotation-z={tilt}>
            <mesh position={[0, height / 2, 0]} scale={[1, 1, 0.3]} castShadow>
              <cylinderGeometry args={[0.013, 0.055, height, 6]} />
              <meshStandardMaterial
                color={index % 2 ? "#9ccd63" : "#b2da78"}
                roughness={0.62}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}


/** Tall fiddle-leaf fig in a black planter with a gold rim. */
export function FiddleLeafFig({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const leaves = useMemo(() => {
    const out: Array<{ y: number; a: number; tilt: number; s: number; shade: number }> = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 34; i += 1) {
      const y = 0.95 + (i / 34) * 1.05 + rand() * 0.06;
      out.push({
        y,
        a: i * 2.39996,
        tilt: 0.5 + rand() * 0.6,
        s: 0.1 + rand() * 0.05 + (1 - i / 34) * 0.03,
        shade: rand(),
      });
    }
    return out;
  }, []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.27, 0.22, 0.54, 32]} />
        <meshStandardMaterial color="#141210" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <torusGeometry args={[0.27, 0.014, 10, 40]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0, 0.535, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.26, 30]} />
        <meshStandardMaterial color="#2e2118" roughness={1} />
      </mesh>
      {/* trunk */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.034, 1.2, 10]} />
        <meshStandardMaterial color="#6b5540" roughness={0.9} />
      </mesh>
      {leaves.map(({ y, a, tilt, s, shade }, i) => (
        <group key={i} position={[0, y, 0]} rotation-y={a}>
          <group position={[0.07, 0, 0]} rotation-z={-tilt}>
            <mesh position={[s * 1.1, 0, 0]} scale={[s * 1.25, s * 0.08, s]} castShadow>
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial
                color={shade > 0.6 ? "#3f7a3b" : shade > 0.3 ? "#2f6630" : "#4b8a44"}
                roughness={0.55}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Pothos trailing from a gold-chained ceiling basket, swaying on the air. */
export function HangingPothos({
  position,
  reducedMotion,
  drop = 0.9,
}: {
  position: [number, number, number];
  reducedMotion: boolean;
  drop?: number;
}) {
  const sway = useRef<Group>(null);
  const vines = useMemo(() => {
    const out: Array<{ a: number; len: number; leaves: number }> = [];
    for (let i = 0; i < 9; i += 1) out.push({ a: (i / 9) * Math.PI * 2 + i * 0.3, len: 0.45 + ((i * 37) % 10) / 14, leaves: 6 + (i % 4) });
    return out;
  }, []);
  useFrame(({ clock }) => {
    if (!sway.current || reducedMotion) return;
    const t = clock.elapsedTime + position[0];
    sway.current.rotation.z = Math.sin(t * 0.6) * 0.025;
    sway.current.rotation.x = Math.cos(t * 0.45) * 0.02;
  });
  return (
    <group position={position}>
      <group ref={sway}>
        {/* three gold chains */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.09, -drop / 2, Math.sin(a) * 0.09]}
              rotation={[Math.sin(a) * -0.1, 0, Math.cos(a) * 0.1]}
            >
              <cylinderGeometry args={[0.004, 0.004, drop, 5]} />
              <meshStandardMaterial {...goldProps} />
            </mesh>
          );
        })}
        <group position={[0, -drop, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.2, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#141210" roughness={0.35} metalness={0.2} side={2} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.2, 0.01, 8, 36]} />
            <meshStandardMaterial {...goldProps} />
          </mesh>
          {vines.map(({ a, len, leaves }, i) => (
            <group key={i} rotation-y={a} position={[0, 0.02, 0]}>
              {Array.from({ length: leaves }, (_, j) => {
                const p = j / leaves;
                const x = 0.17 + Math.sin(p * 1.4) * 0.12;
                const y = 0.05 - p * len;
                return (
                  <mesh
                    key={j}
                    position={[x, y, Math.sin(j * 1.7) * 0.03]}
                    rotation={[0.3 * Math.sin(j), j * 1.3, 0.8]}
                    scale={[0.05, 0.008, 0.042]}
                    castShadow
                  >
                    <sphereGeometry args={[1, 10, 6]} />
                    <meshStandardMaterial color={j % 3 ? "#4e9444" : "#8cc063"} roughness={0.5} />
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Split-leaf monstera in a low gold bowl. */
export function Monstera({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const fronds = [0.2, 1.1, 1.95, 2.8, 3.7, 4.6, 5.5];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.2, 0.32, 36]} />
        <meshStandardMaterial {...goldProps} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.315, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.285, 30]} />
        <meshStandardMaterial color="#2e2118" roughness={1} />
      </mesh>
      {fronds.map((a, i) => {
        const tilt = 0.45 + (i % 3) * 0.18;
        const len = 0.55 + (i % 2) * 0.2;
        return (
          <group key={a} position={[0, 0.31, 0]} rotation-y={a}>
            <group rotation-z={-tilt}>
              <mesh position={[0, len / 2, 0]} castShadow>
                <cylinderGeometry args={[0.008, 0.012, len, 6]} />
                <meshStandardMaterial color="#3f7a39" roughness={0.7} />
              </mesh>
              <group position={[0, len, 0]} rotation-z={tilt * 1.4}>
                {/* the frond, with notches suggested by darker slits */}
                <mesh position={[0.2, 0, 0]} scale={[0.24, 0.012, 0.2]} castShadow>
                  <sphereGeometry args={[1, 20, 10]} />
                  <meshStandardMaterial color={i % 2 ? "#2d6b30" : "#357a37"} roughness={0.45} />
                </mesh>
                {[-0.1, 0, 0.1].map((z) => (
                  <mesh key={z} position={[0.3, 0.013, z]} rotation-x={-Math.PI / 2} rotation-z={z * 3}>
                    <planeGeometry args={[0.14, 0.012]} />
                    <meshBasicMaterial color="#1a3f1c" />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** A row of little succulents in gold pots for the windowsill. */
export function Succulents({ position }: { position: [number, number, number] }) {
  const pots: Array<[number, string, number]> = [
    [-0.55, "#7fae7a", 0.9],
    [-0.18, "#9cc6a0", 1.1],
    [0.18, "#6f9d68", 1],
    [0.55, "#a8cf8f", 0.85],
  ];
  return (
    <group position={position}>
      {pots.map(([x, color, s]) => (
        <group key={x} position={[x, 0, 0]} scale={s}>
          <mesh position={[0, 0.055, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.055, 0.11, 20]} />
            <meshStandardMaterial {...goldProps} roughness={0.28} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => {
            const a = i * 2.4;
            const r = i < 3 ? 0.015 : 0.04;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r, 0.12 + (i < 3 ? 0.02 : 0), Math.sin(a) * r]}
                rotation={[Math.sin(a) * 0.9, a, Math.cos(a) * 0.9]}
                scale={[0.018, 0.045, 0.012]}
                castShadow
              >
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={color} roughness={0.5} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}
