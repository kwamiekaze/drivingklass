import type { Key } from './cinema';

export type V3 = [number, number, number];
/** A camera stop: where the lens sits, what it looks at, and the lens. */
export type Stop = { p: V3; l: V3; fov: number };
export type Stage = { label: string; wide: Stop; narrow: Stop };

/** Four stops behind NEXT VIEW. The building front wall is at z -14.5, the reserved stall at z -6, the road at z 19 to 31. */
export const STAGES: Stage[] = [
  { label: 'THE ARRIVAL',
    wide: { p: [-12, 5.5, 34], l: [-8, 9.0, -17.5], fov: 40 },
    narrow: { p: [-1.5, 6.5, 40], l: [0, 10.6, -17.5], fov: 58 } },
  { label: 'THE ENTRANCE',
    wide: { p: [8, 3.4, 2.5], l: [0, 5.2, -14.5], fov: 40 },
    narrow: { p: [5, 3.6, 6], l: [0, 5.2, -14.5], fov: 58 } },
  { label: 'THE ROAD',
    wide: { p: [-52, 2.6, 26], l: [12, 5, -6], fov: 42 },
    narrow: { p: [-44, 3, 28], l: [8, 5, -8], fov: 58 } },
  { label: 'THE GROUNDS',
    wide: { p: [-34, 12, 24], l: [4, 4.5, -12], fov: 44 },
    narrow: { p: [-30, 14, 34], l: [2, 5, -14], fov: 58 } },
];

/**
 * The opening shot and the idle shot, both one unbroken camera move (centripetal Catmull-Rom through the keys, so there is
 * never a corner or a jump). Position and look target share one parameter, and the parameter eases in and out, so the
 * camera starts and stops at rest.
 *
 * INTRO: starts far down the avenue and drives straight at the building, then bends right and arrives at the PAN start.
 * PAN:   from the far right the building sign stays framed while the lens sinks past the monument sign, then climbs
 *        while sliding left. It runs there and back forever (zero speed at each end) until the visitor touches the scene.
 */
export const INTRO = {
  len: 17,
  p: [[1.6, 2.4, 170], [1.4, 2.6, 98], [3, 3.2, 64], [17, 5.0, 46], [34, 7.5, 33]] as V3[],
  l: [[0, 6.5, -17.5], [0, 6.5, -17.5], [0, 7.2, -16], [-1, 7.9, -15], [-2, 8.2, -15]] as V3[],
};
export const PAN = {
  period: 56,
  p: [[34, 7.5, 33], [21, 3.8, 30.5], [10.5, 2.0, 27.5], [-3, 3.0, 30], [-18, 5.6, 31.5], [-33, 9.0, 31]] as V3[],
  l: [[-2, 8.2, -15], [3, 6.4, -12], [6, 5.2, -8], [-1, 6.6, -13], [-3, 8.0, -14.5], [-2, 8.6, -15]] as V3[],
};
export const FOV = { wide: 40, narrow: 58 };
/** First lens position, read by the canvas before the rig takes over. */
export const INTRO_WIDE: Key[] = [{ t: 0, p: INTRO.p[0]!, l: INTRO.l[0]!, fov: FOV.wide }];
export const INTRO_NARROW: Key[] = [{ t: 0, p: INTRO.p[0]!, l: INTRO.l[0]!, fov: FOV.narrow }];
