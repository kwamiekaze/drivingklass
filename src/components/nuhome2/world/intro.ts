/*
 * The opening shot, written as one pure timeline so it can be tested without a browser.
 *
 *   0 s       the camera hangs high beside the avenue, as in the owner's reference recording, and watches the school car
 *             approach the stop sign; the right blinker is on before it gets there
 *   12.5 s    the car stops at the sign, blinker flashing. The camera has the stop sign, the car and, far behind them,
 *             the black DrivingKlass sign in one frame
 *   15.1 s    the car sets off. The camera tracks it from above through every turn and every blinker, right onto the
 *             street, left into the driveway, left into the aisle, right into the reserved stall, always with the lot
 *             and the signs in view
 *   ~35.7 s   only once the car is parked does the camera leave it: a smooth move to the black sign, up and forward to
 *             the OPEN / CLOSED sign on the door, back and down to the hours board, then all the way back
 *
 * Every number below was chosen so the camera never touches a thing; colliders.ts lists the solid objects and
 * scripts/check-intro.mjs walks the whole timeline against them.
 */
export type V3 = [number, number, number];
export type Pose = { p: V3; l: V3; fov: number };

export const T_STOP = 12.5, T_GAP = 2.6;
/** The moment the car sets off again from the stop sign. */
export const T_GO = T_STOP + T_GAP, T_PARK = T_GO;
/** The right blinker goes on this many seconds before the car arrives at the stop sign, and stays on through the wait and the turn. */
export const T_SIGNAL_LEAD = 3.5;
export const LANE_X = 2.05, STOP_Z = 39.5, START_Z = 62;
export const STALL: V3 = [0, 0, -6];

// ---------- monotone cubic interpolation: smooth, and it never overshoots a key, so the path stays where it was designed ----------
function pchip(ts: number[], vs: number[]) {
  const n = ts.length, h: number[] = [], d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = ts[i + 1]! - ts[i]!; d[i] = (vs[i + 1]! - vs[i]!) / (h[i] || 1); }
  if (n === 2) { m[0] = m[1] = d[0]!; }
  else {
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1]! * d[i]! <= 0) m[i] = 0;
      else { const w1 = 2 * h[i]! + h[i - 1]!, w2 = h[i]! + 2 * h[i - 1]!; m[i] = (w1 + w2) / (w1 / d[i - 1]! + w2 / d[i]!); }
    }
    const end = (h0: number, h1: number, d0: number, d1: number) => { let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (s * d0 <= 0) s = 0; else if (d0 * d1 <= 0 && Math.abs(s) > 3 * Math.abs(d0)) s = 3 * d0; return s; };
    m[0] = end(h[0]!, h[1]!, d[0]!, d[1]!); m[n - 1] = end(h[n - 2]!, h[n - 3]!, d[n - 2]!, d[n - 3]!);
  }
  return (t: number) => {
    if (t <= ts[0]!) return vs[0]!; if (t >= ts[n - 1]!) return vs[n - 1]!;
    let i = 0; while (t > ts[i + 1]!) i++;
    const x = (t - ts[i]!) / h[i]!, x2 = x * x, x3 = x2 * x;
    return (2 * x3 - 3 * x2 + 1) * vs[i]! + (x3 - 2 * x2 + x) * h[i]! * m[i]! + (-2 * x3 + 3 * x2) * vs[i + 1]! + (x3 - x2) * h[i]! * m[i + 1]!;
  };
}
const series = (keys: { t: number; p: V3; l: V3; fov: number }[]) => {
  const ts = keys.map(k => k.t);
  const f = (get: (k: typeof keys[number]) => number) => pchip(ts, keys.map(get));
  return { px: f(k => k.p[0]), py: f(k => k.p[1]), pz: f(k => k.p[2]), lx: f(k => k.l[0]), ly: f(k => k.l[1]), lz: f(k => k.l[2]), fov: f(k => k.fov) };
};

// ---------- the car ----------
const carZ1 = (t: number) => { const u = Math.min(1, t / T_STOP); return STOP_Z + (START_Z - STOP_Z) * (1 - u) * (1 - u); };   // eases to a standstill

/*
 * After the stop sign the car takes the owner's route, as drawn on the picture:
 *   1. up the avenue, a right turn onto the street into the right (south) lane, right blinker on
 *   2. east along the street to the lot's east driveway, a left turn up the driveway, left blinker on before the turn
 *   3. north up the driveway, a left turn west into the aisle in front of the building, left blinker on again
 *   4. west along the aisle, a right turn into the reserved stall, right blinker on before the turn
 * It slows for every corner and brakes to a stop in the stall. All lengths are in metres, x east, z south.
 */
const EAST_X = 31.7, STREET_Z = 28.3, AISLE_Z = -1.9, R1 = 4.5, R2 = 6, R3 = 3.2, R4 = 2.6;
const V_MAX = 11, A_ACC = 2.6, A_DEC = 3.2, A_LAT = 3.2;   // m/s, m/s2, m/s2 sideways
type Mark = 'r1s' | 'r1e' | 'l1s' | 'l1e' | 'l2s' | 'l2e' | 'r2s' | 'r2e';
function buildPath() {
  const pts: [number, number][] = [], kap: number[] = [], marks = {} as Record<Mark, number>;
  let x = LANE_X, z = STOP_Z, hx = 0, hz = -1, s = 0;
  const push = (px: number, pz: number, k: number) => { if (pts.length) s += Math.hypot(px - pts[pts.length - 1]![0], pz - pts[pts.length - 1]![1]); pts.push([px, pz]); kap.push(k); };
  const mark = (m: Mark) => { marks[m] = s; };
  const straight = (len: number) => { const n = Math.max(2, Math.round(len / .25)); for (let i = 1; i <= n; i++) push(x + hx * len * i / n, z + hz * len * i / n, 0); x += hx * len; z += hz * len; };
  /** side +1 turns right, -1 turns left, a quarter circle of radius r. x east, z south: right of (hx,hz) is (-hz,hx). */
  const turn = (side: 1 | -1, r: number) => {
    const px = side > 0 ? -hz : hz, pz = side > 0 ? hx : -hx;      // unit vector toward the centre
    const v0x = -px * r, v0z = -pz * r, cx = x - v0x, cz = z - v0z, n = Math.max(12, Math.round(r * 6));
    for (let i = 1; i <= n; i++) { const a = side * (Math.PI / 2) * i / n, c = Math.cos(a), sn = Math.sin(a); push(cx + v0x * c - v0z * sn, cz + v0x * sn + v0z * c, 1 / r); }
    const a = side * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
    x = cx + v0x * c - v0z * sn; z = cz + v0x * sn + v0z * c; const nx = hx * c - hz * sn, nz = hx * sn + hz * c; hx = Math.round(nx); hz = Math.round(nz);
  };
  push(x, z, 0);
  straight(STOP_Z - (STREET_Z + R1));
  mark('r1s'); turn(1, R1); mark('r1e');
  straight(EAST_X - R2 - x);
  mark('l1s'); turn(-1, R2); mark('l1e');
  straight(z - (AISLE_Z + R3));
  mark('l2s'); turn(-1, R3); mark('l2e');
  straight(x - R4);
  mark('r2s'); turn(1, R4); mark('r2e');
  straight(z - STALL[2]);
  // speed: as fast as the corners, the engine and the brakes allow, then time is the sum of ds / speed
  const n = pts.length, v = new Array<number>(n).fill(V_MAX), ds = (i: number) => Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  for (let i = 0; i < n; i++) if (kap[i]! > 0) v[i] = Math.min(V_MAX, Math.sqrt(A_LAT / kap[i]!));
  v[0] = .5; for (let i = 1; i < n; i++) v[i] = Math.min(v[i]!, Math.sqrt(v[i - 1]! ** 2 + 2 * A_ACC * ds(i)));
  v[n - 1] = .35; for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i]!, Math.sqrt(v[i + 1]! ** 2 + 2 * A_DEC * ds(i + 1)));
  const cum = [0], tm = [0];
  for (let i = 1; i < n; i++) { cum.push(cum[i - 1]! + ds(i)); tm.push(tm[i - 1]! + ds(i) / ((v[i]! + v[i - 1]!) / 2)); }
  return { pts, cum, tm, len: cum[n - 1]!, T: tm[n - 1]!, marks };
}
const PATH = buildPath();
/** How long the drive from the stop sign to the stall takes. */
export const T_DRIVE = PATH.T;
/** When the car comes to rest in the stall, and when the whole opening shot ends. */
export const T_PARKED = T_GO + PATH.T;
export const T_END = T_PARKED + 3.2 + 28.9;
const tAtS = (sd: number) => { const { cum, tm } = PATH; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid]! <= sd) lo = mid; else hi = mid; } const f = (sd - cum[lo]!) / ((cum[hi]! - cum[lo]!) || 1); return tm[lo]! + (tm[hi]! - tm[lo]!) * f; };
const atTime = (tau: number) => {
  const { pts, cum, tm } = PATH; tau = Math.max(0, Math.min(PATH.T, tau));
  let lo = 0, hi = tm.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tm[mid]! <= tau) lo = mid; else hi = mid; }
  const f = (tau - tm[lo]!) / ((tm[hi]! - tm[lo]!) || 1), a = pts[lo]!, b = pts[hi]!, a2 = pts[Math.max(0, lo - 3)]!, b2 = pts[Math.min(pts.length - 1, hi + 3)]!;
  const dx = b2[0] - a2[0], dz = b2[1] - a2[1];
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, yaw: Math.atan2(-dz, dx), s: cum[lo]! + (cum[hi]! - cum[lo]!) * f };
};
/** Which blinker is on at a distance s along the drive: on before each turn, off a little after it. */
function signalAt(s: number) {
  const M = PATH.marks, within = (a: number, b: number) => s >= a && s <= b;
  const right = within(0, M.r1e + 1.5) || within(M.r2s - 8, M.r2e + 1.2);
  const left = within(M.l1s - 9, M.l1e + 2) || within(M.l2s - 7, M.l2e + 1.5);
  return { left, right };
}
/** The height of the ground under the car: the east driveway is a raised apron, 13 cm above the lot. */
export function groundAt(x: number, z: number) {
  const dx = Math.abs(x - EAST_X), inLane = 1 - Math.min(1, Math.max(0, (dx - 2.4) / .5));
  const ramp = Math.min(1, Math.max(0, (z - 13.7) / .6)) * (1 - Math.min(1, Math.max(0, (z - 19.4) / .6)));
  return .002 + .13 * inLane * ramp;
}
/** Where the car is at time t. yaw is the model's rotation.y: pi/2 means nose toward the building. t3 is when it sets off from the stop sign. */
export function carAt(t: number, t3 = T_GO): { x: number; y: number; z: number; yaw: number; moving: boolean; left: boolean; right: boolean } {
  if (t < T_STOP) return { x: LANE_X, y: .002, z: carZ1(t), yaw: Math.PI / 2, moving: true, left: false, right: t >= T_STOP - T_SIGNAL_LEAD };
  if (t < t3) return { x: LANE_X, y: .002, z: STOP_Z, yaw: Math.PI / 2, moving: false, left: false, right: true };   // waiting at the sign to turn right
  const q = atTime(t - t3), sg = signalAt(q.s);
  return { x: q.x, y: groundAt(q.x, q.z), z: q.z, yaw: q.yaw, moving: t - t3 < PATH.T, left: sg.left, right: sg.right };
}

// ---------- the camera ----------
type Key = { t: number; p: V3; l: V3; fov: number };
const MON: V3 = [10.4, 1.9, 15.2];   // the black DrivingKlass sign
const ease3 = (u: number) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
function keysFor(narrow: boolean): Key[] {
  const f = (w: number, n: number) => (narrow ? n : w), fv = (w: V3, n: V3): V3 => (narrow ? n : w);
  const out: Key[] = [], fov = f(40, 56);
  // A. a high roadside post, a little before the stop sign: the car comes toward it and the camera pans to keep it in view
  const C0: V3 = fv([-7, 14, 64], [-8, 16, 70]);
  const drift = (t: number): V3 => [C0[0] + .12 * t, C0[1] + .06 * t, C0[2] + .1 * t];
  for (let t = 0; t <= T_STOP + 1e-6; t += .5) out.push({ t, p: drift(t), l: [LANE_X + 2.2 * (t / T_STOP), 3.2, carZ1(t) - 4 - 4 * (t / T_STOP)], fov });
  out.push({ t: T_GO, p: drift(T_GO), l: [LANE_X + 2.4, 3.2, STOP_Z - 8.4], fov });
  // B. tracking the drive from above. SW of the car through the first turns, then across to a south-east vantage that holds the
  //    whole lot, the black sign and the stall in one frame while the car crosses in front of the building
  const off1: V3 = fv([-9.5, 11.5, 17], [-11, 13, 20]), off2: V3 = fv([-13, 12.5, 14], [-14, 14.5, 17]);
  const M = PATH.marks, tl1e = T_GO + tAtS(M.l1e), tl2s = T_GO + tAtS(M.l2s), tl2e = T_GO + tAtS(M.l2e);
  const V1: V3 = fv([24, 10.5, 28], [27, 12.5, 36]);
  const cG = carAt(T_GO, T_GO), dG = drift(T_GO), off0: V3 = [dG[0] - cG.x, dG[1] - cG.y, dG[2] - cG.z];
  for (let t = T_GO + .5; t <= T_PARKED + 1e-6; t += .5) {
    const c = carAt(t, T_GO), cp: V3 = [c.x, c.y, c.z];
    const w0 = ease3((t - T_GO) / 5);                           // from the roadside post to following the car
    const oA: V3 = [off0[0] + (off1[0] - off0[0]) * w0, off0[1] + (off1[1] - off0[1]) * w0, off0[2] + (off1[2] - off0[2]) * w0];
    const w1 = ease3((t - tl1e) / 3.2);                         // off1 -> off2 once it is heading up the driveway
    const o: V3 = [oA[0] + (off2[0] - oA[0]) * w1, oA[1] + (off2[1] - oA[1]) * w1, oA[2] + (off2[2] - oA[2]) * w1];
    const base: V3 = [cp[0] + o[0], cp[1] + o[1], cp[2] + o[2]];
    const w2 = ease3((t - tl2s) / (tl2e + 2.4 - tl2s)), dv = Math.max(0, t - tl2s);
    const vant: V3 = [V1[0] - .3 * dv, V1[1] + .02 * dv, V1[2] - .15 * dv];
    const p: V3 = [base[0] + (vant[0] - base[0]) * w2, base[1] + (vant[1] - base[1]) * w2, base[2] + (vant[2] - base[2]) * w2];
    const lead = Math.min(1, (t - T_GO) / 1.5);
    out.push({ t, p, l: [cp[0] - Math.sin(c.yaw) * 0 + (MON[0] - cp[0]) * .06 * w2, cp[1] + .9, cp[2] + (MON[2] - cp[2]) * .05 * w2], fov: fov * (1 + .0 * lead) });
  }
  // C. the car is parked: only now does the camera let go of it
  const signD = f(24.6, 31), signFov = f(40, 54), swoopFov = f(40, 54), tp = T_PARKED, base = tp + 3.2;
  out.push({ t: base - 2.4, p: [5.2, 5.6, 33.0], l: [8.2, 1.9, 22], fov: f(39, 54) });
  out.push({ t: base, p: [9.6, 2.4, signD], l: [10.4, 1.9, 15.2], fov: signFov });
  out.push({ t: base + 2.2, p: [9.6, 2.4, signD], l: [10.4, 1.9, 15.2], fov: signFov });
  out.push({ t: base + 3.4, p: [6.2, 8.6, 18.0], l: [4.0, 3.0, 4.0], fov: signFov });
  out.push({ t: base + 5.6, p: [1.2, 8.2, 8.0], l: [1.2, 2.6, -6.0], fov: swoopFov });
  out.push({ t: base + 7.8, p: [.8, 3.4, -8.6], l: [1.3, 2.7, -14.4], fov: f(34, 46) });
  const doorZ = f(-12.9, -12.0), doorFov = f(31, 46);   // close enough that OPEN (or CLOSED) fills the screen, with the whole sign in view
  out.push({ t: base + 9.4, p: [1.05, 2.72, doorZ], l: [1.45, 2.86, -14.4], fov: doorFov });
  out.push({ t: base + 11.4, p: [1.05, 2.72, doorZ], l: [1.45, 2.86, -14.4], fov: doorFov });
  out.push({ t: base + 13.4, p: [1.15, 2.2, -11.0], l: [2.2, 1.4, -9.8], fov: f(30, 44) });
  out.push({ t: base + 15.6, p: [2.0, 1.45, -6.7], l: [2.7, .83, -9.45], fov: f(34, 46) });   // the hours board sits in the clear band between the header and the buttons
  out.push({ t: base + 18.4, p: [2.0, 1.45, -6.7], l: [2.7, .83, -9.45], fov: f(34, 46) });
  out.push({ t: base + 21.4, p: [1.4, 6.0, -1.5], l: [.5, 3.0, -14.0], fov: f(38, 54) });
  out.push({ t: base + 23.9, p: [3.0, 9.8, 10.5], l: [0, 6.0, -15.0], fov: f(40, 56) });
  out.push({ t: base + 26.4, p: [14.0, 10.5, 22.0], l: [-2, 8.0, -14.0], fov: f(40, 58) });
  out.push({ t: T_END, p: [34, 7.5, 33], l: [-2, 8.2, -15], fov: f(40, 58) });
  return out;
}
const CACHE: { wide?: ReturnType<typeof series>; narrow?: ReturnType<typeof series> } = {};
/** The camera pose at time t. Narrow is the portrait phone framing. */
export function introAt(t: number, narrow = false): Pose {
  const S = (CACHE[narrow ? 'narrow' : 'wide'] ??= series(keysFor(narrow)));
  return { p: [S.px(t), S.py(t), S.pz(t)], l: [S.lx(t), S.ly(t), S.lz(t)], fov: S.fov(t) };
}

/** Shared clock: the rig advances it, the car reads it. Lets the car carry on if the visitor takes the camera. */
export const intro = { t: 0, t3: T_GO, done: false };
/** Called when the visitor takes the camera mid-shot: the car carries on with its route (no waiting for the tour). */
export function releaseCar() { if (intro.t < T_GO) intro.t3 = Math.max(T_STOP + .6, intro.t + (intro.t < T_STOP ? 0 : .4)); }
/** No opening shot (repeat visit, reduced motion, ?intro=0): the car is simply parked in its stall. */
export function parkCarNow() { intro.t = T_END + T_DRIVE + 1; intro.t3 = 0; intro.done = true; }
