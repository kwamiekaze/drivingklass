/*
 * The camera for the parallel-parking drive: a pure function of time, like intro.ts, built from ten shots that melt into one another
 * (no cuts), each aimed from what the car is doing at that moment:
 *
 *   1  the tail lamp flashing, low behind the car, before it moves             6  a long lens from beyond the back kerb, level with the cones
 *   2  backing out, a high three-quarter that follows the swing                7  the tail lamp again, low and close, as the signal goes on and the car reverses
 *   3  a crane chase down the aisle                                            8  straight down over the car for the two arcs
 *   4  beside the east road, level with the car, as it goes round the building 9  low across the cones, the car sliding in
 *   5  over the roof of the building: the whole back lot opens up              10 a slow pull back and rise to a three-quarter of the parked car
 *
 * The raw camera is baked at 20 samples a second, pushed out of every solid object (colliders.ts, the back-lot cones included) and away from the
 * car's own body, then smoothed, and played back on a cubic. scripts/check-park.mjs walks the finished camera against the same solids.
 */
import { SOLIDS, clearance, GROUND } from './colliders';
import { parkCarAt, parkEnds, parkMarks, parkTotal, type ParkCar } from './park';
import { CONN_X } from './rearlot';

export type V3 = [number, number, number];
export type Pose = { p: V3; l: V3; fov: number };

const sstep = (u: number) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
export const CAM_MARGIN = .75, CAM_CAR = 1.35;   // how far the lens stays from a solid, and from the car's own body

type Ctx = { c: ParkCar; t: number; u: number };
type Shot = { to: number; h?: number; at: (x: Ctx) => { p: V3; l: V3; fov: number } };   // the shot lasts until `to`; the next one is blended in over the last second

const carFwd = (c: ParkCar): [number, number] => [Math.cos(c.yaw), -Math.sin(c.yaw)];
const carLeft = (c: ParkCar): [number, number] => [-Math.sin(c.yaw), -Math.cos(c.yaw)];

function buildShots(narrow: boolean) {
  const M = parkMarks() as Record<string, number>, E = parkEnds() as Record<string, number>, T = parkTotal();
  const c0 = { ...parkCarAt(0) }, o = c0.z < 0 ? 1 : -1;               // the car's tail points away from its stall toward the aisle: +z for row A, -z for row B
  const f = narrow ? 1.3 : 1, FOV = (v: number) => v * (narrow ? 1.32 : 1);
  // moments found by watching the car
  let tEast = M.DRIVE_TO_REAR_LOT!, tRear = tEast;
  for (let t = M.DRIVE_TO_REAR_LOT!; t < T; t += .1) { const c = parkCarAt(t); if (c.x > CONN_X - 7) { tEast = t; break; } }
  for (let t = tEast; t < T; t += .1) { const c = parkCarAt(t); if (c.z < -27) { tRear = t; break; } }
  const tStop = M.STOP_AT_ENTRY_LINE!, tPull1 = E.PULL_FORWARD_TO_SETUP!, tBlack = M.STOP_AT_BLACK_LINE!, tS2 = M.REVERSE_STRAIGHT_2!, tSigL = M.SIGNAL_LEFT!, tArc2e = E.REVERSE_FULL_LEFT!;
  const at = (c: ParkCar): V3 => [c.x, .7, c.z];
  const shots: Shot[] = [
    // 1. the tail lamp flashing: low, behind the car, to the east of it (the tail swings west, away from the lens)
    { to: M.EXIT_REVERSE! + 2.4, at: ({ c, u }) => ({ p: [c0.x + 3.4 * f, 1.0, c0.z + o * (9.6 - 1.6 * u) * f], l: [c.x - .5, .75, c.z + o * 1.9], fov: FOV(34) }) },
    // 2. backing out: a high three-quarter that holds the car as it swings out into the aisle
    { to: E.EXIT_REVERSE! + 1.6, h: 3.4, at: ({ c }) => ({ p: [c.x + 8.2 * f, 3.4, c.z + o * 5.2 * f], l: at(c), fov: FOV(38) }) },
    // 3. the crane chase: behind, up and to the left, down the aisle and round onto the east road
    { to: tEast + 1.2, at: ({ c, u }) => { const [fx, fz] = carFwd(c), [lx, lz] = carLeft(c); return { p: [c.x - fx * 11 * f + lx * 3.2 * f, 6.4 + 1.2 * u, c.z - fz * 11 * f + lz * 3.2 * f], l: [c.x + fx * 5, .7, c.z + fz * 5], fov: FOV(42) }; } },
    // 4. beside the east road, level with the car and ahead of it, with the building and its stars behind
    { to: tRear + 1.2, at: ({ c }) => ({ p: [CONN_X + 5.4 * f, 1.6, c.z + 6.0 * f], l: [c.x, .8, c.z - 2.5], fov: FOV(40) }) },
    // 5. over the roof of the building: the back lot opens up and the car comes in toward the stop line
    { to: tStop + 2.2, h: 3.9, at: ({ c, u }) => ({ p: [mix(27, 20, u), mix(17.5, 15, u), -25.5 * f - 1], l: [mix(c.x, 12, .55), .8, mix(c.z, -43, .5)], fov: FOV(44) }) },
    // 6. a long lens from beyond the back kerb, level with the cones, as the car pulls forward to the blue line
    { to: tPull1 + 1.6, h: 3.4, at: ({ c }) => ({ p: [c.x + 6, 1.5, -56.2], l: [c.x - 1, .8, c.z], fov: FOV(27) }) },
    // 7. the tail lamp again, low and close, as the right signal goes on and the car backs to the black line
    { to: tBlack + 1.0, at: ({ c }) => ({ p: [Math.max(c.x + 7.2 * f, 12.4), 1.15, c.z + 1.3], l: [c.x + 1.2, .85, c.z - .5], fov: FOV(33) }) },
    // 8. straight down: the two arcs read as geometry
    { to: tSigL + 1.2, at: ({ c, u }) => ({ p: [c.x + .8 + 1.2 * u, 16.0 * (narrow ? 1.12 : 1), c.z + 4.6], l: [c.x + .8, 0, c.z - .3], fov: FOV(46) }) },
    // 9. low across the cones: the car slides into the box
    { to: tArc2e + 1.4, at: ({ c, u }) => ({ p: [mix(10.2, 11.8, u), 1.0, -50.8], l: [c.x - .6, .75, c.z], fov: FOV(36) }) },
    // 10. the pull back and rise to a three-quarter of the parked car
    { to: T, at: ({ c, u }) => { const k = sstep(u); return { p: mix3([11.8, 1.0, -50.8], [27 * (narrow ? 1.15 : 1), 8.8, -31.5], k), l: mix3([c.x - .6, .75, c.z], [8.2, 1.0, -45.3], k), fov: FOV(mix(36, 42, k)) }; } },
  ];
  return { shots, T, M, E };
}

type Baked = { n: number; p: Float32Array; l: Float32Array; fov: Float32Array; T: number };
const CACHE: { wide?: Baked; narrow?: Baked } = {};
const DT = 1 / 20;

/** Push a point away from solids and the car: returns true if it moved. */
function pushOut(p: V3, car: ParkCar | null): boolean {
  let moved = false;
  if (p[1] < GROUND + .1) { p[1] = GROUND + .1; moved = true; }
  for (const sd of SOLIDS) {
    const d = clearance(sd, p); if (d >= CAM_MARGIN) continue;
    if (sd.k === 'wire') { p[1] += CAM_MARGIN - d + .15; moved = true; continue; }
    if (sd.k === 'cyl') {
      const dx = p[0] - sd.x, dz = p[2] - sd.z, h = Math.hypot(dx, dz) || 1e-3, above = p[1] > sd.y1 - .2;
      if (above || p[1] < sd.y0 + .05) { p[1] = sd.y1 + CAM_MARGIN; } else { p[0] = sd.x + (dx / h) * (sd.r + CAM_MARGIN); p[2] = sd.z + (dz / h) * (sd.r + CAM_MARGIN); }
      moved = true; continue;
    }
    const cx = (sd.min[0] + sd.max[0]) / 2, cy = (sd.min[1] + sd.max[1]) / 2, cz = (sd.min[2] + sd.max[2]) / 2;
    const e = [(sd.max[0] - sd.min[0]) / 2 + CAM_MARGIN, (sd.max[1] - sd.min[1]) / 2 + CAM_MARGIN, (sd.max[2] - sd.min[2]) / 2 + CAM_MARGIN], dd = [p[0] - cx, p[1] - cy, p[2] - cz];
    const room = [e[0]! - Math.abs(dd[0]!), e[1]! - Math.abs(dd[1]!), e[2]! - Math.abs(dd[2]!)];
    let ax = 0; for (let i = 1; i < 3; i++) if (room[i]! < room[ax]!) ax = i;     // leave by the nearest face
    const sign = dd[ax]! >= 0 ? 1 : -1; if (ax === 0) p[0] = cx + sign * e[0]!; else if (ax === 1) p[1] = cy + sign * e[1]!; else p[2] = cz + sign * e[2]!;
    moved = true;
  }
  if (car && p[1] < 2.6) {
    const cs = Math.cos(car.yaw), sn = Math.sin(car.yaw), dx = p[0] - car.x, dz = p[2] - car.z, a = dx * cs - dz * sn, b = -dx * sn - dz * cs;
    const ox = Math.max(Math.abs(a) - 2.25, 0), oz = Math.max(Math.abs(b) - 1.05, 0), d = Math.hypot(ox, oz);
    if (d < CAM_CAR) {
      // leave along the line from the car's rectangle, or straight out of its nearest side when inside
      let na = ox > 0 ? Math.sign(a) * ox : 0, nb = oz > 0 ? Math.sign(b) * oz : 0;
      if (d < 1e-6) { if (2.25 - Math.abs(a) < 1.05 - Math.abs(b)) { na = Math.sign(a) || 1; nb = 0; } else { nb = Math.sign(b) || 1; na = 0; } }
      const h = Math.hypot(na, nb) || 1, ua = na / h, ub = nb / h;
      const ca = Math.sign(a) * Math.min(Math.abs(a), 2.25), cb = Math.sign(b) * Math.min(Math.abs(b), 1.05);
      const ta = ca + ua * CAM_CAR, tb = cb + ub * CAM_CAR;
      p[0] = car.x + ta * cs - tb * sn; p[2] = car.z - ta * sn - tb * cs; moved = true;
    }
  }
  return moved;
}

function bake(narrow: boolean): Baked {
  const { shots, T } = buildShots(narrow), n = Math.ceil(T / DT) + 1, P: V3[] = [], L: V3[] = [], F: number[] = [], cars: ParkCar[] = [];
  const H = 2.1;   // the blend between two shots lasts this long on each side of the hand-over
  const starts: number[] = [0]; for (let i = 0; i < shots.length - 1; i++) starts.push(shots[i]!.to);
  for (let k = 0; k < n; k++) {
    const t = Math.min(T, k * DT), c = { ...parkCarAt(t) }; cars.push(c);
    const pose = (i: number) => { const s0 = starts[i]!, s1 = shots[i]!.to, u = Math.min(1, Math.max(0, (t - s0) / Math.max(.01, s1 - s0))); return shots[i]!.at({ c, t, u }); };
    let i = 0; while (i < shots.length - 1 && t >= shots[i]!.to) i++;
    let ps = pose(i);
    const hOf = (j: number) => shots[j]?.h ?? H;
    if (i < shots.length - 1 && t > shots[i]!.to - hOf(i)) { const q = pose(i + 1), w = sstep((t - (shots[i]!.to - hOf(i))) / (2 * hOf(i))); ps = { p: mix3(ps.p, q.p, w), l: mix3(ps.l, q.l, w), fov: mix(ps.fov, q.fov, w) }; }
    else if (i > 0 && t < starts[i]! + hOf(i - 1)) { const q = pose(i - 1), w = sstep((t - (starts[i]! - hOf(i - 1))) / (2 * hOf(i - 1))); ps = { p: mix3(q.p, ps.p, w), l: mix3(q.l, ps.l, w), fov: mix(q.fov, ps.fov, w) }; }
    P.push([...ps.p] as V3); L.push([...ps.l] as V3); F.push(ps.fov);
  }
  // push out, smooth, push out again (twice), so the lens is clear and the move is smooth
  const smooth = (A: V3[], sigma: number) => {
    const w = Math.max(1, Math.round(sigma / DT * 2)), out: V3[] = [];
    for (let k = 0; k < A.length; k++) { let sx = 0, sy = 0, sz = 0, sw = 0; for (let j = -w; j <= w; j++) { const q = A[Math.min(A.length - 1, Math.max(0, k + j))]!, g = Math.exp(-.5 * (j * DT / sigma) ** 2); sx += q[0] * g; sy += q[1] * g; sz += q[2] * g; sw += g; } out.push([sx / sw, sy / sw, sz / sw]); }
    return out;
  };
  let PP = P;
  for (let pass = 0; pass < 3; pass++) {
    for (let k = 0; k < n; k++) { for (let it = 0; it < 6; it++) if (!pushOut(PP[k]!, cars[k]!)) break; }
    PP = smooth(PP, pass === 2 ? .12 : .4);
  }
  for (let k = 0; k < n; k++) for (let it = 0; it < 6; it++) if (!pushOut(PP[k]!, cars[k]!)) break;
  const LL = smooth(L, .3), FF = smooth(F.map(v => [v, 0, 0] as V3), .5).map(v => v[0]);
  const p = new Float32Array(n * 3), l = new Float32Array(n * 3), fov = new Float32Array(n);
  for (let k = 0; k < n; k++) { p.set(PP[k]!, k * 3); l.set(LL[k]!, k * 3); fov[k] = FF[k]!; }
  return { n, p, l, fov, T };
}

/** Drop the baked cameras (tests change the car's stall). */
export function resetParkCam() { CACHE.wide = CACHE.narrow = undefined; }
/** The camera at time t of the drive. Narrow is the portrait phone framing. */
export function parkCamAt(t: number, narrow = false): Pose {
  const B = (CACHE[narrow ? 'narrow' : 'wide'] ??= bake(narrow)), f = Math.min(B.n - 1, Math.max(0, t / DT)), i = Math.min(B.n - 2, Math.floor(f)), u = f - i;
  const g = (A: Float32Array, k: number, d: number) => A[Math.min(B.n - 1, Math.max(0, k)) * 3 + d]!;
  // a cubic through the samples (Catmull-Rom), so the speed never steps between samples
  const cr = (A: Float32Array, d: number) => { const p0 = g(A, i - 1, d), p1 = g(A, i, d), p2 = g(A, i + 1, d), p3 = g(A, i + 2, d); return .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u); };
  return { p: [cr(B.p, 0), cr(B.p, 1), cr(B.p, 2)], l: [cr(B.l, 0), cr(B.l, 1), cr(B.l, 2)], fov: mix(B.fov[i]!, B.fov[Math.min(B.n - 1, i + 1)]!, u) };
}
