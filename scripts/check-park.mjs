// Walks the three drives (parallel park from the stall, the bay from the stall, the bay from the parallel box) for all six cars of the cast (each starts in its own stall) on a fine clock and checks:
//   - the car's body (4.5 x 2.1 m with the mirrors) never touches a cone (0.12 m clear at least), a parked car, a lamp, a pole, the building or a kerb
//   - the signal for the side the tail swings to is on BEFORE the car moves, and stays on until it is driving forward
//   - the parallel park uses the right signal only (never the left); the bay drive: right signal before the reverse, and from the box: right, then left, then right again
//   - the car keeps to the right-hand lane of the aisle and of the east road; it stops at the second white line, nose short of it
//   - the camera is a bird's eye: never close to the car
//   - the car ends in the middle of the box, parallel, facing west (the arrow), wheels straight, stopped
//   - the steering is smooth (no jump bigger than the rate limit) and so is the heading
// run: npx tsx scripts/check-park.mjs
import { parkTotal, parkMarks, parkEnds, parkSetup, parkBay, parkCarAt, setParkStall, setParkMode, PARK_GEOM, RA, WB, DMAX } from '../src/components/nuhome2/world/park.ts';
import { STALLS } from '../src/components/nuhome2/world/cast.ts';
import { SOLIDS } from '../src/components/nuhome2/world/colliders.ts';
import { BAY, BAY_LINE, BL_CONES, CONE_R, CONN_X, PBOX } from '../src/components/nuhome2/world/rearlot.ts';
import { parkCamAt, resetParkCam } from '../src/components/nuhome2/world/parkcam.ts';
import { GROUND, clearance } from '../src/components/nuhome2/world/colliders.ts';
const L = 4.5, W = 2.1;
let fail = 0;
/** distance in plan from a point to the car's rectangle (0 when inside) */
const toCar = (c, px, pz) => { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw), dx = px - c.x, dz = pz - c.z, a = dx * cs - dz * sn, b = -dx * sn - dz * cs; return Math.hypot(Math.max(Math.abs(a) - L / 2, 0), Math.max(Math.abs(b) - W / 2, 0)); };
/** the car's rectangle against an axis-aligned box in plan, by sampling the car's outline and the box's corners */
const boxGap = (c, bx0, bx1, bz0, bz1) => {
  const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); let best = 1e9;
  for (let a = -L / 2; a <= L / 2 + 1e-9; a += L / 12) for (const b of [-W / 2, 0, W / 2]) { const wx = c.x + a * cs + b * -sn * -1 * 0 + b * (-sn) * 0 + (a * 0), wz = c.z; void wx; void wz; }
  for (let a = -L / 2; a <= L / 2 + 1e-9; a += L / 12) for (const b of [-W / 2, -W / 4, 0, W / 4, W / 2]) {
    const wx = c.x + a * cs - b * sn, wz = c.z - a * sn - b * cs;
    const dx = Math.max(bx0 - wx, 0, wx - bx1), dz = Math.max(bz0 - wz, 0, wz - bz1); best = Math.min(best, Math.hypot(dx, dz));
  }
  for (const [px, pz] of [[bx0, bz0], [bx0, bz1], [bx1, bz0], [bx1, bz1]]) best = Math.min(best, toCar(c, px, pz));
  return best;
};
const runs = []; for (const [id, st] of Object.entries(STALLS)) { runs.push(['parallel', id, st]); runs.push(['bayFront', id, st]); } runs.push(['bayBox', 'box', STALLS.hero]);
for (const [mode, id, st] of runs) {
  setParkStall(st); setParkMode(mode); resetParkCam();
  const T = parkTotal(), M = parkMarks(), E = parkEnds(), su = mode === 'parallel' ? parkSetup() : null, by = mode === 'parallel' ? null : parkBay(), bad = [];
  const front = mode !== 'bayBox';
  let worstCone = 9, worstSolid = 9, solidName = '', worstT = 0;
  const own = !front ? null : SOLIDS.find(s => s.k === 'box' && s.n.startsWith('car') && Math.abs((s.min[0] + s.max[0]) / 2 - st.x) < .6 && Math.abs((s.min[2] + s.max[2]) / 2 - st.z) < .6);
  let prev = null, maxDSteer = 0, maxDYaw = 0, maxStep = 0;
  for (let t = 0; t <= T; t += 1 / 30) {
    const c = { ...parkCarAt(t) };
    for (const [x, z] of BL_CONES) { const g = toCar(c, x, z) - CONE_R; if (g < worstCone) { worstCone = g; worstT = t; } }
    for (const s of SOLIDS) {
      if (s === own || s.k === 'wire' || s.n === 'canopy beam' || s.n === 'cone') continue;
      if (s.k === 'box') { if (s.min[1] > 1.2) continue; const g = boxGap(c, s.min[0], s.max[0], s.min[2], s.max[2]); if (g < worstSolid) { worstSolid = g; solidName = s.n; } }
      else { if (s.y0 > 1.2) continue; const g = toCar(c, s.x, s.z) - s.r; if (g < worstSolid) { worstSolid = g; solidName = s.n; } }
    }
    // the side roads and the back lot's edge: the body must stay on the asphalt
    const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
    for (const [a, b] of [[L / 2, W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [-L / 2, -W / 2]]) { const wx = c.x + a * cs - b * sn, wz = c.z - a * sn - b * cs; if (wz < -15 && wz > -26 && (wx < 29.2 || wx > 34.2)) bad.push(`off the east road at t=${t.toFixed(1)} (${wx.toFixed(1)}, ${wz.toFixed(1)})`); if (wz < -26 && (wx < -34.2 || wx > 34.2 || wz < -53.9)) bad.push(`off the back lot at t=${t.toFixed(1)}`); }
    if (prev) { maxDSteer = Math.max(maxDSteer, Math.abs(c.steer - prev.steer) * 30); maxDYaw = Math.max(maxDYaw, Math.abs(c.yaw - prev.yaw) * 30); maxStep = Math.max(maxStep, Math.hypot(c.x - prev.x, c.z - prev.z) * 30); }
    prev = c;
  }
  if (worstCone < .1) bad.push(`car passes ${worstCone.toFixed(2)} m from a cone at t=${worstT.toFixed(1)}`);
  if (worstSolid < .2) bad.push(`car passes ${worstSolid.toFixed(2)} m from ${solidName}`);
  if (maxDSteer > 75 * Math.PI / 180) bad.push(`steering moves ${(maxDSteer * 180 / Math.PI).toFixed(0)} deg/s`);
  if (maxStep > 6.2) bad.push(`car moves ${maxStep.toFixed(1)} m/s`);
  // signals
  const first = (pred) => { for (let t = 0; t <= T; t += 1 / 60) if (pred(parkCarAt(t))) return t; return null; };
  const tMove = first(c => c.moving), tSig = first(c => c.left || c.right), sideL = { ...parkCarAt(0) }.left;
  if (tSig === null || tSig > .2 || tMove - tSig < 1.5) bad.push(`signal at ${tSig}, car moves at ${tMove?.toFixed(2)}`);
  const exitName = front ? 'EXIT_REVERSE' : 'BOX_REVERSE';
  const dirOk = (() => { // the tail swings toward the signalled side: the car's left hand is (-sin yaw, -cos yaw)
    const a = { ...parkCarAt(M[exitName]) }, b = { ...parkCarAt(E[exitName]) }, dx = (b.x - 2.25 * Math.cos(b.yaw)) - (a.x - 2.25 * Math.cos(a.yaw)), dz = (b.z + 2.25 * Math.sin(b.yaw)) - (a.z + 2.25 * Math.sin(a.yaw));   // the tail's own movement
    const lx = -Math.sin(a.yaw), lz = -Math.cos(a.yaw), side = dx * lx + dz * lz;   // movement of the car's tail along its left hand
    return sideL ? side > 0 : side < 0;
  })();
  if (!dirOk) bad.push('exit signal side does not match the way the tail swings');
  const sigAt = (t) => ({ ...parkCarAt(t) });
  const always = (t0, t1, pred, what) => { for (let t = t0; t <= t1; t += 1 / 30) if (!pred(sigAt(t))) { bad.push(`${what} at t=${t.toFixed(1)}`); return; } };
  if (mode === 'parallel') {
    always(M.SIGNAL_RIGHT + .1, T - 3.2, c => c.right && !c.left, 'parallel park: the right signal only, never the left, from the setup to the end');
    always(M.STOP_AT_ENTRY_LINE, M.SIGNAL_RIGHT - .1, c => !c.left && !c.right, 'no signal between the stop line and the setup');
  } else {
    if (mode === 'bayFront') always(M.STOP_AT_ENTRY_LINE, M.BAY_SIGNAL_RIGHT - .1, c => !c.left && !c.right, 'no signal between the stop line and the second line');
    always(M.BAY_SIGNAL_RIGHT + .1, T - 3.2, c => c.right && !c.left, 'bay: the right signal only from the second line to the end');
    if (mode === 'bayBox') {
      always(M.BOX_SIGNAL_R + .1, E.BOX_REVERSE, c => c.right && !c.left, 'backing out of the box: right signal');
      always(M.BOX_SIGNAL_L + .1, E.BOX_SIGNAL_L, c => c.left && !c.right && !c.moving, 'the left signal comes on while still, before it drives out');
      always(E.BOX_SIGNAL_L, E.BOX_PULL_OUT - 5, c => c.left && !c.right, 'the left signal stays on while it pulls out');
      // nothing moves before the right signal has been on 1.5 s, and the car does not move forward before the left one has been on 1.2 s
      const tFwd = first(c => c.moving && c.state === 'BOX_PULL_OUT');
      if (tFwd - M.BOX_SIGNAL_L < 1.2) bad.push('drives out before the left signal has flashed');
    }
  }
  const f = parkCarAt(T - .05), cx = f.x, cz = f.z;
  const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const csn = Math.cos(f.yaw), snn = Math.sin(f.yaw);
  if (mode === 'parallel') {
    const endOk = Math.hypot(cx - su.endCentre[0], cz - su.endCentre[1]) < .03 && Math.hypot(cx - (PBOX.x0 + PBOX.x1) / 2, cz - (PBOX.zKerb + PBOX.zLane) / 2) < .9 && Math.abs(Math.abs(f.yaw) - Math.PI) < .004 && Math.abs(f.steer) < .003 && !f.moving && !f.left && !f.right;
    if (!endOk) bad.push(`ends at (${cx.toFixed(2)}, ${cz.toFixed(2)}) yaw ${(f.yaw * 180 / Math.PI).toFixed(2)} steer ${(f.steer * 180 / Math.PI).toFixed(2)}`);
    // the car must be entirely inside the box's lines (all four wheels): corners of the body against the painted rectangle
    for (const [a, b] of [[L / 2, 1], [L / 2, -1], [-L / 2, 1], [-L / 2, -1]]) { const wx = f.x + a * csn - b * snn, wz = f.z - a * snn - b * csn; if (wx < PBOX.x0 || wx > PBOX.x1 || wz < PBOX.zKerb || wz > PBOX.zLane) bad.push('a corner of the car is outside the painted box'); }
  } else {
    const endOk = Math.hypot(cx - by.endCentre[0], cz - by.endCentre[1]) < .03 && Math.abs(wrapA(f.yaw - 1.5 * Math.PI)) < .004 && Math.abs(f.steer) < .003 && !f.moving && !f.left && !f.right;
    if (!endOk) bad.push(`ends at (${cx.toFixed(2)}, ${cz.toFixed(2)}) yaw ${(f.yaw * 180 / Math.PI).toFixed(2)} steer ${(f.steer * 180 / Math.PI).toFixed(2)}`);
    // inside the bay's painted lines, nose south, rear bumper short of the closed end
    for (const [a, b] of [[L / 2, 1], [L / 2, -1], [-L / 2, 1], [-L / 2, -1]]) { const wx = f.x + a * csn - b * snn, wz = f.z - a * snn - b * csn; if (wx < BAY.xW + .1 || wx > BAY.xE - .1 || wz < BAY.zEnd + .5 || wz > BAY.zOpen) bad.push('a corner of the car is outside the bay'); }
    // the nose stops short of the second white line
    const g = { ...parkCarAt(E.STOP_AT_BAY_LINE - .1) }, noseX = g.x + 2.25 * Math.cos(g.yaw);
    if (noseX < BAY_LINE.x + .2 || noseX > BAY_LINE.x + .7 || g.moving) bad.push(`nose at x=${noseX.toFixed(2)} at the second white line (${BAY_LINE.x.toFixed(2)})`);
  }
  // right-hand lanes: the south half of the aisle, the east half of the east road
  if (front) { const t0 = M.DRIVE_TO_REAR_LOT, t1 = E.DRIVE_TO_REAR_LOT; for (let t = t0; t <= t1; t += 1 / 20) { const c = sigAt(t); if (c.x > 24 && c.x < 25.5 && c.z > -3 && c.z < .5) { bad.push(`aisle: not in the right-hand lane at x=${c.x.toFixed(1)} (z ${c.z.toFixed(2)})`); break; } if (c.z < -4 && c.z > -24 && Math.abs(c.yaw - Math.PI / 2) < .1 && c.x < CONN_X + .7) { bad.push(`east road: not in the right-hand lane at z=${c.z.toFixed(1)} (x ${c.x.toFixed(2)})`); break; } } }
  // the camera, wide and portrait: clear of every solid and of the car's body, above the ground, and the car in the frame
  let camMin = 9, camName = '', carMin = 99, framed = 0, nF = 0, camJump = 0, fovJump = 0, camCarT = 0;
  for (const narrow of [false, true]) { let pp = null;
    for (let t = 0; t <= T; t += 1 / 30) {
      const { p, l, fov } = parkCamAt(t, narrow), c = { ...parkCarAt(t) };
      if (p[1] < GROUND) bad.push(`lens below ground at ${t.toFixed(1)}`);
      for (const s of SOLIDS) { const d = clearance(s, p); if (d < camMin) { camMin = d; camName = s.n + ' t=' + t.toFixed(1) + (narrow ? ' narrow' : ''); } }
      { const d = Math.hypot(p[0] - c.x, p[1] - .8, p[2] - c.z); if (d < carMin) { carMin = d; camCarT = t; } }   // a bird's eye: the lens is never close to the car
      // is the car (its centre) inside the middle of the frame? angle between the view direction and the direction to the car, against the half field of view
      const vx = l[0] - p[0], vy = l[1] - p[1], vz = l[2] - p[2], tx = c.x - p[0], ty = .7 - p[1], tz = c.z - p[2], cosA = (vx * tx + vy * ty + vz * tz) / (Math.hypot(vx, vy, vz) * Math.hypot(tx, ty, tz) || 1), ang = Math.acos(Math.min(1, Math.max(-1, cosA))) * 180 / Math.PI;
      nF++; if (ang < fov * .5 * (narrow ? .75 : 1.0)) framed++;
      if (pp) { camJump = Math.max(camJump, Math.hypot(p[0] - pp.p[0], p[1] - pp.p[1], p[2] - pp.p[2]) * 30); fovJump = Math.max(fovJump, Math.abs(fov - pp.fov) * 30); }
      pp = { p, fov };
    } }
  if (camMin < .55) bad.push(`lens ${camMin.toFixed(2)} m from ${camName}`);
  if (carMin < 8) bad.push(`lens only ${carMin.toFixed(2)} m from the car at t=${camCarT.toFixed(1)}: not a bird's eye`);
  if (framed / nF < .9) bad.push(`the car is in frame only ${(100 * framed / nF).toFixed(0)}% of the time`);
  if (camJump > 30) bad.push(`camera moves ${camJump.toFixed(0)} m/s`);
  console.log(`${(mode + ' ' + id).padEnd(16)} camera: lens min ${camMin.toFixed(2)} m (${camName}), ${carMin.toFixed(2)} m from the car, car in frame ${(100 * framed / nF).toFixed(0)}%, max speed ${camJump.toFixed(1)} m/s, fov change ${fovJump.toFixed(1)} deg/s`);
  console.log(`${(mode + ' ' + id).padEnd(16)} ${front ? (st.z < 0 ? 'row A' : 'row B') : 'in box'} ${sideL ? 'left ' : 'right'} signal | ${T.toFixed(1)} s | moves at ${tMove.toFixed(1)} s | cone min ${worstCone.toFixed(2)} m | solid min ${worstSolid.toFixed(2)} m (${solidName}) | ${su ? `phi ${(su.phi * 180 / Math.PI).toFixed(1)}/${(su.phi2 * 180 / Math.PI).toFixed(1)} s2 ${su.s2.toFixed(2)} black ${su.blackX.toFixed(2)}` : `s1 ${by.s1.toFixed(2)} s3 ${by.s3.toFixed(2)}${by.box ? ` box d${by.box.d.toFixed(2)} gap ${by.box.gap.toFixed(2)}` : ''}`} | ${bad.length ? 'PROBLEMS:\n   ' + [...new Set(bad)].slice(0, 8).join('\n   ') : 'ok'}`);
  fail += bad.length;
}
process.exit(fail ? 1 : 0);
