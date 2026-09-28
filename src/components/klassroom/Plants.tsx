import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { BufferAttribute, BufferGeometry, Group } from "three";
import { Path, Shape, ShapeGeometry } from "three";
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


/* ------------------------------------------------------------------ */
/* Shaped, cupped leaves instead of flattened spheres                  */
/* ------------------------------------------------------------------ */

const geoCache = new Map<string, BufferGeometry>();

/** Bend a flat leaf: cupped across the blade and drooping toward the tip. */
function bend(g: BufferGeometry, width: number, length: number, cup: number, droop: number) {
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / Math.max(width, 1e-3);
    const v = y / Math.max(length, 1e-3);
    pos.setZ(i, cup * u * u * width + droop * v * v * length);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Teardrop blade, base at the origin, tip up +y. */
function bladeGeometry(key: string, width: number, length: number, cup = 0.35, droop = -0.18, round = 0.5) {
  const id = `blade:${key}`;
  const cached = geoCache.get(id);
  if (cached) return cached;
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.9, length * (0.15 + round * 0.2), width * 0.95, length * 0.75, 0, length);
  s.bezierCurveTo(-width * 0.95, length * 0.75, -width * 0.9, length * (0.15 + round * 0.2), 0, 0);
  const g = bend(new ShapeGeometry(s, 14), width, length, cup, droop);
  geoCache.set(id, g);
  return g;
}

/** Monstera: a broad heart with the characteristic slits cut through. */
function monsteraGeometry() {
  const id = "monstera";
  const cached = geoCache.get(id);
  if (cached) return cached;
  const w = 0.24;
  const l = 0.42;
  const s = new Shape();
  s.moveTo(0, 0.03);
  s.bezierCurveTo(-0.08, -0.03, -w * 1.15, 0.02, -w, l * 0.45);
  s.bezierCurveTo(-w * 0.9, l * 0.85, -0.05, l, 0, l * 1.02);
  s.bezierCurveTo(0.05, l, w * 0.9, l * 0.85, w, l * 0.45);
  s.bezierCurveTo(w * 1.15, 0.02, 0.08, -0.03, 0, 0.03);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k += 1) {
      const y = 0.08 + k * 0.08;
      const hole = new Path();
      const x0 = side * 0.06;
      const x1 = side * (w * (0.78 - k * 0.08));
      hole.moveTo(x0, y);
      hole.quadraticCurveTo((x0 + x1) / 2, y + 0.035, x1, y + 0.05);
      hole.quadraticCurveTo((x0 + x1) / 2, y + 0.018, x0, y + 0.012);
      s.holes.push(hole);
    }
  }
  const g = bend(new ShapeGeometry(s, 16), w, l, 0.18, -0.12);
  geoCache.set(id, g);
  return g;
}

/** Saucer, gold band and moss top-dressing: shared by every large planter. */
function LuxePot({
  radius,
  height,
  color = "#141210",
}: {
  radius: number;
  height: number;
  color?: string;
}) {
  const moss = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = i * 2.4;
        const r = radius * 0.2 + ((i * 37) % 10) / 10 * radius * 0.7;
        return [Math.cos(a) * r, Math.sin(a) * r, 0.02 + ((i * 13) % 5) * 0.004] as const;
      }),
    [radius],
  );
  return (
    <group>
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 1.12, radius * 1.05, 0.024, 40]} />
        <meshStandardMaterial {...goldProps} roughness={0.3} />
      </mesh>
      <mesh position={[0, height / 2 + 0.024, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 0.8, height, 40]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.25} />
      </mesh>
      <mesh position={[0, height * 0.72 + 0.024, 0]}>
        <cylinderGeometry args={[radius * 0.945, radius * 0.93, 0.03, 40, 1, true]} />
        <meshStandardMaterial {...goldProps} side={2} />
      </mesh>
      <mesh position={[0, height + 0.024, 0]}>
        <torusGeometry args={[radius, 0.012, 10, 48]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <group position={[0, height + 0.01, 0]}>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[radius * 0.97, 36]} />
          <meshStandardMaterial color="#3a2a1c" roughness={1} />
        </mesh>
        {moss.map(([x, z, y], i) => (
          <mesh key={i} position={[x, y, z]} scale={[1, 0.55, 1]}>
            <sphereGeometry args={[radius * 0.12, 8, 6]} />
            <meshStandardMaterial color={i % 3 ? "#56733a" : "#6f8d45"} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const FIG_GREENS = ["#2f6a30", "#3a7a36", "#27592a", "#4a8a3e"];

/** Tall fiddle-leaf fig: a woody trunk with glossy, cupped, veined leaves. */
export function FiddleLeafFig({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const leaf = useMemo(() => bladeGeometry("fig", 0.1, 0.26, 0.4, -0.12, 0.9), []);
  const leaves = useMemo(() => {
    const out: Array<{ y: number; a: number; tilt: number; s: number; shade: number; branch: number }> = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 46; i += 1) {
      const t = i / 46;
      out.push({
        y: 1.0 + t * 1.05 + rand() * 0.05,
        a: i * 2.39996,
        tilt: 0.35 + rand() * 0.55,
        s: 0.85 + rand() * 0.35 + (1 - t) * 0.25,
        shade: Math.floor(rand() * FIG_GREENS.length),
        branch: t < 0.4 ? 0.12 + rand() * 0.08 : 0.04 + rand() * 0.05,
      });
    }
    return out;
  }, []);
  return (
    <group position={position} scale={scale}>
      <LuxePot radius={0.27} height={0.52} />
      {/* trunk with a slight lean and a couple of side branches */}
      <mesh position={[0.01, 1.05, 0]} rotation-z={0.03} castShadow>
        <cylinderGeometry args={[0.02, 0.036, 1.1, 10]} />
        <meshStandardMaterial color="#6b5540" roughness={0.9} />
      </mesh>
      {[0.35, 2.4, 4.3].map((a, i) => (
        <mesh key={a} position={[Math.cos(a) * 0.06, 1.15 + i * 0.15, Math.sin(a) * 0.06]} rotation={[Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]}>
          <cylinderGeometry args={[0.008, 0.012, 0.22, 6]} />
          <meshStandardMaterial color="#6b5540" roughness={0.9} />
        </mesh>
      ))}
      {leaves.map(({ y, a, tilt, s: ls, shade, branch }, i) => (
        <group key={i} position={[0, y, 0]} rotation-y={a}>
          <group position={[branch, 0, 0]} rotation-z={-tilt - 0.6}>
            <mesh geometry={leaf} scale={ls} castShadow>
              <meshStandardMaterial color={FIG_GREENS[shade]} roughness={0.38} side={2} />
            </mesh>
            {/* midrib */}
            <mesh position={[0, 0.12 * ls, 0.004]} scale={ls}>
              <boxGeometry args={[0.004, 0.24, 0.002]} />
              <meshBasicMaterial color="#a8c98a" />
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

/** Split-leaf monstera with real fenestrations, in a low gold bowl. */
export function Monstera({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const leaf = useMemo(() => monsteraGeometry(), []);
  const fronds = [0.2, 1.05, 1.85, 2.7, 3.6, 4.45, 5.35, 0.65, 3.1];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.2, 0.32, 40]} />
        <meshStandardMaterial {...goldProps} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.315, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.285, 30]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      {fronds.map((a, i) => {
        const tilt = 0.35 + (i % 3) * 0.2;
        const len = 0.5 + ((i * 7) % 4) * 0.08;
        const young = i > 6;
        return (
          <group key={a} position={[0, 0.31, 0]} rotation-y={a}>
            <group rotation-z={-tilt}>
              <mesh position={[0, len / 2, 0]} castShadow>
                <cylinderGeometry args={[0.007, 0.011, len, 6]} />
                <meshStandardMaterial color="#4a7f3c" roughness={0.6} />
              </mesh>
              <group position={[0, len, 0]} rotation={[-0.9, 0, tilt * 0.6]}>
                <mesh geometry={leaf} scale={young ? 0.65 : 1} castShadow>
                  <meshStandardMaterial color={young ? "#4f9442" : i % 2 ? "#245e2b" : "#2c6d31"} roughness={0.35} side={2} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** Kentia palm: arching fronds lined with fine leaflets. */
export function KentiaPalm({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const leaflet = useMemo(() => bladeGeometry("palm", 0.018, 0.2, 0.2, -0.05, 0.2), []);
  const fronds = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        a: i * 2.39996,
        rise: 0.5 + ((i * 5) % 7) * 0.12,
        arch: 0.5 + ((i * 3) % 5) * 0.12,
        len: 1.0 + ((i * 7) % 5) * 0.1,
      })),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <LuxePot radius={0.3} height={0.5} />
      {fronds.map((f, i) => {
        const segs = 14;
        return (
          <group key={i} position={[0, 0.52, 0]} rotation-y={f.a}>
            {Array.from({ length: segs }, (_, k) => {
              const t = k / segs;
              // arching rib: up and out, then over
              const x = t * f.len * 0.8;
              const y = f.rise * Math.sin(t * Math.PI * 0.62) * 1.4 - t * t * f.arch * 0.6;
              const slope = Math.atan2(
                f.rise * 1.4 * Math.cos(t * Math.PI * 0.62) * 0.62 * Math.PI - 2 * t * f.arch * 0.6,
                f.len * 0.8,
              );
              return (
                <group key={k} position={[x, y, 0]} rotation-z={slope}>
                  {k > 1 &&
                    [-1, 1].map((side) => (
                      <mesh
                        key={side}
                        geometry={leaflet}
                        rotation={[side * 1.25, 0, -Math.PI / 2 + side * 0.35]}
                        scale={0.6 + Math.sin(t * Math.PI) * 0.7}
                        castShadow
                      >
                        <meshStandardMaterial color={k % 2 ? "#3f7d38" : "#35702f"} roughness={0.45} side={2} />
                      </mesh>
                    ))}
                  <mesh rotation-z={Math.PI / 2}>
                    <cylinderGeometry args={[0.004, 0.005, f.len / segs + 0.01, 5]} />
                    <meshStandardMaterial color="#6b8a3c" roughness={0.6} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Bird of paradise: tall paddle leaves with torn edges, and one orange bloom. */
export function BirdOfParadise({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const paddle = useMemo(() => bladeGeometry("paddle", 0.13, 0.55, 0.22, -0.08, 0.35), []);
  const stems = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ a: i * 2.2 + 0.3, h: 0.6 + ((i * 5) % 6) * 0.14, lean: 0.12 + ((i * 3) % 4) * 0.06 })),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <LuxePot radius={0.28} height={0.48} />
      {stems.map((st, i) => (
        <group key={i} position={[0, 0.5, 0]} rotation-y={st.a}>
          <group rotation-z={-st.lean}>
            <mesh position={[0, st.h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.007, 0.011, st.h, 6]} />
              <meshStandardMaterial color="#56823f" roughness={0.6} />
            </mesh>
            <group position={[0, st.h, 0]} rotation={[0, i * 0.7, -st.lean * 0.8]}>
              <mesh geometry={paddle} castShadow>
                <meshStandardMaterial color={i % 3 ? "#2e6a33" : "#387a3a"} roughness={0.4} side={2} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
      {/* the bloom */}
      <group position={[0.06, 1.45, 0.02]} rotation-z={-0.9}>
        <mesh>
          <coneGeometry args={[0.03, 0.26, 10]} />
          <meshStandardMaterial color="#3d6b52" roughness={0.5} />
        </mesh>
        {[-0.5, -0.2, 0.15, 0.45].map((r, k) => (
          <mesh key={k} position={[0.02, 0.1 + k * 0.012, 0]} rotation-z={1.2 + r}>
            <coneGeometry args={[0.012, 0.16, 6]} />
            <meshStandardMaterial color={k === 3 ? "#3b4fb8" : "#ff8a1f"} roughness={0.5} />
          </mesh>
        ))}
      </group>
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
