// The PARKING sign pressed at every moment of the opening drive (and after it): the car must never jump, vanish or reappear.
//   - before the car has begun its left turn into the aisle: it carries on, then goes straight on at the driveway instead (the live drive)
//   - once it has begun that turn: it finishes the drive into its stall, parks, then drives out and round to the back lot (the stall drive)
//   - after it is parked: the stall drive at once
// Every frame (60 per second) the car's pose is taken as the page would draw it (intro.ts while the opening drive runs, park.ts once a drive has started)
// and compared with the frame before: no step bigger than the car's own speed allows, no sudden turn, and the two ends of every hand-over line up.
// run: npx tsx scripts/check-enter.mjs
import { park, canStartPark, requestEnter, tickEnter, parkCarAt, parkTotal, finishPark, parkMode, setParkStall, startPark } from '../src/components/nuhome2/world/park.ts';
import { intro, carAt, T_GO, T_STOP, T_PARKED, T_DRIVE, introParked, setStall } from '../src/components/nuhome2/world/intro.ts';
import { STALLS } from '../src/components/nuhome2/world/cast.ts';
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
let fail = 0; const DT = 1 / 60;
for (const [sid, st] of Object.entries(STALLS)) {
  setStall(st); setParkStall(st);
  const T0 = T_PARKED + 4, rows = [];
  for (let ct = 0.5; ct <= T0; ct += 0.61) {
    // a fresh page at intro time ct
    Object.assign(park, { phase: 'idle', t: 0, seq: 0, kind: 'parallel', loc: 'front', enterPending: false }); intro.t = ct; intro.t3 = T_GO; intro.done = false;
    const bad = [];
    if (!canStartPark('enter')) { bad.push('sign not on offer'); }
    requestEnter();
    let prev = null, modes = new Set(), startedAt = null, handover = null;
    for (let f = 0; f < 60 * 140; f++) {
      tickEnter();
      let pose, speed;
      if (park.phase !== 'idle') {
        if (startedAt === null) { startedAt = f * DT; handover = { ...parkCarAt(0) }; modes.add(parkMode()); if (prev && Math.hypot(handover.x - prev.x, handover.z - prev.z) > 0.9 * (prev.v ?? 3) * DT + 0.03 + 0.15) bad.push(`hand-over jump ${Math.hypot(handover.x - prev.x, handover.z - prev.z).toFixed(3)} m at intro t=${ct.toFixed(1)}`); if (prev && Math.abs(wrap(handover.yaw - prev.yaw)) > 0.05) bad.push(`hand-over turn ${(wrap(handover.yaw - prev.yaw) * 57.3).toFixed(1)} deg at intro t=${ct.toFixed(1)}`); }
        const c = parkCarAt(park.t); pose = { x: c.x, z: c.z, yaw: c.yaw, v: Math.abs(c.speed), src: 'park' };
        park.t += DT; if (park.t >= parkTotal()) { finishPark(); break; }
      } else {
        if (!introParked()) intro.t += DT;
        const c = carAt(intro.t, intro.t3), prevT = Math.max(0, intro.t - DT), p0 = carAt(prevT, intro.t3), v = Math.hypot(c.x - p0.x, c.z - p0.z) / DT;
        pose = { x: c.x, z: c.z, yaw: c.yaw, v, src: 'intro' };
      }
      if (prev) { const step = Math.hypot(pose.x - prev.x, pose.z - prev.z), allow = Math.max(prev.v, pose.v, 0.3) * DT * 1.6 + 0.02; if (step > allow && prev.src === pose.src) bad.push(`step ${step.toFixed(3)} m (allowed ${allow.toFixed(3)}) at frame ${f}, ${pose.src}`); if (prev.src !== pose.src && pose.src === 'intro') bad.push('went back to the opening drive'); if (Math.abs(wrap(pose.yaw - prev.yaw)) > 0.12 && prev.src === pose.src) bad.push(`heading step ${(wrap(pose.yaw - prev.yaw) * 57.3).toFixed(1)} deg at frame ${f}`); }
      prev = pose;
    }
    if (park.phase !== 'done') bad.push('never finished'); else if (park.loc !== 'entry') bad.push(`ended at loc ${park.loc}`);
    const finalMode = [...modes][0];
    // after a drive from its stall: the car had parked first when it was past the turn
    rows.push([ct, finalMode, startedAt, bad]);
    if (bad.length) { fail += bad.length; console.log(`${sid.padEnd(8)} click at intro t=${ct.toFixed(1)}: ${[...new Set(bad)].slice(0, 3).join(' | ')}`); }
  }
  const live = rows.filter(r => r[1] === 'enterLive'), stall = rows.filter(r => r[1] === 'enterStall');
  console.log(`${sid.padEnd(8)} ${rows.length} presses: ${live.length} diverted live (first at intro t=${live[0]?.[0].toFixed(1)}, last ${live[live.length - 1]?.[0].toFixed(1)}), ${stall.length} drove to the stall first`);
}
console.log(fail ? `PROBLEMS: ${fail}` : 'ok');
process.exit(fail ? 1 : 0);
