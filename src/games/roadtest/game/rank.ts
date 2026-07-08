/** Driver Rank progression — XP stored in localStorage. */
export interface Rank {
  id: string;
  label: string;
  minXp: number;
  icon: string;
}

export const RANKS: Rank[] = [
  { id: 'permit',    label: "Learner's Permit",   minXp: 0,     icon: '📄' },
  { id: 'bronze',    label: 'Bronze Wheel',       minXp: 500,   icon: '🥉' },
  { id: 'silver',    label: 'Silver Wheel',       minXp: 2000,  icon: '🥈' },
  { id: 'gold',      label: 'Gold Wheel',         minXp: 5000,  icon: '🥇' },
  { id: 'fivestar',  label: '5-Star Driver',      minXp: 12000, icon: '⭐' },
  { id: 'legend',    label: 'DrivingKlass Legend',minXp: 25000, icon: '👑' },
];

const XP_KEY = 'dk-driver-xp-v1';

export function getXp(): number {
  try { return parseInt(localStorage.getItem(XP_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function setXp(v: number) {
  try { localStorage.setItem(XP_KEY, String(Math.max(0, Math.floor(v)))); } catch { /* ignore */ }
}

export function getRankForXp(xp: number): { rank: Rank; next: Rank | null; pct: number; toNext: number } {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].minXp) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  if (!next) return { rank, next: null, pct: 1, toNext: 0 };
  const span = next.minXp - rank.minXp;
  const pct = Math.max(0, Math.min(1, (xp - rank.minXp) / span));
  return { rank, next, pct, toNext: next.minXp - xp };
}

export interface XpAward {
  gained: number;
  before: number;
  after: number;
  leveledUp: boolean;
  newRank?: Rank;
}

/** Grants XP proportional to score + completion bonus. */
export function awardXpForRun(score: number, opts: { passed?: boolean; stars?: number; daily?: boolean } = {}): XpAward {
  const before = getXp();
  const base = Math.round(score / 10);
  const bonus = (opts.passed ? 50 : 0) + (opts.stars ?? 0) * 15 + (opts.daily ? 150 : 0);
  const gained = base + bonus;
  const after = before + gained;
  setXp(after);
  const beforeR = getRankForXp(before).rank;
  const afterR = getRankForXp(after).rank;
  const leveledUp = beforeR.id !== afterR.id;
  return { gained, before, after, leveledUp, newRank: leveledUp ? afterR : undefined };
}
