import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial as MSM, PointLight, SpotLight } from "three";
import { ExtrudeGeometry, Object3D, Shape } from "three";
import {
  DISPLAY,
  SERIF,
  blackLacquer,
  brushedGold,
  goldGradient,
  goldProps,
  roundedRect,
  setTracking,
  star,
  useCanvasTexture,
} from "./shared";

/* ------------------------------------------------------------------ */
/* Five extruded gold stars and the slogan plaque over the chalkboard. */
/* ------------------------------------------------------------------ */

function starShape(outer: number, inner = outer * 0.45) {
  const s = new Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

export function SloganStars({
  position,
  reducedMotion,
  width = 3.4,
}: {
  position: [number, number, number];
  reducedMotion: boolean;
  width?: number;
}) {
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(starShape(0.13), {
        depth: 0.035,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.01,
        bevelSegments: 3,
      }),
    [],
  );
  const stars = useRef<Array<Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    stars.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as MSM;
      // a glint sweeps left to right every few seconds
      const phase = reducedMotion ? 0 : Math.max(0, Math.sin(t * 0.9 - i * 0.55)) ** 12;
      mat.emissiveIntensity = 0.12 + phase * 0.9;
      if (!reducedMotion) m.rotation.y = Math.sin(t * 0.5 + i) * 0.12;
    });
  });

  const [plaque] = useCanvasTexture(2048, 200, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    let size = 88;
    const text = "WHERE 5-STAR DRIVERS ARE MADE";
    setTracking(c, "12px");
    do {
      c.font = `800 ${size}px ${DISPLAY}`;
      size -= 2;
    } while (c.measureText(text).width > w - 80 && size > 30);
    c.shadowColor = "rgba(0,0,0,0.35)";
    c.shadowBlur = 8;
    c.shadowOffsetY = 4;
    c.fillStyle = goldGradient(c, 50, 150);
    c.fillText(text, w / 2 + 6, h / 2 + 4);
    setTracking(c, "0px");
  });

  return (
    <group position={position}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[(i - 2) * 0.36, 0.22, 0]}
          ref={(node) => {
            stars.current[i] = node;
          }}
          castShadow
        >
          <meshStandardMaterial {...goldProps} emissive="#8a6420" emissiveIntensity={0.12} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0.02]}>
        <planeGeometry args={[width, width * (200 / 2048)]} />
        <meshStandardMaterial map={plaque} transparent roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Road signs                                                          */
/* ------------------------------------------------------------------ */

type SignKind = "stop" | "yield" | "speed" | "school" | "rail";

function paintSign(kind: SignKind) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    const cx = w / 2;
    const cy = h / 2;
    if (kind === "stop") {
      const oct = (r: number) => {
        c.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const a = Math.PI / 8 + (i * Math.PI) / 4;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.closePath();
      };
      oct(250);
      c.fillStyle = "#fbfbf6";
      c.fill();
      oct(232);
      c.fillStyle = "#c8102e";
      c.fill();
      c.font = `800 150px ${DISPLAY}`;
      c.fillStyle = "#fbfbf6";
      c.fillText("STOP", cx, cy + 8);
    } else if (kind === "yield") {
      const tri = (r: number) => {
        c.beginPath();
        c.moveTo(cx - r, cy - r * 0.8);
        c.lineTo(cx + r, cy - r * 0.8);
        c.lineTo(cx, cy + r * 0.95);
        c.closePath();
      };
      tri(250);
      c.fillStyle = "#c8102e";
      c.fill();
      tri(150);
      c.fillStyle = "#fbfbf6";
      c.fill();
      c.font = `800 56px ${DISPLAY}`;
      c.fillStyle = "#c8102e";
      c.fillText("YIELD", cx, cy - 58);
    } else if (kind === "speed") {
      roundedRect(c, 76, 20, w - 152, h - 40, 24);
      c.fillStyle = "#fbfbf6";
      c.fill();
      c.lineWidth = 12;
      c.strokeStyle = "#141210";
      roundedRect(c, 94, 38, w - 188, h - 76, 16);
      c.stroke();
      c.fillStyle = "#141210";
      c.font = `700 62px ${DISPLAY}`;
      c.fillText("SPEED", cx, 110);
      c.fillText("LIMIT", cx, 180);
      c.font = `800 190px ${DISPLAY}`;
      c.fillText("35", cx, 340);
    } else if (kind === "school") {
      c.beginPath();
      c.moveTo(cx, 18);
      c.lineTo(w - 40, 190);
      c.lineTo(w - 40, h - 18);
      c.lineTo(40, h - 18);
      c.lineTo(40, 190);
      c.closePath();
      c.fillStyle = "#c6e03a";
      c.fill();
      c.lineWidth = 12;
      c.strokeStyle = "#141210";
      c.stroke();
      // two walking figures
      c.fillStyle = "#141210";
      for (const [x, s] of [
        [cx - 70, 1],
        [cx + 70, 0.82],
      ] as const) {
        c.beginPath();
        c.arc(x, 200 + (1 - s) * 60, 34 * s, 0, Math.PI * 2);
        c.fill();
        c.fillRect(x - 26 * s, 244 + (1 - s) * 60, 52 * s, 120 * s);
        c.fillRect(x - 26 * s, 360 + (1 - s) * 40, 18 * s, 110 * s);
        c.fillRect(x + 8 * s, 360 + (1 - s) * 40, 18 * s, 110 * s);
      }
    } else {
      c.save();
      c.translate(cx, cy);
      for (const r of [0.72, -0.72]) {
        c.save();
        c.rotate(r);
        roundedRect(c, -250, -44, 500, 88, 10);
        c.fillStyle = "#fbfbf6";
        c.fill();
        c.lineWidth = 8;
        c.strokeStyle = "#141210";
        c.stroke();
        c.restore();
      }
      c.restore();
      c.save();
      c.translate(cx, cy);
      c.rotate(-0.72);
      c.font = `800 52px ${DISPLAY}`;
      c.fillStyle = "#141210";
      c.fillText("RAILROAD", 0, 4);
      c.restore();
      c.save();
      c.translate(cx, cy);
      c.rotate(0.72);
      c.font = `800 52px ${DISPLAY}`;
      c.fillStyle = "#141210";
      c.fillText("CROSSING", 0, 4);
      c.restore();
    }
  };
}

function RoadSign({
  kind,
  position,
  size = 0.62,
  rotation = 0,
}: {
  kind: SignKind;
  position: [number, number, number];
  size?: number;
  rotation?: number;
}) {
  const [tex] = useCanvasTexture(512, 512, paintSign(kind));
  return (
    <group position={position} rotation-z={rotation}>
      {/* soft wall shadow behind the sign */}
      <mesh position={[0.02, -0.03, -0.004]}>
        <planeGeometry args={[size * 0.98, size * 0.98]} />
        <meshBasicMaterial map={tex} color="#000000" transparent opacity={0.18} alphaTest={0.02} depthWrite={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.5} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* gold mounting bolts */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * size * 0.36, 0.006]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      ))}
    </group>
  );
}

export function RoadSignWall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation-y={-Math.PI / 2}>
      {/* black lacquer display panel with a gold frame */}
      <mesh position={[0, 0, -0.02]} receiveShadow>
        <boxGeometry args={[3.6, 1.25, 0.03]} />
        <meshStandardMaterial {...blackLacquer} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[3.66, 1.31, 0.02]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      <RoadSign kind="stop" position={[-1.38, 0.02, 0.02]} size={0.72} />
      <RoadSign kind="yield" position={[-0.68, 0.02, 0.02]} size={0.72} />
      <RoadSign kind="speed" position={[0.0, 0.02, 0.02]} size={0.78} />
      <RoadSign kind="school" position={[0.7, 0.02, 0.02]} size={0.74} />
      <RoadSign kind="rail" position={[1.4, 0.02, 0.02]} size={0.74} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Working traffic light                                               */
/* ------------------------------------------------------------------ */

const CYCLE = { green: 6, yellow: 2, red: 5 } as const;

export function TrafficLight({
  position,
  rotationY = 0,
  reducedMotion,
}: {
  position: [number, number, number];
  rotationY?: number;
  reducedMotion: boolean;
}) {
  const lenses = useRef<Array<Mesh | null>>([]);
  const glow = useRef<PointLight>(null);
  const colors = ["#ff2a2a", "#ffc21a", "#1eea6a"];
  useFrame(({ clock }) => {
    const total = CYCLE.green + CYCLE.yellow + CYCLE.red;
    const t = reducedMotion ? 0 : clock.elapsedTime % total;
    const active = t < CYCLE.green ? 2 : t < CYCLE.green + CYCLE.yellow ? 1 : 0;
    lenses.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as MSM;
      mat.emissiveIntensity = i === active ? 2.6 : 0.05;
    });
    if (glow.current) {
      glow.current.color.set(colors[active]!);
      glow.current.position.y = 0.26 - active * 0.26;
    }
  });
  return (
    <group position={position} rotation-y={rotationY}>
      {/* gold wall bracket */}
      <mesh position={[0, 0.5, -0.12]}>
        <boxGeometry args={[0.06, 0.06, 0.24]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.86, 0.22]} />
        <meshStandardMaterial color="#131110" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.112]}>
        <boxGeometry args={[0.34, 0.9, 0.004]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 0.26 - i * 0.26, 0.115]}>
          {/* visor */}
          <mesh position={[0, 0.06, 0.06]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.1, 0.1, 0.12, 24, 1, true, -Math.PI / 2, Math.PI]} />
            <meshStandardMaterial color="#0e0d0c" roughness={0.5} side={2} />
          </mesh>
          <mesh
            ref={(node) => {
              lenses.current[i] = node;
            }}
          >
            <circleGeometry args={[0.085, 28]} />
            <meshStandardMaterial
              color={["#5a1010", "#5a4410", "#0f4a24"][i]}
              emissive={colors[i]}
              emissiveIntensity={0.05}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      <pointLight ref={glow} position={[0, 0, 0.35]} intensity={0.9} distance={1.6} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Gold DrivingKlass sedan on a turntable                              */
/* ------------------------------------------------------------------ */

/** Side silhouette of the sedan, nose to the right, wheels sitting at y = 0. */
function sedanProfile() {
  const s = new Shape();
  s.moveTo(-0.92, 0.2);
  s.bezierCurveTo(-0.95, 0.3, -0.94, 0.4, -0.88, 0.45); // tail
  s.lineTo(-0.62, 0.48); // trunk lid
  s.bezierCurveTo(-0.5, 0.52, -0.42, 0.66, -0.3, 0.72); // rear glass
  s.bezierCurveTo(-0.15, 0.76, 0.12, 0.76, 0.22, 0.71); // roof
  s.bezierCurveTo(0.34, 0.64, 0.42, 0.53, 0.5, 0.49); // windscreen
  s.bezierCurveTo(0.7, 0.46, 0.86, 0.44, 0.93, 0.38); // bonnet
  s.bezierCurveTo(0.97, 0.32, 0.97, 0.24, 0.93, 0.2); // nose
  // underside with wheel arches
  s.lineTo(0.72, 0.18);
  s.absarc(0.55, 0.17, 0.17, 0, Math.PI, false);
  s.lineTo(-0.38, 0.18);
  s.absarc(-0.55, 0.17, 0.17, 0, Math.PI, false);
  s.lineTo(-0.92, 0.2);
  return s;
}

function glassProfile() {
  const s = new Shape();
  s.moveTo(-0.44, 0.52);
  s.bezierCurveTo(-0.36, 0.62, -0.28, 0.68, -0.2, 0.7);
  s.bezierCurveTo(-0.08, 0.72, 0.12, 0.72, 0.2, 0.68);
  s.bezierCurveTo(0.3, 0.62, 0.36, 0.55, 0.42, 0.51);
  s.closePath();
  return s;
}

function GoldSedan() {
  const [sign] = useCanvasTexture(512, 96, (c, w, h) => {
    c.fillStyle = "#141210";
    c.fillRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `800 54px ${DISPLAY}`;
    setTracking(c, "6px");
    c.fillStyle = goldGradient(c, 20, 76);
    c.fillText("DRIVINGKLASS", w / 2 + 3, h / 2 + 3);
    setTracking(c, "0px");
  });
  const body = useMemo(() => {
    const g = new ExtrudeGeometry(sedanProfile(), {
      depth: 0.56,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.05,
      bevelSegments: 6,
      curveSegments: 24,
    });
    g.translate(0, 0, -0.28);
    g.computeVertexNormals();
    return g;
  }, []);
  const glass = useMemo(() => {
    const g = new ExtrudeGeometry(glassProfile(), {
      depth: 0.66,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.012,
      bevelSegments: 3,
      curveSegments: 16,
    });
    g.translate(0, 0.012, -0.33);
    return g;
  }, []);
  useEffect(
    () => () => {
      body.dispose();
      glass.dispose();
    },
    [body, glass],
  );
  const wheel = (x: number, z: number) => (
    <group key={`${x}${z}`} position={[x, 0.16, z]} rotation-x={Math.PI / 2}>
      <mesh castShadow>
        <cylinderGeometry args={[0.155, 0.155, 0.12, 32]} />
        <meshStandardMaterial color="#0d0c0b" roughness={0.8} />
      </mesh>
      <mesh position={[0, z > 0 ? 0.062 : -0.062, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.012, 24]} />
        <meshStandardMaterial color="#1c1a18" metalness={0.8} roughness={0.25} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[0, z > 0 ? 0.07 : -0.07, 0]}
          rotation-y={(i / 5) * Math.PI * 2}
        >
          <boxGeometry args={[0.018, 0.006, 0.18]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      ))}
    </group>
  );
  return (
    <group>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial {...goldProps} roughness={0.14} />
      </mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial color="#0a0908" roughness={0.05} metalness={0.9} />
      </mesh>
      {/* chrome-black side skirts and a front grille */}
      {[-0.345, 0.345].map((z) => (
        <mesh key={z} position={[0, 0.2, z]}>
          <boxGeometry args={[0.72, 0.03, 0.02]} />
          <meshStandardMaterial color="#141210" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[1.0, 0.28, 0]}>
        <boxGeometry args={[0.02, 0.07, 0.34]} />
        <meshStandardMaterial color="#141210" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* LED head and tail lights */}
      {[-0.22, 0.22].map((z) => (
        <group key={z}>
          <mesh position={[0.985, 0.35, z]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[0.13, 0.035]} />
            <meshBasicMaterial color="#fff6dc" toneMapped={false} />
          </mesh>
          <mesh position={[-0.985, 0.38, z]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[0.15, 0.03]} />
            <meshBasicMaterial color="#ff3b30" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* roof sign */}
      <group position={[-0.04, 0.855, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 0.075, 0.035]} />
          <meshStandardMaterial color="#141210" roughness={0.4} />
        </mesh>
        {[0.0185, -0.0185].map((z) => (
          <mesh key={z} position={[0, 0, z]} rotation-y={z < 0 ? Math.PI : 0}>
            <planeGeometry args={[0.28, 0.052]} />
            <meshBasicMaterial map={sign} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {wheel(0.55, 0.3)}
      {wheel(0.55, -0.3)}
      {wheel(-0.55, 0.3)}
      {wheel(-0.55, -0.3)}
    </group>
  );
}

export function GoldCarPedestal({
  position,
  reducedMotion,
}: {
  position: [number, number, number];
  reducedMotion: boolean;
}) {
  const turntable = useRef<Group>(null);
  const spot = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useEffect(() => {
    if (spot.current) spot.current.target = target;
  }, [target]);
  useFrame((_, delta) => {
    if (turntable.current && !reducedMotion) turntable.current.rotation.y += delta * 0.35;
  });
  return (
    <group position={position}>
      {/* plinth */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.7, 48]} />
        <meshStandardMaterial {...blackLacquer} />
      </mesh>
      {[0.02, 0.69].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[y < 0.1 ? 0.66 : 0.62, 0.012, 10, 64]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      ))}
      <mesh position={[0, 0.715, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.03, 48]} />
        <meshStandardMaterial color="#1d1a17" roughness={0.2} metalness={0.4} />
      </mesh>
      <group ref={turntable} position={[0, 0.73, 0]} scale={0.62} rotation-y={0.6}>
        <GoldSedan />
      </group>
      {/* museum spot */}
      <primitive object={target} position={[0, 0.9, 0]} />
      <spotLight
        ref={spot}
        position={[0.2, 2.8, 0.6]}
        angle={0.42}
        penumbra={0.8}
        intensity={6}
        distance={4.5}
        color="#fff1d0"
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Bookshelf with manuals, trophies and a gold steering wheel          */
/* ------------------------------------------------------------------ */

export function Bookshelf({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const books = useMemo(() => {
    const out: Array<{ x: number; w: number; h: number; color: string; shelf: number; lean: number }> = [];
    const palette = ["#141210", "#c9a24a", "#efe6d0", "#2a2622", "#7a1f1f", "#b8913f", "#1d2c3a"];
    let seed = 11;
    const rand = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    for (let shelf = 0; shelf < 3; shelf += 1) {
      let x = -0.62;
      const stop = shelf === 1 ? 0.05 : 0.2;
      while (x < stop) {
        const w = 0.035 + rand() * 0.03;
        out.push({ x: x + w / 2, w, h: 0.22 + rand() * 0.1, color: palette[Math.floor(rand() * palette.length)]!, shelf, lean: 0 });
        x += w + 0.004;
      }
    }
    return out;
  }, []);
  const shelves = [0.42, 0.92, 1.42];
  return (
    <group position={position} rotation-y={rotationY}>
      {/* carcass */}
      <mesh position={[0, 0.95, -0.16]} receiveShadow>
        <boxGeometry args={[1.5, 1.9, 0.02]} />
        <meshStandardMaterial color="#1a1614" roughness={0.6} />
      </mesh>
      {[-0.74, 0.74].map((x) => (
        <mesh key={x} position={[x, 0.95, 0]} castShadow>
          <boxGeometry args={[0.04, 1.9, 0.34]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.45} />
        </mesh>
      ))}
      {[0.03, ...shelves, 1.88].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.48, 0.035, 0.34]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.45} />
        </mesh>
      ))}
      {shelves.map((y) => (
        <mesh key={`g${y}`} position={[0, y, 0.171]}>
          <boxGeometry args={[1.48, 0.01, 0.004]} />
          <meshStandardMaterial {...brushedGold} />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, shelves[b.shelf]! + 0.018 + b.h / 2, 0.02]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.24]} />
          <meshStandardMaterial color={b.color} roughness={b.color === "#c9a24a" || b.color === "#b8913f" ? 0.3 : 0.7} metalness={b.color === "#c9a24a" ? 0.6 : 0} />
        </mesh>
      ))}
      {/* trophy cup */}
      <group position={[0.46, shelves[0]! + 0.018, 0]}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.14, 0.08, 0.14]} />
          <meshStandardMaterial {...blackLacquer} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.012, 0.03, 0.1, 12]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.09, 0.03, 0.14, 24, 1, true]} />
          <meshStandardMaterial {...goldProps} side={2} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0.25, 0]} rotation-z={s * 0.2}>
            <torusGeometry args={[0.035, 0.007, 8, 18, Math.PI]} />
            <meshStandardMaterial {...goldProps} />
          </mesh>
        ))}
      </group>
      {/* gold steering wheel on a stand */}
      <group position={[0.4, shelves[1]! + 0.2, 0]} rotation-x={-0.25}>
        <mesh>
          <torusGeometry args={[0.16, 0.018, 12, 48]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
          <mesh key={a} position={[Math.sin(a) * 0.08, -Math.cos(a) * 0.08, 0]} rotation-z={a}>
            <boxGeometry args={[0.02, 0.16, 0.012]} />
            <meshStandardMaterial {...goldProps} />
          </mesh>
        ))}
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 20]} />
          <meshStandardMaterial {...blackLacquer} />
        </mesh>
      </group>
      {/* small framed certificate */}
      <group position={[0.42, shelves[2]! + 0.16, -0.08]} rotation-x={-0.12}>
        <mesh>
          <boxGeometry args={[0.3, 0.24, 0.02]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.26, 0.2]} />
          <meshStandardMaterial color="#f7f0de" roughness={0.9} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[-0.08 + i * 0.04, 0.02, 0.013]}>
            <circleGeometry args={[0.012, 5]} />
            <meshBasicMaterial color="#c9a24a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Wall of fame: framed "Passed!" polaroids                            */
/* ------------------------------------------------------------------ */

const GRADS = ["Jaylen", "Maria", "Destiny", "Chris", "Aaliyah", "Marcus"];

function Polaroid({ index, position, tilt }: { index: number; position: [number, number, number]; tilt: number }) {
  const name = GRADS[index % GRADS.length]!;
  const [tex] = useCanvasTexture(320, 380, (c, w, h) => {
    c.fillStyle = "#fbf8ef";
    c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 20, 0, 280);
    const hues = [
      ["#f4c58b", "#e38a55"],
      ["#9fd3f0", "#5a93c8"],
      ["#f6d98f", "#c9a24a"],
      ["#c6e3a4", "#6fa05a"],
      ["#f5b2c0", "#c9677f"],
      ["#b8c3f0", "#6f7fc8"],
    ][index % 6]!;
    g.addColorStop(0, hues[0]!);
    g.addColorStop(1, hues[1]!);
    c.fillStyle = g;
    c.fillRect(20, 20, w - 40, 260);
    // silhouette holding up a licence
    c.fillStyle = "rgba(20,18,16,0.82)";
    c.beginPath();
    c.arc(w / 2, 120, 44, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(w / 2, 280, 96, 110, 0, Math.PI, 0);
    c.fill();
    roundedRect(c, w / 2 + 34, 150, 70, 46, 6);
    c.fillStyle = "#e8c872";
    c.fill();
    c.textAlign = "center";
    c.font = `600 34px "Caveat", "Segoe Print", cursive`;
    c.fillStyle = "#2a2622";
    c.fillText(`${name} passed!`, w / 2, 326);
    for (let i = 0; i < 5; i += 1) {
      star(c, w / 2 - 48 + i * 24, 356, 9);
      c.fillStyle = "#c9a24a";
      c.fill();
    }
  });
  return (
    <group position={position} rotation-z={tilt}>
      <mesh position={[0, 0, -0.004]}>
        <boxGeometry args={[0.34, 0.4, 0.008]} />
        <meshStandardMaterial color="#e9e2d0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[0.32, 0.38]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
      {/* gold pin */}
      <mesh position={[0, 0.17, 0.01]}>
        <sphereGeometry args={[0.014, 12, 8]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
    </group>
  );
}

export function WallOfFame({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const [title] = useCanvasTexture(1024, 140, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `italic 700 78px ${SERIF}`;
    c.fillStyle = goldGradient(c, 20, 120);
    c.fillText("Klass of 5-Star Drivers", w / 2, h / 2);
  });
  const spots: Array<[number, number, number]> = [
    [-0.66, 0.2, 0.06],
    [-0.22, 0.24, -0.05],
    [0.22, 0.18, 0.04],
    [0.66, 0.23, -0.07],
    [-0.44, -0.27, -0.04],
    [0.0, -0.24, 0.05],
    [0.44, -0.28, -0.03],
  ];
  return (
    <group position={position} rotation-y={rotationY}>
      {/* cork-free luxe board: black linen with gold frame */}
      <mesh position={[0, 0, -0.02]} receiveShadow>
        <boxGeometry args={[1.8, 1.25, 0.03]} />
        <meshStandardMaterial color="#1b1816" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.88, 1.33, 0.02]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <planeGeometry args={[1.9, 0.26]} />
        <meshStandardMaterial map={title} transparent roughness={0.3} metalness={0.4} />
      </mesh>
      {spots.map((p, i) => (
        <Polaroid key={i} index={i} position={[p[0], p[1], 0.005]} tilt={p[2]} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Gold dome pendants                                                  */
/* ------------------------------------------------------------------ */

export function Pendant({ position, drop = 0.55 }: { position: [number, number, number]; drop?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, -drop / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, drop, 6]} />
        <meshStandardMaterial color="#141210" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 20]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <group position={[0, -drop, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.26, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...goldProps} side={2} />
        </mesh>
        <mesh position={[0, 0.005, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.24, 32]} />
          <meshStandardMaterial color="#fff3d6" emissive="#ffe3a8" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <pointLight position={[0, -0.2, 0]} intensity={0.8} distance={4.2} color="#ffe9c0" />
      </group>
    </group>
  );
}
