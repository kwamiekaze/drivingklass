import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";

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
    pos: [0, 3.1, 7.6],
    target: [0, 1.56, -1.2],
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

export interface RigInput {
  dragX: number;
  dragY: number;
}

/**
 * Glides the camera between views with critically damped easing, adds a slow
 * idle sway around the current target, lets the visitor drag to look around,
 * and pulls back on portrait screens so each subject still fits.
 */
export function KlassCameraRig({
  view,
  input,
  reducedMotion,
}: {
  view: KlassView;
  input: React.RefObject<RigInput>;
  reducedMotion: boolean;
}) {
  const { camera, size } = useThree();
  const pos = useRef(new Vector3(...view.pos).add(new Vector3(0, 1.4, 4)));
  const target = useRef(new Vector3(...view.target));
  const goalPos = useRef(new Vector3());
  const goalTarget = useRef(new Vector3());
  const tmp = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    (camera as PerspectiveCamera).fov = size.width < size.height ? 52 : 42;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  useFrame(({ clock }, delta) => {
    const aspect = size.width / Math.max(1, size.height);
    const pull = aspect < 1 ? 1 + (1 - aspect) * 1.25 : aspect < 1.3 ? 1.12 : 1;
    goalTarget.current.set(...view.target);
    goalPos.current.set(...view.pos).sub(goalTarget.current).multiplyScalar(pull).add(goalTarget.current);

    // Keep the subject clear of the info card: to the right of it on wide
    // screens, above it on tall ones. Done by sliding the look-at point.
    const frame = view.frame ?? (view.id === "welcome" ? 0.1 : 0.2);
    tmp.current.copy(goalTarget.current).sub(goalPos.current);
    const dist = tmp.current.length();
    tmp.current.normalize();
    if (aspect >= 1) {
      right.current.crossVectors(tmp.current, UP).normalize();
      goalTarget.current.addScaledVector(right.current, -dist * frame * 0.9);
      goalPos.current.addScaledVector(right.current, -dist * frame * 0.9);
    } else {
      const f = view.id === "welcome" ? frame * 1.5 : frame;
      goalTarget.current.addScaledVector(UP, -dist * f * 0.9);
      goalPos.current.addScaledVector(UP, -dist * f * 0.35);
    }

    // idle sway + drag look-around, both as a yaw about the target
    const t = clock.elapsedTime;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.18) * view.sway;
    const drag = input.current?.dragX ?? 0;
    const lift = input.current?.dragY ?? 0;
    const yaw = sway + drag * 0.5;
    tmp.current.copy(goalPos.current).sub(goalTarget.current);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const x = tmp.current.x * cos - tmp.current.z * sin;
    const z = tmp.current.x * sin + tmp.current.z * cos;
    tmp.current.set(x, tmp.current.y + lift * 0.8, z);
    goalPos.current.copy(goalTarget.current).add(tmp.current);
    if (goalPos.current.y < 0.6) goalPos.current.y = 0.6;
    if (goalPos.current.y > 3.4) goalPos.current.y = 3.4;

    const k = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.2);
    pos.current.lerp(goalPos.current, k);
    target.current.lerp(goalTarget.current, k);
    camera.position.copy(pos.current);
    camera.lookAt(target.current);

    // drag springs back to centre when released
    if (input.current) {
      input.current.dragX *= 1 - Math.min(1, delta * 1.2);
      input.current.dragY *= 1 - Math.min(1, delta * 1.2);
    }
  });

  return null;
}
