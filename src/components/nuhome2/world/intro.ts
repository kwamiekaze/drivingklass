/*
 * The opening shot, written as one pure timeline so it can be tested without a browser.
 *
 *   0 s      a gold DrivingKlass car drives down the avenue in the right-hand lane, the camera chasing it
 *   12.5 s   the car stops at the stop sign
 *   13.7 s   the camera lifts away, over the stop sign, and settles in front of the black DrivingKlass sign
 *   21.8 s   it hovers up and over the lot and sinks straight toward the front door
 *   29 s     ultra close on the OPEN / CLOSED sign
 *   33 s     it pulls back and down to the opening hours board on its A-frame
 *   38 s     it pulls all the way back, up and over everything, to where the idle pan begins
 *   38 s     the car sets off again, round the fountain, and parks in the reserved stall in front of the door
 *
 * Every number below was chosen so the camera never touches a thing; colliders.ts lists the solid objects and
 * scripts/check-intro.mjs walks the whole timeline against them.
 */
export type V3 = [number, number, number];
export type Pose = { p: V3; l: V3; fov: number };

export const T_STOP = 12.5, T_HOLD = 13.7, T_PARK = 38, T_DRIVE = 10.5, T_END = 48.5;
export const LANE_X = 2.05, STOP_Z = 39.5, START_Z = 150;
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

// after the stop: avenue, round the fountain counter-clockwise (keeping right), then straight into the reserved stall
const C0: [number, number] = [0, 6.6], R = 5.7;
const ph0 = Math.atan2(Math.sqrt(R * R - LANE_X * LANE_X), LANE_X), ph1 = -20 * Math.PI / 180;
function buildPath() {
  const pts: [number, number][] = [];
  for (let z = STOP_Z; z > C0[1] + Math.sqrt(R * R - LANE_X * LANE_X); z -= .25) pts.push([LANE_X, z]);
  for (let k = 0; k <= 80; k++) { const a = ph0 + (ph1 - ph0) * (k / 80); pts.push([C0[0] + R * Math.cos(a), C0[1] + R * Math.sin(a)]); }
  const e = pts[pts.length - 1]!, dir: [number, number] = [Math.sin(ph1), -Math.cos(ph1)];   // heading at the end of the arc
  const P0: [number, number] = e, P1: [number, number] = [e[0] + dir[0] * 6, e[1] + dir[1] * 6], P2: [number, number] = [0, -1.5], P3: [number, number] = [STALL[0], STALL[2]];
  for (let k = 1; k <= 60; k++) { const u = k / 60, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3; pts.push([a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]]); }
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  return { pts, cum, len: cum[cum.length - 1]! };
}
const PATH = buildPath();
const atDist = (s: number) => {
  const { pts, cum, len } = PATH; s = Math.max(0, Math.min(len, s));
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid]! <= s) lo = mid; else hi = mid; }
  const f = (s - cum[lo]!) / ((cum[hi]! - cum[lo]!) || 1), a = pts[lo]!, b = pts[hi]!, a2 = pts[Math.max(0, lo - 2)]!, b2 = pts[Math.min(pts.length - 1, hi + 2)]!;
  const dx = b2[0] - a2[0], dz = b2[1] - a2[1];
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, yaw: Math.atan2(-dz, dx) };
};
/** Where the car is at time t. yaw is the model's rotation.y: pi/2 means nose toward the building. t3 is when it sets off from the stop sign. */
export function carAt(t: number, t3 = T_PARK) {
  if (t < T_STOP) return { x: LANE_X, z: carZ1(t), yaw: Math.PI / 2, moving: true };
  if (t < t3) return { x: LANE_X, z: STOP_Z, yaw: Math.PI / 2, moving: false };
  const u = Math.min(1, (t - t3) / T_DRIVE), s = u * u * u * (u * (6 * u - 15) + 10);   // smoother-step: gentle start, gentle arrival
  const q = atDist(PATH.len * s); return { x: q.x, z: q.z, yaw: q.yaw, moving: u < 1 };
}

// ---------- the camera ----------
type Key = { t: number; p: V3; l: V3; fov: number };
function keysFor(narrow: boolean): Key[] {
  const W = narrow ? 1 : 0, f = (w: number, n: number) => (narrow ? n : w);
  const out: Key[] = [];
  const chaseFov = f(38, 54), back = f(7.6, 9.6), up = f(2.3, 2.7);
  for (let t = 0; t <= T_STOP + 1e-6; t += .5) { const z = carZ1(t); out.push({ t, p: [LANE_X - .9, up, z + back], l: [LANE_X, 1.25, z - 5], fov: chaseFov }); }
  const stopP: V3 = [LANE_X - .9, up, STOP_Z + back], stopL: V3 = [LANE_X, 1.25, STOP_Z - 5];
  const signD = f(24.6, 31), signFov = f(40, 54), swoopFov = f(40, 54);
  out.push({ t: T_HOLD, p: stopP, l: stopL, fov: chaseFov });
  out.push({ t: 17.2, p: [5.2, 5.6, 33.0], l: [8.2, 1.9, 22], fov: f(39, 54) });
  out.push({ t: 19.6, p: [9.6, 2.4, signD], l: [10.4, 1.9, 15.2], fov: signFov });
  out.push({ t: 21.8, p: [9.6, 2.4, signD], l: [10.4, 1.9, 15.2], fov: signFov });
  out.push({ t: 23.0, p: [6.2, 8.6, 18.0], l: [4.0, 3.0, 4.0], fov: signFov });
  out.push({ t: 25.2, p: [1.2, 8.2, 8.0], l: [1.2, 2.6, -6.0], fov: swoopFov });
  out.push({ t: 27.4, p: [.8, 3.4, -8.6], l: [1.3, 2.7, -14.4], fov: f(34, 46) });
  const doorZ = f(-12.9, -12.0), doorFov = f(31, 46);   // close enough that OPEN fills the screen, with the whole sign in view
  out.push({ t: 29.0, p: [1.05, 2.72, doorZ], l: [1.45, 2.86, -14.4], fov: doorFov });
  out.push({ t: 31.0, p: [1.05, 2.72, doorZ], l: [1.45, 2.86, -14.4], fov: doorFov });
  out.push({ t: 33.0, p: [1.15, 2.2, -11.0], l: [2.2, 1.4, -9.8], fov: f(30, 44) });
  out.push({ t: 35.2, p: [2.0, 1.45, -6.7], l: [2.7, .83, -9.45], fov: f(34, 46) });   // the board sits in the clear band between the header and the buttons
  out.push({ t: 38.0, p: [2.0, 1.45, -6.7], l: [2.7, .83, -9.45], fov: f(34, 46) });
  out.push({ t: 41.0, p: [1.4, 6.0, -1.5], l: [.5, 3.0, -14.0], fov: f(38, 54) });
  out.push({ t: 43.5, p: [3.0, 9.8, 10.5], l: [0, 6.0, -15.0], fov: f(40, 56) });
  out.push({ t: 46.0, p: [14.0, 10.5, 22.0], l: [-2, 8.0, -14.0], fov: f(40, 58) });
  out.push({ t: T_END, p: [34, 7.5, 33], l: [-2, 8.2, -15], fov: f(40, 58) });
  void W; return out;
}
const CACHE: { wide?: ReturnType<typeof series>; narrow?: ReturnType<typeof series> } = {};
/** The camera pose at time t. Narrow is the portrait phone framing. */
export function introAt(t: number, narrow = false): Pose {
  const S = (CACHE[narrow ? 'narrow' : 'wide'] ??= series(keysFor(narrow)));
  return { p: [S.px(t), S.py(t), S.pz(t)], l: [S.lx(t), S.ly(t), S.lz(t)], fov: S.fov(t) };
}

/** Shared clock: the rig advances it, the car reads it. Lets the car carry on if the visitor takes the camera. */
export const intro = { t: 0, t3: T_PARK, done: false };
/** Called when the visitor takes the camera mid-shot: the car stops waiting for the tour and heads for its stall. */
export function releaseCar() { if (intro.t < T_PARK) intro.t3 = Math.max(T_HOLD, intro.t + (intro.t < T_STOP ? 0 : .6)); }
/** No opening shot (repeat visit, reduced motion, ?intro=0): the car is simply parked in its stall. */
export function parkCarNow() { intro.t = T_END + T_DRIVE + 1; intro.t3 = 0; intro.done = true; }
