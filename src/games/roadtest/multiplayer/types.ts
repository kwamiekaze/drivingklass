// Multiplayer types + shared constants for the Star Rush mode.
// Client-trust model — see net.ts for the caveat.

export const CAR_COLORS = ['gold', 'red', 'blue', 'green', 'purple'] as const;
export type CarColor = (typeof CAR_COLORS)[number];

export const CAR_TINTS: Record<CarColor, number> = {
  gold: 0xf2c14e,
  red: 0xe25656,
  blue: 0x4e8ff2,
  green: 0x4ec97a,
  purple: 0xa87fff,
};

export interface MatchRow {
  id: string;
  code: string;
  host_id: string;
  status: 'lobby' | 'playing' | 'finished';
  duration_s: number;
  seed: number;
  started_at: string | null;
  created_at: string;
}

export interface PlayerRow {
  match_id: string;
  user_id: string;
  display_name: string | null;
  color: CarColor;
  stars: number;
  joined_at: string;
}

/** Broadcast every 100ms while playing. */
export interface StateMsg {
  t: 'state';
  uid: string;
  x: number;
  y: number;
  a: number;   // angle deg
  s: number;   // speed mph
  stars: number;
  ts: number;
}

export interface StarTakenMsg {
  t: 'star_taken';
  uid: string;
  starId: number;
  ts: number;
}

export interface ScatterMsg {
  t: 'scatter';
  starIds: number[];
  x: number;
  y: number;
  ts: number;
}

export interface StartMsg {
  t: 'start';
  startAt: number; // epoch ms when countdown ends & driving begins
  duration_s: number;
  seed: number;
}

export interface EndMsg {
  t: 'end';
}

export interface ElimMsg {
  t: 'elim';
  uid: string;
}

export type NetMessage = StateMsg | StarTakenMsg | ScatterMsg | StartMsg | EndMsg | ElimMsg;

export interface RemotePlayer {
  uid: string;
  displayName: string;
  color: CarColor;
  stars: number;
  x: number;
  y: number;
  a: number;
  lastAt: number;
}
