// The free camera never sticks to anything. A real three.js OrbitControls (with a stand-in for the page's element) is run at 60 frames a second through the page's own free-mode
// step (orbitGuard.ts), from many starting lenses round many points of the scene, with the slow auto-orbit and with a hand that keeps turning the lens into whatever is in the way.
//   - the auto-orbit never stops for 3 s or more, never goes inside a solid (or closer than 0.45 m), and never jumps more than 0.5 m in one frame
//   - the hand: the lens is never inside a solid; pushing into one makes it rebound the other way (it never sits still while the hand keeps pushing)
// run: npx tsx scripts/check-orbit.mjs
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SOLIDS, clearance } from '../src/components/nuhome2/world/colliders.ts';
import { OrbitGuard } from '../src/components/nuhome2/world/orbitGuard.ts';
const noop = () => {}, root = { addEventListener: noop, removeEventListener: noop };
const el = { addEventListener: noop, removeEventListener: noop, style: {}, ownerDocument: root, getRootNode: () => root, setPointerCapture: noop, releasePointerCapture: noop, hasPointerCapture: () => false, clientWidth: 800, clientHeight: 900, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 900 }) };
function make(pos, tgt) {
  const cam = new THREE.PerspectiveCamera(40, .85, .5, 320); cam.position.set(...pos);
  const c = new OrbitControls(cam, el); c.target.set(...tgt); c.minDistance = 1; c.maxDistance = 120; c.minPolarAngle = .1; c.maxPolarAngle = 1.9; c.enableDamping = true; c.dampingFactor = .07; c.update();
  return { cam, c };
}
const near = p => Math.min(...SOLIDS.filter(s => s.k !== 'wire').map(s => clearance(s, [p.x, p.y, p.z])));
const targets = [[-36.9, 1.8, -26.1], [27.9, 1.5, -16.5], [0, 5, -17.5], [-30, 1.5, -20], [31.7, 1, -20], [-31.7, 1, 5], [0, 2, -40], [10, 1, -45], [-20, 1, -45], [0, 1.5, 12], [20, 1.5, 0], [-33, 1.5, -45], [33, 1.5, -45]];
let problems = 0, runs = 0, flips = 0; const say = m => { problems++; if (problems <= 25) console.log('  PROBLEM', m); };
for (const t of targets) for (const r of [5, 10, 14]) for (const h of [2, 5]) for (let k = 0; k < 8; k++) {
  const az = k / 8 * Math.PI * 2, pos = [t[0] + r * Math.sin(az), h, t[2] + r * Math.cos(az)];
  if (SOLIDS.some(s => s.k !== 'wire' && clearance(s, pos) < .45)) continue;       // (a start inside something is pushed out by the page; not what is tested here)
  const tag = `${t} r${r} h${h} az${k * 45}`;
  // ---- the slow auto-orbit
  { const { cam, c } = make(pos, t), g = new OrbitGuard(); runs++;
    let lastTh = Math.atan2(cam.position.x - t[0], cam.position.z - t[2]), prev = cam.position.clone(), still = 0, maxStill = 0, d0 = g.dir;
    for (let f = 0; f < 60 * 45; f++) {
      c.update(); g.frame(cam.position, c, 1 / 60, { auto: true, drag: false });
      const step = cam.position.distanceTo(prev); prev.copy(cam.position);
      if (step > .5) { say(`auto ${tag}: jumped ${step.toFixed(2)} m at ${f / 60 | 0}s`); break; }
      const n = near(cam.position); if (n < .4) { say(`auto ${tag}: ${n.toFixed(2)} m from a solid at ${f / 60 | 0}s`); break; }
      if (f % 30 === 29) { const th = Math.atan2(cam.position.x - t[0], cam.position.z - t[2]); let mv = Math.abs(th - lastTh); if (mv > Math.PI) mv = 2 * Math.PI - mv; lastTh = th; if (mv < .004 && c.autoRotate) { still += .5; maxStill = Math.max(maxStill, still); } else if (mv >= .004) still = 0; }
    }
    if (maxStill >= 3) say(`auto ${tag}: sat still ${maxStill} s at ${cam.position.toArray().map(v => v.toFixed(1))}`);
    if (g.dir !== d0) flips++;
  }
  // ---- a hand that keeps turning the lens (both ways, 4 s each way), never letting go
  if (k % 2 === 0) { const { cam, c } = make(pos, t), g = new OrbitGuard();
    let prev = cam.position.clone(), worst = 1e9, rebounds = 0, pushed = 0, atWall = 0, wasHit = false;
    for (let f = 0; f < 60 * 12; f++) {
      const s = (f / 120 | 0) % 2 ? -1 : 1, dx = cam.position.x - t[0], dz = cam.position.z - t[2], rr = Math.hypot(dx, dz), th = Math.atan2(dx, dz) + s * .011;
      cam.position.x = t[0] + rr * Math.sin(th); cam.position.z = t[2] + rr * Math.cos(th);   // the hand turns the lens
      c.update(); g.frame(cam.position, c, 1 / 60, { auto: true, drag: true });
      const step = cam.position.distanceTo(prev); prev.copy(cam.position); if (step > .6) { say(`hand ${tag}: jumped ${step.toFixed(2)} m`); break; }
      worst = Math.min(worst, near(cam.position));
    }
    if (worst < .4) say(`hand ${tag}: got to ${worst.toFixed(2)} m from a solid`);
  }
}
console.log(`${runs} auto-orbit runs (${flips} turned round at least once)`);
console.log(problems ? `PROBLEMS: ${problems}` : 'ok');
process.exit(problems ? 1 : 0);
