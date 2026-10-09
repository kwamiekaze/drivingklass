import * as THREE from 'three';

/**
 * Turning wheels for the fleet cars.
 *
 * The Meshy car files are one fused mesh: the wheels are real round geometry, but they are not separate objects. So at load time each wheel is cut out of that mesh: every
 * triangle whose three corners all lie inside a wheel's disc (and outboard of the axle, where the tyre and rim are) becomes a wheel; everything else stays the body. The
 * wheels share the file's own vertex buffers (no copy of the geometry, the body just gets a shorter index list), and each one hangs on a pivot at its own centre that
 * the car turns (steering, front pair) and spins (rolling, all four). The wheel discs are found per car and stored in IMPORTED_FLEET (Fleet.tsx), in the same car space
 * `prepare()` builds: length along x, up y, ground at y = 0.
 *
 * If a car has no fit, or the cut finds too little to be a wheel, nothing is split and the car is exactly the one it always was.
 */
export type WheelFit = {
  /** Axle at +x and at -x in car space: [x, centre height, radius]. */
  pos: [number, number, number];
  neg: [number, number, number];
  /** Wheels are the triangles at least this far from the car's centre line (default .5 of the half width is too much: .5 m works for every car). */
  zIn?: number;
  /** ...and no further than this (the fender skin sits just outside the tyre). */
  zOut?: number;
};

export type WheelPart = {
  /** Triangle index list (into the file's own vertex buffer). */
  idx: Uint32Array;
  /** Wheel centre in car space. */
  cx: number; cy: number; cz: number;
  /** Axle at +x (true) or -x (false), and the side of the car (+z or -z) in car space. */
  posAxle: boolean; side: 1 | -1;
};
export type WheelSplit = { body: Uint32Array; wheels: WheelPart[] };

const MIN_TRIS = 120;   // a wheel with fewer triangles than this is not a wheel: leave the car alone

/** Cut the wheels out of `index`. `toCar` takes the file's own coordinates (what the position attribute stores) to car space. Returns null when this car cannot be split. */
export function splitWheels(position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, index: ArrayLike<number>, toCar: THREE.Matrix4, fit: WheelFit): WheelSplit | null {
  const n = position.count, e = toCar.elements, car = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    car[i * 3] = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
    car[i * 3 + 1] = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
    car[i * 3 + 2] = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
  }
  const zIn = fit.zIn ?? .5, zOut = fit.zOut ?? 1.2, K = 1.04;
  const axles = [fit.pos, fit.neg] as const, tris = index.length / 3;
  const take: number[][] = [[], [], [], []];   // +x/+z, +x/-z, -x/+z, -x/-z
  const body: number[] = [];
  for (let t = 0; t < tris; t++) {
    const a = index[t * 3]!, b = index[t * 3 + 1]!, c = index[t * 3 + 2]!;
    let slot = -1;
    for (let ax = 0; ax < 2 && slot < 0; ax++) {
      const [cx, cy, r] = axles[ax]!, lim = r * K;
      let ok = true, zs = 0;
      for (const v of [a, b, c]) {
        const x = car[v * 3]!, y = car[v * 3 + 1]!, z = car[v * 3 + 2]!, az = Math.abs(z);
        if (Math.hypot(x - cx, y - cy) > lim || az < zIn || az > zOut) { ok = false; break; }
        zs += z;
      }
      if (ok) slot = ax * 2 + (zs > 0 ? 0 : 1);
    }
    if (slot < 0) body.push(a, b, c); else take[slot]!.push(a, b, c);
  }
  const wheels: WheelPart[] = [];
  for (let s = 0; s < 4; s++) {
    const idx = take[s]!;
    if (idx.length / 3 < MIN_TRIS) return null;
    const ax = s >> 1, side: 1 | -1 = s % 2 === 0 ? 1 : -1, [cx, cy] = axles[ax]!;
    const zs: number[] = []; for (let i = 0; i < idx.length; i += 3) zs.push(Math.abs(car[idx[i]! * 3 + 2]!));
    zs.sort((p, q) => p - q);
    wheels.push({ idx: Uint32Array.from(idx), cx, cy, cz: side * zs[zs.length >> 1]!, posAxle: ax === 0, side });
  }
  return { body: Uint32Array.from(body), wheels };
}

/** Pivot matrix, in the file's own coordinates: steer about the car's up axis, then spin about the axle, both through the wheel's centre. */
const T1 = new THREE.Matrix4(), T2 = new THREE.Matrix4(), R1 = new THREE.Matrix4(), R2 = new THREE.Matrix4();
export function wheelMatrix(out: THREE.Matrix4, centre: THREE.Vector3, up: THREE.Vector3, axle: THREE.Vector3, steer: number, spin: number) {
  T1.makeTranslation(centre.x, centre.y, centre.z); T2.makeTranslation(-centre.x, -centre.y, -centre.z);
  R1.makeRotationAxis(up, steer); R2.makeRotationAxis(axle, spin);
  return out.copy(T1).multiply(R1).multiply(R2).multiply(T2);
}
