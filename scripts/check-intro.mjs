// Walks the whole opening shot, on a fine clock, and reports the closest the lens comes to anything solid.
// run: npx tsx scripts/check-intro.mjs
import { introAt, T_END } from '../src/components/nuhome2/world/intro.ts';
import { SOLIDS, clearance, GROUND } from '../src/components/nuhome2/world/colliders.ts';
const MIN = Number(process.env.MIN ?? .55);
let worst = { d: 1e9, n: '', t: 0 }, bad = [];
for (const narrow of [false, true]) {
  for (let t = 0; t <= T_END; t += .02) {
    const { p } = introAt(t, narrow);
    if (p[1] < GROUND) bad.push(`t=${t.toFixed(2)} ${narrow ? 'narrow' : 'wide'} below ground ${p[1].toFixed(2)}`);
    for (const s of SOLIDS) { const d = clearance(s, p); if (d < worst.d) worst = { d, n: s.n, t }; if (d < MIN) bad.push(`t=${t.toFixed(2)} ${narrow ? 'narrow' : 'wide'} ${s.n} d=${d.toFixed(2)}`); }
  }
}
console.log('closest approach', worst.d.toFixed(2), 'm to', worst.n, 'at t =', worst.t.toFixed(2));
const uniq = [...new Set(bad.map(b => b.replace(/^t=[\d.]+ /, '')))];
console.log(bad.length ? `TOO CLOSE: ${bad.length} samples\n` + bad.slice(0, 30).join('\n') : `OK: the lens stays at least ${MIN} m from every solid, wide and narrow`);
process.exit(bad.length ? 1 : 0);
