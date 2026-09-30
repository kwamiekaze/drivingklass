import type { Key } from './cinema';

export type V3 = [number, number, number];
export type ViewId = 'welcome' | 'packages' | 'hq' | 'course' | 'pad';

/** A camera stop. `shift` slides the picture on screen (fractions of width and height) to clear the page's own UI. */
export type Stop = { p: V3; l: V3; fov: number; shift: [number, number] };
export type View = { id: ViewId; label: string; wide: Stop; narrow: Stop };

/** World: the headquarters stands at z -15, the course at z -5 to 8, the fountain at z 24. Edit stops here to re-frame a view. */
export const VIEWS: View[] = [
  { id: 'welcome', label: 'Welcome',
    wide: { p: [-9.5, 2.9, 27], l: [1, 8.4, -12], fov: 42, shift: [.22, 0] },
    narrow: { p: [-7, 3.2, 30], l: [0, 8.6, -15], fov: 54, shift: [0, .1] } },
  { id: 'packages', label: 'Packages',
    wide: { p: [9.7, 2.1, 14.5], l: [3.2, 1.5, 1.2], fov: 40, shift: [-.17, 0] },
    narrow: { p: [2.5, 2.6, 15.5], l: [0, 1.0, 1.2], fov: 56, shift: [0, -.2] } },
  { id: 'hq', label: 'Headquarters',
    wide: { p: [2.6, 2.5, 17.5], l: [0, 8.2, -15], fov: 46, shift: [.12, 0] },
    narrow: { p: [2, 2.6, 21], l: [0, 9.2, -15], fov: 58, shift: [0, .1] } },
  { id: 'course', label: 'The Course',
    wide: { p: [-18.5, 1.45, 5.2], l: [5, 1.1, .5], fov: 40, shift: [.1, 0] },
    narrow: { p: [-19.5, 2.3, 9], l: [2, .8, .5], fov: 58, shift: [0, -.1] } },
  { id: 'pad', label: 'Star Pad',
    wide: { p: [7.8, 2.7, 12.6], l: [0, 1.0, 1.2], fov: 40, shift: [.1, 0] },
    narrow: { p: [5.2, 3.4, 13.8], l: [0, .9, 1.2], fov: 54, shift: [0, .1] } },
];

export const INTRO_WIDE: Key[] = [
  { t: 0, p: [-32, 1.6, 12], l: [-2, 5, -12], fov: 42 },
  { t: 4.5, p: [-22, 2.0, 24], l: [0, 5.6, -12], fov: 40 },
  { t: 9, p: [-9.5, 2.9, 27], l: [1, 8.4, -12], fov: 42 },
];
export const INTRO_NARROW: Key[] = [
  { t: 0, p: [-26, 2.0, 20], l: [-2, 7, -14], fov: 56 },
  { t: 4.5, p: [-16, 2.6, 34], l: [0, 8.2, -15], fov: 54 },
  { t: 9, p: [-7, 3.2, 30], l: [0, 8.6, -15], fov: 54 },
];
export const INTRO_LENGTH = 9;
