import type { ViewId } from './world/views';

/** All words shown on the page live here. Edit freely; the 3D world does not care. */
export const BRAND = {
  wordmark: 'DRIVINGKLASS',
  slogan: 'Where 5 Star Drivers Are Made',
  phone: '404-404-5820',
  tel: 'tel:+14044045820',
} as const;

export const COPY: Record<Exclude<ViewId, 'welcome'>, { eyebrow: string; title: string; body: string }> = {
  packages: { eyebrow: 'Pick your klass', title: 'Packages', body: 'From a single hour to forty. Pick-up and drop-off come with every package.' },
  hq: { eyebrow: 'Home base', title: 'Klass Headquarters', body: 'Where every klass begins. Gold standard coaching, signals that work and a garage ready for your first drive.' },
  course: { eyebrow: 'Put it to the test', title: 'The Course', body: 'Stop signs, signals, cones and a crosswalk. Everything your road test throws at you, in one place.' },
  pad: { eyebrow: 'The spot', title: 'The Star Pad', body: 'Every five star driver starts here. Your klass, your pace, your road test.' },
};
