// The EXIT sign: the way out from every place the car can be (its stall, the opening drive on the driveway, the stop line of the back lot, the parallel box, the bay, the east line, the west line).
// Checks, on a fine clock, for each start:
//   - the car's body never touches a cone, a lamp, a pole, a kerb, the building or the stop sign; it stays on the asphalt of the back lot, the west road and the driveway
//   - the right signal is on while it stands at the stop sign, it is stopped there with its nose short of the stop bar, and no signal is on while it is standing at the start (except the ones asked for)
//   - the way out ends heading west on the street's north lane, out of the scene; the steering is smooth; the camera is a bird's eye
//   - the car never reverses except where the start needs it (the stall, the box)
// run: npx tsx scripts/check-exit.mjs
import { parkTotal, parkMarks, parkEnds, parkCarAt, setParkStall, setParkMode, setLiveCar, DMAX } from '../src/components/nuhome2/world/park.ts';
import { STALLS } from '../src/components/nuhome2/world/cast.ts';
import { SOLIDS, clearance, GROUND } from '../src/components/nuhome2/world/colliders.ts';
import { BL_CONES, CONE_R, EXIT } from '../src/components/nuhome2/world/rearlot.ts';
import { parkCamAt, resetParkCam } from '../src/components/nuhome2/world/parkcam.ts';
const L = 4.6, W = 2.2;
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const toCar = (c, px, pz) => { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw), dx = px - c.x, dz = pz - c.z, a = dx * cs - dz * sn, b = -dx * sn - dz * cs; return Math.hypot(Math.max(Math.abs(a) - L / 2, 0), Math.max(Math.abs(b) - W / 2, 0)); };
const corners = (c) => { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return [[L / 2, W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [-L / 2, -W / 2]].map(([a, b]) => [c.x + a * cs - b * sn, c.z - a * sn - b * cs]); };
const boxGap = (c, s) => { let best = 1e9; const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); for (let a = -L / 2; a <= L / 2 + 1e-9; a += L / 12) for (const b of [-W / 2, 0, W / 2]) { const wx = c.x + a * cs - b * sn, wz = c.z - a * sn - b * cs; best = Math.min(best, Math.hypot(Math.max(s.min[0] - wx, 0, wx - s.max[0]), Math.max(s.min[2] - wz, 0, wz - s.max[2]))); } return best; };
const runs = [['exit', 'west line'], ['exitLine', 'east line'], ['exitEntry', 'stop line'], ['exitFront', 'stall'], ['exitBox', 'box'], ['exitBay', 'bay'], ['exitLive', 'driveway']];
let fail = 0;
for (const [mode, label] of runs) for (const [id, st] of mode === 'exitFront' ? Object.entries(STALLS) : [['hero', STALLS.hero]]) {
  setParkStall(st); setLiveCar({ x: 32.7, z: 8, v: 5, left: false, right: false }); setParkMode(mode); resetParkCam();
  const T = parkTotal(), M = parkMarks(), E = parkEnds(), bad = [], own = SOLIDS.find(s => s.k === 'box' && s.n.startsWith('car') && Math.abs((s.min[0] + s.max[0]) / 2 - st.x) < .6 && Math.abs((s.min[2] + s.max[2]) / 2 - st.z) < .6);
  let worstCone = 9, worstSolid = 9, solidName = '', prev = null, maxDSteer = 0, maxDYaw = 0, tCone = 0;
  const frontStart = mode === 'exitFront' || mode === 'exitLive';
  for (let t = 0; t <= T; t += 1 / 30) {
    const c = { ...parkCarAt(t) };
    for (const [x, z] of BL_CONES) { const g = toCar(c, x, z) - CONE_R; if (g < worstCone) { worstCone = g; tCone = t; } }
    for (const s of SOLIDS) {
      if (s === own || s.k === 'wire' || s.n === 'canopy beam' || s.n === 'cone') continue;
      if (s.k === 'box') { if (s.min[1] > 1.2) continue; const g = boxGap(c, s); if (g < worstSolid) { worstSolid = g; solidName = s.n + '@' + t.toFixed(1); } }
      else { if (s.y0 > 1.2) continue; const g = toCar(c, s.x, s.z) - s.r; if (g < worstSolid) { worstSolid = g; solidName = s.n + '@' + t.toFixed(1); } }
    }
    for (const [wx, wz] of corners(c)) {
      const inBack = wz < -26.2, inRoad = wz >= -26.2 && wz < -14.7, inFront = wz >= -14.7 && wz < 14.3, inApron = wz >= 14.3 && wz < 19.15;
      if (inBack && (Math.abs(wx) > 34.2 || wz < -53.9)) bad.push(`off the back lot at t=${t.toFixed(1)} (${wx.toFixed(1)}, ${wz.toFixed(1)})`);
      if (inRoad && (Math.abs(wx) < 29.2 || Math.abs(wx) > 34.2)) bad.push(`off the side road at t=${t.toFixed(1)} (${wx.toFixed(1)}, ${wz.toFixed(1)})`);
      if (inApron && c.x < 0 && c.x > -40 && (wx < -34.3 || wx > -29.1) && wz > 14.3) bad.push(`off the west driveway at t=${t.toFixed(1)}`);
    }
    if (prev) { maxDSteer = Math.max(maxDSteer, Math.abs(c.steer - prev.steer) * 30); maxDYaw = Math.max(maxDYaw, Math.abs(wrapA(c.yaw - prev.yaw)) * 30); }
    prev = c;
  }
  if (worstCone < .1) bad.push(`passes ${worstCone.toFixed(2)} m from a cone at t=${tCone.toFixed(1)}`);
  if (worstSolid < .2) bad.push(`passes ${worstSolid.toFixed(2)} m from ${solidName}`);
  if (maxDSteer > 75 * Math.PI / 180) bad.push(`steering moves ${(maxDSteer * 180 / Math.PI).toFixed(0)} deg/s`);
  // the stop sign
  const stop = { ...parkCarAt(E.OUT_TO_STOP + 1) }, noseZ = stop.z + 2.25;
  if (!stop.right || stop.left || stop.moving) bad.push('at the stop sign: not stopped with the right signal on');
  if (Math.abs(noseZ - EXIT.zNose) > .1 || noseZ > EXIT.zBar - .4 || Math.abs(stop.x - EXIT.laneX) > .08 || Math.abs(wrapA(stop.yaw - 1.5 * Math.PI)) > .03) bad.push(`stop: nose z ${noseZ.toFixed(2)} (bar ${EXIT.zBar}), x ${stop.x.toFixed(2)}, yaw ${(stop.yaw * 180 / Math.PI).toFixed(1)}`);
  for (let t = E.OUT_TO_STOP - 2; t <= E.OUT_STOP_SIGN; t += 1 / 30) { const c = parkCarAt(t); if (!c.right || c.left) { bad.push(`right signal not on while braking to the stop sign (t=${t.toFixed(1)})`); break; } }
  // it must have really stopped before the sign, and been stopped for at least 2 s
  { let still = 0; for (let t = E.OUT_TO_STOP - .5; t <= E.OUT_STOP_SIGN; t += 1 / 30) if (!parkCarAt(t).moving) still += 1 / 30; if (still < 2) bad.push(`stands at the sign only ${still.toFixed(1)} s`); }
  // the end: heading west on the street's north lane, gone
  const f = { ...parkCarAt(T - .05) };
  if (f.x > -75 || Math.abs(wrapA(f.yaw - Math.PI)) > .03 || f.z < 22.2 || f.z > 24.4) bad.push(`ends at (${f.x.toFixed(1)}, ${f.z.toFixed(1)}) yaw ${(f.yaw * 180 / Math.PI).toFixed(1)}`);
  // the right turn onto the street: right signal on during it
  { const tT = M.OUT_TURN_OUT + 1; let ok = true; for (let t = tT; t < tT + 6 && t < T; t += 1 / 30) { const c = parkCarAt(t); if (c.z < 22.5 && c.z > 14 && !c.right) ok = false; } if (!ok) bad.push('right turn onto the street without the right signal'); }
  // a signal while standing at the start is allowed only when asked for (box: left, bay: right); no left and right together, ever
  for (let t = 0; t <= T; t += 1 / 30) { const c = parkCarAt(t); if (c.left && c.right) { bad.push('both signals on'); break; } }
  // reversing only where the start needs it
  { let rev = false; for (let t = (E.OUT_SHIFT_D ?? 0); t <= T; t += 1 / 30) if (parkCarAt(t).reversing) { rev = true; break; } const should = mode === 'exitBox'; const early = mode === 'exitFront' ? true : false; if (rev && !should && !early) bad.push('reverses on the way out'); }
  // the camera
  let camMin = 9, carMin = 99, camName = '', framed = 0, nF = 0;
  for (const narrow of [false, true]) for (let t = 0; t <= T; t += 1 / 30) {
    const { p, l, fov } = parkCamAt(t, narrow), c = { ...parkCarAt(t) };
    if (p[1] < GROUND) bad.push(`lens below ground at ${t.toFixed(1)}`);
    for (const s of SOLIDS) { const d = clearance(s, p); if (d < camMin) { camMin = d; camName = s.n + ' t=' + t.toFixed(1); } }
    carMin = Math.min(carMin, Math.hypot(p[0] - c.x, p[1] - .8, p[2] - c.z));
    const vx = l[0] - p[0], vy = l[1] - p[1], vz = l[2] - p[2], tx = c.x - p[0], ty = .7 - p[1], tz = c.z - p[2], ang = Math.acos(Math.min(1, Math.max(-1, (vx * tx + vy * ty + vz * tz) / (Math.hypot(vx, vy, vz) * Math.hypot(tx, ty, tz) || 1)))) * 180 / Math.PI;
    nF++; if (ang < fov * .5 * (narrow ? .75 : 1)) framed++;
  }
  if (camMin < .55) bad.push(`lens ${camMin.toFixed(2)} m from ${camName}`);
  if (carMin < 8) bad.push(`lens only ${carMin.toFixed(1)} m from the car`);
  if (framed / nF < .85) bad.push(`car in frame only ${(100 * framed / nF).toFixed(0)}%`);
  console.log(`${(mode + ' ' + id).padEnd(16)} from ${label.padEnd(10)} ${T.toFixed(1)} s | cone ${worstCone.toFixed(2)} m | solid ${worstSolid.toFixed(2)} m (${solidName}) | lens ${carMin.toFixed(1)} m from car, ${(100 * framed / nF).toFixed(0)}% framed | ${bad.length ? 'PROBLEMS:\n   ' + [...new Set(bad)].slice(0, 8).join('\n   ') : 'ok'}`);
  fail += bad.length;
}
process.exit(fail ? 1 : 0);
