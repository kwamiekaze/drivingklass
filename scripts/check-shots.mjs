// Walks every cut of the cutting room (wide and phone framing) and reports the closest the lens comes to anything solid.
// run: npx tsx scripts/check-shots.mjs
import { SHOTS } from '../src/components/nuhome2/world/shots.ts';
import { SOLIDS, clearance, GROUND } from '../src/components/nuhome2/world/colliders.ts';
const MIN = Number(process.env.MIN ?? .6);
import { usableShots } from '../src/components/nuhome2/world/shots.ts';
let bad = [], worst = { d: 1e9, n: '', s: '' };
for (const narrow of [false, true]) {
  const list = usableShots(narrow);
  console.log(`${narrow ? 'phone' : 'wide'} framing: ${list.length} of ${SHOTS.length} shots survive the clearance proof`);
  for (const sh of list) for (let u = 0; u <= 1.0001; u += .01) {
    const { p } = sh.at(u, narrow);
    if (p[1] < GROUND + .5) bad.push(`${sh.name} too low ${p[1].toFixed(2)}`);
    for (const s of SOLIDS) { const d = clearance(s, p); if (d < worst.d) worst = { d, n: s.n, s: sh.name }; if (d < MIN) bad.push(`${sh.name} ${s.n} d=${d.toFixed(2)}`); }
  }
}
console.log(`closest approach among the kept shots: ${worst.d.toFixed(2)} m to ${worst.n} in "${worst.s}"`);
console.log(bad.length ? `TOO CLOSE:\n` + [...new Set(bad)].slice(0, 30).join('\n') : `OK: every kept shot stays at least ${MIN} m clear`);
process.exit(bad.length ? 1 : 0);
