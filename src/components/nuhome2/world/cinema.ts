import * as THREE from 'three';

/** Timed camera keys. `p` is the camera, `l` what it looks at, both in world meters. */
export type Key = { t: number; p: [number, number, number]; l: [number, number, number]; fov: number };
export type Sample = { p: THREE.Vector3; l: THREE.Vector3; fov: number };
export const makeSample = (): Sample => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), fov: 38 });

/** Velocity continuous (Hermite) interpolation through timed keys, eased at both ends. */
export function sample(keys: Key[], t: number, out: Sample) {
  const n = keys.length;
  if (t <= keys[0]!.t) { const k = keys[0]!; out.p.set(...k.p); out.l.set(...k.l); out.fov = k.fov; return out; }
  if (t >= keys[n - 1]!.t) { const k = keys[n - 1]!; out.p.set(...k.p); out.l.set(...k.l); out.fov = k.fov; return out; }
  let i = 0; while (i < n - 2 && t >= keys[i + 1]!.t) i++;
  const a = keys[i]!, b = keys[i + 1]!, dt = b.t - a.t, s = (t - a.t) / dt;
  const pr = keys[i - 1], nx = keys[i + 2];
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  const H = (va: number, vb: number, vp: number | undefined, vn: number | undefined) => {
    const ma = pr === undefined || vp === undefined ? 0 : (vb - vp) / (b.t - pr.t);
    const mb = nx === undefined || vn === undefined ? 0 : (vn - va) / (nx.t - a.t);
    return h00 * va + h10 * dt * ma + h01 * vb + h11 * dt * mb;
  };
  for (let c = 0; c < 3; c++) {
    out.p.setComponent(c, H(a.p[c]!, b.p[c]!, pr?.p[c], nx?.p[c]));
    out.l.setComponent(c, H(a.l[c]!, b.l[c]!, pr?.l[c], nx?.l[c]));
  }
  out.fov = H(a.fov, b.fov, pr?.fov, nx?.fov);
  return out;
}
