import type { Key } from './cinema';

export type V3 = [number, number, number];
/** A camera stop: where the lens sits, what it looks at, and the lens. */
export type Stop = { p: V3; l: V3; fov: number };
export type Stage = { label: string; wide: Stop; narrow: Stop };

/** The four stops behind NEXT VIEW. The building front is at z -12, the reserved stall at z -6. Edit here to re-frame. */
export const STAGES: Stage[] = [
  { label: 'THE ARRIVAL',
    wide: { p: [-14.5, 6.6, 35], l: [-7.5, 9.2, -16], fov: 40 },
    narrow: { p: [-3, 6.4, 40], l: [0, 11.2, -16], fov: 58 } },
  { label: 'THE ENTRANCE',
    wide: { p: [6, 2.9, 9.5], l: [0, 3.5, -11], fov: 40 },
    narrow: { p: [4.5, 3.0, 8], l: [0, 3.2, -11], fov: 58 } },
  { label: 'THE GARAGE',
    wide: { p: [-11, 3.0, 6], l: [-16, 3.4, -13.4], fov: 40 },
    narrow: { p: [-12, 3.2, 5], l: [-15, 3.4, -13], fov: 58 } },
  { label: 'THE GROUNDS',
    wide: { p: [-20, 2.6, 15], l: [8, 3.2, -3], fov: 44 },
    narrow: { p: [-15, 3.6, 19], l: [4, 3, -4], fov: 60 } },
];

export const INTRO_LENGTH = 9;
export const INTRO_WIDE: Key[] = [
  { t: 0, p: [-34, 1.8, 20], l: [-4, 5, -16], fov: 42 },
  { t: 4.5, p: [-24, 2.6, 33], l: [-4, 6, -16], fov: 40 },
  { t: 9, p: [-14.5, 6.6, 35], l: [-7.5, 9.2, -16], fov: 40 },
];
export const INTRO_NARROW: Key[] = [
  { t: 0, p: [-26, 2.4, 28], l: [-2, 7, -16], fov: 58 },
  { t: 4.5, p: [-14, 3.6, 40], l: [0, 7.2, -16], fov: 58 },
  { t: 9, p: [-3, 6.4, 40], l: [0, 11.2, -16], fov: 58 },
];
