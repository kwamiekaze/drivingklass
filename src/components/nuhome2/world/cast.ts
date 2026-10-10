/*
 * Which car drives in. Every full page load the opening shot is a different car of the fleet, in a fixed rotation that starts with the
 * orange sports car. All of them take exactly the same drive (avenue, stop sign, right onto the street, left into the driveway, left into
 * the aisle, same blinkers, same camera); the only thing that changes is the stall each one parks in: its own, where it stands the rest of
 * the time. The car that drives in is left out of the parked row, so it is never in two places at once.
 */
export type CastId = 'hero' | 'camry' | 'corolla' | 'civic' | 'elantra' | 'sentra';
/** A stall: where the car comes to rest, and which way it turns into it from the aisle (+1 right, -1 left). */
export type Stall = { x: number; z: number; side: 1 | -1 };
export const STALLS: Record<CastId, Stall> = {
  hero: { x: 0, z: -6, side: 1 },            // the yellow sports car: the reserved stall in front of the door, row A (west to east: red, black, yellow, white)
  camry: { x: -5.5, z: -6, side: 1 },        // the school's black car, row A
  corolla: { x: 8.25, z: -6, side: 1 },      // the white car, row A east
  civic: { x: 11, z: 5.5, side: -1 },        // the second green sports car, row B east of the fountain (nose south)
  elantra: { x: -16.5, z: -6, side: 1 },     // the red sports car, row A west
  sentra: { x: -13.75, z: 5.5, side: -1 },   // the first green sports car, row B west
};
export const PLATES: Record<CastId, string> = { hero: 'DK29OR', camry: 'DK27RR', corolla: 'DK24CO', civic: 'DK25ML', elantra: 'DK26OR', sentra: 'DK28GA' };
const ORDER: CastId[] = ['hero', 'camry', 'corolla', 'civic', 'elantra', 'sentra'];

function pick(): CastId {
  if (typeof window === 'undefined') return 'camry';
  const forced = new URLSearchParams(window.location.search).get('car');
  if (forced && (ORDER as string[]).includes(forced)) return forced as CastId;
  try {
    const raw = window.localStorage.getItem('n2-car'), last = raw === null ? -1 : Number(raw);
    const next = Number.isFinite(last) ? (last + 1) % ORDER.length : 0;
    window.localStorage.setItem('n2-car', String(next));
    return ORDER[next]!;
  } catch { return 'hero'; }
}
/** Chosen once per page load, when this file is first imported. */
export const CAST: CastId = pick();
