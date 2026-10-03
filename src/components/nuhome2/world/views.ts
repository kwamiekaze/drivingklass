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

export const INTRO_LENGTH = 12;
/** The intro starts far down the avenue and drives straight at the building, then settles into the first stop. */
export const INTRO_WIDE: Key[] = [
  { t: 0, p: [1.6, 2.2, 168], l: [0, 6.5, -17.5], fov: 38 },
  { t: 6.5, p: [1.2, 2.4, 70], l: [0, 6, -17.5], fov: 38 },
  { t: 9.5, p: [-3, 3.6, 46], l: [-2, 6.2, -17.5], fov: 39 },
  { t: 12, p: [-12, 5.5, 34], l: [-8, 9.0, -17.5], fov: 40 },
];
export const INTRO_NARROW: Key[] = [
  { t: 0, p: [1.6, 2.2, 168], l: [0, 6.5, -17.5], fov: 56 },
  { t: 6.5, p: [1.2, 2.6, 78], l: [0, 6.5, -17.5], fov: 56 },
  { t: 9.5, p: [0, 5, 58], l: [0, 7.5, -17.5], fov: 57 },
  { t: 12, p: [-1.5, 6.5, 40], l: [0, 10.6, -17.5], fov: 58 },
];
