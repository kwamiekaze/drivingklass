import { SOLIDS, clearance, GROUND } from './colliders';

/**
 * The free camera's guard. The visitor (or the slow auto-orbit) turns the lens round a point; if the circle runs into something solid, the lens must never press against it and sit there.
 *   look-ahead   the auto-orbit looks along its own circle a few metres ahead; when something is in the way it turns round at once and goes the other way (a bounce), long before it touches
 *   boxed in     if both ways are blocked at this radius the lens eases in toward the point it circles until one way is free (and holds still only if it cannot)
 *   hand turning if the hand pushes the lens into something it is pushed out (as always) and rebounds a little the other way, so it never sticks and the hand can turn back
 * Pure maths over the solids in colliders.ts, so the checks (scripts/check-orbit.mjs) run it without a browser.
 */
type P = { x: number; y: number; z: number };
type Ctl = { target: P; autoRotate: boolean; autoRotateSpeed: number; getAzimuthalAngle: () => number };

const HARD = .45;            // never closer than this to a solid
const LOOK = HARD + .45;     // the look-ahead keeps this far from one
const AHEAD = 6;             // metres of its own circle the auto-orbit looks at
const TURN_AT = 3;           // it turns round when less than this is free ahead
const COOL = 1.4;            // seconds after a bounce during which the page's own azimuth rule stays quiet
const REBOUND = .45, REBOUND_RATE = .5;   // seconds, and radians per second at the start of it
export const ORBIT_SPEED = .42;

/** Distance from the point to the nearest solid (or the ground floor of the lens). */
const room = (x: number, y: number, z: number) => { let m = y - GROUND; for (const s of SOLIDS) { if (s.k === 'wire') continue; const d = clearance(s, [x, y, z]); if (d < m) m = d; } return m; };

/** Push the point out of anything it is inside or too near. Returns true when it had to move it. */
export function pushOut(cp: P): boolean {
  let moved = false;
  for (let pass = 0; pass < 3; pass++) { if (!pushOnce(cp)) break; moved = true; }
  return moved;
}
function pushOnce(cp: P): boolean {
  let moved = false;
  if (cp.y < GROUND) { cp.y = GROUND; moved = true; }
  for (const sd of SOLIDS) {
    if (sd.k === 'wire') continue;
    const d = clearance(sd, [cp.x, cp.y, cp.z]); if (d >= HARD) continue;
    moved = true;
    if (sd.k === 'cyl') {
      const dx = cp.x - sd.x, dz = cp.z - sd.z, h = Math.hypot(dx, dz) || 1e-3;
      if (cp.y > sd.y1 - .3 || cp.y < sd.y0 + .05) cp.y = cp.y > (sd.y0 + sd.y1) / 2 ? sd.y1 + .5 : Math.max(GROUND, sd.y0 - .5);
      else { cp.x = sd.x + (dx / h) * (sd.r + .5); cp.z = sd.z + (dz / h) * (sd.r + .5); }
    } else {
      const c = [(sd.min[0] + sd.max[0]) / 2, (sd.min[1] + sd.max[1]) / 2, (sd.min[2] + sd.max[2]) / 2], e = [(sd.max[0] - sd.min[0]) / 2 + .5, (sd.max[1] - sd.min[1]) / 2 + .5, (sd.max[2] - sd.min[2]) / 2 + .5];
      const dd = [cp.x - c[0]!, cp.y - c[1]!, cp.z - c[2]!], ax = [0, 1, 2].reduce((best, i) => (e[i]! - Math.abs(dd[i]!) < e[best]! - Math.abs(dd[best]!) ? i : best), 0), sign = dd[ax]! >= 0 ? 1 : -1;
      if (ax === 0) cp.x = c[0]! + sign * e[0]!; else if (ax === 1) cp.y = c[1]! + sign * e[1]!; else cp.z = c[2]! + sign * e[2]!;
    }
  }
  return moved;
}

/** How far (radians of azimuth) the circle through the lens is clear in the direction s (+1 = azimuth growing), up to what it looks ahead. */
function freeAngle(cam: P, t: P, s: number): number {
  const now = room(cam.x, cam.y, cam.z), dx = cam.x - t.x, dz = cam.z - t.z, r = Math.hypot(dx, dz) || 1e-3, th0 = Math.atan2(dx, dz), max = Math.min(1.1, Math.max(.12, AHEAD / r)), step = .035;
  for (let a = step; a <= max + 1e-6; a += step) { const th = th0 + s * a; const c = room(t.x + r * Math.sin(th), cam.y, t.z + r * Math.cos(th)); if (c < HARD + .02 || (c < LOOK && c < now - .03)) return a - step; }   // (sliding along a wall it already keeps is fine; getting nearer to one is not)
  return max;
}

export class OrbitGuard {
  dir = 1;                    // the page's own convention: +1 = the speed is positive (the azimuth shrinks)
  private cool = 0; private rebound = 0; private reboundS = 0; private prevTh: number | null = null; private lastS = 0; private eased = 0; private tick = 0;
  private turn(cam: P, t: P, d: number) { const dx = cam.x - t.x, dz = cam.z - t.z, r = Math.hypot(dx, dz), th = Math.atan2(dx, dz) + d; cam.x = t.x + r * Math.sin(th); cam.z = t.z + r * Math.cos(th); this.prevTh = th; }
  /** Once per frame, AFTER the controls have moved the lens. `drag` = a hand is on the scene. Returns nothing; sets the controls' auto-orbit for the NEXT update. */
  frame(cam: P, c: Ctl, dt: number, opts: { auto: boolean; drag: boolean }) {
    const t = c.target, th = Math.atan2(cam.x - t.x, cam.z - t.z);
    if (this.prevTh !== null) { let d = th - this.prevTh; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) > 1e-5) this.lastS = Math.sign(d); }
    this.prevTh = th; this.cool = Math.max(0, this.cool - dt);
    const hit = pushOut(cam);
    if (hit) { const th2 = Math.atan2(cam.x - t.x, cam.z - t.z); this.prevTh = th2; }
    if (this.rebound > 0) {                                           // a hand pushed into something: the lens gives a little the other way, then lets go
      const k = this.rebound / REBOUND; this.rebound -= dt; this.turn(cam, t, this.reboundS * REBOUND_RATE * k * dt);
      c.autoRotate = false; return;
    }
    if (hit && opts.drag && this.lastS !== 0) { this.rebound = REBOUND; this.reboundS = -this.lastS; }   // s = the way the azimuth must now move
    c.autoRotate = opts.auto && !opts.drag;
    if (!c.autoRotate) return;
    // the page's own rule: turn round at the ends of its sweep (only while the look-ahead has not just turned it)
    const a = c.getAzimuthalAngle();
    if (this.cool <= 0 && Math.abs(a) < 1.5) { if (a < -.85) this.dir = -1; else if (a > .85) this.dir = 1; }
    if (++this.tick % 3) { c.autoRotateSpeed = ORBIT_SPEED * this.dir; return; }              // (looking ahead 20 times a second is plenty)
    const s = -this.dir, here = freeAngle(cam, t, s), r = Math.hypot(cam.x - t.x, cam.z - t.z) || 1;
    if (here * r < TURN_AT) {
      const other = freeAngle(cam, t, -s);
      if (other * r > here * r + .6) { this.dir = -this.dir; this.cool = COOL; this.eased = 0; }
      else if (other * r < TURN_AT && here * r < TURN_AT) {           // boxed in at this radius: ease the lens in or out (whichever has more room) until one way opens
        const at = (rr: number) => room(t.x + (cam.x - t.x) * rr / r, cam.y, t.z + (cam.z - t.z) * rr / r), now = room(cam.x, cam.y, cam.z), step = .8 * dt * 3;
        const rIn = Math.max(3, r - step), rOut = Math.min(60, r + step), rr = at(rOut) > at(rIn) ? rOut : rIn;
        if (rr !== r && at(rr) >= now - .02 && this.eased < 40) { const k = rr / r; cam.x = t.x + (cam.x - t.x) * k; cam.z = t.z + (cam.z - t.z) * k; this.eased += step; }
        else c.autoRotate = false;                                      // nowhere to go: hold still (a hand can always turn it away)
      }
    }
    c.autoRotateSpeed = ORBIT_SPEED * this.dir;
  }
}
