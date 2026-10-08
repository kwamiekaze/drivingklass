/*
 * The geometry of the back training lot, in one pure file so the lot (Lot.tsx), the parallel-parking drive (park.ts) and the
 * checks (scripts/check-park.mjs) all read the very same numbers. Everything is drawn from the owner's photo of the lot,
 * scaled at 27 px to the metre: u, v are pixels of that photo. World metres, x east, z south (the back lot is at z < -26).
 */
export const BL = { x0: -34.2, x1: 34.2, zs: -26.2, zn: -53.9, kerb: .3 };   // x edges line up with the plaza's side kerbs (x +-34.35); zs leaves room for the patio between the building and the lot
export const PHX = 27, PHW = 968, PHH = 779, PH_RIGHT = 25.0, PH_FRONT = -26.5;   // the layout sits nearer the middle of the lot than before (9 m left, 3 m back)
export const bx = (u: number) => PH_RIGHT - (PHW - u) / PHX;
export const bz = (v: number) => PH_FRONT - (PHH - v) / PHX;
export const BL_CONES: [number, number][] = ([
  [362, 66], [425, 66], [477, 66],                                     // behind the closed end
  [360, 115], [360, 180], [360, 240], [360, 300], [320, 303], [280, 308],   // the left side and its foot
  [478, 108], [475, 173], [470, 250], [472, 305],                      // the shared side
  [524, 198], [572, 198], [619, 198], [662, 198], [656, 247], [656, 298], [700, 298], [740, 297],   // the parallel box and its tail
  ...Array.from({ length: 12 }, (_, i) => [160 + 51.1 * i, 627] as [number, number]),               // the kerb line row
] as [number, number][]).map(([u, v]) => [bx(u), bz(v)] as [number, number]);
/** The two roads that join the back lot to the front lot's side lanes: east is the way in, west the way out. */
export const CONN_X = 31.7, CONN_Z0 = -14.7;

/** The parallel-parking box (the rectangle of cones with the arrow): the near (west) end, the far (east) end, the kerb side (north, small z) and the open lane side (south). */
export const PBOX = { x0: bx(476), x1: bx(660), zKerb: bz(207), zLane: bz(288) };
/** The white stop line across the lane (the lone line in the photo): x, and the z span it covers. */
export const STOP_LINE = { x: bx(727), z0: bz(327), z1: bz(458) };
/** The cones that mark the box, as the car sees them: the kerb row, the near-end corner cone, the lane-side tail. */
export const CONE_R = .24, CONE_H = .7;

/** The second white line, like the stop line (same length, same z span, so the two line up): where the car's nose stops before it backs into the bay. In line with the first cone of the kerb row. */
export const BAY_LINE = { x: bx(160), z0: STOP_LINE.z0, z1: STOP_LINE.z1 };
/** The reverse bay (the closed-end space beside the parallel box): the painted side lines, the closed end (north) and the foot where it opens (south). */
export const BAY = { xW: bx(366), xE: bx(476), zEnd: bz(83), zOpen: bz(315) };

/**
 * The way out of the back lot, the west road and the new stop sign, in world metres. The car drives south down the west road in its right-hand (west) lane,
 * stops with its nose at zNose, 0.55 m short of the white stop bar (zBar) across that lane, and the stop sign stands on the grass to its right (west) beside the driveway,
 * facing north toward the car (the circle on the owner's photo: just before the sidewalk, outside the driveway).
 */
export const EXIT = { laneX: -(CONN_X + .5), zBar: 15.3, zNose: 14.75, signX: -35.9, signZ: 15.0 };

/**
 * The two guide signs of the back lot, each standing in the grass (world metres; rotY turns the board about the vertical: 0 faces south, +PI/2 faces east).
 *   exit      on the lawn just west of the lot's west kerb, level with the end of the lane that runs along the back of the building: it faces east, toward the cars driving west,
 *             and its arrow points left (south), the way the road out runs
 *   entrance  in the grass inside the corner where the east road meets the lot's south kerb: it faces south-east, toward the cars coming up the east road, its arrow points up (north) into the lot
 * The board is W by H, its middle at height Y; two poles hold it.
 */
export const LOT_SIGN = { W: 2.0, H: .85, Y: 2.15, POLE_H: 2.6, POLE_DX: .7 };
export const LOT_SIGNS = {
  exit: { x: -36.9, z: -26.1, rotY: Math.PI / 2 },
  entrance: { x: 27.2, z: -25.15, rotY: Math.PI / 4 },
};
