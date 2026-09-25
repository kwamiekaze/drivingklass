import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { DoubleSide, Shape, ShapeGeometry } from "three";

/**
 * Butterflies crossing the garden outside the window. They fly the full width
 * of the view, left to right and right to left, with the window left empty for
 * a while between passes. That gap is measured from the moment the last one
 * leaves, not from when it set off, and its length is drawn fresh every time,
 * so the timing never settles into a loop the eye can predict.
 *
 * They live on their own plane just in front of the painted garden and behind
 * the glass, so the wall crops them to the window opening for free.
 */

const COUNT = 3;

/** Flight plane and the reach of a pass, in metres. */
const PLANE_Z = -6.45;
const TRAVEL = 5.9;

/** Empty-window gap between passes, in seconds. */
const GAP_MIN = 7;
const GAP_RANGE = 3;

const BODY = "#2c2317";

/** Wing colouring, one per butterfly, so each is a recognisable individual. */
const SPECIES = [
  { margin: "#241a10", wing: "#e0812a" }, // monarch
  { margin: "#2f2a17", wing: "#f0cf4c" }, // tiger swallowtail
  { margin: "#5f5e50", wing: "#f7f4e8" }, // cabbage white
];

/**
 * One wing, drawn from the root outward: a swept forewing with a pointed tip,
 * and a rounded hindwing trailing behind it.
 */
function wingShape() {
  const shape = new Shape();
  shape.moveTo(0.04, 0.12);
  shape.bezierCurveTo(0.34, 0.36, 0.74, 0.34, 1.0, 0.06);
  shape.bezierCurveTo(1.04, -0.04, 0.95, -0.12, 0.78, -0.16);
  shape.bezierCurveTo(0.66, -0.19, 0.56, -0.18, 0.5, -0.14);
  shape.bezierCurveTo(0.64, -0.32, 0.58, -0.55, 0.36, -0.62);
  shape.bezierCurveTo(0.2, -0.67, 0.06, -0.5, 0.03, -0.24);
  shape.closePath();
  return shape;
}

interface Flight {
  active: boolean;
  start: number;
  duration: number;
  direction: number;
  height: number;
  depth: number;
  bob: number;
  bobRate: number;
  phase: number;
  flapRate: number;
  glideRate: number;
  span: number;
  previousHeight: number;
}

function idleFlight(): Flight {
  return {
    active: false,
    start: 0,
    duration: 7,
    direction: 1,
    height: 2,
    depth: PLANE_Z,
    bob: 0.1,
    bobRate: 2,
    phase: 0,
    flapRate: 6,
    glideRate: 0.4,
    span: 0.07,
    previousHeight: 2,
  };
}

export function Butterflies({ reducedMotion }: { reducedMotion: boolean }) {
  const bodies = useRef<Array<Group | null>>([]);
  const leftWings = useRef<Array<Group | null>>([]);
  const rightWings = useRef<Array<Group | null>>([]);
  const flights = useRef<Flight[]>(Array.from({ length: COUNT }, idleFlight));
  const nextPass = useRef(3);
  const lastDirection = useRef(1);

  const [outer, inner] = useMemo(() => {
    const shape = wingShape();
    const outline = new ShapeGeometry(shape, 8);
    // The coloured panel is the same wing pulled in from the edge, so what is
    // left showing around it reads as the dark wing margin.
    const panel = new ShapeGeometry(shape, 8);
    panel.scale(0.84, 0.82, 1);
    panel.translate(0.05, -0.015, 0);
    return [outline, panel] as const;
  }, []);

  useEffect(() => {
    const outline = outer;
    const panel = inner;
    return () => {
      outline.dispose();
      panel.dispose();
    };
  }, [outer, inner]);

  useEffect(() => {
    for (const group of bodies.current) {
      if (group) group.rotation.order = "YXZ";
    }
  }, []);

  useFrame(({ clock }, rawDelta) => {
    if (reducedMotion) {
      for (const group of bodies.current) {
        if (group) group.visible = false;
      }
      return;
    }

    const now = clock.elapsedTime;
    const delta = Math.max(rawDelta, 0.001);

    if (now >= nextPass.current) {
      const waiting = flights.current.filter((flight) => !flight.active);
      let passEnds = now;
      if (waiting.length > 0) {
        // Usually turn around, but not always, so the pattern stays loose.
        const direction = Math.random() < 0.74 ? -lastDirection.current : lastDirection.current;
        lastDirection.current = direction;
        const together = Math.random() < 0.3 ? 2 : 1;
        for (let index = 0; index < Math.min(together, waiting.length); index += 1) {
          const flight = waiting[index];
          if (!flight) continue;
          flight.active = true;
          flight.start = now + index * (0.4 + Math.random() * 0.9);
          flight.duration = 5.6 + Math.random() * 3.6;
          passEnds = Math.max(passEnds, flight.start + flight.duration);
          flight.direction = direction;
          flight.height = 1.55 + Math.random() * 0.85;
          flight.depth = PLANE_Z + Math.random() * 0.24;
          flight.bob = 0.06 + Math.random() * 0.13;
          flight.bobRate = 1.3 + Math.random() * 1.9;
          flight.phase = Math.random() * Math.PI * 2;
          flight.flapRate = 5.2 + Math.random() * 2.4;
          flight.glideRate = 0.26 + Math.random() * 0.45;
          flight.span = 0.072 + Math.random() * 0.034;
          flight.previousHeight = flight.height;
        }
      }
      // Counted from the moment the window is empty again, so a pass never
      // starts while the one before it is still crossing.
      nextPass.current = passEnds + GAP_MIN + Math.random() * GAP_RANGE;
    }

    for (let index = 0; index < COUNT; index += 1) {
      const flight = flights.current[index];
      const group = bodies.current[index];
      if (!flight || !group) continue;

      if (!flight.active || now < flight.start) {
        group.visible = false;
        continue;
      }

      const progress = (now - flight.start) / flight.duration;
      if (progress >= 1) {
        flight.active = false;
        group.visible = false;
        continue;
      }

      // Wings beat, then ease off into a glide, then pick up again.
      const flap = now * flight.flapRate * Math.PI * 2 + flight.phase;
      const effort = 0.55 + 0.45 * Math.sin(now * flight.glideRate + flight.phase);
      const stroke = 0.12 + 0.75 * Math.sin(flap) * effort;

      const x = flight.direction * (-TRAVEL / 2 + progress * TRAVEL);
      const height =
        flight.height +
        Math.sin(progress * Math.PI * flight.bobRate * 2 + flight.phase) * flight.bob +
        Math.sin(flap) * 0.014 * effort;
      const z = flight.depth + Math.sin(progress * Math.PI * 1.7 + flight.phase * 0.5) * 0.1;

      const climb = (height - flight.previousHeight) / delta;
      flight.previousHeight = height;

      group.visible = true;
      group.position.set(x, height, z);
      group.rotation.y =
        (flight.direction > 0 ? Math.PI / 2 : -Math.PI / 2) +
        Math.sin(progress * Math.PI * 2.3 + flight.phase) * 0.22;
      group.rotation.x = Math.max(-0.4, Math.min(0.4, climb * 0.5));
      group.rotation.z = Math.max(-0.45, Math.min(0.45, -climb * 0.6));
      group.scale.setScalar(flight.span);

      const left = leftWings.current[index];
      const right = rightWings.current[index];
      if (left) left.rotation.z = -stroke;
      if (right) right.rotation.z = stroke;
    }
  });

  return (
    <group>
      {Array.from({ length: COUNT }, (_, index) => {
        const species = SPECIES[index % SPECIES.length] ?? SPECIES[0]!;
        return (
          <group
            key={index}
            name="butterfly"
            visible={false}
            ref={(node) => {
              bodies.current[index] = node;
            }}
          >
            {/* Abdomen and thorax. */}
            <mesh position={[0, 0, -0.08]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.032, 0.05, 0.78, 6]} />
              <meshBasicMaterial color={BODY} />
            </mesh>
            <mesh position={[0, 0.01, 0.33]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshBasicMaterial color={BODY} />
            </mesh>
            {/* Antennae. */}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * 0.07, 0.12, 0.44]}
                rotation={[Math.PI / 2 - 0.62, 0, side * 0.42]}
              >
                <cylinderGeometry args={[0.004, 0.008, 0.26, 4]} />
                <meshBasicMaterial color={BODY} />
              </mesh>
            ))}
            {/* Wings: the dark outline, with the coloured panel just proud of it. */}
            {(
              [
                ["left", -1, leftWings],
                ["right", 1, rightWings],
              ] as const
            ).map(([name, side, store]) => (
              <group
                key={name}
                scale-x={side}
                ref={(node) => {
                  store.current[index] = node;
                }}
              >
                <mesh geometry={outer} rotation-x={Math.PI / 2}>
                  <meshBasicMaterial color={species.margin} side={DoubleSide} />
                </mesh>
                {/* Colour on both faces, so a wing reads the same whichever
                    way it is tipped as it beats. */}
                {[0.0016, -0.0016].map((lift) => (
                  <mesh
                    key={lift}
                    geometry={inner}
                    position={[0, lift, 0]}
                    rotation-x={Math.PI / 2}
                  >
                    <meshBasicMaterial color={species.wing} side={DoubleSide} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}
