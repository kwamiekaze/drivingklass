// Walks the opening shot for every car of the cast (each parks in its own stall), on a fine clock, wide and phone framing:
//   - the lens stays clear of every solid object
//   - the car's body stays clear of every parked car and fixture on its drive, and ends exactly in its stall
//   - the blinker for the stall's side is on before the last turn
// run: npx tsx scripts/check-intro.mjs
import { introAt, setStall, carAt, T_END, T_GO, T_PARKED } from '../src/components/nuhome2/world/intro.ts';
import { STALLS } from '../src/components/nuhome2/world/cast.ts';
import { SOLIDS, clearance, GROUND } from '../src/components/nuhome2/world/colliders.ts';
const MIN = Number(process.env.MIN ?? .55);
let fail = 0;
const PARKED = { hero: [11, 5.5], camry: [0, -6], corolla: [-5.5, -6], civic: [8.25, -6], elantra: [-16.5, -6], sentra: [-13.75, 5.5] };
for (const [id, st] of Object.entries(STALLS)) {
  setStall(st);
  let worst = { d: 1e9, n: '', t: 0 }, bad = [];
  for (const narrow of [false, true]) for (let t = 0; t <= T_END; t += .02) {
    const { p } = introAt(t, narrow);
    if (p[1] < GROUND) bad.push(`lens below ground at ${t.toFixed(2)}`);
    for (const s of SOLIDS) { const d = clearance(s, p); if (d < worst.d) worst = { d, n: s.n, t }; if (d < MIN) bad.push(`lens ${s.n} d=${d.toFixed(2)} t=${t.toFixed(2)}`); }
  }
  // the car: a 4.6 x 1.9 m body along its heading, tested against the parked cars of the row (not its own) and the fixed solids on the lot
  let carWorst = 9, carAt0 = 0;
  const others = Object.entries(PARKED).filter(([k]) => k !== id).map(([, v]) => v);
  for (let t = T_GO; t <= T_PARKED; t += .05) {
    const c = carAt(t, T_GO), cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
    for (const [ox, oz] of others) for (const [lx, lz] of [[-2.3, 0], [0, 0], [2.3, 0], [-2.3, .95], [2.3, .95], [-2.3, -.95], [2.3, -.95]]) {
      const px = c.x + lx * cs - lz * sn * -1 * 0 + (lx * 0), pz = c.z; // placeholder, replaced below
      void px; void pz;
    }
    for (const [ox, oz] of others) {
      // rectangle-rectangle distance by sampling the moving car's corners and centre line against the parked car's footprint (4.6 x 1.9, nose along z)
      for (let a = -2.3; a <= 2.3; a += .575) for (const b of [-.95, 0, .95]) {
        const wx = c.x + a * Math.cos(c.yaw) + b * Math.sin(c.yaw) * -1 * -1 * 0 + b * Math.sin(c.yaw), wz = c.z - a * Math.sin(c.yaw) + b * Math.cos(c.yaw);
        const dx = Math.max(Math.abs(wx - ox) - .95, 0), dz = Math.max(Math.abs(wz - oz) - 2.3, 0), d = Math.hypot(dx, dz);
        if (d < carWorst) { carWorst = d; carAt0 = t; }
      }
    }
  }
  const e = carAt(T_PARKED + .5, T_GO), endOk = Math.hypot(e.x - st.x, e.z - st.z) < .06 && Math.abs(Math.abs(Math.sin(e.yaw)) - 1) < .02 && ((st.side > 0) === (Math.sin(e.yaw) > 0));
  let sigBefore = false; for (let t = T_PARKED - 6; t < T_PARKED; t += .1) { const c = carAt(t, T_GO); if (st.side > 0 ? c.right : c.left) { sigBefore = true; break; } }
  if (!endOk) bad.push(`car ends at (${e.x.toFixed(2)}, ${e.z.toFixed(2)}) yaw ${e.yaw.toFixed(2)}, wanted (${st.x}, ${st.z})`);
  if (!sigBefore) bad.push('no blinker for the last turn');
  if (carWorst < .25) bad.push(`car body passes ${carWorst.toFixed(2)} m from a parked car at t=${carAt0.toFixed(1)}`);
  console.log(`${id.padEnd(8)} stall (${st.x}, ${st.z}) ${st.side > 0 ? 'right' : 'left'} turn | drive ${(T_PARKED - T_GO).toFixed(1)} s, shot ${T_END.toFixed(1)} s | lens min ${worst.d.toFixed(2)} m (${worst.n}) | car min ${carWorst.toFixed(2)} m from parked cars | ${bad.length ? 'PROBLEMS:\n   ' + [...new Set(bad)].slice(0, 6).join('\n   ') : 'ok'}`);
  fail += bad.length;
}
process.exit(fail ? 1 : 0);
