import type { Key } from './cinema';

export type V3 = [number, number, number];
/** A camera stop: where the lens sits, what it looks at, and the lens. */
export type Stop = { p: V3; l: V3; fov: number };
export type Stage = { label: string; wide: Stop; narrow: Stop };

/** Four stops behind NEXT VIEW. The building front wall is at z -14.5, the reserved stall at z -6, the road at z 19 to 31. */
export const STAGES: Stage[] = [
  { label: 'THE ARRIVAL',
    wide: { p: [-12, 5.5, 34], l: [-6, 6.4, -17.5], fov: 40 },
    narrow: { p: [-2, 7, 44], l: [0, 8.4, -17.5], fov: 58 } },
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

export const INTRO_LENGTH = 9;
export const INTRO_WIDE: Key[] = [
  { t: 0, p: [-40, 2.2, 22], l: [-4, 5, -17.5], fov: 42 },
  { t: 4.5, p: [-26, 3.6, 34], l: [-5, 6, -17.5], fov: 40 },
  { t: 9, p: [-12, 5.5, 34], l: [-6, 6.4, -17.5], fov: 40 },
];
export const INTRO_NARROW: Key[] = [
  { t: 0, p: [-30, 3, 30], l: [-2, 7, -17.5], fov: 58 },
  { t: 4.5, p: [-16, 5, 44], l: [0, 8, -17.5], fov: 58 },
  { t: 9, p: [-2, 7, 44], l: [0, 8.4, -17.5], fov: 58 },
];
