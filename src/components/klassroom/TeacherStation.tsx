import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { KlassScreen } from "./KlassScreen";

/**
 * The instructor's station, carried over from the KleanupCrew office and
 * re-dressed for DrivingKlass: walnut desk, black leather, gold hardware, and
 * the monitor now runs the live DrivingKlass dashboard.
 */

const WOOD = "#6a4127";
const WOOD_DARK = "#3e2615";
const CREAM = "#f3ecdc";
/** Former forest-green accents become black leather / lacquer. */
const FOREST = "#161311";
/** Former lime accents become gold. */
const LIME = "#c9a24a";

export function Desk() {
  return (
    <group position={[0, 0, -2.4]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.08, 1.35]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      {(
        [
          [-1.4, 0.55],
          [1.4, 0.55],
          [-1.4, -0.55],
          [1.4, -0.55],
        ] as Array<[number, number]>
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.09, 0.72, 0.09]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}
      {/* drawer block */}
      <mesh position={[1.0, 0.44, -0.1]} castShadow>
        <boxGeometry args={[0.7, 0.56, 1.0]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
      </mesh>
    </group>
  );
}

export function Monitor() {
  return (
    <group position={[0, 0.78, -2.75]}>
      {/* Soft contact patch anchors the monitor without a harsh floating shadow. */}
      <mesh position={[0, 0.006, 0.015]} rotation-x={-Math.PI / 2} renderOrder={1}>
        <circleGeometry args={[0.3, 48]} />
        <meshBasicMaterial
          color="#34251c"
          transparent
          opacity={0.12}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {/* machined elliptical foot */}
      <mesh position={[0, 0.012, 0.01]} scale={[1.75, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.168, 0.024, 40]} />
        <meshStandardMaterial color="#c0c5c9" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.026, 0.01]} scale={[1.7, 1, 1]}>
        <cylinderGeometry args={[0.15, 0.15, 0.006, 40]} />
        <meshStandardMaterial color="#d7dbde" metalness={0.28} roughness={0.26} />
      </mesh>
      {/* slim tapered neck with a hinge collar */}
      <mesh position={[0, 0.25, -0.01]} rotation-x={0.04} castShadow>
        <boxGeometry args={[0.13, 0.44, 0.032]} />
        <meshStandardMaterial color="#c0c5c9" metalness={0.3} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.462, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.028, 0.028, 0.15, 18]} />
        <meshStandardMaterial color="#aab0b4" metalness={0.3} roughness={0.34} />
      </mesh>
      <group position={[0, 0.62, 0.02]} rotation-x={-0.06}>
        {/* thin display sandwich: dark bezel face over an aluminium housing */}
        <mesh position={[0, 0, 0.014]} castShadow>
          <boxGeometry args={[1.185, 0.665, 0.022]} />
          <meshStandardMaterial color="#1b1e20" roughness={0.42} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.005, -0.012]} castShadow>
          <boxGeometry args={[1.11, 0.6, 0.034]} />
          <meshStandardMaterial color="#b8bdc1" metalness={0.3} roughness={0.34} />
        </mesh>
        {/* The live DrivingKlass dashboard. */}
        <group position={[0, 0, 0.032]}>
          <KlassScreen width={1.14} height={0.62} />
        </group>
      </group>
    </group>
  );
}

/** Key widths per row, in units; each row is normalised to the deck width. */
const KEY_ROWS: ReadonlyArray<ReadonlyArray<number>> = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.1],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.85],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.35],
  [1, 1, 1, 1.35, 6.3, 1.35, 1, 1, 1],
];

/** Slim aluminium keyboard with a full sculpted key field. */
function Keyboard() {
  const keys = useMemo(() => {
    const deck = 0.68;
    const gap = 0.0045;
    const pitch = 0.0335;
    const placed: Array<{
      id: string;
      x: number;
      z: number;
      width: number;
      depth: number;
    }> = [];

    KEY_ROWS.forEach((row, rowIndex) => {
      const units = row.reduce((total, unit) => total + unit, 0);
      const unit = (deck - gap * (row.length - 1)) / units;
      const isFunctionRow = rowIndex === 0;
      let cursor = -deck / 2;

      row.forEach((widthUnits, keyIndex) => {
        const width = unit * widthUnits;
        placed.push({
          id: `${rowIndex}-${keyIndex}`,
          x: cursor + width / 2,
          z: -0.085 + rowIndex * pitch + (isFunctionRow ? 0.006 : 0),
          width,
          depth: isFunctionRow ? 0.017 : 0.027,
        });
        cursor += width + gap;
      });
    });

    return placed;
  }, []);

  return (
    <group position={[0, 0, 0.28]}>
      {/* brushed aluminium deck with a darker underbody for a thin edge */}
      <mesh position={[0, 0.011, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.735, 0.014, 0.245]} />
        <meshStandardMaterial color="#d5d9dc" metalness={0.32} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[0.72, 0.008, 0.232]} />
        <meshStandardMaterial color="#9ba1a5" metalness={0.25} roughness={0.45} />
      </mesh>
      {keys.map(({ id, x, z, width, depth }) => (
        <mesh key={id} position={[x, 0.0225, z]} castShadow>
          <boxGeometry args={[width, 0.009, depth]} />
          <meshStandardMaterial color="#191c1f" roughness={0.68} />
        </mesh>
      ))}
    </group>
  );
}

/** Seamless low-profile mouse on a stitched desk mat. */
function DeskMouse() {
  return (
    <group position={[0.55, 0, 0.3]}>
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <boxGeometry args={[0.34, 0.01, 0.38]} />
        <meshStandardMaterial color="#1c1916" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.0105, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.31, 0.35]} />
        <meshStandardMaterial color="#24201c" roughness={0.98} />
      </mesh>
      {/* dark underbody, then the seamless white shell over it */}
      <mesh position={[0, 0.018, 0]} scale={[0.069, 0.012, 0.108]} castShadow>
        <sphereGeometry args={[1, 28, 18]} />
        <meshStandardMaterial color="#3d4440" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.019, 0.006]} scale={[0.062, 0.023, 0.125]} castShadow>
        <sphereGeometry args={[1, 34, 22, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f5f5f2" roughness={0.16} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.0188, 0.006]} scale={[0.063, 0.005, 0.126]}>
        <sphereGeometry args={[1, 26, 12]} />
        <meshStandardMaterial color="#d8d9d5" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Wisps of steam drifting off a hot mug. */
function MugSteam({ reducedMotion }: { reducedMotion: boolean }) {
  const puffs = useRef<Array<Mesh | null>>([]);
  const count = 10;

  useFrame(({ clock }) => {
    const time = reducedMotion ? 2.4 : clock.elapsedTime;
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const life = (time * 0.22 + index / count) % 1;
      const sway = Math.sin(life * 3.1 + index * 2.4);
      // the plume widens and wanders as it climbs, rather than stacking
      puff.position.set(
        sway * 0.055 * life + (index % 3 === 0 ? 0.012 : -0.008),
        0.05 + life * 0.3,
        Math.cos(life * 2.6 + index) * 0.03 * life,
      );
      puff.scale.setScalar(0.32 + life * 1.85);
      const material = puff.material as MeshBasicMaterial;
      material.opacity = Math.sin(life * Math.PI) * 0.17;
    });
  });

  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            puffs.current[index] = node;
          }}
        >
          <sphereGeometry args={[0.028, 12, 9]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function DeskProps({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group position={[0, 0.78, -2.4]}>
      <Keyboard />
      <DeskMouse />
      {/* clipboard / notebook */}
      <group position={[-0.95, 0.02, 0.2]} rotation-y={Math.PI + 0.32}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.03, 0.56]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.025, -0.02]}>
          <boxGeometry args={[0.36, 0.02, 0.48]} />
          <meshStandardMaterial color="#fbf6ea" />
        </mesh>
        <mesh position={[0, 0.04, 0.22]}>
          <boxGeometry args={[0.2, 0.02, 0.06]} />
          <meshStandardMaterial color={LIME} />
        </mesh>
      </group>
      {/* coffee mug */}
      <group position={[0.85, 0.09, 0.12]}>
        {/* A restrained oval contact shadow keeps the mug grounded on the desk. */}
        <mesh
          position={[0.018, -0.084, 0.012]}
          rotation-x={-Math.PI / 2}
          scale={[1.25, 0.62, 1]}
          renderOrder={1}
        >
          <circleGeometry args={[0.1, 40]} />
          <meshBasicMaterial
            color="#3c2b20"
            transparent
            opacity={0.13}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.075, 0.17, 32, 1, true]} />
          <meshStandardMaterial color={CREAM} roughness={0.5} side={2} />
        </mesh>
        {/* The mug is filled generously, well clear of the rim. */}
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.081, 0.081, 0.006, 40]} />
          <meshBasicMaterial color="#2a1008" />
        </mesh>
        <mesh position={[0, -0.084, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.075, 32]} />
          <meshStandardMaterial color={CREAM} roughness={0.5} side={2} />
        </mesh>
        <mesh position={[0, 0.085, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.077, 0.008, 10, 32]} />
          <meshStandardMaterial color={CREAM} roughness={0.3} />
        </mesh>
        {/* C-shaped handle. Its two open ends are buried in the mug wall below
            the coffee line, so it reads as joined to the cup without any part of
            it showing inside the drink. */}
        <mesh position={[0.0935, -0.02, 0]} rotation-z={-2.094} castShadow>
          <torusGeometry args={[0.0467, 0.012, 14, 40, 4.19]} />
          <meshStandardMaterial color={CREAM} roughness={0.3} />
        </mesh>
        <MugSteam reducedMotion={reducedMotion} />
      </group>
      {/* desk lamp */}
      <group position={[-1.25, 0, -0.32]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.19, 0.21, 0.045, 40]} />
          <meshStandardMaterial color={FOREST} metalness={0.45} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.018, 0.024, 0.55, 16]} />
          <meshStandardMaterial color="#bfa16a" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0.1, 0.53, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.2, 16]} />
          <meshStandardMaterial color="#bfa16a" metalness={0.75} roughness={0.25} />
        </mesh>
        <group position={[0.2, 0.51, 0]} rotation-z={-0.18}>
          <mesh castShadow>
            <cylinderGeometry args={[0.075, 0.22, 0.2, 40, 1, true]} />
            <meshStandardMaterial color={FOREST} metalness={0.35} side={2} roughness={0.28} />
          </mesh>
          <mesh position={[0, -0.1, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.216, 0.009, 10, 40]} />
            <meshStandardMaterial color="#cbb078" metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.082, 0]} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.205, 32]} />
            <meshStandardMaterial
              color="#fff0cd"
              emissive="#ffd995"
              emissiveIntensity={0.8}
              side={2}
            />
          </mesh>
          <pointLight position={[0, -0.15, 0]} intensity={0.8} distance={2} color="#ffe3ae" />
        </group>
      </group>
    </group>
  );
}

export function Chair({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.y = Math.PI + Math.sin(clock.elapsedTime * 0.25) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 0, -1.25]} rotation-y={Math.PI}>
      {/* five-star base, each arm ending in a caster */}
      {[0, 1, 2, 3, 4].map((index) => (
        <group key={index} rotation-y={(index / 5) * Math.PI * 2}>
          <mesh position={[0, 0.078, 0.2]} rotation-x={0.05} castShadow>
            <boxGeometry args={[0.072, 0.042, 0.4]} />
            <meshStandardMaterial color="#464c50" metalness={0.32} roughness={0.44} />
          </mesh>
          <mesh position={[0, 0.062, 0.375]} castShadow>
            <boxGeometry args={[0.03, 0.05, 0.03]} />
            <meshStandardMaterial color="#2a2f31" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.04, 0.378]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.026, 16]} />
            <meshStandardMaterial color="#1b1e20" roughness={0.72} />
          </mesh>
        </group>
      ))}
      {/* gas lift with a polished column */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.072, 0.26, 18]} />
        <meshStandardMaterial color="#3a3f42" metalness={0.3} roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.24, 16]} />
        <meshStandardMaterial color="#cdd2d6" metalness={0.35} roughness={0.24} />
      </mesh>
      {/* seat pan and cushion */}
      <mesh position={[0, 0.5, 0.01]} castShadow>
        <boxGeometry args={[0.42, 0.05, 0.38]} />
        <meshStandardMaterial color="#33393c" metalness={0.45} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.575, 0.015]} scale={[0.33, 0.072, 0.315]} castShadow>
        <sphereGeometry args={[1, 30, 20]} />
        <meshStandardMaterial color={FOREST} roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.575, 0.015]} scale={[0.3, 0.05, 0.285]}>
        <sphereGeometry args={[1, 26, 16]} />
        <meshStandardMaterial color="#221d1a" roughness={0.88} />
      </mesh>
      {/* spine linking the seat to the contoured back */}
      <mesh position={[0, 0.66, -0.26]} rotation-x={-0.2} castShadow>
        <boxGeometry args={[0.11, 0.36, 0.045]} />
        <meshStandardMaterial color="#33393c" metalness={0.5} roughness={0.42} />
      </mesh>
      <group position={[0, 0.95, -0.24]} rotation-x={-0.16}>
        <mesh position={[0, 0, 0.46]} castShadow>
          <cylinderGeometry
            args={[0.46, 0.46, 0.58, 30, 1, true, Math.PI - 0.65, 1.3]}
          />
          <meshStandardMaterial color={FOREST} roughness={0.82} side={2} />
        </mesh>
        <mesh position={[0, -0.16, 0.455]}>
          <cylinderGeometry
            args={[0.45, 0.45, 0.2, 26, 1, true, Math.PI - 0.58, 1.16]}
          />
          <meshStandardMaterial color="#221d1a" roughness={0.86} side={2} />
        </mesh>
      </group>
      {/* armrests */}
      {[-0.3, 0.3].map((x) => (
        <group key={x} position={[x, 0, -0.02]}>
          <mesh position={[0, 0.61, 0]} castShadow>
            <boxGeometry args={[0.034, 0.2, 0.05]} />
            <meshStandardMaterial color="#33393c" metalness={0.5} roughness={0.44} />
          </mesh>
          <mesh position={[0, 0.728, 0.03]} castShadow>
            <boxGeometry args={[0.068, 0.032, 0.26]} />
            <meshStandardMaterial color="#1f2426" roughness={0.68} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

