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
    pos: [0.02, 1.46, -1.42],
    target: [0, 1.37, -2.74],
    sway: 0.03,
    frame: 0.06,
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

/**
 * Pointer state shared between the page (which reads touches, mouse, wheel
 * and pinch) and the camera rig (which turns them into motion). The page only
 * accumulates; the rig consumes and zeroes each frame.
 */
export interface RigInput {
  /** pixels dragged since the last frame */
  dx: number;
  dy: number;
  /** multiplicative zoom since the last frame (1 = none) */
  zoom: number;
  /** a finger or mouse button is down on the room */
  interacting: boolean;
  /** yaw velocity in px/s at release, for the flick glide */
  flick: number;
  /** viewport width used to scale drag sensitivity */
  width: number;
  /** set once the visitor has steered; stops the automatic tour */
  touched: boolean;
}

export function createRigInput(): RigInput {
  return { dx: 0, dy: 0, zoom: 1, interacting: false, flick: 0, width: 1280, touched: false };
}

/** Welcome's automatic walk, like the KleanupCrew office, until the visitor steers. */
const WALK: Array<{ id: KlassViewId; hold: number; travel: number }> = [
  { id: "welcome", hold: 6, travel: 4 },
  { id: "board", hold: 5, travel: 3.6 },
  { id: "screen", hold: 5, travel: 3.4 },
  { id: "window", hold: 4, travel: 3.4 },
  { id: "car", hold: 4, travel: 3.2 },
  { id: "signs", hold: 4, travel: 3.6 },
  { id: "fame", hold: 4.5, travel: 4.4 },
];
const WALK_LENGTH = WALK.reduce((t, s) => t + s.hold + s.travel, 0);

/** Interior walls, kept a little inside the real ones. */
const BOX = { minX: -5.6, maxX: 5.6, minY: 0.42, maxY: 3.38, minZ: -4.85, maxZ: 4.95 };
/** How far in front of the camera a stop's orbit pivot sits (IMVU-style). */
const PIVOT_REACH = 2.1;
/** When turning away from the opening shot, the orbit hands over to here. */
const ROOM_CENTER = new Vector3(0, 1.6, 0.5);
const CENTER_RADIUS = 3.4;

function glide(v: number) {
  const t = Math.min(1, Math.max(0, v));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function viewById(id: KlassViewId) {
  return KLASS_VIEWS.find((v) => v.id === id)!;
}

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Distance from p along unit dir d until it leaves the interior box. */
function rayToBox(p: Vector3, d: Vector3, maxZ: number) {
  let t = Infinity;
  const hit = (pos: number, dir: number, min: number, max: number) => {
    if (dir > 1e-6) t = Math.min(t, (max - pos) / dir);
    else if (dir < -1e-6) t = Math.min(t, (min - pos) / dir);
  };
  hit(p.x, d.x, BOX.minX, BOX.maxX);
  hit(p.y, d.y, BOX.minY, BOX.maxY);
  hit(p.z, d.z, BOX.minZ, maxZ);
  return Math.max(0.3, t);
}

interface Orbit {
  pivot: Vector3;
  yaw: number;
  pitch: number;
  radius: number;
}

/**
 * IMVU-style look-around with KleanupCrew's damping. One swipe across the
 * screen turns you most of the way round the room and a flick keeps gliding,
 * vertical drag tilts, pinch or wheel dollies in and out. Every stop orbits a
 * point just in front of the camera, so turning always happens inside the
 * room, and the camera slides in off the walls instead of passing through.
 */
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
  const goal = useRef<Orbit>({ pivot: new Vector3(0, 1.56, -1.2), yaw: 0, pitch: 0.2, radius: 11 });
  const cur = useRef<Orbit>({ pivot: new Vector3(0, 2.2, -1.2), yaw: 0, pitch: 0.28, radius: 13 });
  const welcomeYaw = useRef(0);
  const glideVel = useRef(0);
  const settle = useRef(0);
  const tour = useRef(0);
  const sway = useRef(0);
  const tmpA = useRef(new Vector3());
  const tmpB = useRef(new Vector3());
  const nextA = useRef(new Vector3());
  const nextB = useRef(new Vector3());
  const right = useRef(new Vector3());
  const dir = useRef(new Vector3());
  const pivotMix = useRef(new Vector3());

  const aspect = size.width / Math.max(1, size.height);

  /** Framed camera position and look-at for a stop on this screen shape. */
  const frameStop = (stop: KlassView, outPos: Vector3, outTarget: Vector3) => {
    const pull = aspect < 1 ? 1 + (1 - aspect) * 1.25 : aspect < 1.3 ? 1.12 : 1;
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

  /** Convert a camera position and look-at into an orbit about a near pivot. */
  const toOrbit = (pos: Vector3, target: Vector3, wide: boolean, out: Orbit) => {
    dir.current.copy(target).sub(pos);
    const dist = dir.current.length();
    dir.current.normalize();
    const reach = wide ? dist : Math.min(dist, PIVOT_REACH);
    out.pivot.copy(pos).addScaledVector(dir.current, reach);
    out.radius = reach;
    out.yaw = Math.atan2(-dir.current.x, -dir.current.z);
    out.pitch = Math.asin(Math.max(-1, Math.min(1, -dir.current.y)));
  };

  const stopOrbit = (stop: KlassView, out: Orbit) => {
    frameStop(stop, tmpA.current, tmpB.current);
    toOrbit(tmpA.current, tmpB.current, stop.id === "welcome", out);
  };

  // Choosing a stop glides there and hands the controls back.
  useEffect(() => {
    const target: Orbit = { pivot: new Vector3(), yaw: 0, pitch: 0, radius: 1 };
    stopOrbit(view, target);
    const g = goal.current;
    g.pivot.copy(target.pivot);
    g.radius = target.radius;
    g.pitch = target.pitch;
    g.yaw = cur.current.yaw + angleDelta(cur.current.yaw, target.yaw);
    if (view.id === "welcome") welcomeYaw.current = g.yaw;
    glideVel.current = 0;
    settle.current = 1.8;
    tour.current = 0;
    sway.current = 0;
    if (input.current) {
      input.current.touched = false;
      input.current.flick = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id, aspect]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const i = input.current;
    const g = goal.current;
    const c = cur.current;
    const animate = started && !reducedMotion;

    // ---- visitor input
    if (i) {
      if (i.dx || i.dy) {
        // A full-width swipe turns about 300 degrees, like IMVU on a phone.
        const perPx = (Math.PI * 1.7) / Math.max(320, Math.min(i.width, 1100));
        g.yaw -= i.dx * perPx;
        g.pitch = Math.max(-0.55, Math.min(1.1, g.pitch + i.dy * perPx * 0.55));
        i.dx = 0;
        i.dy = 0;
        i.touched = true;
        settle.current = 0;
      }
      if (i.flick) {
        const perPx = (Math.PI * 1.7) / Math.max(320, Math.min(i.width, 1100));
        glideVel.current = Math.max(-7, Math.min(7, -i.flick * perPx));
        i.flick = 0;
      }
      if (i.zoom !== 1) {
        const maxR = view.id === "welcome" ? 12 : 6;
        g.radius = Math.max(0.35, Math.min(maxR, g.radius * i.zoom));
        i.zoom = 1;
        i.touched = true;
        settle.current = 0;
      }
    }
    if (!i?.interacting && Math.abs(glideVel.current) > 0.002) {
      g.yaw += glideVel.current * dt;
      glideVel.current *= Math.exp(-2.8 * dt);
    }

    // ---- automatic motion until the visitor takes the wheel
    let autoYaw = 0;
    if (animate && !i?.touched) {
      if (view.id === "welcome") {
        tour.current += dt;
        const t = tour.current % WALK_LENGTH;
        let remaining = t;
        let index = 0;
        let blend = 0;
        for (let step = 0; step < WALK.length; step += 1) {
          const stop = WALK[step]!;
          index = step;
          if (remaining < stop.hold) break;
          remaining -= stop.hold;
          if (remaining < stop.travel) {
            blend = glide(remaining / stop.travel);
            break;
          }
          remaining -= stop.travel;
        }
        const from = viewById(WALK[index]!.id);
        const to = viewById(WALK[(index + 1) % WALK.length]!.id);
        frameStop(from, tmpA.current, tmpB.current);
        frameStop(to, nextA.current, nextB.current);
        tmpA.current.lerp(nextA.current, blend);
        tmpB.current.lerp(nextB.current, blend);
        const wide = (from.id === "welcome" && blend < 0.5) || (to.id === "welcome" && blend > 0.5);
        const o: Orbit = { pivot: g.pivot, yaw: 0, pitch: 0, radius: 1 };
        toOrbit(tmpA.current, tmpB.current, wide, o);
        g.radius = o.radius;
        g.pitch = o.pitch;
        g.yaw = c.yaw + angleDelta(c.yaw, o.yaw);
        if (from.id === "welcome" && blend === 0) autoYaw = Math.sin(t * 0.4) * 0.22;
      } else {
        sway.current += dt;
        autoYaw = Math.sin(sway.current * 0.35) * view.sway * 1.6;
      }
    }

    // ---- ease current toward goal
    const steering = i?.interacting || Math.abs(glideVel.current) > 0.05;
    const rate = reducedMotion ? 60 : steering ? 14 : settle.current > 0 ? 2.8 : 6;
    settle.current = Math.max(0, settle.current - dt);
    const k = 1 - Math.exp(-rate * dt);
    c.pivot.lerp(g.pivot, k);
    c.yaw += angleDelta(c.yaw, g.yaw) * k;
    c.pitch += (g.pitch - c.pitch) * k;
    c.radius += (g.radius - c.radius) * k;

    // ---- place the camera, sliding in off the walls
    const yaw = c.yaw + autoYaw;
    dir.current.set(Math.sin(yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(yaw) * Math.cos(c.pitch));
    // The opening shot stands outside the open front of the room; anywhere
    // else the camera stays inside the four walls.
    const off = view.id === "welcome" ? Math.abs(angleDelta(welcomeYaw.current, yaw)) : Math.PI;
    const open = 1 - Math.min(1, Math.max(0, (off - 0.18) / 0.4));
    const maxZ = BOX.maxZ + (14 - BOX.maxZ) * open;
    // From the wide opening shot, turning glides the orbit to the middle of
    // the room so the whole Klassroom spins around you instead of the camera
    // pressing into a wall.
    let pivot = c.pivot;
    let radius = c.radius;
    if (view.id === "welcome") {
      const t0 = Math.min(1, Math.max(0, (off - 0.12) / 1.0));
      const t = t0 * t0 * (3 - 2 * t0);
      pivotMix.current.copy(c.pivot).lerp(ROOM_CENTER, t);
      pivot = pivotMix.current;
      radius = c.radius + (Math.min(c.radius, CENTER_RADIUS) - c.radius) * t;
    }
    const limit = rayToBox(pivot, dir.current, maxZ) - 0.2;
    const r = Math.min(radius, Math.max(0.3, limit));
    camera.position.copy(pivot).addScaledVector(dir.current, r);
    const cam = camera as PerspectiveCamera;
    const fov = size.width < size.height ? 52 : 42;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    camera.lookAt(pivot);
  });

  return null;
}
