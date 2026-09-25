import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { Mesh } from "three";
import { MeshStandardMaterial, PMREMGenerator, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Blackboard } from "./Blackboard";
import { Butterflies } from "./Butterflies";
import {
  Bookshelf,
  GoldCarPedestal,
  Pendant,
  RoadSignWall,
  SloganStars,
  TrafficLight,
  WallOfFame,
} from "./Decor";
import { FiddleLeafFig, HangingPothos, LeafyPlant, Monstera, SnakePlant, Succulents } from "./Plants";
import { StudentDesk } from "./StudentDesk";
import { Chair, Desk, DeskProps, Monitor } from "./TeacherStation";
import { WallCalendar, WallClock } from "./WallPieces";
import { SunnyWindowView } from "./WindowView";
import { IVORY, WALL, brushedGold, goldProps } from "./shared";

const CREAM = "#f3ecdc";
const WAINSCOT = "#161311";
const FLOOR = "#8a5c37";

/** Black wainscoting with a gold chair rail, run along one wall segment. */
function Wainscot({
  position,
  width,
  rotationY = 0,
}: {
  position: [number, number, number];
  width: number;
  rotationY?: number;
}) {
  const panels = Math.max(1, Math.round(width / 0.9));
  const pw = width / panels;
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[width, 0.9, 0.03]} />
        <meshStandardMaterial color={WAINSCOT} roughness={0.45} metalness={0.1} />
      </mesh>
      {Array.from({ length: panels }, (_, i) => (
        <mesh key={i} position={[-width / 2 + pw * (i + 0.5), 0.47, 0.018]}>
          <boxGeometry args={[pw - 0.14, 0.56, 0.008]} />
          <meshStandardMaterial color="#1e1a17" roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 0.91, 0.02]}>
        <boxGeometry args={[width, 0.03, 0.04]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      <mesh position={[0, 0.06, 0.02]}>
        <boxGeometry args={[width, 0.12, 0.03]} />
        <meshStandardMaterial color="#0f0d0c" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Room() {
  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={FLOOR} roughness={0.55} />
      </mesh>
      {Array.from({ length: 18 }, (_, index) => (
        <mesh key={index} rotation-x={-Math.PI / 2} position={[-6.4 + index * 0.76, 0.004, 0]}>
          <planeGeometry args={[0.012, 10.4]} />
          <meshBasicMaterial color="#5e3d23" transparent opacity={0.34} />
        </mesh>
      ))}
      {Array.from({ length: 17 }, (_, i) => (
        <mesh key={`j${i}`} position={[-6.02 + i * 0.76, 0.005, i % 2 ? 2.8 : -3.4]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.75, 0.012]} />
          <meshBasicMaterial color="#5e3d23" transparent opacity={0.45} />
        </mesh>
      ))}
      {/* black rug with a double gold border under the student rows */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 1.3]} receiveShadow>
        <planeGeometry args={[9.6, 3.9]} />
        <meshStandardMaterial color="#171412" roughness={1} />
      </mesh>
      {(
        [
          [9.2, 3.5, 0.03],
          [8.9, 3.2, 0.012],
        ] as Array<[number, number, number]>
      ).map(([w, d, t], i) => (
        <group key={i} position={[0, 0.016 + i * 0.001, 1.3]} rotation-x={-Math.PI / 2}>
          <mesh position={[0, d / 2, 0]}>
            <planeGeometry args={[w, t]} />
            <meshStandardMaterial {...brushedGold} />
          </mesh>
          <mesh position={[0, -d / 2, 0]}>
            <planeGeometry args={[w, t]} />
            <meshStandardMaterial {...brushedGold} />
          </mesh>
          <mesh position={[w / 2, 0, 0]}>
            <planeGeometry args={[t, d]} />
            <meshStandardMaterial {...brushedGold} />
          </mesh>
          <mesh position={[-w / 2, 0, 0]}>
            <planeGeometry args={[t, d]} />
            <meshStandardMaterial {...brushedGold} />
          </mesh>
        </group>
      ))}
      {/* a soft runner under the instructor's station */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.011, -2.1]} receiveShadow>
        <planeGeometry args={[4.2, 2.4]} />
        <meshStandardMaterial color="#d9cdb0" roughness={1} />
      </mesh>

      {/* back wall with the window opening: identical opening to KleanupCrew */}
      <group position={[0, 0, -5.2]}>
        <mesh position={[-3.9, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 3.6, 0.2]} />
          <meshStandardMaterial color={WALL} roughness={1} />
        </mesh>
        <mesh position={[3.9, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 3.6, 0.2]} />
          <meshStandardMaterial color={WALL} roughness={1} />
        </mesh>
        <mesh position={[0, 3.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.7, 0.2]} />
          <meshStandardMaterial color={WALL} roughness={1} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 1.0, 0.2]} />
          <meshStandardMaterial color={WALL} roughness={1} />
        </mesh>
        <SunnyWindowView />
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[3.4, 2.2, 0.04]} />
          <meshStandardMaterial color="#e5f7ff" transparent opacity={0.16} roughness={0.06} metalness={0.1} />
        </mesh>
        {/* black glazing bars with gold edges */}
        <mesh position={[0, 1.95, 0.04]} castShadow>
          <boxGeometry args={[0.07, 2.2, 0.07]} />
          <meshStandardMaterial color="#161311" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.95, 0.04]} castShadow>
          <boxGeometry args={[3.4, 0.07, 0.07]} />
          <meshStandardMaterial color="#161311" roughness={0.4} />
        </mesh>
      </group>
      {/* window casing with a deep walnut sill */}
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} position={[x, 1.95, -5.04]} castShadow>
          <boxGeometry args={[0.13, 2.35, 0.18]} />
          <meshStandardMaterial color="#161311" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 3.1, -5.04]} castShadow>
        <boxGeometry args={[3.63, 0.12, 0.18]} />
        <meshStandardMaterial color="#161311" roughness={0.4} />
      </mesh>
      {[-1.69, 1.69].map((x) => (
        <mesh key={`g${x}`} position={[x, 1.95, -4.945]}>
          <boxGeometry args={[0.012, 2.3, 0.012]} />
          <meshStandardMaterial {...goldProps} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, -4.94]} castShadow>
        <boxGeometry args={[3.65, 0.1, 0.4]} />
        <meshStandardMaterial color="#5b3a22" roughness={0.4} />
      </mesh>

      {/* side walls */}
      <mesh position={[-6, 1.8, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[10.4, 3.6]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      <mesh position={[6, 1.8, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[10.4, 3.6]} />
        <meshStandardMaterial color={WALL} roughness={1} />
      </mesh>
      {/* ceiling, with a gold cornice */}
      <mesh position={[0, 3.6, 2.4]} rotation-x={Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 16]} />
        <meshStandardMaterial color={IVORY} roughness={1} />
      </mesh>
      <mesh position={[0, 3.56, -5.08]}>
        <boxGeometry args={[12, 0.06, 0.06]} />
        <meshStandardMaterial {...brushedGold} />
      </mesh>
      {[-5.97, 5.97].map((x) => (
        <mesh key={x} position={[x, 3.56, 0]}>
          <boxGeometry args={[0.06, 0.06, 10.4]} />
          <meshStandardMaterial {...brushedGold} />
        </mesh>
      ))}

      {/* wainscoting */}
      <Wainscot position={[-3.85, 0, -5.09]} width={4.3} />
      <Wainscot position={[3.85, 0, -5.09]} width={4.3} />
      <Wainscot position={[-5.98, 0, 0]} width={10.4} rotationY={Math.PI / 2} />
      <Wainscot position={[5.98, 0, 0]} width={10.4} rotationY={-Math.PI / 2} />
    </group>
  );
}

/** Warm reflections for all the gold and lacquer, generated locally. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const typed = scene as typeof scene & { environmentIntensity?: number };
    typed.environmentIntensity = 0.85;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

const SUN_DIRECTION = new Vector3(-0.27, -0.405, 0.873).normalize();
const SUN_LIGHT_POSITION = SUN_DIRECTION.clone().multiplyScalar(-18).toArray();

/** Same frozen-after-warmup sun shadow approach as the KleanupCrew office. */
function SunShadowSetup() {
  const { gl, scene } = useThree();
  const framesLeft = useRef(30);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    framesLeft.current = 30;
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material;
      if (Array.isArray(material)) return;
      if (!(material instanceof MeshStandardMaterial)) return;
      if (material.transparent) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [gl, scene]);
  useFrame(() => {
    if (framesLeft.current <= 0) return;
    framesLeft.current -= 1;
    gl.shadowMap.needsUpdate = true;
  });
  return null;
}

const STUDENT_DESKS: Array<[number, number]> = [
  [-3.9, 0.45],
  [-2.1, 0.45],
  [2.1, 0.45],
  [3.9, 0.45],
  [-3.9, 2.25],
  [-2.1, 2.25],
  [2.1, 2.25],
  [3.9, 2.25],
];

export function KlassroomScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <color attach="background" args={["#e8e2d3"]} />
      <StudioEnvironment />
      <hemisphereLight args={["#eaf3ff", "#d8bb97", 0.8]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={SUN_LIGHT_POSITION}
        intensity={3.1}
        color="#fff1d0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={4}
        shadow-camera-far={34}
        shadow-normalBias={0.03}
        shadow-bias={-0.00012}
        shadow-radius={1.8}
        shadow-blurSamples={12}
      />
      <directionalLight position={[-4.5, 4.2, 5.5]} intensity={0.5} color="#e6eeff" />
      <pointLight position={[0, 3.2, 0]} intensity={0.45} color="#fff0d2" />

      <Room />
      <ContactShadows
        position={[0, 0.02, -0.4]}
        scale={14}
        opacity={0.18}
        blur={2.8}
        far={0.85}
        resolution={512}
        frames={1}
        color="#2f2217"
      />

      {/* front of the klass */}
      <Blackboard position={[-3.85, 1.78, -5.07]} reducedMotion={reducedMotion} />
      <SloganStars position={[-3.85, 3.02, -5.06]} reducedMotion={reducedMotion} width={3.5} />
      <WallClock position={[3.0, 2.62, -5.05]} />
      <WallCalendar position={[4.62, 2.2, -5.08]} />

      {/* instructor's station */}
      <Desk />
      <Monitor />
      <DeskProps reducedMotion={reducedMotion} />
      <Chair reducedMotion={reducedMotion} />

      {/* the klass */}
      {STUDENT_DESKS.map(([x, z], i) => (
        <StudentDesk key={`${x}${z}`} position={[x, 0, z]} variant={i} />
      ))}

      {/* side walls */}
      <RoadSignWall position={[5.96, 2.15, -1.6]} />
      <TrafficLight position={[5.8, 2.25, 1.75]} rotationY={-Math.PI / 2} reducedMotion={reducedMotion} />
      <WallOfFame position={[-5.96, 1.95, -0.9]} rotationY={Math.PI / 2} />
      <Bookshelf position={[-5.78, 0, 2.3]} rotationY={Math.PI / 2} />
      <GoldCarPedestal position={[4.35, 0, -3.05]} reducedMotion={reducedMotion} />

      {/* greenery */}
      <LeafyPlant position={[2.55, 0, -4.55]} scale={1.05} potColor="#161311" />
      <SnakePlant position={[2.05, 0, -2.35]} scale={0.78} />
      <FiddleLeafFig position={[-5.25, 0, 3.9]} scale={1.05} />
      <Monstera position={[-1.72, 0, -4.55]} scale={0.95} />
      <Monstera position={[5.25, 0, 3.9]} scale={1.1} />
      <Succulents position={[0, 0.9, -4.9]} />
      <HangingPothos position={[-5.1, 3.6, 3.2]} reducedMotion={reducedMotion} drop={0.8} />
      <HangingPothos position={[5.1, 3.6, 0.2]} reducedMotion={reducedMotion} drop={0.7} />
      <HangingPothos position={[5.55, 3.6, -4.55]} reducedMotion={reducedMotion} drop={0.55} />

      {/* lighting fixtures */}
      <Pendant position={[-3.0, 3.6, 1.35]} />
      <Pendant position={[3.0, 3.6, 1.35]} />

      <Butterflies reducedMotion={reducedMotion} />
      <SunShadowSetup />
    </>
  );
}
