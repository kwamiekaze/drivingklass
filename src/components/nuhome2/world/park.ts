/*
 * The two parking drives, as pure, testable timelines (no React, no three.js), like intro.ts.
 *
 * Press the "!" beside the parallel space in the back lot ("parallel") and the car that opened the page (the CAST car) does this, start to finish.
 * Press the "!" behind the reverse bay ("bay") and the same car reverses into the bay: from its stall in the front lot (it drives to the back lot, stops
 * at the white stop line, drives up to the second white line) or, when it is already in the parallel box, by backing out of the box first (see planBay).
 * The parallel drive:
 *
 *   EXIT_SIGNAL .. EXIT_REVERSE     the signal for the side the tail swings to comes on BEFORE the car moves, then it backs out of its stall
 *   DRIVE_TO_REAR_LOT               east along the aisle, left up the east side road, left into the back lot (the owner's red route)
 *   STOP_AT_ENTRY_LINE              a full stop at the white stop line
 *   PULL_FORWARD_TO_SETUP           straight on until the nose is on the second white line
 *   SIGNAL_RIGHT, SHIFT_TO_REVERSE  right signal on, then into reverse
 *   REVERSE_STRAIGHT_1              wheels straight until the tail reaches the black line, stop
 *   REVERSE_FULL_RIGHT              (stopped) wheel hard right, back up on the arc, stop
 *   REVERSE_STRAIGHT_2              wheels straight until the right mirror is abeam of the next cone, stop
 *   REVERSE_FULL_LEFT               (stopped) wheel hard left (the right signal stays on: the left one is never used here), back up until the car is parallel, stop
 *   FINAL_ALIGNMENT, PARKED         straighten, a small roll forward to centre it, signals off
 *
 * Nothing here is faked with a translate plus a rotate. The car is a kinematic bicycle (wheelbase 2.7 m, steering limited to 33 degrees and
 * moved at a realistic speed): its heading changes only because it moves with the wheels turned, d(yaw)/ds = tan(steer) / wheelbase.
 * The two reverse arcs are solved so the car comes to rest in the middle of the cone-and-paint box, parallel, facing the way of the arrow.
 *
 * Positions are of the REAR AXLE while the plan is built (that is the point a car pivots about); the car's centre, which is the model's origin, is 1.35 m ahead of it.
 */
import { CAST, STALLS, type Stall } from './cast';
import { BAY, BAY_LINE, BL_CONES, CONE_R, CONN_X, PBOX, STOP_LINE } from './rearlot';

export type ParkState =
  | 'EXIT_SIGNAL' | 'EXIT_SHIFT_R' | 'EXIT_REVERSE' | 'EXIT_STRAIGHTEN' | 'EXIT_SHIFT_D'
  | 'DRIVE_TO_REAR_LOT' | 'STOP_AT_ENTRY_LINE' | 'PULL_FORWARD_TO_SETUP' | 'SIGNAL_RIGHT' | 'SHIFT_TO_REVERSE'
  | 'REVERSE_STRAIGHT_1' | 'STOP_AT_BLACK_LINE' | 'STEER_FULL_RIGHT' | 'REVERSE_FULL_RIGHT' | 'STRAIGHTEN_1' | 'REVERSE_STRAIGHT_2'
  | 'STEER_FULL_LEFT' | 'REVERSE_FULL_LEFT' | 'STRAIGHTEN_2' | 'FINAL_ALIGNMENT' | 'PARKED'
  | 'BOX_SIGNAL_R' | 'BOX_SHIFT_R' | 'BOX_STEER_R' | 'BOX_REVERSE' | 'BOX_STOP' | 'BOX_SIGNAL_L' | 'BOX_STEER_0' | 'BOX_SHIFT_D' | 'BOX_PULL_OUT'
  | 'DRIVE_TO_BAY_LINE' | 'STOP_AT_BAY_LINE' | 'BAY_SIGNAL_RIGHT' | 'BAY_SHIFT_R' | 'BAY_REVERSE_1' | 'BAY_STOP_1' | 'BAY_STEER_RIGHT' | 'BAY_REVERSE_ARC' | 'BAY_STRAIGHTEN' | 'BAY_REVERSE_2' | 'BAY_PARKED';
const STATE_LIST: ParkState[] = ['EXIT_SIGNAL', 'EXIT_SHIFT_R', 'EXIT_REVERSE', 'EXIT_STRAIGHTEN', 'EXIT_SHIFT_D', 'DRIVE_TO_REAR_LOT', 'STOP_AT_ENTRY_LINE', 'PULL_FORWARD_TO_SETUP', 'SIGNAL_RIGHT', 'SHIFT_TO_REVERSE', 'REVERSE_STRAIGHT_1', 'STOP_AT_BLACK_LINE', 'STEER_FULL_RIGHT', 'REVERSE_FULL_RIGHT', 'STRAIGHTEN_1', 'REVERSE_STRAIGHT_2', 'STEER_FULL_LEFT', 'REVERSE_FULL_LEFT', 'STRAIGHTEN_2', 'FINAL_ALIGNMENT', 'PARKED',
  'BOX_SIGNAL_R', 'BOX_SHIFT_R', 'BOX_STEER_R', 'BOX_REVERSE', 'BOX_STOP', 'BOX_SIGNAL_L', 'BOX_STEER_0', 'BOX_SHIFT_D', 'BOX_PULL_OUT',
  'DRIVE_TO_BAY_LINE', 'STOP_AT_BAY_LINE', 'BAY_SIGNAL_RIGHT', 'BAY_SHIFT_R', 'BAY_REVERSE_1', 'BAY_STOP_1', 'BAY_STEER_RIGHT', 'BAY_REVERSE_ARC', 'BAY_STRAIGHTEN', 'BAY_REVERSE_2', 'BAY_PARKED'];
/** Which drive: the parallel park from the stall, the bay from the stall, or the bay from the parallel box. */
export type ParkMode = 'parallel' | 'bayFront' | 'bayBox';

// ---------- the car ----------
export const WB = 2.7;                       // wheelbase
export const RA = 1.35;                      // the rear axle is this far behind the model's origin (the car's centre)
export const NOSE = 3.6, TAIL = .9;          // nose / tail overhang measured from the rear axle (the car is 4.5 m long)
export const HALF_W = 1.0;                   // half the body width (mirrors add 0.1 each side)
export const DMAX = 33 * Math.PI / 180;      // full lock, left positive (the wheel turned to the left)
const R_MIN = WB / Math.tan(DMAX);           // the rear axle's turning radius at full lock: 4.16 m
const MIRROR_F = 2.3, MIRROR_W = 1.1;        // a door mirror sits this far ahead of the rear axle, and this far out from the centre line
const STEER_RATE = 36 * Math.PI / 180;       // how fast the wheel is turned, radians per second of the front wheels

// ---------- where things are (world metres, x east, z south) ----------
const LANE_E = .9;                           // the eastbound lane of the aisle in front of the building: the south (right-hand) half, not the middle
const TURN_N = 6.2, TURN_W = 5.6;            // radii of the left turn up the east road and the left turn into the back lot
const LANE_Z = (STOP_LINE.z0 + STOP_LINE.z1) / 2;           // the lane of the back lot, the middle of the stop line
const LANE_N = CONN_X + 1.0;                 // the northbound lane of the east road: its east (right-hand) half, not the middle
const NOSE_STOP_X = STOP_LINE.x + .4;        // the nose stops this far short of the white line
const LINE2_X = BAY_LINE.x + .4;             // and this far short of the second white line (the owner's blue line)
const BLUE_X = BAY_LINE.x;
const SETUP_Z = -42.2;                      // the car's lane position beside the box: the first guess; the solver may move it a little off the kerb
export const BOX_CX = (PBOX.x0 + PBOX.x1) / 2 - .19, BOX_CZ = (PBOX.zKerb + PBOX.zLane) / 2 + .19;   // where the car's centre is aimed: a little west and to the lane side of the very middle, which is what the cones leave room for   // the middle of the box: where the car's centre ends
const CONE_NEAR = ((): [number, number] => { let best = BL_CONES[0]!; for (const c of BL_CONES) if (Math.hypot(c[0] - PBOX.x0, c[1] - PBOX.zLane) < Math.hypot(best[0] - PBOX.x0, best[1] - PBOX.zLane)) best = c; return best; })();   // the cone at the near, open corner of the box: "the cone just right of the black line"
const BLACK_RA = 6.1;                        // the rear axle when the tail reaches the black line: the rear bumper is TAIL (0.9 m) further, at x 7.0

// ---------- small maths ----------
const sstep = (u: number) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
/** A pose of the REAR AXLE: yaw is the model's rotation.y (the nose points along (cos yaw, -sin yaw)). */
type Pose = { x: number; z: number; yaw: number };
const nose = (yaw: number): [number, number] => [Math.cos(yaw), -Math.sin(yaw)];
const left = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];   // the car's left hand
/** Advance a pose by distance D along the nose (dir +1) or against it (dir -1) with the wheel at angle steer: the exact circular arc. */
function arc(p: Pose, dir: 1 | -1, D: number, steer: number): Pose {
  const w = dir * Math.tan(steer) / WB;                   // yaw change per metre travelled (reversing with the wheel left turns the heading right)
  if (Math.abs(w) < 1e-9) return { x: p.x + dir * Math.cos(p.yaw) * D, z: p.z - dir * Math.sin(p.yaw) * D, yaw: p.yaw };
  const y2 = p.yaw + w * D;
  return { x: p.x + dir * (Math.sin(y2) - Math.sin(p.yaw)) / w, z: p.z + dir * (Math.cos(y2) - Math.cos(p.yaw)) / w, yaw: y2 };
}
const mirror = (p: Pose, side: 1 | -1): [number, number] => { const n = nose(p.yaw), l = left(p.yaw); return [p.x + MIRROR_F * n[0] + side * MIRROR_W * l[0], p.z + MIRROR_F * n[1] + side * MIRROR_W * l[1]]; };

// ---------- samples ----------
type Sample = { x: number; z: number; yaw: number; steer: number; v: number; a: number; lat: number; left: boolean; right: boolean; rev: boolean; st: number };
type Setup = { blueX: number; blackX: number; phi: number; phi2: number; s2: number; startRA: number; endCentre: [number, number]; setupZ: number; clearance: number };
type BayInfo = { lineX: number; z0: number; s1: number; s3: number; xB: number; endCentre: [number, number]; box: { d: number; r: number; a1: number; s: number; gap: number } | null };
type Plan = { s: Sample[]; T: number; marks: Partial<Record<ParkState, number>>; ends: Partial<Record<ParkState, number>>; end: Pose; setup: Setup | null; bay: BayInfo | null };
const FPS = 60, DT = 1 / FPS;

type Leg = { N: number; ds: number; px: Float64Array; pz: Float64Array; yaw: Float64Array; steer: Float64Array; dir: 1 | -1; vs: Float64Array; tm: Float64Array; T: number };

/** The speed along a leg: grip in corners, the engine from rest, the brakes to rest, then eased so nothing lurches. */
function profile(N: number, ds: number, kap: Float64Array | null, vMax: number, aAcc: number, aDec: number, aLat: number) {
  const v0 = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) { const kk = kap ? Math.abs(kap[k]!) : 0; v0[k] = kk > 1e-6 ? Math.min(vMax, Math.sqrt(aLat / kk)) : vMax; }
  v0[0] = 0; for (let k = 1; k <= N; k++) v0[k] = Math.min(v0[k]!, Math.sqrt(v0[k - 1]! ** 2 + 2 * aAcc * ds));
  v0[N] = 0; for (let k = N - 1; k >= 0; k--) v0[k] = Math.min(v0[k]!, Math.sqrt(v0[k + 1]! ** 2 + 2 * aDec * ds));
  const vs = new Float64Array(N + 1), cv = new Float64Array(N + 2), M = Math.max(1, Math.round(vMax * .42 / ds));
  for (let k = 0; k <= N; k++) cv[k + 1] = cv[k]! + v0[k]!;
  for (let k = 0; k <= N; k++) { const w = Math.min(M, k, N - k); vs[k] = (cv[k + w + 1]! - cv[k - w]!) / (2 * w + 1); }
  const tm = new Float64Array(N + 1);
  for (let k = 1; k <= N; k++) tm[k] = tm[k - 1]! + 2 * ds / Math.max(1e-4, vs[k - 1]! + vs[k]!);
  return { vs, tm, T: tm[N]! };
}
/** Distance travelled at time tau: a cubic between grid points matching both distance and speed, so the motion is smooth at any frame rate. */
function sOf(L: Leg, tau: number) {
  const { tm, vs, N, ds } = L; if (tau <= 0) return 0; if (tau >= L.T) return N * ds;
  let lo = 0, hi = N; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tm[mid]! <= tau) lo = mid; else hi = mid; }
  const h = tm[hi]! - tm[lo]!, u = (tau - tm[lo]!) / (h || 1), u2 = u * u, u3 = u2 * u;
  const sd = (2 * u3 - 3 * u2 + 1) * lo * ds + (u3 - 2 * u2 + u) * h * vs[lo]! + (-2 * u3 + 3 * u2) * hi * ds + (u3 - u2) * h * vs[hi]!;
  return Math.max(lo * ds, Math.min(hi * ds, sd));
}

/** A reverse (or forward) move by kinematics: the wheel angle may change with distance, and the heading and position follow from it. */
function kinLeg(start: Pose, dir: 1 | -1, D: number, steerAt: (s: number) => number, vMax: number, aAcc: number, aDec: number): Leg {
  const N = Math.max(2, Math.ceil(D / .02)), ds = D / N, px = new Float64Array(N + 1), pz = new Float64Array(N + 1), yaw = new Float64Array(N + 1), steer = new Float64Array(N + 1), kap = new Float64Array(N + 1);
  let p = start; px[0] = p.x; pz[0] = p.z; yaw[0] = p.yaw; steer[0] = steerAt(0);
  for (let k = 1; k <= N; k++) { const d = steerAt((k - .5) * ds); p = arc(p, dir, ds, d); px[k] = p.x; pz[k] = p.z; yaw[k] = p.yaw; steer[k] = steerAt(k * ds); }
  for (let k = 0; k <= N; k++) kap[k] = Math.tan(steer[k]!) / WB;
  const pr = profile(N, ds, kap, vMax, aAcc, aDec, 99);
  return { N, ds, px, pz, yaw, steer, dir, ...pr };
}

/** A forward drive along a route of straights and arcs (of the rear axle), eased so the car steers into and out of every turn progressively. */
type Op = { k: 'S'; len: number; dz?: number } | { k: 'T'; side: 1 | -1; r: number; deg?: number };
function pathLeg(start: Pose, ops: Op[], vMax: number, aAcc: number, aDec: number, aLat: number, EASE = 1.4): Leg {
  const DS = .02, raw: [number, number][] = [[start.x, start.z]];
  let x = start.x, z = start.z, yw = start.yaw;
  for (const o of ops) {
    if (o.k === 'S') {
      const n = Math.max(1, Math.round(o.len / DS)), [hx, hz] = nose(yw), z0 = z;
      for (let i = 1; i <= n; i++) { const f = i / n; raw.push([x + hx * o.len * f, z0 + hz * o.len * f + (o.dz ?? 0) * sstep(f)]); }
      x += hx * o.len; z += hz * o.len + (o.dz ?? 0);
    } else {
      // a turn of radius r (of the rear axle): the wheel angle that holds it is atan(wheelbase / r), positive to the left
      const a = (o.deg ?? 90) * Math.PI / 180, n = Math.max(2, Math.ceil(o.r * a / DS)), d = Math.atan(WB / o.r) * o.side, from: Pose = { x, z, yaw: yw };
      for (let i = 1; i <= n; i++) { const q = arc(from, 1, o.r * a * i / n, d); raw.push([q.x, q.z]); }
      const q = arc(from, 1, o.r * a, d); x = q.x; z = q.z; yw = from.yaw + o.side * a;
    }
  }
  // arc-length grid, carried on straight before and after the ends so the easing is exact there
  const rc = [0]; for (let i = 1; i < raw.length; i++) rc.push(rc[i - 1]! + Math.hypot(raw[i]![0] - raw[i - 1]![0], raw[i]![1] - raw[i - 1]![1]));
  const len = rc[rc.length - 1]!, N = Math.round(len / DS), ds = len / N, [h0x, h0z] = nose(start.yaw), [h1x, h1z] = nose(yw);
  const at = (sd: number): [number, number] => {
    if (sd <= 0) return [raw[0]![0] + h0x * sd, raw[0]![1] + h0z * sd];
    if (sd >= len) { const e = raw[raw.length - 1]!; return [e[0] + h1x * (sd - len), e[1] + h1z * (sd - len)]; }
    let lo = 0, hi = rc.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rc[mid]! <= sd) lo = mid; else hi = mid; }
    const f = (sd - rc[lo]!) / ((rc[hi]! - rc[lo]!) || 1); return [raw[lo]![0] + (raw[hi]![0] - raw[lo]![0]) * f, raw[lo]![1] + (raw[hi]![1] - raw[lo]![1]) * f];
  };
  const K = Math.round(EASE / ds), G0 = -2 * K, G = N + 4 * K + 1, gx = new Float64Array(G), gz = new Float64Array(G);
  for (let g = 0; g < G; g++) { const p = at((g + G0) * ds); gx[g] = p[0]; gz[g] = p[1]; }
  const cx = new Float64Array(G + 1), cz = new Float64Array(G + 1);
  for (let g = 0; g < G; g++) { cx[g + 1] = cx[g]! + gx[g]!; cz[g + 1] = cz[g]! + gz[g]!; }
  const px = new Float64Array(N + 1), pz = new Float64Array(N + 1), yaw = new Float64Array(N + 1), steer = new Float64Array(N + 1), kap = new Float64Array(N + 1);
  let prev = start.yaw;
  for (let k = 0; k <= N; k++) {
    const g = k - G0, a = g - K, b = g + K, n = b - a + 1;
    px[k] = (cx[b + 1]! - cx[a]!) / n; pz[k] = (cz[b + 1]! - cz[a]!) / n;
    let y = Math.atan2(-(gz[b]! - gz[a]!), gx[b]! - gx[a]!); while (y - prev > Math.PI) y -= 2 * Math.PI; while (y - prev < -Math.PI) y += 2 * Math.PI;
    yaw[k] = y; prev = y;
  }
  const W = Math.max(2, Math.round(.12 / ds));   // curvature from the heading change over about a quarter metre
  for (let k = 0; k <= N; k++) { const a = Math.max(0, k - W), b = Math.min(N, k + W); kap[k] = b > a ? (yaw[b]! - yaw[a]!) / ((b - a) * ds) : 0; steer[k] = Math.atan(WB * kap[k]!) * sstep(Math.min(k, N - k) * ds / .6); }
  const pr = profile(N, ds, kap, vMax, aAcc, aDec, aLat);
  return { N, ds, px, pz, yaw, steer, dir: 1, ...pr };
}

// ---------- the recorder: a sequence of holds and legs, written out at 60 samples a second ----------
class Rec {
  s: Sample[] = []; t = 0; p: Pose; steer = 0; left = false; right = false; rev = false; st = 0;
  marks: Partial<Record<ParkState, number>> = {}; ends: Partial<Record<ParkState, number>> = {};
  constructor(start: Pose) { this.p = { ...start }; }
  private mark(name: ParkState) { if (this.marks[name] === undefined) this.marks[name] = this.t; this.st = STATE_LIST.indexOf(name); }
  private emit(v: number, a: number, lat: number) { this.s.push({ x: this.p.x, z: this.p.z, yaw: this.p.yaw, steer: this.steer, v, a, lat, left: this.left, right: this.right, rev: this.rev, st: this.st }); this.t = this.s.length * DT; }
  /** Stand still for dur seconds. */
  hold(name: ParkState, dur: number) { this.mark(name); const n = Math.max(1, Math.round(dur * FPS)); for (let i = 0; i < n; i++) this.emit(0, 0, 0); this.ends[name] = this.t; }
  /** Stand still while the wheel is turned to angle `to`, smoothly (it eases in and out), at least minDur seconds. */
  steerTo(name: ParkState, to: number, minDur = .5) {
    this.mark(name); const from = this.steer, dur = Math.max(minDur, Math.abs(to - from) / STEER_RATE * 1.5), n = Math.round(dur * FPS);
    for (let i = 1; i <= n; i++) { this.steer = from + (to - from) * sstep(i / n); this.emit(0, 0, 0); }
    this.steer = to; this.ends[name] = this.t;
  }
  /** Drive a leg from rest to rest. sig gives the signals along it by distance. */
  run(name: ParkState, L: Leg, sig?: (s: number) => { left: boolean; right: boolean }) {
    this.mark(name); this.rev = L.dir < 0;
    const n = Math.ceil(L.T * FPS); let vPrev = 0;
    for (let i = 1; i <= n; i++) {
      const tau = Math.min(L.T, i * DT), sd = sOf(L, tau), kf = Math.min(L.N - 1, Math.floor(sd / L.ds)), f = sd / L.ds - kf;
      const x = L.px[kf]! + (L.px[kf + 1]! - L.px[kf]!) * f, z = L.pz[kf]! + (L.pz[kf + 1]! - L.pz[kf]!) * f, yaw = L.yaw[kf]! + (L.yaw[kf + 1]! - L.yaw[kf]!) * f, steer = L.steer[kf]! + (L.steer[kf + 1]! - L.steer[kf]!) * f;
      this.p = { x, z, yaw }; this.steer = steer;
      const sp = Math.abs(L.vs[kf]! + (L.vs[kf + 1]! - L.vs[kf]!) * f);
      const g = sig?.(sd); if (g) { this.left = g.left; this.right = g.right; }
      const a = (sp - vPrev) / DT; vPrev = sp;
      this.emit(L.dir * sp, a * L.dir, sp * sp * Math.tan(steer) / WB);
    }
    // leave exactly the end of the leg
    this.p = { x: L.px[L.N]!, z: L.pz[L.N]!, yaw: L.yaw[L.N]! }; this.steer = L.steer[L.N]!;
    this.ends[name] = this.t; this.rev = false;
  }
}

// ---------- planning ----------
/** The exit: the signal comes on first, then the car backs out of its stall and swings so it can drive off east along the aisle. */
function exitLeg(st: Stall) {
  const rowA = st.z < 0, yaw0 = rowA ? Math.PI / 2 : -Math.PI / 2;               // row A stands nose north, row B nose south
  const [nx, nz] = nose(yaw0);
  const start: Pose = { x: st.x - nx * RA, z: st.z - nz * RA, yaw: yaw0 };       // the rear axle
  // the wheel to turn: reversing, the heading turns toward the east when the wheel is left for row A, right for row B
  const sgn = rowA ? 1 : -1, delta = sgn * 33 * Math.PI / 180, straight = .4, ramp = 1.0;
  const steerAt = (s: number) => (s < straight ? 0 : delta * sstep((s - straight) / ramp));
  // find the distance at which the heading reaches east (yaw 0): the wheel is left for row A (yaw falls from +90), right for row B (yaw rises from -90)
  const sim = (D: number) => { let p = start; const n = Math.ceil(D / .005); for (let k = 0; k < n; k++) p = arc(p, -1, D / n, steerAt((k + .5) * D / n)); return p; };
  const reached = (D: number) => { const y = sim(D).yaw; return rowA ? y <= 0 : y >= 0; };
  let lo = straight, hi = straight + 14; for (let i = 0; i < 48; i++) { const mid = (lo + hi) / 2; if (reached(mid)) hi = mid; else lo = mid; }
  const D = (lo + hi) / 2;
  const leg = kinLeg(start, -1, D, steerAt, 1.9, .6, 1.0);
  return { leg, side: sgn > 0 ? 'left' as const : 'right' as const, start };
}

/** From the stall to a full stop at the white stop line of the back lot: the signal, the reverse out, the drive round, in the right-hand lane all the way. */
function planFront(st: Stall) {
  const ex = exitLeg(st), rec = new Rec(ex.start), sideL = ex.side === 'left';
  // 1. the signal, before the car moves at all
  if (sideL) rec.left = true; else rec.right = true;
  rec.hold('EXIT_SIGNAL', 2.1);
  rec.rev = true; rec.hold('EXIT_SHIFT_R', .9);
  rec.run('EXIT_REVERSE', ex.leg);
  rec.rev = true; rec.steerTo('EXIT_STRAIGHTEN', 0, .9);
  rec.left = false; rec.right = false; rec.rev = false; rec.hold('EXIT_SHIFT_D', .8);
  // 2. forward: east along the aisle in its right-hand (south) half, left up the east road into its right-hand (east) half, left into the back lot, stop at the white line
  const p0 = rec.p, toLane = LANE_E - p0.z;   // the rear axle is on this z now, the eastbound lane is here: drift across it smoothly
  const GAP = Math.min(22, (LANE_N - TURN_N - p0.x) * .8);                              // the distance over which the drift happens
  const xTurn = LANE_N - TURN_N;
  const zTurn = LANE_Z + TURN_W;               // the left turn into the back lot starts when the rear axle is this far from the lane (it is heading north)
  const lenAisle = xTurn - p0.x, lenNorth = (LANE_E - TURN_N) - zTurn;
  const stopRA = NOSE_STOP_X + NOSE, lenWest = (LANE_N - TURN_W) - stopRA;
  const ops: Op[] = [{ k: 'S', len: GAP, dz: toLane }, { k: 'S', len: lenAisle - GAP }, { k: 'T', side: 1, r: TURN_N }, { k: 'S', len: lenNorth }, { k: 'T', side: 1, r: TURN_W }, { k: 'S', len: lenWest }];
  const fwd = pathLeg(p0, ops, 5.4, 1.5, 2.1, 2.0);
  // left blinker for each left turn: on 9 m before it, off 1.5 m after
  const lenTurn1 = TURN_N * Math.PI / 2, lenTurn2 = TURN_W * Math.PI / 2, s1 = lenAisle, sB = lenAisle + lenTurn1 + lenNorth;
  rec.run('DRIVE_TO_REAR_LOT', fwd, s => ({ left: (s > s1 - 9 && s < s1 + lenTurn1 + 1.5) || (s > sB - 9 && s < sB + lenTurn2 + 1.5), right: false }));
  rec.left = false; rec.hold('STOP_AT_ENTRY_LINE', 1.9);
  return rec;
}

let SOLVED: ReturnType<typeof solveMane> | null = null;
const solved = () => (SOLVED ??= solveMane());

/** The parallel park: from the stop line, up to the second white line, then the two reverse arcs. The right signal is on from the setup to the end. The left one is never used here. */
function planParallel(st: Stall): Plan {
  const rec = planFront(st), solved1 = solved();
  // 3. pull forward, drifting to the kerb side of the lane, until the nose is on the second white line
  const p1 = rec.p, setupRA = LINE2_X + NOSE, drift = solved1.setupZ - p1.z, lenPull = p1.x - setupRA;
  const pull = pathLeg(p1, [{ k: 'S', len: 11, dz: drift }, { k: 'S', len: lenPull - 11 }], 4.2, 1.3, 1.7, 2);
  rec.run('PULL_FORWARD_TO_SETUP', pull);
  rec.hold('PULL_FORWARD_TO_SETUP', .6);
  // 4. the parallel park. The numbers (the two arc angles) are solved so the car ends in the middle of the box.
  const R = R_MIN;
  rec.right = true; rec.hold('SIGNAL_RIGHT', 1.6);
  rec.rev = true; rec.hold('SHIFT_TO_REVERSE', 1.0);
  const backStraight = Math.max(.05, solved1.startRA - rec.p.x);
  rec.run('REVERSE_STRAIGHT_1', kinLeg(rec.p, -1, backStraight, () => 0, 1.1, .45, .8));
  rec.rev = false; rec.hold('STOP_AT_BLACK_LINE', 1.0);
  rec.rev = true; rec.steerTo('STEER_FULL_RIGHT', -DMAX, 1.4);
  rec.run('REVERSE_FULL_RIGHT', kinLeg(rec.p, -1, R * solved1.phi1, () => -DMAX, .85, .4, .7));
  rec.rev = false; rec.hold('REVERSE_FULL_RIGHT', .9);
  rec.rev = true; rec.steerTo('STRAIGHTEN_1', 0, 1.2);
  rec.run('REVERSE_STRAIGHT_2', kinLeg(rec.p, -1, solved1.s2, () => 0, .9, .4, .7));
  rec.rev = false; rec.hold('REVERSE_STRAIGHT_2', 1.0);
  rec.rev = true; rec.steerTo('STEER_FULL_LEFT', DMAX, 1.4);          // the wheel goes left; the signal stays on the right, the side the car is parking on
  rec.run('REVERSE_FULL_LEFT', kinLeg(rec.p, -1, R * solved1.phi2, () => DMAX, .85, .4, .7));
  rec.rev = false; rec.hold('REVERSE_FULL_LEFT', .9);
  // 5. final alignment, the way an examiner expects it in a box this size (1.5 car lengths): the car is nearly parallel, so it rolls forward a
  //    little with the wheel to the right, which squares it up and centres it, then the wheels are straightened and it is parked
  rec.hold('FINAL_ALIGNMENT', .8);
  rec.steerTo('FINAL_ALIGNMENT', -DMAX, 1.4);
  rec.run('FINAL_ALIGNMENT', kinLeg(rec.p, 1, R * (solved1.phi1 - solved1.phi2), () => -DMAX, .7, .35, .6));
  rec.hold('FINAL_ALIGNMENT', .8);
  rec.steerTo('FINAL_ALIGNMENT', 0, 1.2);
  rec.left = false; rec.right = false; rec.hold('PARKED', 3);
  return { s: rec.s, T: rec.t, marks: rec.marks, ends: rec.ends, end: rec.p, setup: { blueX: BLUE_X, blackX: solved1.startRA + TAIL, phi: solved1.phi1, phi2: solved1.phi2, s2: solved1.s2, startRA: solved1.startRA, endCentre: solved1.end, setupZ: solved1.setupZ, clearance: solved1.clearance }, bay: null };
}

const BAY_REAR_GAP = 1.0;                    // the rear bumper stops this far from the closed end's line
/**
 * The reverse into the bay, from rest with the nose at the second white line and the car on the lane (heading west). The right signal first, then reverse:
 * straight back, the wheel hard right (stopped) and a quarter circle that points the car down the bay, the wheel straight, straight back to the closed end.
 */
function bayReverse(rec: Rec) {
  const R = R_MIN, p = rec.p, xB = (BAY.xW + BAY.xE) / 2, s1 = xB - R - p.x;
  const zAxleEnd = BAY.zEnd + BAY_REAR_GAP + TAIL, s3 = (p.z - R) - zAxleEnd;
  rec.right = true; rec.hold('BAY_SIGNAL_RIGHT', 1.6);
  rec.rev = true; rec.hold('BAY_SHIFT_R', 1.0);
  rec.run('BAY_REVERSE_1', kinLeg(rec.p, -1, s1, () => 0, 1.0, .45, .8));
  rec.rev = false; rec.hold('BAY_STOP_1', 1.0);
  rec.rev = true; rec.steerTo('BAY_STEER_RIGHT', -DMAX, 1.4);
  rec.run('BAY_REVERSE_ARC', kinLeg(rec.p, -1, R * Math.PI / 2, () => -DMAX, .85, .4, .7));
  rec.rev = false; rec.hold('BAY_REVERSE_ARC', .9);
  rec.rev = true; rec.steerTo('BAY_STRAIGHTEN', 0, 1.2);
  rec.run('BAY_REVERSE_2', kinLeg(rec.p, -1, s3, () => 0, 1.0, .45, .8));
  rec.rev = false; rec.hold('BAY_REVERSE_2', 1.0);
  rec.left = false; rec.right = false; rec.hold('BAY_PARKED', 3);
  return { s1, s3, xB, z0: p.z };
}
const bayEndCentre = (rec: Rec): [number, number] => [rec.p.x + RA * Math.cos(rec.p.yaw), rec.p.z - RA * Math.sin(rec.p.yaw)];

/** The bay, from the stall: the same drive round to the stop line, then straight on to the second white line, then the reverse. */
function planBayFront(st: Stall): Plan {
  const rec = planFront(st), p1 = rec.p;
  rec.run('DRIVE_TO_BAY_LINE', pathLeg(p1, [{ k: 'S', len: p1.x - (LINE2_X + NOSE), dz: LANE_Z - p1.z }], 4.2, 1.3, 1.7, 2));
  rec.hold('STOP_AT_BAY_LINE', 1.4);
  const b = bayReverse(rec);
  return { s: rec.s, T: rec.t, marks: rec.marks, ends: rec.ends, end: rec.p, setup: null, bay: { lineX: BAY_LINE.x, z0: b.z0, s1: b.s1, s3: b.s3, xB: b.xB, endCentre: bayEndCentre(rec), box: null } };
}

/** The distance from the car's body (4.6 x 2.15 m) to the nearest cone, edge to edge, with the rear axle at p. */
const coneGapAt = (p: Pose): number => {
  const cx = p.x + RA * Math.cos(p.yaw), cz = p.z - RA * Math.sin(p.yaw), cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
  let m = 9; for (const [px, pz] of BL_CONES) { const dx = px - cx, dz = pz - cz, a = dx * cs - dz * sn, b = -dx * sn - dz * cs, g = Math.hypot(Math.max(Math.abs(a) - 2.3, 0), Math.max(Math.abs(b) - 1.075, 0)) - CONE_R; if (g < m) m = g; }
  return m;
};
/**
 * Backing out of the box: a short reverse with the wheel hard right (the tail comes back a little toward the kerb, the nose swings toward the lane), then forward:
 * a left arc out of the box, a straight, a right arc that points the car west again on the lane. Searched so the whole move keeps well clear of every cone.
 */
function solveBoxExit(start: Pose) {
  const R = R_MIN, x2 = LINE2_X + NOSE;
  let best: { d: number; r: number; a1: number; s: number; gap: number; ops: Op[]; sOff: number } | null = null;
  // (a wider search showed the best answer is always about here: the tail cones limit how far it can back up, the cone ahead how soon it must swing out)
  for (const d of [.9, 1.0, 1.1, 1.2]) for (const r of [4.2, 4.4, 5.0, 6.0]) for (let deg = 30; deg <= 55; deg += 2.5) {
    const a1 = deg * Math.PI / 180, th = d / R + a1, p1 = arc(start, -1, d, -DMAX), dl = Math.atan(WB / r);
    const q = arc(p1, 1, r * a1, dl), q2 = arc(q, 1, r * th, -dl), s = (LANE_Z - q2.z) / Math.sin(th);
    if (!(s >= .3)) continue;
    const xEnd = q2.x + s * Math.cos(p1.yaw + a1), lenEnd = xEnd - x2;
    if (lenEnd < 2.6) continue;
    const ops: Op[] = [{ k: 'T', side: 1, r, deg }, { k: 'S', len: s }, { k: 'T', side: -1, r, deg: th * 180 / Math.PI }, { k: 'S', len: lenEnd }];
    const leg = pathLeg(p1, ops, 3.6, 1.2, 1.6, 1.8);
    let gap = 9;
    for (let k = 0; k <= Math.round(d / .05); k++) gap = Math.min(gap, coneGapAt(arc(start, -1, Math.min(d, k * .05), -DMAX)));
    for (let k = 0; k <= leg.N; k += 5) gap = Math.min(gap, coneGapAt({ x: leg.px[k]!, z: leg.pz[k]!, yaw: leg.yaw[k]! }));
    if (Math.abs(leg.pz[leg.N]! - LANE_Z) > .05) continue;
    if (!best || gap > best.gap + .02 || (Math.abs(gap - best.gap) <= .02 && s < best.s)) best = { d, r, a1, s, gap, ops, sOff: r * a1 + s + r * th + 1.0 };
  }
  if (!best) throw new Error('no way out of the box');
  return best;
}

/** The bay, from the parallel box (where the first drive left the car): back out, signal left, drive to the second white line, then the same reverse. */
function planBayBox(): Plan {
  const start = planFor('parallel').end;        // the car stands in the box: the rear axle is here
  const rec = new Rec(start), ex = solveBoxExit(start);
  // 1. the signal for the side the tail swings to (right: toward the kerb), before the car moves, then a short, slow reverse with the wheel hard right
  rec.right = true; rec.hold('BOX_SIGNAL_R', 1.8);
  rec.rev = true; rec.hold('BOX_SHIFT_R', .9);
  rec.steerTo('BOX_STEER_R', -DMAX, 1.0);
  rec.run('BOX_REVERSE', kinLeg(rec.p, -1, ex.d, () => -DMAX, .8, .4, .7));
  rec.rev = false; rec.hold('BOX_STOP', .9);
  // 2. the left signal, then straight the wheel and forward out of the box into the lane, and on west to the second white line
  rec.right = false; rec.left = true; rec.hold('BOX_SIGNAL_L', 1.6);
  rec.steerTo('BOX_STEER_0', 0, 1.0);
  rec.hold('BOX_SHIFT_D', .8);
  rec.run('BOX_PULL_OUT', pathLeg(rec.p, ex.ops, 3.6, 1.2, 1.6, 1.8), s => ({ left: s < ex.sOff, right: false }));
  rec.left = false; rec.hold('STOP_AT_BAY_LINE', 1.4);
  const b = bayReverse(rec);
  return { s: rec.s, T: rec.t, marks: rec.marks, ends: rec.ends, end: rec.p, setup: null, bay: { lineX: BAY_LINE.x, z0: b.z0, s1: b.s1, s3: b.s3, xB: b.xB, endCentre: bayEndCentre(rec), box: { d: ex.d, r: ex.r, a1: ex.a1, s: ex.s, gap: ex.gap } } };
}

/**
 * Solve the back-up. The car stands at the setup (nose on the blue line, its rear axle on z = SETUP_Z). It reverses straight to a rear-axle x
 * of BLACK_RA (the tail reaches the black line), turns the wheel hard right and backs up through the angle phi1, straightens and backs up until
 * its right mirror is abeam of the near cone, then hard left through the angle phi2 (a little less than phi1, so the car is nearly parallel),
 * and finally rolls forward with the wheel hard right through phi1 - phi2 to square up. phi1 and phi2 are found so the centre of the car ends
 * exactly in the middle of the box and parallel. (This keeps every cone clear: it is the only way a 4.5 m car fits a 1.5-length box.)
 */
function solveMane() {
  const R = R_MIN, trace: Pose[] = [];
  let z0 = SETUP_Z, X = BLACK_RA;
  const run = (phi1: number, phi2: number, rec = false) => {
    if (rec) trace.length = 0;
    const go = (p: Pose, dir: 1 | -1, D: number, st: number) => { if (rec) { const n = Math.max(1, Math.ceil(D / .06)); for (let i = 1; i <= n; i++) trace.push(arc(p, dir, D * i / n, st)); } return arc(p, dir, D, st); };
    let p: Pose = { x: X, z: z0, yaw: Math.PI };
    if (rec) trace.push(p);
    p = go(p, -1, R * phi1, -DMAX);
    // straight until the right mirror is abeam of the near cone: the cone's position along the nose equals the mirror's
    const fAt = (q: Pose) => { const m = mirror(q, -1), n = nose(q.yaw); return (CONE_NEAR[0] - m[0]) * n[0] + (CONE_NEAR[1] - m[1]) * n[1]; };
    let s2 = 0; while (fAt(arc(p, -1, s2, 0)) < 0 && s2 < 6) s2 += .002;
    s2 = Math.max(s2, .2);
    p = go(p, -1, s2, 0);
    p = go(p, -1, R * phi2, DMAX);
    p = go(p, 1, R * (phi1 - phi2), -DMAX);
    return { p, s2 };
  };
  const cx = (p: Pose) => p.x + RA * nose(p.yaw)[0], cz = (p: Pose) => p.z + RA * nose(p.yaw)[1];
  /** the closest the car's body (4.6 x 2.15 m) comes to any cone along the whole manoeuvre, edge to edge */
  const gap = () => {
    let m = 9;
    for (const q of trace) { const c = { x: cx(q), z: cz(q), yaw: q.yaw }, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
      for (const [px, pz] of BL_CONES) { const dx = px - c.x, dz = pz - c.z, a = dx * cs - dz * sn, b = -dx * sn - dz * cs; const g = Math.hypot(Math.max(Math.abs(a) - 2.3, 0), Math.max(Math.abs(b) - 1.075, 0)) - CONE_R; if (g < m) m = g; } }
    return m;
  };
  // the car's centre is aimed near the middle of the box; if the first answer brushes a cone it is aimed a little further west (the long side has the room),
  // and the setup is moved a little off the kerb, until the whole manoeuvre clears every cone by 12 cm
  type Sol = { phi1: number; phi2: number; s2: number; end: [number, number]; mc: number; z: number; X: number };
  let best: Sol | null = null;
  outer: for (let shift = 0; shift <= 1.6; shift += .1) for (const xx of [6.1, 5.8, 5.4]) for (const zz of [-42.2, -41.9, -41.6, -41.3, -41.0]) {
    z0 = zz; X = xx;
    let phi1 = .85, phi2 = .6;
    for (let it = 0; it < 80; it++) {
      const r = run(phi1, phi2), fx = cx(r.p) - (BOX_CX - shift), fz = cz(r.p) - BOX_CZ;
      if (Math.abs(fx) < 1e-6 && Math.abs(fz) < 1e-6) break;
      const e = 1e-4, a = run(phi1 + e, phi2), b = run(phi1, phi2 + e);
      const j11 = (cx(a.p) - cx(r.p)) / e, j12 = (cx(b.p) - cx(r.p)) / e, j21 = (cz(a.p) - cz(r.p)) / e, j22 = (cz(b.p) - cz(r.p)) / e, det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-9) break;
      phi1 -= .6 * (j22 * fx - j12 * fz) / det; phi2 -= .6 * (-j21 * fx + j11 * fz) / det;
      phi1 = Math.min(1.3, Math.max(.4, phi1)); phi2 = Math.min(phi1 - .03, Math.max(.1, phi2));
    }
    const fin = run(phi1, phi2, true), mc = gap();
    if (Math.hypot(cx(fin.p) - (BOX_CX - shift), cz(fin.p) - BOX_CZ) < 1e-3 && (!best || mc > best.mc)) best = { phi1, phi2, s2: fin.s2, end: [cx(fin.p), cz(fin.p)], mc, z: zz, X: xx };
    if (best && best.mc >= .12) break outer;
  }
  return { phi1: best!.phi1, phi2: best!.phi2, startRA: best!.X, s2: best!.s2, end: best!.end, clearance: best!.mc, setupZ: best!.z };
}

// ---------- the plan for this page's car ----------
let STALL_USED: Stall = STALLS[CAST], MODE: ParkMode = 'parallel';
const PLANS: Partial<Record<ParkMode, Plan>> = {};
function planFor(m: ParkMode): Plan { return (PLANS[m] ??= m === 'parallel' ? planParallel(STALL_USED) : m === 'bayFront' ? planBayFront(STALL_USED) : planBayBox()); }
const plan = () => planFor(MODE);
/** Use a different stall (tests; the page uses its own car's stall). */
export function setParkStall(st: Stall) { STALL_USED = st; for (const k of Object.keys(PLANS)) delete PLANS[k as ParkMode]; }
/** Which drive the accessors below describe (tests; the page sets it when a drive starts). */
export function setParkMode(m: ParkMode) { MODE = m; }
export const parkMode = () => MODE;
export function parkTotal() { return plan().T; }
export function parkMarks() { return plan().marks; }
export function parkEnds() { return plan().ends; }
export function parkSetup() { return plan().setup!; }
export function parkBay() { return plan().bay!; }
export const PARK_STATES = STATE_LIST;
export const PARK_GEOM = { LANE_Z, LANE_E, LANE_N, NOSE_STOP_X, BLUE_X, LINE2_X, SETUP_Z, BOX_CX, BOX_CZ, R_MIN, CONE_NEAR, BAY_REAR_GAP };

export type ParkCar = { x: number; y: number; z: number; yaw: number; steer: number; speed: number; accel: number; lat: number; left: boolean; right: boolean; reversing: boolean; state: ParkState; moving: boolean; t: number };
const OUT: ParkCar = { x: 0, y: .002, z: 0, yaw: 0, steer: 0, speed: 0, accel: 0, lat: 0, left: false, right: false, reversing: false, state: 'EXIT_SIGNAL', moving: false, t: 0 };
/** The car's pose (its centre, the model's origin) at time t of the drive. The object is reused: copy what you keep. */
export function parkCarAt(t: number, out: ParkCar = OUT): ParkCar {
  const P = plan(), S = P.s, f = Math.min(S.length - 1, Math.max(0, t * FPS)), i = Math.min(S.length - 2, Math.floor(f)), u = f - i, a = S[i]!, b = S[Math.min(S.length - 1, i + 1)]!;
  const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, yaw = a.yaw + (b.yaw - a.yaw) * u;
  out.x = x + RA * Math.cos(yaw); out.z = z - RA * Math.sin(yaw); out.yaw = yaw; out.y = .002;
  out.steer = a.steer + (b.steer - a.steer) * u; out.speed = a.v + (b.v - a.v) * u; out.accel = a.a + (b.a - a.a) * u; out.lat = a.lat + (b.lat - a.lat) * u;
  out.left = a.left; out.right = a.right; out.reversing = a.rev; out.state = STATE_LIST[a.st]!; out.moving = Math.abs(out.speed) > .02; out.t = t;
  return out;
}
/** The rear axle's pose at time t (what the planner steers), for tests. */
export function parkAxleAt(t: number) { const c = parkCarAt(t); return { x: c.x - RA * Math.cos(c.yaw), z: c.z + RA * Math.sin(c.yaw), yaw: c.yaw }; }

/** The clock of the demonstration: the rig advances it, the car reads it. `loc` is where the car stands between drives: its stall, the parallel box, the bay. */
export type ParkKind = 'parallel' | 'bay';
export const park = { phase: 'idle' as 'idle' | 'run' | 'done', t: 0, startedAt: 0, seq: 0, kind: 'parallel' as ParkKind, loc: 'front' as 'front' | 'box' | 'bay' };
/** Can this drive start now? The parallel park only from the stall; the bay from the stall or from the box. */
export function canStartPark(kind: ParkKind) { if (park.phase === 'run') return false; return kind === 'parallel' ? park.loc === 'front' : park.loc !== 'bay'; }
export function startPark(kind: ParkKind = 'parallel') {
  if (!canStartPark(kind)) return false;
  MODE = kind === 'parallel' ? 'parallel' : park.loc === 'front' ? 'bayFront' : 'bayBox';
  park.kind = kind; park.phase = 'run'; park.t = 0; park.seq++; return true;
}
/** The drive is over: the car stays where it parked. */
export function finishPark() { park.t = parkTotal(); park.phase = 'done'; park.loc = park.kind === 'parallel' ? 'box' : 'bay'; }
export const parkRunning = () => park.phase === 'run';
/** True while the car is rolling in the demonstration (for the shadow refresh and the pixel-ratio hold). */
export function parkMoving() { return park.phase === 'run' && parkCarAt(park.t).moving; }
export { mirror as parkMirror, nose as parkNose, left as parkLeft };
