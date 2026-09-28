import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";

export type KlassViewId = "welcome" | "board" | "screen" | "signs" | "car" | "fame" | "window";

export interface KlassView {
  id: KlassViewId;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  pos: [number, number, number];
  target: [number, number, number];
  /** how far the camera drifts side to side while parked here */
  sway: number;
  /** nudge the subject clear of the info card (fraction of distance) */
  frame?: number;
}

export const KLASS_VIEWS: KlassView[] = [
  {
    id: "welcome",
    label: "Klassroom",
    eyebrow: "Carrollton, GA",
    title: "Where 5-Star Drivers Are Made",
    body: "Step inside the Klassroom. Real lessons, real instructors, and the calm confidence you take into your road test.",
    pos: [0, 2.95, 4.75],
    target: [0, 1.45, -1.4],
    sway: 0.28,
  },
  {
    id: "board",
    label: "Chalkboard",
    eyebrow: "Today's klass",
    title: "Lessons that stick",
    body: "Right-of-way, 3-point turns, hands at 9 and 3. Every klass is broken down step by step until it becomes second nature.",
    pos: [-3.7, 1.95, 0.35],
    target: [-3.85, 2.0, -5.1],
    sway: 0.05,
  },
  {
    id: "screen",
    label: "Packages",
    eyebrow: "Live from drivingklass.com",
    title: "Pick your klass",
    body: "From a single hour to a 40 hour program, plus road test packages with a warm-up session right before your test.",
    pos: [0.05, 1.66, -1.08],
    target: [0, 1.4, -2.75],
    sway: 0.03,
  },
  {
    id: "signs",
    label: "Road Signs",
    eyebrow: "Know the road",
    title: "Read every sign like a pro",
    body: "Stop, yield, school zones, rail crossings. We drill the signs and the split-second decisions that come with them.",
    pos: [1.6, 1.95, -0.9],
    target: [6, 2.1, -1.6],
    sway: 0.06,
  },
  {
    id: "car",
    label: "The Car",
    eyebrow: "Dual-pedal, fully insured",
    title: "Learn in klass",
    body: "Clean dual-pedal cars, full insurance coverage, and free pick-up and drop-off from home, work or school.",
    pos: [2.75, 1.55, -1.45],
    target: [4.35, 1.0, -3.05],
    sway: 0.06,
  },
  {
    id: "fame",
    label: "Wall of Fame",
    eyebrow: "Klass of 5-star drivers",
    title: "They passed. You're next.",
    body: "Every photo on this wall is a student who walked into their road test prepared and walked out licensed.",
    pos: [-2.2, 2.0, 0.1],
    target: [-6, 2.0, -0.9],
    sway: 0.06,
  },
  {
    id: "window",
    label: "Window",
    eyebrow: "Sunny side of the road",
    title: "The future looks bright",
    body: "Even the sun wears shades in here. Relax, breathe, and let's get you on the road.",
    pos: [0.1, 2.2, -2.15],
    target: [0.35, 2.0, -6.6],
    sway: 0.04,
    frame: 0.08,
  },
];

const UP = new Vector3(0, 1, 0);

/*
 * Camera behaviour ported from the KleanupCrew office (kleanupcrew-office-view,
 * src/components/office/CameraRig.tsx) so both sites move identically: the same
 * drag, pinch and wheel mapping, the same damping, the same always-on hover and
 * sweep at every stop, and the same Welcome sequence of wide sweeps and walks.
 * Only the tour stops are specific to the Klassroom.
 */

export interface RigInput {
  /** horizontal orbit angle in radians; wraps continuously through 360 degrees */
  dragX: number;
  /** vertical orbit adjustment, -1..1 */
  dragY: number;
  /** restrained dolly, -1..1 */
  zoom: number;
}

export function createRigInput(): RigInput {
  return { dragX: 0, dragY: 0, zoom: 0 };
}

export function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Per-stop automatic motion, same values as the KleanupCrew service views. */
const AUTO_PAN: Record<
  KlassViewId,
  { orbit: number; mobileOrbit: number; lateral: number; mobileLateral: number; secondsPerLeg: number }
> = {
  welcome: { orbit: 0.3, mobileOrbit: 0.22, lateral: 0, mobileLateral: 0, secondsPerLeg: 8 },
  board: { orbit: 0.035, mobileOrbit: 0.03, lateral: 0.36, mobileLateral: 0.18, secondsPerLeg: 6 },
  screen: { orbit: 0.04, mobileOrbit: 0.035, lateral: 0.2, mobileLateral: 0.12, secondsPerLeg: 6 },
  signs: { orbit: 0.035, mobileOrbit: 0.03, lateral: 0.4, mobileLateral: 0.22, secondsPerLeg: 6 },
  car: { orbit: 0.04, mobileOrbit: 0.035, lateral: 0.28, mobileLateral: 0.18, secondsPerLeg: 6 },
  fame: { orbit: 0.03, mobileOrbit: 0.025, lateral: 0.3, mobileLateral: 0.16, secondsPerLeg: 6 },
  window: { orbit: 0.03, mobileOrbit: 0.025, lateral: 0.36, mobileLateral: 0.2, secondsPerLeg: 6 },
};

interface TourStop {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  mobilePos?: [number, number, number];
  mobileTarget?: [number, number, number];
  mobileFov?: number;
  hold: number;
  travel: number;
}

/**
 * Welcome's walk: from the wide shot to the chalkboard close enough to read,
 * wider over the instructor's desk with the window and the sun behind it,
 * across to the gold car on its turntable with the road signs beyond, then
 * back to the wide shot where the sweep picks up again.
 */
const WELCOME_TOUR: TourStop[] = [
  {
    // The whole room from just inside the doors, so nothing outside the
    // Klassroom is ever in frame.
    pos: [0, 2.95, 4.75],
    target: [0, 1.45, -1.4],
    fov: 54,
    mobilePos: [0, 3.0, 4.8],
    mobileTarget: [0, 1.3, -1.6],
    mobileFov: 66,
    hold: 0,
    travel: 10.5,
  },
  {
    pos: [-3.1, 1.95, -1.05],
    target: [-3.85, 1.8, -5.1],
    fov: 42,
    mobilePos: [-3.3, 2.0, 0.6],
    mobileTarget: [-3.85, 1.75, -5.1],
    mobileFov: 50,
    hold: 1.6,
    travel: 8,
  },
  {
    pos: [1.85, 1.66, -0.3],
    target: [0.1, 1.3, -2.75],
    fov: 50,
    mobilePos: [2.4, 1.85, 1.4],
    mobileTarget: [0.25, 1.3, -2.8],
    mobileFov: 52,
    hold: 1.6,
    travel: 8.5,
  },
  {
    pos: [1.6, 1.62, 0.1],
    target: [4.4, 1.15, -3.05],
    fov: 44,
    mobilePos: [1.4, 1.75, 1.2],
    mobileTarget: [4.4, 1.25, -3.05],
    mobileFov: 50,
    hold: 1.3,
    travel: 8,
  },
];

/**
 * The room's inside, kept a little off the walls and furniture that sit
 * against them. The camera is never allowed outside it, so the Klassroom is
 * all there is: no wall backs, no beam ends, no floating fixtures.
 */
const ROOM_INSIDE = { minX: -5.3, maxX: 5.3, minY: 0.5, maxY: 3.3, minZ: -4.7, maxZ: 4.85 };

function keepInside(v: Vector3) {
  v.x = Math.max(ROOM_INSIDE.minX, Math.min(ROOM_INSIDE.maxX, v.x));
  v.y = Math.max(ROOM_INSIDE.minY, Math.min(ROOM_INSIDE.maxY, v.y));
  v.z = Math.max(ROOM_INSIDE.minZ, Math.min(ROOM_INSIDE.maxZ, v.z));
}

const TOUR_LENGTH = WELCOME_TOUR.reduce((total, stop) => total + stop.hold + stop.travel, 0);
const OPENING_LEG = 8;
const OPENING_PAN = OPENING_LEG * 2;
const WALK_PASSES = new Set([3, 7, 10]);
const PASS_COUNT = 10;
const PASSES: boolean[] = Array.from({ length: PASS_COUNT }, (_, index) => WALK_PASSES.has(index + 1));
const SEQUENCE_LENGTH = PASSES.reduce((total, walks) => total + (walks ? TOUR_LENGTH : OPENING_PAN), 0);

function smootherstep(value: number) {
  const k = Math.max(0, Math.min(1, value));
  return k * k * k * (k * (k * 6 - 15) + 10);
}

function glide(value: number) {
  const k = Math.max(0, Math.min(1, value));
  return smootherstep(k) * 0.86 + k * 0.14;
}

function readStop(stop: TourStop, isMobile: boolean, position: Vector3, look: Vector3): number {
  position.set(...(isMobile && stop.mobilePos ? stop.mobilePos : stop.pos));
  look.set(...(isMobile && stop.mobileTarget ? stop.mobileTarget : stop.target));
  return (isMobile && stop.mobileFov) || stop.fov;
}

export function KlassCameraRig({
  view,
  input,
  reducedMotion,
  started,
}: {
  view: KlassView;
  input: React.RefObject<RigInput>;
  reducedMotion: boolean;
  started: boolean;
}) {
  const { camera, size } = useThree();
  const pos = useRef(new Vector3(0, 3.2, 4.85));
  const look = useRef(new Vector3(...view.target));
  const desiredPos = useRef(new Vector3());
  const desiredLook = useRef(new Vector3(...view.target));
  const panRight = useRef(new Vector3());
  const introStart = useRef<number | null>(null);
  const tourStart = useRef<number | null>(null);
  const tourHeld = useRef(0);
  const stopPos = useRef(new Vector3());
  const stopLook = useRef(new Vector3());
  const nextPos = useRef(new Vector3());
  const nextLook = useRef(new Vector3());
  const base = useRef(new Vector3());
  const target = useRef(new Vector3());
  const dir = useRef(new Vector3());
  const right = useRef(new Vector3());

  const isMobile = size.width < 768;
  const aspect = size.width / Math.max(1, size.height);

  /** A stop's camera and look-at, pulled back on tall screens and nudged clear of the info card. */
  const frameStop = (stop: KlassView, outPos: Vector3, outTarget: Vector3) => {
    const pull = aspect < 1 ? 1.35 : aspect < 1.3 ? 1.12 : 1;
    outTarget.set(...stop.target);
    outPos.set(...stop.pos).sub(outTarget).multiplyScalar(pull).add(outTarget);
    const frame = stop.frame ?? (stop.id === "welcome" ? 0.1 : 0.2);
    dir.current.copy(outTarget).sub(outPos);
    const dist = dir.current.length();
    dir.current.normalize();
    if (aspect >= 1) {
      right.current.crossVectors(dir.current, UP).normalize();
      outTarget.addScaledVector(right.current, -dist * frame * 0.9);
      outPos.addScaledVector(right.current, -dist * frame * 0.9);
    } else {
      const f = stop.id === "welcome" ? frame * 1.5 : frame;
      outTarget.addScaledVector(UP, -dist * f * 0.9);
      outPos.addScaledVector(UP, -dist * f * 0.35);
    }
  };

  useEffect(() => {
    if (!started) introStart.current = null;
  }, [started]);

  // Coming back to Welcome opens on the wide shot, not halfway through.
  useEffect(() => {
    tourStart.current = null;
    introStart.current = null;
  }, [view.id, started]);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const i = input.current ?? { dragX: 0, dragY: 0, zoom: 0 };

    frameStop(view, base.current, target.current);
    let tourFov: number | null = null;
    let tourOrbit = 0;
    if (view.id === "welcome") {
      let elapsed = 0;
      if (started && !reducedMotion) {
        tourStart.current ??= clock.elapsedTime;
        if (i.zoom < -0.05) {
          // Pinched in to read something: hold the walk where it stands.
          tourStart.current = clock.elapsedTime - tourHeld.current;
        } else {
          tourHeld.current = clock.elapsedTime - tourStart.current;
        }
        elapsed = clock.elapsedTime - tourStart.current;
      }

      let cycle = elapsed % SEQUENCE_LENGTH;
      let pass = 0;
      for (let step = 0; step < PASS_COUNT; step += 1) {
        pass = step;
        const span = PASSES[step] ? TOUR_LENGTH : OPENING_PAN;
        if (cycle < span) break;
        cycle -= span;
      }

      const wide = WELCOME_TOUR[0]!;
      if (!PASSES[pass]) {
        const pan = AUTO_PAN.welcome;
        const lead = pass % 2 === 0 ? 1 : -1;
        tourFov = readStop(wide, isMobile, stopPos.current, stopLook.current);
        base.current.copy(stopPos.current);
        target.current.copy(stopLook.current);
        tourOrbit = Math.sin((Math.PI * cycle) / OPENING_LEG) * lead * (isMobile ? pan.mobileOrbit : pan.orbit);
      } else {
        let remaining = cycle;
        let index = 0;
        let blend = 0;
        for (let step = 0; step < WELCOME_TOUR.length; step += 1) {
          const stop = WELCOME_TOUR[step]!;
          index = step;
          if (remaining < stop.hold) break;
          remaining -= stop.hold;
          if (remaining < stop.travel) {
            blend = glide(remaining / stop.travel);
            break;
          }
          remaining -= stop.travel;
        }
        const from = WELCOME_TOUR[index]!;
        const to = WELCOME_TOUR[(index + 1) % WELCOME_TOUR.length]!;
        const fromFov = readStop(from, isMobile, stopPos.current, stopLook.current);
        const toFov = readStop(to, isMobile, nextPos.current, nextLook.current);
        base.current.copy(stopPos.current).lerp(nextPos.current, blend);
        target.current.copy(stopLook.current).lerp(nextLook.current, blend);
        tourFov = fromFov + (toFov - fromFov) * blend;
      }

      if (started && !reducedMotion) {
        // A held frame still breathes: two slow waves of different periods.
        const breath = clock.elapsedTime;
        base.current.x += Math.sin(breath * 0.35) * 0.012;
        base.current.y += Math.sin(breath * 0.2555 + 1.4) * 0.008;
      }
    }

    const offset = dir.current.copy(base.current).sub(target.current);
    const dist = offset.length();
    const baseYaw = Math.atan2(offset.x, offset.z);
    const basePitch = Math.asin(offset.y / Math.max(dist, 0.001));
    let automaticOrbit = tourOrbit;
    let automaticLateral = 0;
    if (!reducedMotion && started && view.id !== "welcome") {
      const pan = AUTO_PAN[view.id];
      introStart.current ??= clock.elapsedTime;
      const elapsed = clock.elapsedTime - introStart.current;
      const panPhase = -Math.cos((elapsed * Math.PI) / pan.secondsPerLeg);
      automaticOrbit = panPhase * (isMobile ? pan.mobileOrbit : pan.orbit);
      automaticLateral = panPhase * (isMobile ? pan.mobileLateral : pan.lateral);
    }

    const yaw = baseYaw + i.dragX + automaticOrbit;
    const pitch = Math.max(-0.35, Math.min(1.05, basePitch + i.dragY * 0.7));

    // Full horizontal orbit with a safe vertical arc and restrained dolly.
    // Wide rotations pull the Welcome camera inside the room.
    const orbitProgress = Math.min(1, Math.abs(i.dragX) / (Math.PI / 2));
    const safeOrbitDistance = dist > 5 ? dist + (4.35 - dist) * orbitProgress : dist;
    const pullIn = view.id === "welcome" ? 0.8 : 0.1;
    const zoomScale = i.zoom < 0 ? 1 + i.zoom * pullIn : 1 + i.zoom * 0.1;
    const radius = Math.max(1.2, safeOrbitDistance * zoomScale);
    const horizontalRadius = Math.cos(pitch) * radius;
    desiredPos.current.set(
      target.current.x + Math.sin(yaw) * horizontalRadius,
      target.current.y + Math.sin(pitch) * radius,
      target.current.z + Math.cos(yaw) * horizontalRadius,
    );
    desiredLook.current.copy(target.current);
    panRight.current.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(automaticLateral);
    desiredPos.current.add(panRight.current);
    desiredLook.current.add(panRight.current);
    keepInside(desiredPos.current);

    const response = isMobile ? 8 : 5.2;
    const k = reducedMotion ? 1 : 1 - Math.exp(-response * dt);
    pos.current.lerp(desiredPos.current, k);
    keepInside(pos.current);
    look.current.lerp(desiredLook.current, k);
    camera.position.copy(pos.current);
    if (camera instanceof PerspectiveCamera) {
      const baseFov = tourFov ?? (isMobile ? 58 : 42);
      const targetFov = Math.max(18, Math.min(70, baseFov + i.zoom * 28));
      camera.fov += (targetFov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(look.current);
  });

  return null;
}
