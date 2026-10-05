/*
 * The cutting room: 56 camera angles over the lot, the building and the avenue. Each is a short, slow, single move (an orbit,
 * a crane, a dolly or a push) and none of them ever touches anything: scripts/check-shots.mjs walks every shot against the
 * solid-object list. High, slowly spinning bird's-eye shots are the house style, so they are the majority.
 * Nothing on screen names a shot; they simply cut.
 */
import type { V3, Pose } from './intro';

export type Shot = { name: string; dur: number; at: (u: number, narrow: boolean) => Pose };
const e = (u: number) => u * u * (3 - 2 * u);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const ring = (c: V3, r: number, h: number, ang: number): V3 => [c[0] + Math.sin(ang) * r, h, c[2] + Math.cos(ang) * r];

/** A slow orbit: round a centre at a radius and height, sweeping `sweep` radians from `a0`, looking at the centre (raised by ly). */
const orbit = (name: string, c: V3, r: number, h: number, a0: number, sweep: number, ly: number, dur: number, fov = 40, lookOff: V3 = [0, 0, 0]): Shot => ({
  name, dur, at: (u, n) => { const rr = n ? r * 1.25 : r, hh = n ? h * 1.1 : h; return { p: ring(c, rr, hh, a0 + sweep * e(u)), l: [c[0] + lookOff[0], ly + lookOff[1], c[2] + lookOff[2]], fov: n ? fov + 15 : fov }; },
});
/** A move between two points with the look target also travelling. */
const move = (name: string, p0: V3, p1: V3, l0: V3, l1: V3, dur: number, fov = 40): Shot => ({
  name, dur, at: (u, n) => { const k = e(u); return { p: lerp3(p0, p1, k), l: lerp3(l0, l1, k), fov: n ? fov + 14 : fov }; },
});

const LOT: V3 = [0, 0, 0], FRONT: V3 = [0, 0, -9], FOUNT: V3 = [0, 1.5, 6.6], MONU: V3 = [10.4, 1.5, 15.2], FACADE: V3 = [0, 6, -15];
export const SHOTS: Shot[] = [];
const add = (s: Shot) => { SHOTS.push(s); };

// ---- bird's-eye spins: the signature. Different centres, heights, radii, directions and starts ----
const A = Math.PI / 180;
add(orbit('lot high cw', LOT, 34, 30, 200 * A, 70 * A, 0, 8));
add(orbit('lot high ccw', LOT, 38, 34, 150 * A, -75 * A, 0, 8.5));
add(orbit('lot higher', LOT, 30, 42, 20 * A, 90 * A, 0, 9));
add(orbit('building front cw', FRONT, 30, 22, 160 * A, 55 * A, 3, 7.5));
add(orbit('building front ccw', FRONT, 32, 26, 215 * A, -60 * A, 3, 7.5));
add(orbit('fountain high', FOUNT, 22, 20, 90 * A, 100 * A, 1, 8));
add(orbit('fountain high ccw', FOUNT, 24, 24, 280 * A, -100 * A, 1, 8));
add(orbit('fountain close', FOUNT, 15, 11.5, 180 * A, 85 * A, 1.5, 7));
add(orbit('monument high', MONU, 22, 18, 120 * A, 75 * A, 1.5, 7));
add(orbit('monument high ccw', MONU, 24, 21, 330 * A, -70 * A, 1.5, 7));
add(orbit('monument mid', MONU, 14, 8.5, 150 * A, 60 * A, 2, 6.5));
add(orbit('east wing high', [20, 0, -9], 26, 21, 140 * A, 70 * A, 3, 7.5));
add(orbit('west wing high', [-20, 0, -9], 26, 21, 220 * A, -70 * A, 3, 7.5));
add(orbit('east lot high', [18, 0, 4], 24, 20, 110 * A, 80 * A, 0.5, 7.5));
add(orbit('west lot high', [-18, 0, 4], 24, 20, 250 * A, -80 * A, 0.5, 7.5));
add(orbit('stall high', [0, 0, -6], 16, 13, 170 * A, 80 * A, 1, 6.5));
add(orbit('stall high ccw', [0, 0, -6], 18, 15, 190 * A, -80 * A, 1, 6.5));
add(orbit('whole site wide', [0, 0, -2], 52, 40, 200 * A, 60 * A, 0, 9, 42));
add(orbit('whole site wide ccw', [0, 0, -2], 56, 44, 160 * A, -60 * A, 0, 9, 42));
add(orbit('intersection high', [0, 0, 28], 28, 22, 150 * A, 70 * A, 0, 7.5));
add(orbit('avenue high', [2, 0, 60], 34, 26, 30 * A, 70 * A, 0, 8));
add(orbit('building high rear-left', FRONT, 34, 30, 255 * A, 50 * A, 3, 7.5));
add(orbit('building high rear-right', FRONT, 34, 30, 105 * A, -50 * A, 3, 7.5));
add(orbit('pediment orbit', [0, 7, -14], 24, 15, 165 * A, 45 * A, 7, 7.5));

// ---- cranes: up and over, rising slowly while looking down the scene ----
add(move('crane up facade', [6, 3, 14], [-6, 17, 24], FACADE, [0, 4, -12], 8));
add(move('crane up facade 2', [-8, 3.5, 16], [8, 18, 26], [0, 7, -15], [0, 3, -10], 8));
add(move('crane over fountain', [-14, 6, 12], [10, 22, 22], FOUNT, [0, 1, 2], 8));
add(move('crane over fountain 2', [16, 5, 14], [-10, 20, 24], [0, 2, 6], [0, 1, 0], 8));
add(move('crane monument', [14, 4, 22], [20, 14, 36], [10.4, 2, 15.2], [6, 4, 8], 7));
add(move('crane stall', [10, 5, 6], [-6, 15, 14], [0, 1, -6], [0, 3, -8], 7));
add(move('crane avenue', [6, 4, 70], [-8, 18, 90], [2, 2, 35], [2, 4, 20], 8));
add(move('crane intersection', [-14, 5, 44], [10, 19, 52], [2, 2, 32], [4, 3, 24], 8));
add(move('descend to monument', [20, 18, 40], [12, 5, 26], [10.4, 2, 15.2], [10.4, 2, 15.2], 7));
add(move('descend to lot', [-16, 20, 28], [-6, 9, 18], [0, 1, 0], [0, 1, -4], 7));

// ---- dollies and tracks along the avenue, the street and the lot ----
add(move('dolly down avenue', [2.05, 3.2, 120], [2.05, 3.2, 60], [2, 3, 20], [2, 3, 20], 9, 38));
add(move('dolly down avenue high', [3, 12, 130], [3, 12, 70], [2, 3, 20], [2, 3, 20], 9, 38));
add(move('dolly along street', [-34, 4, 34], [34, 4, 34], [0, 2, 14], [0, 2, 14], 9));
add(move('dolly along street 2', [34, 7, 36], [-34, 7, 36], [0, 3, 12], [0, 3, 12], 9));
add(move('truck along lot', [-30, 6, 20], [30, 6, 20], [0, 1.5, 0], [0, 1.5, 0], 9));
add(move('truck along lot high', [34, 12, 24], [-34, 12, 24], [0, 1.5, -2], [0, 1.5, -2], 9));
add(move('truck along facade', [-22, 4.5, -3], [22, 4.5, -3], [-8, 5, -15], [8, 5, -15], 9));
add(move('truck along facade high', [24, 11, 2], [-24, 11, 2], [8, 5, -15], [-8, 5, -15], 9));

// ---- pushes toward the signs and the building ----
add(move('push to pediment', [0, 5, 30], [0, 6.5, 8], [0, 7.5, -14], [0, 7.5, -14], 8));
add(move('push to pediment high', [10, 16, 34], [3, 9, 12], [0, 7, -14], [0, 7, -14], 8));
add(move('push to monument', [8, 3, 40], [9.6, 2.6, 25], [10.4, 2, 15.2], [10.4, 2, 15.2], 7));
add(move('push to door', [0.4, 6, 14], [1.1, 3.4, -8], [1.4, 2.8, -14.4], [1.4, 2.8, -14.4], 8));
add(move('push to fountain', [-14, 3.5, 20], [-8, 3.6, 13], [0, 2, 6.6], [0, 2, 6.6], 7));
add(move('rise at fountain', [8, 2.4, 13], [8, 8, 14], [0, 2, 6.6], [0, 3, 6.6], 6));
add(move('canopy stars rise', [-4, 3, 28], [-10, 10, 24], [-18, 5.5, 11.8], [-18, 5.5, 11.8], 7));
add(move('canopy stars east', [30, 4, 24], [38, 10, 18], [27, 5.5, 11.8], [30, 5.5, 4], 7));
add(move('hours board low', [3.0, 1.4, -5.6], [2.2, 1.2, -6.8], [2.7, 0.8, -9.45], [2.7, .85, -9.45], 6, 34));
add(move('open sign push', [1.4, 3.4, -9], [1.05, 2.72, -12.9], [1.45, 2.86, -14.4], [1.45, 2.86, -14.4], 6, 34));
add(move('stall low from fountain', [-3, 2.2, 3], [-1, 2.4, -2], [0, 0.8, -6], [0, 0.8, -6], 6));
add(move('lot low pass west', [-30, 2.4, 10], [-22, 2.6, 4], [-14, 1, -6], [-14, 1, 5.5], 7));
add(move('lot low pass east', [30, 2.4, 10], [24, 2.6, 4], [10, 1, -6], [11, 1, 5.5], 7));
add(move('avenue low east', [10, 2.2, 56], [10.5, 2.2, 44], [2, 1.5, 24], [2, 1.5, 24], 7));

// ---- every shot is proved clear before it is ever used: raise it until nothing is touched, or drop it ----
import { SOLIDS, clearance, GROUND } from './colliders';
const MIN_CLEAR = .75, LIFTS = [0, 1.5, 3, 4.5, 6, 8, 10, 12.5, 15, 18, 22, 27];
const clearOf = (sh: Shot, narrow: boolean, lift: number) => {
  for (let u = 0; u <= 1.0001; u += .02) { const p = sh.at(u, narrow).p, q: V3 = [p[0], p[1] + lift, p[2]]; if (q[1] < GROUND + .5) return false; for (const s of SOLIDS) if (clearance(s, q) < MIN_CLEAR) return false; }
  return true;
};
const FITTED: { wide?: Shot[]; narrow?: Shot[] } = {};
/** The shots that survive the clearance proof, with any lift they needed baked in. */
export function usableShots(narrow: boolean): Shot[] {
  const key = narrow ? 'narrow' : 'wide';
  if (FITTED[key]) return FITTED[key]!;
  const out: Shot[] = [];
  for (const sh of SHOTS) {
    for (const lift of LIFTS) {
      if (!clearOf(sh, narrow, lift)) continue;
      out.push(lift === 0 ? sh : { name: sh.name, dur: sh.dur, at: (u, n) => { const r = sh.at(u, n); return { ...r, p: [r.p[0], r.p[1] + lift, r.p[2]] }; } });
      break;
    }
  }
  return (FITTED[key] = out);
}
