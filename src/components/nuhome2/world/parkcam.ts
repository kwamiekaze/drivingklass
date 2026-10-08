/*
 * The camera for the parking drives: a pure function of time, like intro.ts, built from a handful of shots that melt into one another (no cuts).
 * It is a bird's eye: every shot is high (9 to 26 m up) and well back from the car, so the whole move reads, and none comes close to the body.
 *
 *   front part (parallel and bayFront)                       back lot, parallel                                   back lot, bay
 *   F1 high three-quarter as the car signals and backs out   P1 from beyond the back kerb, high, as it pulls up   B1 the same, for the drive to the second line
 *   F2 a tracking shot from ahead                                P2 from the south-east as the signal goes on         Q1/Q2 (bayBox) high from the south-east, backing out
 *   F3 beside the east road, high                            P3 straight down for the two arcs                    B2 straight down over the bay and the car
 *   F4 over the roof of the building: the lot opens up       P4 a slow pull back and rise                         B3 a slow pull back and rise
 *
 * The raw camera is baked at 20 samples a second, pushed out of every solid object (colliders.ts, the back-lot cones included) and away from the
 * car's own body, then smoothed, and played back on a cubic. scripts/check-park.mjs walks the finished camera against the same solids.
 */
import { SOLIDS, clearance, GROUND } from './colliders';
import { park, parkCarAt, parkEnds, parkMarks, parkMode, parkTotal, type ParkCar, type ParkMode } from './park';
import { CONN_X, LOT_SIGN, LOT_SIGNS } from './rearlot';

export type V3 = [number, number, number];
export type Pose = { p: V3; l: V3; fov: number };

const sstep = (u: number) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
export const CAM_MARGIN = .75, CAM_CAR = 1.35;   // how far the lens stays from a solid, and from the car's own body

type Ctx = { c: ParkCar; t: number; u: number };
type Shot = { to: number; h?: number; at: (x: Ctx) => { p: V3; l: V3; fov: number } };   // the shot lasts until `to`; the next one is blended in over the last seconds

const carFwd = (c: ParkCar): [number, number] => [Math.cos(c.yaw), -Math.sin(c.yaw)];
const carLeft = (c: ParkCar): [number, number] => [-Math.sin(c.yaw), -Math.cos(c.yaw)];

/** The last frame of the drive into the back lot, high: the car at the stop line, the "!" for the parallel park and the "!" for the bay both in view. */
const ENTER_END_N = { p: [12, 40, -36] as V3, l: [12, 0, -45] as V3 }, ENTER_END_W = { p: [7, 32, -39] as V3, l: [7, 0, -48] as V3 };
function buildShots(narrow: boolean, mode: ParkMode) {
  const M = parkMarks() as Record<string, number>, E = parkEnds() as Record<string, number>, T = parkTotal();
  const f = narrow ? 1.3 : 1, FOV = (v: number) => v * (narrow ? 1.32 : 1), up = narrow ? 1.3 : 1;
  const c0 = { ...parkCarAt(0) }, o = c0.z < 0 ? 1 : -1;               // the car's tail points away from its stall toward the aisle: +z for row A, -z for row B
  const shots: Shot[] = [];
  const enter = mode === 'enterStall' || mode === 'enterLive', live = mode === 'enterLive' || mode === 'exitLive';
  if (mode === 'parallel' || mode === 'bayFront' || mode === 'exitFront' || mode === 'exitLive' || enter) {
    // moments found by watching the car
    let tEast = M.DRIVE_TO_REAR_LOT!, tRear = tEast;
    for (let t = M.DRIVE_TO_REAR_LOT!; t < T; t += .1) { const c = parkCarAt(t); if (c.x > CONN_X - 7) { tEast = t; break; } }
    for (let t = tEast; t < T; t += .1) { const c = parkCarAt(t); if (c.z < -27) { tRear = t; break; } }
    const tStop = M.STOP_AT_ENTRY_LINE!;
    if (!live) shots.push(
      // F1. high three-quarter: the signal flashes, the car backs out and swings into the aisle
      { to: E.EXIT_REVERSE! + 1.6, h: 3.0, at: ({ c, u }) => ({ p: [c0.x + 7 * f, 11 + 1.5 * u, c0.z + o * 11 * f], l: [c.x, .6, c.z + o * 1.2], fov: FOV(40) }) },
      // F2. a tracking shot from ahead: high, in front of the car and to its right, looking back at it as it comes down the aisle
      { to: tEast - .8, h: 3.0, at: ({ c, u }) => { const [fx, fz] = carFwd(c), [lx, lz] = carLeft(c); return { p: [c.x + fx * 12 * f - lx * 5 * f, 11 + 1.5 * u, c.z + fz * 12 * f - lz * 5 * f], l: [c.x, .6, c.z], fov: FOV(42) }; } },
    );
    shots.push(
      // F3. beside the east road, high, the building and its stars behind (the live drive keeps the opening shot's own vantage: south-west of the car, over the front lawn)
      { to: tRear + 1.2, h: 3.8, at: ({ c }) => live ? ({ p: [c.x - (narrow ? 14 : 13), narrow ? 14.5 : 12.5, c.z + (narrow ? 17 : 14)], l: [c.x - 1, .6, c.z - 2.5], fov: FOV(42) }) : ({ p: [Math.min(CONN_X + 11 * f, c.x + 14 * f), 10, c.z + 8 * f], l: [c.x - 1, .6, c.z - 2.5], fov: FOV(42) }) },
      // F4. over the roof of the building: the back lot opens up and the car comes in toward the stop line
      { to: tStop + (enter ? .4 : 2.2), h: 3.9, at: ({ c, u }) => ({ p: [mix(27, 20, u), mix(17.5, 15, u), -25.5 * f - 1], l: [mix(c.x, 12, enter ? .3 : .55), .8, mix(c.z, -43, enter ? .3 : .5)], fov: FOV(44) }) },
    );
    // F5 (the PARKING sign's drive only). the car has stopped at the stop line: the camera rises to a high view with the car and both "!" that start the next drives, the parallel one and the bay one
    if (enter) shots.push({ to: T, at: () => ({ p: narrow ? ENTER_END_N.p : ENTER_END_W.p, l: narrow ? ENTER_END_N.l : ENTER_END_W.l, fov: FOV(44) }) });
  }
  const north = ({ c }: Ctx) => ({ p: [c.x + 8 * f, 17 * (narrow ? 1.1 : 1), -58] as V3, l: [c.x - 2, .4, c.z + .5] as V3, fov: FOV(36) });   // from beyond the back kerb, looking south over the lot
  if (mode === 'parallel' || mode === 'parallelE') {
    const tPull1 = E.PULL_FORWARD_TO_SETUP!, tBlack = M.STOP_AT_BLACK_LINE!, tArcEnd = E.REVERSE_FULL_LEFT!;
    shots.push(
      // P1. from beyond the back kerb, high, as the car pulls up to the second white line
      { to: tPull1 + 1.6, h: 3.4, at: north },
      // P2. from the south-east: the right signal goes on and the car starts to back
      { to: tBlack + 1.0, at: ({ c }) => ({ p: [18 * f, 15 * (narrow ? 1.2 : 1), -36], l: [c.x + 1, .4, c.z - .5], fov: FOV(40) }) },
      // P3. straight down: the two arcs read as geometry
      { to: tArcEnd + 1.4, at: ({ c, u }) => ({ p: [c.x + .8 + 1.2 * u, 26 * up, c.z + 4 * up], l: [c.x + .8, 0, c.z - 1.5], fov: FOV(46) }) },
      // P4. the pull back and rise to a three-quarter of the parked car
      { to: T, at: ({ u }) => { const k = sstep(u); return { p: mix3([11.6, 26 * up, -42 + 4 * (up - 1)], [27 * (narrow ? 1.15 : 1), 12, -31.5], k), l: mix3([10.4, 0, -47.5], [8.2, 1.0, -45.3], k), fov: FOV(mix(46, 44, k)) }; } },
    );
  } else if (mode === 'turn') {
    shots.push(
      // U1. high from the south: the left signal, then the car rolls out of the bay and swings east onto the lane
      { to: E.TURN_DRIVE! - 5.0, h: 2.4, at: ({ c }) => ({ p: [c.x * .5 - 2 * f, 17 * (narrow ? 1.2 : 1), -33 + 2 * (up - 1)], l: [c.x * .9 + .8, .3, c.z - .3], fov: FOV(42) }) },
      // U2. the pull back over the lane to a high view of the east white line, the car at it and, in the same frame, the next "!" at the west white line
      { to: T, at: ({ c, u }) => { const k = sstep(u), a: V3 = [c.x * .5 - 2 * f, 17 * (narrow ? 1.2 : 1), -33 + 2 * (up - 1)], b: V3 = narrow ? [3.5, 57, -29] : [3, 25, -30], la: V3 = [c.x * .9 + .8, .3, c.z - .3], lb: V3 = narrow ? [3.5, 0, -35] : [3, 0, -39]; return { p: mix3(a, b, k), l: mix3(la, lb, k), fov: FOV(mix(42, 44, k)) }; } },
    );
  } else if (mode === 'back') {
    // the moment the straight reverse is over and the car is home at the west white line
    const tDone = M.BACK_DONE!, sg = LOT_SIGNS.exit, sy = LOT_SIGN.Y - .1;
    shots.push(
      // K1. high, looking along the lane: the car backs slowly west toward the line
      { to: tDone + 1.0, h: 2.4, at: ({ c }) => narrow ? { p: [c.x + 17, 30, -41], l: [c.x - 11, 0, -41], fov: FOV(44) } : { p: [c.x - 8, 24, -33], l: [c.x - 6, .3, c.z - .5], fov: FOV(44) } },
      // K2. the car has come to rest: the lens glides over the lot to the EXIT sign at the west road and settles on it (the long blend into this shot does the travelling), so the
      //     visitor sees where the way out is; the EXIT button is offered now
      { to: T, at: ({ u }) => ({ p: mix3(narrow ? [-12.5, 6.6, -31.6] : [-12.5, 6.2, -32], narrow ? [-13.3, 6.5, -31.3] : [-13.3, 6.1, -31.7], sstep(u)), l: [sg.x - .4, sy - .35, sg.z - .2], fov: FOV(narrow ? 36 : 34) }) },
    );
  } else if (mode.startsWith('exit')) {
    // (the way out, from wherever the car starts: in the front lot the shots above have already brought it to the back lot's stop line)
    // moments found by watching the car: when it has turned into the west road, and when it is nearly at the stop sign
    let tRoad = M.OUT_TO_STOP!, tNear = E.OUT_TO_STOP!;
    for (let t = M.OUT_TO_STOP!; t < T; t += .1) { const c = parkCarAt(t); if (c.x < -30 && c.z > -24) { tRoad = t; break; } }
    for (let t = tRoad; t < T; t += .1) { const c = parkCarAt(t); if (c.z > 0) { tNear = t; break; } }
    const hi = narrow ? 1.15 : 1;
    shots.push(
      // X1. high from the north, always the same distance behind the car: it pulls forward along the lane, turns to face the building and drives west along the back of it
      { to: tRoad + 1.0, h: 3.0, at: ({ c }) => ({ p: [c.x + 4 * f, 19 * hi, c.z - 14 * f], l: [c.x, .4, c.z + .8], fov: FOV(42) }) },
      // X2. high from the north-east, over the roof of the building: the car comes down the west road toward the street
      { to: tNear + 1.0, h: 3.4, at: ({ c }) => ({ p: [c.x + 12 * f, 17 * (narrow ? 1.2 : 1), c.z - 12 * f], l: [c.x, .4, c.z + 1.5], fov: FOV(42) }) },
      // X3. from the lot, high, with the stop sign, the car and the street in one frame: the stop, the right signal, the right turn, and the car leaving the scene to the west
      { to: T, at: ({ c }) => { const cx = Math.max(c.x, -52); return { p: [Math.min(-14, cx + 19 * f), 15 * (narrow ? 1.3 : 1), 2], l: [cx - 1, .4, c.z + 2], fov: FOV(42) }; } },
    );
  } else if (!enter) {
    if (mode === 'bayFront' || mode === 'bayE') shots.push({ to: E.DRIVE_TO_BAY_LINE! + .6, h: 3.4, at: north });
    else shots.push(
      // Q1. high from the south-east: the right signal, the short reverse, the left signal
      { to: E.BOX_SIGNAL_L! + 1.2, h: 2.6, at: ({ c }) => ({ p: [19 * f, 14 * (narrow ? 1.2 : 1), -34.5], l: [c.x - .5, .4, c.z - .3], fov: FOV(40) }) },
      // Q2. follow the car out of the box and west along the lane to the second white line
      { to: E.BOX_PULL_OUT! + .4, h: 2.6, at: ({ c }) => ({ p: [c.x + 9 * f, 15 * (narrow ? 1.15 : 1), c.z + 11 * f], l: [c.x - 3, .3, c.z - .4], fov: FOV(42) }) },
    );
    shots.push(
      // B2. straight down over the line, the car and the bay: the quarter circle into the bay
      { to: E.BAY_REVERSE! - 3.0, h: 3.0, at: ({ u }) => ({ p: [2.4 + .8 * u, 32 * (narrow ? 1.1 : 1), -39.7 - 2 * (up - 1)], l: [2.4, 0, -47.2], fov: FOV(46) }) },
      // B3. the pull back and rise to a high view of the parked car, the white line on the left and the next "!" beside it
      { to: T, at: ({ u }) => { const k = sstep(u); return { p: mix3([3.2, 32 * (narrow ? 1.1 : 1), -39.7 - 2 * (up - 1)], narrow ? [12, 35, -33.5] : [11, 20, -36.5], k), l: mix3([2.4, 0, -47.2], narrow ? [12, 0, -42.5] : [11, 0, -45.5], k), fov: FOV(mix(46, 44, k)) }; } },
    );
  }
  return { shots, T };
}

type Baked = { n: number; p: Float32Array; l: Float32Array; fov: Float32Array; T: number };
const CACHE: Record<string, Baked> = {};
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

function bake(narrow: boolean, mode: ParkMode): Baked {
  const { shots, T } = buildShots(narrow, mode), n = Math.ceil(T / DT) + 1, P: V3[] = [], L: V3[] = [], F: number[] = [], cars: ParkCar[] = [];
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
export function resetParkCam() { for (const k of Object.keys(CACHE)) delete CACHE[k]; }
/** The camera at time t of the drive. Narrow is the portrait phone framing. */
export function parkCamAt(t: number, narrow = false): Pose {
  const mode = parkMode(), key = mode + (narrow ? 'N' : 'W') + (mode === 'enterLive' || mode === 'exitLive' ? park.seq : ''), B = (CACHE[key] ??= bake(narrow, mode)), f = Math.min(B.n - 1, Math.max(0, t / DT)), i = Math.min(B.n - 2, Math.floor(f)), u = f - i;
  const g = (A: Float32Array, k: number, d: number) => A[Math.min(B.n - 1, Math.max(0, k)) * 3 + d]!;
  // a cubic through the samples (Catmull-Rom), so the speed never steps between samples
  const cr = (A: Float32Array, d: number) => { const p0 = g(A, i - 1, d), p1 = g(A, i, d), p2 = g(A, i + 1, d), p3 = g(A, i + 2, d); return .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u); };
  return { p: [cr(B.p, 0), cr(B.p, 1), cr(B.p, 2)], l: [cr(B.l, 0), cr(B.l, 1), cr(B.l, 2)], fov: mix(B.fov[i]!, B.fov[Math.min(B.n - 1, i + 1)]!, u) };
}
